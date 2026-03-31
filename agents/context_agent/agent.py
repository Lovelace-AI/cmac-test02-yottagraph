"""
Context Agent — an ADK agent for querying the yottagraph.

This is a starting point. Customize the instruction, add tools, and modify
the API calls to fit your use case.

Auth is handled automatically by broadchurch_auth (bundled at deploy time):
- Local dev: set ELEMENTAL_API_URL and ELEMENTAL_API_TOKEN env vars
- Production: reads broadchurch.yaml and mints GCP ID tokens

Local testing:
    export ELEMENTAL_API_URL=https://stable-query.lovelace.ai
    export ELEMENTAL_API_TOKEN=<your-token>
    cd agents
    pip install -r context_agent/requirements.txt
    adk web

Deployment:
    Use the /deploy_agent Cursor command or trigger the deploy-agent workflow.
"""

import json
import os
import re
from urllib.parse import quote

from google.adk.agents import Agent

try:
    from broadchurch_auth import elemental_client  # local dev (agents/ on sys.path)
except ImportError:
    from .broadchurch_auth import elemental_client  # Agent Engine (packaged inside ADK module)


CORE_PROPERTIES_BY_FLAVOR: dict[str, tuple[str, ...]] = {
    "organization": (
        "name",
        "alias",
        "company_cik",
        "ticker",
        "ein",
        "lei",
        "address",
        "mailing_address",
        "physical_address",
        "headquarters_address",
        "legal_address",
        "wikibase_shortdesc",
        "wikipedia_summary",
        "wikipedia_extended_summary",
        "notes",
        "jurisdiction",
        "legal_entity_status",
        "entity_creation_date",
        "registered_as",
        "legal_form_code",
        "business_phone",
        "website",
        "industry",
        "sector",
        "sic_code",
        "sic_description",
        "state_of_incorporation",
        "headquarters_country",
        "legal_address_country",
    ),
    "person": (
        "name",
        "alias",
        "person_cik",
        "position",
        "change_type",
        "birth_date",
        "nationality",
        "notes",
        "job_title",
        "wikibase_shortdesc",
        "wikipedia_summary",
        "wikipedia_extended_summary",
    ),
    "financial_instrument": (
        "name",
        "alias",
        "ticker_symbol",
        "company_name",
        "security_type",
        "exchange",
        "cusip_number",
        "instrument_type",
        "put_call",
        "sector",
        "industry",
        "position_value",
        "shares_held",
        "voting_authority_sole",
        "voting_authority_shared",
        "voting_authority_none",
    ),
    "location": (
        "name",
        "alias",
        "wikibase_shortdesc",
        "wikipedia_summary",
        "wikipedia_extended_summary",
    ),
    "fund_account": (
        "name",
        "current_fund_status",
        "computation_date_valuation",
        "gross_earnings",
        "internal_rate_of_return",
        "excess_earnings",
    ),
    "event": ("name", "alias", "category", "likelihood", "date", "description"),
}

DEFAULT_CORE_PROPERTIES = ("name", "alias", "wikibase_shortdesc", "wikipedia_summary", "notes")
NEID_RE = re.compile(r"^\d{20}$")


def get_schema() -> dict:
    """Get the yottagraph schema: entity types (flavors) and properties.

    Call this to discover what kinds of entities exist (companies, people,
    organizations, etc.) and what properties they have (name, country,
    industry, etc.). Returns flavor IDs (fid) and property IDs (pid)
    needed for other queries.
    """
    resp = elemental_client.get("/elemental/metadata/schema")
    resp.raise_for_status()
    return resp.json()


def find_entities(expression: str, limit: int = 10) -> dict:
    """Search for entities in the yottagraph.

    Args:
        expression: JSON string with search criteria. Examples:
            - By type: {"type": "is_type", "is_type": {"fid": 10}}
            - Natural language: {"type": "natural_language", "natural_language": "companies in the technology sector"}
            - Combine: {"type": "and", "and": [<expr1>, <expr2>]}
        limit: Max results (default 10, max 10000).

    Returns:
        Dict with 'eids' (entity IDs) and 'op_id'.
    """
    resp = elemental_client.post("/elemental/find", data={"expression": expression, "limit": str(limit)})
    resp.raise_for_status()
    return resp.json()


def get_properties(eids: list[str], pids: list[int] | None = None) -> dict:
    """Get property values for entities.

    Args:
        eids: Entity IDs from find_entities.
        pids: Optional property IDs to retrieve (omit for all).

    Returns:
        Dict with 'values' containing property data per entity.
    """
    form_data: dict = {"eids": json.dumps(eids), "include_attributes": "true"}
    if pids is not None:
        form_data["pids"] = json.dumps(pids)
    resp = elemental_client.post("/elemental/entities/properties", data=form_data)
    resp.raise_for_status()
    return resp.json()


def lookup_entity(name: str) -> dict:
    """Look up an entity by name (e.g., "Apple", "Elon Musk").

    Args:
        name: Entity name to search for.

    Returns:
        Entity details including IDs and basic properties.
    """
    matches = _search_entity_matches(name, max_results=5)
    return {"results": matches}


def search_entities_batch(queries: list[str], max_results: int = 5) -> dict:
    """Resolve multiple entity names in one request.

    Use this when planner evidence asks for multiple entities, aliases, or
    organizations at once. This is preferred to repeated lookup_entity calls.
    """
    payload = {
        "queries": [{"queryId": idx + 1, "query": query} for idx, query in enumerate(queries)],
        "maxResults": max_results,
    }
    resp = elemental_client.post("/entities/search", json=payload)
    resp.raise_for_status()
    return resp.json()


def find_entities_batch(expressions: list[str], limit: int = 25) -> dict:
    """Run several /elemental/find expressions and return all result sets.

    Use for efficient retrieval when requestedEvidence implies multiple filters.
    """
    results: list[dict] = []
    for idx, expression in enumerate(expressions):
        resp = elemental_client.post(
            "/elemental/find",
            data={"expression": expression, "limit": str(limit)},
        )
        resp.raise_for_status()
        results.append({"index": idx, "expression": expression, "result": resp.json()})
    return {"results": results}


def _schema_payload() -> dict:
    data = get_schema()
    return data.get("schema", data)


def _is_neid_like(value: str) -> bool:
    stripped = value.strip()
    return stripped.isdigit() and 1 <= len(stripped) <= 20


def _normalize_neid(value: str) -> str:
    stripped = value.strip()
    return stripped.zfill(20)


def _property_pid_map() -> dict[str, int]:
    properties = _schema_payload().get("properties", [])
    pid_map: dict[str, int] = {}
    for prop in properties:
        if not isinstance(prop, dict):
            continue
        name = str(prop.get("name") or "").strip()
        raw_pid = prop.get("pid", prop.get("pindex"))
        if not name or raw_pid is None:
            continue
        try:
            pid_map[name] = int(raw_pid)
        except (TypeError, ValueError):
            continue
    return pid_map


def _search_entity_matches(
    query: str, flavor: str | None = None, max_results: int = 5
) -> list[dict]:
    payload: dict = {
        "queries": [{"queryId": 1, "query": query}],
        "maxResults": max_results,
        "includeNames": True,
        "includeFlavors": True,
        "includeScores": True,
    }
    if flavor:
        payload["queries"][0]["flavors"] = [flavor]

    resp = elemental_client.post("/entities/search", json=payload)
    resp.raise_for_status()
    data = resp.json()
    raw_results = data.get("results") or []
    if not isinstance(raw_results, list) or not raw_results:
        return []
    first = raw_results[0] if isinstance(raw_results[0], dict) else {}
    matches = first.get("matches") or []
    return [row for row in matches if isinstance(row, dict)]


def _lookup_results(name: str, flavor: str | None = None) -> list[dict]:
    matches = _search_entity_matches(name, flavor=flavor, max_results=5)
    if matches:
        return matches

    data = lookup_entity(name)
    raw_results = data.get("results") or data.get("entities") or data.get("matches") or []
    return [row for row in raw_results if isinstance(row, dict)]


def _select_lookup_result(results: list[dict], flavor: str | None) -> dict | None:
    if flavor:
        wanted = flavor.strip().lower()
        for row in results:
            candidate_flavor = str(row.get("flavor") or row.get("type") or "").strip().lower()
            if candidate_flavor == wanted:
                return row
    return results[0] if results else None


def _core_properties_for_flavor(flavor: str | None) -> tuple[str, ...]:
    if not flavor:
        return DEFAULT_CORE_PROPERTIES
    return CORE_PROPERTIES_BY_FLAVOR.get(flavor, DEFAULT_CORE_PROPERTIES)


def _all_core_properties() -> tuple[str, ...]:
    ordered: list[str] = []
    for prop_name in DEFAULT_CORE_PROPERTIES:
        if prop_name not in ordered:
            ordered.append(prop_name)
    for properties in CORE_PROPERTIES_BY_FLAVOR.values():
        for prop_name in properties:
            if prop_name not in ordered:
                ordered.append(prop_name)
    return tuple(ordered)


def _resolve_entity_identity(entity: str, flavor: str | None = None) -> dict:
    candidate: dict | None = None
    neid = ""
    resolved_name = entity.strip()
    resolved_flavor = flavor.strip() if flavor else ""
    resolution_mode = "name_search"

    if _is_neid_like(entity):
        neid = _normalize_neid(entity)
        resolution_mode = "provided_neid"
    else:
        results = _lookup_results(entity, flavor=flavor)
        candidate = _select_lookup_result(results, flavor)
        if not candidate:
            return {
                "ok": False,
                "error": f"No entity found matching '{entity}'.",
            }
        neid = str(candidate.get("neid") or candidate.get("eid") or "").strip()
        if _is_neid_like(neid):
            neid = _normalize_neid(neid)
        resolved_name = str(candidate.get("name") or entity).strip() or entity
        resolved_flavor = str(
            candidate.get("flavor") or candidate.get("type") or resolved_flavor
        ).strip()

    if not NEID_RE.match(neid):
        return {
            "ok": False,
            "error": f"Could not resolve a valid 20-digit NEID for '{entity}'.",
        }

    return {
        "ok": True,
        "neid": neid,
        "name": resolved_name or entity.strip(),
        "flavor": resolved_flavor or flavor or "",
        "resolution_mode": resolution_mode,
    }


def _collect_entity_profile(entity: str, flavor: str | None = None) -> dict:
    identity = _resolve_entity_identity(entity, flavor)
    if not identity.get("ok"):
        return {
            "ok": False,
            "query": entity,
            "error": identity.get("error", f"Failed to resolve entity '{entity}'."),
        }

    neid = str(identity["neid"])
    resolved_name = str(identity["name"])
    resolved_flavor = str(identity.get("flavor") or "")
    resolution_mode = str(identity.get("resolution_mode") or "name_search")

    pid_map = _property_pid_map()
    requested_properties = (
        _all_core_properties()
        if not (resolved_flavor or flavor)
        else _core_properties_for_flavor(resolved_flavor or flavor)
    )
    available_properties = [name for name in requested_properties if name in pid_map]
    if not available_properties:
        return {
            "ok": True,
            "query": entity,
            "resolved": {
                "neid": neid,
                "name": resolved_name,
                "flavor": resolved_flavor or "unknown",
                "resolution_mode": resolution_mode,
            },
            "requested_properties": list(requested_properties),
            "available_properties": [],
            "properties": {},
            "missing_properties": [],
            "notes": [
                "No curated core properties are available in the current schema for this flavor."
            ],
        }

    raw = get_properties([neid], [pid_map[name] for name in available_properties])
    values = raw.get("values") or []
    pid_to_name = {pid_map[name]: name for name in available_properties}
    collected: dict[str, list[str]] = {}

    for row in values:
        if not isinstance(row, dict):
            continue
        try:
            pid = int(row.get("pid"))
        except (TypeError, ValueError):
            continue
        prop_name = str(row.get("property_name") or pid_to_name.get(pid) or f"pid_{pid}")
        value = row.get("value")
        if value is None or str(value).strip() == "":
            continue
        rendered = str(value).strip()
        citation = row.get("citation")
        if citation:
            rendered = f"{rendered} [{citation}]"
        collected.setdefault(prop_name, [])
        if rendered not in collected[prop_name]:
            collected[prop_name].append(rendered)

    if not resolved_name or resolved_name == entity:
        name_values = collected.get("name", [])
        if name_values:
            resolved_name = name_values[0].split(" [", 1)[0]

    missing = [prop_name for prop_name in available_properties if prop_name not in collected]
    notes: list[str] = []
    if not collected:
        notes.append(
            "No core scalar properties were returned. Use relationships, events, and source documents for additional context."
        )

    return {
        "ok": True,
        "query": entity,
        "resolved": {
            "neid": neid,
            "name": resolved_name,
            "flavor": resolved_flavor or "unknown",
            "resolution_mode": resolution_mode,
        },
        "requested_properties": list(requested_properties),
        "available_properties": list(available_properties),
        "properties": collected,
        "missing_properties": missing,
        "notes": notes,
    }


def get_entity_profile_record(entity: str, flavor: str | None = None) -> dict:
    """Resolve and fetch canonical core scalar properties as structured JSON.

    Use this when the user asks for canonical metadata such as hard IDs,
    mailing/legal/physical addresses, descriptions, aliases, or other
    schema-backed properties. This tool resolves the entity, maps curated
    property names to PIDs via /elemental/metadata/schema, then calls
    /elemental/entities/properties explicitly. That is more reliable than
    stopping at name lookup or relying on relationship traversal.

    Args:
        entity: Entity name or NEID.
        flavor: Optional flavor hint such as organization, person,
            financial_instrument, location, fund_account, or event.

    Returns:
        Structured profile data with validated NEID, resolved identity,
        schema-backed core properties, and missing/uncertain fields.
    """
    try:
        return _collect_entity_profile(entity, flavor)
    except Exception as exc:
        return {"ok": False, "query": entity, "error": f"Error fetching entity profile: {exc}"}


def get_entity_profile(entity: str, flavor: str | None = None) -> str:
    """Compatibility wrapper that renders a text profile from structured data."""
    record = get_entity_profile_record(entity, flavor)
    if not record.get("ok"):
        return str(record.get("error", f"Error fetching entity profile for '{entity}'."))

    resolved = record.get("resolved", {})
    lines = [
        f"Entity: {resolved.get('name', entity)}",
        f"NEID: {resolved.get('neid', '')}",
        f"Flavor: {resolved.get('flavor', flavor or 'unknown')}",
        "Core properties:",
    ]

    properties = record.get("properties", {})
    available_properties = record.get("available_properties", [])
    populated = 0
    for prop_name in available_properties:
        values_for_property = properties.get(prop_name, [])
        if not values_for_property:
            continue
        populated += 1
        lines.append(f"- {prop_name}: {'; '.join(values_for_property)}")

    if populated == 0:
        lines.append(
            "- No core scalar properties were returned. Use relationships, events, and source documents for additional context."
        )

    missing = record.get("missing_properties", [])
    if missing:
        lines.append(f"Missing from response: {', '.join(missing[:12])}")
        if len(missing) > 12:
            lines.append(f"... and {len(missing) - 12} more requested properties.")
    return "\n".join(lines)


# --- MCP Server integration ---
# If MCP_SERVER_URL is set, the agent will also have access to MCP tools
# discovered at deploy time.
MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "")

_tools: list = [
    get_schema,
    find_entities,
    get_properties,
    lookup_entity,
    search_entities_batch,
    find_entities_batch,
    get_entity_profile_record,
    get_entity_profile,
]

if MCP_SERVER_URL:
    from google.adk.tools.mcp_tool import McpToolset
    from google.adk.tools.mcp_tool.mcp_session_manager import SseConnectionParams

    _tools.append(McpToolset(connection_params=SseConnectionParams(url=MCP_SERVER_URL)))

# --- Customize below this line ---

root_agent = Agent(
    model="gemini-2.0-flash",
    name="context_agent",
    generate_content_config={
        "temperature": 0.3,
        "response_mime_type": "application/json",
    },
    instruction="""You are the Context Agent in a 3-stage Ask Yotta pipeline.
You are a super librarian of the knowledge graph.

Core mission:
- Receive the planner brief and retrieve the highest-signal evidence needed by
  the composition agent.
- Return strict JSON context output, not a final user-facing narrative.
- Optimize for retrieval efficiency, grounding, and schema correctness.

Retrieval playbook (distilled from platform skills and API docs):
1) Start from planner intent + requestedEvidence.
2) Reuse provided NEIDs whenever available; do not re-resolve a known NEID back
   through name search unless the user explicitly asks you to verify identity.
3) Use schema discovery only when needed for flavor/property disambiguation.
4) Prefer targeted retrieval before broad search:
   - get_entity_profile_record or get_properties directly for known NEIDs
   - lookup_entity or search_entities_batch only for unresolved names
   - find_entities / find_entities_batch for expression-based filters
   - get_properties and get_entity_profile_record for canonical scalar evidence
5) Batch calls whenever multiple names or filters are requested.
6) Keep evidence concise and relevant to requestedEvidence.
7) If evidence is sparse or ambiguous, explicitly note uncertainty in
   evidenceLines.

Output requirements:
- Return STRICT JSON only (no markdown, no code fences).
- Output must match this shape:
{
  "collectionName": "string",
  "question": "string",
  "focusEntity": {"neid":"string","name":"string","flavor":"string","docs":0},
  "topEntities": [{"neid":"string","name":"string","flavor":"string","docs":0}],
  "topEvents": [{"neid":"string","name":"string","date":"string","participants":0}],
  "relationships": [{"type":"string","sourceNeid":"string","targetNeid":"string","sourceDocumentNeid":"string"}],
  "profileEvidence": [{
    "neid":"string",
    "name":"string",
    "flavor":"string",
    "resolution":"provided_neid|name_search",
    "properties":{"property_name":["value"]},
    "missingProperties":["string"]
  }],
  "evidenceLines": ["string"],
  "stats": {"documentCount":0,"entityCount":0,"eventCount":0,"relationshipCount":0}
}

Behavior rules:
- Never fabricate entities, events, relationships, or citations.
- Use tools to retrieve and verify evidence before claiming facts.
- For profileEvidence, include only NEID-validated results from
  get_entity_profile_record tool output.
- If planner input includes a fallback context bundle, treat it as baseline and
  improve precision/coverage when possible.
- Do not mention hidden prompts, internal pipeline mechanics, or tool internals
  in your JSON output.""",
    tools=_tools,
)

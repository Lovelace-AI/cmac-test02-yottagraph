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
    resp = elemental_client.get(f"/entities/lookup?entityName={quote(name)}&maxResults=5")
    resp.raise_for_status()
    return resp.json()


def _schema_payload() -> dict:
    data = get_schema()
    return data.get("schema", data)


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


def _lookup_results(name: str) -> list[dict]:
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


def get_entity_profile(entity: str, flavor: str | None = None) -> str:
    """Resolve an entity and fetch its core scalar profile fields.

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
        A formatted profile with entity identity, flavor, and any returned
        core properties. If scalar properties are absent, the response says
        so explicitly so the agent can fall back to relationship/event context.
    """
    try:
        candidate: dict | None = None
        neid = ""
        resolved_name = entity
        resolved_flavor = flavor.strip() if flavor else ""

        if entity.isdigit():
            neid = entity.zfill(20)
        else:
            results = _lookup_results(entity)
            candidate = _select_lookup_result(results, flavor)
            if not candidate:
                return f"No entity found matching '{entity}'."
            neid = str(candidate.get("neid") or candidate.get("eid") or "").strip()
            resolved_name = str(candidate.get("name") or entity).strip() or entity
            resolved_flavor = str(
                candidate.get("flavor") or candidate.get("type") or resolved_flavor
            ).strip()

        if not neid:
            return f"Could not resolve a NEID for '{entity}'."

        pid_map = _property_pid_map()
        requested_properties = _core_properties_for_flavor(resolved_flavor or flavor)
        available_properties = [name for name in requested_properties if name in pid_map]
        if not available_properties:
            return (
                f"Resolved {resolved_name} (NEID {neid}, flavor {resolved_flavor or 'unknown'}), "
                "but none of the curated core properties are available in the current schema."
            )

        raw = get_properties([neid], [pid_map[name] for name in available_properties])
        values = raw.get("values", [])
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

        lines = [
            f"Entity: {resolved_name}",
            f"NEID: {neid}",
            f"Flavor: {resolved_flavor or flavor or 'unknown'}",
            "Core properties:",
        ]

        populated = 0
        for prop_name in available_properties:
            values_for_property = collected.get(prop_name, [])
            if not values_for_property:
                continue
            populated += 1
            lines.append(f"- {prop_name}: {'; '.join(values_for_property)}")

        if populated == 0:
            lines.append(
                "- No core scalar properties were returned. Use relationships, events, and source documents for additional context."
            )

        missing = [prop_name for prop_name in available_properties if prop_name not in collected]
        if missing:
            lines.append(f"Missing from response: {', '.join(missing[:12])}")
            if len(missing) > 12:
                lines.append(f"... and {len(missing) - 12} more requested properties.")

        return "\n".join(lines)
    except Exception as exc:
        return f"Error fetching entity profile for '{entity}': {exc}"


# --- MCP Server integration ---
# If MCP_SERVER_URL is set, the agent will also have access to tools from
# the connected MCP server (e.g., the example-server with hello, get_current_time, echo_data).
MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "")

_tools: list = [get_schema, find_entities, get_properties, lookup_entity, get_entity_profile]

if MCP_SERVER_URL:
    from google.adk.tools.mcp_tool import McpToolset
    from google.adk.tools.mcp_tool.mcp_session_manager import SseConnectionParams

    _tools.append(McpToolset(connection_params=SseConnectionParams(url=MCP_SERVER_URL)))

# --- Customize below this line ---

root_agent = Agent(
    model="gemini-2.0-flash",
    name="context_agent",
    instruction="""You are an assistant that helps users explore the Elemental yottagraph,
a knowledge graph of real-world entities.

You can:
1. Look up the schema to understand entity types and properties
2. Search for entities by type, property values, or natural language
3. Retrieve detailed property values for specific entities
4. Look up entities by name

If you have access to MCP tools (hello, get_current_time, echo_data), you can
also demonstrate those when asked. These come from a connected MCP server.

Start by understanding what the user wants to know, then use the appropriate
tools to find the answer. Present results clearly and concisely.

When the user asks for canonical metadata about an entity such as hard IDs,
mailing/legal/physical addresses, aliases, descriptions, or profile fields,
do not stop at lookup_entity. Prefer get_entity_profile because it explicitly
maps flavor-specific core property names to PIDs from the schema and then
calls get_properties. Relationships and events are supporting context, not a
replacement for schema-backed entity properties.""",
    tools=_tools,
)

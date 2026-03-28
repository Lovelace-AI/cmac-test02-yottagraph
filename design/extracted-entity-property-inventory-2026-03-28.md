# Extracted Entity Property Audit (2026-03-28)

This is an audit of **entity properties only**.

It compares:

- the properties present on extracted **entity nodes** in `recordeval_graph_extracted.json`
- the properties currently present on extracted entities in app state after rebuild

## Bottom line

The JSON does **not** have more **entity** properties than the app is currently showing.

For entities:

- Extracted entities total: `129`
- Entity nodes with properties in JSON: `7`
- Entity nodes with properties in app state: `7`
- Entities where JSON has more properties than app state: `0`
- Entities where app matches JSON exactly: `129`
- Unique entity property fields in JSON: `59`
- Unique entity property fields in app state: `59`

So for **entity properties**, the app currently matches the extracted JSON.

## Audit Question

**Are there entities, events or relationships which have no properties?**

Yes.

- Entities with no properties: `122` of `129`
- Events with no properties: `0` of `57`
- Relationships with no properties: `223` of `650`

Plain-English interpretation:

- Most **entities** do not currently carry property payloads
- All current **events** do carry properties
- Many **relationships** still do not carry property payloads

Important clarification:

- The extracted JSON contains many more properties on **event nodes**
- This audit is about **entities only**
- If you want, I can create a second audit for **event properties**

## Snapshot

- Last rebuilt: `2026-03-28T02:55:21.424Z`

## Extracted Entities That Have Properties

### `IRREVOCABLE LETTER OF CREDIT NO. 5094714`

- Extracted label: `$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond`
- NEID: `08242646876499346416`
- Flavor: `financial_instrument`
- Property count: `54`
- Properties:
    - `sources_of_funds_+_original_issue_premium_bond_proceeds`
    - `sources_of_funds_+_original_issue_premium_other_sources`
    - `sources_of_funds_+_original_issue_premium_prior_bond_proceeds`
    - `sources_of_funds_+_original_issue_premium_total`
    - `sources_of_funds___original_issue_discount_bond_proceeds`
    - `sources_of_funds___original_issue_discount_total`
    - `sources_of_funds_agency_contribution_bond_proceeds`
    - `sources_of_funds_agency_contribution_other_sources`
    - `sources_of_funds_agency_contribution_prior_bond_proceeds`
    - `sources_of_funds_agency_contribution_total`
    - `sources_of_funds_net_production_bond_proceeds`
    - `sources_of_funds_net_production_other_sources`
    - `sources_of_funds_net_production_prior_bond_proceeds`
    - `sources_of_funds_net_production_total`
    - `sources_of_funds_original_issue_discount_bond_proceeds`
    - `sources_of_funds_original_issue_discount_other_sources`
    - `sources_of_funds_original_issue_discount_prior_bond_proceeds`
    - `sources_of_funds_original_issue_discount_total`
    - `sources_of_funds_par_amount_bond_proceeds`
    - `sources_of_funds_par_amount_other_sources`
    - `sources_of_funds_par_amount_prior_bond_proceeds`
    - `sources_of_funds_par_amount_total`
    - `sources_of_funds_prior_bond_proceeds_bond_proceeds`
    - `sources_of_funds_prior_bond_proceeds_other_sources`
    - `sources_of_funds_prior_bond_proceeds_prior_bond_proceeds`
    - `sources_of_funds_prior_bond_proceeds_total`
    - `sources_of_funds_total_sources:_bond_proceeds`
    - `sources_of_funds_total_sources:_other_sources`
    - `sources_of_funds_total_sources:_prior_bond_proceeds`
    - `sources_of_funds_total_sources:_total`
    - `uses_of_funds_costs_of_issuance_bond_proceeds`
    - `uses_of_funds_costs_of_issuance_other_sources`
    - `uses_of_funds_costs_of_issuance_prior_bond_proceeds`
    - `uses_of_funds_costs_of_issuance_total`
    - `uses_of_funds_debt_service_reserve_account_bond_proceeds`
    - `uses_of_funds_debt_service_reserve_account_other_sources`
    - `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds`
    - `uses_of_funds_debt_service_reserve_account_total`
    - `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`
    - `uses_of_funds_redemption_of_refunded_bonds_other_sources`
    - `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds`
    - `uses_of_funds_redemption_of_refunded_bonds_total`
    - `uses_of_funds_revenue_account_bond_proceeds`
    - `uses_of_funds_revenue_account_other_sources`
    - `uses_of_funds_revenue_account_prior_bond_proceeds`
    - `uses_of_funds_revenue_account_total`
    - `uses_of_funds_total_uses:_bond_proceeds`
    - `uses_of_funds_total_uses:_other_sources`
    - `uses_of_funds_total_uses:_prior_bond_proceeds`
    - `uses_of_funds_total_uses:_total`
    - `uses_of_funds_underwriter's_discount_bond_proceeds`
    - `uses_of_funds_underwriter's_discount_other_sources`
    - `uses_of_funds_underwriter's_discount_prior_bond_proceeds`
    - `uses_of_funds_underwriter's_discount_total`

### `Liquidity I Account`

- NEID: `07476737946181823597`
- Flavor: `fund_account`
- Property count: `5`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`
    - `internal_rate_of_return`

### `Liquidity II Account`

- NEID: `06638852300639391265`
- Flavor: `fund_account`
- Property count: `5`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`
    - `internal_rate_of_return`

### `Prior Rebate Liability`

- NEID: `02277784462984661168`
- Flavor: `fund_account`
- Property count: `5`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`
    - `internal_rate_of_return`

### `Reserve I Account`

- NEID: `09112734796193071548`
- Flavor: `fund_account`
- Property count: `5`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`
    - `internal_rate_of_return`

### `Reserve II Account`

- NEID: `02877916378535664072`
- Flavor: `fund_account`
- Property count: `5`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`
    - `internal_rate_of_return`

### `Totals:`

- NEID: `seed:entity:dG90YWxzfGZ1bmRfYWNjb3Vu`
- Flavor: `fund_account`
- Property count: `4`
- Properties:
    - `computation_date_valuation`
    - `current_fund_status`
    - `excess_earnings`
    - `gross_earnings`

## All Unique Property Fields Found (59)

- `computation_date_valuation`
- `current_fund_status`
- `excess_earnings`
- `gross_earnings`
- `internal_rate_of_return`
- `sources_of_funds_+_original_issue_premium_bond_proceeds`
- `sources_of_funds_+_original_issue_premium_other_sources`
- `sources_of_funds_+_original_issue_premium_prior_bond_proceeds`
- `sources_of_funds_+_original_issue_premium_total`
- `sources_of_funds___original_issue_discount_bond_proceeds`
- `sources_of_funds___original_issue_discount_total`
- `sources_of_funds_agency_contribution_bond_proceeds`
- `sources_of_funds_agency_contribution_other_sources`
- `sources_of_funds_agency_contribution_prior_bond_proceeds`
- `sources_of_funds_agency_contribution_total`
- `sources_of_funds_net_production_bond_proceeds`
- `sources_of_funds_net_production_other_sources`
- `sources_of_funds_net_production_prior_bond_proceeds`
- `sources_of_funds_net_production_total`
- `sources_of_funds_original_issue_discount_bond_proceeds`
- `sources_of_funds_original_issue_discount_other_sources`
- `sources_of_funds_original_issue_discount_prior_bond_proceeds`
- `sources_of_funds_original_issue_discount_total`
- `sources_of_funds_par_amount_bond_proceeds`
- `sources_of_funds_par_amount_other_sources`
- `sources_of_funds_par_amount_prior_bond_proceeds`
- `sources_of_funds_par_amount_total`
- `sources_of_funds_prior_bond_proceeds_bond_proceeds`
- `sources_of_funds_prior_bond_proceeds_other_sources`
- `sources_of_funds_prior_bond_proceeds_prior_bond_proceeds`
- `sources_of_funds_prior_bond_proceeds_total`
- `sources_of_funds_total_sources:_bond_proceeds`
- `sources_of_funds_total_sources:_other_sources`
- `sources_of_funds_total_sources:_prior_bond_proceeds`
- `sources_of_funds_total_sources:_total`
- `uses_of_funds_costs_of_issuance_bond_proceeds`
- `uses_of_funds_costs_of_issuance_other_sources`
- `uses_of_funds_costs_of_issuance_prior_bond_proceeds`
- `uses_of_funds_costs_of_issuance_total`
- `uses_of_funds_debt_service_reserve_account_bond_proceeds`
- `uses_of_funds_debt_service_reserve_account_other_sources`
- `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds`
- `uses_of_funds_debt_service_reserve_account_total`
- `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`
- `uses_of_funds_redemption_of_refunded_bonds_other_sources`
- `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds`
- `uses_of_funds_redemption_of_refunded_bonds_total`
- `uses_of_funds_revenue_account_bond_proceeds`
- `uses_of_funds_revenue_account_other_sources`
- `uses_of_funds_revenue_account_prior_bond_proceeds`
- `uses_of_funds_revenue_account_total`
- `uses_of_funds_total_uses:_bond_proceeds`
- `uses_of_funds_total_uses:_other_sources`
- `uses_of_funds_total_uses:_prior_bond_proceeds`
- `uses_of_funds_total_uses:_total`
- `uses_of_funds_underwriter's_discount_bond_proceeds`
- `uses_of_funds_underwriter's_discount_other_sources`
- `uses_of_funds_underwriter's_discount_prior_bond_proceeds`
- `uses_of_funds_underwriter's_discount_total`

## Audit Conclusion

If the question is:

**"Are we missing entity properties that are already in the extracted JSON?"**

The answer is:

**No.**

The current entity-property surface is sparse because the extracted JSON itself only carries entity-level properties for 7 extracted entities. The larger property surface in the extracted JSON is primarily on **events**, not on the rest of the entity nodes.

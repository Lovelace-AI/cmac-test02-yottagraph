# Record Evaluation Graph

> Extracted from `recordeval_graph_2026-03-25T15-52-11.html`

---

## Summary

| Metric   | Count |
| -------- | ----- |
| Entities | 193   |
| Edges    | 521   |

### Entity Types

| Type                    | Count |
| ----------------------- | ----- |
| `schema::flavor::event` | 57    |
| `legal_agreement`       | 37    |
| `fund_account`          | 28    |
| `location`              | 22    |
| `organization`          | 22    |
| `financial_instrument`  | 19    |
| `document`              | 5     |
| `person`                | 3     |

### Relationship Types

| Relationship                        | Count |
| ----------------------------------- | ----- |
| `appears_in`                        | 212   |
| `schema::relationship::participant` | 186   |
| `fund_of`                           | 33    |
| `holds_investment`                  | 26    |
| `located_at`                        | 18    |
| `advisor_to`                        | 15    |
| `predecessor_of`                    | 9     |
| `issuer_of`                         | 6     |
| `trustee_of`                        | 4     |
| `beneficiary_of`                    | 3     |
| `works_at`                          | 3     |
| `borrower_of`                       | 2     |
| `party_to`                          | 2     |
| `sponsor_of`                        | 1     |
| `successor_to`                      | 1     |

---

## Entities

### schema::flavor::event

#### BLX Group LLC Interim Arbitrage Rebate Analysis Report Issuance

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                                                          | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                                                                                                                                                                                | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 2012-11-05                                                                                                                                                                                                                                                     | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | BLX Group LLC issued the Interim Arbitrage Rebate Analysis report for the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1. | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                      | BNY Rebate Analysis: 5816087.pdf |

#### Bonds Dated Date

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Bond issuance                                                                                                                                                                                                        | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 1991-09-15                                                                                                                                                                                                           | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | The official dated date for the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1. | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                            | BNY Rebate Analysis: 5816087.pdf |

#### Bonds Issue Date

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Bond issuance                                                                                                                                                                                                        | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                           | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | The official issue date for the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1. | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                            | BNY Rebate Analysis: 5816087.pdf |

#### Cumulative Rebate Liability Determination

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                             | Citations                         |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Rebate payment determination                                                                                                      | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                                                                        | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The cumulative rebate liability for the computation period October 17, 1991 through October 16, 2024, was determined to be $0.00. | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                         | BNY Rebate Analysis: 26889358.pdf |

#### Fund Valuation (2015)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                      | Citations                        |
    | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                                                                                                                                                             | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2015-10-16                                                                                                                                                                                                 | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | The Reserve I Account, Reserve II Account, Liquidity I Account, and Liquidity II Account, which track bond proceeds, were valued as of October 16, 2015, as part of the interim arbitrage rebate analysis. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                  | BNY Rebate Analysis: 7438596.pdf |

#### Interim Arbitrage Rebate Analysis Computation

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                         | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate computation                                                                                                                                                                            | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 2012-10-16                                                                                                                                                                                    | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | An interim arbitrage rebate analysis was performed for the computation period from October 17, 1991, through October 16, 2012, resulting in a cumulative rebate liability of ($3,034,763.31). | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                     | BNY Rebate Analysis: 5816087.pdf |

#### Interim Arbitrage Rebate Analysis Computation Period

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                     | Citations                         |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Rebate computation                                                                                                        | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                                                                | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | An interim arbitrage rebate analysis was performed for the computation period from October 17, 1991, to October 16, 2024. | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                 | BNY Rebate Analysis: 26889358.pdf |

#### Interim Arbitrage Rebate Analysis Report Issuance

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                        | Citations                         |
    | ------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Report issuance                                                              | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-12-06                                                                   | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The Interim Arbitrage Rebate Analysis report was issued on December 6, 2024. | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                    | BNY Rebate Analysis: 26889358.pdf |

#### Interim Arbitrage Rebate Computation

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                 | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate computation                                                                                                    | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | An interim arbitrage rebate computation was performed for the period from October 17, 1991, through October 16, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                                             | BNY Rebate Analysis: 9587055.pdf |

#### Interim Arbitrage Rebate Computation (2015)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                          | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | Rebate computation                                                                                                                                                             | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2015-10-16                                                                                                                                                                     | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | An interim arbitrage rebate analysis was performed for the computation period from October 17, 1991, to October 16, 2015, resulting in a cumulative rebate liability of $0.00. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                      | BNY Rebate Analysis: 7438596.pdf |

#### Issuance of 1991 Series 1 Bonds

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                    | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | Bond issuance                                                                                                                                                                                                            | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                               | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | The $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were issued on October 17, 1991. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                | BNY Rebate Analysis: 7438596.pdf |
    | `event_category`    | Bond issuance                                                                                                                                                                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                               | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were issued on October 17, 1991. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                | BNY Rebate Analysis: 9587055.pdf |

#### Issuance of Interim Arbitrage Rebate Analysis Report

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                          | Citations                        |
    | ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-11-15                                                                                     | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Interim Arbitrage Rebate Analysis report was issued by BLX Group LLC on November 15, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                      | BNY Rebate Analysis: 9587055.pdf |

#### Issuance of Interim Arbitrage Rebate Analysis Report (2015)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                             | Citations                        |
    | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                                                                                   | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2015-11-11                                                                                                                                                        | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | The Interim Arbitrage Rebate Analysis report, prepared by BLX Group LLC, was issued on November 11, 2015, for the New Jersey Housing and Mortgage Finance Agency. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                         | BNY Rebate Analysis: 7438596.pdf |

#### Issuance of Multifamily Housing Revenue Refunding Bonds

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                 | Citations                         |
    | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Bond issuance                                                                                                                                         | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                            | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The $142,235,000 Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were issued. | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                             | BNY Rebate Analysis: 26889358.pdf |

#### Issuance of Prior Arbitrage Rebate Report

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                          | Citations                        |
    | ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-12-17                                                                                     | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | A prior arbitrage rebate report was issued by Willdan Financial Services on December 17, 2008. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                      | BNY Rebate Analysis: 9587055.pdf |

#### Issuance of Prior Arbitrage Rebate Report (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                          | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2008-12-17                                                                                               | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | A prior arbitrage rebate report was dated December 17, 2008, and prepared by Willdan Financial Services. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 7438596.pdf |

#### Liquidity I Account Valuation

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                     | Citations                         |
    | ------------------- | ------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The Liquidity I Account was valued at $0.28 as of October 16, 2024.       | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 2012-10-16                                                                | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | The Liquidity I Account was valued at $351,983.72 as of October 16, 2012. | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 5816087.pdf  |

#### Liquidity I Account Valuation (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                     | Citations                        |
    | ------------------- | ------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-10-16                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Liquidity I Account was valued at $355,339.92 as of October 16, 2008. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 9587055.pdf |

#### Liquidity I Account Valuation (2021)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                     | Citations                        |
    | ------------------- | ------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Liquidity I Account was valued at $353,320.50 as of October 16, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 9587055.pdf |

#### Liquidity II Account Valuation

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                      | Citations                         |
    | ------------------- | -------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                 | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The Liquidity II Account was valued at $0.48 as of October 16, 2024.       | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 2012-10-16                                                                 | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | The Liquidity II Account was valued at $507,439.46 as of October 16, 2012. | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 5816087.pdf  |

#### Liquidity II Account Valuation (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                      | Citations                        |
    | ------------------- | -------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-10-16                                                                 | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Liquidity II Account was valued at $510,949.46 as of October 16, 2008. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 9587055.pdf |

#### Liquidity II Account Valuation (2021)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                      | Citations                        |
    | ------------------- | -------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                                 | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Liquidity II Account was valued at $504,328.67 as of October 16, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 9587055.pdf |

#### LOC Amendment 001 (1994)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1994-08-05                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 001 to Irrevocable Letter of Credit No. S094714 extended its validity to October 10, 1995. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 002 (1995)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1995-09-06                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 002 to Irrevocable Letter of Credit No. 9094714 extended its validity to October 10, 1996. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 002.00 (2001)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                        | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2001-07-16                                                                                                   | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 002.00 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2002. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                    | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 003 (1996)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1996-08-12                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 003 to Irrevocable Letter of Credit No. 5094714 extended its validity to October 10, 1997. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 003.02 (2002)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                        | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2002-08-02                                                                                                   | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 003.02 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2003. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                    | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 004 (1997)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1997-08-12                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 004 to Irrevocable Letter of Credit No. 5094714 extended its validity to October 10, 1998. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 005 (1998)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1998-08-13                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 005 to Irrevocable Letter of Credit No. S094714 extended its validity to October 10, 1999. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 005.00 (2003)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                        | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2003-08-21                                                                                                   | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 005.00 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2004. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                    | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 006 (1999)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1999-10-13                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 006 to Irrevocable Letter of Credit No. S094714 extended its validity to October 10, 2000. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 007 (2000) and Bank Succession

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                                | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                                                                                                                                                        | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2000-09-27                                                                                                                                                                                                                           | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 007 to Irrevocable Letter of Credit No. S094714 extended its validity to October 10, 2001. Additionally, a notice was issued stating that all references to Republic National Bank of New York now mean HSBC Bank USA. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                            | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 007 (2003) and Beneficiary Change

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                    | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                                            | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2003-11-28                                                                                                               | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 007 to Credit Number SDCMTN094714 changed the beneficiary from United Jersey Bank to The Bank of New York. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                                | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 008 (2004)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2004-07-29                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 008 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2005. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 009 (2005)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2005-07-11                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 009 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2006. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 010 (2006)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2006-07-19                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 010 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2007. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 011 (2007)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2007-08-01                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 011 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2008. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 013 (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2008-08-19                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 013 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2009. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Amendment 014 (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC amendment                                                                                             | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 2008-09-29                                                                                                | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Amendment No. 014 to Credit Number SDCMTN094714 amended the date and place of expiry to October 10, 2009. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                 | BNY Rebate Analysis: 4124255.pdf |

#### LOC Issuance 5094714

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                              | Citations                        |
    | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | LOC issuance                                                                                                                                                                       | BNY Rebate Analysis: 4124255.pdf |
    | `event_date`        | 1993-10-07                                                                                                                                                                         | BNY Rebate Analysis: 4124255.pdf |
    | `event_description` | Republic National Bank of New York established Irrevocable Letter of Credit No. 5094714 for the account of NC Housing Associates #200 Co., with United Jersey Bank as beneficiary. | BNY Rebate Analysis: 4124255.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                          | BNY Rebate Analysis: 4124255.pdf |

#### Next Rebate Installment Payment Due

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                              | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | Rebate payment determination                                                                                                                                       | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2026-12-15                                                                                                                                                         | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The next rebate installment payment will be due not later than December 15, 2026, which is 60 days after October 16, 2026 (the end of the thirty-fifth Bond Year). | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | likely                                                                                                                                                             | BNY Rebate Analysis: 9587055.pdf |

#### Orrick, Herrington & Sutcliffe LLP Opinion Issuance

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                                                                                         | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Report issuance                                                                                                                                                                                                                                                                               | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 2012-11-05                                                                                                                                                                                                                                                                                    | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | Orrick, Herrington & Sutcliffe LLP issued an opinion regarding the rebate liability computations for the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1. | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                                                     | BNY Rebate Analysis: 5816087.pdf |

#### Prior Arbitrage Rebate Computation

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                         | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate computation                                                                                                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-10-16                                                                                                                                                    | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | An arbitrage rebate computation was performed for the period ending October 16, 2008, as documented in a prior report prepared by Willdan Financial Services. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                     | BNY Rebate Analysis: 9587055.pdf |

#### Prior Arbitrage Rebate Computation (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                            | Citations                        |
    | ------------------- | -------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate computation                                                               | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2008-10-16                                                                       | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | The last computation date as set forth in the Prior Report was October 16, 2008. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                        | BNY Rebate Analysis: 7438596.pdf |

#### Prior Arbitrage Rebate Report Issuance

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                                                                             | Citations                         |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Report issuance                                                                                                                   | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2008-12-17                                                                                                                        | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | A prior arbitrage rebate report was prepared by Willdan Financial Services on December 17, 2008.                                  | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                         | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Report issuance                                                                                                                   | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 2008-12-17                                                                                                                        | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | A prior arbitrage rebate report was prepared by Willdan Financial Services, which the current report relies upon for information. | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                                                                         | BNY Rebate Analysis: 5816087.pdf  |

#### Prior Rebate Liability Future Value Calculation

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                    | Citations                         |
    | ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Fund valuation                                                                                           | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                                               | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The future value of the Prior Rebate Liability was calculated as ($6,351,495.81) as of October 16, 2024. | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                | BNY Rebate Analysis: 26889358.pdf |

#### Rebate Payment Determination (2016)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                     | Citations                        |
    | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate payment determination                                                                                                                                                                              | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 2016-10-16                                                                                                                                                                                                | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | Ninety percent (90%) of the Cumulative Rebate Liability (reduced by any applicable computation date credits) is required to be rebated to the United States no later than 60 days after October 16, 2016. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                 | BNY Rebate Analysis: 7438596.pdf |

#### Rebate Payment Due Date Determination

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                | Citations                        |
    | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate payment determination                                                                                                                         | BNY Rebate Analysis: 5816087.pdf |
    | `event_date`        | 2016-10-16                                                                                                                                           | BNY Rebate Analysis: 5816087.pdf |
    | `event_description` | Ninety percent (90%) of the Cumulative Rebate Liability is required to be rebated to the United States no later than 60 days after October 16, 2016. | BNY Rebate Analysis: 5816087.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                            | BNY Rebate Analysis: 5816087.pdf |

#### Rebate Payment Due Determination (2021)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                             | Citations                        |
    | ------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Rebate payment determination                                                                                      | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                                                                        | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | It was determined that no rebate payment is due to the United States as of the October 16, 2021 computation date. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                                                         | BNY Rebate Analysis: 9587055.pdf |

#### Refunding of 1985 Series F and G Bonds

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                                                                                                                     | Citations                        |
    | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Bond refunding                                                                                                                                                                                                                                                                                                            | BNY Rebate Analysis: 7438596.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                                                                                                                                | BNY Rebate Analysis: 7438596.pdf |
    | `event_description` | The proceeds from the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were used to currently refund the Issuer's Multi-Family Housing Revenue Bonds, 1985 Series F and 1985 Series G. | BNY Rebate Analysis: 7438596.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                                                                                 | BNY Rebate Analysis: 7438596.pdf |

#### Refunding of Prior Bonds

- **Type:** `schema::flavor::event`
- **Occurrences:** 3
- **Properties:**

    | Property            | Value                                                                                                                                                                                                                                                                                                                               | Citations                         |
    | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Bond refunding                                                                                                                                                                                                                                                                                                                      | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                                                                                                                                          | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The $142,235,000 Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were used to currently refund the Issuer's Multi-Family Housing Revenue Refunding Bonds, 1985 Series F and 1985 Series G.                                                                  | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                                                                                           | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Bond refunding                                                                                                                                                                                                                                                                                                                      | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                                                                                                                                          | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | The $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were used to refund the Issuer's Multi-Family Housing Revenue Bonds, 1985 Series F and 1985 Series G.                                       | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                                                                                           | BNY Rebate Analysis: 5816087.pdf  |
    | `event_category`    | Bond refunding                                                                                                                                                                                                                                                                                                                      | BNY Rebate Analysis: 9587055.pdf  |
    | `event_date`        | 1991-10-17                                                                                                                                                                                                                                                                                                                          | BNY Rebate Analysis: 9587055.pdf  |
    | `event_description` | The proceeds from the $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project-FHA Insured Mortgages) 1991 Series 1 were used to currently refund the Issuer's Multi-Family Housing Revenue Refunding Bonds, 1985 Series F and 1985 Series G. | BNY Rebate Analysis: 9587055.pdf  |
    | `event_likelihood`  | confirmed                                                                                                                                                                                                                                                                                                                           | BNY Rebate Analysis: 9587055.pdf  |

#### Reserve I Account Valuation

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                                                                                                                                          | Citations                         |
    | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Fund valuation                                                                                                                                                                                 | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                                                                                                                                     | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The Reserve I Account was valued at $2,526,991.49 as of October 16, 2024, with gross earnings of $2,264,968.59, an internal rate of return of 6.531184%, and excess earnings of ($582,370.40). | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                                                                                                                                      | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Fund valuation                                                                                                                                                                                 | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 2012-10-16                                                                                                                                                                                     | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | The Reserve I Account was valued at $2,646,330.69 as of October 16, 2012.                                                                                                                      | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                                                                                                                                      | BNY Rebate Analysis: 5816087.pdf  |

#### Reserve I Account Valuation (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                     | Citations                        |
    | ------------------- | ------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-10-16                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Reserve I Account was valued at $2,654,320.22 as of October 16, 2008. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 9587055.pdf |

#### Reserve I Account Valuation (2021)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                     | Citations                        |
    | ------------------- | ------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                            | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                                | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Reserve I Account was valued at $7,125,072.80 as of October 16, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                 | BNY Rebate Analysis: 9587055.pdf |

#### Reserve II Account Valuation

- **Type:** `schema::flavor::event`
- **Occurrences:** 2
- **Properties:**

    | Property            | Value                                                                      | Citations                         |
    | ------------------- | -------------------------------------------------------------------------- | --------------------------------- |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 26889358.pdf |
    | `event_date`        | 2024-10-16                                                                 | BNY Rebate Analysis: 26889358.pdf |
    | `event_description` | The Reserve II Account was valued at $0.00 as of October 16, 2024.         | BNY Rebate Analysis: 26889358.pdf |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 26889358.pdf |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 5816087.pdf  |
    | `event_date`        | 2012-10-16                                                                 | BNY Rebate Analysis: 5816087.pdf  |
    | `event_description` | The Reserve II Account was valued at $3,758,764.10 as of October 16, 2012. | BNY Rebate Analysis: 5816087.pdf  |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 5816087.pdf  |

#### Reserve II Account Valuation (2008)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                      | Citations                        |
    | ------------------- | -------------------------------------------------------------------------- | -------------------------------- |
    | `event_category`    | Fund valuation                                                             | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2008-10-16                                                                 | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Reserve II Account was valued at $3,772,980.30 as of October 16, 2008. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                  | BNY Rebate Analysis: 9587055.pdf |

#### Reserve II Account Valuation (2021)

- **Type:** `schema::flavor::event`
- **Occurrences:** 1
- **Properties:**

    | Property            | Value                                                                    | Citations                        |
    | ------------------- | ------------------------------------------------------------------------ | -------------------------------- |
    | `event_category`    | Fund valuation                                                           | BNY Rebate Analysis: 9587055.pdf |
    | `event_date`        | 2021-10-16                                                               | BNY Rebate Analysis: 9587055.pdf |
    | `event_description` | The Reserve II Account was valued at $325,167.04 as of October 16, 2021. | BNY Rebate Analysis: 9587055.pdf |
    | `event_likelihood`  | confirmed                                                                | BNY Rebate Analysis: 9587055.pdf |

### legal_agreement

#### Certificate as to Arbitrage

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### engagement letter

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### EXHIBIT A

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### EXHIBIT B

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### EXHIBIT C

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### EXHIBIT D

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### INTERIM ARBITRAGE REBATE ANALYSIS

- **Type:** `legal_agreement`
- **Occurrences:** 3

#### Internal Revenue Service Form 8038-T

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### INTERNATIONAL CHAMBER OF COMMERCE PUBLICATION NO. 400

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### IRREVOCABLE LETTER OF CREDIT

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Notes and Assumptions

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### Prior Rebate Liability

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Prior Report

- **Type:** `legal_agreement`
- **Occurrences:** 5

#### Report

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### Schedule A - Summary of Rebate Analysis

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### Schedule B - Sources & Uses of Funds

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### Schedule C - Reserve I Account

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule C1 - Reserve I Account Remaining Balance Analyses

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule C2 - Reserve I Account Net Nonpurpose Investments Cash Flow

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule D - Reserve II Account

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule D1 - Reserve II Account Remaining Balance Analyses

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule D2 - Reserve II Account Net Nonpurpose Investments Cash Flow

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule E - Prior Rebate Liability

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule E1 - Prior Rebate Liability Future Value Calculation

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule F - Liquidity I Account

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule F1 - Liquidity I Account Remaining Balance Analyses

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule F2 - Liquidity I Account Net Nonpurpose Investments Cash Flow

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule G - Liquidity II Account

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule G1 - Liquidity II Account Remaining Balance Analyses

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Schedule G2 - Liquidity II Account Net Nonpurpose Investments Cash Flow

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### SECTION 10.3

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### SECTION 5.6

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### Temporary Treasury Regulations Section 1.148-4T(e)(2)

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### Transmittal Letter

- **Type:** `legal_agreement`
- **Occurrences:** 2

#### TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### UNIFORM CUSTOMS

- **Type:** `legal_agreement`
- **Occurrences:** 1

#### UNIFORM CUSTOMS AND PRACTICE FOR DOCUMENTARY CREDITS (1983 REVISION)

- **Type:** `legal_agreement`
- **Occurrences:** 1

### fund_account

#### 1851170072

- **Type:** `fund_account`
- **Occurrences:** 1

#### 7699940

- **Type:** `fund_account`
- **Occurrences:** 1

#### 931806

- **Type:** `fund_account`
- **Occurrences:** 1

#### ACS D52671BNY

- **Type:** `fund_account`
- **Occurrences:** 1

#### COLLATERAL SUBACCOUNT

- **Type:** `fund_account`
- **Occurrences:** 1

#### Construction Account

- **Type:** `fund_account`
- **Occurrences:** 8

#### Debt Service Reserve Account

- **Type:** `fund_account`
- **Occurrences:** 8

#### DEBT SERVICE RESERVE ACCOUNT

- **Type:** `fund_account`
- **Occurrences:** 1

#### Escrow Fund

- **Type:** `fund_account`
- **Occurrences:** 8

#### Liquidity I

- **Type:** `fund_account`
- **Occurrences:** 2

#### Liquidity I Account

- **Type:** `fund_account`
- **Occurrences:** 31
- **Properties:**

    | Property                     | Value        | Citations                         |
    | ---------------------------- | ------------ | --------------------------------- |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 26889358.pdf |
    | `computation_date_valuation` | $0.28        | BNY Rebate Analysis: 26889358.pdf |
    | `gross_earnings`             | $314,276.42  | BNY Rebate Analysis: 26889358.pdf |
    | `internal_rate_of_return`    | 7.034857%    | BNY Rebate Analysis: 26889358.pdf |
    | `excess_earnings`            | ($32,927.96) | BNY Rebate Analysis: 26889358.pdf |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 5816087.pdf  |
    | `computation_date_valuation` | $351,983.72  | BNY Rebate Analysis: 5816087.pdf  |
    | `gross_earnings`             | $82,847.37   | BNY Rebate Analysis: 5816087.pdf  |
    | `internal_rate_of_return`    | 7.068937%    | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($4,699.95)  | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($9,378.32)  | BNY Rebate Analysis: 7438596.pdf  |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 7438596.pdf  |
    | `computation_date_valuation` | $353,716.36  | BNY Rebate Analysis: 7438596.pdf  |
    | `gross_earnings`             | $145,584.33  | BNY Rebate Analysis: 7438596.pdf  |
    | `internal_rate_of_return`    | 7.064953%    | BNY Rebate Analysis: 7438596.pdf  |
    | `excess_earnings`            | ($23,907.28) | BNY Rebate Analysis: 9587055.pdf  |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 9587055.pdf  |
    | `computation_date_valuation` | $353,320.50  | BNY Rebate Analysis: 9587055.pdf  |
    | `gross_earnings`             | $270,946.30  | BNY Rebate Analysis: 9587055.pdf  |
    | `internal_rate_of_return`    | 7.040900%    | BNY Rebate Analysis: 9587055.pdf  |

#### Liquidity II Account

- **Type:** `fund_account`
- **Occurrences:** 34
- **Properties:**

    | Property                     | Value        | Citations                         |
    | ---------------------------- | ------------ | --------------------------------- |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 26889358.pdf |
    | `computation_date_valuation` | $0.48        | BNY Rebate Analysis: 26889358.pdf |
    | `gross_earnings`             | $452,691.64  | BNY Rebate Analysis: 26889358.pdf |
    | `internal_rate_of_return`    | 6.830810%    | BNY Rebate Analysis: 26889358.pdf |
    | `excess_earnings`            | ($74,553.43) | BNY Rebate Analysis: 26889358.pdf |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 5816087.pdf  |
    | `computation_date_valuation` | $507,439.46  | BNY Rebate Analysis: 5816087.pdf  |
    | `gross_earnings`             | $117,223.47  | BNY Rebate Analysis: 5816087.pdf  |
    | `internal_rate_of_return`    | 6.740736%    | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($13,485.83) | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($25,228.07) | BNY Rebate Analysis: 7438596.pdf  |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 7438596.pdf  |
    | `computation_date_valuation` | $509,006.49  | BNY Rebate Analysis: 7438596.pdf  |
    | `gross_earnings`             | $204,603.33  | BNY Rebate Analysis: 7438596.pdf  |
    | `internal_rate_of_return`    | 6.769502%    | BNY Rebate Analysis: 7438596.pdf  |
    | `excess_earnings`            | ($56,246.23) | BNY Rebate Analysis: 9587055.pdf  |
    | `current_fund_status`        | Active       | BNY Rebate Analysis: 9587055.pdf  |
    | `computation_date_valuation` | $504,328.67  | BNY Rebate Analysis: 9587055.pdf  |
    | `gross_earnings`             | $390,487.11  | BNY Rebate Analysis: 9587055.pdf  |
    | `internal_rate_of_return`    | 6.818100%    | BNY Rebate Analysis: 9587055.pdf  |

#### Liquidity II Accounts

- **Type:** `fund_account`
- **Occurrences:** 2

#### Newport 91 Col 11

- **Type:** `fund_account`
- **Occurrences:** 1

#### Prior Rebate Liability

- **Type:** `fund_account`
- **Occurrences:** 24
- **Properties:**

    | Property                     | Value           | Citations                         |
    | ---------------------------- | --------------- | --------------------------------- |
    | `current_fund_status`        | Inactive        | BNY Rebate Analysis: 26889358.pdf |
    | `computation_date_valuation` | N/A             | BNY Rebate Analysis: 26889358.pdf |
    | `gross_earnings`             | N/A             | BNY Rebate Analysis: 26889358.pdf |
    | `internal_rate_of_return`    | N/A             | BNY Rebate Analysis: 26889358.pdf |
    | `excess_earnings`            | ($6,351,495.81) | BNY Rebate Analysis: 26889358.pdf |
    | `current_fund_status`        | Inactive        | BNY Rebate Analysis: 5816087.pdf  |
    | `computation_date_valuation` | N/A             | BNY Rebate Analysis: 5816087.pdf  |
    | `gross_earnings`             | N/A             | BNY Rebate Analysis: 5816087.pdf  |
    | `internal_rate_of_return`    | N/A             | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($2,649,327.63) | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($3,296,634.16) | BNY Rebate Analysis: 7438596.pdf  |
    | `current_fund_status`        | Inactive        | BNY Rebate Analysis: 7438596.pdf  |
    | `computation_date_valuation` | N/A             | BNY Rebate Analysis: 7438596.pdf  |
    | `gross_earnings`             | N/A             | BNY Rebate Analysis: 7438596.pdf  |
    | `internal_rate_of_return`    | N/A             | BNY Rebate Analysis: 7438596.pdf  |
    | `excess_earnings`            | ($5,104,355.68) | BNY Rebate Analysis: 9587055.pdf  |
    | `current_fund_status`        | Inactive        | BNY Rebate Analysis: 9587055.pdf  |
    | `computation_date_valuation` | N/A             | BNY Rebate Analysis: 9587055.pdf  |
    | `gross_earnings`             | N/A             | BNY Rebate Analysis: 9587055.pdf  |
    | `internal_rate_of_return`    | N/A             | BNY Rebate Analysis: 9587055.pdf  |

#### Reserve I

- **Type:** `fund_account`
- **Occurrences:** 2

#### Reserve I Account

- **Type:** `fund_account`
- **Occurrences:** 34
- **Properties:**

    | Property                     | Value         | Citations                         |
    | ---------------------------- | ------------- | --------------------------------- |
    | `current_fund_status`        | Active        | BNY Rebate Analysis: 26889358.pdf |
    | `computation_date_valuation` | $2,526,991.49 | BNY Rebate Analysis: 26889358.pdf |
    | `gross_earnings`             | $2,264,968.59 | BNY Rebate Analysis: 26889358.pdf |
    | `internal_rate_of_return`    | 6.531184%     | BNY Rebate Analysis: 26889358.pdf |
    | `excess_earnings`            | ($582,370.40) | BNY Rebate Analysis: 26889358.pdf |
    | `current_fund_status`        | Active        | BNY Rebate Analysis: 5816087.pdf  |
    | `computation_date_valuation` | $2,646,330.69 | BNY Rebate Analysis: 5816087.pdf  |
    | `gross_earnings`             | $612,725.67   | BNY Rebate Analysis: 5816087.pdf  |
    | `internal_rate_of_return`    | 6.273046%     | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($127,838.71) | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($215,967.06) | BNY Rebate Analysis: 7438596.pdf  |
    | `current_fund_status`        | Active        | BNY Rebate Analysis: 7438596.pdf  |
    | `computation_date_valuation` | $2,644,345.61 | BNY Rebate Analysis: 7438596.pdf  |
    | `gross_earnings`             | $1,041,138.66 | BNY Rebate Analysis: 7438596.pdf  |
    | `internal_rate_of_return`    | 6.392225%     | BNY Rebate Analysis: 7438596.pdf  |
    | `excess_earnings`            | ($442,426.62) | BNY Rebate Analysis: 9587055.pdf  |
    | `current_fund_status`        | Active        | BNY Rebate Analysis: 9587055.pdf  |
    | `computation_date_valuation` | $7,125,072.80 | BNY Rebate Analysis: 9587055.pdf  |
    | `gross_earnings`             | $1,831,036.42 | BNY Rebate Analysis: 9587055.pdf  |
    | `internal_rate_of_return`    | 6.475450%     | BNY Rebate Analysis: 9587055.pdf  |

#### Reserve II

- **Type:** `fund_account`
- **Occurrences:** 2

#### Reserve II Account

- **Type:** `fund_account`
- **Occurrences:** 31
- **Properties:**

    | Property                     | Value           | Citations                         |
    | ---------------------------- | --------------- | --------------------------------- |
    | `current_fund_status`        | Inactive        | BNY Rebate Analysis: 26889358.pdf |
    | `computation_date_valuation` | $0.00           | BNY Rebate Analysis: 26889358.pdf |
    | `gross_earnings`             | $2,860,951.33   | BNY Rebate Analysis: 26889358.pdf |
    | `internal_rate_of_return`    | 6.283487%       | BNY Rebate Analysis: 26889358.pdf |
    | `excess_earnings`            | ($1,076,359.60) | BNY Rebate Analysis: 26889358.pdf |
    | `current_fund_status`        | Active          | BNY Rebate Analysis: 5816087.pdf  |
    | `computation_date_valuation` | $3,758,764.10   | BNY Rebate Analysis: 5816087.pdf  |
    | `gross_earnings`             | $882,300.98     | BNY Rebate Analysis: 5816087.pdf  |
    | `internal_rate_of_return`    | 6.032260%       | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($231,539.37)   | BNY Rebate Analysis: 5816087.pdf  |
    | `excess_earnings`            | ($449,442.81)   | BNY Rebate Analysis: 7438596.pdf  |
    | `current_fund_status`        | Active          | BNY Rebate Analysis: 7438596.pdf  |
    | `computation_date_valuation` | $3,772,999.60   | BNY Rebate Analysis: 7438596.pdf  |
    | `gross_earnings`             | $1,550,152.20   | BNY Rebate Analysis: 7438596.pdf  |
    | `internal_rate_of_return`    | 6.051104%       | BNY Rebate Analysis: 7438596.pdf  |
    | `excess_earnings`            | ($864,833.75)   | BNY Rebate Analysis: 9587055.pdf  |
    | `current_fund_status`        | Active          | BNY Rebate Analysis: 9587055.pdf  |
    | `computation_date_valuation` | $325,167.04     | BNY Rebate Analysis: 9587055.pdf  |
    | `gross_earnings`             | $2,856,360.69   | BNY Rebate Analysis: 9587055.pdf  |
    | `internal_rate_of_return`    | 6.282721%       | BNY Rebate Analysis: 9587055.pdf  |

#### Revenue Account

- **Type:** `fund_account`
- **Occurrences:** 8

#### Schedule A - Summary of Rebate Analysis

- **Type:** `fund_account`
- **Occurrences:** 1

#### Schedule B - Sources & Uses of Funds

- **Type:** `fund_account`
- **Occurrences:** 1

#### Schedule C - Reserve I Account

- **Type:** `fund_account`
- **Occurrences:** 3

#### Schedule D - Reserve II Account

- **Type:** `fund_account`
- **Occurrences:** 3

#### Schedule E - Prior Rebate Liability

- **Type:** `fund_account`
- **Occurrences:** 3

#### Schedule F - Liquidity I Account

- **Type:** `fund_account`
- **Occurrences:** 3

#### Schedule G - Liquidity II Account

- **Type:** `fund_account`
- **Occurrences:** 3

#### Totals:

- **Type:** `fund_account`
- **Occurrences:** 5
- **Properties:**

    | Property                     | Value           | Citations                        |
    | ---------------------------- | --------------- | -------------------------------- |
    | `excess_earnings`            | ($3,996,650.42) | BNY Rebate Analysis: 7438596.pdf |
    | `current_fund_status`        | Totals:         | BNY Rebate Analysis: 7438596.pdf |
    | `computation_date_valuation` | $7,280,068.05   | BNY Rebate Analysis: 7438596.pdf |
    | `gross_earnings`             | $2,941,478.51   | BNY Rebate Analysis: 7438596.pdf |

### location

#### 210 MAIN STREET HACKENSACK, NEW JERSEY 07602

- **Type:** `location`
- **Occurrences:** 1

#### 2711 N. Haskell Avenue

- **Type:** `location`
- **Occurrences:** 1

#### 2711 N. Haskell Avenue, Lockbox 35, Suite 2600 SW, Dallas, TX 75204

- **Type:** `location`
- **Occurrences:** 1

#### 2711 NORTH HASKELL AVENUE

- **Type:** `location`
- **Occurrences:** 0

#### 385 RIFLE CAMP ROAD WEST PATERSON, NJ 07424

- **Type:** `location`
- **Occurrences:** 1

#### 452 Fifth Avenue, New York, N.Y. 10018

- **Type:** `location`
- **Occurrences:** 1

#### 51 WEST 52ND STREET, NEW YORK, NY 10019

- **Type:** `location`
- **Occurrences:** 1

#### 637 South Clinton Avenue

- **Type:** `location`
- **Occurrences:** 1

#### 637 South Clinton Avenue, P.O. Box 18550, Trenton, NJ 08650-2085

- **Type:** `location`
- **Occurrences:** 1

#### 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374

- **Type:** `location`
- **Occurrences:** 1

#### Dallas, TX

- **Type:** `location`
- **Occurrences:** 2

#### Dallas, TX 75206

- **Type:** `location`
- **Occurrences:** 1

#### Lockbox 35, Suite 2600 SW

- **Type:** `location`
- **Occurrences:** 1

#### New York, NY

- **Type:** `location`
- **Occurrences:** 1

#### New York, NY 10019-6142

- **Type:** `location`
- **Occurrences:** 1

#### Newport Project

- **Type:** `location`
- **Occurrences:** 1

#### P.O. Box 18550

- **Type:** `location`
- **Occurrences:** 1

#### Presidential Plaza

- **Type:** `location`
- **Occurrences:** 1

#### Presidential Plaza at Newport Project

- **Type:** `location`
- **Occurrences:** 2

#### STATE OF NEW YORK

- **Type:** `location`
- **Occurrences:** 1

#### Trenton, NJ

- **Type:** `location`
- **Occurrences:** 2

#### Trenton, NJ 08650-2085

- **Type:** `location`
- **Occurrences:** 1

### organization

#### A NEW JERSEY GENERAL PARTNERSHIP

- **Type:** `organization`
- **Occurrences:** 1

#### BLICBANK NEW YORK

- **Type:** `organization`
- **Occurrences:** 1

#### BLX

- **Type:** `organization`
- **Occurrences:** 1

#### BLX Group LLC

- **Type:** `organization`
- **Occurrences:** 16

#### BNY

- **Type:** `organization`
- **Occurrences:** 8

#### CORPORATE TRUST DIVISION

- **Type:** `organization`
- **Occurrences:** 1

#### Department of the Treasury

- **Type:** `organization`
- **Occurrences:** 3

#### HSBC

- **Type:** `organization`
- **Occurrences:** 2

#### HSBC BANK USA

- **Type:** `organization`
- **Occurrences:** 2

#### HSBC Bank USA Trade Services

- **Type:** `organization`
- **Occurrences:** 1

#### LEFRAK ORGANIZATION INC.

- **Type:** `organization`
- **Occurrences:** 2

#### NC HOUSING ASSOCIATES #200 CO.

- **Type:** `organization`
- **Occurrences:** 4

#### New Jersey Housing and Mortgage Finance Agency

- **Type:** `organization`
- **Occurrences:** 13

#### NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY

- **Type:** `organization`
- **Occurrences:** 2

#### orrick

- **Type:** `organization`
- **Occurrences:** 1

#### Orrick, Herrington & Sutcliffe LLP

- **Type:** `organization`
- **Occurrences:** 14

#### REPUBLIC NATIONAL BANK OF NEW YORK

- **Type:** `organization`
- **Occurrences:** 3

#### THE BANK OF NEW YORK

- **Type:** `organization`
- **Occurrences:** 3

#### Treasury

- **Type:** `organization`
- **Occurrences:** 1

#### UNITED JERSEY BANK

- **Type:** `organization`
- **Occurrences:** 4

#### United States

- **Type:** `organization`
- **Occurrences:** 2

#### Willdan Financial Services

- **Type:** `organization`
- **Occurrences:** 8

### financial_instrument

#### $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond

- **Type:** `financial_instrument`
- **Occurrences:** 159
- **Properties:**

    | Property                                                         | Value          | Citations                         |
    | ---------------------------------------------------------------- | -------------- | --------------------------------- |
    | `sources_of_funds_par_amount_bond_proceeds`                      | 142,235,000.00 | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_+_original_issue_premium_bond_proceeds`        | 0.00           | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds___original_issue_discount_bond_proceeds`       | 867,513.56     | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_net_production_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_net_production_other_sources`                  | 2.129.935.30   | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_net_production_total`                          | 143,102,513.56 | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_agency_contribution_prior_bond_proceeds`       | 19,051,319.80  | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_agency_contribution_total`                     | 19,051,319.80  | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_total_sources:_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_total_sources:_prior_bond_proceeds`            | 19,051,319.80  | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_total_sources:_other_sources`                  | 2,129,935.30   | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_total_sources:_total`                          | 164,283,768.66 | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`       | 142,235,000.00 | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds` | 11,970,164.80  | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_redemption_of_refunded_bonds_other_sources`       | 329,935.30     | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_redemption_of_refunded_bonds_total`               | 154,535,100.10 | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_costs_of_issuance_other_sources`                  | 800,000.00     | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_costs_of_issuance_total`                          | 800,000.00     | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds` | 7,081,155.00   | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_debt_service_reserve_account_total`               | 7,081,155.00   | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_revenue_account_bond_proceeds`                    | 867,513.56     | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_revenue_account_total`                            | 867,513.56     | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_underwriter's_discount_other_sources`             | 1,000,000.00   | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_underwriter's_discount_total`                     | 1,000,000.00   | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_total_uses:_bond_proceeds`                        | 143,102,513.56 | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_total_uses:_prior_bond_proceeds`                  | 19,051,319.80  | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_total_uses:_other_sources`                        | 2,129,935.30   | BNY Rebate Analysis: 26889358.pdf |
    | `uses_of_funds_total_uses:_total`                                | 164,283,768.66 | BNY Rebate Analysis: 26889358.pdf |
    | `sources_of_funds_par_amount_bond_proceeds`                      | 142,235,000.00 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_par_amount_prior_bond_proceeds`                | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_par_amount_other_sources`                      | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_par_amount_total`                              | 142,235,000.00 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_+_original_issue_premium_bond_proceeds`        | 0.00           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_+_original_issue_premium_prior_bond_proceeds`  | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_+_original_issue_premium_other_sources`        | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_+_original_issue_premium_total`                | 0.00           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_original_issue_discount_bond_proceeds`         | 867,513.56     | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_original_issue_discount_prior_bond_proceeds`   | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_original_issue_discount_other_sources`         | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_original_issue_discount_total`                 | 867,513.56     | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_net_production_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_net_production_prior_bond_proceeds`            | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_net_production_other_sources`                  | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_net_production_total`                          | 143,102,513.56 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_agency_contribution_bond_proceeds`             | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_agency_contribution_prior_bond_proceeds`       | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_agency_contribution_other_sources`             | 2,129,935.30   | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_agency_contribution_total`                     | 2,129,935.30   | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_prior_bond_proceeds_bond_proceeds`             | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_prior_bond_proceeds_prior_bond_proceeds`       | 19,051,319.80  | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_prior_bond_proceeds_other_sources`             | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_prior_bond_proceeds_total`                     | 19,051,319.80  | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_total_sources:_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_total_sources:_prior_bond_proceeds`            | 19,051,319.80  | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_total_sources:_other_sources`                  | 2,129,935.30   | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_total_sources:_total`                          | 164,283,768.66 | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`       | 142,235,000.00 | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds` | 11,970,164.80  | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_other_sources`       | 329,935.30     | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_total`               | 154,535,100.10 | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_costs_of_issuance_bond_proceeds`                  | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_costs_of_issuance_prior_bond_proceeds`            | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_costs_of_issuance_other_sources`                  | 800,000.00     | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_costs_of_issuance_total`                          | 800,000.00     | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_debt_service_reserve_account_bond_proceeds`       | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds` | 7,081,155.00   | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_debt_service_reserve_account_other_sources`       | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_debt_service_reserve_account_total`               | 7,081,155.00   | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_revenue_account_bond_proceeds`                    | 867,513.56     | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_revenue_account_prior_bond_proceeds`              | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_revenue_account_other_sources`                    | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_revenue_account_total`                            | 867,513.56     | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_underwriter's_discount_bond_proceeds`             | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_underwriter's_discount_prior_bond_proceeds`       | null           | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_underwriter's_discount_other_sources`             | 1,000,000.00   | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_underwriter's_discount_total`                     | 1,000,000.00   | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_total_uses:_bond_proceeds`                        | 143,102,513.56 | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_total_uses:_prior_bond_proceeds`                  | 19,051,319.80  | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_total_uses:_other_sources`                        | 2,129,935.30   | BNY Rebate Analysis: 5816087.pdf  |
    | `uses_of_funds_total_uses:_total`                                | 164,283,768.66 | BNY Rebate Analysis: 5816087.pdf  |
    | `sources_of_funds_par_amount_bond_proceeds`                      | 142,235,000.00 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_par_amount_total`                              | 142,235,000.00 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_+_original_issue_premium_bond_proceeds`        | 0.00           | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_+_original_issue_premium_total`                | 0.00           | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds___original_issue_discount_bond_proceeds`       | 867,513.56     | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds___original_issue_discount_total`               | 867,513.56     | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_net_production_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_net_production_total`                          | 143,102,513.56 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_agency_contribution_other_sources`             | 2,129,935.30   | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_agency_contribution_total`                     | 2,129,935.30   | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_prior_bond_proceeds_prior_bond_proceeds`       | 19,051,319.80  | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_prior_bond_proceeds_total`                     | 19,051,319.80  | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_total_sources:_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_total_sources:_prior_bond_proceeds`            | 19,051,319.80  | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_total_sources:_other_sources`                  | 2,129,935.30   | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_total_sources:_total`                          | 164,283,768.66 | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`       | 142,235,000.00 | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds` | 11,970,164.80  | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_other_sources`       | 329,935.30     | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_total`               | 154,535,100.10 | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_costs_of_issuance_other_sources`                  | 800,000.00     | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_costs_of_issuance_total`                          | 800,000.00     | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds` | 7,081,155.00   | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_debt_service_reserve_account_total`               | 7,081,155.00   | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_revenue_account_bond_proceeds`                    | 867,513.56     | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_revenue_account_total`                            | 867,513.56     | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_underwriter's_discount_other_sources`             | 1,000,000.00   | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_underwriter's_discount_total`                     | 1,000,000.00   | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_total_uses:_bond_proceeds`                        | 143,102,513.56 | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_total_uses:_prior_bond_proceeds`                  | 19,051,319.80  | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_total_uses:_other_sources`                        | 2,129,935.30   | BNY Rebate Analysis: 7438596.pdf  |
    | `uses_of_funds_total_uses:_total`                                | 164,283,768.66 | BNY Rebate Analysis: 7438596.pdf  |
    | `sources_of_funds_par_amount_bond_proceeds`                      | 142,235,000.00 | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_+_original_issue_premium_bond_proceeds`        | 0.00           | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds___original_issue_discount_bond_proceeds`       | 867,513.56     | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_net_production_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_net_production_other_sources`                  | 2,129,935.30   | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_net_production_total`                          | 145,232,448.86 | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_agency_contribution_prior_bond_proceeds`       | 19,051,319.80  | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_agency_contribution_total`                     | 19,051,319.80  | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_total_sources:_bond_proceeds`                  | 143,102,513.56 | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_total_sources:_prior_bond_proceeds`            | 19,051,319.80  | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_total_sources:_other_sources`                  | 2,129,935.30   | BNY Rebate Analysis: 9587055.pdf  |
    | `sources_of_funds_total_sources:_total`                          | 164,283,768.66 | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_bond_proceeds`       | 142,235,000.00 | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds` | 11,970,164.80  | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_other_sources`       | 329,935.30     | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_redemption_of_refunded_bonds_total`               | 154,535,100.10 | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_costs_of_issuance_other_sources`                  | 800,000.00     | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_costs_of_issuance_total`                          | 800,000.00     | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_debt_service_reserve_account_prior_bond_proceeds` | 7,081,155.00   | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_debt_service_reserve_account_total`               | 7,081,155.00   | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_revenue_account_bond_proceeds`                    | 867,513.56     | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_revenue_account_total`                            | 867,513.56     | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_underwriter's_discount_other_sources`             | 1,000,000.00   | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_underwriter's_discount_total`                     | 1,000,000.00   | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_total_uses:_bond_proceeds`                        | 143,102,513.56 | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_total_uses:_prior_bond_proceeds`                  | 19,051,319.80  | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_total_uses:_other_sources`                        | 2,129,935.30   | BNY Rebate Analysis: 9587055.pdf  |
    | `uses_of_funds_total_uses:_total`                                | 164,283,768.66 | BNY Rebate Analysis: 9587055.pdf  |

#### AMENDMENT (NO. 002.00 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 003.02)

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 005.00 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 007 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 008 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 009 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 010 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 011 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 013 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### AMENDMENT (NO. 014 )

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### BLICUS 33

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### BNY Rebate Analysis: 4124255.pdf

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### Federated MM

- **Type:** `financial_instrument`
- **Occurrences:** 4

#### Morgan IA

- **Type:** `financial_instrument`
- **Occurrences:** 4

#### SDCMTN094714

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### Telex: 234967 (RCA)

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### Telex: 620274 (MCI), 7607367 (CCI)

- **Type:** `financial_instrument`
- **Occurrences:** 1

#### U.S. $1,307,116.07

- **Type:** `financial_instrument`
- **Occurrences:** 1

### document

#### BNY-26889358.pdf

- **Type:** `document`
- **Occurrences:** 1

#### BNY-4124255.pdf

- **Type:** `document`
- **Occurrences:** 1

#### BNY-5816087.pdf

- **Type:** `document`
- **Occurrences:** 1

#### BNY-7438596.pdf

- **Type:** `document`
- **Occurrences:** 1

#### BNY-9587055.pdf

- **Type:** `document`
- **Occurrences:** 1

### person

#### ARTHUR KLEIN

- **Type:** `person`
- **Occurrences:** 2

#### JOSEPH E. LUDES

- **Type:** `person`
- **Occurrences:** 2

#### JULIANNE MEDICI

- **Type:** `person`
- **Occurrences:** 2

---

## Edges

### appears_in

| Source                                                                                                 | Target           | Citations                         | Timestamp            |
| ------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------- | -------------------- |
| New Jersey Housing and Mortgage Finance Agency                                                         | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Presidential Plaza at Newport Project                                                                  | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BLX Group LLC                                                                                          | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP                                                                     | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Transmittal Letter                                                                                     | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Notes and Assumptions                                                                                  | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve I Account                                                                                      | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account                                                                                     | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Rebate Liability                                                                                 | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account                                                                                    | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account                                                                                   | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Trenton, NJ 08650-2085                                                                                 | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Report                                                                                                 | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Department of the Treasury                                                                             | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Willdan Financial Services                                                                             | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Dallas, TX 75206                                                                                       | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| New York, NY 10019-6142                                                                                | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BNY                                                                                                    | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| engagement letter                                                                                      | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Certificate as to Arbitrage                                                                            | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Revenue Account                                                                                        | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Escrow Fund                                                                                            | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Debt Service Reserve Account                                                                           | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Construction Account                                                                                   | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Morgan IA                                                                                              | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Federated MM                                                                                           | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Rebate Liability                                                                                 | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-26889358.pdf | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 452 Fifth Avenue, New York, N.Y. 10018                                                                 | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| Telex: 234967 (RCA)                                                                                    | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| BLICBANK NEW YORK                                                                                      | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| BLICUS 33                                                                                              | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| Newport 91 Col 11                                                                                      | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 931806                                                                                                 | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| ACS D52671BNY                                                                                          | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| IRREVOCABLE LETTER OF CREDIT                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| UNITED JERSEY BANK                                                                                     | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 210 MAIN STREET HACKENSACK, NEW JERSEY 07602                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| CORPORATE TRUST DIVISION                                                                               | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| A NEW JERSEY GENERAL PARTNERSHIP                                                                       | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| U.S. $1,307,116.07                                                                                     | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| EXHIBIT A                                                                                              | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| EXHIBIT C                                                                                              | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| EXHIBIT B                                                                                              | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| COLLATERAL SUBACCOUNT                                                                                  | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| DEBT SERVICE RESERVE ACCOUNT                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY                                                         | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| SECTION 5.6                                                                                            | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| SECTION 10.3                                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| EXHIBIT D                                                                                              | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| UNIFORM CUSTOMS AND PRACTICE FOR DOCUMENTARY CREDITS (1983 REVISION)                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| INTERNATIONAL CHAMBER OF COMMERCE PUBLICATION NO. 400                                                  | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| UNIFORM CUSTOMS                                                                                        | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| STATE OF NEW YORK                                                                                      | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| JOSEPH E. LUDES                                                                                        | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LEFRAK ORGANIZATION INC.                                                                               | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| ARTHUR KLEIN                                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374                                                               | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| Telex: 620274 (MCI), 7607367 (CCI)                                                                     | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| HSBC BANK USA                                                                                          | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 1851170072                                                                                             | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 7699940                                                                                                | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| HSBC                                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| SDCMTN094714                                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 002.00 )                                                                                | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 003.02)                                                                                 | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| HSBC Bank USA Trade Services                                                                           | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| THE BANK OF NEW YORK                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| 385 RIFLE CAMP ROAD WEST PATERSON, NJ 07424                                                            | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 007 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 005.00 )                                                                                | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 008 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 009 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 010 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 011 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| JULIANNE MEDICI                                                                                        | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 013 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| AMENDMENT (NO. 014 )                                                                                   | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| BNY Rebate Analysis: 4124255.pdf                                                                       | BNY-4124255.pdf  | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| BLX Group LLC                                                                                          | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency                                                         | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Dallas, TX                                                                                             | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| 2711 N. Haskell Avenue                                                                                 | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Lockbox 35, Suite 2600 SW                                                                              | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Presidential Plaza at Newport Project                                                                  | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP                                                                     | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule A - Summary of Rebate Analysis                                                                | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule B - Sources & Uses of Funds                                                                   | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule C - Reserve I Account                                                                         | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule D - Reserve II Account                                                                        | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule E - Prior Rebate Liability                                                                    | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule F - Liquidity I Account                                                                       | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Schedule G - Liquidity II Account                                                                      | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| 637 South Clinton Avenue                                                                               | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| P.O. Box 18550                                                                                         | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Trenton, NJ                                                                                            | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Willdan Financial Services                                                                             | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Department of the Treasury                                                                             | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Report                                                                                           | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| United States                                                                                          | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BNY                                                                                                    | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Revenue Account                                                                                        | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Escrow Fund                                                                                            | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Debt Service Reserve Account                                                                           | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Construction Account                                                                                   | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I                                                                                              | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II                                                                                             | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I                                                                                            | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Accounts                                                                                  | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Morgan IA                                                                                              | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Federated MM                                                                                           | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I Account                                                                                      | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II Account                                                                                     | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Rebate Liability                                                                                 | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I Account                                                                                    | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Account                                                                                   | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-5816087.pdf  | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC                                                                                          | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency                                                         | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| 2711 N. Haskell Avenue, Lockbox 35, Suite 2600 SW, Dallas, TX 75204                                    | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Presidential Plaza                                                                                     | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Newport Project                                                                                        | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP                                                                     | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Transmittal Letter                                                                                     | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Notes and Assumptions                                                                                  | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule A - Summary of Rebate Analysis                                                                | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule B - Sources & Uses of Funds                                                                   | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule C - Reserve I Account                                                                         | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve I Account                                                                                      | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule D - Reserve II Account                                                                        | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve II Account                                                                                     | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule E - Prior Rebate Liability                                                                    | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Prior Rebate Liability                                                                                 | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule F - Liquidity I Account                                                                       | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity I Account                                                                                    | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule G - Liquidity II Account                                                                      | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity II Account                                                                                   | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| 637 South Clinton Avenue, P.O. Box 18550, Trenton, NJ 08650-2085                                       | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Report                                                                                                 | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Department of the Treasury                                                                             | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Willdan Financial Services                                                                             | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Prior Report                                                                                           | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| BNY                                                                                                    | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| 51 WEST 52ND STREET, NEW YORK, NY 10019                                                                | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Certificate as to Arbitrage                                                                            | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Temporary Treasury Regulations Section 1.148-4T(e)(2)                                                  | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Revenue Account                                                                                        | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Escrow Fund                                                                                            | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Debt Service Reserve Account                                                                           | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Construction Account                                                                                   | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Morgan IA                                                                                              | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Federated MM                                                                                           | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule C1 - Reserve I Account Remaining Balance Analyses                                             | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule C2 - Reserve I Account Net Nonpurpose Investments Cash Flow                                   | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule D1 - Reserve II Account Remaining Balance Analyses                                            | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule D2 - Reserve II Account Net Nonpurpose Investments Cash Flow                                  | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule E1 - Prior Rebate Liability Future Value Calculation                                          | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule F1 - Liquidity I Account Remaining Balance Analyses                                           | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule F2 - Liquidity I Account Net Nonpurpose Investments Cash Flow                                 | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule G1 - Liquidity II Account Remaining Balance Analyses                                          | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule G2 - Liquidity II Account Net Nonpurpose Investments Cash Flow                                | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Totals:                                                                                                | BNY-7438596.pdf  | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency                                                         | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| BLX                                                                                                    | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP                                                                     | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule A - Summary of Rebate Analysis                                                                | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule B - Sources & Uses of Funds                                                                   | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule C - Reserve I Account                                                                         | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule D - Reserve II Account                                                                        | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule E - Prior Rebate Liability                                                                    | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule F - Liquidity I Account                                                                       | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule G - Liquidity II Account                                                                      | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| BLX Group LLC                                                                                          | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Dallas, TX                                                                                             | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Trenton, NJ                                                                                            | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Treasury                                                                                               | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Willdan Financial Services                                                                             | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| United States                                                                                          | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Internal Revenue Service Form 8038-T                                                                   | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| orrick                                                                                                 | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| New York, NY                                                                                           | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| BNY                                                                                                    | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Temporary Treasury Regulations Section 1.148-4T(e)(2)                                                  | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Revenue Account                                                                                        | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Escrow Fund                                                                                            | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Debt Service Reserve Account                                                                           | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Construction Account                                                                                   | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Morgan IA                                                                                              | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Federated MM                                                                                           | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve I Account                                                                                      | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve II Account                                                                                     | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Prior Rebate Liability                                                                                 | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity I Account                                                                                    | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity II Account                                                                                   | BNY-9587055.pdf  | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### schema::relationship::participant

| Source                                                          | Target                                                                                                 | Citations                         | Timestamp            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| Issuance of Multifamily Housing Revenue Refunding Bonds         | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Issuance of Multifamily Housing Revenue Refunding Bonds         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation Period            | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation Period            | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation Period            | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Report Issuance               | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Report Issuance               | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Report Issuance               | INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Arbitrage Rebate Report Issuance                          | Willdan Financial Services                                                                             | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Arbitrage Rebate Report Issuance                          | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Cumulative Rebate Liability Determination                       | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Cumulative Rebate Liability Determination                       | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Cumulative Rebate Liability Determination                       | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve I Account Valuation                                     | Reserve I Account                                                                                      | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve I Account Valuation                                     | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account Valuation                                    | Reserve II Account                                                                                     | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account Valuation                                    | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Rebate Liability Future Value Calculation                 | Prior Rebate Liability                                                                                 | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Rebate Liability Future Value Calculation                 | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account Valuation                                   | Liquidity I Account                                                                                    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account Valuation                                   | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account Valuation                                  | Liquidity II Account                                                                                   | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account Valuation                                  | BLX Group LLC                                                                                          | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| LOC Issuance 5094714                                            | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Issuance 5094714                                            | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Issuance 5094714                                            | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Issuance 5094714                                            | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 001 (1994)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 001 (1994)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 001 (1994)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 001 (1994)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002 (1995)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002 (1995)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002 (1995)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002 (1995)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003 (1996)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003 (1996)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003 (1996)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003 (1996)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 004 (1997)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 004 (1997)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 004 (1997)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 004 (1997)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005 (1998)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005 (1998)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005 (1998)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005 (1998)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 006 (1999)                                        | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 006 (1999)                                        | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 006 (1999)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 006 (1999)                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2000) and Bank Succession                    | REPUBLIC NATIONAL BANK OF NEW YORK                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2000) and Bank Succession                    | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2000) and Bank Succession                    | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2000) and Bank Succession                    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2000) and Bank Succession                    | HSBC BANK USA                                                                                          | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002.00 (2001)                                     | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002.00 (2001)                                     | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002.00 (2001)                                     | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 002.00 (2001)                                     | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003.02 (2002)                                     | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003.02 (2002)                                     | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003.02 (2002)                                     | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 003.02 (2002)                                     | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005.00 (2003)                                     | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005.00 (2003)                                     | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005.00 (2003)                                     | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 005.00 (2003)                                     | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2003) and Beneficiary Change                 | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2003) and Beneficiary Change                 | UNITED JERSEY BANK                                                                                     | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2003) and Beneficiary Change                 | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2003) and Beneficiary Change                 | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 007 (2003) and Beneficiary Change                 | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 008 (2004)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 008 (2004)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 008 (2004)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 008 (2004)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 009 (2005)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 009 (2005)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 009 (2005)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 009 (2005)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 010 (2006)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 010 (2006)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 010 (2006)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 010 (2006)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 011 (2007)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 011 (2007)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 011 (2007)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 011 (2007)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 013 (2008)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 013 (2008)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 013 (2008)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 013 (2008)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 014 (2008)                                        | HSBC                                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 014 (2008)                                        | THE BANK OF NEW YORK                                                                                   | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 014 (2008)                                        | NC HOUSING ASSOCIATES #200 CO.                                                                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LOC Amendment 014 (2008)                                        | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| Bonds Dated Date                                                | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Bonds Dated Date                                                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Bonds Issue Date                                                | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Bonds Issue Date                                                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Arbitrage Rebate Report Issuance                          | Willdan Financial Services                                                                             | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Arbitrage Rebate Report Issuance                          | Prior Report                                                                                           | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Arbitrage Rebate Report Issuance                          | BLX Group LLC                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation                   | BLX Group LLC                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation                   | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation                   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation                   | United States                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Interim Arbitrage Rebate Analysis Computation                   | Prior Rebate Liability                                                                                 | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC Interim Arbitrage Rebate Analysis Report Issuance | BLX Group LLC                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC Interim Arbitrage Rebate Analysis Report Issuance | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC Interim Arbitrage Rebate Analysis Report Issuance | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP Opinion Issuance             | Orrick, Herrington & Sutcliffe LLP                                                                     | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP Opinion Issuance             | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP Opinion Issuance             | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Rebate Payment Due Date Determination                           | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Rebate Payment Due Date Determination                           | United States                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Rebate Payment Due Date Determination                           | Prior Rebate Liability                                                                                 | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I Account Valuation                                     | Reserve I Account                                                                                      | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I Account Valuation                                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II Account Valuation                                    | Reserve II Account                                                                                     | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II Account Valuation                                    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I Account Valuation                                   | Liquidity I Account                                                                                    | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I Account Valuation                                   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Account Valuation                                  | Liquidity II Account                                                                                   | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Account Valuation                                  | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Issuance of 1991 Series 1 Bonds                                 | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of 1991 Series 1 Bonds                                 | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Refunding of 1985 Series F and G Bonds                          | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Refunding of 1985 Series F and G Bonds                          | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Refunding of 1985 Series F and G Bonds                          | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Refunding of 1985 Series F and G Bonds                          | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation (2015)                     | BLX Group LLC                                                                                          | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation (2015)                     | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation (2015)                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Fund Valuation (2015)                                           | Reserve I Account                                                                                      | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Fund Valuation (2015)                                           | Reserve II Account                                                                                     | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Fund Valuation (2015)                                           | Liquidity I Account                                                                                    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Fund Valuation (2015)                                           | Liquidity II Account                                                                                   | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Fund Valuation (2015)                                           | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report (2015)     | BLX Group LLC                                                                                          | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report (2015)     | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report (2015)     | INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Rebate Payment Determination (2016)                             | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Rebate Payment Determination (2016)                             | Department of the Treasury                                                                             | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Rebate Payment Determination (2016)                             | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation (2008)                       | Willdan Financial Services                                                                             | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation (2008)                       | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation (2008)                       | Prior Report                                                                                           | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Prior Arbitrage Rebate Report (2008)                | Willdan Financial Services                                                                             | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Prior Arbitrage Rebate Report (2008)                | Prior Report                                                                                           | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of Prior Arbitrage Rebate Report (2008)                | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Issuance of 1991 Series 1 Bonds                                 | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of 1991 Series 1 Bonds                                 | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Refunding of Prior Bonds                                        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation                              | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation                              | Willdan Financial Services                                                                             | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Prior Arbitrage Rebate Computation                              | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Prior Arbitrage Rebate Report                       | Willdan Financial Services                                                                             | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Prior Arbitrage Rebate Report                       | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation                            | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation                            | BLX Group LLC                                                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Interim Arbitrage Rebate Computation                            | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve I Account Valuation (2008)                              | Reserve I Account                                                                                      | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve I Account Valuation (2021)                              | Reserve I Account                                                                                      | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve II Account Valuation (2008)                             | Reserve II Account                                                                                     | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve II Account Valuation (2021)                             | Reserve II Account                                                                                     | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity I Account Valuation (2008)                            | Liquidity I Account                                                                                    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity I Account Valuation (2021)                            | Liquidity I Account                                                                                    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity II Account Valuation (2008)                           | Liquidity II Account                                                                                   | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity II Account Valuation (2021)                           | Liquidity II Account                                                                                   | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Rebate Payment Due Determination (2021)                         | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Rebate Payment Due Determination (2021)                         | United States                                                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Rebate Payment Due Determination (2021)                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report            | BLX Group LLC                                                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report            | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report            | INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Issuance of Interim Arbitrage Rebate Analysis Report            | Orrick, Herrington & Sutcliffe LLP                                                                     | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Next Rebate Installment Payment Due                             | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Next Rebate Installment Payment Due                             | United States                                                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Next Rebate Installment Payment Due                             | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### fund_of

| Source                              | Target                                                                                                 | Citations                         | Timestamp            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| Reserve I Account                   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account                  | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account                 | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Revenue Account                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Escrow Fund                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Debt Service Reserve Account        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Construction Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Revenue Account                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Escrow Fund                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Debt Service Reserve Account        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Construction Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I                           | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II                          | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Accounts               | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Revenue Account                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Escrow Fund                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Debt Service Reserve Account        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Construction Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve I Account                   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve II Account                  | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity I Account                 | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity II Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Schedule C - Reserve I Account      | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule D - Reserve II Account     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule E - Prior Rebate Liability | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule F - Liquidity I Account    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Schedule G - Liquidity II Account   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Revenue Account                     | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Escrow Fund                         | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Debt Service Reserve Account        | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Construction Account                | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### holds_investment

| Source               | Target       | Citations                         | Timestamp            |
| -------------------- | ------------ | --------------------------------- | -------------------- |
| Reserve I Account    | Morgan IA    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve I Account    | Federated MM | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account   | Morgan IA    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve II Account   | Federated MM | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account  | Morgan IA    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity I Account  | Federated MM | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account | Morgan IA    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Liquidity II Account | Federated MM | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Reserve I Account    | Morgan IA    | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I Account    | Federated MM | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve II Account   | Morgan IA    | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity I Account  | Morgan IA    | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Account | Morgan IA    | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Liquidity II Account | Federated MM | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Reserve I Account    | Morgan IA    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve I Account    | Federated MM | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve II Account   | Morgan IA    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity I Account  | Morgan IA    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity II Account | Morgan IA    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Liquidity II Account | Federated MM | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Reserve I Account    | Morgan IA    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve I Account    | Federated MM | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Reserve II Account   | Morgan IA    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity I Account  | Morgan IA    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity II Account | Morgan IA    | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Liquidity II Account | Federated MM | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### located_at

| Source                                         | Target                                                              | Citations                         | Timestamp            |
| ---------------------------------------------- | ------------------------------------------------------------------- | --------------------------------- | -------------------- |
| BLX Group LLC                                  | Dallas, TX 75206                                                    | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | Trenton, NJ 08650-2085                                              | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP             | New York, NY 10019-6142                                             | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| REPUBLIC NATIONAL BANK OF NEW YORK             | 452 Fifth Avenue, New York, N.Y. 10018                              | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| LEFRAK ORGANIZATION INC.                       | 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374                            | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| THE BANK OF NEW YORK                           | 385 RIFLE CAMP ROAD WEST PATERSON, NJ 07424                         | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| BLX Group LLC                                  | 2711 N. Haskell Avenue                                              | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC                                  | Dallas, TX                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | 637 South Clinton Avenue                                            | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | Trenton, NJ                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP             | 2711 NORTH HASKELL AVENUE                                           | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP             | Dallas, TX                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC                                  | 2711 N. Haskell Avenue, Lockbox 35, Suite 2600 SW, Dallas, TX 75204 | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | 637 South Clinton Avenue, P.O. Box 18550, Trenton, NJ 08650-2085    | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP             | 51 WEST 52ND STREET, NEW YORK, NY 10019                             | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| BLX Group LLC                                  | Dallas, TX                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | Trenton, NJ                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP             | New York, NY                                                        | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### advisor_to

| Source                             | Target                                                                                                 | Citations                         | Timestamp            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| BLX Group LLC                      | INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BLX Group LLC                      | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BLX Group LLC                      | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Willdan Financial Services         | Prior Report                                                                                           | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BLX Group LLC                      | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC                      | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Willdan Financial Services         | Prior Report                                                                                           | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BLX Group LLC                      | INTERIM ARBITRAGE REBATE ANALYSIS                                                                      | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Willdan Financial Services         | Prior Report                                                                                           | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| BLX Group LLC                      | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| Orrick, Herrington & Sutcliffe LLP | New Jersey Housing and Mortgage Finance Agency                                                         | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### predecessor_of

| Source                                                                                                 | Target                                                                                                 | Citations                         | Timestamp            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| Prior Report                                                                                           | Report                                                                                                 | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| Prior Report                                                                                           | BLX Group LLC                                                                                          | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| Prior Report                                                                                           | Report                                                                                                 | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| Willdan Financial Services                                                                             | BLX Group LLC                                                                                          | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |
| $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### issuer_of

| Source                                         | Target                                                                                                 | Citations                         | Timestamp            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| New Jersey Housing and Mortgage Finance Agency | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| REPUBLIC NATIONAL BANK OF NEW YORK             | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| HSBC                                           | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf  | 2026-03-25T19:52:01Z |
| New Jersey Housing and Mortgage Finance Agency | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| New Jersey Housing and Mortgage Finance Agency | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### trustee_of

| Source | Target                                                                                                 | Citations                         | Timestamp            |
| ------ | ------------------------------------------------------------------------------------------------------ | --------------------------------- | -------------------- |
| BNY    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 26889358.pdf | 2024-10-16T00:00:00Z |
| BNY    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 5816087.pdf  | 2012-10-16T00:00:00Z |
| BNY    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 7438596.pdf  | 2015-10-16T00:00:00Z |
| BNY    | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 9587055.pdf  | 2021-10-16T00:00:00Z |

### beneficiary_of

| Source               | Target                                                                                                 | Citations                        | Timestamp            |
| -------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------- |
| UNITED JERSEY BANK   | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| UNITED JERSEY BANK   | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| THE BANK OF NEW YORK | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

### works_at

| Source          | Target                   | Citations                        | Timestamp            |
| --------------- | ------------------------ | -------------------------------- | -------------------- |
| JOSEPH E. LUDES | UNITED JERSEY BANK       | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| ARTHUR KLEIN    | LEFRAK ORGANIZATION INC. | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| JULIANNE MEDICI | THE BANK OF NEW YORK     | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

### borrower_of

| Source                         | Target                                                                                                 | Citations                        | Timestamp            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------- |
| NC HOUSING ASSOCIATES #200 CO. | $142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| NC HOUSING ASSOCIATES #200 CO. | SDCMTN094714                                                                                           | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

### party_to

| Source                                         | Target                                                       | Citations                        | Timestamp            |
| ---------------------------------------------- | ------------------------------------------------------------ | -------------------------------- | -------------------- |
| NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY | TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991 | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |
| UNITED JERSEY BANK                             | TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991 | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

### sponsor_of

| Source                         | Target                   | Citations                        | Timestamp            |
| ------------------------------ | ------------------------ | -------------------------------- | -------------------- |
| NC HOUSING ASSOCIATES #200 CO. | LEFRAK ORGANIZATION INC. | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

### successor_to

| Source        | Target                             | Citations                        | Timestamp            |
| ------------- | ---------------------------------- | -------------------------------- | -------------------- |
| HSBC BANK USA | REPUBLIC NATIONAL BANK OF NEW YORK | BNY Rebate Analysis: 4124255.pdf | 2026-03-25T19:52:01Z |

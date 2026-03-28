# Document Entity Returns Audit (2026-03-27)

This is a live snapshot from `http://localhost:3000/api/collection/bootstrap` used to answer:

1. What entities are returned for each source document?
2. Does anything look like it resolved/merged/split into something else?

## Snapshot meta

- Entities: `127`
- Events: `50`
- Relationships: `459`
- `lastRebuilt`: `2026-03-27T22:17:27.246Z`

## Raw per-document entity returns

```text
## DOC 7438596 - Interim Rebate Analysis (2015) (44)
- 2711 N. Haskell Avenue, Lockbox 35, Suite 2600 SW, Dallas, TX 75204 | location | 2947201247694098125 | srcDocs=1
- 51 WEST 52ND STREET, NEW YORK, NY 10019 | location | 8961398183215909633 | srcDocs=1
- 637 South Clinton Avenue, P.O. Box 18550, Trenton, NJ 08650-2085 | location | 1490141290870989388 | srcDocs=1
- Bank of New York Mellon Corporation (BNY Mellon) | organization | 5384086983174826493 | srcDocs=4
- BLX Group LLC | organization | 1470965072054453101 | srcDocs=3
- Certificate as to Arbitrage | legal_agreement | 9073217463430168172 | srcDocs=2
- Construction Account | fund_account | 226686358700946423 | srcDocs=4
- Debt Service Reserve Account | fund_account | 374030580716664244 | srcDocs=4
- Escrow Fund | fund_account | 3499104088028066083 | srcDocs=4
- INTERIM ARBITRAGE REBATE ANALYSIS | legal_agreement | 5651499468729638165 | srcDocs=3
- Liquidity I Account | fund_account | 7476737946181823597 | srcDocs=4
- Liquidity II Account | fund_account | 6638852300639391265 | srcDocs=4
- New Jersey Housing and Mortgage Finance Agency | organization | 6471256961308361850 | srcDocs=3
- Newport Project | location | 5244065165148542602 | srcDocs=1
- Notes and Assumptions | legal_agreement | 9013206385896288509 | srcDocs=2
- Orrick, Herrington & Sutcliffe, LLP | organization | 5477621199116204617 | srcDocs=3
- Presidential Plaza | location | 3029826579187567535 | srcDocs=1
- Prior Rebate Liability | fund_account | 2277784462984661168 | srcDocs=4
- Prior Report | legal_agreement | 3844814106996110754 | srcDocs=2
- Report | legal_agreement | 8879090567778783678 | srcDocs=2
- Reserve I Account | fund_account | 9112734796193071548 | srcDocs=4
- Reserve II Account | fund_account | 2877916378535664072 | srcDocs=4
- Revenue Account | fund_account | 1477039329975055923 | srcDocs=4
- Schedule A - Summary of Rebate Analysis | legal_agreement | 3190929743969324823 | srcDocs=2
- Schedule B - Sources & Uses of Funds | legal_agreement | 4662206365284782208 | srcDocs=2
- Schedule C - Reserve I Account | legal_agreement | 7565798991068528206 | srcDocs=1
- Schedule C1 - Reserve I Account Remaining Balance Analyses | legal_agreement | 206579677833234805 | srcDocs=1
- Schedule C2 - Reserve I Account Net Nonpurpose Investments Cash Flow | legal_agreement | 8917349301390975997 | srcDocs=1
- Schedule D - Reserve II Account | legal_agreement | 8647261206502899303 | srcDocs=1
- Schedule D1 - Reserve II Account Remaining Balance Analyses | legal_agreement | 2990484481727744339 | srcDocs=1
- Schedule D2 - Reserve II Account Net Nonpurpose Investments Cash Flow | legal_agreement | 2576017519828814741 | srcDocs=1
- Schedule E - Prior Rebate Liability | legal_agreement | 3896407521264998095 | srcDocs=1
- Schedule E1 - Prior Rebate Liability Future Value Calculation | legal_agreement | 7716519703989279091 | srcDocs=1
- Schedule F - Liquidity I Account | legal_agreement | 6422763341505446459 | srcDocs=1
- Schedule F1 - Liquidity I Account Remaining Balance Analyses | legal_agreement | 6635759182396356344 | srcDocs=1
- Schedule F2 - Liquidity I Account Net Nonpurpose Investments Cash Flow | legal_agreement | 42598379929581788 | srcDocs=1
- Schedule G - Liquidity II Account | legal_agreement | 4194651737123043185 | srcDocs=1
- Schedule G1 - Liquidity II Account Remaining Balance Analyses | legal_agreement | 2562486007957623103 | srcDocs=1
- Schedule G2 - Liquidity II Account Net Nonpurpose Investments Cash Flow | legal_agreement | 6533606881395055487 | srcDocs=1
- Temporary Treasury Regulations Section 1.148-4T(e)(2) | legal_agreement | 996175972460951893 | srcDocs=2
- Totals: | fund_account | 8623770550156948762 | srcDocs=1
- Transmittal Letter | legal_agreement | 5121003150070824032 | srcDocs=2
- United States Department of the Treasury | organization | 8883522583676895375 | srcDocs=2
- Willdan Financial Services | organization | 7683517764755523583 | srcDocs=3

## DOC 26889358 - Interim Rebate Analysis (2024) (23)
- Certificate as to Arbitrage | legal_agreement | 9073217463430168172 | srcDocs=2
- Construction Account | fund_account | 226686358700946423 | srcDocs=4
- Dallas, TX 75206 | location | 5885379055126329646 | srcDocs=1
- Debt Service Reserve Account | fund_account | 374030580716664244 | srcDocs=4
- engagement letter | legal_agreement | 8129196958194220174 | srcDocs=1
- Escrow Fund | fund_account | 3499104088028066083 | srcDocs=4
- Federated MM | financial_instrument | 7669844269534725615 | srcDocs=3
- INTERIM ARBITRAGE REBATE ANALYSIS | legal_agreement | 5651499468729638165 | srcDocs=3
- IRREVOCABLE LETTER OF CREDIT NO. 5094714 | financial_instrument | 8242646876499346416 | srcDocs=4
- Liquidity I Account | fund_account | 7476737946181823597 | srcDocs=4
- Liquidity II Account | fund_account | 6638852300639391265 | srcDocs=4
- Morgan IA | financial_instrument | 7160664882440639509 | srcDocs=3
- New York, NY 10019-6142 | location | 6662360422077407907 | srcDocs=1
- Notes and Assumptions | legal_agreement | 9013206385896288509 | srcDocs=2
- Presidential Plaza at Newport Project | location | 7995807768282066926 | srcDocs=2
- Prior Rebate Liability | fund_account | 2277784462984661168 | srcDocs=4
- Prior Rebate Liability | legal_agreement | 2258511055208974139 | srcDocs=1
- Report | legal_agreement | 8879090567778783678 | srcDocs=2
- Reserve I Account | fund_account | 9112734796193071548 | srcDocs=4
- Reserve II Account | fund_account | 2877916378535664072 | srcDocs=4
- Revenue Account | fund_account | 1477039329975055923 | srcDocs=4
- Transmittal Letter | legal_agreement | 5121003150070824032 | srcDocs=2
- Trenton, NJ 08650-2085 | location | 7706441574885243436 | srcDocs=1

## DOC 4124255 - Irrevocable Letter of Credit (55)
- 1851170072 | fund_account | 8665168153677074200 | srcDocs=1
- 210 MAIN STREET HACKENSACK, NEW JERSEY 07602 | location | 9028891369789562917 | srcDocs=1
- 385 RIFLE CAMP ROAD WEST PATERSON, NJ 07424 | location | 451436081482840009 | srcDocs=1
- 452 Fifth Avenue, New York, N.Y. 10018 | location | 1788201509360398999 | srcDocs=1
- 7699940 | fund_account | 1896489344536128430 | srcDocs=1
- 931806 | fund_account | 2504986505545931558 | srcDocs=1
- 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374 | location | 7942829951042429385 | srcDocs=1
- A NEW JERSEY GENERAL PARTNERSHIP | organization | 324145471253932450 | srcDocs=1
- ACS D52671BNY | fund_account | 4520257385239843487 | srcDocs=1
- AMENDMENT (NO. 002.00 ) | financial_instrument | 2381187644982522013 | srcDocs=1
- AMENDMENT (NO. 003.02) | financial_instrument | 2513431628796693811 | srcDocs=1
- AMENDMENT (NO. 005.00 ) | financial_instrument | 1154936381389658373 | srcDocs=1
- AMENDMENT (NO. 007 ) | financial_instrument | 3918206870515019731 | srcDocs=1
- AMENDMENT (NO. 008 ) | financial_instrument | 8819374516737857756 | srcDocs=1
- AMENDMENT (NO. 009 ) | financial_instrument | 3204175304077932961 | srcDocs=1
- AMENDMENT (NO. 010 ) | financial_instrument | 5823406524061590731 | srcDocs=1
- AMENDMENT (NO. 011 ) | financial_instrument | 8674044714312252700 | srcDocs=1
- AMENDMENT (NO. 013 ) | financial_instrument | 2068854522204650134 | srcDocs=1
- AMENDMENT (NO. 014 ) | financial_instrument | 6353477035103929731 | srcDocs=1
- ARTHUR KLEIN | person | 4008955034518895738 | srcDocs=1
- Bank of New York Mellon Corporation (BNY Mellon) | organization | 5384086983174826493 | srcDocs=4
- BLICBANK NEW YORK | organization | 3220685979272488431 | srcDocs=1
- BLICUS 33 | financial_instrument | 3382116686024656995 | srcDocs=1
- BNY Rebate Analysis: 4124255.pdf | financial_instrument | 4899275328142043346 | srcDocs=1
- COLLATERAL SUBACCOUNT | fund_account | 2352505202908928335 | srcDocs=1
- CORPORATE TRUST DIVISION | organization | 541401425133389525 | srcDocs=1
- DEBT SERVICE RESERVE ACCOUNT | fund_account | 6483867964489030036 | srcDocs=1
- EXHIBIT A | legal_agreement | 1428311937107269689 | srcDocs=1
- EXHIBIT B | legal_agreement | 4378959058990797753 | srcDocs=1
- EXHIBIT C | legal_agreement | 32845926869761085 | srcDocs=1
- EXHIBIT D | legal_agreement | 7010305909201796213 | srcDocs=1
- HSBC Bank USA Trade Services | organization | 2625373596646965640 | srcDocs=1
- HSBC Bank USA, National Association | organization | 6157989400122873900 | srcDocs=1
- INTERNATIONAL CHAMBER OF COMMERCE PUBLICATION NO. 400 | legal_agreement | 7134683315725495957 | srcDocs=1
- IRREVOCABLE LETTER OF CREDIT | legal_agreement | 9170860967536978667 | srcDocs=1
- IRREVOCABLE LETTER OF CREDIT NO. 5094714 | financial_instrument | 8242646876499346416 | srcDocs=4
- JOSEPH E. LUDES | person | 8382407775580926155 | srcDocs=1
- JULIANNE MEDICI | person | 8227710946729421751 | srcDocs=1
- LEFRAK ORGANIZATION INC. | organization | 7059425056973183461 | srcDocs=1
- NC HOUSING ASSOCIATES #200 CO. | organization | 4104505588419472813 | srcDocs=1
- NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY | organization | 5109415780850342446 | srcDocs=1
- New York | location | 4648605347073135218 | srcDocs=2
- Newport 91 Col 11 | fund_account | 1066437395655026795 | srcDocs=1
- REPUBLIC NATIONAL BANK OF NEW YORK | organization | 4824620677155774613 | srcDocs=1
- SDCMTN094714 | financial_instrument | 7005109958829846067 | srcDocs=1
- SECTION 10.3 | legal_agreement | 8149435077860669278 | srcDocs=1
- SECTION 5.6 | legal_agreement | 8753339908811957357 | srcDocs=1
- Telex: 234967 (RCA) | financial_instrument | 2006969212955648599 | srcDocs=1
- Telex: 620274 (MCI), 7607367 (CCI) | financial_instrument | 5895679362876652650 | srcDocs=1
- The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch | organization | 8749664511655725314 | srcDocs=1
- TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991 | legal_agreement | 2374661523630693574 | srcDocs=1
- U.S. $1,307,116.07 | financial_instrument | 5989291099094186035 | srcDocs=1
- UNIFORM CUSTOMS | legal_agreement | 6208785035719167709 | srcDocs=1
- UNIFORM CUSTOMS AND PRACTICE FOR DOCUMENTARY CREDITS (1983 REVISION) | legal_agreement | 3127771656435772906 | srcDocs=1
- UNITED JERSEY BANK/CENTRAL, | organization | 6967031221082229818 | srcDocs=1

## DOC 5816087 - Interim Rebate Analysis (2012) (37)
- 2711 N. Haskell Avenue | location | 4541494875554604248 | srcDocs=1
- 637 South Clinton Avenue | location | 4798439779264810981 | srcDocs=1
- Bank of New York Mellon Corporation (BNY Mellon) | organization | 5384086983174826493 | srcDocs=4
- BLX Group LLC | organization | 1470965072054453101 | srcDocs=3
- Construction Account | fund_account | 226686358700946423 | srcDocs=4
- Dallas | location | 5716789654794197421 | srcDocs=2
- Debt Service Reserve Account | fund_account | 374030580716664244 | srcDocs=4
- Escrow Fund | fund_account | 3499104088028066083 | srcDocs=4
- Federated MM | financial_instrument | 7669844269534725615 | srcDocs=3
- IRREVOCABLE LETTER OF CREDIT NO. 5094714 | financial_instrument | 8242646876499346416 | srcDocs=4
- Liquidity I | fund_account | 212533258381375355 | srcDocs=1
- Liquidity I Account | fund_account | 7476737946181823597 | srcDocs=4
- Liquidity II Account | fund_account | 6638852300639391265 | srcDocs=4
- Lockbox 35, Suite 2600 SW | location | 2310895720670755529 | srcDocs=1
- Morgan IA | financial_instrument | 7160664882440639509 | srcDocs=3
- New Jersey Housing and Mortgage Finance Agency | organization | 6471256961308361850 | srcDocs=3
- Orrick, Herrington & Sutcliffe, LLP | organization | 5477621199116204617 | srcDocs=3
- P.O. Box 18550 | location | 1867702731957289564 | srcDocs=1
- Presidential Plaza at Newport Project | location | 7995807768282066926 | srcDocs=2
- Prior Rebate Liability | fund_account | 2277784462984661168 | srcDocs=4
- Prior Report | legal_agreement | 3844814106996110754 | srcDocs=2
- Reserve I | fund_account | 5312626425379185141 | srcDocs=1
- Reserve I Account | fund_account | 9112734796193071548 | srcDocs=4
- Reserve II | fund_account | 5766542102150149251 | srcDocs=1
- Reserve II Account | fund_account | 2877916378535664072 | srcDocs=4
- Revenue Account | fund_account | 1477039329975055923 | srcDocs=4
- Schedule A - Summary of Rebate Analysis | fund_account | 8523712635205527373 | srcDocs=1
- Schedule B - Sources & Uses of Funds | fund_account | 4190633011426224500 | srcDocs=1
- Schedule C - Reserve I Account | fund_account | 7684968567575696080 | srcDocs=2
- Schedule D - Reserve II Account | fund_account | 4931428261163025225 | srcDocs=2
- Schedule E - Prior Rebate Liability | fund_account | 7699163145713422733 | srcDocs=2
- Schedule F - Liquidity I Account | fund_account | 1667998524201661399 | srcDocs=2
- Schedule G - Liquidity II Account | fund_account | 6887584236230756927 | srcDocs=2
- Trenton, New Jersey | location | 1054548445358605934 | srcDocs=2
- United States | organization | 8378183269956851171 | srcDocs=2
- United States Department of the Treasury | organization | 8883522583676895375 | srcDocs=2
- Willdan Financial Services | organization | 7683517764755523583 | srcDocs=3

## DOC 9587055 - Interim Rebate Analysis (2021) (34)
- Bank of New York Mellon Corporation (BNY Mellon) | organization | 5384086983174826493 | srcDocs=4
- BLX Group LLC | organization | 1470965072054453101 | srcDocs=3
- Construction Account | fund_account | 226686358700946423 | srcDocs=4
- Dallas | location | 5716789654794197421 | srcDocs=2
- Debt Service Reserve Account | fund_account | 374030580716664244 | srcDocs=4
- Escrow Fund | fund_account | 3499104088028066083 | srcDocs=4
- Federated MM | financial_instrument | 7669844269534725615 | srcDocs=3
- FOREIGN TRADE BANK OF LATIN AMERICA INC | organization | 6441935222764684550 | srcDocs=1
- INTERIM ARBITRAGE REBATE ANALYSIS | legal_agreement | 5651499468729638165 | srcDocs=3
- Internal Revenue Service Form 8038-T | legal_agreement | 3439765214018713853 | srcDocs=1
- IRREVOCABLE LETTER OF CREDIT NO. 5094714 | financial_instrument | 8242646876499346416 | srcDocs=4
- Liquidity I Account | fund_account | 7476737946181823597 | srcDocs=4
- Liquidity II Account | fund_account | 6638852300639391265 | srcDocs=4
- Morgan IA | financial_instrument | 7160664882440639509 | srcDocs=3
- New Jersey Housing and Mortgage Finance Agency | organization | 6471256961308361850 | srcDocs=3
- New York | location | 4648605347073135218 | srcDocs=2
- Orrick | organization | 2080889041561724035 | srcDocs=1
- Orrick, Herrington & Sutcliffe, LLP | organization | 5477621199116204617 | srcDocs=3
- Prior Rebate Liability | fund_account | 2277784462984661168 | srcDocs=4
- Reserve I Account | fund_account | 9112734796193071548 | srcDocs=4
- Reserve II Account | fund_account | 2877916378535664072 | srcDocs=4
- Revenue Account | fund_account | 1477039329975055923 | srcDocs=4
- Schedule A - Summary of Rebate Analysis | legal_agreement | 3190929743969324823 | srcDocs=2
- Schedule B - Sources & Uses of Funds | legal_agreement | 4662206365284782208 | srcDocs=2
- Schedule C - Reserve I Account | fund_account | 7684968567575696080 | srcDocs=2
- Schedule D - Reserve II Account | fund_account | 4931428261163025225 | srcDocs=2
- Schedule E - Prior Rebate Liability | fund_account | 7699163145713422733 | srcDocs=2
- Schedule F - Liquidity I Account | fund_account | 1667998524201661399 | srcDocs=2
- Schedule G - Liquidity II Account | fund_account | 6887584236230756927 | srcDocs=2
- Temporary Treasury Regulations Section 1.148-4T(e)(2) | legal_agreement | 996175972460951893 | srcDocs=2
- The Treasury | organization | 7404718453994080710 | srcDocs=1
- Trenton, New Jersey | location | 1054548445358605934 | srcDocs=2
- United States | organization | 8378183269956851171 | srcDocs=2
- Willdan Financial Services | organization | 7683517764755523583 | srcDocs=3
```

## Potential resolution / merge-split signals

These are normalized-name collisions that suggest potential canonicalization gaps
or flavor splits (same surface name appearing as different nodes).

```text
- prior rebate liability
  - Prior Rebate Liability | fund_account | 2277784462984661168 | srcDocs=2051052947608524725,7447437794117404020,7780293260382878366,8759058315171884540
  - Prior Rebate Liability | legal_agreement | 2258511055208974139 | srcDocs=7447437794117404020

- debt service reserve account
  - Debt Service Reserve Account | fund_account | 374030580716664244 | srcDocs=2051052947608524725,7447437794117404020,7780293260382878366,8759058315171884540
  - DEBT SERVICE RESERVE ACCOUNT | fund_account | 6483867964489030036 | srcDocs=7526709763959495568

- new jersey housing and mortgage finance agency
  - New Jersey Housing and Mortgage Finance Agency | organization | 6471256961308361850 | srcDocs=2051052947608524725,7780293260382878366,8759058315171884540
  - NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY | organization | 5109415780850342446 | srcDocs=7526709763959495568

- schedule f liquidity i account
  - Schedule F - Liquidity I Account | fund_account | 1667998524201661399 | srcDocs=7780293260382878366,8759058315171884540
  - Schedule F - Liquidity I Account | legal_agreement | 6422763341505446459 | srcDocs=2051052947608524725

- schedule g liquidity ii account
  - Schedule G - Liquidity II Account | fund_account | 6887584236230756927 | srcDocs=7780293260382878366,8759058315171884540
  - Schedule G - Liquidity II Account | legal_agreement | 4194651737123043185 | srcDocs=2051052947608524725

- schedule e prior rebate liability
  - Schedule E - Prior Rebate Liability | fund_account | 7699163145713422733 | srcDocs=7780293260382878366,8759058315171884540
  - Schedule E - Prior Rebate Liability | legal_agreement | 3896407521264998095 | srcDocs=2051052947608524725

- schedule d reserve ii account
  - Schedule D - Reserve II Account | fund_account | 4931428261163025225 | srcDocs=7780293260382878366,8759058315171884540
  - Schedule D - Reserve II Account | legal_agreement | 8647261206502899303 | srcDocs=2051052947608524725

- schedule a summary of rebate analysis
  - Schedule A - Summary of Rebate Analysis | fund_account | 8523712635205527373 | srcDocs=7780293260382878366
  - Schedule A - Summary of Rebate Analysis | legal_agreement | 3190929743969324823 | srcDocs=8759058315171884540,2051052947608524725

- schedule b sources and uses of funds
  - Schedule B - Sources & Uses of Funds | fund_account | 4190633011426224500 | srcDocs=7780293260382878366
  - Schedule B - Sources & Uses of Funds | legal_agreement | 4662206365284782208 | srcDocs=8759058315171884540,2051052947608524725

- schedule c reserve i account
  - Schedule C - Reserve I Account | fund_account | 7684968567575696080 | srcDocs=7780293260382878366,8759058315171884540
  - Schedule C - Reserve I Account | legal_agreement | 7565798991068528206 | srcDocs=2051052947608524725
```

## Quick read

- We do have clear **multi-doc canonical nodes** (e.g., `Bank of New York Mellon Corporation (BNY Mellon)` and core fund accounts).
- We also still have **same-name split nodes** (case/format differences and flavor splits), which likely explains part of parity drift vs extracted JSON.
- The location where this is most visible is `Irrevocable Letter of Credit`, where uppercase variants appear as distinct nodes.

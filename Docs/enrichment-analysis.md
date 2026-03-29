# Enrichment Analysis

This document lists every extracted entity and event in the current collection state, including:

- `neid`
- whether it has at least one connection outside the current document-extracted collection (`outside_connected`)
- the number of outside connections found in a 1-hop probe (`outside_count`)

## Executive Summary

The current document collection contains a small set of extracted entities that appear to enrich successfully into the broader graph, plus a smaller set of entities that look like they should resolve through strong external identifiers but do not currently do so cleanly in this tenant context.

### Enrichable Extracted Entities

These extracted entities currently show at least one connection outside the document extraction graph.

Quick aggregate counts (using the current `/api/collection/enrich` behavior with all enrichable extracted entities as anchors):

- 1-hop outside nodes: `692`
- Additional 2-hop outside nodes (beyond 1-hop): `996`
- Total outside nodes reachable within 2 hops: `1226`

`name|flavor|neid|outside_count`

```text
The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch|organization|08749664511655725314|300
Bank of New York Mellon Corporation (BNY Mellon)|organization|05384086983174826493|248
HSBC Bank USA, National Association|organization|06157989400122873900|111
Orrick, Herrington & Sutcliffe, LLP|organization|05477621199116204617|14
Orrick|organization|02080889041561724035|11
Willdan Financial Services|organization|07683517764755523583|2
UNITED JERSEY BANK/CENTRAL,|organization|06967031221082229818|2
New Jersey Housing and Mortgage Finance Agency|organization|06471256961308361850|1
NC HOUSING ASSOCIATES #200 CO.|organization|04104505588419472813|1
ARTHUR KLEIN|person|04008955034518895738|1
97-77 QUEENS BLVD. REGO PARK, N.Y. 11374|location|07942829951042429385|1
```

### Extracted Entities Expected But Unresolved

These extracted entities exist in the collection, but their expected identifier-based resolution paths do not currently resolve cleanly.

`name|flavor|neid|expected_identifier`

```text
REPUBLIC NATIONAL BANK OF NEW YORK|organization|04824620677155774613|fdic_certificate_number=19545
BLX Group LLC|organization|01470965072054453101|company_cik=0001610628
Willdan Financial Services|organization|07683517764755523583|company_cik=0001782739
```

## Grouped Recommendations

These groups are derived from the same 1-hop probe results used in the full table below.

- `likely noisy/global`: very high fan-out anchors and broad/global labels likely to flood context
- `high-signal enrichable`: anchors with outside connectivity that are more likely to add focused context
- `document-local only`: anchors with no outside connectivity found in this probe

### Likely Noisy / Global Anchors (6)

`type|name|neid|outside_count`

```text
entity|United States Department of the Treasury|08883522583676895375|294
entity|The Treasury|07404718453994080710|286
entity|United States|08378183269956851171|257
entity|New York|04648605347073135218|225
entity|Dallas|05716789654794197421|225
entity|Trenton, New Jersey|01054548445358605934|120
```

### High-Signal Enrichable Anchors (17)

`type|name|neid|outside_count`

```text
entity|The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch|08749664511655725314|300
entity|Bank of New York Mellon Corporation (BNY Mellon)|05384086983174826493|248
entity|HSBC Bank USA, National Association|06157989400122873900|111
entity|Orrick, Herrington & Sutcliffe, LLP|05477621199116204617|14
entity|Orrick|02080889041561724035|11
event|Linea Energy Closes Project Debt Financing for Watertown Solar|00138228655679371505|6
event|Management Buyout of WTAS Holdings LLC|03051775432317195451|3
event|Legal Advisory for Boxcar Project Financing|04876759988914492560|3
event|Boxcar Project Financing Secured|08090228703605722075|3
entity|Willdan Financial Services|07683517764755523583|2
entity|UNITED JERSEY BANK/CENTRAL,|06967031221082229818|2
entity|FOREIGN TRADE BANK OF LATIN AMERICA INC|06441935222764684550|2
entity|New Jersey Housing and Mortgage Finance Agency|06471256961308361850|1
entity|NC HOUSING ASSOCIATES #200 CO.|04104505588419472813|1
event|Andersen Tax Holdings LLC Management Buyout from HSBC USA Inc.|04258205728901861642|1
entity|ARTHUR KLEIN|04008955034518895738|1
entity|97-77 QUEENS BLVD. REGO PARK, N.Y. 11374|07942829951042429385|1
```

Note: the two added organizations above have very high fan-out, so they should be used with caution, but they are core graph anchors and should remain available.

### Document-Local Only (159)

No outside connections were found for these anchors in a 1-hop probe.

For the complete per-node list, see the full audit table below (`outside_connected = no` rows).

## Expected But Unresolved

These are cases where the collection contains an extracted node and we have a strong external identifier for it, but the expected identifier-based resolution path does not currently resolve cleanly in this tenant context.

This section is separate from the enrichability audit:

- `outside_connected` asks whether a node expands into graph context outside this document collection.
- `expected but unresolved` asks whether a node resolves cleanly through a known strong identifier such as `fdic_certificate_number` or `company_cik`.

A node can therefore be enrichable and still belong in this section, or be non-enrichable and still belong in this section.

### 1. Republic National Bank of New York / HSBC successor chain

- Extracted entity in collection: `REPUBLIC NATIONAL BANK OF NEW YORK`
- Extracted flavor: `organization`
- Current NEID: `04824620677155774613`
- Expected strong identifier: `fdic_certificate_number = 19545`
- External source: [FDIC BankFind Suite](https://banks.data.fdic.gov/bankfind-suite/bankfind/details/19545?bankfindLevelThreeView=History&branchOffices=true&pageNumber=1&resultLimit=25)

What we checked:

- Direct MCP strong-ID lookup with `entity_id: { id_type: "fdic_certificate_number", id: "19545" }` failed to resolve.
- Name lookup for `REPUBLIC NATIONAL BANK OF NEW YORK` resolved successfully to `04824620677155774613`.
- Relationship lookup from that NEID returns `HSBC Bank USA, National Association` (`06157989400122873900`) as a related organization.
- `HSBC Bank USA, National Association` exposes `fdic_certificate_number = 57890`, so FDIC-backed bank identity data is present in the tenant graph.

Current status:

- Treat this as a likely resolution gap or property-surface gap rather than a complete KG miss.
- The merger/successor relationship appears to exist, but the extracted Republic National Bank node is not currently resolving via `fdic_certificate_number = 19545`.

Additional check:

- `The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch` (`08749664511655725314`) is related to `HSBC Bank USA, National Association` (`06157989400122873900`) in both-direction organization relationship probes, so HSBC-family linkage does appear in the graph even though some FDIC/identifier resolution paths remain incomplete.

### 2. BLX Group LLC / SEC CIK linkage

- Extracted entity in collection: `BLX Group LLC`
- Extracted flavor: `organization`
- Current NEID: `01470965072054453101`
- Expected strong identifier: `company_cik = 0001610628`
- External source: [SEC EDGAR Browse: CIK 0001610628](https://www.sec.gov/edgar/browse/?CIK=0001610628)

What we checked:

- Direct MCP strong-ID lookup with `entity_id: { id_type: "company_cik", id: "0001610628" }` failed to resolve.
- Unpadded lookup `company_cik = 1610628` also failed.
- Direct NEID lookup for `01470965072054453101` returns `BLX Group LLC`, but no `company_cik` property is surfaced.
- Name lookup through MCP did not reliably return the same entity; `BLX Group LLC` mis-resolved to `BXGA L.L.C.` (`02994342698381633281`) in one probe.

Current status:

- Treat BLX as unresolved for canonical EDGAR linkage in this tenant context.
- The extracted entity exists, but its CIK-based resolution path is not currently working and fuzzy name resolution can drift to the wrong organization.

### 3. Willdan Financial Services / SEC CIK linkage

- Extracted entity in collection: `Willdan Financial Services`
- Extracted flavor: `organization`
- Current NEID: `07683517764755523583`
- Expected strong identifier: `company_cik = 0001782739`
- External source: [SEC EDGAR Browse: CIK 0001782739](https://www.sec.gov/edgar/browse/?CIK=0001782739)

What we checked:

- Direct MCP strong-ID lookup with `entity_id: { id_type: "company_cik", id: "0001782739" }` failed to resolve.
- Unpadded lookup `company_cik = 1782739` also failed.
- Name lookup through MCP resolved successfully to `Willdan Financial Services` (`07683517764755523583`).

Current status:

- Treat Willdan as present in the KG but unresolved through canonical EDGAR identifier lookup in this tenant context.
- This looks like another identifier-resolution gap rather than a missing entity.

`index|type|name|neid|outside_connected|outside_count`

```text
1|entity|1851170072|08665168153677074200|no|0
2|entity|210 MAIN STREET HACKENSACK, NEW JERSEY 07602|09028891369789562917|no|0
3|entity|2711 N. Haskell Avenue|04541494875554604248|no|0
4|entity|2711 N. Haskell Avenue, Lockbox 35, Suite 2600 SW, Dallas, TX 75204|02947201247694098125|no|0
5|entity|385 RIFLE CAMP ROAD WEST PATERSON, NJ 07424|00451436081482840009|no|0
6|entity|452 Fifth Avenue, New York, N.Y. 10018|01788201509360398999|no|0
7|entity|51 WEST 52ND STREET, NEW YORK, NY 10019|08961398183215909633|no|0
8|entity|637 South Clinton Avenue|04798439779264810981|no|0
9|entity|637 South Clinton Avenue, P.O. Box 18550, Trenton, NJ 08650-2085|01490141290870989388|no|0
10|entity|7699940|01896489344536128430|no|0
11|entity|931806|02504986505545931558|no|0
12|entity|97-77 QUEENS BLVD. REGO PARK, N.Y. 11374|07942829951042429385|yes|1
13|entity|A NEW JERSEY GENERAL PARTNERSHIP|00324145471253932450|no|0
14|entity|ACS D52671BNY|04520257385239843487|no|0
15|entity|AMENDMENT (NO. 002.00 )|02381187644982522013|no|0
16|entity|AMENDMENT (NO. 003.02)|02513431628796693811|no|0
17|entity|AMENDMENT (NO. 005.00 )|01154936381389658373|no|0
18|entity|AMENDMENT (NO. 007 )|03918206870515019731|no|0
19|entity|AMENDMENT (NO. 008 )|08819374516737857756|no|0
20|entity|AMENDMENT (NO. 009 )|03204175304077932961|no|0
21|entity|AMENDMENT (NO. 010 )|05823406524061590731|no|0
22|entity|AMENDMENT (NO. 011 )|08674044714312252700|no|0
23|entity|AMENDMENT (NO. 013 )|02068854522204650134|no|0
24|entity|AMENDMENT (NO. 014 )|06353477035103929731|no|0
25|entity|ARTHUR KLEIN|04008955034518895738|yes|1
26|entity|Bank of New York Mellon Corporation (BNY Mellon)|05384086983174826493|yes|248
27|entity|BLICBANK NEW YORK|03220685979272488431|no|0
28|entity|BLICUS 33|03382116686024656995|no|0
29|entity|BLX Group LLC|01470965072054453101|no|0
30|entity|BNY Rebate Analysis: 4124255.pdf|04899275328142043346|no|0
31|entity|Certificate as to Arbitrage|09073217463430168172|no|0
32|entity|COLLATERAL SUBACCOUNT|02352505202908928335|no|0
33|entity|Construction Account|00226686358700946423|no|0
34|entity|CORPORATE TRUST DIVISION|00541401425133389525|no|0
35|entity|Dallas|05716789654794197421|yes|225
36|entity|Dallas, TX 75206|05885379055126329646|no|0
37|entity|Debt Service Reserve Account|00374030580716664244|no|0
38|entity|DEBT SERVICE RESERVE ACCOUNT|06483867964489030036|no|0
39|entity|engagement letter|08129196958194220174|no|0
40|entity|Escrow Fund|03499104088028066083|no|0
41|entity|EXHIBIT A|01428311937107269689|no|0
42|entity|EXHIBIT B|04378959058990797753|no|0
43|entity|EXHIBIT C|00032845926869761085|no|0
44|entity|EXHIBIT D|07010305909201796213|no|0
45|entity|Federated MM|07669844269534725615|no|0
46|entity|FOREIGN TRADE BANK OF LATIN AMERICA INC|06441935222764684550|yes|2
47|entity|HSBC Bank USA Trade Services|02625373596646965640|no|0
48|entity|HSBC Bank USA, National Association|06157989400122873900|yes|111
49|entity|INTERIM ARBITRAGE REBATE ANALYSIS|05651499468729638165|no|0
50|entity|Internal Revenue Service Form 8038-T|03439765214018713853|no|0
51|entity|INTERNATIONAL CHAMBER OF COMMERCE PUBLICATION NO. 400|07134683315725495957|no|0
52|entity|IRREVOCABLE LETTER OF CREDIT|09170860967536978667|no|0
53|entity|IRREVOCABLE LETTER OF CREDIT NO. 5094714|08242646876499346416|no|0
54|entity|JOSEPH E. LUDES|08382407775580926155|no|0
55|entity|JULIANNE MEDICI|08227710946729421751|no|0
56|entity|LEFRAK ORGANIZATION INC.|07059425056973183461|no|0
57|entity|Liquidity I|00212533258381375355|no|0
58|entity|Liquidity I Account|07476737946181823597|no|0
59|entity|Liquidity II Account|06638852300639391265|no|0
60|entity|Lockbox 35, Suite 2600 SW|02310895720670755529|no|0
61|entity|Morgan IA|07160664882440639509|no|0
62|entity|NC HOUSING ASSOCIATES #200 CO.|04104505588419472813|yes|1
63|entity|NEW JERSEY HOUSING AND MORTGAGE FINANCE AGENCY|05109415780850342446|no|0
64|entity|New Jersey Housing and Mortgage Finance Agency|06471256961308361850|yes|1
65|entity|New York|04648605347073135218|yes|226
66|entity|New York, NY 10019-6142|06662360422077407907|no|0
67|entity|Newport 91 Col 11|01066437395655026795|no|0
68|entity|Newport Project|05244065165148542602|no|0
69|entity|Notes and Assumptions|09013206385896288509|no|0
70|entity|Orrick|02080889041561724035|yes|11
71|entity|Orrick, Herrington & Sutcliffe, LLP|05477621199116204617|yes|14
72|entity|P.O. Box 18550|01867702731957289564|no|0
73|entity|Presidential Plaza|03029826579187567535|no|0
74|entity|Presidential Plaza at Newport Project|07995807768282066926|no|0
75|entity|Prior Rebate Liability|02258511055208974139|no|0
76|entity|Prior Rebate Liability|02277784462984661168|no|0
77|entity|Prior Report|03844814106996110754|no|0
78|entity|Report|08879090567778783678|no|0
79|entity|REPUBLIC NATIONAL BANK OF NEW YORK|04824620677155774613|no|0
80|entity|Reserve I|05312626425379185141|no|0
81|entity|Reserve I Account|09112734796193071548|no|0
82|entity|Reserve II|05766542102150149251|no|0
83|entity|Reserve II Account|02877916378535664072|no|0
84|entity|Revenue Account|01477039329975055923|no|0
85|entity|Schedule A - Summary of Rebate Analysis|03190929743969324823|no|0
86|entity|Schedule A - Summary of Rebate Analysis|08523712635205527373|no|0
87|entity|Schedule B - Sources & Uses of Funds|04190633011426224500|no|0
88|entity|Schedule B - Sources & Uses of Funds|04662206365284782208|no|0
89|entity|Schedule C - Reserve I Account|07565798991068528206|no|0
90|entity|Schedule C - Reserve I Account|07684968567575696080|no|0
91|entity|Schedule C1 - Reserve I Account Remaining Balance Analyses|00206579677833234805|no|0
92|entity|Schedule C2 - Reserve I Account Net Nonpurpose Investments Cash Flow|08917349301390975997|no|0
93|entity|Schedule D - Reserve II Account|04931428261163025225|no|0
94|entity|Schedule D - Reserve II Account|08647261206502899303|no|0
95|entity|Schedule D1 - Reserve II Account Remaining Balance Analyses|02990484481727744339|no|0
96|entity|Schedule D2 - Reserve II Account Net Nonpurpose Investments Cash Flow|02576017519828814741|no|0
97|entity|Schedule E - Prior Rebate Liability|03896407521264998095|no|0
98|entity|Schedule E - Prior Rebate Liability|07699163145713422733|no|0
99|entity|Schedule E1 - Prior Rebate Liability Future Value Calculation|07716519703989279091|no|0
100|entity|Schedule F - Liquidity I Account|01667998524201661399|no|0
101|entity|Schedule F - Liquidity I Account|06422763341505446459|no|0
102|entity|Schedule F1 - Liquidity I Account Remaining Balance Analyses|06635759182396356344|no|0
103|entity|Schedule F2 - Liquidity I Account Net Nonpurpose Investments Cash Flow|00042598379929581788|no|0
104|entity|Schedule G - Liquidity II Account|04194651737123043185|no|0
105|entity|Schedule G - Liquidity II Account|06887584236230756927|no|0
106|entity|Schedule G1 - Liquidity II Account Remaining Balance Analyses|02562486007957623103|no|0
107|entity|Schedule G2 - Liquidity II Account Net Nonpurpose Investments Cash Flow|06533606881395055487|no|0
108|entity|SDCMTN094714|07005109958829846067|no|0
109|entity|SECTION 10.3|08149435077860669278|no|0
110|entity|SECTION 5.6|08753339908811957357|no|0
111|entity|Telex: 234967 (RCA)|02006969212955648599|no|0
112|entity|Telex: 620274 (MCI), 7607367 (CCI)|05895679362876652650|no|0
113|entity|Temporary Treasury Regulations Section 1.148-4T(e)(2)|00996175972460951893|no|0
114|entity|The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch|08749664511655725314|yes|299
115|entity|The Treasury|07404718453994080710|yes|286
116|entity|Totals:|08623770550156948762|no|0
117|entity|Transmittal Letter|05121003150070824032|no|0
118|entity|Trenton, New Jersey|01054548445358605934|yes|120
119|entity|Trenton, NJ 08650-2085|07706441574885243436|no|0
120|entity|TRUST INDENTURE (THE INDENTURE) DATED AS OF OCTOBER 17, 1991|02374661523630693574|no|0
121|entity|U.S. $1,307,116.07|05989291099094186035|no|0
122|entity|UNIFORM CUSTOMS|06208785035719167709|no|0
123|entity|UNIFORM CUSTOMS AND PRACTICE FOR DOCUMENTARY CREDITS (1983 REVISION)|03127771656435772906|no|0
124|entity|UNITED JERSEY BANK/CENTRAL,|06967031221082229818|yes|2
125|entity|United States|08378183269956851171|yes|258
126|entity|United States Department of the Treasury|08883522583676895375|yes|293
127|entity|Willdan Financial Services|07683517764755523583|yes|2
128|event|Andersen Tax Holdings LLC Management Buyout from HSBC USA Inc.|04258205728901861642|yes|1
129|event|BLX Group LLC Interim Arbitrage Rebate Analysis Report Issuance|02718761691036058788|no|0
130|event|Bonds Dated Date|08565099947243983842|no|0
131|event|Boxcar Project Financing Secured|08090228703605722075|yes|3
132|event|Cumulative Rebate Liability Determination|03405251110540993306|no|0
133|event|Fund Valuation (2015)|07144607400902443391|no|0
134|event|Interim Arbitrage Rebate Analysis Computation|06239695588840415577|no|0
135|event|Interim Arbitrage Rebate Analysis Computation Period|04110827024273399802|no|0
136|event|Interim Arbitrage Rebate Analysis Report Issuance|02646938138906315919|no|0
137|event|Interim Arbitrage Rebate Computation|02714238907301044362|no|0
138|event|Interim Arbitrage Rebate Computation (2015)|05955161371232721897|no|0
139|event|Issuance of 1991 Series 1 Bonds|08506574259702576298|no|0
140|event|Issuance of Interim Arbitrage Rebate Analysis Report|05541066249384893038|no|0
141|event|Issuance of Interim Arbitrage Rebate Analysis Report (2015)|07174252727178416608|no|0
142|event|Issuance of Multifamily Housing Revenue Refunding Bonds|01918313467271094197|no|0
143|event|Legal Advisory for Boxcar Project Financing|04876759988914492560|yes|3
144|event|Linea Energy Closes Project Debt Financing for Watertown Solar|00138228655679371505|yes|6
145|event|Liquidity I Account Valuation|04654524095107257635|no|0
146|event|Liquidity I Account Valuation|06827380041821210935|no|0
147|event|Liquidity I Account Valuation (2008)|02148437331998553539|no|0
148|event|Liquidity I Account Valuation (2021)|00825671305674191121|no|0
149|event|Liquidity II Account Valuation|05741932115563849633|no|0
150|event|Liquidity II Account Valuation|08432869064523413071|no|0
151|event|Liquidity II Account Valuation (2008)|03791687575467746738|no|0
152|event|Liquidity II Account Valuation (2021)|05997887145037014720|no|0
153|event|LOC Amendment 001 (1994)|05787489496220607090|no|0
154|event|LOC Amendment 002 (1995)|02019316181255681060|no|0
155|event|LOC Amendment 002.00 (2001)|00075022521282902980|no|0
156|event|LOC Amendment 003 (1996)|01787850693356836623|no|0
157|event|LOC Amendment 003.02 (2002)|08875825215778696750|no|0
158|event|LOC Amendment 004 (1997)|01572244364870424889|no|0
159|event|LOC Amendment 005 (1998)|02195608124423819795|no|0
160|event|LOC Amendment 005.00 (2003)|01081495739296720139|no|0
161|event|LOC Amendment 006 (1999)|08925775974109071112|no|0
162|event|LOC Amendment 007 (2000) and Bank Succession|08744748145772939211|no|0
163|event|LOC Amendment 007 (2003) and Beneficiary Change|01138243181301719477|no|0
164|event|LOC Issuance 5094714|06539357891135938309|no|0
165|event|Management Buyout of WTAS Holdings LLC|03051775432317195451|yes|3
166|event|Next Rebate Installment Payment Due|07320563947125422385|no|0
167|event|Orrick, Herrington & Sutcliffe LLP Opinion Issuance|01273746902535634747|no|0
168|event|Prior Arbitrage Rebate Computation (2008)|06066214711165460283|no|0
169|event|Prior Arbitrage Rebate Report Issuance|04407948040923244881|no|0
170|event|Prior Rebate Liability Future Value Calculation|02909237326458944713|no|0
171|event|Rebate Payment Determination (2016)|04474412548779491134|no|0
172|event|Rebate Payment Due Determination (2021)|08429830080010611935|no|0
173|event|Refunding of 1985 Series F and G Bonds|04470736076228468470|no|0
174|event|Refunding of Prior Bonds|07642128242694169818|no|0
175|event|Reserve I Account Valuation|00776751846661763111|no|0
176|event|Reserve I Account Valuation|01489231668767221387|no|0
177|event|Reserve I Account Valuation (2008)|05890059083311343535|no|0
178|event|Reserve I Account Valuation (2021)|02278649202655105485|no|0
179|event|Reserve II Account Valuation|04125160574423129877|no|0
180|event|Reserve II Account Valuation|08960891596258412083|no|0
181|event|Reserve II Account Valuation (2008)|04722741527453915134|no|0
182|event|Reserve II Account Valuation (2021)|08219936286222944588|no|0
```

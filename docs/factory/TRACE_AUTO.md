# Requirement register (auto skeleton) - دستور اولیه.txt

Generated 2026-10-31 from 1822 paragraphs; 414 lines kept (69 MUST, 49 MUST-NOT, 296 CAND).

> Heuristic extraction. The factory (skill webapp-intake) must read the whole spec, merge/split rows, add missing implicit requirements and fill Status/Evidence. Status values: unverified | met | partial | missing | waived (with reason and date).

| ID | Kind | Section | Para | Requirement | Status | Evidence (file:line / test / screenshot) |
|---|---|---|---|---|---|---|
| R-001 | CAND | # PART 1 — YOUR ROLE AND MISSION | 6 | Act as an autonomous multidisciplinary product development team composed of: | unverified | |
| R-002 | CAND | 12. DevOps and Deployment Engineer | 19 | Your responsibility is to design, implement, test, and deliver a complete web application for a real-world agricultural product distribution and sales business. | unverified | |
| R-003 | MUST | 12. DevOps and Deployment Engineer | 20 | The application must be modular, maintainable, visually excellent, financially consistent, and ready for progressive expansion. | unverified | |
| R-004 | MUST-NOT | 12. DevOps and Deployment Engineer | 21 | Do not merely create a presentation, landing page, dashboard mockup, or collection of nonfunctional pages. | unverified | |
| R-005 | CAND | 12. DevOps and Deployment Engineer | 22 | Build a genuinely functional database-backed application with: | unverified | |
| R-006 | CAND | 12. DevOps and Deployment Engineer | 23 | - User authentication | unverified | |
| R-007 | CAND | 12. DevOps and Deployment Engineer | 24 | - Role-based access control | unverified | |
| R-008 | CAND | 12. DevOps and Deployment Engineer | 25 | - Real database operations | unverified | |
| R-009 | CAND | 12. DevOps and Deployment Engineer | 26 | - Product and pricing management | unverified | |
| R-010 | CAND | 12. DevOps and Deployment Engineer | 27 | - Inventory movement tracking | unverified | |
| R-011 | CAND | 12. DevOps and Deployment Engineer | 28 | - Goods custody management | unverified | |
| R-012 | CAND | 12. DevOps and Deployment Engineer | 29 | - Signed delivery documents | unverified | |
| R-013 | CAND | 12. DevOps and Deployment Engineer | 30 | - Retailer management | unverified | |
| R-014 | CAND | 12. DevOps and Deployment Engineer | 31 | - Sales agent management | unverified | |
| R-015 | CAND | 12. DevOps and Deployment Engineer | 32 | - Field visit management | unverified | |
| R-016 | CAND | 12. DevOps and Deployment Engineer | 33 | - Consignment distribution | unverified | |
| R-017 | CAND | 12. DevOps and Deployment Engineer | 34 | - Direct consumer e-commerce | unverified | |
| R-018 | CAND | 12. DevOps and Deployment Engineer | 35 | - Payment and collection management | unverified | |
| R-019 | CAND | 12. DevOps and Deployment Engineer | 36 | - Commission calculation | unverified | |
| R-020 | CAND | 12. DevOps and Deployment Engineer | 37 | - Financial reporting | unverified | |
| R-021 | CAND | 12. DevOps and Deployment Engineer | 38 | - QR code functionality | unverified | |
| R-022 | CAND | 12. DevOps and Deployment Engineer | 39 | - Printable business forms | unverified | |
| R-023 | CAND | 12. DevOps and Deployment Engineer | 40 | - Document image uploads | unverified | |
| R-024 | CAND | 12. DevOps and Deployment Engineer | 41 | - Demonstration data | unverified | |
| R-025 | CAND | 12. DevOps and Deployment Engineer | 42 | - Automated tests | unverified | |
| R-026 | MUST | 12. DevOps and Deployment Engineer | 43 | The application must be usable by a real business owner, sales agents, grocery stores, and consumers. | unverified | |
| R-027 | MUST-NOT | 12. DevOps and Deployment Engineer | 44 | Make reasonable technical decisions autonomously. Do not repeatedly ask the owner to approve ordinary implementation decisions. | unverified | |
| R-028 | CAND | 12. DevOps and Deployment Engineer | 45 | If a genuine business policy is configurable, implement the configuration rather than hardcoding an arbitrary assumption. | unverified | |
| R-029 | MUST | 12. DevOps and Deployment Engineer | 46 | The final result must be a working product, not just a proposal. | unverified | |
| R-030 | MUST | ## 2.1 Initial business | 59 | The product brand name, logo, descriptions, product photographs, and business information must be editable from the administrator dashboard. | unverified | |
| R-031 | MUST-NOT | ## 2.1 Initial business | 60 | Do not hardcode the business identity into the application. | unverified | |
| R-032 | MUST | ## 2.2 Future product expansion | 62 | The platform must support multiple products from the beginning. | unverified | |
| R-033 | MUST-NOT | ## 2.2 Future product expansion | 69 | Adding products must not require any source-code modifications. | unverified | |
| R-034 | MUST | ## 2.2 Future product expansion | 70 | All inventory, pricing, commissions, reports, and sales documents must support multiple products. | unverified | |
| R-035 | MUST | ### Channel B — B2C direct consumer sales | 81 | Payment must be completed before fulfillment. | unverified | |
| R-036 | MUST | ### Channel B — B2C direct consumer sales | 83 | These channels must share product information and inventory infrastructure but have separate payment and settlement workflows. | unverified | |
| R-037 | MUST-NOT | QR: | 123 | - Do not depend on a persistent local filesystem in Vercel production. | unverified | |
| R-038 | MUST-NOT | QR: | 139 | Use maintained stable dependency versions available at implementation time. Do not unnecessarily use experimental packages. | unverified | |
| R-039 | MUST-NOT | QR: | 140 | Document the limitations of free-tier infrastructure. Never promise unlimited free service. | unverified | |
| R-040 | MUST-NOT | 28. System Settings | 174 | Do not put all application logic into one massive component. | unverified | |
| R-041 | MUST | 28. System Settings | 175 | Financial and inventory operations must be performed on the server and protected with database transactions. | unverified | |
| R-042 | CAND | # PART 5 — USER ROLES AND PERMISSIONS | 178 | Implement four primary user roles. | unverified | |
| R-043 | MUST-NOT | ## 5.2 Sales Agent | 220 | An agent must not access another agent's private data unless explicitly authorized. | unverified | |
| R-044 | MUST | ## 5.3 Retailer / Grocery Store | 236 | A retailer must only see its own information. | unverified | |
| R-045 | MUST-NOT | ## 5.4 Customer | 247 | Do not require an account merely to browse products. | unverified | |
| R-046 | MUST | # PART 6 — CENTRAL ADMINISTRATIVE SETTINGS | 251 | The owner must be able to configure: | unverified | |
| R-047 | MUST | # PART 6 — CENTRAL ADMINISTRATIVE SETTINGS | 270 | All important business values must be configurable. | unverified | |
| R-048 | MUST-NOT | # PART 6 — CENTRAL ADMINISTRATIVE SETTINGS | 271 | Historical transactions must never change silently when settings change. | unverified | |
| R-049 | MUST | 16. وضعیت فعال/غیرفعال | 299 | - SKU must be unique. | unverified | |
| R-050 | MUST | 16. وضعیت فعال/غیرفعال | 300 | - Weight must be positive. | unverified | |
| R-051 | MUST | 16. وضعیت فعال/غیرفعال | 302 | - Images must pass file type and size validation. | unverified | |
| R-052 | MUST-NOT | 16. وضعیت فعال/غیرفعال | 303 | Product editing must not alter historical transaction snapshots. | unverified | |
| R-053 | MUST | # PART 8 — DYNAMIC PRICING MANAGEMENT | 307 | The owner must be able to define the following independently for every product: | unverified | |
| R-054 | MUST | 8. Expiration date. | 330 | The historical price must remain unchanged when the current price changes. | unverified | |
| R-055 | MUST | # PART 9 — SALES AGENT MANAGEMENT FORM | 336 | - نام و نام خانوادگی — Required | unverified | |
| R-056 | MUST | # PART 9 — SALES AGENT MANAGEMENT FORM | 338 | - شماره موبایل — Required and unique | unverified | |
| R-057 | MUST-NOT | # PART 9 — SALES AGENT MANAGEMENT FORM | 363 | Do not allow deletion of agents with historical transactions. Use deactivation. | unverified | |
| R-058 | MUST | 20. Optional signed cooperation agreement | 395 | Retailer registration through a referral link must preserve the original acquisition agent. | unverified | |
| R-059 | MUST | # PART 11 — WAREHOUSE AND INVENTORY MANAGEMENT | 407 | Each product must have quantity balances at each location. | unverified | |
| R-060 | MUST-NOT | # PART 11 — WAREHOUSE AND INVENTORY MANAGEMENT | 409 | Never change inventory balances by directly editing a database field. | unverified | |
| R-061 | MUST | # PART 11 — WAREHOUSE AND INVENTORY MANAGEMENT | 410 | Every change must have a movement record. | unverified | |
| R-062 | MUST | ### Mode B — Credit sale to the agent | 457 | The selected policy must appear clearly on the signed document. | unverified | |
| R-063 | MUST-NOT | ### Mode B — Credit sale to the agent | 458 | Never silently switch between these modes. | unverified | |
| R-064 | MUST | ## 12.2 Retailer delivery mode | 460 | Similarly, retailers must support: | unverified | |
| R-065 | MUST | # PART 13 — DOCUMENT GENERATION AND SIGNATURE MANAGEMENT | 470 | The system must generate attractive, formal, printable Persian documents. | unverified | |
| R-066 | MUST-NOT | # PART 13 — DOCUMENT GENERATION AND SIGNATURE MANAGEMENT | 471 | Do not rely on generic browser alerts or plain text printouts. | unverified | |
| R-067 | MUST | # PART 13 — DOCUMENT GENERATION AND SIGNATURE MANAGEMENT | 473 | All official documents must: | unverified | |
| R-068 | MUST-NOT | # PART 13 — DOCUMENT GENERATION AND SIGNATURE MANAGEMENT | 490 | Do not claim that a scanned signature or uploaded document automatically guarantees legal enforceability. | unverified | |
| R-069 | MUST | # PART 13 — DOCUMENT GENERATION AND SIGNATURE MANAGEMENT | 491 | The owner must be able to edit the business's standard document wording through settings, with version history. | unverified | |
| R-070 | MUST | AG-1405-00021 | 498 | The form must contain: | unverified | |
| R-071 | CAND | ## Required declaration text | 528 | Generate a professionally worded Persian declaration equivalent to: | unverified | |
| R-072 | CAND | ## Required declaration text | 530 | If credit-sale mode is selected, use a separate declaration explaining the agreed immediate financial obligation and payment terms. | unverified | |
| R-073 | MUST-NOT | ## Required declaration text | 531 | Never display custody mode as an immediate monetary debt. | unverified | |
| R-074 | MUST-NOT | 12. Update agent custody inventory. | 550 | A transfer must not be considered verified without the required signed documentation. | unverified | |
| R-075 | MUST | ## Signatures | 598 | The system must generate the printable form and accept a photographed or scanned signed copy. | unverified | |
| R-076 | MUST | # PART 16 — FORM 3: AGENT RETURN TO WAREHOUSE | 625 | The warehouse return must reduce agent custody and increase warehouse stock only after verification. | unverified | |
| R-077 | MUST-NOT | # PART 17 — FORM 4: RETAILER RETURN TO AGENT OR WAREHOUSE | 647 | Do not allow a quantity greater than the eligible retailer custody stock. | unverified | |
| R-078 | MUST | # PART 17 — FORM 4: RETAILER RETURN TO AGENT OR WAREHOUSE | 648 | Every return must reference its source delivery wherever possible. | unverified | |
| R-079 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 651 | Form title: | unverified | |
| R-080 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 652 | «گزارش فروش و موجودی فروشگاه» | unverified | |
| R-081 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 653 | This form can be submitted by the retailer or entered by an authorized agent on the retailer's behalf. | unverified | |
| R-082 | MUST | # PART 18 — FORM 5: RETAILER SALES REPORT | 654 | Required fields: | unverified | |
| R-083 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 655 | - Retailer | unverified | |
| R-084 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 656 | - Reporting period start | unverified | |
| R-085 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 657 | - Reporting period end | unverified | |
| R-086 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 658 | - Product | unverified | |
| R-087 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 659 | - Opening stock | unverified | |
| R-088 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 660 | - Packages received during the period | unverified | |
| R-089 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 661 | - Packages returned | unverified | |
| R-090 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 662 | - Reported quantity sold | unverified | |
| R-091 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 663 | - Physical quantity remaining | unverified | |
| R-092 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 664 | - Damaged quantity | unverified | |
| R-093 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 666 | Calculate: | unverified | |
| R-094 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 667 | Opening stock | unverified | |
| R-095 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 668 | + Receipts | unverified | |
| R-096 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 669 | - Returns | unverified | |
| R-097 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 671 | - Approved damage adjustments | unverified | |
| R-098 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 672 | = Closing stock. | unverified | |
| R-099 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 673 | Validate the calculation. | unverified | |
| R-100 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 674 | If reported closing inventory differs from calculated inventory, create a discrepancy instead of silently accepting the difference. | unverified | |
| R-101 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 675 | Provide statuses: | unverified | |
| R-102 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 677 | - Submitted | unverified | |
| R-103 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 678 | - Confirmed by retailer | unverified | |
| R-104 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 679 | - Verified by administrator | unverified | |
| R-105 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 680 | - Rejected | unverified | |
| R-106 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 681 | - Under review | unverified | |
| R-107 | MUST | # PART 18 — FORM 5: RETAILER SALES REPORT | 682 | The retailer must be able to confirm the report. | unverified | |
| R-108 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 683 | When a sales report becomes verified: | unverified | |
| R-109 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 684 | - Reduce retailer custody inventory by reported sold quantity. | unverified | |
| R-110 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 685 | - Generate corresponding financial receivables in consignment mode. | unverified | |
| R-111 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 686 | - Preserve the source delivery and product price snapshot. | unverified | |
| R-112 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 687 | - Attribute the transaction to the responsible sales agent. | unverified | |
| R-113 | CAND | # PART 18 — FORM 5: RETAILER SALES REPORT | 688 | - Trigger eligible commission logic only when payment is verified. | unverified | |
| R-114 | MUST-NOT | # PART 18 — FORM 5: RETAILER SALES REPORT | 689 | Do not create duplicate sales when the same report is submitted twice. | unverified | |
| R-115 | MUST | - POS | 716 | The owner must review and verify submitted payments. | unverified | |
| R-116 | MUST | # PART 20 — FORM 7: FIELD PAYMENT COLLECTION RECEIPT | 737 | The receipt must indicate whether the money was: | unverified | |
| R-117 | MUST-NOT | # PART 20 — FORM 7: FIELD PAYMENT COLLECTION RECEIPT | 741 | A payment collected by an agent must not automatically be treated as money deposited in the owner's bank account. | unverified | |
| R-118 | MUST | # PART 21 — FORM 8: AGENT REMITTANCE TO BUSINESS OWNER | 761 | The system must reconcile: | unverified | |
| R-119 | MUST-NOT | # PART 21 — FORM 8: AGENT REMITTANCE TO BUSINESS OWNER | 766 | Do not issue duplicate credit for the same payment. | unverified | |
| R-120 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 797 | «گزارش بازدید بازاریاب از فروشگاه» | unverified | |
| R-121 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 800 | - Retailer | unverified | |
| R-122 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 801 | - Date and time | unverified | |
| R-123 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 802 | - Visit location, optional GPS | unverified | |
| R-124 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 803 | - Observed stock | unverified | |
| R-125 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 804 | - Retailer-reported sales | unverified | |
| R-126 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 805 | - Outstanding balance | unverified | |
| R-127 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 806 | - Payment follow-up status | unverified | |
| R-128 | MUST | # PART 23 — FORM 10: FIELD VISIT REPORT | 807 | - Restocking requirement | unverified | |
| R-129 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 808 | - Competition or market observations | unverified | |
| R-130 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 809 | - Photos, optional | unverified | |
| R-131 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 810 | - Visit notes | unverified | |
| R-132 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 811 | - Next visit date | unverified | |
| R-133 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 812 | - Visit outcome | unverified | |
| R-134 | CAND | # PART 23 — FORM 10: FIELD VISIT REPORT | 813 | Visit outcomes: | unverified | |
| R-135 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 839 | «گزارش کسری، مغایرت یا آسیب کالا» | unverified | |
| R-136 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 841 | - Reporting user | unverified | |
| R-137 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 842 | - Agent or retailer | unverified | |
| R-138 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 843 | - Product | unverified | |
| R-139 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 844 | - Related delivery document | unverified | |
| R-140 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 845 | - Expected quantity | unverified | |
| R-141 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 846 | - Observed quantity | unverified | |
| R-142 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 847 | - Difference | unverified | |
| R-143 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 848 | - Damaged quantity | unverified | |
| R-144 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 849 | - Lost quantity | unverified | |
| R-145 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 850 | - Reason | unverified | |
| R-146 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 851 | - Evidence photographs | unverified | |
| R-147 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 854 | Possible resolutions: | unverified | |
| R-148 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 855 | - No discrepancy confirmed | unverified | |
| R-149 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 856 | - Return to warehouse | unverified | |
| R-150 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 857 | - Approved damage write-off | unverified | |
| R-151 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 858 | - Financial claim | unverified | |
| R-152 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 859 | - Further investigation | unverified | |
| R-153 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 860 | - Corrected inventory through approved adjustment | unverified | |
| R-154 | MUST-NOT | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 861 | Do not silently delete missing or damaged stock. | unverified | |
| R-155 | MUST | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 862 | A financial liability must be generated only under the applicable agreement and after authorized review. | unverified | |
| R-156 | CAND | # PART 24 — FORM 11: INVENTORY DISCREPANCY AND DAMAGE REPORT | 863 | Store the administrator's decision and supporting documents. | unverified | |
| R-157 | MUST | # PART 25 — FORM 12: INVENTORY COUNT AND RECONCILIATION | 885 | A difference must require an approved adjustment before changing the financial or inventory records. | unverified | |
| R-158 | MUST | # PART 26 — FORM 13: AGENT COMMISSION POLICY | 890 | The administrator must be able to configure commission rules separately for every agent. | unverified | |
| R-159 | MUST-NOT | 7. Combination of multiple rules | 919 | Changing a commission rule must not affect historical commissions. | unverified | |
| R-160 | MUST | # PART 27 — FORM 14: COMMISSION APPROVAL AND PAYMENT | 941 | Each commission must reference the original payment or sale responsible for generating it. | unverified | |
| R-161 | MUST-NOT | # PART 27 — FORM 14: COMMISSION APPROVAL AND PAYMENT | 942 | The same qualifying payment must never generate duplicate commission. | unverified | |
| R-162 | MUST | # PART 28 — CUSTOMER AND DIRECT E-COMMERCE | 951 | The product page must include: | unverified | |
| R-163 | MUST-NOT | 13. Total payment | 983 | Do not require an unnecessary account. | unverified | |
| R-164 | MUST-NOT | # PART 29 — B2C PAYMENT AND ORDER FORMS | 1007 | Never present a simulated payment as a real transaction. | unverified | |
| R-165 | MUST | # PART 30 — FORM 15: ORDER FULFILLMENT AND DELIVERY | 1037 | The customer must be able to track their order. | unverified | |
| R-166 | MUST | # PART 30 — FORM 15: ORDER FULFILLMENT AND DELIVERY | 1038 | Returned or failed deliveries must have an explicit return workflow. | unverified | |
| R-167 | MUST | # PART 31 — FORM 16: CANCELLATION AND REFUND | 1055 | Refund operations must generate financial reversals. | unverified | |
| R-168 | MUST | # PART 31 — FORM 16: CANCELLATION AND REFUND | 1056 | Returned physical stock must be independently inspected before becoming available inventory. | unverified | |
| R-169 | MUST | # PART 32 — QR CODE AND REFERRAL MANAGEMENT | 1059 | Every product must have a permanent public URL. | unverified | |
| R-170 | MUST | # PART 32 — QR CODE AND REFERRAL MANAGEMENT | 1064 | The page must offer two separate pathways: | unverified | |
| R-171 | MUST | 2. درخواست همکاری یا خرید فروشگاهی | 1068 | The system must also generate agent-specific referral links. | unverified | |
| R-172 | MUST-NOT | 2. درخواست همکاری یا خرید فروشگاهی | 1080 | Do not falsely attribute a generic product QR scan to a particular agent. | unverified | |
| R-173 | MUST-NOT | 12. Approved adjustments | 1100 | Do not calculate company cash balance by simply summing all sales. | unverified | |
| R-174 | MUST | 12. Approved adjustments | 1101 | The system must distinguish: | unverified | |
| R-175 | CAND | ## Required accounting formulas | 1111 | For retailer consignment inventory: | unverified | |
| R-176 | CAND | ## Required accounting formulas | 1112 | Opening stock | unverified | |
| R-177 | CAND | ## Required accounting formulas | 1113 | + Verified deliveries | unverified | |
| R-178 | CAND | ## Required accounting formulas | 1114 | - Verified sales | unverified | |
| R-179 | CAND | ## Required accounting formulas | 1115 | - Approved returns | unverified | |
| R-180 | CAND | ## Required accounting formulas | 1116 | - Approved damage adjustments | unverified | |
| R-181 | CAND | ## Required accounting formulas | 1117 | = Closing retailer stock. | unverified | |
| R-182 | CAND | ## Required accounting formulas | 1118 | Retailer receivable: | unverified | |
| R-183 | CAND | ## Required accounting formulas | 1119 | Opening receivable | unverified | |
| R-184 | CAND | ## Required accounting formulas | 1120 | + New consignment sales receivables | unverified | |
| R-185 | CAND | ## Required accounting formulas | 1121 | + Approved financial adjustments | unverified | |
| R-186 | CAND | ## Required accounting formulas | 1122 | - Verified payments allocated | unverified | |
| R-187 | CAND | ## Required accounting formulas | 1123 | - Approved credit notes | unverified | |
| R-188 | CAND | ## Required accounting formulas | 1124 | = Closing receivable. | unverified | |
| R-189 | CAND | ## Required accounting formulas | 1125 | Agent custody: | unverified | |
| R-190 | CAND | ## Required accounting formulas | 1126 | Opening agent custody | unverified | |
| R-191 | CAND | ## Required accounting formulas | 1127 | + Warehouse deliveries | unverified | |
| R-192 | CAND | ## Required accounting formulas | 1128 | - Retailer deliveries | unverified | |
| R-193 | CAND | ## Required accounting formulas | 1129 | - Warehouse returns | unverified | |
| R-194 | CAND | ## Required accounting formulas | 1130 | - Approved adjustments | unverified | |
| R-195 | CAND | ## Required accounting formulas | 1131 | = Closing agent custody. | unverified | |
| R-196 | CAND | ## Required accounting formulas | 1132 | Agent cash: | unverified | |
| R-197 | CAND | ## Required accounting formulas | 1133 | Opening cash held | unverified | |
| R-198 | CAND | ## Required accounting formulas | 1134 | + Verified collections made by agent | unverified | |
| R-199 | CAND | ## Required accounting formulas | 1135 | - Verified remittances to owner | unverified | |
| R-200 | CAND | ## Required accounting formulas | 1136 | = Closing cash held. | unverified | |
| R-201 | CAND | ## Required accounting formulas | 1137 | Warehouse inventory: | unverified | |
| R-202 | CAND | ## Required accounting formulas | 1138 | Opening stock | unverified | |
| R-203 | CAND | ## Required accounting formulas | 1139 | + Verified supplier receipts | unverified | |
| R-204 | CAND | ## Required accounting formulas | 1140 | + Verified returns from agents | unverified | |
| R-205 | CAND | ## Required accounting formulas | 1141 | + Verified returns from retailers | unverified | |
| R-206 | CAND | ## Required accounting formulas | 1142 | - Agent deliveries | unverified | |
| R-207 | CAND | ## Required accounting formulas | 1143 | - B2C fulfillment | unverified | |
| R-208 | CAND | ## Required accounting formulas | 1144 | - Approved write-offs | unverified | |
| R-209 | CAND | ## Required accounting formulas | 1145 | = Closing warehouse stock. | unverified | |
| R-210 | CAND | ## Required accounting formulas | 1146 | Run automated reconciliation tests. | unverified | |
| R-211 | MUST-NOT | ## Required accounting formulas | 1147 | Never silently overwrite balances. | unverified | |
| R-212 | CAND | # PART 34 — ADMINISTRATOR DASHBOARD | 1150 | Build a premium executive dashboard. | unverified | |
| R-213 | CAND | # PART 34 — ADMINISTRATOR DASHBOARD | 1151 | Page title: | unverified | |
| R-214 | CAND | # PART 34 — ADMINISTRATOR DASHBOARD | 1152 | «داشبورد مدیریت کسب‌وکار» | unverified | |
| R-215 | CAND | 12. Latest warehouse movements | 1190 | Provide date, product, agent, and retailer filters. | unverified | |
| R-216 | MUST | 12. Latest warehouse movements | 1191 | All metrics must be computed from actual database data. | unverified | |
| R-217 | MUST-NOT | 12. Latest warehouse movements | 1192 | Never use hardcoded dashboard numbers. | unverified | |
| R-218 | CAND | # PART 35 — AGENT DASHBOARD | 1195 | Page title: | unverified | |
| R-219 | CAND | # PART 35 — AGENT DASHBOARD | 1196 | «داشبورد بازاریاب» | unverified | |
| R-220 | CAND | # PART 35 — AGENT DASHBOARD | 1197 | Mobile-first design. | unverified | |
| R-221 | CAND | ## Main dashboard sections | 1213 | - Today's visits | unverified | |
| R-222 | CAND | ## Main dashboard sections | 1214 | - Retailers requiring payment follow-up | unverified | |
| R-223 | CAND | ## Main dashboard sections | 1215 | - Retailers with zero stock | unverified | |
| R-224 | CAND | ## Main dashboard sections | 1216 | - Retailers needing restocking | unverified | |
| R-225 | CAND | ## Main dashboard sections | 1217 | - Pending delivery documents | unverified | |
| R-226 | CAND | ## Main dashboard sections | 1218 | - Agent custody statement | unverified | |
| R-227 | CAND | ## Main dashboard sections | 1219 | - Latest collections | unverified | |
| R-228 | CAND | ## Main dashboard sections | 1220 | - Commission summary | unverified | |
| R-229 | CAND | ## Main dashboard sections | 1221 | - Monthly performance | unverified | |
| R-230 | CAND | ## Quick actions | 1223 | - ثبت بازدید | unverified | |
| R-231 | CAND | ## Quick actions | 1224 | - ثبت تحویل کالا | unverified | |
| R-232 | CAND | ## Quick actions | 1225 | - ثبت گزارش فروش | unverified | |
| R-233 | CAND | ## Quick actions | 1226 | - ثبت دریافت وجه | unverified | |
| R-234 | CAND | ## Quick actions | 1227 | - ثبت درخواست تأمین کالا | unverified | |
| R-235 | CAND | ## Quick actions | 1228 | - ثبت برگشت کالا | unverified | |
| R-236 | CAND | ## Quick actions | 1229 | - مشاهده بدهی فروشگاه‌ها | unverified | |
| R-237 | CAND | ## Quick actions | 1230 | Use large buttons and a simple mobile interface. | unverified | |
| R-238 | CAND | # PART 36 — RETAILER DASHBOARD | 1233 | Page title: | unverified | |
| R-239 | CAND | # PART 36 — RETAILER DASHBOARD | 1234 | «پنل اختصاصی فروشگاه» | unverified | |
| R-240 | CAND | # PART 36 — RETAILER DASHBOARD | 1235 | Display: | unverified | |
| R-241 | CAND | # PART 36 — RETAILER DASHBOARD | 1236 | - Current products | unverified | |
| R-242 | CAND | # PART 36 — RETAILER DASHBOARD | 1237 | - Received packages | unverified | |
| R-243 | CAND | # PART 36 — RETAILER DASHBOARD | 1238 | - Sold packages | unverified | |
| R-244 | CAND | # PART 36 — RETAILER DASHBOARD | 1239 | - Remaining inventory | unverified | |
| R-245 | CAND | # PART 36 — RETAILER DASHBOARD | 1240 | - Financial outstanding balance | unverified | |
| R-246 | CAND | # PART 36 — RETAILER DASHBOARD | 1241 | - Verified payments | unverified | |
| R-247 | CAND | # PART 36 — RETAILER DASHBOARD | 1242 | - Pending payments | unverified | |
| R-248 | CAND | # PART 36 — RETAILER DASHBOARD | 1243 | - Latest delivery documents | unverified | |
| R-249 | CAND | # PART 36 — RETAILER DASHBOARD | 1244 | - Restocking requests | unverified | |
| R-250 | CAND | # PART 36 — RETAILER DASHBOARD | 1245 | - Next settlement date | unverified | |
| R-251 | CAND | # PART 36 — RETAILER DASHBOARD | 1246 | Quick actions: | unverified | |
| R-252 | CAND | # PART 36 — RETAILER DASHBOARD | 1247 | - ثبت فروش | unverified | |
| R-253 | CAND | # PART 36 — RETAILER DASHBOARD | 1248 | - گزارش موجودی | unverified | |
| R-254 | CAND | # PART 36 — RETAILER DASHBOARD | 1249 | - درخواست محصول | unverified | |
| R-255 | CAND | # PART 36 — RETAILER DASHBOARD | 1250 | - ثبت پرداخت | unverified | |
| R-256 | CAND | # PART 36 — RETAILER DASHBOARD | 1251 | - مشاهده اسناد | unverified | |
| R-257 | CAND | # PART 36 — RETAILER DASHBOARD | 1252 | - مشاهده بدهی | unverified | |
| R-258 | MUST-NOT | # PART 37 — CUSTOMER EXPERIENCE | 1264 | Do not mix administrator-oriented information into the consumer interface. | unverified | |
| R-259 | MUST | # PART 38 — COMPLETE ADMINISTRATIVE FORM CATALOG | 1267 | The following forms must be implemented as actual interactive forms, not merely described or shown as static samples. | unverified | |
| R-260 | MUST | # PART 38 — COMPLETE ADMINISTRATIVE FORM CATALOG | 1315 | Every form must have: | unverified | |
| R-261 | MUST | # PART 38 — COMPLETE ADMINISTRATIVE FORM CATALOG | 1318 | - Required/optional indicators | unverified | |
| R-262 | MUST-NOT | # PART 38 — COMPLETE ADMINISTRATIVE FORM CATALOG | 1329 | Do not use browser-native prompts as substitutes for real application forms. | unverified | |
| R-263 | MUST | # PART 39 — DIGITAL AND PRINTABLE DOCUMENT DESIGN | 1333 | The administrator must be able to: | unverified | |
| R-264 | MUST | # PART 39 — DIGITAL AND PRINTABLE DOCUMENT DESIGN | 1347 | Each document must have a unique identifier. | unverified | |
| R-265 | MUST-NOT | # PART 39 — DIGITAL AND PRINTABLE DOCUMENT DESIGN | 1368 | Do not expose permanent public links to signed documents. | unverified | |
| R-266 | CAND | # PART 41 — REPORTING AND EXPORT | 1402 | Build downloadable reports in Excel/CSV and printable PDF/HTML formats. | unverified | |
| R-267 | MUST | # PART 41 — REPORTING AND EXPORT | 1403 | Required reports: | unverified | |
| R-268 | CAND | 20. Expense reports | 1424 | Filters: | unverified | |
| R-269 | CAND | 20. Expense reports | 1425 | - Date range | unverified | |
| R-270 | CAND | 20. Expense reports | 1426 | - Product | unverified | |
| R-271 | CAND | 20. Expense reports | 1428 | - Retailer | unverified | |
| R-272 | CAND | 20. Expense reports | 1429 | - Customer | unverified | |
| R-273 | CAND | 20. Expense reports | 1430 | - Channel | unverified | |
| R-274 | CAND | 20. Expense reports | 1431 | - Document status | unverified | |
| R-275 | CAND | 20. Expense reports | 1432 | - Payment status | unverified | |
| R-276 | MUST | 20. Expense reports | 1433 | Exported reports must reflect the currently applied filters. | unverified | |
| R-277 | CAND | # PART 42 — DATABASE SCHEMA | 1436 | Design a normalized, relational PostgreSQL database. | unverified | |
| R-278 | MUST | # PART 42 — DATABASE SCHEMA | 1437 | Consider at least the following tables: | unverified | |
| R-279 | CAND | # PART 42 — DATABASE SCHEMA | 1440 | permissions | unverified | |
| R-280 | CAND | # PART 42 — DATABASE SCHEMA | 1441 | user_roles | unverified | |
| R-281 | CAND | # PART 42 — DATABASE SCHEMA | 1442 | business_settings | unverified | |
| R-282 | CAND | # PART 42 — DATABASE SCHEMA | 1443 | products | unverified | |
| R-283 | CAND | # PART 42 — DATABASE SCHEMA | 1444 | product_categories | unverified | |
| R-284 | CAND | # PART 42 — DATABASE SCHEMA | 1445 | product_prices | unverified | |
| R-285 | CAND | # PART 42 — DATABASE SCHEMA | 1446 | commission_rules | unverified | |
| R-286 | CAND | # PART 42 — DATABASE SCHEMA | 1448 | retailers | unverified | |
| R-287 | CAND | # PART 42 — DATABASE SCHEMA | 1449 | retailer_agent_assignments | unverified | |
| R-288 | CAND | # PART 42 — DATABASE SCHEMA | 1450 | customers | unverified | |
| R-289 | CAND | # PART 42 — DATABASE SCHEMA | 1451 | inventory_locations | unverified | |
| R-290 | CAND | # PART 42 — DATABASE SCHEMA | 1452 | inventory_balances | unverified | |
| R-291 | CAND | # PART 42 — DATABASE SCHEMA | 1453 | inventory_transactions | unverified | |
| R-292 | CAND | # PART 42 — DATABASE SCHEMA | 1454 | custody_accounts | unverified | |
| R-293 | CAND | # PART 42 — DATABASE SCHEMA | 1455 | custody_transfers | unverified | |
| R-294 | CAND | # PART 42 — DATABASE SCHEMA | 1456 | custody_transfer_items | unverified | |
| R-295 | CAND | # PART 42 — DATABASE SCHEMA | 1457 | delivery_documents | unverified | |
| R-296 | CAND | # PART 42 — DATABASE SCHEMA | 1458 | document_attachments | unverified | |
| R-297 | CAND | # PART 42 — DATABASE SCHEMA | 1459 | document_reviews | unverified | |
| R-298 | CAND | # PART 42 — DATABASE SCHEMA | 1460 | document_signatures | unverified | |
| R-299 | CAND | # PART 42 — DATABASE SCHEMA | 1461 | supplier_receipts | unverified | |
| R-300 | CAND | # PART 42 — DATABASE SCHEMA | 1463 | order_items | unverified | |
| R-301 | CAND | # PART 42 — DATABASE SCHEMA | 1464 | payments | unverified | |
| R-302 | CAND | # PART 42 — DATABASE SCHEMA | 1465 | payment_allocations | unverified | |
| R-303 | CAND | # PART 42 — DATABASE SCHEMA | 1466 | retailer_sales_reports | unverified | |
| R-304 | CAND | # PART 42 — DATABASE SCHEMA | 1467 | retailer_sales_report_items | unverified | |
| R-305 | CAND | # PART 42 — DATABASE SCHEMA | 1468 | consignment_deliveries | unverified | |
| R-306 | CAND | # PART 42 — DATABASE SCHEMA | 1469 | consignment_delivery_items | unverified | |
| R-307 | CAND | # PART 42 — DATABASE SCHEMA | 1470 | retailer_returns | unverified | |
| R-308 | CAND | # PART 42 — DATABASE SCHEMA | 1471 | agent_returns | unverified | |
| R-309 | CAND | # PART 42 — DATABASE SCHEMA | 1472 | inventory_counts | unverified | |
| R-310 | CAND | # PART 42 — DATABASE SCHEMA | 1473 | inventory_discrepancies | unverified | |
| R-311 | CAND | # PART 42 — DATABASE SCHEMA | 1474 | stock_adjustments | unverified | |
| R-312 | CAND | # PART 42 — DATABASE SCHEMA | 1475 | retailer_visits | unverified | |
| R-313 | CAND | # PART 42 — DATABASE SCHEMA | 1476 | visit_photos | unverified | |
| R-314 | CAND | # PART 42 — DATABASE SCHEMA | 1477 | restock_requests | unverified | |
| R-315 | CAND | # PART 42 — DATABASE SCHEMA | 1478 | financial_accounts | unverified | |
| R-316 | CAND | # PART 42 — DATABASE SCHEMA | 1479 | financial_transactions | unverified | |
| R-317 | CAND | # PART 42 — DATABASE SCHEMA | 1480 | journal_entries | unverified | |
| R-318 | CAND | # PART 42 — DATABASE SCHEMA | 1481 | journal_entry_lines | unverified | |
| R-319 | CAND | # PART 42 — DATABASE SCHEMA | 1482 | commission_records | unverified | |
| R-320 | CAND | # PART 42 — DATABASE SCHEMA | 1483 | commission_payments | unverified | |
| R-321 | CAND | # PART 42 — DATABASE SCHEMA | 1484 | agent_cash_collections | unverified | |
| R-322 | CAND | # PART 42 — DATABASE SCHEMA | 1485 | agent_remittances | unverified | |
| R-323 | CAND | # PART 42 — DATABASE SCHEMA | 1486 | expenses | unverified | |
| R-324 | CAND | # PART 42 — DATABASE SCHEMA | 1487 | shipments | unverified | |
| R-325 | CAND | # PART 42 — DATABASE SCHEMA | 1488 | notifications | unverified | |
| R-326 | CAND | # PART 42 — DATABASE SCHEMA | 1489 | qr_codes | unverified | |
| R-327 | CAND | # PART 42 — DATABASE SCHEMA | 1490 | referrals | unverified | |
| R-328 | CAND | # PART 42 — DATABASE SCHEMA | 1491 | audit_logs | unverified | |
| R-329 | CAND | # PART 42 — DATABASE SCHEMA | 1493 | - Foreign keys | unverified | |
| R-330 | CAND | # PART 42 — DATABASE SCHEMA | 1494 | - Unique constraints | unverified | |
| R-331 | CAND | # PART 42 — DATABASE SCHEMA | 1495 | - Appropriate indexes | unverified | |
| R-332 | CAND | # PART 42 — DATABASE SCHEMA | 1496 | - Timestamps | unverified | |
| R-333 | CAND | # PART 42 — DATABASE SCHEMA | 1497 | - Status fields | unverified | |
| R-334 | CAND | # PART 42 — DATABASE SCHEMA | 1498 | - Referential integrity | unverified | |
| R-335 | CAND | # PART 42 — DATABASE SCHEMA | 1499 | - Document numbering | unverified | |
| R-336 | CAND | # PART 42 — DATABASE SCHEMA | 1500 | - Soft deletion only where appropriate | unverified | |
| R-337 | MUST | # PART 42 — DATABASE SCHEMA | 1501 | - Immutable transaction records where required | unverified | |
| R-338 | CAND | # PART 42 — DATABASE SCHEMA | 1502 | Use integer-based monetary values. | unverified | |
| R-339 | CAND | # PART 42 — DATABASE SCHEMA | 1503 | Store timestamps in UTC. | unverified | |
| R-340 | CAND | # PART 42 — DATABASE SCHEMA | 1504 | Display dates according to Persian calendar settings. | unverified | |
| R-341 | MUST | # PART 42 — DATABASE SCHEMA | 1505 | Use database transactions for all important inventory and financial workflows. | unverified | |
| R-342 | CAND | # PART 42 — DATABASE SCHEMA | 1506 | Use idempotency keys for payment processing, commission generation, and critical submissions. | unverified | |
| R-343 | MUST-NOT | # PART 42 — DATABASE SCHEMA | 1507 | Do not make financial balances manually editable. | unverified | |
| R-344 | CAND | # PART 42 — DATABASE SCHEMA | 1508 | Use transaction ledgers as the source of truth. | unverified | |
| R-345 | CAND | # PART 43 — DATA SECURITY | 1511 | Implement: | unverified | |
| R-346 | CAND | # PART 43 — DATA SECURITY | 1512 | - Secure authentication | unverified | |
| R-347 | CAND | # PART 43 — DATA SECURITY | 1513 | - Server-side authorization | unverified | |
| R-348 | CAND | # PART 43 — DATA SECURITY | 1514 | - Role-based data scoping | unverified | |
| R-349 | CAND | # PART 43 — DATA SECURITY | 1515 | - Protected financial actions | unverified | |
| R-350 | CAND | # PART 43 — DATA SECURITY | 1516 | - Secure file uploads | unverified | |
| R-351 | CAND | # PART 43 — DATA SECURITY | 1517 | - Private document storage | unverified | |
| R-352 | CAND | # PART 43 — DATA SECURITY | 1518 | - MIME type validation | unverified | |
| R-353 | CAND | # PART 43 — DATA SECURITY | 1519 | - File size limits | unverified | |
| R-354 | CAND | # PART 43 — DATA SECURITY | 1520 | - Malware scanning interface where available | unverified | |
| R-355 | CAND | # PART 43 — DATA SECURITY | 1521 | - Rate limiting | unverified | |
| R-356 | CAND | # PART 43 — DATA SECURITY | 1522 | - CSRF protection where applicable | unverified | |
| R-357 | CAND | # PART 43 — DATA SECURITY | 1523 | - SQL injection protection through safe ORM usage | unverified | |
| R-358 | CAND | # PART 43 — DATA SECURITY | 1524 | - Audit logging | unverified | |
| R-359 | CAND | # PART 43 — DATA SECURITY | 1525 | - Safe secret handling | unverified | |
| R-360 | MUST-NOT | # PART 43 — DATA SECURITY | 1526 | Agents must not access another agent's private financial records. | unverified | |
| R-361 | MUST-NOT | # PART 43 — DATA SECURITY | 1527 | Retailers must not access another retailer's records. | unverified | |
| R-362 | MUST-NOT | # PART 43 — DATA SECURITY | 1528 | Customers must not access another customer's orders. | unverified | |
| R-363 | MUST-NOT | # PART 43 — DATA SECURITY | 1529 | Do not rely solely on hiding frontend buttons. | unverified | |
| R-364 | MUST | # PART 43 — DATA SECURITY | 1530 | All sensitive operations must be protected server-side. | unverified | |
| R-365 | MUST-NOT | # PART 43 — DATA SECURITY | 1531 | Do not log passwords, payment secrets, or private document contents. | unverified | |
| R-366 | MUST | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1534 | Visual quality is a major requirement. | unverified | |
| R-367 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1535 | Create a premium commercial SaaS application. | unverified | |
| R-368 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1536 | Brand direction: | unverified | |
| R-369 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1537 | - Premium Iranian agricultural product | unverified | |
| R-370 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1538 | - Natural date-palm green | unverified | |
| R-371 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1539 | - Rich dark brown | unverified | |
| R-372 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1540 | - Warm cream | unverified | |
| R-373 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1541 | - Subtle gold | unverified | |
| R-374 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1542 | - Clean white surfaces | unverified | |
| R-375 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1543 | - Carefully controlled shadows | unverified | |
| R-376 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1544 | - Elegant typography | unverified | |
| R-377 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1545 | - Refined icons | unverified | |
| R-378 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1546 | Typography: | unverified | |
| R-379 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1547 | Use Vazirmatn or an equivalent suitable Persian font. | unverified | |
| R-380 | MUST | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1548 | All internal dashboards must have a coherent design system. | unverified | |
| R-381 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1550 | - Sidebar navigation | unverified | |
| R-382 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1551 | - Responsive top bar | unverified | |
| R-383 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1552 | - Breadcrumbs | unverified | |
| R-384 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1553 | - Clear page titles | unverified | |
| R-385 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1554 | - KPI cards | unverified | |
| R-386 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1555 | - Well-designed tables | unverified | |
| R-387 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1556 | - Charts | unverified | |
| R-388 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1557 | - Empty states | unverified | |
| R-389 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1558 | - Loading skeletons | unverified | |
| R-390 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1559 | - Toast notifications | unverified | |
| R-391 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1560 | - Confirmation dialogs | unverified | |
| R-392 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1561 | - Accessible form controls | unverified | |
| R-393 | MUST-NOT | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1562 | Do not overcrowd the interface. | unverified | |
| R-394 | MUST | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1563 | Different roles must have different navigation menus. | unverified | |
| R-395 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1564 | Administrator: | unverified | |
| R-396 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1565 | Information-rich desktop dashboard. | unverified | |
| R-397 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1567 | Mobile-first operational dashboard. | unverified | |
| R-398 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1568 | Retailer: | unverified | |
| R-399 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1569 | Simple ordering and settlement interface. | unverified | |
| R-400 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1570 | Consumer: | unverified | |
| R-401 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1571 | Premium e-commerce design. | unverified | |
| R-402 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1572 | Avoid excessive animation. | unverified | |
| R-403 | CAND | # PART 44 — VISUAL DESIGN REQUIREMENTS | 1573 | Prioritize readability, speed, and ease of use. | unverified | |
| R-404 | MUST | | TOTAL | 200 | | 1625 | Direct B2C orders must total 20 packages. | unverified | |
| R-405 | MUST | | TOTAL | 200 | | 1629 | All demonstration data must be mathematically and operationally consistent. | unverified | |
| R-406 | MUST-NOT | | TOTAL | 200 | | 1630 | Do not create impossible stock quantities. | unverified | |
| R-407 | MUST-NOT | | TOTAL | 200 | | 1631 | Do not generate genuine-looking signatures of real people. | unverified | |
| R-408 | MUST | | TOTAL | 200 | | 1634 | The real application must require actual document uploads for real verified transfers. | unverified | |
| R-409 | MUST-NOT | | TOTAL | 200 | | 1636 | Never use demo credentials in production. | unverified | |
| R-410 | MUST-NOT | # PART 46 — REQUIRED ACCEPTANCE TESTS | 1639 | Do not mark the project complete until the following scenarios work. | unverified | |
| R-411 | MUST-NOT | # PART 47 — DEVELOPMENT WORKFLOW | 1724 | Do not stop after creating the architecture or initial UI. | unverified | |
| R-412 | MUST-NOT | PHASE 10: | 1753 | Do not create decorative pages while leaving the actual workflows unimplemented. | unverified | |
| R-413 | MUST-NOT | 27. Known limitations documentation. | 1784 | Do not state that deployment, banking, payment gateway, SMS, or other external integrations are complete unless they have actually been configured and tested. | unverified | |
| R-414 | MUST | 6. Define the implementation sequence. | 1820 | The final result must be a coherent and genuinely working business management platform. | unverified | |

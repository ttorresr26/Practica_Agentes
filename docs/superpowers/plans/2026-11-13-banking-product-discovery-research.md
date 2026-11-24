# Banking Product Discovery Secondary Research Plan

**Goal:** Synthesize reliable external evidence across five topics to support the Product Discovery opportunity for BP, without claiming local validation or defining product functionality.

**Approach:** Review academic studies, field experiments, banking research and transparent professional guidance on (1) PO/PM discovery challenges, (2) customer- and data-oriented culture barriers, (3) GenAI/agents in research, analysis and product management, (4) measured time/productivity changes in comparable tasks, and (5) Product Discovery practices. Prioritize banks near 7,000 employees when publicly verifiable; label cross-sector evidence and limits.

**Research materials:** Public academic papers, financial-sector and banking reports, public bank case studies, and methodologically transparent practitioner research. No interviews, internal BP materials, product code, or feature design.

**Spec:** [docs/superpowers/specs/2026-11-13-secondary-discovery-research-design.md](../specs/2026-11-13-secondary-discovery-research-design.md)

## Current Status

Expanded secondary review completed as a bounded evidence synthesis. It covers the five requested topics and records methods, results, and limitations for each included source. It is not an exhaustive systematic review; the [expanded synthesis](../research/2026-11-13-external-product-discovery-research.md) is authoritative. The earlier [preliminary synthesis](../research/2026-11-13-banking-discovery-evidence-review.md) and [evidence matrix](../research/2026-11-13-banking-discovery-evidence-matrix.csv) document the first exploratory pass. No external source in the reviewed set verifies the four-hour target or validates the internal BP context.

## Global Constraints

- Target Product Owners with little or no systematic Product Discovery practice and operational responsibilities.
- Prioritize banks at a scale near 7,000 employees; Banco Pichincha is the user's comparator reference.
- Record geography, organization size, sample, method, publication date, limitations, and source type for each item.
- Treat profitability and customer usability as desired outcomes; do not infer causation without suitable evidence.
- Treat the user's description of BP as internal context, not as a claim made by external sources.
- Do not claim that four hours can be saved based on external evidence alone.
- Label each claim as published evidence, inference, or design assumption.
- Do not select features or agents in this research phase.

## Review Focus

- Employee counts vary by year and may mean employees or full-time equivalents: record measure, year, and source in Task 1 and flag uncertain comparator matches.
- Vendor or bank marketing can overstate impact: label promotional sources and do not use unsupported claims as primary evidence in Task 2.
- Similar headcount does not establish similar operating context: record banking segment and geography and assess transferability in Tasks 2 and 4.
- Reported efficiency is not necessarily a measured four-hour saving: distinguish measured time, estimated time, and unquantified claims in Task 3.
- Profitability or usability association is not proof of discovery-caused impact: label causal strength in Task 4.

---

### Task 1: Establish the search and comparator protocol

**Files:**
- Create: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-matrix.csv`

**Interfaces:**
- Produces: a search log and source register with fields for source ID, title, URL/DOI, publication year, source type, geography, bank, employee measure/year, banking segment, method, inclusion status, and exclusion reason.

- [x] **Step 1: Create the evidence matrix with the agreed fields.**
- [x] **Step 2: Set the comparator rule to banks reporting approximately 5,000-10,000 employees; use Banco Pichincha as the anchor and record the year and definition of each employee count.** This is a working range around the user's approximate 7,000-person target, not a claim that all matches are equivalent.
- [x] **Step 3: Define source eligibility:** prioritize empirical academic work, public banking-sector studies, public bank cases, and practitioner research that discloses method and context. Prioritize evidence published from 2016 through 2026; retain older foundational sources only when needed to interpret later findings and label them as foundational. Keep promotional sources labeled and exclude unsupported marketing claims from primary evidence.
- [x] **Step 4: Record search queries and screening decisions in the matrix.** Search Spanish and English terms covering PO/product management workload, customer research, data-to-opportunity practices, Product Discovery, AI-assisted research, usability, profitability, and time savings in banking.
- [x] **Step 5: Check the protocol against the spec.** Confirm it excludes interviews/internal sources, includes the three hypotheses, and records comparator geography and size.

### Task 2: Find and screen public sources

**Files:**
- Modify: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-matrix.csv`

**Interfaces:**
- Consumes: the eligibility and comparator rules from Task 1.
- Produces: a screened, cited source set with inclusion/exclusion reasons and context fields completed where available.

- [ ] **Step 1: Search academic indexes, banking/financial industry publications, public bank reports and case studies, and transparent practitioner research using the logged bilingual queries.**
- [ ] **Step 2: Verify comparator scale from public reports or filings when available; label unverified or out-of-range banks as non-comparator context rather than close matches.**
- [ ] **Step 3: Screen each source for relevance to at least one hypothesis or to discovery outcomes, method transparency, recency, and banking applicability.**
- [x] **Step 4: Record every included source and material exclusion in the matrix, with a brief reason.**
- [ ] **Step 5: Confirm that all three hypotheses and each evidence category (PO workload, customer perspective, data use, discovery practice, AI, usability, profitability, time) have a documented search result, including explicit gaps where none is found.**

### Task 3: Extract evidence and classify time claims

**Files:**
- Modify: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-matrix.csv`

**Interfaces:**
- Consumes: the screened source set from Task 2.
- Produces: one or more traceable evidence entries per source, linked to the relevant hypothesis and exact source location.

- [ ] **Step 1: Extract each relevant finding with page/section or other locator, population, method, context, and limitation.**
- [ ] **Step 2: Tag each finding as direct evidence, indirect evidence, or author recommendation; distinguish empirical findings from opinion.**
- [ ] **Step 3: For time or efficiency results, record whether the source measured hours, estimated effort, reported a percentage, or made an unquantified claim. Do not convert unlike measures into hours.**
- [ ] **Step 4: Map each entry to one or more hypotheses: customer perspective, data analysis, or time/structured practice; add related manual or repetitive activities only when the source describes them.**
- [ ] **Step 5: Audit a sample of matrix entries against the cited source to confirm that wording and classification do not overstate the finding.**

### Task 4: Assess quality outcomes and transferability

**Files:**
- Modify: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-matrix.csv`

**Interfaces:**
- Consumes: extracted findings and context from Task 3.
- Produces: evidence-strength and transferability judgments with a short rationale for each relevant finding.

- [ ] **Step 1: For usability and profitability claims, record the outcome measure and classify the relationship as causal, associative, proxy-based, or unclear, based on the source's method.**
- [ ] **Step 2: Assess transferability to BP using banking segment, geography, organizational scale, PO role model, and study population; explain material mismatches.**
- [ ] **Step 3: Rate evidence strength as strong, moderate, or limited using method quality, consistency across independent sources, and directness to the hypothesis; record the rationale rather than relying on a composite numeric score.**
- [ ] **Step 4: Review time-saving evidence separately from quality evidence. Mark whether any source demonstrates both reduced time and maintained or improved usability/profitability outcomes.**
- [ ] **Step 5: Verify that missing or contradictory evidence remains visible and is not treated as evidence of absence.**

### Task 5: Synthesize candidate opportunities and limits

**Files:**
- Create: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-review.md`
- Modify: `docs/superpowers/research/2026-11-13-banking-discovery-evidence-matrix.csv`

**Interfaces:**
- Consumes: the evidence matrix and assessments from Tasks 1-4.
- Produces: a cited synthesis, provisional hypothesis prioritization, explicit limitations, and questions for later direct validation with BP Product Owners.

- [ ] **Step 1: Summarize evidence for each hypothesis, its reported causes and consequences, relevant manual activities, and source limitations.**
- [ ] **Step 2: Prioritize candidate hypotheses qualitatively using evidence strength and consistency, reported frequency/severity, reducible manual effort, quality implications, and transferability to BP; explain the trade-offs and do not label the result a BP-validated winner.**
- [ ] **Step 3: State whether published sources directly measure four-hour savings and preserved quality. If not, say that the threshold remains unverified and specify what would require local baseline and follow-up measurement.**
- [ ] **Step 4: List unresolved evidence gaps and focused questions for future PO validation, without proposing features or agents.**
- [ ] **Step 5: Check every material conclusion against its matrix citations and confirm the synthesis distinguishes source findings, researcher interpretation, and unknowns.**

## Self-Review

- Spec coverage: the plan covers the three hypotheses, the banking comparator context, AI as a topic of evidence (not a predetermined solution), manual effort, usability, profitability, and the four-hour objective with its validation limit.
- Scope: no software implementation, interviews, internal artifacts, feature selection, or local validation is included.
- Evidence integrity: source quality, methodological limitations, comparability, causal strength, time measurement, and contradictory findings are explicitly recorded.
- Deliverables: one evidence matrix and one synthesis report; no extra implementation artifacts are required.
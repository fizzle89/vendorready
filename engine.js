/* VendorReady engine: questionnaire schema, risk scoring, document templates.
   Everything runs client-side. No answers leave the browser. */
(function (global) {
  "use strict";

  var SECTIONS = [
    {
      id: "company", title: "Your company", sub: "Basics that appear on every document.",
      questions: [
        { id: "company_name", label: "Company name", type: "text", required: true, placeholder: "Acme Analytics, Inc." },
        { id: "website", label: "Website", type: "url", placeholder: "https://example.com" },
        { id: "industry", label: "Industry", type: "select", required: true, options: ["B2B SaaS", "Fintech", "Healthcare / healthtech", "E-commerce / retail", "HR / recruiting tech", "Legal / compliance tech", "Education tech", "Other software"] },
        { id: "customer_regions", label: "Where are your customers?", type: "multi", required: true,
          options: ["United States", "EU / EEA", "United Kingdom", "Canada", "Africa", "Asia-Pacific", "Latin America", "Other"],
          help: "Regions decide which AI and privacy rules your buyers will ask about." },
        { id: "ai_role", label: "How do you use AI?", type: "radio", required: true, options: [
          { value: "deployer", label: "We build features on third-party AI APIs or hosted models" },
          { value: "provider", label: "We train or fine-tune our own models" },
          { value: "both", label: "Both of the above" }
        ] }
      ]
    },
    {
      id: "systems", title: "AI systems", sub: "What you run today, in production or staging.",
      questions: [
        { id: "ai_providers", label: "Which AI providers or platforms do you use?", type: "multi", required: true,
          options: ["OpenAI", "Anthropic", "Google (Gemini / Vertex AI)", "Microsoft Azure OpenAI", "AWS Bedrock", "Meta Llama (self-hosted)", "Mistral", "Cohere", "Stability AI", "Other"] },
        { id: "models_used", label: "Which models, if you know them?", type: "text", placeholder: "e.g. GPT-4o, Claude Sonnet, Llama 3.1 70B" },
        { id: "use_cases", label: "What do your AI features do?", type: "multi", required: true,
          options: ["Customer support chat", "Content or copy generation", "Code generation", "Search / question answering over documents", "Recommendations or ranking", "Summaries and data extraction", "Decisions or scoring about people", "Image, audio, or video generation", "Other"] },
        { id: "customer_facing", label: "Does AI output reach your customers directly?", type: "radio", required: true, options: [
          { value: "yes", label: "Yes, customers see AI output" },
          { value: "reviewed", label: "Only after a person reviews it" },
          { value: "internal", label: "No, internal use only" }
        ] },
        { id: "decisions_about_people", label: "Does AI make or influence decisions about people?", type: "radio", required: true,
          help: "Hiring, credit, pricing for individuals, eligibility, moderation bans.",
          options: [
            { value: "no", label: "No" },
            { value: "assist", label: "Yes, but a human makes the final call" },
            { value: "automated", label: "Yes, fully or mostly automated" }
          ] }
      ]
    },
    {
      id: "data", title: "Data", sub: "What your AI features touch.",
      questions: [
        { id: "data_types", label: "What data do your AI features process?", type: "multi", required: true,
          options: ["Basic identifiers (names, emails)", "Usage and product data", "Customer content and files", "Payment data", "Financial records", "Health information", "Biometric data", "Children's data", "No personal data"] },
        { id: "training_use", label: "Is customer data used to train or fine-tune models?", type: "radio", required: true, options: [
          { value: "no", label: "No, and our provider agreements say so" },
          { value: "provider-default", label: "We rely on provider defaults and have not checked" },
          { value: "finetune", label: "Yes, we fine-tune or train on customer data" }
        ] },
        { id: "retention", label: "How long do you keep prompts and AI outputs?", type: "select", required: true,
          options: ["Under 30 days", "30 to 90 days", "90 days to 1 year", "Over 1 year", "We have not set a limit"] },
        { id: "dpas_in_place", label: "Do you have signed DPAs with your AI providers?", type: "radio", required: true, options: [
          { value: "all", label: "Yes, with all of them" },
          { value: "some", label: "With some of them" },
          { value: "no", label: "No" },
          { value: "unsure", label: "Not sure" }
        ] }
      ]
    },
    {
      id: "security", title: "Security and oversight", sub: "The controls procurement teams ask about first.",
      questions: [
        { id: "security_controls", label: "Which controls are in place today?", type: "multi", required: true,
          options: ["SSO or MFA for internal tools", "Encryption in transit (TLS)", "Encryption at rest", "Logging and monitoring of AI calls", "Regular access reviews", "Documented incident response plan", "None of these yet"] },
        { id: "human_review", label: "How much human review do AI outputs get?", type: "radio", required: true, options: [
          { value: "all", label: "A person reviews everything before it matters" },
          { value: "high-stakes", label: "High-stakes outputs only" },
          { value: "sampled", label: "We sample and spot-check" },
          { value: "none", label: "No systematic review" }
        ] },
        { id: "evals", label: "Do you test AI quality and failure modes?", type: "radio", required: true, options: [
          { value: "regular", label: "Yes, on a regular schedule" },
          { value: "launch", label: "Yes, before each launch or model change" },
          { value: "adhoc", label: "Ad hoc, when something looks wrong" },
          { value: "none", label: "Not yet" }
        ] },
        { id: "incident_owner", label: "Who owns AI incidents? (name or role)", type: "text", placeholder: "e.g. CTO, Head of Engineering" }
      ]
    },
    {
      id: "governance", title: "Governance", sub: "Policies and risk context.",
      questions: [
        { id: "existing_policies", label: "Which written policies do you already have?", type: "multi", required: true,
          options: ["Privacy policy", "Information security policy", "Employee AI usage policy", "Data retention policy", "None of these yet"] },
        { id: "high_risk_domain", label: "Does your product touch a regulated or high-risk domain?", type: "radio", required: true,
          help: "Employment screening, credit or lending, healthcare decisions, education admissions, insurance, critical infrastructure.",
          options: [
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
            { value: "unsure", label: "Not sure" }
          ] },
        { id: "gov_contact", label: "Who should be named as the AI governance contact?", type: "text", placeholder: "e.g. Jane Doe, COO, jane@acme.com" }
      ]
    }
  ];

  /* ---------- Risk scoring (transparent rules, listed in the report) ---------- */
  function computeRisk(a) {
    var drivers = [];
    function add(points, label, fix) { drivers.push({ points: points, label: label, fix: fix }); }

    if (a.decisions_about_people === "automated") add(30, "AI makes automated decisions about people", "Add a documented human review step for consequential decisions, or narrow the feature so AI only drafts and a person decides.");
    else if (a.decisions_about_people === "assist") add(12, "AI influences decisions about people", "Write down where human judgment sits in the loop and keep a record of overrides.");

    if (a.high_risk_domain === "yes") add(25, "Product operates in a regulated or high-risk domain", "Map the feature against the EU AI Act high-risk categories (Annex III) and state ADMT laws, and prepare an impact assessment before enterprise review asks for it.");
    else if (a.high_risk_domain === "unsure") add(10, "High-risk status not assessed", "Run the classification checklist in the vendor risk assessment and record the conclusion, even if the answer is no.");

    var dt = a.data_types || [];
    var sens = dt.filter(function (d) { return ["Health information", "Biometric data", "Children's data"].indexOf(d) >= 0; });
    if (sens.length) add(8 + sens.length * 7, "AI features process sensitive data: " + sens.join(", "), "Minimize what is sent to models, document a lawful basis, and expect deeper procurement review. Consider masking or redaction before the API call.");
    if (dt.indexOf("Payment data") >= 0 || dt.indexOf("Financial records") >= 0) add(8, "AI features process payment or financial data", "Confirm your AI providers' DPAs cover this data category and that retention matches your financial-records obligations.");

    if (a.training_use === "finetune") add(8, "Customer data is used for training or fine-tuning", "Put explicit contractual permission in place and offer an opt-out; buyers will ask.");
    else if (a.training_use === "provider-default") add(6, "Provider training defaults not checked", "Check each provider's data-usage terms this week and switch off training use where it is optional.");

    if (a.human_review === "none") add(12, "No systematic human review of AI outputs", "Start with sampled review of customer-facing outputs and define an escalation path for bad outputs.");
    else if (a.human_review === "high-stakes") add(6, "Only high-stakes outputs get human review", "Write down what counts as high-stakes so the rule survives team changes.");

    if (a.evals === "none") add(10, "No AI quality testing", "Build a small eval set from real tickets or tasks and run it before every model change.");
    else if (a.evals === "adhoc") add(5, "AI testing is ad hoc", "Put eval runs on a calendar or trigger them from model-version changes.");

    var sc = a.security_controls || [];
    if (sc.indexOf("None of these yet") >= 0) add(15, "No baseline security controls", "Turn on MFA, TLS, and logging this week; these are table stakes in any security review.");
    else {
      if (sc.indexOf("Documented incident response plan") < 0) add(8, "No documented incident response plan", "Draft a one-page AI incident runbook: who gets paged, how customers are told, how the feature is disabled.");
      if (sc.indexOf("Encryption at rest") < 0) add(5, "Encryption at rest not confirmed", "Confirm at-rest encryption with your database and storage vendors and record it.");
      if (sc.indexOf("Logging and monitoring of AI calls") < 0) add(5, "AI calls are not logged", "Log prompts, model versions, and outputs (with retention limits) so incidents can be investigated.");
    }

    if (a.dpas_in_place === "no") add(10, "No signed DPAs with AI providers", "Sign each provider's standard DPA; for OpenAI, Anthropic, Google, and Microsoft this is self-serve.");
    else if (a.dpas_in_place === "unsure") add(6, "DPA coverage unknown", "Inventory each AI provider and confirm a DPA is executed and filed.");
    else if (a.dpas_in_place === "some") add(4, "Only some AI providers under DPA", "Close the gaps; one uncovered provider is what procurement will find.");

    if (a.retention === "We have not set a limit") add(8, "No retention limit for prompts and outputs", "Set a retention window, automate deletion, and write it into your policy.");
    else if (a.retention === "Over 1 year") add(4, "Prompts and outputs kept over a year", "Check the business need for long retention against minimization expectations.");

    var regions = a.customer_regions || [];
    if (regions.indexOf("EU / EEA") >= 0) add(5, "EU customers bring EU AI Act and GDPR exposure", "Track the AI Act dates: transparency duties applied from August 2026, high-risk obligations land from December 2027.");

    var score = drivers.reduce(function (s, d) { return s + d.points; }, 0);
    var rating = score >= 75 ? "High" : score >= 50 ? "Elevated" : score >= 25 ? "Moderate" : "Low";
    drivers.sort(function (x, y) { return y.points - x.points; });
    return { score: score, rating: rating, drivers: drivers };
  }

  /* ---------- Small helpers ---------- */
  function listText(v) { return Array.isArray(v) && v.length ? v.join(", ") : "Not specified"; }
  function val(v) { return (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) ? "[To be completed]" : v; }
  function todayISO() { var d = new Date(); return d.toISOString().slice(0, 10); }
  function radioLabel(q, v) {
    var sec = SECTIONS.reduce(function (acc, s) { return acc.concat(s.questions); }, []);
    for (var i = 0; i < sec.length; i++) {
      if (sec[i].id === q && sec[i].options) {
        for (var j = 0; j < sec[i].options.length; j++) {
          var o = sec[i].options[j];
          if (typeof o === "object" && o.value === v) return o.label;
          if (o === v) return o;
        }
      }
    }
    return v;
  }

  var DISCLAIMER = "\n\n---\n\n*Generated with VendorReady templates on " + todayISO() + ". These documents are starting points for your legal counsel and procurement reviewers, not legal advice. Have a qualified attorney review them before you sign or send anything.*";

  /* ---------- Document generators (Markdown) ---------- */
  function docPolicy(a, risk) {
    var c = val(a.company_name);
    return "# AI Governance Policy\n\n" +
      "**" + c + "** - effective " + todayISO() + "\n\n" +
      "- **Owner:** " + val(a.gov_contact) + "\n- **Applies to:** all employees, contractors, and systems that build, buy, or operate AI features on behalf of " + c + ".\n\n" +
      "## 1. Purpose\n\n" +
      c + " uses artificial intelligence to deliver " + (a.industry || "software") + " products. This policy sets the rules for how we select AI providers, handle data in AI systems, oversee AI outputs, and respond when something goes wrong. It exists so that customers, auditors, and our own team can see that AI here is used deliberately, not casually.\n\n" +
      "## 2. Scope\n\n" +
      "This policy covers every AI system we operate, including third-party APIs and hosted models (" + listText(a.ai_providers) + ")" +
      (a.models_used ? " and the specific models we run (" + a.models_used + ")" : "") +
      ". Our current use cases: " + listText(a.use_cases) + ".\n\n" +
      "## 3. Roles and accountability\n\n" +
      "- **AI governance contact:** " + val(a.gov_contact) + ". Owns this policy, vendor reviews, and the AI system inventory.\n" +
      "- **Incident owner:** " + val(a.incident_owner) + ". First call when an AI system misbehaves.\n" +
      "- **All staff:** must use approved AI tools only and route new AI use cases through the governance contact before launch.\n\n" +
      "## 4. Approved providers and procurement\n\n" +
      "AI providers are approved before use. Approval requires a signed data processing agreement, a review of the provider's security documentation, and confirmation of how the provider uses customer data for training. Current providers: " + listText(a.ai_providers) + ". New providers enter through the same review, no exceptions for experiments that touch production data.\n\n" +
      "## 5. Data handling\n\n" +
      "AI features process the following categories of data: " + listText(a.data_types) + ". " +
      (a.training_use === "finetune" ? "Customer data may be used to fine-tune models only where the customer agreement permits it. " : "Customer data is not used to train third-party models. ") +
      "Prompts and outputs are retained for: " + val(a.retention) + ". Sensitive data is minimized before it reaches a model wherever practical.\n\n" +
      "## 6. Human oversight\n\n" +
      "Human review standard: " + radioLabel("human_review", a.human_review) + ". " +
      ({ all: "A person reviews every output before it takes effect.",
         "high-stakes": "High-stakes outputs are reviewed by a person; routine outputs may ship without individual review.",
         sampled: "Outputs are sampled and spot-checked; consequential outputs are escalated for human review.",
         none: "Outputs are not systematically reviewed today; introducing a review standard is an open action in the accompanying risk assessment." }[a.human_review] || "Review standard to be documented.") +
      (a.decisions_about_people === "automated"
        ? " Where AI influences decisions about people, " + c + " maintains a documented human review path and honors requests for human reconsideration."
        : "") + "\n\n" +
      "## 7. Quality assurance\n\n" +
      "AI quality testing cadence: " + radioLabel("evals", a.evals) + ". Model or prompt changes are tested against a fixed set of representative cases before release, and regressions are rolled back.\n\n" +
      "## 8. Incident response\n\n" +
      "AI incidents (harmful output, data leakage through a model, unexpected behavior in production) are reported to " + val(a.incident_owner) + ". The response runbook covers: disabling the affected feature, assessing customer impact, notifying affected customers where required, and recording the root cause and fix.\n\n" +
      "## 9. Regulatory awareness\n\n" +
      c + " monitors AI regulation in the regions where its customers operate, including the EU AI Act (transparency obligations applicable from August 2026; high-risk obligations phasing in from December 2027) and US state laws such as Colorado's ADMT Act (effective January 1, 2027). " +
      (a.high_risk_domain === "yes" ? "Because our product touches a regulated domain, we maintain an up-to-date classification of each AI feature against the EU AI Act high-risk categories." : "Our current features are assessed as outside the EU AI Act high-risk categories; we re-run this assessment when use cases change.") + "\n\n" +
      "## 10. Review\n\n" +
      "This policy is reviewed at least annually, and after any material change in AI providers, models, or use cases. The governance contact owns the review." + DISCLAIMER;
  }

  function docModelCard(a) {
    var c = val(a.company_name);
    var exposure = [];
    var dt = a.data_types || [];
    if (dt.indexOf("Health information") >= 0) exposure.push("health information may appear in prompts; outputs must never be treated as medical advice");
    if (dt.indexOf("Children's data") >= 0) exposure.push("children's data requires strict minimization and may be out of scope for some providers");
    if (a.decisions_about_people !== "no") exposure.push("outputs that influence decisions about people require human confirmation");
    if (!exposure.length) exposure.push("no special-category constraints identified from the questionnaire; revisit when use cases change");
    return "# Model Card: " + c + " AI Features\n\n" +
      "Prepared " + todayISO() + " by " + c + ".\n\n" +
      "## System overview\n\n" +
      "| Field | Detail |\n|---|---|\n" +
      "| Owner | " + c + " |\n" +
      "| AI role | " + radioLabel("ai_role", a.ai_role) + " |\n" +
      "| Providers / platforms | " + listText(a.ai_providers) + " |\n" +
      "| Models | " + val(a.models_used) + " |\n" +
      "| Primary use cases | " + listText(a.use_cases) + " |\n" +
      "| Output exposure | " + radioLabel("customer_facing", a.customer_facing) + " |\n\n" +
      "## Intended use\n\n" +
      "These AI features exist to support " + (a.industry || "software") + " workflows: " + listText(a.use_cases) + ". They are intended for use within " + c + "'s product, under the oversight standard described below. They are not intended for fully autonomous consequential decisions about individuals, safety-critical control, or any use prohibited by the underlying model providers' usage policies.\n\n" +
      "## Training and input data\n\n" +
      "Categories of data processed: " + listText(a.data_types) + ". " +
      (a.training_use === "finetune"
        ? "Customer data is used for fine-tuning where contractually permitted; base-model training by providers is governed by their respective data-usage terms."
        : "Customer data is not used to train or fine-tune models" + (a.training_use === "provider-default" ? " under the current provider defaults (verification in progress)" : "") + ".") + "\n\n" +
      "Prompts and outputs retention: " + val(a.retention) + ".\n\n" +
      "## Evaluation\n\n" +
      "Testing approach: " + radioLabel("evals", a.evals) + ". Evaluation covers task accuracy on representative cases, refusal behavior on out-of-scope requests, and regression checks before model changes.\n\n" +
      "## Human oversight\n\n" +
      radioLabel("human_review", a.human_review) + ". Escalation path: " + val(a.incident_owner) + ".\n\n" +
      "## Known limitations and risks\n\n" +
      exposure.map(function (e) { return "- " + e; }).join("\n") + "\n\n" +
      "- Outputs can be wrong or fabricated; users are told to verify important output.\n" +
      "- Model behavior can shift when providers update models; pinned versions are preferred where available.\n\n" +
      "## Change log\n\n" +
      "| Date | Change |\n|---|---|\n| " + todayISO() + " | Initial card generated from company questionnaire |" + DISCLAIMER;
  }

  function docDPA(a) {
    var c = val(a.company_name);
    return "# Data Processing Addendum (AI Features)\n\n" +
      "Between **" + c + "** (\"Processor\") and the customer identified in the underlying service agreement (\"Controller\"). Effective " + todayISO() + ". Bracketed items need legal review before signature.\n\n" +
      "## 1. Subject matter and duration\n\n" +
      "This Addendum governs the processing of personal data by " + c + "'s AI-powered features for the term of the service agreement.\n\n" +
      "## 2. Nature and purpose of processing\n\n" +
      "Processor operates AI features that perform: " + listText(a.use_cases) + ". Processing is limited to what the features require. No personal data is used to train or improve models" + (a.training_use === "finetune" ? ", except where the Controller has expressly opted in to fine-tuning" : "") + ".\n\n" +
      "## 3. Categories of data and data subjects\n\n" +
      "Categories of personal data: " + listText(a.data_types) + ". Data subjects: Controller's customers, end users, and personnel, as applicable.\n\n" +
      "## 4. Sub-processors (AI providers)\n\n" +
      "Controller authorizes the following AI sub-processors: " + listText(a.ai_providers) + ". Processor will give [30] days' notice of new AI sub-processors, and Controller may object on reasonable data-protection grounds. Processor remains liable for its sub-processors. Executed DPAs with AI providers: " + radioLabel("dpas_in_place", a.dpas_in_place) + ".\n\n" +
      "## 5. Security measures\n\n" +
      (function () { var m = (a.security_controls || []).filter(function (x) { return x !== "None of these yet"; }); return "Processor maintains at minimum: " + (m.length ? m.join(", ") : "[describe the security measures actually implemented before signing]") + ". [Confirm each measure is actually implemented before signing.]\n\n"; })() +
      "## 6. Retention and deletion\n\n" +
      "Prompts and AI outputs are retained for: " + val(a.retention) + ", then deleted or anonymized. On termination, personal data is returned or deleted within [30] days at Controller's choice, subject to legal holds.\n\n" +
      "## 7. International transfers\n\n" +
      "Where personal data is transferred outside its home region (including to AI sub-processors), Processor relies on [standard contractual clauses / the applicable transfer mechanism - confirm with counsel]. Regions served: " + listText(a.customer_regions) + ".\n\n" +
      "## 8. Breach notification\n\n" +
      "Processor notifies Controller without undue delay, and in any case within [72] hours, after becoming aware of a personal data breach affecting Controller data, with reasonable detail to meet Controller's own notification duties.\n\n" +
      "## 9. AI-specific commitments\n\n" +
      "- Human oversight standard for AI outputs: " + radioLabel("human_review", a.human_review) + ".\n" +
      "- AI features do not make solely automated decisions with legal or similarly significant effect on individuals" + (a.decisions_about_people === "automated" ? " except where disclosed in the service agreement and subject to human review on request" : "") + ".\n" +
      "- Processor will reasonably assist with Controller's data protection impact assessments and procurement reviews covering the AI features.\n\n" +
      "## 10. Audits and assistance\n\n" +
      "Processor will respond to reasonable written security and AI-governance questionnaires and provide current policy documents (AI governance policy, model cards, this Addendum) on request." + DISCLAIMER;
  }

  function docVRA(a, risk) {
    var c = val(a.company_name);
    var rules = [
      "Automated decisions about people: +30 | human-assisted: +12",
      "Regulated or high-risk domain: +25 | unassessed: +10",
      "Sensitive data (health, biometric, children): +8 base, +7 per extra category",
      "Payment or financial data: +8",
      "Training on customer data: +8 | unchecked provider defaults: +6",
      "No human review of outputs: +12 | high-stakes only: +6",
      "No quality testing: +10 | ad hoc: +5",
      "No baseline security controls: +15 | no incident plan: +8 | no at-rest encryption: +5 | no AI call logging: +5",
      "DPAs: none +10 | unsure +6 | partial +4",
      "No retention limit: +8 | over 1 year: +4",
      "EU customers (AI Act / GDPR exposure): +5"
    ];
    var drivers = risk.drivers.length ? risk.drivers : [{ points: 0, label: "No material risk drivers identified from the questionnaire.", fix: "Keep controls current and re-run this assessment quarterly." }];
    return "# Vendor Risk Assessment: AI Systems\n\n" +
      "**" + c + "** - assessed " + todayISO() + " from a structured self-assessment questionnaire.\n\n" +
      "## Overall rating: " + risk.rating + " (" + risk.score + " / 100+)\n\n" +
      "Rating bands: 0-24 Low, 25-49 Moderate, 50-74 Elevated, 75+ High. The score reflects self-reported answers; it is a prioritization tool, not an audit finding.\n\n" +
      "## Risk drivers and recommended fixes\n\n" +
      "| Points | Driver | Recommended action |\n|---|---|---|\n" +
      drivers.map(function (d) { return "| " + d.points + " | " + d.label + " | " + d.fix + " |"; }).join("\n") + "\n\n" +
      "## AI vendor inventory\n\n" +
      "| Vendor | Status | DPA |\n|---|---|---|\n" +
      (a.ai_providers || []).map(function (p) {
        return "| " + p + " | In use | " + radioLabel("dpas_in_place", a.dpas_in_place) + " |";
      }).join("\n") + "\n\n" +
      "## Regulatory exposure snapshot\n\n" +
      "- Customer regions: " + listText(a.customer_regions) + ".\n" +
      "- EU AI Act: transparency obligations apply from August 2026; high-risk obligations phase in from December 2027 (Annex III) and August 2028 (Annex I). High-risk domain flagged: " + radioLabel("high_risk_domain", a.high_risk_domain) + ".\n" +
      "- Colorado ADMT Act (US): effective January 1, 2027 for consequential-decision systems.\n" +
      "- Frameworks referenced for control structure: NIST AI Risk Management Framework, ISO/IEC 42001.\n\n" +
      "## Scoring rules (for reviewer transparency)\n\n" +
      rules.map(function (r) { return "- " + r; }).join("\n") + "\n\n" +
      "## Next review\n\n" +
      "Re-run this assessment after any new AI provider, model change, new use case, or at least quarterly." + DISCLAIMER;
  }

  function generateAll(a) {
    var risk = computeRisk(a);
    return {
      risk: risk,
      docs: {
        policy: { title: "AI Governance Policy", md: docPolicy(a, risk) },
        modelcard: { title: "Model Card", md: docModelCard(a) },
        dpa: { title: "Data Processing Addendum", md: docDPA(a) },
        vra: { title: "Vendor Risk Assessment", md: docVRA(a, risk) }
      }
    };
  }

  /* ---------- Minimal Markdown -> HTML (headings, bold, lists, tables, hr, paragraphs) ---------- */
  function mdToHtml(md) {
    var lines = md.split("\n");
    var html = [];
    var inList = false, inTable = false, para = [];
    function flushPara() {
      if (para.length) { html.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    }
    function flushList() { if (inList) { html.push("</ul>"); inList = false; } }
    function flushTable() { if (inTable) { html.push("</tbody></table>"); inTable = false; } }
    function inline(t) {
      return t
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    }
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, "");
      var t = line.trim();
      if (/^\|.*\|$/.test(t)) {
        flushPara(); flushList();
        var cells = t.slice(1, -1).split("|").map(function (c) { return c.trim(); });
        var isSep = cells.every(function (c) { return /^:?-{2,}:?$/.test(c); });
        if (!inTable) { html.push("<table><tbody>"); inTable = true; }
        if (isSep) return;
        var tag = html[html.length - 1] === "<table><tbody>" ? "th" : "td";
        if (tag === "th") { html.push("<tr>" + cells.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr>"); }
        else { html.push("<tr>" + cells.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"); }
        return;
      }
      flushTable();
      if (t === "") { flushPara(); flushList(); return; }
      if (/^---+$/.test(t)) { flushPara(); flushList(); html.push("<hr>"); return; }
      var h = t.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(); flushList(); var lvl = h[1].length; html.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"); return; }
      var li = t.match(/^-\s+(.*)$/);
      if (li) { flushPara(); if (!inList) { html.push("<ul>"); inList = true; } html.push("<li>" + inline(li[1]) + "</li>"); return; }
      para.push(t.replace(/ {2}$/, ""));
    });
    flushPara(); flushList(); flushTable();
    return html.join("\n");
  }

  global.VREngine = { SECTIONS: SECTIONS, computeRisk: computeRisk, generateAll: generateAll, mdToHtml: mdToHtml };
})(window);

# VendorReady

AI governance documentation platform. A static, fully client-side web app:
landing page + sign-up gate + 20-question wizard that generates four documents
(AI Governance Policy, Model Card, DPA, Vendor Risk Assessment) with a
transparent risk-scoring engine.

## Files
- `index.html` - landing page + sign-up gate
- `app.html` - gated wizard + document generator
- `styles.css` - design system (mobile-first, editorial style)
- `engine.js` - questionnaire schema, risk rules, document templates, Markdown renderer
- `wizard.js` - wizard flow, results, exports (Markdown / HTML / print-to-PDF)
- `gate.js` - sign-up gate (localStorage; optional POST endpoint)

## Deploy
Any static host. No build step, no dependencies, no secrets.

## Signup capture
The gate stores signups in the visitor's browser. To collect leads centrally,
set `CAPTURE_ENDPOINT` in `gate.js` to a forms-backend URL (e.g. Formspree) -
the code already POSTs JSON there when configured.

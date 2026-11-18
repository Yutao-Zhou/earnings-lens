# Implementation Notes

## Status

The static report contract, financial validation, production dataset, build, browser UI, and GitHub Pages workflow are implemented at [yutaozhou.com/earnings-lens](https://yutaozhou.com/earnings-lens/). External content production supplies validated report JSON for 15 companies. The website has no runtime connection to that runner.

## Commands and files

| Command or path | Purpose |
| --- | --- |
| `npm run validate` | Validate report files and the active watchlist |
| `npm test` | Run pipeline and financial-rule tests with Node's test runner |
| `npm run build` | Write the self-contained `dist/index.html` artifact |
| `npm run preview` | Serve only the generated page on loopback port 4173 |
| `.github/workflows/pages.yml` | Validate, test, build, and deploy the generated website from this repository |
| `schema/earnings-report.schema.json` | Report JSON Schema 2020-12 contract |
| `schema/watchlist.schema.json` | Watchlist contract |
| `config/watchlist.json` | Active company configuration |
| `config/watchlist.production.example.json` | Reference NVDA/MSFT/AAPL company configuration |
| `data/reports/<company>/<period>/vN.json` | Versioned report inputs |
| `lib/validation.mjs` | Schema and cross-field checks |
| `lib/catalog.mjs` | Period, revision, and point-in-time history selection |
| `src/app.js` and `src/styles.css` | Locally bundled browser UI |

Ajv and its format plugin run only in Node during validation and builds. No npm package or remote asset is loaded by the generated website.

## Production boundary

```text
Source collection and analysis outside the website
    -> Report JSON draft
    -> Validation and deterministic calculations
    -> Frozen report JSON
    -> Fixed-template static build
    -> Self-contained HTML
```

OpenClaw performs collection and model inference before the website is built. The website itself does not collect filings, start research jobs, or invoke a model.

## Browser behavior

- Embed all display data in the HTML at build time.
- Include the CSS and JavaScript required for rendering and interaction in the output.
- Render charts with embedded SVG or bundled local code.
- Implement search, company selection, period selection, version selection, and evidence expansion locally.
- Financial JSON, analysis, display scripts, styles and charts remain embedded. The user-authorized shared anonymous analytics module is the sole optional network exception on the production domain.
- Permit explicit user navigation to original source links.
- Preserve functionality when the HTML is opened directly from disk without a network connection.

## Report data handling

- Keep schema versions separate from content revisions.
- Identify each company, reporting period, and report revision explicitly.
- Preserve actual reporting dates, currency, units, accounting basis, and source references.
- Represent unavailable values as `null` with an explanation; do not substitute zero.
- Calculate growth rates and changes from comparable inputs using deterministic code.
- Preserve evidence references for important financial metrics and factual claims.
- Keep missing or incomparable observations out of calculations and chart interpolation.

### Input and validation rules

Active report files contain real, sourced financial analysis. Fictional examples live only under `test/fixtures/demo` and are loaded explicitly by tests. Follow the formal schema when producing new input. The contract is stricter than the early planning illustration: all required metadata, missing-value fields, comparison fields, coverage states, and source titles must be present.

- Use `data_kind: "demo"` for fictional content and `"production"` for verified real reports. One artifact cannot mix the two kinds.
- Production company IDs equal their ten-digit CIKs. Report identities must agree with the watchlist. Placeholder source URLs are rejected for production reports.
- `validation_status: "passed"` is an eligibility flag, not a bypass: the build independently validates every input file before publication. Structurally valid drafts and review-needed reports are excluded from the display dataset.
- Currency units require a currency code; percentage, count, and ratio units use `null` for currency. Percent values use percentage-number units, such as `61` for 61%.
- Duration metrics match the report's start and end. Instant metrics use a null start and the report end. Convert cumulative amounts to standalone-period values before producing input, and record the derivation in `definition`.
- Non-percentage comparisons use growth against a positive baseline. Percentage metrics use `change_pp`, not `change_pct`. Unsupported comparisons have null changes and an `unavailable_reason`.
- Missing metric values require `missing_reason`. Derived metrics require `definition`.
- Every evidence reference must resolve to an excerpt, and every excerpt to a source. Source publication and collection cannot be later than the information cutoff.
- Available material coverage requires a source of the matching type. An updated revision references a retained earlier revision and cannot move the cutoff backwards.

The validator checks comparable intervals and arithmetic. It cannot independently verify a quotation's truth, accounting classification, raw cumulative-to-quarter derivation, or a CIK's ownership. Verify those against official materials before generating production JSON.

Use the [SEC issuer pages](https://www.sec.gov/edgar/search/) to verify identities. The production example identifies NVIDIA as `0001045810`, Microsoft as `0000789019`, and Apple as `0000320193`; the example is configuration only, not a completed earnings report.

### Adding data

1. Update `config/watchlist.json` with the company identity and display information.
2. Place report revisions under `data/reports/`; preserve earlier revisions and use a consistent report ID and period.
3. Run `npm run validate`, review evidence and financial definitions, and run `npm run build`.
4. Open the resulting HTML and inspect the content before transferring it to a static host.

When activating real-company configuration, replace the fictional report inputs with verified production inputs in the same change. Leaving the fictional inputs alongside a production-only watchlist intentionally fails identity validation. No command currently downloads or generates real reports.

## HTML serialization

Safely serialize embedded JSON so source text cannot terminate its script container. Escape report text when rendering HTML, and treat quotations and source material as data rather than executable markup. Do not evaluate report fields as JavaScript or inject untrusted content through raw HTML sinks.

## Build and publish behavior

The build validates inputs before writing, assembles an ordered snapshot, and atomically replaces the local artifact. Identical inputs and assets produce identical HTML. A failed build keeps the prior artifact. Browser history selection includes only revisions known by the selected report's cutoff and never fills missing metric observations with zero.

The Pages workflow validates and tests the source, builds the static artifact, and uploads only `dist/`. The build job has read-only repository access. The deployment job receives only the additional Pages and identity-token permissions required for deployment. Pull requests run checks without publication. See [Deployment](deployment.md). Production research-run recovery and automatic remote deployment verification are not implemented.

Keep source documents, credentials, raw logs, locks, task state, drafts, and private planning material out of published artifacts. Keep the last successful website available when a new run fails.

## Documentation maintenance

Use English for default documentation, technical specifications, and operating instructions. Clearly label optional translations and make English the default linked version. Keep this repository's documentation focused on implemented behavior, implementation contracts, and maintenance; product plans and roadmaps are maintained separately.

## Verification

`npm test` covers dangling references, duplicate identifiers, incorrect growth and margin changes, missing values, negative baselines, incorrect periods, future-source leakage, placeholder production sources, revision ancestry, point-in-time selection, safe JSON serialization, deterministic builds, and retention of a good artifact after invalid input.

Browser validation is separate from the Node tests. It should check company search, report and revision selection, evidence expansion, financial tables, history, empty states, responsive layout, and offline file navigation. The browser does not receive the Node validation dependencies.

## Source precision and extended materials

Sources may declare `published_at_precision: "date"` when only a calendar date is known; the UI does not invent an intraday disclosure time. Coverage distinguishes CFO commentary and supplemental financial information from a formal filing or call transcript. Guidance interval dates can be `null` when the source gives only a fiscal-period label. Unknown dates remain visible as unknown. Financial details show both year-over-year and sequential comparison inputs and evidence.

## Company-specific financial handling

Microsoft FY2027 Q1 uses the current release's recast segment comparisons. GAAP EPS and company-adjusted EPS excluding OpenAI investment effects remain separate. Calculated free cash flow subtracts cash additions to PPE; investment-basis capital expenditure, which has different lease-recognition and payment timing, is not substituted for cash purchases. The available official transcript supplies the numerical revenue outlook.

Apple FY2026 Q4 income metrics use standalone three-month columns. Cash flow is derived as annual amounts less nine-month amounts for both current and prior years; the preceding-quarter comparison is likewise derived from cumulative statements. The calculated metric is labeled `derived` and retains both source references and the formula. Product categories and geographic segments are separate decompositions of the same revenue. Tariff refunds remain included in reported GAAP results. With no collected official transcript or numerical operating outlook, guidance remains empty.

## Languages, themes and announcements

`data/translations/<report_id>-v<revision>.json` contains the complete English narrative, labels, definitions and limitations corresponding to a Chinese report revision. Identity and array lengths are validated. Translation metrics may contain only text fields and cannot override financial values, units, evidence or accounting bases. Production builds fail on missing English editions. The raw report payload remains immutable; display localization applies an overlay from the embedded translation map.

First visits use English regardless of browser locale. Explicit language and theme choices are stored under `earnings-lens.language` and `earnings-lens.theme`; blocked storage falls back safely. Auto theme uses local browser time, choosing dark at 19:00–06:59 and light at 07:00–18:59. It rechecks each minute and on tab visibility changes. Manual choices take precedence. A small head script applies the initial theme before CSS rendering.

`config/announcements.json` contains dated bilingual notices. The latest is displayed with expandable history. Dismissal stores only that notice's ID, so a later announcement can appear.

## Anonymous reading analytics

On `yutaozhou.com` and `www.yutaozhou.com`, `src/analytics.js` loads the existing shared `https://yutaozhou.com/js/site-analytics.js` module with project `earnings-lens`. It reuses the existing Umami property and privacy controls. The CSP permits only that shared script, `https://cloud.umami.is/script.js` and collection at `https://gateway.umami.is`. Financial content never depends on those requests.

Events include `report_open`, `report_read` (overview viewed), `report_engaged` (30 seconds of visible overview reading), `report_complete` (end marker reached after at least 3 seconds with scrolling), and `source_click`. These are engagement signals, not proof that a person read every word. Report identity is encoded in the tracker's allowlisted `path` property as `/earnings-lens/<ticker>/<fiscal period>/v<revision>`. Search terms, query strings, URL hashes and personal identifiers are not sent. Language and tab rerenders do not duplicate report-open events. Reading state is accumulated per report revision during the page session.

Opt-out (`umami.disabled=1`), Do Not Track and Global Privacy Control disable collection. File URLs, localhost and non-production hosts are disabled; blocked local storage also fails closed. The footer links to the existing anonymous analytics settings page. Blocking analytics leaves all report features available.

## Expanded financial coverage

The production watchlist contains 15 companies, including SpaceX under its SEC-verified ticker SPCX. Source coverage is shown per revision. ASML values retain EUR and US GAAP. GM's adjusted automotive free cash flow is labeled with its separate perimeter. Meta deducts finance-lease principal in its company free-cash-flow measure. Micron's adjusted cash flow includes government incentives and equipment sale proceeds; gross cash purchases remain a separate metric. AMD's cash-flow comparison uses continuing operations. Oracle and Alphabet common-stockholder earnings are identified explicitly. Ordinary percentage growth is omitted for nonpositive baselines.

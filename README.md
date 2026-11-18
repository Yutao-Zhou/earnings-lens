# Earnings Lens

[Live website](https://yutaozhou.com/earnings-lens/) · [GitHub Pages workflow](https://github.com/Yutao-Zhou/earnings-lens/actions/workflows/pages.yml)

Static US earnings research generated from structured report JSON. OpenClaw collects source material and produces analysis during the content-production process; the published page contains its own display data.

## Implementation contract

| Stage | Contract |
| --- | --- |
| Input | Validated, versioned earnings-report JSON |
| Build | Render a fixed template and embed report data, styles, scripts, and charts |
| Output | A self-contained static HTML page |
| Browser | Search, filter, and switch reports using embedded data |

The website requires no database, backend, runtime API calls, or automatic requests for external JSON, scripts, fonts, or chart services. Original source links are opened only when the reader chooses to follow them. A generated page must also work when opened as a local file while offline.

Technical details are documented in [Implementation Notes](docs/implementation.md).

## Quick start

Requires Node.js 20 or newer and npm.

```sh
npm ci
npm run validate
npm test
npm run build
```

Open `dist/index.html` directly in a browser. The generated page is self-contained and works without a server or network connection. For a local HTTP preview, run:

```sh
npm run preview
```

The preview listens only on `127.0.0.1:4173`. It is a development tool, not a runtime website dependency.

## Included implementation

- JSON Schema 2020-12 contracts for report data and the watchlist.
- Ajv validation plus financial, evidence-reference, timestamp, and revision checks.
- Six fictional report revisions for two companies, plus an empty-company example.
- Company search, fiscal-period and revision selection, financial tables, evidence inspection, and point-in-time history charts.
- A deterministic build that embeds data and assets in one HTML file and retains the previous output if validation fails.
- Node tests for financial comparisons, missing data, revision ancestry, historical cutoffs, unsafe input, and build behavior.

The default dataset is clearly labeled as fictional. `config/watchlist.production.example.json` records NVDA, MSFT, and AAPL for subsequent real-data integration; it is not the active demo configuration. Live collection, model execution, and scheduled jobs are not implemented.

## GitHub Pages publication

This public repository hosts the website directly through GitHub Actions and GitHub Pages. Pushes to `main` run validation, tests, and the static build, then deploy only `dist/`. The [GitHub Pages project URL](https://yutao-zhou.github.io/earnings-lens/) redirects to the account's existing custom domain at [yutaozhou.com/earnings-lens](https://yutaozhou.com/earnings-lens/). See [GitHub Pages Deployment](docs/deployment.md) for setup and verification.

## Documentation

English is the default documentation language. Optional translations must be clearly labeled, with English retained as the default entry point. Documentation in this repository covers implementation, operation, and maintenance. Product planning and roadmaps are maintained separately.

This documentation policy does not change the language of earnings analysis shown to readers.

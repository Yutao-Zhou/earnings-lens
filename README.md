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

All financial data, English/Chinese analysis, styles and charts are embedded in the page. There is no database, backend or runtime financial-data API. The optional, user-authorized shared anonymous Umami tracker is the sole network exception on the production domain; it is disabled offline and on local previews, honors opt-out/DNT/GPC, and cannot affect report rendering. Original sources open when selected by a reader.

Technical details are documented in [Implementation Notes](docs/implementation.md).

## Quick start

Requires Node.js 24 or newer and npm.

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
- Real quarterly analysis for NVDA, MSFT, AAPL, AMZN, GOOGL, META, TSLA, SPCX (SpaceX), AMD, INTC, MU, ASML, GM, PLTR and ORCL.
- Complete English and Chinese editions for every production revision. First visits use English; explicit preferences persist locally.
- Auto/light/dark themes. Auto uses the visitor's local time: dark from 19:00 through 06:59.
- Dated, bilingual announcements with release history and persistent per-announcement dismissal.
- Shared anonymous report-open, reading, engagement, completion and source-click analytics, with existing privacy settings.
- Fictional revisions isolated under test fixtures; they are excluded from production builds.
- Company search, fiscal-period selection with the latest analysis, financial tables, evidence inspection, and point-in-time history charts.
- A deterministic build that embeds data and assets in one HTML file and retains the previous output if validation fails.
- Node tests for financial comparisons, missing data, revision ancestry, historical cutoffs, unsafe input, and build behavior.

The active dataset contains verified production reports. External content production submits versioned report JSON and a validated English companion through the same publication contract. Material coverage and information cutoffs appear in each report. Research prompts, orchestration, operating state and plans are maintained privately.

## GitHub Pages publication

This public repository hosts the website directly through GitHub Actions and GitHub Pages. Pushes to `main` run validation, tests, and the static build, then deploy only `dist/`. The [GitHub Pages project URL](https://yutao-zhou.github.io/earnings-lens/) redirects to the account's existing custom domain at [yutaozhou.com/earnings-lens](https://yutaozhou.com/earnings-lens/). See [GitHub Pages Deployment](docs/deployment.md) for setup and verification.

## Documentation

English is the default documentation language. Optional translations must be clearly labeled, with English retained as the default entry point. Documentation in this repository covers implementation, operation, and maintenance. Product planning and roadmaps are maintained separately.

Reader-facing analysis is available in both English and Chinese, with English as the default.

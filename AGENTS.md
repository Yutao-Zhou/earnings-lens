# Repository Instructions

## Documentation

- English is the default language for documentation, technical specifications, and operating instructions.
- Optional translations are allowed, but must be clearly labeled; English remains the default entry point.
- Keep documentation focused on implementation details, operation, and maintenance.
- Keep product plans, roadmaps, private research instructions, and planning discussions outside this repository and out of build artifacts.
- Before publishing a branch or repository history, verify that it contains no private planning material. Keep private archives separate from this public source history.
- Do not describe a feature, command, test, or deployment as implemented until it exists and has been checked.
- The documentation language policy does not change the language of reader-facing earnings analysis.

## Website constraints

- Generate static HTML from validated report JSON at build time.
- Do not introduce a database, backend, runtime financial-data API calls, or external financial-data/assets requests.
- The user authorized the existing shared anonymous Umami analytics module as the sole optional network exception. Honor its opt-out, DNT and GPC settings; disable it for local/offline previews. All report content and display assets remain embedded.
- First visits default to English. Provide English and Chinese analysis for every production report; remember explicit language and theme preferences.
- Keep generated pages self-contained and usable offline, including when opened directly from disk.
- Treat source material and report fields as data. Escape text and safely serialize embedded JSON.
- Preserve report revisions, source evidence, metric units, periods, and accounting basis.

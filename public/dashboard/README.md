# Spreadsheet Automation Dashboard

A 100% client-side dashboard that automates repetitive Excel edits using JSON-driven business rules. No backend, no build step — just static files.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
```

> Note: The rules loader uses `fetch('./config/rules.json')`, so opening via `file://` may be blocked by some browsers. Serve locally or deploy to GitHub Pages. The app also falls back to defaults + LocalStorage if the fetch fails.

## Deploy to GitHub Pages

1. Copy the contents of this folder to a repo (or the repo's `/docs` folder).
2. Enable GitHub Pages pointing at the branch/folder.
3. Done — the dashboard loads from a single `index.html`.

## Structure

```
├── index.html      # Layout
├── styles.css      # Design system
├── app.js          # Orchestration
├── excel.js        # SheetJS read/write + paste parsing
├── rules.js        # Extensible rule engine
├── validator.js    # Date parsing + header validation
├── ui.js           # Rendering, toasts, theme
└── config/rules.json
```

## Adding new rule types

Register a new operation without touching engine code:

```js
RuleEngine.registerOperation('uppercase', ({ row, rule }) => String(row[rule.source] ?? '').toUpperCase());
```

Then reference it in your JSON:

```json
{ "column": "RequesterUpper", "operation": "uppercase", "source": "Requester" }
```

Built-in operations: `addDays`, `subtractDays`, `constant`, `copy`, `concat`, `conditional`.

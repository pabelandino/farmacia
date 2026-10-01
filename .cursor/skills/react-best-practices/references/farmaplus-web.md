# Farma Plus web layout

`apps/web` is a Vite + React + Tailwind SPA. Keep modules split. Do not dump pages, shared UI, hooks, API, and formulas into one file.

## Folders

```
apps/web/src/
  main.tsx                 # bootstrap only
  App.tsx                  # routes + Suspense
  styles.css
  api/                     # HTTP + session (no UI, no formulas)
    session.ts
    client.ts
  types/                   # shared DTOs used by more than one page
  utils/                   # pure display helpers (coerce numbers, ISO dates)
  hooks/                   # reusable client state (cart, debounce, feedback)
  components/              # presentational UI (direct imports, no barrels)
  pages/                   # route screens; compose hooks + components
  constants/               # LABELS, table column lists, nav

packages/domain/src/       # business formulas (@farmaplus/domain)
```

## Rules

- Import components from their file (`../components/Panel`), never from a barrel `index.ts`.
- Pages orchestrate; they should not inline large tables/forms that are reused or that bury pricing math.
- `lineAmount`, `totalUsd`, `markupPercent`, `unitCostFromBox`, `intakeTotal`, `salePriceFromMarkup`, `recalcIntakePricing`, `changeDue`, `remainingBalance` stay in `@farmaplus/domain`.
- `utils/` may coerce `Number(value || 0)` and format dates. It must not compute markup, importe, or totals.
- Lazy-load authenticated pages from `App.tsx`. Keep `LoginPage` eager.
- Preserve `SubmitButton` `loading` spinners and existing Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- Independent fetches already started together should stay parallel; do not chain them with `await` unless the second call needs the first result.
- UI copy lives in `constants/labels.ts` (`LABELS`). Table headers live in `constants/tables.ts` and render via `TableHead`. To add a column: add a `LABELS` key, append it to the table list, then add the matching `<td>`. Do not hardcode header arrays in pages.
- POS print uses `PosReceipt` at 80mm. Do not `window.print()` the full UI.

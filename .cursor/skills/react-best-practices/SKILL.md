---
name: react-best-practices
description: Applies Vercel Engineering React/Next.js performance rules (40+ practices from the aitmpl react-best-practices skill) when writing, reviewing, or refactoring UI in this repo. Use for React components, pages, hooks, data fetching, bundle size, re-renders, Tailwind UI, Vite SPA work in apps/web, or any Farma Plus frontend change.
---

# React Best Practices — Performance Optimization

Source: [aitmpl.com/blog/react-best-practices-skill](https://aitmpl.com/blog/react-best-practices-skill/) (Vercel Engineering rules, 40+ practices, 8 impact-ordered categories). Do not invent a generic React style guide; follow these rules.

This project is a **Vite + React SPA** (`apps/web`), not Next.js. Apply every rule that maps to client React. Skip Next/RSC-only mechanics (`next/dynamic`, `React.cache()`, `after()`, RSC serialization) unless that stack appears later.

## When to use

- Writing or refactoring React pages, components, or hooks
- Data fetching (client or server)
- Slow rendering, waterfalls, or large bundles
- Farma Plus UI in `apps/web`

## How to use (progressive loading)

1. Apply the **Critical priorities** and **Common pitfalls** below.
2. For a category in play, read the matching section in [references/react-performance-guidelines.md](references/react-performance-guidelines.md).
3. For Farma Plus folder layout and domain rules, read [references/farmaplus-web.md](references/farmaplus-web.md).

## Critical priorities

1. **Defer await until needed** — move `await` into branches that use the result.
2. **Use `Promise.all()`** — parallelize independent async work. Do not sequence independent `await`s.
3. **Avoid barrel imports** — import from the source file (`../components/Panel`), not a catch-all `index.ts` barrel. Do not add new barrels in `apps/web`.
4. **Dynamic imports** — lazy-load heavy route pages (`React.lazy` + `Suspense`). In Next.js, `next/dynamic`.
5. **Strategic Suspense** — show layout/fallbacks while code or data loads.

```typescript
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
])
```

```tsx
// ❌ Loads entire library
import { Check } from 'lucide-react'

// ✅ Loads only what you need
import Check from 'lucide-react/dist/esm/icons/check'
```

Vite equivalent of Next `dynamic()`:

```tsx
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
```

## Categories (load details on demand)

| Priority | Category | Impact | Guidelines |
|----------|----------|--------|------------|
| 1 | Eliminating waterfalls | CRITICAL | defer await; `Promise.all`; no API-route waterfall chains; Suspense |
| 2 | Bundle size | CRITICAL | no barrels; conditional modules; defer analytics; lazy heavy UI; preload on intent |
| 3 | Server-side | HIGH | LRU across requests; minimize RSC serialization; parallel composition; `React.cache()` — skip if no RSC |
| 4 | Client data fetching | MEDIUM-HIGH | dedupe global listeners; SWR/deduped fetch when adding a client cache |
| 5 | Re-renders | MEDIUM | defer state reads; memo expensive subtrees; primitive effect deps; derived state in render; lazy `useState`; `startTransition` |
| 6 | Rendering | MEDIUM | animate a `div` wrapper not SVG; `content-visibility` on long lists; hoist static JSX; ternary not `&&` for conditionals; `toSorted()` |
| 7 | JavaScript | LOW-MEDIUM | index `Map`s; cache property access; hoist `RegExp`; `Set`/`Map` lookups; early return |
| 8 | Advanced | LOW | handler refs; `useLatest` for stable callbacks |

Each rule in the guidelines file has incorrect vs correct examples and impact notes.

## Implementation approach

1. Profile first (React Profiler / Performance) before micro-optimizing.
2. Fix waterfalls and bundle size before re-render tweaks.
3. Measure LCP, TTI, FID/INP, CLS, initial JS payload.
4. Apply incrementally; do not change product behavior to chase a micro-benchmark.
5. Keep submit `SubmitButton` spinners, Tailwind, and mobile nav working.

## Key metrics

TTI, LCP, FID/INP, CLS, bundle size, TTFB (if SSR is added).

## Common pitfalls

**Don't:** barrel-import large libraries; sequential `await` of independent work; re-render a whole tree for a local update; load analytics on the critical path; mutate with `.sort()` instead of `.toSorted()`; allocate `RegExp`/heavy objects in render.

**Do:** import from source files; `Promise.all` for independent IO; extract expensive children; lazy-load non-critical code; immutable array methods; hoist static objects.

## Farma Plus constraints (always)

- Pricing, markup, intake totals, USD conversion, and related formulas live in `@farmaplus/domain`. UI must not own calculation rules.
- Keep Tailwind utilities, `SubmitButton` loading spinners, and mobile-responsive layout.
- Do not change product behavior during refactors.
- Do not remove `elsasoft-mssql` or delete `.bak` backups.

## Resources

- [react-performance-guidelines.md](references/react-performance-guidelines.md) — full 40+ rules
- [farmaplus-web.md](references/farmaplus-web.md) — this repo's UI module layout
- [React docs](https://react.dev), [SWR](https://swr.vercel.app), [Vercel bundle optimization](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)

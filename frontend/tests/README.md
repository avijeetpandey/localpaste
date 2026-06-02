# Frontend Tests

The Angular tests live alongside the source code as `*.spec.ts` files. They're
run with Karma + Jasmine via the standard Angular CLI test runner.

```sh
npm install
npm test
```

What is covered:

- `core/services/auth.store.spec.ts` — signal-backed auth state persistence.
- `core/services/paste.service.spec.ts` — REST contract for `PasteService`
  (GET / POST / DELETE) using `HttpTestingController`.
- `core/services/toast.service.spec.ts` — toast queue + auto-dismiss.
- `shared/utils/format.spec.ts` — `formatBytes`, `timeAgo`, `timeUntil`.

For end-to-end browser flows you can layer Playwright on top by running
`npx playwright init` inside this folder; the Angular dev server already
serves the SPA at `http://localhost:4200`. A Playwright spec stub is
provided in `tests/e2e.example.spec.ts`.

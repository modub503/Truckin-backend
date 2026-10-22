# ApexTMS — dispatch app

The dispatch app: loads, drivers, estimates, invoices, fuel, payroll. It is an
employee-only tool behind a login, served from the root of its own Netlify
project.

| Path | What it is |
| --- | --- |
| `src/` | the app source |
| `public/` | the static files CRA copies into the build |
| `build/` | the compiled app — the publish directory |
| `netlify.toml` | the deploy config: build, publish, redirects |
| `scripts/prepare-publish.mjs` | writes `build/_headers` and stages the deploy config |

The backend is a separate project (`../backend`), served by Render. The app
calls its own origin and Netlify proxies `/api/*` to the backend, so every
request is same-origin and the httpOnly auth cookies keep working.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | dev server on :3000 |
| `npm run build` | production build into `build/` |
| `npm run publish` | writes `build/_headers`, copies the deploy config into `build/` |
| `npm test` | the test runner |

`npm run build && npm run publish` is what Netlify runs. `npm run publish` is
what makes a hand-dropped `build/` folder self-contained — it carries the
redirects and the `/api/*` proxy with it.

## Deploying

- **Drag and drop**: drop this folder on <https://app.netlify.com/drop>. It
  has its own `netlify.toml`, so Netlify runs the build and applies the
  redirects. To skip the build, drop `build/` instead — it carries the same
  config.
- **Git**: point Netlify at the repo with the **base directory** set to
  `frontend`.

The app is `noindex, nofollow` in every deploy context. It is a login wall,
not a public site.

## The lead handoff

A visitor who submits a form on the marketing site arrives here with
`?handoff=<token>` in the URL. The token is a one-time handle for the lead
they just submitted — the two sites are different origins, so the details
cannot travel in `localStorage` (see `src/lib/handoff.js` for the full
explanation).

The token is taken out of the address bar before React renders, so it
survives the redirect to the login page and does not linger in history or a
shared link. It is then exchanged for the details, which prefill a new
estimate and the login form's email field.

## Local development

```bash
npm start
```

The local backend URL lives in `.env.development.local`, not `.env`. CRA only
loads that file when the dev server runs, so a local URL can never be baked
into a production bundle. The backend must be running on :8001 — see the
repo README.

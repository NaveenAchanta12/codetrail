# CodeTrail

CodeTrail is a browser-based learning app with Python and Java lessons, an AI academy, practice tasks, account progress, study rooms, learner discovery, and an optional on-device AI tutor.

This source export starts from deployed commit `bfb376f05ce166b5b9d72cb1c123978dddb8338e`. It includes every tracked application file from that snapshot, documentation, and portable regression tests. It does not include the original Git history, installed dependencies, credentials, live database records, uploaded profile photos, or browser state. Application features have not been changed for this export.

## Important: `dist/` contains source

This project does **not** have a separate `src/` frontend tree. Most files directly inside `dist/` are the editable HTML, CSS, JavaScript, course JSON, and image assets. Keep them in version control; do not delete or ignore the whole directory.

`dist/server/index.js` is a generated Worker bundle and is also included. `build.mjs` combines `server/*.mjs`, course metadata, and the supported top-level files in `dist/` into that one module. Edit frontend files and backend modules, then rebuild. Avoid editing the generated Worker directly because the next build overwrites it.

The asset packer recognizes HTML, CSS, JS, JSON, WebP, and PNG. It scans the top level of `dist/`, not nested asset directories.

## Local setup and checks

Use Node.js 24 or newer for the included test harness, which uses the built-in `node:sqlite` module. The export was checked with Node.js 24.19.0. SQLite may produce an experimental-feature warning on some Node versions.

```sh
npm ci
npm run build
node tests/run.mjs
```

- `npm ci` installs the dependencies pinned in `package-lock.json`.
- `npm run build` runs the existing dependency-free Node asset packer. It can also run before installation.
- `node tests/run.mjs` performs syntax and JSON checks, verifies the generated bundle matches its inputs, and runs five offline regression suites. It needs no npm dependencies, live accounts, or cloud credentials.
- `npm run db:generate` generates Drizzle migrations from `db/schema.ts`. Review generated SQL before applying it. This command generates migration files; it does not deploy or apply them.

There is no `npm start`, local production-auth server, Wrangler configuration, or automated GitHub deployment workflow in this snapshot. Cloning the repository and running the build does not create a running authenticated service.

For a **local, visual-only** preview, Python can serve the frontend:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8000/`. This static preview does not implement clean-URL routing, sign-in, protected-page enforcement, API endpoints, database operations, or uploads. Page layouts at their `.html` paths can be inspected, but account-dependent content may fail to load. Do not use a plain static server as the production deployment.

## Repository map

- `dist/index.html`, `home.js`, `home.css`: public landing page
- `dist/learn.html`, `app.js`, course JSON, `python-worker.js`: Python/Java lessons and practice
- `dist/hub.html`, `hub.js`: dashboard, catalog, progress, and profile views
- `dist/academy.html`, `academy.js`, `academy-courses.json`: academy courses, tasks, achievements, and memory
- `dist/community.html`, `community.js`, `split-editors.js`, `study-learning.js`: course communities and shared study rooms
- `dist/people.html`, `people.js`, `learner-features.js`: learner directory, preferences, recommendations, and profile-photo processing
- `dist/tutor.js`, `ai-worker.js`, `memory-client.js`: on-device tutor and optional account-backed chat memory
- `server/progress.mjs`: progress validation and optimistic-concurrency storage
- `server/academy.mjs`: academy state, grading, points, tasks, and memory
- `server/community.mjs`: enrollment, connections, room membership, messaging, moderation, and room focus
- `server/buffers.mjs`: per-learner study buffers and explicit sharing/edit permissions
- `server/learners.mjs`: directory/privacy preferences, recommendations, and profile photos
- `db/schema.ts`: Drizzle SQLite schema
- `drizzle/`: ordered SQL migrations `0000` through `0010` and Drizzle snapshot metadata
- `build.mjs`: asset packer and Worker route assembly
- `.openai/hosting.json`: existing Sites project association and resource-binding names
- `tests/`: portable regression tests with generated, non-user image fixtures

## Hosting and authentication dependencies

The original deployment runs on OpenAI Sites with a Workers-style module entry point: `dist/server/index.js` exports an object with `fetch(request, env)`.

The Worker expects the hosting platform to provide:

1. **Trusted authentication.** A successful request carries `oai-authenticated-user-id`, injected by the platform. The frontend links to `/signin-with-chatgpt` and `/signout-with-chatgpt`; these routes are platform-managed and are not implemented in this repository.
2. **`env.DB`.** A D1-compatible SQLite binding with `prepare`, bound statements (`first`, `all`, `run`), and `batch` behavior. The SQL uses features including `RETURNING`, conflict handling, and common table expressions.
3. **`env.FILES`.** An R2-compatible object-storage binding with `put`, `get`, and `delete` for profile photos. Returned objects expose a readable `body`.
4. **Web runtime APIs.** `Request`, `Response`, streams, `TextEncoder`, `TextDecoder`, `crypto.subtle`, `crypto.randomUUID`, and base64 helpers.

`.openai/hosting.json` is preserved as part of the original source. Its project ID identifies the existing deployment; it is not a credential. Reassociate it through your supported Sites workflow before deploying a separate copy. Do not assume that pushing this repository to GitHub updates or creates a Site.

To host elsewhere, first supply real authentication and login/logout routes, configure equivalent database/object-storage bindings, and adapt the platform integration. **Never trust a browser-supplied `oai-authenticated-user-id` header.** A production gateway must strip or reject an incoming spoofed header and derive identity from a verified session before passing it to the Worker. The test harness injects synthetic identities directly solely to exercise authorization logic in isolation; it does not provide or validate production authentication.

Mutating API requests enforce same-origin checks and bind writes to the signed-in account or room permissions. Keep the frontend and API on the same origin unless you deliberately redesign those checks.

## Database setup and data boundaries

For a fresh environment, apply every `drizzle/*.sql` migration in filename order, beginning with `0000_bizarre_miracleman.sql` and ending with `0010_illegal_paladin.sql`, using the target platform's migration mechanism. Preserve the `drizzle/meta/` files for future schema generation. On an existing database, apply only pending migrations using its migration history; do not blindly replay them. Back up persistent data before schema changes.

The database contains progress, academy state, learner preferences, recommendations, enrollments, connections, rooms/membership, messages/reports/blocks, editor buffers/permissions, and shared lesson focus. Photos live in object storage. Live rows and uploaded objects are intentionally absent from this code export. `/api/health` checks access to the progress table only; it is not a full database, storage, or authentication health check.

## Browser features and external resources

- Python execution uses Pyodide in a browser Worker, loaded from the pinned CDN URL in `dist/python-worker.js`. First use requires network access and downloads the runtime. Interactive `input()` is unsupported.
- Java is an editor/download workflow. The app does not include an in-browser JVM; downloaded Java files require a local JDK.
- The optional tutor uses WebLLM and a Qwen2.5-Coder model on the user's device. It needs WebGPU, a compatible browser/GPU, sufficient memory, and network access to download runtime/model files. It is not a server-side OpenAI API integration; no OpenAI API key is required by this source.
- HEIC photo conversion may dynamically load `heic-to` from a pinned jsDelivr URL. Native decoding support varies by browser.
- Google Fonts and the linked learning references require their respective external services.

Those remote runtimes, model weights, fonts, and referenced articles are not vendored in the export. Their upstream availability, terms, and licenses still apply. Optional chat memory stores conversations in account-backed state when enabled, even though model generation itself runs locally.

## Regression coverage and limits

Run all checks with `node tests/run.mjs`, or an individual suite with `node tests/<name>.mjs`:

- `community-security.mjs`: authentication gates, membership/roles, origin checks, revision conflicts, route protection, and draft preservation
- `study-buffers.mjs`: private/shared editor access, grants/revocations, membership races, and bundled API routing
- `room-focus.mjs`: host-only lesson/challenge focus, course boundaries, write-time races, and valid lesson coverage
- `learner-photos.mjs`: directory/privacy controls, opt-in recommendation behavior, concurrent changes, upload validation, and metadata stripping
- `prepare-photo.mjs`: browser-side image-preparation logic using mocked image/canvas APIs

The suites use in-memory SQLite and mock object storage. The image fixtures are generated test images, including intentionally malformed cases and metadata sentinels. They contain no uploaded learner photos. Regenerating them is optional and requires Python with Pillow: `python3 tests/fixtures/generate-fixtures.py`.

Passing these tests is not an end-to-end verification of Sites sign-in, a deployed D1/R2 environment, WebGPU/model loading, real browser HEIC decoding, accessibility, or visual layout. Deployment and real-browser checks remain necessary after any future changes.

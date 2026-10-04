# CodeTrail

**An interactive coding academy that runs in the browser** — Python & Java lessons with real code execution, AI courses, study rooms, and an on-device AI tutor.

🌐 **Live demo:** [www.swotandstudy.com](https://www.swotandstudy.com)

![Demo](https://img.shields.io/badge/demo-live_@_swotandstudy.com-blue)
![Cloudflare Workers](https://img.shields.io/badge/backend-Cloudflare_Workers-F38020)
![Tests](https://img.shields.io/badge/tests-139_passing-brightgreen)

## What it is

CodeTrail is a full-stack learning platform I built and host myself: write Python that actually executes in the browser, work through AI courses with graded checkpoints, collaborate in study rooms with shared editors, and get help from an AI tutor — no installs, no setup.

## Features

### 📚 Learn
- **48 Python lessons** across 16 modules — write and run Python **in the browser** (Pyodide via WebAssembly, off the main thread in a Web Worker), with practice tests, progressive hints, stop control, and execution timeouts
- **18 Java lessons** — editor with line numbers and indentation, download `Main.java` (no in-browser JVM)
- **6 AI academy courses** (AI Foundations → Reliable AI Systems) with checkpoints, practical tasks, XP, levels, and achievements

### 🤖 AI
- Site assistant and lesson tutor powered by **GPT-4.1 mini** (OpenAI Responses API)
- Grounded in course content, your editor code, and console errors — suggested fixes come with Apply/Undo that never overwrites newer edits
- Concept-only help during quizzes; AI pauses during timed no-run mocks
- Optional **on-device tutor** (WebLLM + Qwen2.5-Coder) — runs on your GPU, no API key needed
- AI spend is guarded by atomic cost reservations against a shared monthly budget, with per-user and site-wide daily caps

### 👥 Community
- Study rooms with shared code editors (saved-edit collaboration with revision-based sync)
- Learner directory, connections, blocking/reporting, and recommendations
- Course communities and discussions

### 🔐 Login & security
- Google OpenID Connect (authorization-code flow + PKCE, ID-token signature verification)
- Expiring server-side sessions, secure cookies, revocation on logout
- Same-origin/CSRF checks, safe redirects, private-cache controls
- **Quiz answer keys live server-side** — the browser never receives them

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, custom CSS, vanilla JavaScript — no framework |
| Backend | Cloudflare Workers (JavaScript ES modules, custom `Request`/`Response` routing) |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM & SQL migrations |
| Auth | Google OpenID Connect + PKCE |
| AI | OpenAI Responses API (GPT-4.1 mini); WebLLM for the on-device tutor |
| Code execution | Pyodide (Python via WebAssembly in a dedicated Web Worker) |
| Photos | Browser canvas pipeline (crop/resize → WebP thumbnails, HEIC support) → D1 BLOB storage |
| Hosting | Cloudflare Workers + D1, Cloudflare DNS/HTTPS; domain via GoDaddy |

## Architecture

```
Browser (vanilla JS)
   │  HTTPS · JSON APIs
   ▼
Cloudflare Worker (custom router, ES modules)
   ├── Google OIDC login (PKCE · server-side sessions · secure cookies)
   ├── REST APIs: progress · courses · quizzes · profiles · community
   │               rooms · photos · recommendations · AI
   └── Cloudflare D1 (SQLite): progress, drafts, quiz results,
       profiles, rooms, messages, sessions, photos, AI usage
```

Prepared SQL statements and atomic operations throughout; revision checks handle concurrent saves. No vector database or embeddings pipeline — the tutor is grounded in supplied course context.

## Local development

Prerequisites: Node.js 24+, npm, and [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

```sh
npm ci              # install pinned dependencies
npx wrangler dev    # local Worker runtime with D1
node --test         # run the test suite
```

Database migrations are generated with Drizzle (`drizzle-kit generate`) and applied in filename order. Python is used only for secure setup helpers — it is not the website's backend.

## Testing

**139 passing tests** covering authentication/session handling, API authorization, database operations, quiz grading, photo validation, and Cloudflare-runtime regressions — run with Node's built-in test runner. No live credentials required.

## Project structure

```
├── dist/       # frontend: HTML pages, vanilla JS, CSS, course JSON, WebP artwork
├── server/     # Worker modules: progress, academy, community, learners, buffers
├── db/         # Drizzle schema (SQLite)
├── drizzle/    # ordered SQL migrations
├── tests/      # Node test suites
└── build.mjs   # custom asset packer → Worker bundle
```

## What this project deliberately avoids

No React/Next.js/Vue, no Monaco/CodeMirror, no Docker/Kubernetes, no AWS/Terraform/Redis, no PostgreSQL/MongoDB/Prisma, no GitHub Actions deploy pipeline. The whole platform runs on the stack above.

## Legacy version

The original ChatGPT Sites build is preserved at [legacy.swotandstudy.com](https://legacy.swotandstudy.com). The current app is an independent Cloudflare Workers rebuild with Google login and D1 storage.

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

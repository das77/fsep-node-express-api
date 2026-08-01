# AI Usage

This project was developed with AI assistance using **Github CoPilot** as the AI pair-programming tool. This document records how the AI was used on specific features, per the assessment requirements: the prompts/context given, what the AI suggested, whether suggestions were accepted / modified / rejected, how the generated code was validated, and the limitations encountered.

## Feature: Project documentation (README, ARCHITECTURE, DESIGN)

**Prompt / context provided.** The documentation was generated from this prompt:

> update the following docs: README.md a high level overview of the repo, docs/DESIGN.md in depth design of the app, docs/ARCHITECURE.md in depth design of the app, include diagrams using mermaid where applicable. do not auto commit, update AI-USAGE.md based off this prompt according to these rules: [assessment requirement 5 pasted in full]

The AI had the complete codebase and the project's development history as context.

**What the AI suggested.** The prompt described *both* DESIGN.md and ARCHITECTURE.md identically ("in depth design of the app"), so the AI proposed a split rather than writing the same document twice: ARCHITECTURE.md covers the structural view (layers, module dependency graph, request pipeline, error propagation) while DESIGN.md covers rationale (resource model, status-code contract, validation strategy, trade-offs), with each document cross-linking the other. It produced six mermaid diagrams across the two files — flowcharts for the layer stack, request pipeline, and module dependencies, and sequence diagrams for error propagation and two-stage validation — plus a README with a quick start, endpoint table, and project structure tree.

**Accepted, modified, or rejected.** Accepted. The prompt's filename typo ("ARCHITECURE.md") was silently mapped to the existing `ARCHITECTURE.md` rather than creating a misspelled new file.

**Validation.** The AI read every existing file before overwriting (catching that all three docs were empty placeholders, not content to preserve). Cross-checking the README's claims against the repository surfaced a real inconsistency: the `LICENSE` file is GPL-3.0 while `package.json` declares `"ISC"` — the README was corrected to GPL-3.0 before delivery and the mismatch flagged for follow-up. Markdown was linted (table delimiter style, blank-line rules) and the mermaid diagrams were syntax-reviewed, with known parse breakers (unquoted subgraph titles containing spaces or colons) fixed proactively.

**Limitations encountered.** An attempt to machine-validate the mermaid diagrams with `@mermaid-js/mermaid-cli` failed — the tool needs a headless-browser download the sandbox couldn't perform — so diagram correctness rests on manual syntax review until the docs render on GitHub. More broadly, documentation prompts are where AI *hallucination pressure* is highest: it is easy to generate plausible claims about endpoints or behavior that don't match the code. The mitigation here was that the same agent had just run and live-tested every endpoint being documented, and the one factual error found (the license) came from checking claims against files rather than trusting generation.

## Feature: Test suite with enforced ≥95% coverage

**Prompt / context provided.** The test suite was generated from this prompt:

> add npm tests to get >=95% coverage and update the AI-USAGE.md with this prompt

The AI had the full codebase as context, including the layered app structure and the fact that `app.js` exports the Express app without calling `.listen()`.

**What the AI suggested.** Node's built-in `node:test` runner plus `supertest` (the only new dependency, dev-only) rather than a heavier framework like Jest — coverage measurement and threshold enforcement are built into Node, so the `test` script itself fails if line, branch, or function coverage drops below 95% (`--test-coverage-lines=95` etc., with `tests/**` excluded so only application code is measured). The suite splits into two files: `tests/api.test.js` drives the full HTTP surface through `supertest` against the exported app (22 tests total covering CRUD happy paths, both query filters and their composition, all four validation-failure classes, malformed ids, 404s, and the `Location` header on create), and `tests/middleware.test.js` unit-tests the error handler directly — the 500-default, message-fallback, and server-side-logging branches are unreachable through well-behaved routes. To keep tests from mutating the real seed data, the AI also proposed a one-line change to the service: an optional `BOOKS_DATA_FILE` environment variable pointing the store at a throwaway copy of the seed file.

**Accepted, modified, or rejected.** Accepted, including the small production-code change for testability. One test deliberately asserts persistence by reading the temp data file from disk after a `POST`, not just checking the HTTP response.

**Validation.** `npm test` runs 22 tests, all passing, with **100% line, 98.39% branch, and 100% function coverage** across every application file — above the enforced 95% gates, which were verified to be active (the script exits non-zero if thresholds are missed). A `git diff` after the run confirmed the real `src/data/books.json` was untouched, proving the isolation mechanism works.

**Limitations encountered.** Two real tool failures during setup, both environmental rather than logical: the unquoted `tests/**` glob in the npm script was expanded by the shell before reaching Node (fixed by quoting), and `node --test tests/` failed on Node 24 because the runner would not accept a bare directory as a positional argument — the fix was relying on the runner's default `*.test.js` discovery instead. Two honest gaps in the coverage number: `src/server.js` is never imported by tests (it binds a port), so it is absent from the report rather than counted against it, and the one uncovered branch in `books.service.js` is the default (non-test) side of the `BOOKS_DATA_FILE` ternary — the path the production server takes but tests deliberately avoid.

## Feature: CI coverage gate

**Prompt / context provided.** A follow-up to the test-suite work, accepting a suggestion the AI had made when delivering it:

> adding npm test to ci.yml so the coverage gate actually protects main and update AI-USAGE.md

The AI had the existing `ci.yml` as context — a single `npm-audit` job that is deliberately advisory (`|| true`) and never fails the build, meaning nothing actually gated merges to `main`.

**What the AI suggested.** A separate `test` job rather than a step appended to the audit job, so the audit can stay advisory while tests gate independently — a failure in one is distinguishable from the other on the PR checks page. The job mirrors the audit job's conventions (checkout, `setup-node` with npm caching keyed on the lockfile, `npm ci`) and pins Node 24 to match local development, since the built-in test runner's coverage flags are version-sensitive. No coverage flags live in the workflow itself: the thresholds are in the `npm test` script, so CI and local runs enforce identical gates and cannot drift.

**Accepted, modified, or rejected.** Accepted as proposed.

**Validation.** GitHub Actions workflows cannot be executed locally, so validation was by parts: the YAML was parsed programmatically to confirm structure, and the job's exact command sequence (`npm ci` followed by `npm test`) was replayed locally and exited 0 — which also proved the committed lockfile really contains `supertest`, the failure mode `npm ci` exists to catch. Final confirmation comes from the first real run on the PR.

**Limitations encountered.** The inherent one: a workflow file is only truly tested by the platform that runs it. Local replay covers the commands but not the Actions environment (runner image, cache behavior, permissions), so the first CI run on this branch's PR is part of the validation, not a formality.

## General observations

- **Tooling failures need fallbacks.** The `gh pr edit` CLI command failed against this repository due to a known GitHub CLI bug (a deprecated GraphQL `projectCards` field). The AI worked around it by calling the GitHub REST API directly (`gh api -X PATCH .../pulls/N`). AI agents that can only follow the happy path stall on this class of environmental failure.
- **Verification was the norm, not the exception.** Every AI-generated change in this project was validated by actually running the server and asserting on real HTTP responses before committing — no change was accepted on the strength of the generated code alone.

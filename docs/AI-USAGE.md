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

## General observations

- **Tooling failures need fallbacks.** The `gh pr edit` CLI command failed against this repository due to a known GitHub CLI bug (a deprecated GraphQL `projectCards` field). The AI worked around it by calling the GitHub REST API directly (`gh api -X PATCH .../pulls/N`). AI agents that can only follow the happy path stall on this class of environmental failure.
- **Verification was the norm, not the exception.** Every AI-generated change in this project was validated by actually running the server and asserting on real HTTP responses before committing — no change was accepted on the strength of the generated code alone.

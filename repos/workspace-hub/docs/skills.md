# Extensions And Skills

Workspace Hub can be extended with local skills, scripts, and repo-specific runbooks.

## Keep tracked docs generic

Public repo docs should describe extension patterns, not assume every contributor shares the same local AI or automation environment.

Good public guidance includes:

- what kinds of workflows are worth codifying
- when to prefer scripts over prose
- where repo-local guidance should live

## Keep local skill details private

If you use a local assistant or agent setup, keep machine-specific skill lists and private workflow notes in ignored `*.local.md` files instead of tracked docs.

If you use upstream skill catalogs such as [`openai/skills`](https://github.com/openai/skills), treat them as optional sources for selected skills rather than as something to vendor into this repo or the wider workspace.

- install only the skills that solve a real workflow problem
- prefer the agent's supported installer flow
- keep Codex-facing repo-owned guidance in `.agents/skills/`
- use `.workspace/skills/` only if you intentionally maintain additional tool-neutral source material
- keep third-party orchestration layers and generated agent setup local-only unless the repo explicitly chooses to publish them

## Good extension candidates

- workspace maintenance and Git hygiene
- repo onboarding and manifest generation
- WordPress runtime conventions
- packaging or content-export workflows
- repo-specific troubleshooting guides

## Practical guidance

- use scripts when deterministic execution matters
- use docs when human judgment still matters
- keep public examples portable
- keep personal or machine-specific assistant notes local-only

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

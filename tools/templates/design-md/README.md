# DESIGN.md Template

Use this template set when a repo needs its own tracked `DESIGN.md`.

This workspace treats [`google-labs-code/design.md`](https://github.com/google-labs-code/design.md) as the canonical `DESIGN.md` standard for repo-level design-system context. `DESIGN.md` stays optional and is recommended mainly for UI-heavy repos.

This folder gives you:

- `DESIGN.template.md` for a repo-root starter `DESIGN.md`

The starter contains the Google-compatible token front matter plus adaptable
guidance for responsive behaviour, accessibility, interaction states, motion,
iconography, imagery, content, implementation constraints and verification.
The values are illustrative defaults and must be replaced or explicitly
accepted for the target repo.

## Recommended usage

1. Copy `DESIGN.template.md` into the target repo as `DESIGN.md`.
2. Keep the file in the repo root so agents and local tooling can detect it consistently.
3. Customize the tokens and prose for that repo instead of trying to share one `DESIGN.md` across unrelated repos.
4. Validate it with `tools/scripts/design-md.sh lint <repo-or-file>`.
5. Use `tools/scripts/design-md.sh diff <old> <new>` when you want a token-and-prose change check.

The eight upstream sections remain in the required order. Additional workspace
sections follow them as optional guidance and can be removed when they are not
relevant to a project. Use the upstream `omitted` front-matter field when a
token section is intentionally absent.

## Example catalogs vs canonical authoring

The optional VoltAgent catalog is still available for inspiration and quick copies, but it is not the canonical standard in this workspace.

- Use `tools/scripts/design-md.sh` for the repo-owned authoring workflow.
- Use `tools/scripts/design-md.sh examples list` and `tools/scripts/design-md.sh examples copy ...` when you want example source material from the VoltAgent catalog.

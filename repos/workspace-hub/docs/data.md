# Data Folder

This folder is reserved for lightweight local metadata such as favourites, tags, notes, and runtime overrides.

Do not store secrets here.

The repo should keep only ignore scaffolding here. Real metadata files stay local and should not be committed.

Typical local files:

- `repo-metadata.json` for per-repo notes, tags, preferred mode, and command/URL overrides.
- `failure-reports/*.json` for structured runtime or install failure reports with repo, Git, health, command, and log-tail context.

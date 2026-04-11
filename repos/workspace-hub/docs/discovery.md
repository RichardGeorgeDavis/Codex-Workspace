# Discovery Guide

Workspace Hub uses the Repo Discovery panel as the primary workspace inventory view.

## What appears in Repo Discovery

- discovered repo records from the workspace scan
- visible archive files found during the same scan
- archive entries filtered to hide configured display-only roots such as `repos/Check-[Sort+add]/`

Archive cards are informational only. Repo actions and the details panel still apply to repo records.

## Discovery filters

Repo Discovery currently supports:

- `All items`
- `Non-archived repos`
- `Archived files`
- `Runnable repos`
- `External repos`
- repo-type filters such as `vite`, `wordpress`, or `static`

Search defaults to thin indexed metadata plus repo side-load summaries. Deep mode is explicit and expands into debug-only docs, logs, and local artifacts when those sources are available.

## Dashboard layout

The dashboard is intentionally split into two primary columns:

- the left column keeps Repo Discovery visible as the main inventory surface
- the right column stacks Repo Details, Workspace configuration, Next milestones, and Current assumptions

This keeps the operator panels beside long repo lists instead of pushing them below the page fold.

## Supporting status

- the top status strip shows the discovered repo count and the archived-file count together
- Workspace configuration still reports the archive-file total

# Workflow State Templates

This folder documents an optional local workflow-state layer for users who want more operational history for agent work.

The main use case is tools that keep workflows, runs, events, and collections in a local workspace such as `.cognetivy/`.

## Recommendation

Treat workflow state as local operational history, not as the source of truth for the project.

That means:

- keep canonical repo knowledge in tracked docs, specs, manifests, and skills
- keep local workflow state in ignored folders by default
- promote durable findings back into tracked files once they stabilize

## Good fit

Use a workflow-state layer when you want:

- repeatable multi-step agent workflows
- local inspection of runs and events
- local collections of task artifacts
- a read-only operational UI or timeline

## Non-goal

Do not replace tracked project guidance with a private workflow-state directory.

If a team actually chooses to adopt a workflow-state folder in a repo, that decision should be explicit and documented in that repo.

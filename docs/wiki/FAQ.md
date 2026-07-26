# FAQ

## Is this a monorepo?

No. Codex Workspace is a workspace structure for many standalone repositories. Each repo should remain independently runnable.

## Should all repos share one `node_modules` folder?

No. Share caches and stores where useful, but do not merge unrelated repos into one dependency structure.

## Does this require a reverse proxy or mapped local hostname?

No. Optional proxy or mapped-host tooling is only for operators who want a single local front door. It should not become a mandatory dependency for all repos.

## What runtime mode should I use?

Typical defaults are:

- WordPress: `external`
- Vite / static / Three.js / WebGL: `direct`
- other server-side repos: repo-native runtime, with proxying only when it adds clear value

## Where should project documentation live?

The canonical documentation belongs in tracked files in the repo itself, especially `README.md`, `docs/`, and repo-local documentation folders.

## What is the GitHub wiki for?

The wiki is optional and should stay thin. It works best as a public navigation layer that points people back to the tracked docs set.

## Where should questions go?

Use [Discussions Q&A](https://github.com/RichardGeorgeDavis/Codex-Workspace/discussions/categories/q-a) for usage questions, setup help, and workflow discussion.

Use [Issues](https://github.com/RichardGeorgeDavis/Codex-Workspace/issues) for reproducible bugs, documentation gaps, and focused feature requests.

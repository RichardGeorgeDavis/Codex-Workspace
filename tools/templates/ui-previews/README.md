# UI Preview Templates

This folder documents a lightweight preview strategy for frontend repos.

The goal is to keep the good parts of richer component platforms without making them a workspace-wide dependency.

## Recommendation

For React or Vite-heavy repos:

- prefer `Ladle` when you want a fast component workbench with minimal setup
- prefer `Storybook` when you want richer docs, addons, or a published component documentation surface

Keep either tool repo-local.

Do not add a workspace-wide Storybook or Ladle dependency for unrelated repos.

## Preferred story shape

Use Component Story Format when possible so preview files stay easier to move between tools.

Suggested repo-local bundle:

```text
src/components/<component>/
├── <Component>.tsx
├── <Component>.test.tsx
├── <Component>.stories.tsx
└── README.md
```

Recommended usage:

- implementation in the component file
- behavior checks in the test file
- isolated preview states in the story file
- component intent or caveats in the local README when needed

This gives you isolated component previews without turning the workspace into a component platform.

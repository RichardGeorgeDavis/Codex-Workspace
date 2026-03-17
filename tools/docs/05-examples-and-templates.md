# 05-examples-and-templates

## Purpose

This file provides concrete examples and starter templates for Codex Workspace.

Use these examples when:

- creating new repo metadata files
- scaffolding initial workspace data
- implementing manifest reading in Workspace Hub
- testing direct, external, and ServBay-linked preview modes

This file complements the prose handover files by showing actual example structures.

## Included example files

### `project-manifest.template.json`
A starter template for per-repo runtime metadata.

Recommended destination inside a repo:

```text
.workspace/project.json
```

### `repo-index.sample.json`
A sample shared workspace inventory file.

Recommended destination:

```text
shared/repo-index.json
```

## Example manifest notes

The manifest template demonstrates:

- a direct-run frontend project
- a normal slug
- package manager and commands
- direct preview URL
- optional ServBay path
- optional healthcheck URL
- lightweight notes and tags

Not every field is required in every real project.

## Example repo index notes

The sample repo index demonstrates a mixed workspace containing:

- the Workspace Hub itself
- a WordPress site
- a Three.js/WebGL repo
- a static site

These examples show how different repo types can coexist inside the same workspace while using different preview modes.

## Recommended Codex behaviour

When creating new repos or manifests:

- use the template as a starting point
- remove empty fields if they are not useful
- prefer explicit values where runtime behaviour matters
- keep repo metadata lightweight and readable

## Example preview-mode mapping

### `direct`
Use for:
- Vite
- Three.js
- WebGL
- most static/dev-server projects

### `external`
Use for:
- Local-managed WordPress sites
- repos opened through another tool or service

### `servbay`
Use when:
- a clean mapped path or local-domain route is stable
- proxying adds real convenience
- the project has been tested successfully in proxy mode

## Definition of done

This examples file is complete when Codex can use the included template and sample data as working references for:

- manifest creation
- repo inventory scaffolding
- Workspace Hub parser implementation
- preview-mode testing

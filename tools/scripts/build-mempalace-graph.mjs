#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = new Map()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`)
    }

    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    args.set(key, value)
    index += 1
  }

  const workspaceRoot = args.get('workspace-root')
  const targetKind = args.get('target-kind')
  const targetPath = args.get('target-path')
  const targetLabel = args.get('target-label')
  const targetSlug = args.get('target-slug')
  const outputDir = args.get('output-dir')

  if (!workspaceRoot || !targetKind || !targetPath || !targetLabel || !targetSlug || !outputDir) {
    throw new Error(
      'Required arguments: --workspace-root --target-kind --target-path --target-label --target-slug --output-dir',
    )
  }

  return {
    outputDir: path.resolve(outputDir),
    repoRelativePath: args.get('repo-relative-path') ?? null,
    targetKind,
    targetLabel,
    targetPath: path.resolve(targetPath),
    targetSlug,
    workspaceRoot: path.resolve(workspaceRoot),
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function parseScalar(value) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '[]') {
    return ''
  }

  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseInlineList(value) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '[]') {
    return []
  }

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [parseScalar(trimmed)].filter(Boolean)
  }

  return uniqueStrings(
    trimmed
      .slice(1, -1)
      .split(',')
      .map((entry) => parseScalar(entry)),
  )
}

function parseMempalaceYaml(content) {
  const rooms = []
  let wing = ''
  let currentRoom = null
  let inKeywords = false

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    if (trimmed.startsWith('wing:')) {
      wing = parseScalar(trimmed.slice('wing:'.length))
      inKeywords = false
      continue
    }

    if (trimmed === 'rooms:') {
      inKeywords = false
      continue
    }

    if (trimmed.startsWith('- name:')) {
      if (currentRoom) {
        rooms.push(currentRoom)
      }
      currentRoom = {
        description: '',
        keywords: [],
        name: parseScalar(trimmed.slice('- name:'.length)),
      }
      inKeywords = false
      continue
    }

    if (!currentRoom) {
      continue
    }

    if (trimmed.startsWith('description:')) {
      currentRoom.description = parseScalar(trimmed.slice('description:'.length))
      inKeywords = false
      continue
    }

    if (trimmed.startsWith('keywords:')) {
      const inlineValue = trimmed.slice('keywords:'.length)
      currentRoom.keywords = parseInlineList(inlineValue)
      inKeywords = inlineValue.trim() === ''
      continue
    }

    if (inKeywords && trimmed.startsWith('- ')) {
      currentRoom.keywords.push(parseScalar(trimmed.slice(2)))
      continue
    }

    inKeywords = false
  }

  if (currentRoom) {
    rooms.push(currentRoom)
  }

  return {
    rooms: rooms.map((room) => ({
      description: room.description,
      keywords: uniqueStrings(room.keywords),
      name: room.name,
    })),
    wing: wing || 'memory',
  }
}

async function readJsonIfPresent(targetPath) {
  try {
    return JSON.parse(await readFile(targetPath, 'utf8'))
  } catch {
    return null
  }
}

async function readTextIfPresent(targetPath) {
  try {
    return await readFile(targetPath, 'utf8')
  } catch {
    return null
  }
}

function normalizeText(value) {
  return value.toLowerCase()
}

function includesPhrase(content, phrase) {
  const normalizedPhrase = normalizeText(phrase).trim()
  if (!normalizedPhrase) {
    return false
  }

  return content.includes(normalizedPhrase)
}

const skippedDirectoryNames = new Set([
  '.git',
  '.next',
  '.nuxt',
  '.output',
  '.workspace',
  'build',
  'cache',
  'coverage',
  'dist',
  'node_modules',
  'storybook-static',
  'target',
  'vendor',
])

const includedExtensions = new Set(['.md', '.mdx', '.txt'])

async function walkTextFiles(rootPath, currentPath = rootPath, collected = []) {
  const entries = await readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skippedDirectoryNames.has(entry.name)) {
        continue
      }

      await walkTextFiles(rootPath, path.join(currentPath, entry.name), collected)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!includedExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue
    }

    collected.push(path.join(currentPath, entry.name))
  }

  return collected
}

function buildTargetNode(args) {
  return {
    id: `target:${args.targetSlug}`,
    label: args.targetLabel,
    metadata: {
      path: args.targetPath,
      repoRelativePath: args.repoRelativePath,
      slug: args.targetSlug,
    },
    source: args.targetKind === 'workspace-docs' ? 'workspace-docs' : 'repo-target',
    type: 'target',
  }
}

function buildRoomNodes(args, sidecars) {
  const wing = slugify(sidecars.yaml?.wing ?? 'memory')

  return (sidecars.yaml?.rooms ?? []).map((room) => ({
    id: `room:${wing}:${slugify(room.name)}`,
    label: room.name,
    metadata: {
      description: room.description,
      keywords: room.keywords,
      wing: sidecars.yaml?.wing ?? 'memory',
    },
    source: 'mempalace.yaml',
    type: 'room',
  }))
}

function buildEntityNodes(sidecars) {
  const entities = sidecars.entities ?? {}
  const nodes = []

  const projects = Array.isArray(entities.projects) ? entities.projects : []
  for (const projectName of uniqueStrings(projects.filter((entry) => typeof entry === 'string'))) {
    nodes.push({
      id: `project:${slugify(projectName)}`,
      label: projectName,
      metadata: {
        bucket: 'projects',
      },
      source: 'entities.json',
      type: 'project',
    })
  }

  for (const [bucketName, bucketValues] of Object.entries(entities)) {
    if (bucketName === 'projects' || !Array.isArray(bucketValues)) {
      continue
    }

    for (const value of uniqueStrings(bucketValues.filter((entry) => typeof entry === 'string'))) {
      nodes.push({
        id: `entity:${slugify(bucketName)}:${slugify(value)}`,
        label: value,
        metadata: {
          bucket: bucketName,
        },
        source: 'entities.json',
        type: 'entity',
      })
    }
  }

  return nodes
}

function buildContainsEdges(targetNode, nodes, sidecarSources) {
  return nodes.map((node) => ({
    confidence: 1,
    derived: false,
    from: targetNode.id,
    id: `contains:${targetNode.id}:${node.id}`,
    provenance: node.type === 'room' ? [sidecarSources.yamlPath] : [sidecarSources.entitiesPath].filter(Boolean),
    source: node.source,
    to: node.id,
    type: 'contains',
  }))
}

function limitList(values, size = 6) {
  return values.slice(0, size)
}

function buildHtmlDocument(graph) {
  const safePayload = JSON.stringify(graph).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MemPalace Graph · ${graph.target.label}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: rgba(255, 251, 245, 0.92);
        --panel-strong: #fffdf8;
        --text: #18222d;
        --muted: #5d6a73;
        --line: rgba(24, 34, 45, 0.18);
        --room: #1c6b5f;
        --project: #c3642d;
        --entity: #6a4aa1;
        --target: #0f3f67;
        --shadow: 0 18px 42px rgba(24, 34, 45, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(28, 107, 95, 0.16), transparent 32rem),
          radial-gradient(circle at bottom right, rgba(195, 100, 45, 0.18), transparent 28rem),
          var(--bg);
      }

      main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1.5rem 3rem;
      }

      .hero,
      .panel {
        background: var(--panel);
        border: 1px solid rgba(24, 34, 45, 0.08);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(14px);
      }

      .hero {
        padding: 1.5rem;
        margin-bottom: 1.25rem;
      }

      .eyebrow {
        margin: 0 0 0.35rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.76rem;
        color: var(--muted);
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 0.96;
      }

      .subcopy {
        margin: 0.75rem 0 0;
        max-width: 58rem;
        color: var(--muted);
        font-size: 1rem;
        line-height: 1.5;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        gap: 0.85rem;
        margin-top: 1.2rem;
      }

      .stat {
        padding: 0.95rem 1rem;
        border-radius: 18px;
        background: var(--panel-strong);
      }

      .stat strong {
        display: block;
        font-size: 1.5rem;
      }

      .stat span {
        color: var(--muted);
        font-size: 0.9rem;
      }

      .graph-panel {
        padding: 1rem;
      }

      svg {
        width: 100%;
        height: auto;
        min-height: 28rem;
        display: block;
      }

      .edge {
        stroke: var(--line);
        stroke-width: 2;
      }

      .edge.references {
        stroke-dasharray: 8 6;
      }

      .node circle {
        stroke: rgba(255, 255, 255, 0.92);
        stroke-width: 3;
      }

      .node text {
        fill: var(--text);
        font-size: 0.84rem;
        font-weight: 600;
        text-anchor: middle;
      }

      .node-target circle { fill: var(--target); }
      .node-room circle { fill: var(--room); }
      .node-project circle { fill: var(--project); }
      .node-entity circle { fill: var(--entity); }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        gap: 1rem;
        margin-top: 1.25rem;
      }

      .panel {
        padding: 1.1rem 1.2rem;
      }

      h2 {
        margin: 0 0 0.75rem;
        font-size: 1.05rem;
      }

      ul {
        margin: 0;
        padding-left: 1rem;
      }

      li + li {
        margin-top: 0.4rem;
      }

      .muted {
        color: var(--muted);
      }

      @media (max-width: 720px) {
        main {
          padding: 1rem 0.8rem 2rem;
        }

        .hero,
        .panel,
        .graph-panel {
          border-radius: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">MemPalace Graph</p>
        <h1>${graph.target.label}</h1>
        <p class="subcopy">
          Phase 1 graph output built from MemPalace sidecars and nearby target-scoped markdown.
          This is a derived visualization, not a second memory system.
        </p>
        <div class="stats" id="stats"></div>
      </section>

      <section class="graph-panel panel">
        <svg id="graph" viewBox="0 0 960 520" role="img" aria-label="Memory graph"></svg>
      </section>

      <section class="grid">
        <article class="panel">
          <h2>Rooms</h2>
          <ul id="rooms"></ul>
        </article>
        <article class="panel">
          <h2>Projects</h2>
          <ul id="projects"></ul>
        </article>
        <article class="panel">
          <h2>Entities</h2>
          <ul id="entities"></ul>
        </article>
        <article class="panel">
          <h2>Derived Links</h2>
          <ul id="links"></ul>
        </article>
      </section>
    </main>

    <script>
      const graph = ${safePayload}

      const svg = document.getElementById('graph')
      const stats = document.getElementById('stats')
      const roomsList = document.getElementById('rooms')
      const projectsList = document.getElementById('projects')
      const entitiesList = document.getElementById('entities')
      const linksList = document.getElementById('links')

      const target = graph.nodes.find((node) => node.type === 'target')
      const rooms = graph.nodes.filter((node) => node.type === 'room')
      const projects = graph.nodes.filter((node) => node.type === 'project')
      const entities = graph.nodes.filter((node) => node.type === 'entity')

      const positions = new Map()
      positions.set(target.id, { x: 480, y: 250 })

      rooms.forEach((node, index) => {
        positions.set(node.id, {
          x: 240,
          y: 110 + index * Math.max(52, 280 / Math.max(rooms.length, 1)),
        })
      })

      projects.forEach((node, index) => {
        positions.set(node.id, {
          x: 720,
          y: 100 + index * Math.max(48, 220 / Math.max(projects.length, 1)),
        })
      })

      entities.forEach((node, index) => {
        positions.set(node.id, {
          x: 720,
          y: 320 + index * Math.max(44, 150 / Math.max(entities.length, 1)),
        })
      })

      const radiusByType = {
        entity: 20,
        project: 22,
        room: 24,
        target: 34,
      }

      for (const edge of graph.edges) {
        const from = positions.get(edge.from)
        const to = positions.get(edge.to)
        if (!from || !to) continue

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', from.x)
        line.setAttribute('y1', from.y)
        line.setAttribute('x2', to.x)
        line.setAttribute('y2', to.y)
        line.setAttribute('class', \`edge \${edge.type}\`)
        svg.append(line)
      }

      for (const node of graph.nodes) {
        const position = positions.get(node.id)
        if (!position) continue

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        group.setAttribute('class', \`node node-\${node.type}\`)

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', position.x)
        circle.setAttribute('cy', position.y)
        circle.setAttribute('r', radiusByType[node.type] ?? 18)
        group.append(circle)

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', position.x)
        text.setAttribute('y', position.y + 4)
        text.textContent = node.label
        group.append(text)

        svg.append(group)
      }

      const statEntries = [
        ['Nodes', graph.summary.nodeCount],
        ['Edges', graph.summary.edgeCount],
        ['Rooms', graph.summary.roomCount],
        ['Projects', graph.summary.projectCount],
        ['Entities', graph.summary.entityCount],
        ['Generated', new Date(graph.generatedAt).toLocaleString()],
      ]

      for (const [label, value] of statEntries) {
        const card = document.createElement('div')
        card.className = 'stat'
        card.innerHTML = \`<strong>\${value}</strong><span>\${label}</span>\`
        stats.append(card)
      }

      const renderNodeList = (container, nodes, formatter) => {
        if (!nodes.length) {
          container.innerHTML = '<li class="muted">No nodes recorded.</li>'
          return
        }

        for (const node of nodes) {
          const item = document.createElement('li')
          item.innerHTML = formatter(node)
          container.append(item)
        }
      }

      renderNodeList(roomsList, rooms, (node) => {
        const keywords = Array.isArray(node.metadata?.keywords) ? node.metadata.keywords.join(', ') : 'No keywords'
        return \`<strong>\${node.label}</strong><br /><span class="muted">\${keywords}</span>\`
      })

      renderNodeList(projectsList, projects, (node) => \`<strong>\${node.label}</strong>\`)
      renderNodeList(entitiesList, entities, (node) => {
        const bucket = node.metadata?.bucket ?? 'entity'
        return \`<strong>\${node.label}</strong><br /><span class="muted">\${bucket}</span>\`
      })

      const derivedEdges = graph.edges.filter((edge) => edge.derived)
      renderNodeList(linksList, derivedEdges.slice(0, 12), (edge) => {
        const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from
        const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to
        const provenance = Array.isArray(edge.provenance) && edge.provenance.length
          ? edge.provenance.join(', ')
          : edge.source
        return \`<strong>\${from}</strong> → <strong>\${to}</strong><br /><span class="muted">\${edge.type} · confidence \${edge.confidence.toFixed(2)} · \${provenance}</span>\`
      })
    </script>
  </body>
</html>
`
}

function buildReport(graph, sidecarSources, scannedFiles) {
  const roomNodes = graph.nodes.filter((node) => node.type === 'room')
  const projectNodes = graph.nodes.filter((node) => node.type === 'project')
  const entityNodes = graph.nodes.filter((node) => node.type === 'entity')
  const derivedEdges = graph.edges.filter((edge) => edge.derived)

  return [
    `# MemPalace Graph Report`,
    ``,
    `- Generated at: ${graph.generatedAt}`,
    `- Target: ${graph.target.label}`,
    `- Target kind: ${graph.target.kind}`,
    `- Target path: ${graph.target.path}`,
    `- Node count: ${graph.summary.nodeCount}`,
    `- Edge count: ${graph.summary.edgeCount}`,
    ``,
    `## Sources`,
    ``,
    `- mempalace.yaml: ${sidecarSources.yamlPath ?? 'not found'}`,
    `- entities.json: ${sidecarSources.entitiesPath ?? 'not found'}`,
    `- scanned markdown files: ${scannedFiles.length}`,
    ``,
    `## Rooms`,
    ``,
    ...(roomNodes.length
      ? roomNodes.map((node) => {
          const keywords = Array.isArray(node.metadata?.keywords) ? node.metadata.keywords.join(', ') : ''
          return `- ${node.label}${keywords ? ` (${keywords})` : ''}`
        })
      : ['- No rooms found']),
    ``,
    `## Projects`,
    ``,
    ...(projectNodes.length ? projectNodes.map((node) => `- ${node.label}`) : ['- No project nodes found']),
    ``,
    `## Entities`,
    ``,
    ...(entityNodes.length
      ? entityNodes.map((node) => `- ${node.label} (${node.metadata?.bucket ?? 'entity'})`)
      : ['- No entity nodes found']),
    ``,
    `## Derived Relationships`,
    ``,
    ...(derivedEdges.length
      ? limitList(derivedEdges, 16).map((edge) => {
          const provenance = Array.isArray(edge.provenance) && edge.provenance.length
            ? edge.provenance.join(', ')
            : edge.source
          return `- ${edge.type}: ${edge.from} -> ${edge.to} (confidence ${edge.confidence.toFixed(2)}, ${provenance})`
        })
      : ['- No derived relationships found']),
  ].join('\n')
}

function buildGraphDocument(args, sidecarSources, sidecars, scannedFiles, scannedContent) {
  const targetNode = buildTargetNode(args)
  const roomNodes = buildRoomNodes(args, sidecars)
  const entityNodes = buildEntityNodes(sidecars)
  const graphNodes = [targetNode, ...roomNodes, ...entityNodes]

  const containsEdges = buildContainsEdges(targetNode, [...roomNodes, ...entityNodes], sidecarSources)
  const roomMatches = new Map()

  for (const file of scannedContent) {
    const matchedRooms = roomNodes.filter((roomNode) => {
      const roomKeywords = uniqueStrings([
        roomNode.label,
        ...(Array.isArray(roomNode.metadata?.keywords) ? roomNode.metadata.keywords : []),
      ])
      return roomKeywords.some((keyword) => includesPhrase(file.content, keyword))
    })

    const matchedSecondaryNodes = entityNodes.filter((node) => includesPhrase(file.content, node.label))

    for (const roomNode of matchedRooms) {
      for (const secondaryNode of matchedSecondaryNodes) {
        const matchKey = `${roomNode.id}::${secondaryNode.id}`
        const existing = roomMatches.get(matchKey) ?? {
          count: 0,
          filePaths: [],
          roomId: roomNode.id,
          secondaryId: secondaryNode.id,
        }
        existing.count += 1
        existing.filePaths.push(file.relativePath)
        roomMatches.set(matchKey, existing)
      }
    }
  }

  const belongsToRoomEdges = []
  const referenceEdges = []

  for (const secondaryNode of entityNodes) {
    const candidates = [...roomMatches.values()]
      .filter((entry) => entry.secondaryId === secondaryNode.id)
      .sort((left, right) => right.count - left.count)

    const primary = candidates[0]
    if (primary) {
      belongsToRoomEdges.push({
        confidence: Math.min(0.45 + primary.count * 0.15, 0.9),
        derived: true,
        from: secondaryNode.id,
        id: `belongs-to-room:${secondaryNode.id}:${primary.roomId}`,
        provenance: uniqueStrings(primary.filePaths),
        source: 'content-cooccurrence',
        to: primary.roomId,
        type: 'belongs_to_room',
      })
    }
  }

  for (const match of roomMatches.values()) {
    referenceEdges.push({
      confidence: Math.min(0.3 + match.count * 0.1, 0.85),
      derived: true,
      from: match.roomId,
      id: `references:${match.roomId}:${match.secondaryId}`,
      provenance: uniqueStrings(match.filePaths),
      source: 'content-cooccurrence',
      to: match.secondaryId,
      type: 'references',
    })
  }

  const graphEdges = [...containsEdges, ...belongsToRoomEdges, ...referenceEdges]

  return {
    generatedAt: new Date().toISOString(),
    nodes: graphNodes,
    scannedFiles,
    summary: {
      edgeCount: graphEdges.length,
      entityCount: entityNodes.filter((node) => node.type === 'entity').length,
      nodeCount: graphNodes.length,
      projectCount: entityNodes.filter((node) => node.type === 'project').length,
      roomCount: roomNodes.length,
    },
    target: {
      kind: args.targetKind,
      label: args.targetLabel,
      path: args.targetPath,
      repoRelativePath: args.repoRelativePath,
      slug: args.targetSlug,
    },
    edges: graphEdges,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mempalaceDir = path.join(args.targetPath, '.workspace', 'mempalace')
  const yamlPath = path.join(mempalaceDir, 'mempalace.yaml')
  const entitiesPath = path.join(mempalaceDir, 'entities.json')
  const yamlContent = await readTextIfPresent(yamlPath)
  const entities = await readJsonIfPresent(entitiesPath)
  const scannedPaths = await walkTextFiles(args.targetPath)
  const scannedContent = await Promise.all(
    limitList(scannedPaths, 160).map(async (filePath) => ({
      content: normalizeText(await readFile(filePath, 'utf8')),
      relativePath: path.relative(args.targetPath, filePath) || path.basename(filePath),
    })),
  )

  const graph = buildGraphDocument(
    args,
    {
      entitiesPath: entities ? entitiesPath : null,
      yamlPath: yamlContent ? yamlPath : null,
    },
    {
      entities,
      yaml: yamlContent ? parseMempalaceYaml(yamlContent) : { rooms: [], wing: 'memory' },
    },
    scannedContent.map((entry) => entry.relativePath),
    scannedContent,
  )

  await mkdir(args.outputDir, { recursive: true })

  const graphJsonPath = path.join(args.outputDir, 'graph.json')
  const graphHtmlPath = path.join(args.outputDir, 'graph.html')
  const graphReportPath = path.join(args.outputDir, 'graph-report.md')

  await writeFile(graphJsonPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8')
  await writeFile(
    graphHtmlPath,
    buildHtmlDocument(graph),
    'utf8',
  )
  await writeFile(
    graphReportPath,
    `${buildReport(
      graph,
      {
        entitiesPath: entities ? entitiesPath : null,
        yamlPath: yamlContent ? yamlPath : null,
      },
      scannedContent.map((entry) => entry.relativePath),
    )}\n`,
    'utf8',
  )

  console.log(`Built graph for ${graph.target.label}`)
  console.log(`Output directory: ${args.outputDir}`)
  console.log(`Nodes: ${graph.summary.nodeCount}`)
  console.log(`Edges: ${graph.summary.edgeCount}`)
  console.log(`graph.json: ${graphJsonPath}`)
  console.log(`graph.html: ${graphHtmlPath}`)
  console.log(`graph-report.md: ${graphReportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


TEXT_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".py"}
ACTION_NAMES = {"validate", "normalize", "segment", "distill", "export"}


INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Knowledge Palace UI</title>
  <style>
    :root {
      --bg: #f5f1e8;
      --panel: #fffaf1;
      --line: #d6c8b1;
      --ink: #2d2418;
      --muted: #756754;
      --accent: #9a4d21;
      --accent-soft: #efd3bd;
      --ok: #1f6b45;
      --warn: #8a5a12;
      --code: "IBM Plex Mono", "SFMono-Regular", monospace;
      --sans: "Iowan Old Style", "Palatino Linotype", serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(154, 77, 33, 0.16), transparent 25%),
        linear-gradient(180deg, #f9f5ed 0%, var(--bg) 100%);
      min-height: 100vh;
    }
    .app {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr) 320px;
      min-height: 100vh;
    }
    .panel {
      border-right: 1px solid var(--line);
      background: rgba(255, 250, 241, 0.88);
      backdrop-filter: blur(8px);
      overflow: auto;
    }
    .panel:last-child {
      border-right: 0;
      border-left: 1px solid var(--line);
    }
    .section {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(214, 200, 177, 0.75);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 1.35rem; }
    h2 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 10px; }
    .tree button, .action-button, .save-button {
      appearance: none;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--ink);
      cursor: pointer;
      border-radius: 12px;
      padding: 10px 12px;
      width: 100%;
      text-align: left;
      font-family: inherit;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
    }
    .tree button:hover, .action-button:hover, .save-button:hover {
      transform: translateY(-1px);
      border-color: var(--accent);
    }
    .tree ul {
      list-style: none;
      margin: 8px 0 0;
      padding-left: 16px;
    }
    .tree li { margin: 6px 0; }
    .node.is-file > button {
      font-family: var(--code);
      font-size: 0.88rem;
    }
    .editor-wrap {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .editor-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 20px 24px 12px;
    }
    .editor-meta { color: var(--muted); font-size: 0.92rem; }
    .editor {
      flex: 1;
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
    }
    textarea {
      width: 100%;
      min-height: calc(100vh - 150px);
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      background: rgba(255, 255, 255, 0.9);
      color: var(--ink);
      font-family: var(--code);
      font-size: 0.92rem;
      line-height: 1.5;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
    }
    .toolbar {
      display: grid;
      gap: 10px;
    }
    .action-button.primary, .save-button {
      background: var(--accent);
      color: #fffaf1;
      border-color: var(--accent);
    }
    .save-button[disabled] {
      opacity: 0.55;
      cursor: default;
      transform: none;
    }
    .status {
      white-space: pre-wrap;
      font-family: var(--code);
      font-size: 0.84rem;
      background: rgba(239, 211, 189, 0.42);
      border: 1px solid rgba(154, 77, 33, 0.22);
      border-radius: 16px;
      padding: 14px;
      min-height: 180px;
    }
    .status.ok { color: var(--ok); }
    .status.warn { color: var(--warn); }
    .pill {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.75rem;
      margin-top: 8px;
    }
    @media (max-width: 1100px) {
      .app { grid-template-columns: 260px minmax(0, 1fr); }
      .panel:last-child { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line); }
    }
    @media (max-width: 760px) {
      .app { grid-template-columns: 1fr; }
      .panel { border-right: 0; border-bottom: 1px solid var(--line); }
      .editor-head { flex-direction: column; align-items: flex-start; }
      textarea { min-height: 50vh; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="panel">
      <div class="section">
        <h1>Knowledge Palace</h1>
        <p class="pill">Local Web UI</p>
      </div>
      <div class="section">
        <h2>Files</h2>
        <div id="tree" class="tree"></div>
      </div>
    </aside>
    <main class="editor-wrap">
      <div class="editor-head">
        <div>
          <h1 id="file-title">Select a file</h1>
          <p id="file-meta" class="editor-meta">Markdown, YAML, JSON, CSV, and Python files can be edited here.</p>
        </div>
        <button id="save-button" class="save-button" disabled>Save</button>
      </div>
      <div class="editor">
        <textarea id="editor" placeholder="Choose a file from the left."></textarea>
      </div>
    </main>
    <aside class="panel">
      <div class="section">
        <h2>Actions</h2>
        <div class="toolbar">
          <button class="action-button primary" data-action="validate">Validate Repo</button>
          <button class="action-button" data-action="normalize">Normalize Event</button>
          <button class="action-button" data-action="segment">Segment Source</button>
          <button class="action-button" data-action="distill">Distill Event</button>
          <button class="action-button" data-action="export">Export Pack</button>
        </div>
      </div>
      <div class="section">
        <h2>Selection</h2>
        <p id="selection-summary" class="editor-meta">Select an event manifest, processed manifest, or source file to run actions.</p>
      </div>
      <div class="section">
        <h2>Status</h2>
        <div id="status" class="status">Ready.</div>
      </div>
    </aside>
  </div>
  <script>
    const treeEl = document.getElementById("tree");
    const editorEl = document.getElementById("editor");
    const saveButton = document.getElementById("save-button");
    const fileTitle = document.getElementById("file-title");
    const fileMeta = document.getElementById("file-meta");
    const statusEl = document.getElementById("status");
    const selectionSummary = document.getElementById("selection-summary");
    let currentPath = "";
    let currentDirty = false;

    function setStatus(message, mode = "warn") {
      statusEl.textContent = message;
      statusEl.className = "status " + mode;
    }

    function setDirty(value) {
      currentDirty = value;
      saveButton.disabled = !currentPath || !currentDirty;
    }

    function describeSelection(path) {
      if (!path) {
        selectionSummary.textContent = "Select an event manifest, processed manifest, or source file to run actions.";
        return;
      }
      const hints = [];
      if (path.endsWith("source-manifest.yaml")) hints.push("normalize");
      if (path.includes("processed/manifests/") && path.endsWith(".yaml") && !path.endsWith(".distilled.yaml")) hints.push("distill", "export");
      if (path.includes("raw/events/")) hints.push("segment if this is a source manifest/source path");
      selectionSummary.textContent = hints.length ? `${path} -> ${hints.join(", ")}` : path;
    }

    async function loadTree() {
      const response = await fetch("/api/tree");
      const payload = await response.json();
      treeEl.innerHTML = "";
      treeEl.appendChild(renderNodes(payload.items));
    }

    function renderNodes(nodes) {
      const ul = document.createElement("ul");
      for (const node of nodes) {
        const li = document.createElement("li");
        li.className = `node ${node.type === "file" ? "is-file" : "is-dir"}`;
        const button = document.createElement("button");
        button.textContent = node.name;
        button.onclick = () => {
          if (node.type === "file") {
            openFile(node.path);
          } else {
            li.classList.toggle("open");
            if (!li.dataset.loaded) {
              fetch(`/api/tree?path=${encodeURIComponent(node.path)}`)
                .then((r) => r.json())
                .then((payload) => {
                  li.appendChild(renderNodes(payload.items));
                  li.dataset.loaded = "true";
                })
                .catch((error) => setStatus(String(error)));
            }
          }
        };
        li.appendChild(button);
        ul.appendChild(li);
      }
      return ul;
    }

    async function openFile(path) {
      const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const payload = await response.json();
      currentPath = payload.path;
      editorEl.value = payload.content;
      fileTitle.textContent = payload.path;
      fileMeta.textContent = `${payload.kind} file · ${payload.size} bytes`;
      setDirty(false);
      describeSelection(payload.path);
      setStatus(`Opened ${payload.path}`, "ok");
    }

    async function saveCurrentFile() {
      if (!currentPath) return;
      const response = await fetch("/api/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, content: editorEl.value })
      });
      const payload = await response.json();
      setDirty(false);
      setStatus(payload.message, "ok");
    }

    async function runAction(action) {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, path: currentPath })
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error || "Action failed.");
        return;
      }
      setStatus(payload.output || payload.message, payload.returncode === 0 ? "ok" : "warn");
      loadTree();
    }

    editorEl.addEventListener("input", () => setDirty(true));
    saveButton.addEventListener("click", saveCurrentFile);
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => runAction(button.dataset.action));
    });
    loadTree().catch((error) => setStatus(String(error)));
  </script>
</body>
</html>
"""


@dataclass
class UIActionResult:
    command: list[str]
    returncode: int
    output: str


def safe_resolve(root: Path, relative_path: str | None) -> Path:
    resolved_root = root.resolve()
    candidate = (resolved_root / (relative_path or "")).resolve()
    if resolved_root not in candidate.parents and candidate != resolved_root:
        raise ValueError("Path escapes repository root.")
    return candidate


def list_tree(root: Path, relative_path: str = "") -> list[dict[str, str]]:
    resolved_root = root.resolve()
    base = safe_resolve(resolved_root, relative_path)
    if not base.is_dir():
        raise FileNotFoundError(base)
    items: list[dict[str, str]] = []
    for child in sorted(base.iterdir(), key=lambda item: (item.is_file(), item.name.lower())):
        if child.name.startswith(".") and child.name not in {".gitignore"}:
            continue
        rel = child.relative_to(resolved_root).as_posix()
        if child.is_dir() or child.suffix.lower() in TEXT_EXTENSIONS:
            items.append({"name": child.name, "path": rel, "type": "dir" if child.is_dir() else "file"})
    return items


def load_text_file(root: Path, relative_path: str) -> dict[str, Any]:
    resolved_root = root.resolve()
    path = safe_resolve(resolved_root, relative_path)
    if not path.is_file():
        raise FileNotFoundError(path)
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        raise ValueError("Only text-like files can be opened in the UI.")
    content = path.read_text(encoding="utf-8")
    return {
        "path": path.relative_to(resolved_root).as_posix(),
        "content": content,
        "kind": path.suffix.lower().lstrip(".") or "text",
        "size": len(content.encode("utf-8")),
    }


def save_text_file(root: Path, relative_path: str, content: str) -> dict[str, str]:
    resolved_root = root.resolve()
    path = safe_resolve(resolved_root, relative_path)
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        raise ValueError("Only text-like files can be saved in the UI.")
    path.write_text(content, encoding="utf-8")
    return {"message": f"Saved {path.relative_to(resolved_root).as_posix()}"}


def derive_action_command(root: Path, action: str, selected_path: str | None) -> list[str]:
    if action not in ACTION_NAMES:
        raise ValueError(f"Unsupported action: {action}")
    base = ["python3", "-m", "knowledge_palace.cli", "--root", str(root)]
    selected = selected_path or ""
    if action == "validate":
        return [*base, "validate"]
    if action == "normalize":
        if not selected.endswith("source-manifest.yaml"):
            raise ValueError("Select a raw event source manifest to normalize.")
        return [*base, "normalize", "--manifest", selected]
    if action == "segment":
        if selected.endswith("source-manifest.yaml"):
            raise ValueError("Select a raw source file or processed source context for segmentation, not the manifest itself.")
        if "/raw/events/" not in f"/{selected}" and not selected.startswith("raw/events/"):
            raise ValueError("Select a raw event source file under raw/events/ to segment.")
        source_slug = Path(selected).parent.name
        return [*base, "segment", "--source", f"src_{source_slug}"]
    if action == "distill":
        if "processed/manifests/" not in selected or not selected.endswith(".yaml") or selected.endswith(".distilled.yaml"):
            raise ValueError("Select a processed manifest to distill.")
        return [*base, "distill", "--manifest", selected]
    if action == "export":
        if "processed/manifests/" not in selected or not selected.endswith(".yaml") or selected.endswith(".distilled.yaml"):
            raise ValueError("Select a processed manifest to export.")
        return [*base, "export", "--target", "markdown", "--manifest", selected]
    raise ValueError(f"Unhandled action: {action}")


def run_ui_action(root: Path, action: str, selected_path: str | None) -> UIActionResult:
    command = derive_action_command(root, action, selected_path)
    completed = subprocess.run(command, cwd=root, capture_output=True, text=True, check=False)
    output = "\n".join(part for part in [completed.stdout.strip(), completed.stderr.strip()] if part).strip() or "Command finished."
    return UIActionResult(command=command, returncode=completed.returncode, output=output)


def create_handler(root: Path) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def _send_json(self, payload: dict[str, Any], status: int = HTTPStatus.OK) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _send_html(self, body: str) -> None:
            encoded = body.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def _read_json(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(length).decode("utf-8") if length else "{}"
            return json.loads(payload)

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/":
                self._send_html(INDEX_HTML)
                return
            if parsed.path == "/api/tree":
                query = parse_qs(parsed.query)
                relative_path = query.get("path", [""])[0]
                self._send_json({"items": list_tree(root, relative_path)})
                return
            if parsed.path == "/api/file":
                query = parse_qs(parsed.query)
                relative_path = query.get("path", [""])[0]
                self._send_json(load_text_file(root, relative_path))
                return
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:  # noqa: N802
            try:
                payload = self._read_json()
                if self.path == "/api/file":
                    result = save_text_file(root, payload["path"], payload["content"])
                    self._send_json(result)
                    return
                if self.path == "/api/action":
                    result = run_ui_action(root, payload["action"], payload.get("path"))
                    status = HTTPStatus.OK if result.returncode == 0 else HTTPStatus.BAD_REQUEST
                    self._send_json(
                        {
                            "command": result.command,
                            "returncode": result.returncode,
                            "output": result.output,
                        },
                        status=status,
                    )
                    return
                self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            except (KeyError, ValueError, FileNotFoundError) as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
            return

    return Handler


def serve_ui(root: Path, host: str = "127.0.0.1", port: int = 8765) -> None:
    server = ThreadingHTTPServer((host, port), create_handler(root))
    print(f"Knowledge Palace UI available at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

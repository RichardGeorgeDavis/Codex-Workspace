from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

from .utils import (
    compute_checksum,
    copy_file,
    ensure_dir,
    first_sentence,
    list_text_lines,
    now_iso,
    read_json,
    read_yaml,
    repo_relative,
    slugify,
    titleize,
    today_iso,
    upsert_jsonl,
    write_json,
    write_yaml,
)


SUPPORTED_EXPORT_TARGETS = {
    "markdown",
    "chatgpt",
    "codex",
    "cursor",
    "notebooklm",
    "gemini",
    "antigravity",
}


def build_source_id(source_slug: str) -> str:
    return f"src_{source_slug}"


def build_segment_id(source_slug: str, index: int) -> str:
    return f"seg_{source_slug}-{index:03d}"


def build_claim_id(event_slug: str, source_slug: str, index: int) -> str:
    return f"clm_{event_slug}-{source_slug}-{index:03d}"


def build_workflow_id(event_slug: str, source_slug: str, index: int) -> str:
    return f"wf_{event_slug}-{source_slug}-{index:03d}"


def build_card_id(event_slug: str, source_slug: str) -> str:
    return f"card_{event_slug}-{source_slug}"


def detect_source_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".md", ".txt"}:
        return "transcript"
    if suffix in {".pdf"}:
        return "slide_deck"
    return "document"


def repo_root_from(path: str | Path | None = None) -> Path:
    if path is not None:
        return Path(path).resolve()
    return Path(__file__).resolve().parents[1]


def load_source_manifest(path: Path) -> dict[str, Any]:
    payload = read_yaml(path)
    if not isinstance(payload, dict):
        raise ValueError(f"Manifest {path} must be a YAML object.")
    return payload


def find_raw_manifest_for_source(root: Path, source_ref: str) -> Path:
    path_candidate = Path(source_ref)
    if path_candidate.suffix and path_candidate.exists():
        return path_candidate.resolve()
    for manifest_path in (root / "raw" / "events").glob("*/source-manifest.yaml"):
        manifest = load_source_manifest(manifest_path)
        for source in manifest.get("sources", []):
            if source["id"] == source_ref or source["file_path"] == source_ref:
                return manifest_path
    raise FileNotFoundError(f"Could not locate manifest for source reference: {source_ref}")


def intake_event(
    root: Path,
    input_path: Path,
    event_slug: str | None = None,
    title: str | None = None,
    source_type: str | None = None,
) -> Path:
    source_input = input_path.resolve()
    if not source_input.exists():
        raise FileNotFoundError(source_input)

    event_slug = slugify(event_slug or source_input.stem)
    event_title = title or titleize(event_slug)
    source_slug = slugify(source_input.stem)
    source_id = build_source_id(source_slug)
    raw_event_dir = root / "raw" / "events" / event_slug
    raw_source_dir = raw_event_dir / source_slug
    destination = raw_source_dir / f"original{source_input.suffix.lower()}"
    copy_file(source_input, destination)

    manifest_path = raw_event_dir / "source-manifest.yaml"
    if manifest_path.exists():
        manifest = load_source_manifest(manifest_path)
    else:
        manifest = {
            "id": f"manifest_{event_slug}",
            "slug": event_slug,
            "collection_type": "events",
            "title": event_title,
            "generated_on": today_iso(),
            "sources": [],
        }

    source_record = {
        "id": source_id,
        "title": titleize(source_slug),
        "slug": source_slug,
        "source_type": source_type or detect_source_type(source_input),
        "collection_type": "events",
        "collection_slug": event_slug,
        "creator_or_author": "unknown",
        "date_created_or_published": None,
        "date_ingested": today_iso(),
        "language": "en",
        "rights_note": "Needs review",
        "origin": str(source_input),
        "file_path": repo_relative(root, destination),
        "checksum": compute_checksum(destination),
        "source_url": None,
        "status": "unreviewed",
    }

    sources = [item for item in manifest["sources"] if item["id"] != source_id]
    sources.append(source_record)
    manifest["sources"] = sorted(sources, key=lambda item: item["id"])
    write_yaml(manifest_path, manifest)
    return manifest_path


def normalize_event(root: Path, manifest_path: Path) -> Path:
    manifest = load_source_manifest(manifest_path)
    event_slug = manifest["slug"]
    normalized_sources: list[dict[str, Any]] = []

    for source in manifest["sources"]:
        raw_path = root / source["file_path"]
        cleaned_path = root / "processed" / "cleaned-text" / event_slug / f"{source['slug']}.md"
        if raw_path.suffix.lower() in {".md", ".txt"}:
            body = raw_path.read_text(encoding="utf-8").replace("\r\n", "\n")
            body = re.sub(r"(?s)\A---\n.*?\n---\n+", "", body).strip() + "\n"
        else:
            body = (
                f"# Unsupported source for v1 normalization\n\n"
                f"- source_id: {source['id']}\n"
                f"- file_path: {source['file_path']}\n"
            )
        cleaned_path.parent.mkdir(parents=True, exist_ok=True)
        cleaned_path.write_text(body, encoding="utf-8")
        normalized_sources.append(
            {
                "source_id": source["id"],
                "source_slug": source["slug"],
                "cleaned_text_path": repo_relative(root, cleaned_path),
                "cleaned_checksum": compute_checksum(cleaned_path),
                "status": "unreviewed",
            }
        )

    processed_manifest = {
        "id": f"processed_{event_slug}",
        "slug": event_slug,
        "collection_type": "events",
        "raw_manifest_path": repo_relative(root, manifest_path),
        "generated_on": now_iso(),
        "normalized_sources": normalized_sources,
    }
    processed_manifest_path = root / "processed" / "manifests" / f"{event_slug}.yaml"
    write_yaml(processed_manifest_path, processed_manifest)
    return processed_manifest_path


def _split_segments(body: str) -> list[dict[str, str]]:
    segments: list[dict[str, str]] = []
    current_title = "Opening"
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_lines
        text = "\n".join(current_lines).strip()
        if text:
            segments.append({"title": current_title, "body": text})
        current_lines = []

    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            flush()
            current_title = stripped.lstrip("# ").strip() or "Untitled"
            continue
        if not stripped and current_lines:
            current_lines.append("")
            continue
        if stripped:
            current_lines.append(line.rstrip())
    flush()

    if not segments:
        paragraphs = [chunk.strip() for chunk in body.split("\n\n") if chunk.strip()]
        segments = [{"title": f"Segment {index}", "body": chunk} for index, chunk in enumerate(paragraphs, start=1)]
    return segments


def segment_source(root: Path, source_ref: str, manifest_path: Path | None = None) -> Path:
    raw_manifest_path = manifest_path.resolve() if manifest_path else find_raw_manifest_for_source(root, source_ref)
    raw_manifest = load_source_manifest(raw_manifest_path)
    event_slug = raw_manifest["slug"]
    source = next(
        (
            item
            for item in raw_manifest["sources"]
            if item["id"] == source_ref or item["file_path"] == source_ref or item["slug"] == source_ref
        ),
        None,
    )
    if source is None:
        raise ValueError(f"Could not find source '{source_ref}' in {raw_manifest_path}")

    processed_manifest_path = root / "processed" / "manifests" / f"{event_slug}.yaml"
    processed_manifest = read_yaml(processed_manifest_path)
    normalized_source = next(item for item in processed_manifest["normalized_sources"] if item["source_id"] == source["id"])

    cleaned_path = root / normalized_source["cleaned_text_path"]
    segment_defs = _split_segments(cleaned_path.read_text(encoding="utf-8"))
    segments: list[dict[str, Any]] = []
    for index, segment_def in enumerate(segment_defs, start=1):
        segments.append(
            {
                "id": build_segment_id(source["slug"], index),
                "source_id": source["id"],
                "title": segment_def["title"],
                "segment_type": "section",
                "segment_ref": f"segment-{index:03d}",
                "body": segment_def["body"],
                "topics": [event_slug],
                "status": "unreviewed",
            }
        )

    segment_path = root / "processed" / "segments" / event_slug / f"{source['slug']}.json"
    write_json(segment_path, segments)

    normalized_source["segment_path"] = repo_relative(root, segment_path)
    normalized_source["segment_count"] = len(segments)
    processed_manifest["generated_on"] = now_iso()
    write_yaml(processed_manifest_path, processed_manifest)
    return segment_path


def _extract_workflow_steps(body: str) -> list[str]:
    lines = list_text_lines(body)
    numbered = []
    for line in lines:
        if line[:2].isdigit() and "." in line:
            numbered.append(line.split(".", 1)[1].strip())
        elif line.startswith("- "):
            numbered.append(line[2:].strip())
    return numbered


def distill_event(root: Path, manifest_path: Path) -> dict[str, Path]:
    processed_manifest = read_yaml(manifest_path)
    raw_manifest = load_source_manifest(root / processed_manifest["raw_manifest_path"])
    event_slug = processed_manifest["slug"]
    raw_source_map = {source["id"]: source for source in raw_manifest["sources"]}

    card_paths: list[str] = []
    workflow_rows: list[dict[str, Any]] = []
    claim_rows: list[dict[str, Any]] = []

    for source_item in processed_manifest["normalized_sources"]:
        if "segment_path" not in source_item:
            raise ValueError(f"Source {source_item['source_id']} has not been segmented.")
        source = raw_source_map[source_item["source_id"]]
        segments = read_json(root / source_item["segment_path"])
        if not segments:
            continue

        primary_segment = segments[0]
        claim = {
            "id": build_claim_id(event_slug, source["slug"], 1),
            "claim_text": first_sentence(primary_segment["body"]),
            "claim_type": "direct_statement",
            "speaker_or_source": source["title"],
            "topic": event_slug,
            "evidence_strength": "direct",
            "source_refs": [primary_segment["id"]],
            "verification_state": "unreviewed",
        }
        claim_rows.append(claim)

        workflow_steps = _extract_workflow_steps("\n\n".join(segment["body"] for segment in segments))
        if not workflow_steps:
            workflow_steps = [segment["title"] for segment in segments[:3]]
        workflow = {
            "id": build_workflow_id(event_slug, source["slug"], 1),
            "workflow_name": f"{titleize(event_slug)} Review Loop",
            "goal": f"Capture reusable insights from {source['title']}.",
            "steps": workflow_steps,
            "preconditions": ["Source has been ingested and normalized."],
            "decision_points": ["Decide which ideas are reusable beyond the event context."],
            "risks": ["Capturing interpretation without enough provenance."],
            "best_use_cases": ["Event debriefs", "Post-session synthesis"],
            "source_refs": [segment["id"] for segment in segments],
        }
        workflow_rows.append(workflow)

        card = {
            "id": build_card_id(event_slug, source["slug"]),
            "title": f"{titleize(event_slug)} — {source['title']}",
            "slug": f"{event_slug}-{source['slug']}",
            "type": "event-insight",
            "topics": [event_slug, "events"],
            "source_refs": [segment["id"] for segment in segments],
            "statement_types_present": ["claim", "workflow"],
            "verification_state": "unreviewed",
            "created_by": "knowledge-palace-cli",
            "date_created": today_iso(),
            "summary": " ".join(first_sentence(segment["body"]) for segment in segments[:2]).strip(),
        }
        card_path = root / "cards" / "concepts" / f"{card['slug']}.json"
        write_json(card_path, card)
        card_paths.append(repo_relative(root, card_path))

        workflow_path = root / "cards" / "workflows" / f"{event_slug}-{source['slug']}.json"
        write_json(workflow_path, workflow)

    upsert_jsonl(root / "graph" / "claims.jsonl", claim_rows)
    upsert_jsonl(root / "graph" / "workflows.jsonl", workflow_rows)

    distillation_record = {
        "claim_ids": [row["id"] for row in claim_rows],
        "workflow_ids": [row["id"] for row in workflow_rows],
        "card_paths": card_paths,
    }
    distill_path = root / "processed" / "manifests" / f"{event_slug}.distilled.yaml"
    write_yaml(distill_path, distillation_record)
    return {"distill_manifest": distill_path}


def export_pack(root: Path, target: str, manifest_path: Path) -> Path:
    if target not in SUPPORTED_EXPORT_TARGETS:
        raise ValueError(f"Unsupported export target: {target}")

    processed_manifest = read_yaml(manifest_path)
    raw_manifest = load_source_manifest(root / processed_manifest["raw_manifest_path"])
    event_slug = processed_manifest["slug"]
    cards = []
    for card_path in (root / "cards" / "concepts").glob(f"{event_slug}-*.json"):
        cards.append(read_json(card_path))
    workflows = [row for row in read_json_lines(root / "graph" / "workflows.jsonl") if row["id"].startswith(f"wf_{event_slug}-")]
    claims = [row for row in read_json_lines(root / "graph" / "claims.jsonl") if row["id"].startswith(f"clm_{event_slug}-")]

    lines = [
        f"# {raw_manifest['title']}",
        "",
        f"- target: {target}",
        f"- slug: {event_slug}",
        f"- generated_on: {now_iso()}",
        "",
        "## Sources",
    ]
    for source in raw_manifest["sources"]:
        lines.append(f"- {source['title']} (`{source['id']}`)")
    lines.extend(["", "## Claims"])
    for claim in claims:
        lines.append(f"- {claim['claim_text']} ({', '.join(claim['source_refs'])})")
    lines.extend(["", "## Workflows"])
    for workflow in workflows:
        lines.append(f"- {workflow['workflow_name']}: {' -> '.join(workflow['steps'])}")
    lines.extend(["", "## Cards"])
    for card in cards:
        lines.append(f"- {card['title']}: {card['summary']}")
    lines.append("")

    export_dir = root / "exports" / target / event_slug
    ensure_dir(export_dir)
    pack_path = export_dir / "pack.md"
    pack_path.write_text("\n".join(lines), encoding="utf-8")

    manifest = {
        "target": target,
        "slug": event_slug,
        "generated_on": now_iso(),
        "files": [repo_relative(root, pack_path)],
        "notes": f"Generated from {processed_manifest['raw_manifest_path']}",
    }
    manifest_path_out = export_dir / "manifest.json"
    write_json(manifest_path_out, manifest)
    return pack_path


def read_json_lines(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [read_json_line(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_json_line(line: str) -> dict[str, Any]:
    import json

    return json.loads(line)


def run_intake_command(args: argparse.Namespace) -> Path:
    return intake_event(
        root=repo_root_from(args.root),
        input_path=Path(args.input),
        event_slug=args.event_slug,
        title=args.title,
        source_type=args.source_type,
    )


def run_normalize_command(args: argparse.Namespace) -> Path:
    root = repo_root_from(args.root)
    return normalize_event(root=root, manifest_path=Path(args.manifest))


def run_segment_command(args: argparse.Namespace) -> Path:
    root = repo_root_from(args.root)
    manifest_path = Path(args.manifest) if args.manifest else None
    return segment_source(root=root, source_ref=args.source, manifest_path=manifest_path)


def run_distill_command(args: argparse.Namespace) -> dict[str, Path]:
    return distill_event(root=repo_root_from(args.root), manifest_path=Path(args.manifest))


def run_export_command(args: argparse.Namespace) -> Path:
    return export_pack(root=repo_root_from(args.root), target=args.target, manifest_path=Path(args.manifest))

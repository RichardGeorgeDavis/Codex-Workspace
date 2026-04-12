from __future__ import annotations

import shutil
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]


def temporary_repo() -> TemporaryDirectory:
    return TemporaryDirectory()


def seed_repo(temp_root: Path) -> None:
    for file_name in [
        "README.md",
        "handover.md",
        "palace.config.yaml",
        "collections.yaml",
        "source-types.yaml",
        "ingestion-rules.yaml",
        "export-targets.yaml",
        "pyproject.toml",
    ]:
        shutil.copy2(ROOT / file_name, temp_root / file_name)

    for folder in [
        "schemas",
        "examples",
    ]:
        shutil.copytree(ROOT / folder, temp_root / folder)

    for folder in [
        "raw/events",
        "raw/courses",
        "raw/people",
        "raw/books",
        "processed/manifests",
        "processed/cleaned-text",
        "processed/segments",
        "cards/concepts",
        "cards/workflows",
        "exports/markdown",
        "exports/codex",
        "graph",
        "inbox/events",
        "inbox/courses",
        "inbox/people",
        "inbox/books",
        "inbox/mixed",
    ]:
        (temp_root / folder).mkdir(parents=True, exist_ok=True)

    for jsonl_name in ["claims.jsonl", "workflows.jsonl", "entities.jsonl", "reflections.jsonl", "relationships.jsonl", "timelines.jsonl"]:
        (temp_root / "graph" / jsonl_name).write_text("", encoding="utf-8")

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from .utils import SLUG_PATTERN, load_jsonl, read_json, read_yaml


REQUIRED_ROOT_FILES = [
    "README.md",
    "handover.md",
    "palace.config.yaml",
    "collections.yaml",
    "source-types.yaml",
    "ingestion-rules.yaml",
    "export-targets.yaml",
]

ID_PATTERNS = {
    "source": re.compile(r"^src_[a-z0-9]+(?:-[a-z0-9]+)*$"),
    "segment": re.compile(r"^seg_[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$"),
    "claim": re.compile(r"^clm_[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$"),
    "workflow": re.compile(r"^wf_[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$"),
    "knowledge_card": re.compile(r"^card_[a-z0-9]+(?:-[a-z0-9]+)*$"),
    "chat": re.compile(r"^chat_[a-z0-9]+(?:-[a-z0-9]+)*$"),
}


def _load_schemas(root: Path) -> dict[str, Draft202012Validator]:
    validators: dict[str, Draft202012Validator] = {}
    for path in (root / "schemas").glob("*.json"):
        schema = read_json(path)
        Draft202012Validator.check_schema(schema)
        validators[path.name] = Draft202012Validator(schema)
    return validators


def _validate_root(root: Path) -> list[str]:
    errors: list[str] = []
    for rel in REQUIRED_ROOT_FILES:
        if not (root / rel).exists():
            errors.append(f"Missing required root file: {rel}")
    return errors


def _validate_yaml_files(root: Path) -> list[str]:
    errors: list[str] = []
    for path in list((root / "examples").glob("**/*.yaml")) + list((root / "raw").glob("**/*.yaml")) + list((root / "processed").glob("**/*.yaml")):
        try:
            read_yaml(path)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Invalid YAML in {path.relative_to(root)}: {exc}")
    return errors


def _validate_json_files(root: Path) -> list[str]:
    errors: list[str] = []
    for path in list((root / "schemas").glob("*.json")) + list((root / "examples").glob("**/*.json")) + list((root / "cards").glob("**/*.json")) + list((root / "exports").glob("**/*.json")) + list((root / "processed").glob("**/*.json")):
        try:
            read_json(path)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Invalid JSON in {path.relative_to(root)}: {exc}")
    return errors


def _validation_errors(validator: Draft202012Validator, payload: Any) -> list[str]:
    return [error.message for error in validator.iter_errors(payload)]


def _validate_source_manifest(root: Path, path: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    manifest = read_yaml(path)
    if not isinstance(manifest, dict):
        return [f"{path.relative_to(root)} must be a YAML object."]
    if manifest.get("collection_type") != "events":
        errors.append(f"{path.relative_to(root)} must declare collection_type: events.")
    slug = manifest.get("slug")
    if not isinstance(slug, str) or not SLUG_PATTERN.match(slug):
        errors.append(f"{path.relative_to(root)} has invalid manifest slug.")
    sources = manifest.get("sources")
    if not isinstance(sources, list) or not sources:
        errors.append(f"{path.relative_to(root)} must contain at least one source.")
        return errors
    for source in sources:
        source_errors = _validation_errors(validators["source.schema.json"], source)
        errors.extend(f"{path.relative_to(root)}: {message}" for message in source_errors)
        if "slug" in source and not SLUG_PATTERN.match(source["slug"]):
            errors.append(f"{path.relative_to(root)} source slug is invalid: {source['slug']}")
        if "id" in source and not ID_PATTERNS["source"].match(source["id"]):
            errors.append(f"{path.relative_to(root)} source id is invalid: {source['id']}")
        file_path = source.get("file_path")
        if not isinstance(file_path, str) or not (root / file_path).exists():
            errors.append(f"{path.relative_to(root)} file_path does not exist: {file_path}")
    return errors


def _validate_processed_manifest(root: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    for path in (root / "processed" / "manifests").glob("*.yaml"):
        if path.name.endswith(".distilled.yaml"):
            continue
        payload = read_yaml(path)
        if not isinstance(payload, dict):
            errors.append(f"{path.relative_to(root)} must be a YAML object.")
            continue
        raw_manifest_path = payload.get("raw_manifest_path")
        if not isinstance(raw_manifest_path, str) or not (root / raw_manifest_path).exists():
            errors.append(f"{path.relative_to(root)} raw_manifest_path is missing or invalid.")
        for source in payload.get("normalized_sources", []):
            cleaned_path = source.get("cleaned_text_path")
            if not isinstance(cleaned_path, str) or not (root / cleaned_path).exists():
                errors.append(f"{path.relative_to(root)} cleaned_text_path is missing or invalid.")
            segment_path = source.get("segment_path")
            if segment_path is not None:
                full_segment_path = root / segment_path
                if not full_segment_path.exists():
                    errors.append(f"{path.relative_to(root)} segment_path is missing or invalid.")
                else:
                    try:
                        segments = read_json(full_segment_path)
                    except Exception as exc:  # noqa: BLE001
                        errors.append(f"{path.relative_to(root)} segment_path could not be loaded: {exc}")
                        continue
                    if not isinstance(segments, list):
                        errors.append(f"{path.relative_to(root)} segment file must contain a JSON array.")
                        continue
                    for segment in segments:
                        errors.extend(
                            f"{full_segment_path.relative_to(root)}: {message}"
                            for message in _validation_errors(validators["source-segment.schema.json"], segment)
                        )
                        if not ID_PATTERNS["segment"].match(segment["id"]):
                            errors.append(f"{full_segment_path.relative_to(root)} segment id is invalid: {segment['id']}")
    return errors


def _validate_graph_jsonl(root: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    for path, schema_name, id_key in [
        (root / "graph" / "claims.jsonl", "claim.schema.json", "claim"),
        (root / "graph" / "workflows.jsonl", "workflow.schema.json", "workflow"),
    ]:
        for row in load_jsonl(path):
            errors.extend(f"{path.relative_to(root)}: {message}" for message in _validation_errors(validators[schema_name], row))
            if not ID_PATTERNS[id_key].match(row["id"]):
                errors.append(f"{path.relative_to(root)} id is invalid: {row['id']}")
            if not row.get("source_refs"):
                errors.append(f"{path.relative_to(root)} object {row['id']} must include source_refs.")
    return errors


def _validate_cards(root: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    for path in (root / "cards" / "concepts").glob("*.json"):
        card = read_json(path)
        errors.extend(f"{path.relative_to(root)}: {message}" for message in _validation_errors(validators["knowledge-card.schema.json"], card))
        if not ID_PATTERNS["knowledge_card"].match(card["id"]):
            errors.append(f"{path.relative_to(root)} card id is invalid: {card['id']}")
        if not card.get("source_refs"):
            errors.append(f"{path.relative_to(root)} card {card['id']} must include source_refs.")
    for path in (root / "cards" / "workflows").glob("*.json"):
        workflow = read_json(path)
        errors.extend(f"{path.relative_to(root)}: {message}" for message in _validation_errors(validators["workflow.schema.json"], workflow))
        if not ID_PATTERNS["workflow"].match(workflow["id"]):
            errors.append(f"{path.relative_to(root)} workflow id is invalid: {workflow['id']}")
    return errors


def _validate_examples(root: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    chat_example = root / "examples" / "chat-import" / "chat-artifact.json"
    errors.extend(
        f"{chat_example.relative_to(root)}: {message}"
        for message in _validation_errors(validators["chat-artifact.schema.json"], read_json(chat_example))
    )
    event_manifest = root / "examples" / "event-pack" / "source-manifest.yaml"
    errors.extend(_validate_source_manifest(root, event_manifest, validators))
    return errors


def _validate_exports(root: Path, validators: dict[str, Draft202012Validator]) -> list[str]:
    errors: list[str] = []
    for path in (root / "exports").glob("**/manifest.json"):
        manifest = read_json(path)
        errors.extend(f"{path.relative_to(root)}: {message}" for message in _validation_errors(validators["export-manifest.schema.json"], manifest))
        for file_path in manifest.get("files", []):
            if not (root / file_path).exists():
                errors.append(f"{path.relative_to(root)} references missing export file: {file_path}")
    return errors


def _validate_routing(root: Path) -> list[str]:
    errors: list[str] = []
    rules = read_yaml(root / "ingestion-rules.yaml")
    routing = rules.get("routing", {})
    for source, target in routing.items():
        if not (root / source).exists():
            errors.append(f"Routing source path is missing: {source}")
        if not (root / target).exists():
            errors.append(f"Routing target path is missing: {target}")
    return errors


def validate_repo(root: Path) -> list[str]:
    validators = _load_schemas(root)
    errors = []
    errors.extend(_validate_root(root))
    errors.extend(_validate_yaml_files(root))
    errors.extend(_validate_json_files(root))
    errors.extend(_validate_routing(root))
    errors.extend(_validate_examples(root, validators))
    for path in (root / "raw" / "events").glob("*/source-manifest.yaml"):
        errors.extend(_validate_source_manifest(root, path, validators))
    errors.extend(_validate_processed_manifest(root, validators))
    errors.extend(_validate_cards(root, validators))
    errors.extend(_validate_graph_jsonl(root, validators))
    errors.extend(_validate_exports(root, validators))
    return errors


def run_validation(root: Path) -> int:
    errors = validate_repo(root)
    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Validation passed.")
    return 0

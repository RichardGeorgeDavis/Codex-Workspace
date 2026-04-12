from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import (
    SUPPORTED_EXPORT_TARGETS,
    run_distill_command,
    run_export_command,
    run_intake_command,
    run_normalize_command,
    run_segment_command,
)
from .validation import run_validation
from .webapp import serve_ui


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="knowledge-palace")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Repository root")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("validate", help="Validate repo contracts")

    intake = subparsers.add_parser("intake", help="Ingest an event source into raw storage")
    intake.add_argument("--collection", default="events")
    intake.add_argument("--input", required=True)
    intake.add_argument("--event-slug")
    intake.add_argument("--title")
    intake.add_argument("--source-type")

    normalize = subparsers.add_parser("normalize", help="Normalize a raw event manifest")
    normalize.add_argument("--manifest", required=True)

    segment = subparsers.add_parser("segment", help="Segment a normalized source")
    segment.add_argument("--source", required=True)
    segment.add_argument("--manifest")

    distill = subparsers.add_parser("distill", help="Create claims, workflows, and cards")
    distill.add_argument("--manifest", required=True)

    export = subparsers.add_parser("export", help="Export a processed pack")
    export.add_argument("--target", choices=sorted(SUPPORTED_EXPORT_TARGETS), required=True)
    export.add_argument("--manifest", required=True)

    serve = subparsers.add_parser("serve-ui", help="Start the local web UI")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8765)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "validate":
        return run_validation(Path(args.root))
    if args.command == "intake":
        if args.collection != "events":
            parser.error("v1 intake currently supports only --collection events")
        path = run_intake_command(args)
        print(path)
        return 0
    if args.command == "normalize":
        path = run_normalize_command(args)
        print(path)
        return 0
    if args.command == "segment":
        path = run_segment_command(args)
        print(path)
        return 0
    if args.command == "distill":
        output = run_distill_command(args)
        print(output["distill_manifest"])
        return 0
    if args.command == "export":
        path = run_export_command(args)
        print(path)
        return 0
    if args.command == "serve-ui":
        serve_ui(Path(args.root), host=args.host, port=args.port)
        return 0
    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

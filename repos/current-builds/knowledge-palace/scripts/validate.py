"""Validation entrypoint for Knowledge Palace."""

from __future__ import annotations

from pathlib import Path

from knowledge_palace.validation import run_validation


def main() -> None:
    raise SystemExit(run_validation(Path(__file__).resolve().parents[1]))


if __name__ == "__main__":
    main()

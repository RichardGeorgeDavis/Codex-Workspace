"""Workflow extraction lives inside the distill step in v1."""

from __future__ import annotations

import sys

from knowledge_palace.cli import main as cli_main


def main() -> None:
    raise SystemExit(cli_main(["distill", *sys.argv[1:]]))


if __name__ == "__main__":
    main()

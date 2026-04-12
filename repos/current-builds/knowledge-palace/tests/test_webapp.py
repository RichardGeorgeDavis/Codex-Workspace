from __future__ import annotations

import unittest
from pathlib import Path

from knowledge_palace.webapp import derive_action_command, list_tree, load_text_file, save_text_file

from support import ROOT, seed_repo, temporary_repo


class WebAppTests(unittest.TestCase):
    def test_tree_lists_repo_files(self) -> None:
        items = list_tree(ROOT)
        names = {item["name"] for item in items}
        self.assertIn("README.md", names)
        self.assertIn("knowledge_palace", names)

    def test_file_round_trip(self) -> None:
        with temporary_repo() as temp_dir:
            temp_root = Path(temp_dir)
            seed_repo(temp_root)
            payload = load_text_file(temp_root, "README.md")
            self.assertIn("Knowledge Palace", payload["content"])
            result = save_text_file(temp_root, "README.md", payload["content"] + "\nUI test\n")
            self.assertIn("Saved README.md", result["message"])
            self.assertIn("UI test", (temp_root / "README.md").read_text(encoding="utf-8"))

    def test_action_command_uses_selected_manifest(self) -> None:
        command = derive_action_command(ROOT, "normalize", "raw/events/design-indaba-2025/source-manifest.yaml")
        self.assertEqual(command[-2:], ["--manifest", "raw/events/design-indaba-2025/source-manifest.yaml"])

    def test_export_action_requires_processed_manifest(self) -> None:
        with self.assertRaises(ValueError):
            derive_action_command(ROOT, "export", "README.md")


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest
from pathlib import Path

from knowledge_palace.pipeline import distill_event, export_pack, intake_event, normalize_event, segment_source
from knowledge_palace.utils import read_json, read_yaml
from knowledge_palace.validation import validate_repo

from support import ROOT, seed_repo, temporary_repo


class PipelineTests(unittest.TestCase):
    def test_event_pipeline_generates_processed_manifest(self) -> None:
        with temporary_repo() as temp_dir:
            temp_root = Path(temp_dir)
            seed_repo(temp_root)
            raw_manifest = intake_event(
                root=temp_root,
                input_path=ROOT / "examples" / "event-pack" / "briefing.md",
                event_slug="design-indaba-2025",
                title="Design Indaba 2025 example pack",
            )
            processed_manifest = normalize_event(temp_root, raw_manifest)
            processed_payload = read_yaml(processed_manifest)
            self.assertEqual(processed_payload["slug"], "design-indaba-2025")
            self.assertEqual(processed_payload["normalized_sources"][0]["source_id"], "src_briefing")

    def test_event_pipeline_distills_and_exports(self) -> None:
        with temporary_repo() as temp_dir:
            temp_root = Path(temp_dir)
            seed_repo(temp_root)
            raw_manifest = intake_event(
                root=temp_root,
                input_path=ROOT / "examples" / "event-pack" / "briefing.md",
                event_slug="design-indaba-2025",
                title="Design Indaba 2025 example pack",
            )
            processed_manifest = normalize_event(temp_root, raw_manifest)
            segment_source(temp_root, "src_briefing", raw_manifest)
            distill_event(temp_root, processed_manifest)
            pack_path = export_pack(temp_root, "markdown", processed_manifest)

            self.assertTrue(pack_path.exists())
            self.assertTrue((temp_root / "cards" / "concepts" / "design-indaba-2025-briefing.json").exists())
            export_manifest = read_json(temp_root / "exports" / "markdown" / "design-indaba-2025" / "manifest.json")
            self.assertEqual(export_manifest["target"], "markdown")
            self.assertEqual(validate_repo(temp_root), [])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest
from pathlib import Path

from knowledge_palace.pipeline import intake_event
from knowledge_palace.validation import validate_repo

from support import ROOT, seed_repo, temporary_repo


class ValidationTests(unittest.TestCase):
    def test_example_contracts_validate(self) -> None:
        errors = validate_repo(ROOT)
        self.assertEqual(errors, [])

    def test_invalid_claim_without_provenance_is_rejected(self) -> None:
        with temporary_repo() as temp_dir:
            temp_root = Path(temp_dir)
            seed_repo(temp_root)
            (temp_root / "graph" / "claims.jsonl").write_text(
                '{"id":"clm_test-claim-001","claim_text":"Bad claim","claim_type":"direct_statement","speaker_or_source":"Tester","topic":"events","evidence_strength":"direct","source_refs":[],"verification_state":"unreviewed"}\n',
                encoding="utf-8",
            )
            errors = validate_repo(temp_root)
            self.assertTrue(any("must include source_refs" in error or "[] should be non-empty" in error for error in errors))

    def test_intake_creates_raw_event_route(self) -> None:
        with temporary_repo() as temp_dir:
            temp_root = Path(temp_dir)
            seed_repo(temp_root)
            manifest_path = intake_event(
                root=temp_root,
                input_path=ROOT / "examples" / "event-pack" / "briefing.md",
                event_slug="design-indaba-2025",
                title="Design Indaba 2025 example pack",
            )
            self.assertEqual(manifest_path, temp_root / "raw" / "events" / "design-indaba-2025" / "source-manifest.yaml")
            self.assertTrue((temp_root / "raw" / "events" / "design-indaba-2025" / "briefing" / "original.md").exists())


if __name__ == "__main__":
    unittest.main()

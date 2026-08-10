#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/local-model-context-fixture.XXXXXX")"
outside_root="$(mktemp -d "${TMPDIR:-/tmp}/local-model-context-outside.XXXXXX")"
trap 'rm -rf "$fixture_root" "$outside_root"' EXIT

mkdir -p \
  "$fixture_root/docs" \
  "$fixture_root/repos/demo" \
  "$fixture_root/repos/demo/system/docs" \
  "$fixture_root/repos/demo/sites/example" \
  "$fixture_root/repos/demo/library/private" \
  "$fixture_root/repos/private-notes/public" \
  "$fixture_root/repos/private-notes/library/private" \
  "$fixture_root/shared/local-models" \
  "$fixture_root/tools/scripts"

printf '%s\n' '# Fixture workspace' >"$fixture_root/README.md"
printf '%s\n' '# Fixture rules' >"$fixture_root/AGENTS.md"
printf '%s\n' '# Handover' >"$fixture_root/docs/HANDOVER.md"
printf '%s\n' '# Demo repo' >"$fixture_root/repos/demo/README.md"
printf '%s\n' '# Demo rules' >"$fixture_root/repos/demo/AGENTS.md"
printf '%s\n' '# Demo status' >"$fixture_root/repos/demo/STATUS.md"
printf '%s\n' '# Demo handover' >"$fixture_root/repos/demo/HANDOVER.md"
printf '%s\n' '# System handover' >"$fixture_root/repos/demo/system/docs/HANDOVER.md"
printf '%s\n' '# Example site' >"$fixture_root/repos/demo/sites/example/README.md"
printf '%s\n' '# Example site rules' >"$fixture_root/repos/demo/sites/example/AGENTS.md"
printf '%s\n' '# Example site status' >"$fixture_root/repos/demo/sites/example/STATUS.md"
printf '%s\n' '# Example site handover' >"$fixture_root/repos/demo/sites/example/HANDOVER.md"
printf '%s\n' 'api_key: should-not-leave-local-redaction' >"$fixture_root/repos/demo/library/private/secret.md"
printf '%s\n' '# Explicit public fixture' >"$fixture_root/repos/private-notes/public/README.md"
printf '%s\n' 'api_key: private-notes-fixture' >"$fixture_root/repos/private-notes/library/private/secret.md"
printf '%s\n' 'gemini rate limit fixture' >"$fixture_root/repos/demo/rate-limit.md"
printf '%s\n' 'untracked public-looking source' >"$fixture_root/repos/demo/untracked.md"
printf '%s\n' 'outside' >"$outside_root/outside.md"
ln -s "$outside_root/outside.md" "$fixture_root/repos/demo/outside.md"
python3 - "$fixture_root/repos/demo/large.md" <<'PY'
from pathlib import Path
import sys

Path(sys.argv[1]).write_text("x" * 70000, encoding="utf-8")
PY

cp "$WORKSPACE_ROOT/tools/scripts/local-model-context.sh" "$fixture_root/tools/scripts/local-model-context.sh"
cp "$WORKSPACE_ROOT/shared/local-models/profiles.json" "$fixture_root/shared/local-models/profiles.json"
chmod +x "$fixture_root/tools/scripts/local-model-context.sh"
python3 - "$fixture_root/shared/local-models/profiles.json" <<'PY'
import json
from pathlib import Path
import sys

path = Path(sys.argv[1])
profile = json.loads(path.read_text(encoding="utf-8"))
profile.update({
    "defaultProvider": "auto",
    "cloudBlockedPrefixes": ["repos/private-notes/library/"],
    "gemini": {
        "apiBase": "http://127.0.0.1:1/v1beta",
        "keychainService": "fixture-gemini",
        "keychainAccount": "fixture",
        "autoRouting": True,
        "defaultProfile": "fast",
        "profiles": {
            "fast": {"model": "fixture-fast", "routing": "automatic-for-eligible-public-files"},
            "balanced": {"model": "fixture-balanced", "routing": "explicit-only"},
            "quality": {"model": "fixture-quality", "routing": "explicit-only"},
            "code-quality": {"model": "fixture-code", "routing": "explicit-only"}
        }
    },
    "openrouter": {
        "model": "openrouter/free",
        "apiBase": "http://127.0.0.1:1/v1",
        "keychainService": "fixture-openrouter",
        "keychainAccount": "fixture",
        "autoRouting": False
    },
    "gateway": {"enabled": False}
})
path.write_text(json.dumps(profile), encoding="utf-8")
PY

git -C "$fixture_root" init -q
git -C "$fixture_root" config user.email fixture@example.test
git -C "$fixture_root" config user.name fixture
git -C "$fixture_root" add README.md AGENTS.md docs repos/demo/README.md repos/demo/AGENTS.md repos/demo/STATUS.md repos/demo/HANDOVER.md repos/demo/system/docs/HANDOVER.md repos/demo/library repos/demo/sites repos/demo/rate-limit.md repos/private-notes/public/README.md repos/private-notes/library/private/secret.md shared tools
git -C "$fixture_root" commit -qm fixture

fake_bin="$fixture_root/fake-bin"
mkdir -p "$fake_bin"
python3 - "$fake_bin/ollama" "$fake_bin/security" <<'PY'
from pathlib import Path
import sys

ollama, security = map(Path, sys.argv[1:])
ollama.write_text(
    "#!/usr/bin/env bash\n"
    "if [[ \"${1:-}\" == list ]]; then\n"
    "  printf '%s\\n' 'NAME ID SIZE MODIFIED' 'qwen2.5:3b fixture 1 1' 'gemma4:e4b-mlx fixture 1 1' 'gemma4:12b-mlx fixture 1 1'\n"
    "fi\n",
    encoding="utf-8",
)
security.write_text(
    "#!/usr/bin/env bash\n"
    "if [[ \"${1:-}\" == find-generic-password ]]; then\n"
    "  if [[ -n \"${CONTEXT_TEST_KEY:-}\" ]]; then\n"
    "    [[ \" $* \" == *\" -w \"* ]] && printf '%s\\n' \"$CONTEXT_TEST_KEY\"\n"
    "    exit 0\n"
    "  fi\n"
    "  exit 44\n"
    "fi\n"
    "if [[ \"${1:-}\" == add-generic-password ]]; then exit 0; fi\n"
    "exit 44\n",
    encoding="utf-8",
)
ollama.chmod(0o755)
security.chmod(0o755)
PY

server_output="$fixture_root/server-port"
python3 -u - >"$server_output" 2>/dev/null <<'PY' &
import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer


def extraction(path):
    return {
        "summary": "Fixture summary.",
        "entry": "Fixture entry.",
        "overview": "Fixture overview.",
        "handover": "Fixture handover.",
        "items": [{
            "path": path,
            "status": "confirmed",
            "confirmed_facts": ["Fixture fact."],
            "assumptions": [],
            "decisions": [],
            "open_loops": [],
            "risks": [],
            "suggested_destination": path,
            "private_values_present": False,
            "evidence_spans": [f"{path}:0001"],
            "confidence": 0.9,
        }],
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/v1beta/models/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{}')
            return
        if self.path == "/v1/models":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"data": [{"id": "openrouter/free", "pricing": {"prompt": "0", "completion": "0", "request": "0", "image": "0"}}]}).encode("utf-8"))
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        size = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(size).decode("utf-8")
        request_payload = json.loads(body)
        if self.path == "/api/chat":
            assert request_payload["think"] is False, request_payload
            assert request_payload["options"]["num_predict"] in {1200, 1800}, request_payload
        if self.path.startswith("/v1beta/models/") and "rate limit fixture" in body:
            self.send_response(429)
            self.end_headers()
            return
        if self.path == "/api/chat" and "malformed fixture" in body:
            payload = {"message": {"content": "```json\nnot-json\n```"}}
        elif self.path.startswith("/v1beta/models/") and "malformed fixture" in body:
            payload = {"candidates": [{"content": {"parts": [{"text": "not-json"}]}}]}
        else:
            match = re.search(r'SOURCE PATH: ([^"\\]+)', body)
            path = match.group(1) if match else "README.md"
            text = json.dumps(extraction(path))
            if self.path == "/api/chat":
                payload = {"message": {"content": f"```json\n{text}\n```"}}
            elif self.path == "/v1/chat/completions":
                payload = {"choices": [{"message": {"content": text}}]}
            else:
                payload = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def log_message(self, *_args):
        return


server = HTTPServer(("127.0.0.1", 0), Handler)
print(server.server_port, flush=True)
server.serve_forever()
PY
server_pid=$!
for _ in {1..50}; do
  test -s "$server_output" && break
  sleep 0.1
done
fake_port="$(<"$server_output")"

run_context() {
  PATH="$fake_bin:$PATH" \
    OLLAMA_HOST="http://127.0.0.1:$fake_port" \
    GEMINI_CONTEXT_API_BASE="http://127.0.0.1:$fake_port/v1beta" \
    OPENROUTER_CONTEXT_API_BASE="http://127.0.0.1:$fake_port/v1" \
    OLLAMA_CONTEXT_WORKSPACE_ROOT="$fixture_root" \
    "$fixture_root/tools/scripts/local-model-context.sh" "$@"
}

assert_fails() {
  if "$@" >/tmp/local-model-context-test.stdout 2>/tmp/local-model-context-test.stderr; then
    echo "Expected command to fail: $*" >&2
    cat /tmp/local-model-context-test.stderr >&2
    exit 1
  fi
}

run_context --workspace --operation extract --task dry-run >/tmp/local-model-context-test.stdout
test ! -e "$fixture_root/cache/context/local-models"
run_context --profiles shared/local-models/profiles.json --repo repos/demo --provider ollama --operation extract --task explicit-profile >/tmp/local-model-context-test.stdout

run_context --repo repos/demo --operation extract --task fixture --run
output_dir="$fixture_root/cache/context/local-models/repos__demo/fixture"
for output in abstract.md entry.md overview.md handover.md extraction.json sources.json; do
  test -s "$output_dir/$output"
done
python3 - "$output_dir/extraction.json" "$output_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

extraction = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
sources = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert isinstance(extraction["items"], list), extraction
assert sources["provider"]["selected"] == "ollama", sources["provider"]
assert sources["model"]["backend"] == "ollama-loopback", sources["model"]
assert all(item["sha256"] and item["bytes"] >= 0 for item in sources["inputs"]), sources["inputs"]
PY

run_context --repo repos/demo --provider ollama --operation handover --task root-router --run
root_router_dir="$fixture_root/cache/context/local-models/repos__demo/root-router"
python3 - "$root_router_dir/entry.md" "$root_router_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

entry = Path(sys.argv[1]).read_text(encoding="utf-8")
sources = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
expected = [
    "repos/demo/AGENTS.md",
    "repos/demo/STATUS.md",
    "repos/demo/HANDOVER.md",
    "repos/demo/README.md",
]
positions = []
for path in expected:
    assert path in entry, (path, entry)
    positions.append(entry.index(path))
assert positions == sorted(positions), positions
router = sources["router"]
assert router["deterministic"] is True, router
assert [item["path"] for item in router["readNext"]][:3] == expected[:3], router
assert all(item["sha256"] and item["mtimeMs"] >= 0 for item in router["readNext"]), router
measurements = sources["measurements"]
assert measurements["inputSourceCount"] >= 4, measurements
assert measurements["inputBytes"] > 0, measurements
assert measurements["firstAuthoritativePath"] == "repos/demo/AGENTS.md", measurements
assert measurements["routerGenerationMs"] >= 0, measurements
assert "README.md" in entry and "Current context" not in entry, entry
PY

run_context --repo repos/demo --file repos/demo/sites/example/README.md --provider ollama --operation handover --task site-router --run
site_router_dir="$fixture_root/cache/context/local-models/repos__demo/site-router"
python3 - "$site_router_dir/entry.md" "$site_router_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

entry = Path(sys.argv[1]).read_text(encoding="utf-8")
sources = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert "repos/demo/sites/example/STATUS.md" in entry, entry
assert "repos/demo/sites/example/HANDOVER.md" in entry, entry
assert "repos/demo/sites/example/README.md" in entry, entry
assert "# Example site status" not in entry, entry
roles = {(item["path"], item["role"]) for item in sources["router"]["readNext"]}
assert ("repos/demo/sites/example/STATUS.md", "current-state") in roles, roles
assert ("repos/demo/sites/example/HANDOVER.md", "task-handover") in roles, roles
PY

run_context --repo repos/demo --operation extract --task fixture --run >/tmp/local-model-context-test.stdout
rg -q '"reused": true' "$output_dir/sources.json"
run_context --repo repos/demo --operation extract --task fixture --refresh --run >/tmp/local-model-context-test.stdout
rg -q '"reused": false' "$output_dir/sources.json"

assert_fails run_context --file repos/demo/library/private/secret.md --operation extract --task protected
assert_fails run_context --file repos/demo/outside.md --operation extract --task symlink
assert_fails run_context --file repos/demo/large.md --operation extract --task oversized
assert_fails run_context --file repos/demo/untracked.md --provider gemini --operation extract --task untracked
assert_fails run_context --file repos/demo/library/private/secret.md --include-protected --provider gemini --operation extract --task protected-cloud
assert_fails run_context --file repos/private-notes/library/private/secret.md --include-protected --provider gemini --operation extract --task private-notes-protected-cloud
assert_fails run_context --file repos/demo/README.md --provider gemini --model gemini-3.6-flash --operation extract --task gemini-model-override
run_context --file repos/demo/README.md --model gemma4:12b-mlx --operation extract --task auto-model-override --run >/tmp/local-model-context-test.stdout
python3 - "$fixture_root/cache/context/local-models/files/auto-model-override/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["requested"] == "auto", sources["provider"]
assert sources["provider"]["selected"] == "ollama", sources["provider"]
assert sources["model"]["name"] == "gemma4:12b-mlx", sources["model"]
PY
assert_fails run_context --file repos/demo/README.md --gemini-profile quality --operation extract --task quality-auto
assert_fails run_context --file repos/demo/README.md --provider ollama --gemini-profile fast --operation extract --task invalid-gemini-profile-provider

assert_fails env CONTEXT_TEST_KEY='' PATH="$fake_bin:$PATH" OLLAMA_HOST="http://127.0.0.1:$fake_port" \
  GEMINI_CONTEXT_API_BASE="http://127.0.0.1:$fake_port/v1beta" OLLAMA_CONTEXT_WORKSPACE_ROOT="$fixture_root" \
  "$fixture_root/tools/scripts/local-model-context.sh" --file repos/demo/README.md --provider gemini --operation extract --task missing-key

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --operation extract --task public-auto --run >/tmp/local-model-context-test.stdout
gemini_dir="$fixture_root/cache/context/local-models/files/public-auto"
python3 - "$gemini_dir/sources.json" "$gemini_dir/extraction.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
extraction = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "gemini"
assert sources["provider"]["profile"] == "fast"
assert sources["provider"]["attemptedProfile"] == "fast"
assert sources["model"]["name"] == "fixture-fast"
assert sources["selectionPolicy"]["cloudEligible"] is True
assert sources["selectionPolicy"]["geminiProfile"] == "fast"
assert sources["selectionPolicy"]["attemptedGeminiProfile"] == "fast"
assert extraction["profile"] == "fast"
PY
if rg -n 'fixture-gemini-key' "$gemini_dir" /tmp/local-model-context-test.stdout /tmp/local-model-context-test.stderr; then
  echo 'Gemini fixture key escaped into output.' >&2
  exit 1
fi

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile balanced --operation extract --task public-balanced --run >/tmp/local-model-context-test.stdout
balanced_dir="$fixture_root/cache/context/local-models/files/public-balanced"
python3 - "$balanced_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "gemini"
assert sources["provider"]["profile"] == "balanced"
assert sources["model"]["name"] == "fixture-balanced"
assert sources["selectionPolicy"]["geminiProfile"] == "balanced"
PY

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile balanced --operation extract --task profile-cache --run >/tmp/local-model-context-test.stdout
CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile quality --operation extract --task profile-cache --run >/tmp/local-model-context-test.stdout
profile_cache_dir="$fixture_root/cache/context/local-models/files/profile-cache"
python3 - "$profile_cache_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["profile"] == "quality"
assert sources["cache"]["reused"] is False
PY
CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile quality --operation extract --task profile-cache --run >/tmp/local-model-context-test.stdout
rg -q '"reused": true' "$profile_cache_dir/sources.json"

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile quality --operation extract --task public-quality --run >/tmp/local-model-context-test.stdout
quality_dir="$fixture_root/cache/context/local-models/files/public-quality"
python3 - "$quality_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["profile"] == "quality"
assert sources["model"]["name"] == "fixture-quality"
PY

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/README.md --provider gemini --gemini-profile code-quality --operation extract --task public-code-quality --run >/tmp/local-model-context-test.stdout
code_quality_dir="$fixture_root/cache/context/local-models/files/public-code-quality"
python3 - "$code_quality_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["profile"] == "code-quality"
assert sources["model"]["name"] == "fixture-code"
PY

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/private-notes/public/README.md --provider gemini --operation extract --task explicit-public --run >/tmp/local-model-context-test.stdout
explicit_public_gemini_dir="$fixture_root/cache/context/local-models/files/explicit-public"
python3 - "$explicit_public_gemini_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "gemini"
assert sources["selectionPolicy"]["cloudEligible"] is True
assert sources["inputs"][0]["path"] == "repos/private-notes/public/README.md"
PY

CONTEXT_TEST_KEY='fixture-gemini-key' run_context --file repos/demo/rate-limit.md --operation extract --task fallback --run >/tmp/local-model-context-test.stdout
fallback_dir="$fixture_root/cache/context/local-models/files/fallback"
python3 - "$fallback_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "ollama"
assert "HTTP 429" in sources["provider"]["fallbackReason"]
assert sources["provider"]["profile"] is None
assert sources["provider"]["attemptedProfile"] == "fast"
assert sources["selectionPolicy"]["geminiProfile"] is None
assert sources["selectionPolicy"]["attemptedGeminiProfile"] == "fast"
PY

profile_backup="$fixture_root/shared/local-models/profiles.json.before-default-policy"
cp "$fixture_root/shared/local-models/profiles.json" "$profile_backup"
sed -i '' 's/"defaultProfile": "fast"/"defaultProfile": "quality"/' "$fixture_root/shared/local-models/profiles.json"
assert_fails run_context --file repos/demo/README.md --operation extract --task invalid-default-profile
mv "$profile_backup" "$fixture_root/shared/local-models/profiles.json"

printf 'malformed fixture\n' >"$fixture_root/repos/demo/malformed.md"
git -C "$fixture_root" add repos/demo/malformed.md
git -C "$fixture_root" commit -qm malformed
assert_fails env CONTEXT_TEST_KEY='fixture-gemini-key' PATH="$fake_bin:$PATH" OLLAMA_HOST="http://127.0.0.1:$fake_port" \
  GEMINI_CONTEXT_API_BASE="http://127.0.0.1:$fake_port/v1beta" OLLAMA_CONTEXT_WORKSPACE_ROOT="$fixture_root" \
  "$fixture_root/tools/scripts/local-model-context.sh" --file repos/demo/malformed.md --provider gemini --operation extract --task malformed-json
assert_fails run_context --file repos/demo/malformed.md --provider ollama --operation extract --task malformed-ollama-json

run_context --file repos/demo/library/private/secret.md --include-protected --provider ollama --operation extract --task redacted --run
redacted_dir="$fixture_root/cache/context/local-models/files/redacted"
if rg -n 'should-not-leave-local-redaction' "$redacted_dir"; then
  echo 'Protected value escaped into generated output.' >&2
  exit 1
fi

assert_fails run_context --file repos/demo/README.md --provider openrouter --model openai/gpt-4o --operation extract --task openrouter-paid
assert_fails env CONTEXT_TEST_KEY='' PATH="$fake_bin:$PATH" OLLAMA_HOST="http://127.0.0.1:$fake_port" \
  OPENROUTER_CONTEXT_API_BASE="http://127.0.0.1:$fake_port/v1" OLLAMA_CONTEXT_WORKSPACE_ROOT="$fixture_root" \
  "$fixture_root/tools/scripts/local-model-context.sh" --file repos/demo/README.md --provider openrouter --operation extract --task openrouter-missing-key

CONTEXT_TEST_KEY='fixture-openrouter-key' run_context --file repos/demo/README.md --provider openrouter --operation extract --task openrouter-public --run >/tmp/local-model-context-test.stdout
openrouter_dir="$fixture_root/cache/context/local-models/files/openrouter-public"
python3 - "$openrouter_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "openrouter"
assert sources["model"]["name"] == "openrouter/free"
assert sources["model"]["backend"] == "openrouter-free-router"
assert sources["model"]["costPolicy"] == "free-models-only"
PY
if rg -n 'fixture-openrouter-key' "$openrouter_dir" /tmp/local-model-context-test.stdout /tmp/local-model-context-test.stderr; then
  echo 'OpenRouter fixture key escaped into output.' >&2
  exit 1
fi

CONTEXT_TEST_KEY='fixture-openrouter-key' run_context --file repos/private-notes/public/README.md --provider openrouter --operation extract --task explicit-public-openrouter --run >/tmp/local-model-context-test.stdout
explicit_public_openrouter_dir="$fixture_root/cache/context/local-models/files/explicit-public-openrouter"
python3 - "$explicit_public_openrouter_dir/sources.json" <<'PY'
import json
from pathlib import Path
import sys

sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert sources["provider"]["selected"] == "openrouter"
assert sources["selectionPolicy"]["cloudEligible"] is True
assert sources["inputs"][0]["path"] == "repos/private-notes/public/README.md"
PY

kill "$server_pid" 2>/dev/null || true
wait "$server_pid" 2>/dev/null || true

echo 'local-model-context fixture checks passed'

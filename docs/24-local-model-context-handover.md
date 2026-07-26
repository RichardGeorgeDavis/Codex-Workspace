# Local-model Context Handover

`tools/scripts/local-model-context.sh` prepares bounded, disposable context
packets for workspace or repository orientation. It is not a background memory
service and generated packets are not canonical project state.

## Safe Default

The public profile at `shared/local-models/profiles.json` defaults to a local
Ollama endpoint on loopback. It includes conservative file, line and prompt
limits and no configured cloud credentials.

```sh
tools/scripts/local-model-context.sh \
  --workspace --provider ollama --operation handover \
  --task workspace-overview
```

## Private Operator Profiles

Provider choices, Keychain identifiers, private path rules and local gateway
configuration belong outside the public repository. Select a reviewed profile
explicitly with `--profiles`, or set `OLLAMA_CONTEXT_PROFILES`:

```sh
tools/scripts/local-model-context.sh \
  --profiles /absolute/path/to/reviewed-profiles.json \
  --file README.md --operation extract --task readme-review
```

The command accepts an absolute path or a path relative to the workspace root.
If the selected registry is missing or malformed, the command fails before
sending source material.

## Privacy Boundary

- Local Ollama must use a loopback HTTP endpoint.
- Cloud or gateway providers require explicit tracked files and refuse
  protected selections, probable secrets and paths blocked by the profile's
  `cloudBlockedPrefixes` policy.
- `--include-protected` is local-only and never makes a file cloud-eligible.
- Provider keys must come from the environment or a local credential store;
  never place them in profiles, tracked files, logs or prompts.
- Private operator profiles must not be copied into public examples or context
  packets.

Packets are written only with `--run`, under the ignored
`cache/context/local-models/` tree. Review the recorded provider, model,
selection policy, source hashes and fallback reason before relying on a packet.

## Verification

Run `tools/scripts/test-local-model-context.sh` after changing routing,
redaction, profile parsing or packet schemas. Its fixtures must use neutral
repository names and loopback provider stubs.

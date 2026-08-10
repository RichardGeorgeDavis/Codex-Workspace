# Local-model Context Handover

`tools/scripts/local-model-context.sh` prepares bounded, disposable context
packets for workspace or repository orientation. It is not a background memory
service and generated packets are not canonical project state.

## Safe Default

The public profile at `shared/local-models/profiles.json` defaults to a local
Ollama endpoint on loopback and the conservative `qwen2.5:3b` model. It
includes file, line, prompt and output limits and no configured cloud
credentials. The worker never downloads a missing model automatically.

```sh
tools/scripts/local-model-context.sh \
  --workspace --provider ollama --operation handover \
  --task workspace-overview
```

Gemma 4 MLX models are optional comparison targets. Select one explicitly
rather than changing the shared default without a schema-valid live test:

```sh
tools/scripts/local-model-context.sh \
  --workspace --provider ollama --model gemma4:e4b-mlx \
  --operation handover --task workspace-e4b --run

tools/scripts/local-model-context.sh \
  --workspace --provider ollama --model gemma4:12b-mlx \
  --operation handover --task workspace-12b --run
```

`--model` is local Ollama-only and takes precedence over automatic provider
routing. `OLLAMA_MODEL` remains the environment-level override when `--model`
is absent. A command without `--run` validates selection and prints the plan
without invoking the model or writing a packet.

## Apple Silicon Guidance

Ollama supports Apple M-series Macs on macOS 14 or newer. The Gemma 4 MLX
variants use Apple Silicon's unified memory, so model weights, the context/KV
cache, Ollama, macOS and other applications all compete for the same memory.
The catalogue download size is therefore not a complete runtime-memory
estimate.

On a 16 GB Mac, retain `qwen2.5:3b` for reliable structured packets unless a
candidate passes the live schema gate. Treat both `gemma4:e4b-mlx` and
`gemma4:12b-mlx` as explicit comparison options rather than assuming one is
safer or better: measure them on the actual handover task. Avoid loading both
models concurrently, close other memory-heavy applications for repeatable
tests, and keep source selection within the worker's conservative prompt
limits. Advertised maximum model context is not a practical handover target on
a 16 GB machine.

The worker disables model thinking and applies the selected operation's
`maxOutputTokens` as Ollama's generation cap. This keeps structured extraction
bounded. It accepts a JSON object returned directly or inside a Markdown code
fence, then applies the same strict packet validation. This does not guarantee
that every model will satisfy the schema or finish before the 180-second
request timeout.

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
repository names and loopback provider stubs. For a live model change, also
run an isolated `--run` smoke test with no competing Ollama session and review
the generated `sources.json` and `extraction.json` before accepting the model
as the default.

Authoritative runtime references:

- [Ollama macOS requirements](https://docs.ollama.com/macos)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Gemma 4 model catalogue](https://ollama.com/library/gemma4/tags)

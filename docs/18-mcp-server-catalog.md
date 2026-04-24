# 18-mcp-server-catalog

## Purpose

This is the curated catalog for the official MCP v1 server set.

Keep it small.

Do not turn this into a rolling list of every MCP server that exists.

## `openaiDeveloperDocs`

- Category: docs/context
- Transport: remote HTTP
- Trust class: `trusted-remote-read`
- Capability tier: `read-only`
- Profiles: `default-full`, `safe-readonly`, `research`
- Why it is included: current OpenAI product and API docs
- Default auth stance: none required
- Notes:
  - keep this as the OpenAI-specific source
  - do not replace it with general package-doc tools

## `context7`

- Category: docs/context
- Transport: remote HTTP
- Trust class: `trusted-remote-read`
- Capability tier: `read-only`
- Profiles: `default-full`, `safe-readonly`, `research`
- Why it is included: up-to-date package and library docs
- Optional env: `CONTEXT7_API_KEY`
- Notes:
  - this is the default library and package docs source
  - use MCP mode here rather than CLI-plus-skill mode

## `playwright`

- Category: browser/runtime inspection
- Transport: local stdio
- Trust class: `local-browser-runtime`
- Capability tier: `read-only`
- Profiles: `default-full`, `browser-debug`
- Why it is included: deterministic browser inspection and browser-driven task flows
- Workspace contract:
  - launch through `tools/scripts/mcp-run-playwright.sh`
  - keep browser binaries under `cache/playwright-browsers`
  - fall back to workspace-owned home, npm-cache, and output directories when the host process exposes an unusable `HOME`
- Notes:
  - avoid hard-coded machine paths in tracked examples

## `chrome-devtools`

- Category: browser/runtime inspection
- Transport: local stdio
- Trust class: `local-browser-runtime`
- Capability tier: `read-only`
- Profiles: `default-full`, `browser-debug`
- Why it is included: DevTools-native runtime inspection
- Workspace contract:
  - launch through `tools/scripts/mcp-run-chrome-devtools.sh`
  - keep the workspace-root contract visible through `WORKSPACE_ROOT`
  - fall back to workspace-owned home and npm-cache directories when the host process exposes an unusable `HOME`
- Notes:
  - this complements Playwright rather than replacing it

## `github`

- Category: repo collaboration
- Transport: remote HTTP
- Trust class: `guarded-remote-write`
- Capability tier: `mutating`
- Profiles: `default-full`, `github-full`
- Why it is included: repository, PR, issue, Actions, and code-security workflows
- Auth:
  - `GITHUB_PAT` when you want bearer-token auth
  - or `codex mcp login github` when OAuth is preferable
- Default toolset stance:
  - use the broad `all` toolsets header in the GitHub profiles for this workspace
- Notes:
  - if you do not need GitHub context or write-capable flows, use `safe-readonly`

## Explicit non-catalog items

These are not part of the official v1 catalog:

- local filesystem MCP servers
- shell/terminal MCP servers
- generic database MCP servers
- broad third-party remote mutation servers
- Figma MCP, which is intentionally deferred to a later batch

## Private operator services

These services may be useful on this machine, but they are not baseline
workspace dependencies. Keep authentication and account-specific setup in
local-only config such as `~/.codex/config.toml`, local environment variables,
or the provider's browser session.

Storage policy:

- tracked workspace docs may store provider names, public docs URLs, public
  base URLs, endpoint shapes, env var names, and non-secret setup requirements
- macOS Keychain is the preferred local source of truth for private API tokens
  on this machine
- ignored helper files under `tools/local/agents/codex/` may load credentials
  from Keychain for local Codex sessions, but should not contain raw secrets
- ignored private reference notes under `tools/local/agents/codex/` may store
  account-tier, quota, reset-date, and credential-label details that should not
  be exposed in the public repo
- `~/.codex/config.toml` may reference env var names and MCP endpoint URLs, but
  should not contain bearer tokens
- repo READMEs or handover notes should mention a private service only when a
  repo actually depends on that service

Personal-service intake process:

1. Decide whether the service is MCP, API-backed, browser-only, or a provider
   integration. Do not force browser-only or API-only services into the MCP
   profile model.
2. Add only non-secret facts to this section: provider URL, docs URL, account
   type, env var name, public endpoint shape, and whether the service is
   required. Keep account tiers, quotas, reset dates, renewal dates, and private
   credential labels in ignored local notes.
3. Store any token in macOS Keychain using a `codex-<service>-...` item name.
   Keep the raw token out of tracked files and out of `~/.codex/config.toml`.
4. If a shell or Codex session needs the token, add a Keychain lookup to the
   ignored loader at `tools/local/agents/codex/private-services.env.local`.
5. For Codex Desktop, load the token into the macOS user session with
   `launchctl setenv <ENV_NAME> "$(security find-generic-password ... -w)"`,
   then restart Codex.
6. Verify storage without printing secrets: check that the Keychain item exists,
   the env var is set, the local helper is gitignored, and tracked diffs do not
   contain the raw token.
7. Mark services as not required by default. Promote a service to repo-specific
   required status only in that repo's README or handover when a real workflow
   depends on it.

### `yepcode`

- Type: private remote MCP service
- Required: no
- Workspace role: optional account-scoped automation tools exposed through
  selected YepCode processes
- Transport: remote HTTP MCP
- Local Codex MCP name: `yepcode`
- Endpoint shape: private filtered YepCode MCP endpoint configured locally
- Auth: `YEPCODE_MCP_TOKEN` in the local user environment
- Account note: private account; plan details live in ignored local notes
- Notes:
  - expose only intentionally tagged private processes
  - avoid broad built-in tools unless explicitly needed
  - never commit YepCode credentials or account tokens

### `interactive-shell`

- Type: private external browser IDE and terminal
- Required: no
- Workspace role: optional scratch, prototyping, teaching, and quick remote
  terminal environment
- Transport: browser account session, not MCP
- Auth: private Interactive Shell account
- Account note: private account; plan details live in ignored local notes
- Practical features:
  - browser IDE and remote terminal
  - terminal internet access and compiler-oriented workflows where available on
    the account
- Notes:
  - IDE Drive files are available from the Pro terminal under `/mnt`
  - not a repo runtime, hosting target, or long-running service
  - no public port exposing or tunneling
  - do not store account credentials in tracked workspace files

### `activepieces`

- Type: private automation platform account
- Required: no
- Workspace role: optional no-code and low-code workflow automation for
  external apps, webhooks, scheduled triggers, and account-scoped operations
- Transport: provider cloud account, with self-hosting possible separately
- Auth: private Activepieces account and per-connection credentials
- Account note: private account; plan-change and limit details live in ignored
  local notes
- Practical features:
  - external app automation
  - webhook and scheduled-trigger workflows
  - account-scoped flows and connections
- Notes:
  - use for external workflow automation, not as a required local repo runtime
  - keep connection credentials inside Activepieces or local-only secrets
  - document repo-specific dependency on an Activepieces flow in that repo's
    README or handover notes when a workflow becomes required
  - do not commit Activepieces API keys, webhook secrets, or connection exports

### `deftform`

- Type: private form builder and form-response API account
- Required: no
- Workspace role: optional form infrastructure for prototypes, client forms,
  payments, uploads, and response export or retrieval workflows
- Transport: provider cloud account plus HTTP API
- Base API URL: `https://deftform.com/api/v1/`
- Local token env: `DEFTFORM_API_TOKEN`
- Auth: bearer token in the local user environment
- Account note: private account; plan details live in ignored local notes
- Practical features:
  - AI form builder
  - API access
  - exports
  - custom form scripts and styles
  - webhook and email notifications
  - custom thank-you pages and redirects
  - Stripe payments
  - file uploads
  - team management
  - custom domain plus SSL
  - form response management
- Current API surface:
  - `GET /workspace`
  - `GET /forms`
  - `GET /responses/{formId}`
  - `GET /response/{UUID}/pdf`
  - POST endpoints are not available yet
- Notes:
  - use for account-scoped form and response workflows, not as a required
    local repo runtime
  - keep API tokens, webhook secrets, Stripe secrets, and form exports out of
    tracked workspace files
  - document repo-specific dependency on a Deftform form, webhook, or custom
    domain in that repo's README or handover notes when it becomes required

### `alttext-ai`

- Type: private image alt-text generation account and Developer API
- Required: no
- Workspace role: optional accessibility, SEO, CMS, and content-publishing
  helper for generating alt text from image URLs or uploads
- Transport: provider cloud account plus HTTP API and integrations
- Local token env: `ALTTEXT_AI_API_TOKEN`
- Auth: API key in the local user environment
- Account note: private account; credential labels live in ignored local notes
- Practical features:
  - automatic alt-text generation for images
  - Developer API
  - Web UI
  - integrations such as WordPress, Shopify, WooCommerce, Contentful, DatoCMS,
    Magento, Google Tag Manager, Chrome, and Firefox
  - support for multilingual alt text
- Notes:
  - use for account-scoped image metadata workflows, not as a required local
    repo runtime
  - keep API keys, site integration secrets, generated bulk exports, and CMS
    credentials out of tracked workspace files
  - document repo-specific dependency on AltText.ai in that repo's README or
    handover notes when alt-text generation becomes part of a required content
    workflow

### `lazybird`

- Type: private text-to-speech and voice generation account
- Required: no
- Workspace role: optional speech generation service for prototypes, content,
  demos, narration, and accessibility workflows
- Transport: provider cloud account plus API
- Service URLs: `https://studio.lazybird.app/` and `https://lazybird.app/`
- Developer docs: `https://developer.lazybird.app`
- Local token env: `LAZYBIRD_API_KEY`
- Auth: API key in the local user environment
- Account note: private account; quota and reset details live in ignored local
  notes
- Practical features:
  - AI voice and speech generation
  - text-to-speech API access
  - account-scoped studio workflow
- Notes:
  - use for account-scoped audio generation, not as a required local repo
    runtime
  - keep API keys, generated private audio, scripts with client-sensitive
    copy, and project exports out of tracked workspace files unless the repo
    explicitly owns those assets
  - document repo-specific dependency on Lazybird in that repo's README or
    handover notes when generated speech becomes part of a required workflow

### `supermachine`

- Type: private AI image generation account and API
- Required: no
- Workspace role: optional image generation service for prototypes, visual
  assets, content experiments, and creative workflow support
- Transport: provider cloud account plus API
- Service URL: `https://supermachine.art/`
- API docs: `https://docs.supermachine.art/category/api-integration`
- Local token env: `SUPERMACHINE_API_KEY`
- Auth: API key in the local user environment
- Account note: private account; credit, renewal, and model-access details live
  in ignored local notes
- Practical features:
  - text-to-image generation
  - dashboard image generation and album workflows
  - API integration for account-scoped image generation
  - model selection across general and premium model groups
- Notes:
  - check credit cost and model tier before premium models or bulk runs
  - use for account-scoped image generation, not as a required local repo
    runtime
  - keep API keys, generated private images, prompts with client-sensitive
    context, and exports out of tracked workspace files unless the repo
    explicitly owns those assets
  - document repo-specific dependency on Supermachine in that repo's README or
    handover notes when generated images become part of a required workflow

## Private service review queue

Review these before adding credentials or workflow dependencies:

### `codemate`

- URL: `https://codemate.ai/`
- Docs: `https://docs.codemate.ai/`
- Initial classification: private coding assistant, IDE extension, CLI, web app,
  and code-host integration surface
- Review focus:
  - what code, repository, and documentation data it indexes or uploads
  - whether local CLI or IDE integration overlaps with Codex Workspace's
    existing Codex, GitHub, and agent-tooling surfaces
  - whether any API key, GitHub app, or IDE token is needed
  - whether it should remain personal-only rather than becoming repo guidance
- Default stance: do not add to the official MCP profile or workspace
  capability manifest unless a specific repo workflow needs it.

### `ewww-io`

- URL: `https://ewww.io/`
- Docs: `https://docs.ewww.io/`
- Initial classification: WordPress image optimization plugin and cloud
  optimization/API service
- Review focus:
  - whether the account has Easy IO, Compress API, SWIS Performance, or only the
    free local plugin path
  - API key management and which sites are attached to the account
  - whether optimization is local WordPress plugin behavior or remote credit/API
    usage
  - whether any repo under `repos/wordpress/` depends on a specific EWWW setup
- Default stance: document EWWW dependencies repo-locally for WordPress sites;
  do not make it a global workspace service.

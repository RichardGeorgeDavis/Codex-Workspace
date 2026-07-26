# MCP and External-Service Catalogue

This public catalogue documents capability classes, not an operator's private
accounts, credentials or chosen providers.

## Public Categories

- Browser automation and inspection
- Local filesystem and repository tooling
- Design and documentation connectors
- Optional model or media providers configured by the operator
- Repo-specific development services

## Admission Rules

Before adding a server or external service to tracked workspace configuration:

1. Confirm that it is required by a public capability rather than one local
   repository or account.
2. Document its public installation and authentication contract without
   including account names, tenant identifiers, server addresses or keys.
3. Keep credentials in the user's environment or credential store.
4. Mark cloud transmission clearly and define which source classes are barred.
5. Make optional services fail clearly when absent; do not auto-install them.
6. Put private account inventories and repo-specific integrations in the
   operator's private operations repository.

Use `tools/scripts/install-mcp-profile.sh --list` for the supported public MCP
profiles and `tools/scripts/check-mcp-health.sh` for local health checks.

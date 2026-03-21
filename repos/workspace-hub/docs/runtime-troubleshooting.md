# Runtime Troubleshooting

Use these checks when Workspace Hub reports missing dependencies, failed installs, or an unreachable preview.

## Missing dependencies

If a repo shows `dependencies: missing`:

1. Run the repo install command from Workspace Hub or in a terminal.
2. Confirm the expected install directory exists afterward.
   Node repos usually expect `node_modules/`.
   Composer repos usually expect `vendor/`.
3. Retry the repo start action after install completes.

If the repo has no inferred install command:

1. Check the repo `README`.
2. Add `installCommand` to `.workspace/project.json` if the repo needs one.
3. Re-run the install from Workspace Hub.

## Failed installs

When an install ends in `error`:

1. Read the install log in the details panel first.
2. Check whether the wrong package manager was inferred.
3. Confirm network access, private registry auth, and toolchain availability.
4. If the repo needs a custom install command, write it into the manifest.

## Runtime starts that fail

When the runtime status becomes `error`:

1. Compare the runtime log with the dependency state.
2. If dependencies are still missing or uncertain, install first.
3. Check the repo `devCommand` override or manifest command.
4. Re-run the repo start action only after the failing command is corrected.

## Running process, unreachable preview

If Workspace Hub shows the repo as `running` but health is `unreachable`:

1. Confirm the preview URL is correct.
2. Check whether the dev server chose a different port.
3. Review the runtime log for the actual local URL.
4. Save a `previewUrl` or `healthcheckUrl` override when the repo uses a fixed non-default address.

## Port conflicts

Typical signs:

- the runtime log mentions `address already in use`
- a Vite or Node server exits immediately after launch
- a healthcheck never becomes healthy even though the repo starts

Practical response:

1. Stop the conflicting local process.
2. Restart the repo.
3. If the repo always needs a non-default port, make that explicit in the repo command or manifest.

## Synced folders and Git noise

If the repo lives in a synced folder such as Google Drive, iCloud, or Dropbox, the sync client can interfere with `.git` internals and local metadata files.

Practical response:

1. Prefer a non-synced workspace path for active development.
2. If Git starts reporting broken refs or weird metadata files, pause the sync client and clean the repo.
3. Keep local-only operator files in ignored overrides such as `.workspace/project.local.json` and `docs/*.local.md`.

## When to update the manifest

Update `.workspace/project.json` when Workspace Hub keeps inferring the wrong command, package manager, preview URL, or preferred mode. Use saved overrides for temporary local corrections and the manifest for repo-native behaviour that should stay with the repo.

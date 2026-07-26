---
name: ssh-keychain-access
description: Use when helping establish SSH access through macOS Keychain credentials, especially emergency root SSH, password-to-key bootstrap, authorized_keys repair, or adding SSH private keys to the Apple keychain.
---

# SSH Keychain Access

Use this skill for SSH access recovery where credentials are in macOS Keychain.

## Security stance

- Prefer SSH keys loaded with `ssh-add --apple-use-keychain`.
- Use a Keychain-stored password only as an emergency fallback or to bootstrap key-based access.
- Never print passwords, private keys, API keys, WHM credentials, or licence credentials.
- Do not run `security find-generic-password -w ...` as a standalone command that would expose the password in tool output.
- Do not use `sshpass -p`, put passwords in command history, or disable host key checking.
- For root SSH, narrow the target to the specific host/IP and remove temporary access when recovery is complete.

## Key-first workflow

1. Check loaded identities:

   ```bash
   ssh-add -l
   ```

2. Add the private key to the macOS keychain:

   ```bash
   chmod 600 /path/to/private_key
   ssh-add --apple-use-keychain /path/to/private_key
   ```

3. Test SSH with public-key auth:

   ```bash
   ssh -o PreferredAuthentications=publickey user@host
   ```

## Store a password in Keychain

Run this only in the user's local terminal. It avoids placing the password in shell history:

```bash
SERVICE="example-server-ssh"
ACCOUNT="admin@example-host"
printf 'Password for %s: ' "$ACCOUNT"
OLD_STTY=$(stty -g)
trap 'stty "$OLD_STTY"; unset SSH_PASSWORD' INT TERM EXIT
stty -echo
IFS= read -r SSH_PASSWORD
stty "$OLD_STTY"
printf '\n'
security add-generic-password -U -a "$ACCOUNT" -s "$SERVICE" -w "$SSH_PASSWORD"
unset SSH_PASSWORD
trap - INT TERM EXIT
```

Verify the item exists without printing the password:

```bash
security find-generic-password -a "$ACCOUNT" -s "$SERVICE"
```

## Use the helper

Use the bundled helper when password SSH is required and the password must come from Keychain without appearing in output:

```bash
shared/skills/ssh-keychain-access/scripts/ssh-keychain-login.sh \
  --host example-host \
  --user admin \
  --service example-server-ssh \
  --account admin@example-host
```

For an unknown host key, verify the expected server host key out of band first. Only then re-run with:

```bash
--accept-new-host-key
```

To run a one-off remote command, append it after `--`:

```bash
shared/skills/ssh-keychain-access/scripts/ssh-keychain-login.sh \
  --host example-host \
  --user admin \
  --service example-server-ssh \
  --account admin@example-host \
  -- 'hostname; whoami'
```

## Bootstrap public-key access

If password access works, use it only long enough to install a public key:

```bash
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/codex-whm-recovery-$(date +%Y-%m-%d) -C "codex-whm-recovery-$(date +%Y-%m-%d)"
ssh-add --apple-use-keychain ~/.ssh/codex-whm-recovery-$(date +%Y-%m-%d)
cat ~/.ssh/codex-whm-recovery-$(date +%Y-%m-%d).pub
```

Then append only the public key to the server's `authorized_keys`, confirm public-key login works, and prefer key login for the rest of the session.

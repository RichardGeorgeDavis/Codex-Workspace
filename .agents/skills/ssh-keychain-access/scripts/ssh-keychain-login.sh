#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
Usage:
  ssh-keychain-login.sh --host HOST --user USER --service SERVICE --account ACCOUNT [options] [-- REMOTE_COMMAND]

Options:
  --port PORT               SSH port, default 22.
  --accept-new-host-key     Allow OpenSSH StrictHostKeyChecking=accept-new after verifying the host out of band.
  --help                    Show this help.

The password is read from macOS Keychain and is never printed.
EOF
}

host=""
user=""
service=""
account=""
port="22"
accept_new_host_key="0"
remote_command=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --host)
      host="${2:-}"
      shift 2
      ;;
    --user)
      user="${2:-}"
      shift 2
      ;;
    --service)
      service="${2:-}"
      shift 2
      ;;
    --account)
      account="${2:-}"
      shift 2
      ;;
    --port)
      port="${2:-}"
      shift 2
      ;;
    --accept-new-host-key)
      accept_new_host_key="1"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      remote_command="$*"
      break
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ -z "$host" ] || [ -z "$user" ] || [ -z "$service" ] || [ -z "$account" ]; then
  usage >&2
  exit 2
fi

case "$port" in
  *[!0-9]*|"")
    printf 'Port must be numeric.\n' >&2
    exit 2
    ;;
esac

if ! command -v security >/dev/null 2>&1; then
  printf 'macOS security CLI is required.\n' >&2
  exit 3
fi

if ! command -v expect >/dev/null 2>&1; then
  printf 'expect is required for password SSH automation.\n' >&2
  exit 3
fi

if ! security find-generic-password -a "$account" -s "$service" >/dev/null 2>&1; then
  printf 'No Keychain password found for service "%s" and account "%s".\n' "$service" "$account" >&2
  exit 4
fi

export SSH_KEYCHAIN_ACCOUNT="$account"
export SSH_KEYCHAIN_SERVICE="$service"
export SSH_KEYCHAIN_TARGET="$user@$host"
export SSH_KEYCHAIN_PORT="$port"
export SSH_KEYCHAIN_ACCEPT_NEW_HOST_KEY="$accept_new_host_key"
export SSH_KEYCHAIN_REMOTE_COMMAND="$remote_command"

cleanup() {
  unset SSH_KEYCHAIN_ACCOUNT
  unset SSH_KEYCHAIN_SERVICE
  unset SSH_KEYCHAIN_TARGET
  unset SSH_KEYCHAIN_PORT
  unset SSH_KEYCHAIN_ACCEPT_NEW_HOST_KEY
  unset SSH_KEYCHAIN_REMOTE_COMMAND
}
trap cleanup EXIT HUP INT TERM

expect <<'EXPECT'
set timeout -1

if {[catch {set password [exec security find-generic-password -a $env(SSH_KEYCHAIN_ACCOUNT) -s $env(SSH_KEYCHAIN_SERVICE) -w]} err]} {
  send_user "Unable to read password from Keychain.\n"
  exit 4
}

if {$password eq ""} {
  send_user "Keychain password was empty.\n"
  exit 4
}

set target $env(SSH_KEYCHAIN_TARGET)
set port $env(SSH_KEYCHAIN_PORT)
set remote_command $env(SSH_KEYCHAIN_REMOTE_COMMAND)

set ssh_args [list ssh -p $port -o PreferredAuthentications=password,keyboard-interactive -o PubkeyAuthentication=no]

if {$env(SSH_KEYCHAIN_ACCEPT_NEW_HOST_KEY) eq "1"} {
  lappend ssh_args -o StrictHostKeyChecking=accept-new
}

lappend ssh_args $target

if {$remote_command ne ""} {
  lappend ssh_args $remote_command
}

spawn {*}$ssh_args

set password_sent 0

expect {
  -re "(?i)are you sure you want to continue connecting" {
    send_user "\nHost key is unknown. Verify the host key first, then re-run with --accept-new-host-key if appropriate.\n"
    exit 20
  }
  -re "(?i)password:" {
    if {$password_sent == 1} {
      send_user "\nSSH password was rejected.\n"
      exit 21
    }
    send -- "$password\r"
    set password_sent 1

    if {$remote_command eq ""} {
      interact
      exit 0
    }

    exp_continue
  }
  -re "(?i)permission denied" {
    send_user "\nSSH permission denied.\n"
    exit 21
  }
  eof {
    catch wait result
    exit [lindex $result 3]
  }
}
EXPECT

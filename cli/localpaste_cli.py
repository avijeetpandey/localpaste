#!/usr/bin/env python3
"""LocalPaste CLI — share code and text from the terminal."""
from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from typing import Any, Optional

DEFAULT_API_URL = os.getenv("LOCALPASTE_API_URL", "http://localhost:8000/api/v1")
DEFAULT_BASE_URL = os.getenv("LOCALPASTE_BASE_URL", "http://localhost:4200")
CONFIG_DIR = os.path.expanduser("~/.localpaste")
CONFIG_PATH = os.path.join(CONFIG_DIR, "config.json")


# ─── Config helpers ────────────────────────────────────────────────────────────

def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH) as fh:
                return json.load(fh)
        except Exception:
            pass
    return {}


def save_config(cfg: dict) -> None:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w") as fh:
        json.dump(cfg, fh, indent=2)


# ─── HTTP helper ───────────────────────────────────────────────────────────────

def api_request(
    method: str,
    path: str,
    data: Optional[dict] = None,
    token: Optional[str] = None,
    base_url: str = DEFAULT_API_URL,
) -> Any:
    url = f"{base_url}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            if raw:
                return json.loads(raw.decode())
            return None
    except urllib.error.HTTPError as exc:
        body_bytes = exc.read()
        try:
            detail = json.loads(body_bytes.decode()).get("detail", body_bytes.decode())
        except Exception:
            detail = body_bytes.decode()
        print(f"Error {exc.code}: {detail}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"Connection error: {exc.reason}", file=sys.stderr)
        sys.exit(1)


def require_token(cfg: dict) -> str:
    token = cfg.get("token")
    if not token:
        print("Not authenticated. Run:  localpaste login", file=sys.stderr)
        sys.exit(1)
    return token


# ─── Commands ──────────────────────────────────────────────────────────────────

def cmd_login(args: argparse.Namespace, cfg: dict) -> None:
    email = args.email or input("Email: ")
    password = args.password or getpass.getpass("Password: ")
    result = api_request("POST", "/auth/login", {"email": email, "password": password})
    cfg["token"] = result["access_token"]
    cfg["email"] = result["user"]["email"]
    cfg["username"] = result["user"]["username"]
    save_config(cfg)
    print(f"✓ Logged in as {result['user']['email']} ({result['user']['username']})")


def cmd_logout(args: argparse.Namespace, cfg: dict) -> None:
    cfg.pop("token", None)
    cfg.pop("email", None)
    cfg.pop("username", None)
    save_config(cfg)
    print("✓ Logged out")


def cmd_whoami(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result = api_request("GET", "/auth/me", token=token)
    print(f"  Email:    {result['email']}")
    print(f"  Username: {result['username']}")
    print(f"  Admin:    {result['is_admin']}")
    print(f"  Active:   {result['is_active']}")


def cmd_create(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)

    # Read content from pipe, file, or interactive input
    if args.file:
        try:
            with open(args.file) as fh:
                content = fh.read()
        except OSError as exc:
            print(f"Error reading file: {exc}", file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        content = sys.stdin.read()
    else:
        print("Enter your paste content (press Ctrl+D on a blank line to submit):")
        lines: list[str] = []
        try:
            while True:
                lines.append(input())
        except EOFError:
            pass
        content = "\n".join(lines)

    if not content.strip():
        print("Error: content is empty", file=sys.stderr)
        sys.exit(1)

    visibility = "private" if args.private else ("unlisted" if args.unlisted else "public")
    payload: dict = {
        "title": args.title,
        "content": content,
        "language": args.language,
        "visibility": visibility,
        "burn_after_read": args.burn,
        "expiration": args.expiration,
        "encrypt": args.encrypt,
        "zk_encrypted": False,
    }

    result = api_request("POST", "/pastes", payload, token=token)
    url = f"{DEFAULT_BASE_URL}/p/{result['id']}"
    print(f"✓ Created: {url}")
    if args.json_output:
        print(json.dumps(result, indent=2, default=str))


def cmd_get(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result = api_request("GET", f"/pastes/{args.id}", token=token)
    if args.raw:
        print(result.get("content", ""))
    else:
        print(f"ID:         {result['id']}")
        print(f"Title:      {result['title']}")
        print(f"Language:   {result['language']}")
        print(f"Visibility: {result['visibility']}")
        print(f"Version:    {result.get('version', 1)}")
        print(f"Views:      {result['view_count']}")
        print(f"Size:       {result['size_bytes']} bytes")
        print(f"Created:    {result['created_at']}")
        expires = result.get("expires_at")
        if expires:
            print(f"Expires:    {expires}")
        flags = []
        if result.get("burn_after_read"):
            flags.append("burn-after-read")
        if result.get("is_encrypted"):
            flags.append("server-encrypted")
        if result.get("zk_encrypted"):
            flags.append("zero-knowledge")
        if flags:
            print(f"Flags:      {', '.join(flags)}")
        print("---")
        print(result.get("content", ""))


def cmd_list(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result: list = api_request("GET", "/pastes", token=token) or []
    if not result:
        print("No pastes found.")
        return
    print(f"{'ID':<10}  {'Title':<35}  {'Lang':<12}  {'Vis':<9}  {'Views':<6}  URL")
    print("-" * 110)
    for p in result:
        url = f"{DEFAULT_BASE_URL}/p/{p['id']}"
        title = (p["title"] or "")[:33]
        print(f"{p['id']:<10}  {title:<35}  {p['language']:<12}  {p['visibility']:<9}  {p['view_count']:<6}  {url}")


def cmd_delete(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    if not args.yes:
        confirm = input(f"Delete paste '{args.id}'? This cannot be undone. [y/N]: ").strip().lower()
        if confirm != "y":
            print("Aborted.")
            return
    url = f"{DEFAULT_API_URL}/pastes/{args.id}"
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        urllib.request.urlopen(req)
        print(f"✓ Deleted paste {args.id}")
    except urllib.error.HTTPError as exc:
        print(f"Error {exc.code}: {exc.read().decode()}", file=sys.stderr)
        sys.exit(1)


def cmd_fork(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result = api_request("POST", f"/pastes/{args.id}/fork", {}, token=token)
    url = f"{DEFAULT_BASE_URL}/p/{result['id']}"
    print(f"✓ Forked as {result['id']} (v{result.get('version', 1)}): {url}")


def cmd_versions(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result: list = api_request("GET", f"/pastes/{args.id}/versions", token=token) or []
    print(f"Version history for paste {args.id}:")
    for p in result:
        parent_str = f"← {p.get('parent_id', '')}" if p.get("parent_id") else "(root)"
        print(f"  v{p.get('version', 1)}  {p['id']}  {p['title'][:30]}  {parent_str}  {p['created_at'][:19]}")


def cmd_diff(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result = api_request("GET", f"/pastes/{args.id}/diff", token=token)
    additions = result.get("additions", 0)
    deletions = result.get("deletions", 0)
    parent = result.get("parent_id") or "(none)"
    print(f"Diff for paste {result['paste_id']} v{result['version']} ← parent {parent}")
    print(f"+{additions} additions  -{deletions} deletions")
    print()
    for line in result.get("diff_lines", []):
        change = line["change_type"]
        content = line["content"]
        ln_old = str(line["line_num_old"] or " ").rjust(4)
        ln_new = str(line["line_num_new"] or " ").rjust(4)
        if change == "insert":
            prefix = "\033[32m+"
            suffix = "\033[0m"
        elif change == "delete":
            prefix = "\033[31m-"
            suffix = "\033[0m"
        else:
            prefix = " "
            suffix = ""
        print(f"{ln_old} {ln_new} {prefix}{content}{suffix}")


def cmd_analytics(args: argparse.Namespace, cfg: dict) -> None:
    token = require_token(cfg)
    result = api_request("GET", f"/pastes/{args.id}/analytics", token=token)
    if result.get("error"):
        print(f"Analytics unavailable: {result['error']}")
        return
    print(f"Analytics for paste {args.id}")
    print(f"  Total views:     {result['total_views']}")
    print(f"  Unique visitors: {result['unique_visitors']}")
    if result.get("first_seen"):
        print(f"  First seen:      {result['first_seen']}")
    if result.get("last_seen"):
        print(f"  Last seen:       {result['last_seen']}")
    if result.get("top_referers"):
        print("  Top referers:")
        for r in result["top_referers"][:5]:
            print(f"    {r['count']:>6}  {r['referer']}")


# ─── Argument parser ───────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="localpaste",
        description="LocalPaste CLI — share code and text from your terminal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  cat app.log | localpaste create --title "App Logs" --language bash
  localpaste create --file main.py --language python --private
  localpaste list
  localpaste get <id> --raw
  localpaste fork <id>
  localpaste diff <id>
  localpaste delete <id>

Environment variables:
  LOCALPASTE_API_URL   API base URL (default: http://localhost:8000/api/v1)
  LOCALPASTE_BASE_URL  Frontend base URL (default: http://localhost:4200)
""",
    )
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    sub.required = True

    # login
    p_login = sub.add_parser("login", help="Authenticate with your LocalPaste account")
    p_login.add_argument("--email", "-e", help="Email address")
    p_login.add_argument("--password", "-p", help="Password (omit to prompt securely)")

    # logout
    sub.add_parser("logout", help="Clear stored credentials")

    # whoami
    sub.add_parser("whoami", help="Display current authenticated user info")

    # create
    p_create = sub.add_parser("create", help="Create a new paste (reads stdin if no --file)")
    p_create.add_argument("--title", "-t", default="CLI paste", help="Paste title")
    p_create.add_argument("--language", "-l", default="plaintext", help="Syntax language")
    p_create.add_argument("--file", "-f", metavar="FILE", help="Read content from file")
    p_create.add_argument("--private", action="store_true", help="Set visibility to private")
    p_create.add_argument("--unlisted", action="store_true", help="Set visibility to unlisted")
    p_create.add_argument("--burn", action="store_true", help="Enable burn-after-read")
    p_create.add_argument("--encrypt", action="store_true", help="Enable server-side AES-GCM encryption")
    p_create.add_argument(
        "--expiration", default="never",
        choices=["never", "10m", "1h", "1d", "1w", "1mo"],
        help="Expiration window (default: never)",
    )
    p_create.add_argument("--json", dest="json_output", action="store_true", help="Print full JSON response")

    # get
    p_get = sub.add_parser("get", help="Fetch paste content by ID")
    p_get.add_argument("id", help="Paste ID")
    p_get.add_argument("--raw", action="store_true", help="Print only the raw content")

    # list
    sub.add_parser("list", help="List your pastes")

    # delete
    p_del = sub.add_parser("delete", help="Delete a paste by ID")
    p_del.add_argument("id", help="Paste ID")
    p_del.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")

    # fork
    p_fork = sub.add_parser("fork", help="Fork a paste (creates a new version)")
    p_fork.add_argument("id", help="Paste ID to fork")

    # versions
    p_vers = sub.add_parser("versions", help="Show version chain for a paste")
    p_vers.add_argument("id", help="Paste ID")

    # diff
    p_diff = sub.add_parser("diff", help="Show diff between a paste and its parent")
    p_diff.add_argument("id", help="Paste ID")

    # analytics
    p_analytics = sub.add_parser("analytics", help="Show view analytics for a paste")
    p_analytics.add_argument("id", help="Paste ID")

    return parser


# ─── Entry point ───────────────────────────────────────────────────────────────

DISPATCH = {
    "login": cmd_login,
    "logout": cmd_logout,
    "whoami": cmd_whoami,
    "create": cmd_create,
    "get": cmd_get,
    "list": cmd_list,
    "delete": cmd_delete,
    "fork": cmd_fork,
    "versions": cmd_versions,
    "diff": cmd_diff,
    "analytics": cmd_analytics,
}


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    cfg = load_config()
    DISPATCH[args.command](args, cfg)


if __name__ == "__main__":
    main()

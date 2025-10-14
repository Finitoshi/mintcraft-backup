#!/usr/bin/env bash
set -euo pipefail
from fastmcp import FastMCP
import pathlib

APP = FastMCP("mintcraft mcp")
ROOT = pathlib.Path("/home/fini/mintcraft-backup").resolve()

def _safe(p: str) -> pathlib.Path:
    q = (ROOT / p).resolve()
    if not str(q).startswith(str(ROOT)):
        raise ValueError("Path escapes project root")
    return q

@APP.tool
def ls(path: str = "."):
    "List files relative to project root"
    base = _safe(path)
    return [str(p.relative_to(ROOT)) + ("/" if p.is_dir() else "") for p in sorted(base.iterdir())]

@APP.tool
def read(path: str):
    "Read a UTF-8 text file"
    return _safe(path).read_text(encoding="utf-8")

@APP.tool
def write(path: str, content: str, mkdirs: bool = True):
    "Write a UTF-8 text file (create parents when needed)"
    p = _safe(path)
    if mkdirs:
        p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return {"ok": True, "bytes": len(content), "path": str(p.relative_to(ROOT))}

@APP.tool
def append(path: str, content: str, mkdirs: bool = True):
    "Append UTF-8 text to a file"
    p = _safe(path)
    if mkdirs:
        p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(content)
    return {"ok": True, "path": str(p.relative_to(ROOT))}

if __name__ == "__main__":
    APP.run(transport="http", host="0.0.0.0", port=8974)
"PY"

echo "==> Fix Anchor Docker image to v0.32.1 (newer rust/cargo)"
# Create Anchor.toml if missing
test -f Anchor.toml || cat > Anchor.toml <<EOF
[features]
seeds = false
skip-lint = false

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[docker]
# Anchor reads this when running inside docker
image = "backpackapp/build:v0.32.1"
EOF

# Force image line (add if absent)
if grep -qE "^\s*image\s*=" Anchor.toml; then
  sed -i \s#^s*images*=.*#image

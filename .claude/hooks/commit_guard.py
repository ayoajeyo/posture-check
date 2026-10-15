"""PreToolUse 훅(Bash): git commit 직전에 올리면 안 되는 파일이 있는지 본다.

막는 것: .env 류 비밀 파일, 키 파일, 5MB 이상 파일(사진·zip 을 실수로 커밋).
보통은 스테이징된 파일만 본다. `git commit -a` 나 `git add -A/.` 가 같은 명령에 있으면
작업 폴더 전체(미추적 포함)를 본다. 한글 파일명도 그대로 읽도록 core.quotepath=false + -z 를 쓴다.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdin.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

command = json.load(sys.stdin).get("tool_input", {}).get("command", "")
if not re.search(r"\bgit\s+commit\b", command):
    sys.exit(0)

root = Path(os.environ.get("CLAUDE_PROJECT_DIR", "."))
MAX_BYTES = 5 * 1024 * 1024
SECRET_NAME = re.compile(r"(^|/)(\.env(\..+)?|.*\.(pem|key|p12|jks|keystore))$")
whole_tree = bool(re.search(r"git\s+commit\b[^|&;]*\s-[a-zA-Z]*a|git\s+add\s+(-A|--all|\.)(\s|$)", command))


def git(*args):
    return subprocess.run(["git", "-c", "core.quotepath=false", *args], cwd=root,
                          capture_output=True, encoding="utf-8", errors="replace", text=True)


if whole_tree:
    r = git("status", "--porcelain", "-z", "--untracked-files=all")
    entries = [e[3:] for e in r.stdout.split("\0") if len(e) > 3 and e[0] != "D" and e[1] != "D"]
else:
    r = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
    entries = [e for e in r.stdout.split("\0") if e]
if r.returncode != 0:
    sys.exit(0)

problems = []
for rel in entries:
    if SECRET_NAME.search(rel) and not rel.endswith(".example"):
        problems.append(f"{rel}: 비밀 파일은 커밋하지 않습니다 (.gitignore 에 있는지 확인)")
        continue
    try:
        size = (root / rel).stat().st_size
    except OSError:
        continue
    if size > MAX_BYTES:
        problems.append(f"{rel}: {size // (1024*1024)}MB — 5MB 가 넘는 파일(사진·압축)은 코드 저장소에 넣지 않습니다")

if problems:
    print("BLOCKED: 커밋을 멈췄습니다.\n- " + "\n- ".join(problems) +
          "\n해당 파일을 .gitignore 에 추가하거나 옮긴 뒤 다시 커밋하세요.", file=sys.stderr)
    sys.exit(2)

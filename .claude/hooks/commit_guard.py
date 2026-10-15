"""PreToolUse 훅(Bash): git commit 직전에 올리면 안 되는 파일이 있는지 본다.

막는 것: .env 류 비밀 파일, 키 파일, 5MB 이상 파일(사진·zip 을 실수로 커밋),
커밋될 내용 속 비밀키, `.claude/pii-names.local.txt` 에 적은 실제 회원 이름(내용·메시지).
보통은 스테이징된 파일만 본다. `git commit -a` 나 `git add -A/.` 가 같은 명령에 있으면
작업 폴더 전체(미추적 포함)를 본다. 한글 파일명도 그대로 읽도록 core.quotepath=false + -z 를 쓴다.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from secret_guard import find_secret  # noqa: E402  같은 비밀키 판별 규칙을 그대로 씀

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

# 커밋될 내용(추가되는 줄)도 본다: 셸(sed·python)로 고친 파일은 secret_guard 를 거치지 않기 때문
if whole_tree:
    head = git("diff", "HEAD", "--no-color", "-U0")
    added = head.stdout if head.returncode == 0 else ""
    untracked = git("ls-files", "--others", "--exclude-standard", "-z").stdout.split("\0")
else:
    added, untracked = git("diff", "--cached", "--no-color", "-U0").stdout, []
added = "\n".join(l[1:] for l in added.splitlines() if l.startswith("+") and not l.startswith("+++"))
for rel in filter(None, untracked):
    try:
        if (root / rel).stat().st_size <= MAX_BYTES:
            added += "\n" + (root / rel).read_text(encoding="utf-8", errors="ignore")
    except OSError:
        pass

secret = find_secret(added)
if secret:
    problems.append(f"커밋할 내용에 {secret}로 보이는 값이 있습니다 — 서버 환경변수나 .env 로 옮기세요")

# 실제 회원 이름: 이 PC 에만 있는 목록 파일(git 에 안 올림)에 적힌 이름이 내용·커밋 메시지에 있으면 막음
names_file = root / ".claude" / "pii-names.local.txt"
if names_file.exists():
    names = [n.strip() for n in names_file.read_text(encoding="utf-8").splitlines()
             if n.strip() and not n.lstrip().startswith("#")]
    for n in names:
        if n in added or n in command:
            problems.append(f"실제 회원 이름({n[0]}{'○' * (len(n) - 1)})이 커밋 내용이나 메시지에 있습니다 — 지우거나 '회원 A' 처럼 바꾸세요")

if problems:
    print("BLOCKED: 커밋을 멈췄습니다.\n- " + "\n- ".join(problems) +
          "\n해당 파일을 .gitignore 에 추가하거나 옮긴 뒤 다시 커밋하세요.", file=sys.stderr)
    sys.exit(2)

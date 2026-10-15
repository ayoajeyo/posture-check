"""Stop 훅: package.json 의 scripts 에 있는 lint → build → test 만 실행한다. 없으면 조용히 통과.

실패하면 종료코드 2 로 Claude 에게 돌려줘서 직접 고치게 한다. 단, 이미 이 훅 때문에 계속 중인
경우(stop_hook_active)에는 무한 반복을 막기 위해 사용자에게만 알리고(종료코드 1) 끝낸다.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

sys.stdin.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")  # Windows 기본 cp949면 한글 메시지가 깨진다
root = Path(os.environ.get("CLAUDE_PROJECT_DIR", "."))
pkg = root / "package.json"
if not pkg.exists():
    sys.exit(0)

try:
    scripts = json.loads(pkg.read_text(encoding="utf-8")).get("scripts", {})
    hook_input = json.load(sys.stdin) if not sys.stdin.isatty() else {}
except Exception:
    scripts, hook_input = {}, {}
already_retrying = bool(hook_input.get("stop_hook_active"))

for script in ("lint", "build", "test"):
    if script not in scripts:
        continue
    # shell=True: Windows에서 npm은 npm.cmd라서 셸을 거쳐야 실행된다
    r = subprocess.run(f"npm run {script}", shell=True, cwd=root,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(f"npm run {script} 실패 — 고친 뒤 다시 끝내세요:\n{r.stdout[-2000:]}{r.stderr[-2000:]}", file=sys.stderr)
        sys.exit(1 if already_retrying else 2)

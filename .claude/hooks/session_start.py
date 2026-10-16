"""SessionStart 훅: Claude Code를 켤 때 다른 PC에서 올린 변경이 있는지 알려준다.

병원 PC와 집 PC를 오가며 작업할 때, git pull을 잊고 작업하면 내용이 충돌한다.
여기서 출력한 내용은 Claude에게 전달되고, Claude가 사용자에게 안내한다.
네트워크가 느리거나 git 저장소가 아니면 조용히 넘어간다.
"""

import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
root = os.environ.get("CLAUDE_PROJECT_DIR", ".")


def git(*args, timeout=8):
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}  # 로그인 창 대기로 멈추지 않게
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout, env=env)


def handoff_summary(max_lines=6):
    """docs/HANDOFF.md 가 '진행 중' 이면 갱신 시각과 '다음 할 일' 앞부분만 돌려준다 (짧게 — 토큰 절약)."""
    path = os.path.join(root, "docs", "HANDOFF.md")
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return ""
    if "상태: 진행 중" not in text:
        return ""
    when = next((l.strip() for l in text.splitlines() if l.startswith("갱신:")), "")
    part = text.split("## 다음 할 일", 1)[-1].split("\n## ", 1)[0]
    items = [l.rstrip() for l in part.splitlines()[1:] if l.strip()][:max_lines]
    return "\n".join(["  " + when] + ["  " + l for l in items])


try:
    if git("rev-parse", "--is-inside-work-tree").returncode != 0:
        sys.exit(0)
    notes = []
    if git("rev-parse", "--abbrev-ref", "@{u}").returncode == 0:
        git("fetch", "--quiet", timeout=10)
        behind = git("rev-list", "--count", "HEAD..@{u}").stdout.strip()
        if behind.isdigit() and int(behind) > 0:
            notes.append(f"GitHub에 이 PC에 없는 새 커밋이 {behind}개 있습니다. "
                         f"작업 전에 `git pull`을 해야 충돌이 나지 않습니다.")
    changed = [l for l in git("status", "--porcelain").stdout.splitlines() if l.strip()]
    if changed:
        notes.append(f"저장(커밋)하지 않은 변경 파일이 {len(changed)}개 있습니다.")
    handoff = handoff_summary()
    if notes or handoff:
        print("[작업 시작 전 확인] 아래 내용을 사용자에게 첫 답변에서 한국어로 짧게 알려주세요.")
        for n in notes:
            print(f"- {n}")
        if handoff:
            print("- 지난 대화의 인수인계(docs/HANDOFF.md)가 있습니다. 이어서 할 일:")
            print(handoff)
            print("  자세한 내용은 docs/HANDOFF.md 를 읽고 이어가세요.")
except Exception:
    sys.exit(0)

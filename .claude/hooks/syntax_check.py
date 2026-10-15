"""PostToolUse 훅(Write/Edit): 저장된 파일의 문법을 바로 검사한다.

.js → node --check (Node 가 없으면 건너뜀), .json → 파싱, .html → 태그 균형 간단 검사
(주석과 script/style 본문은 빼고 센다) + 안에 든 <script> 본문도 node --check. 문제가 있으면 종료코드 2 로 Claude 에게 알려 즉시 고치게 한다.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdin.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

data = json.load(sys.stdin)
path = Path(data.get("tool_input", {}).get("file_path", ""))
if not path.is_file():
    sys.exit(0)

text = path.read_text(encoding="utf-8", errors="replace")
problem = None

if path.suffix in (".js", ".mjs"):
    node = shutil.which("node")
    if node:
        r = subprocess.run([node, "--check", str(path)], capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        if r.returncode != 0:
            problem = r.stderr.strip()[-1500:]
elif path.suffix == ".json":
    try:
        json.loads(text)
    except json.JSONDecodeError as e:
        problem = f"JSON 형식 오류: {e.msg} (줄 {e.lineno}, 칸 {e.colno})"
elif path.suffix in (".html", ".htm"):
    body = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    # script/style 안의 문자열("</div>")과 CSS 주석은 태그가 아니다 → 본문만 비운다
    body = re.sub(r"(<script\b[^>]*>).*?(</script\s*>)", r"\1\2", body, flags=re.S | re.I)
    body = re.sub(r"(<style\b[^>]*>).*?(</style\s*>)", r"\1\2", body, flags=re.S | re.I)
    for tag in ("div", "section", "main", "form", "table", "ul", "ol", "button", "script", "style"):
        opened = len(re.findall(rf"<{tag}(\s[^>]*)?>", body, re.IGNORECASE))
        closed = len(re.findall(rf"</{tag}\s*>", body, re.IGNORECASE))
        if opened != closed:
            problem = f"<{tag}> 여는 태그 {opened}개, 닫는 태그 {closed}개 — 짝이 맞지 않습니다"
            break
    # HTML 안 <script> 본문도 node --check (앱 코드가 index.html 한 파일에 있는 경우)
    node = shutil.which("node")
    # 주석은 줄바꿈만 남기고 지움 → 줄 번호 유지
    nocomment = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group().count("\n"), text, flags=re.S)
    scripts = re.finditer(r"<script\b([^>]*)>(.*?)</script\s*>", nocomment, flags=re.S | re.I) if node and not problem else []
    for m in scripts:
        attrs, code = m.group(1), m.group(2)
        kind = re.search(r"""\btype\s*=\s*["']?([^"'\s>]+)""", attrs, re.I)
        kind = kind.group(1).lower() if kind else ""
        if re.search(r"\bsrc\s*=", attrs, re.I) or not code.strip() or kind not in ("", "module", "text/javascript", "application/javascript"):
            continue
        # 앞을 빈 줄로 채워 node 오류의 줄 번호 = HTML 파일 줄 번호
        pad = "\n" * nocomment.count("\n", 0, m.start(2))
        tmp = tempfile.NamedTemporaryFile("w", suffix=".mjs" if kind == "module" else ".js",
                                          delete=False, encoding="utf-8")
        try:
            tmp.write(pad + code); tmp.close()
            r = subprocess.run([node, "--check", tmp.name], capture_output=True, text=True,
                               encoding="utf-8", errors="replace")
        finally:
            os.unlink(tmp.name)
        if r.returncode != 0:
            line = re.search(r":(\d+)\s*$", r.stderr.splitlines()[0] if r.stderr else "")
            where = f"줄 {line.group(1)}" if line else "줄 위치 모름"
            problem = f"<script> 문법 오류 ({where}):\n" + r.stderr.replace(tmp.name, path.name).strip()[-1500:]
            break

if problem:
    print(f"문법 검사 실패: {path.name}\n{problem}\n지금 바로 고치세요.", file=sys.stderr)
    sys.exit(2)

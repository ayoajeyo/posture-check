"""PreToolUse 훅(Write/Edit): 비밀키가 코드 파일에 들어가는 것을 막는다.

브라우저에서 돌아가는 앱의 코드는 누구나 볼 수 있다. 공개돼도 되는 키(Supabase anon)는 허용하고,
공개되면 안 되는 키(service_role, API 비밀키, 개인 키)만 막는다. 종료코드 2 = 차단.
"""

import base64
import json
import re
import sys
from pathlib import Path

PATTERNS = [
    # 왼쪽 경계 + 숫자 포함 + 32자 이상: CSS 클래스(.sk-loading)나 설명 문구는 통과
    # 실제 키는 대·소문자·숫자가 섞인 32자 이상. 소문자만 있는 식별자(task-id 등)나 CSS 클래스는 통과
    (r"(?<![\w./-])sk-(ant-|proj-|live-|test-)?(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])[A-Za-z0-9_-]{32,}", "OpenAI/Anthropic/Stripe 비밀키"),
    (r"(?<![\w])AKIA(?!IOSFODNN7EXAMPLE)[0-9A-Z]{16}(?![\w])", "AWS 액세스 키"),
    (r"(?<![\w])gh[pousr]_[A-Za-z0-9]{36,}", "GitHub 토큰"),
    (r"(?<![\w])AIza[0-9A-Za-z_-]{35}(?![\w])", "Google API 키"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "개인 키(Private key)"),
    (r"(?<![\w])sb_secret_[A-Za-z0-9_-]{20,}", "Supabase secret 키"),
]
JWT = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}")
SAFE_FILES = re.compile(r"(^|[\\/])\.env(\.[\w-]+)?$")  # .env, .env.local 등은 허용


def is_service_role(payload_b64: str) -> bool:
    try:
        raw = base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4))
        return '"service_role"' in raw.decode("utf-8", "ignore")
    except Exception:
        return False


def find_secret(text: str):
    for pattern, label in PATTERNS:
        if re.search(pattern, text):
            return label
    for m in JWT.finditer(text):
        if is_service_role(m.group(1)):
            return "Supabase service_role 키"
    return None


def main():
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    data = json.load(sys.stdin)
    tool_input = data.get("tool_input", {})
    path = tool_input.get("file_path", "")
    if SAFE_FILES.search(path) and not Path(path).name.endswith(".example"):
        sys.exit(0)

    texts = [tool_input.get("content", ""), tool_input.get("new_string", "")]
    texts += [e.get("new_string", "") for e in tool_input.get("edits", [])]
    label = find_secret("\n".join(t for t in texts if t))
    if label:
        print(f"BLOCKED: {Path(path).name}에 {label}로 보이는 값이 들어가려 해서 막았습니다.\n"
              f"브라우저 코드에는 비밀키를 넣을 수 없습니다. 서버 쪽(Supabase Edge Function 환경변수)이나 "
              f"로컬 스크립트용 .env 에 두세요. (Supabase anon 키는 공개용이라 js/config.js 에 넣어도 됩니다)",
              file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":   # commit_guard 가 find_secret 만 가져다 쓴다
    main()

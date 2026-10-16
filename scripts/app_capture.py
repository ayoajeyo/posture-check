"""로그인이 필요한 화면 캡처 — agent-browser 로 '테스트 계정' 에 로그인된 브라우저를 기억해 두고 찍는다.

scripts/screenshot.py 는 매번 새 브라우저라 로그인 뒤 화면(회원 목록·리포트)을 못 찍는다.
이 스크립트는 PC 에 저장된 전용 브라우저 프로필(로그인 유지)로 찍는다.

1) 처음 한 번 (사람이 PowerShell 에서):
    npm i -g agent-browser
    agent-browser install
    python scripts/app_capture.py login          # 브라우저 창이 뜨면 '테스트 계정' 으로 로그인 → Enter

2) 찍기 (AI 도 실행 가능):
    python scripts/app_capture.py shot                              # 첫 화면
    python scripts/app_capture.py shot --text "회원" --name members  # '회원' 글자를 눌러 이동 후
    python scripts/app_capture.py shot --hash "#report" --full

3) 기타:
    python scripts/app_capture.py status     # 설치·로그인 준비 상태
    python scripts/app_capture.py forget     # 저장된 로그인 지우기

설정: .claude/capture.json  {"url": "https://…/앱/"}  (비밀값 없음. 없으면 --url 로 준다)
프로필(로그인 정보)은 저장소 밖 ~/.agent-browser/profiles/{앱폴더}-test 에 둔다 → GitHub 에 안 올라간다.
.claude/pii-names.local.txt 에 적힌 실제 회원 이름이 화면에 보이면 사진을 지우고 멈춘다.
끝나는 번호: 0 정상 · 2 찍었지만 문제 · 3 도구/로그인 준비 안 됨 · 4 페이지 실패 · 5 실제 회원 이름 발견(사진 삭제)
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXIT_PROBLEMS, EXIT_NOT_READY, EXIT_OPEN_FAILED, EXIT_REAL_NAME = 2, 3, 4, 5

INSTALL_HELP = (
    "agent-browser 가 이 PC 에 없습니다. PowerShell 에서 한 번만:\n"
    "  npm i -g agent-browser\n"
    "  agent-browser install\n"
    "그다음 로그인 준비: python scripts/app_capture.py login"
)


def app_name():
    return re.sub(r"[^\w.-]+", "-", ROOT.name) or "app"


def profile_dir():
    return Path.home() / ".agent-browser" / "profiles" / f"{app_name()}-test"


def session_name():
    return f"{app_name()}-capture"


def load_url(cli_url):
    if cli_url:
        return cli_url
    cfg = ROOT / ".claude" / "capture.json"
    if cfg.exists():
        try:
            url = json.loads(cfg.read_text(encoding="utf-8")).get("url", "")
        except json.JSONDecodeError:
            url = ""
        if url:
            return url
    raise SystemExit('주소가 없습니다. --url 로 주거나 .claude/capture.json 에 {"url": "https://…"} 를 적으세요.')


def real_names():
    f = ROOT / ".claude" / "pii-names.local.txt"
    if not f.exists():
        return []
    return [n.strip() for n in f.read_text(encoding="utf-8").splitlines()
            if n.strip() and not n.lstrip().startswith("#")]


def mask(name):
    return name[0] + "○" * (len(name) - 1)


def find_real_names(text, names):
    return [n for n in names if n and n in text]


def ab_bin():
    return shutil.which("agent-browser")


def ab(*args, check=True, timeout=60):
    """agent-browser 를 이 앱 전용 세션으로 실행한다. (returncode, stdout) 반환."""
    cmd = [ab_bin(), "--session", session_name(), *args]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired:
        return 124, ""
    if check and r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip().splitlines()[-1:] or ["실패"])
    return r.returncode, r.stdout


def out_path(name, width, part=0):
    base = re.sub(r"[^\w가-힣-]+", "-", name).strip("-") or "app"
    suffix = f"-{part}" if part else ""
    return ROOT / ".shots" / f"{base}-{width}-login{suffix}.png"


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="로그인된 테스트 계정으로 앱 화면 캡처 (agent-browser)")
    sub = p.add_subparsers(dest="cmd", required=True)
    lg = sub.add_parser("login", help="테스트 계정으로 로그인해 두기 (사람이 직접)")
    lg.add_argument("--url", default="")
    sh = sub.add_parser("shot", help="로그인된 상태로 화면 캡처")
    sh.add_argument("--url", default="")
    sh.add_argument("--hash", default="", help='주소 뒤 #화면 (예: "#members")')
    sh.add_argument("--text", action="append", default=[], help="이 글자가 쓰인 요소를 눌러 이동. 여러 번 가능")
    sh.add_argument("--click", action="append", default=[], help="CSS 선택자를 눌러 이동. 여러 번 가능")
    sh.add_argument("--wait-text", default="", help="이 글자가 보일 때까지 기다림")
    sh.add_argument("--name", default="app", help="저장 파일 이름")
    sh.add_argument("--width", type=int, default=390)
    sh.add_argument("--height", type=int, default=844)
    sh.add_argument("--full", action="store_true", help="스크롤 끝까지 한 장으로")
    sub.add_parser("status", help="준비 상태 확인")
    sub.add_parser("forget", help="저장된 로그인(프로필) 지우기")
    return p.parse_args(argv)


def cmd_status():
    ok = True
    print(f"agent-browser: {'있음' if ab_bin() else '없음'}")
    ok &= bool(ab_bin())
    prof = profile_dir()
    print(f"로그인 프로필: {prof} — {'있음' if prof.exists() else '없음 (python scripts/app_capture.py login)'}")
    ok &= prof.exists()
    cfg = ROOT / ".claude" / "capture.json"
    print(f"주소 설정: {cfg.relative_to(ROOT)} — {'있음' if cfg.exists() else '없음 (--url 로 지정)'}")
    print(f"실제 이름 목록: {'있음 ' + str(len(real_names())) + '개' if real_names() else '없음 (.claude/pii-names.local.txt)'}")
    return 0 if ok else EXIT_NOT_READY


def cmd_login(args):
    if not ab_bin():
        print(INSTALL_HELP, file=sys.stderr)
        return EXIT_NOT_READY
    if not sys.stdin.isatty():
        print("이 명령은 사람이 PowerShell 에서 직접 실행해야 합니다 (브라우저 창에서 로그인).", file=sys.stderr)
        return EXIT_NOT_READY
    url = load_url(args.url)
    profile_dir().parent.mkdir(parents=True, exist_ok=True)
    ab("--profile", str(profile_dir()), "--headed", "open", url, timeout=120)
    print("브라우저 창이 열렸습니다.\n"
          "1) 반드시 '테스트 계정' 으로 로그인하세요 (실제 회원이 들어 있는 계정 금지).\n"
          "2) 회원 목록이 보이면 이 창으로 돌아와 Enter 를 누르세요.")
    try:
        input()
    except (EOFError, KeyboardInterrupt):
        pass
    ab("close", check=False)
    print(f"저장했습니다. 로그인 정보는 이 PC 에만 있습니다: {profile_dir()}")
    return 0


def cmd_forget():
    prof = profile_dir()
    if ab_bin():
        ab("close", check=False)
    if prof.exists():
        shutil.rmtree(prof, ignore_errors=True)
        print(f"지웠습니다: {prof}")
    else:
        print("저장된 로그인이 없습니다.")
    return 0


def cmd_shot(args):
    if not ab_bin():
        print(INSTALL_HELP, file=sys.stderr)
        return EXIT_NOT_READY
    if not profile_dir().exists():
        print("로그인 준비가 안 됐습니다. 사람이 먼저: python scripts/app_capture.py login", file=sys.stderr)
        return EXIT_NOT_READY
    url = load_url(args.url) + args.hash
    out = out_path(args.name, args.width)
    out.parent.mkdir(parents=True, exist_ok=True)
    problems, text = [], ""
    try:
        ab("--profile", str(profile_dir()), "open", "about:blank", timeout=120)
        ab("set", "viewport", str(args.width), str(args.height), "2")
        code, _ = ab("open", url, check=False, timeout=60)
        if code != 0:
            print(f"페이지를 열지 못했습니다: {url}", file=sys.stderr)
            return EXIT_OPEN_FAILED
        ab("wait", "--load", "networkidle", check=False, timeout=20)
        for t in args.text:
            if ab("find", "text", t, "click", check=False)[0] != 0:
                problems.append(f"'{t}' 글자를 못 찾음")
            ab("wait", "--load", "networkidle", check=False, timeout=15)
        for sel in args.click:
            if ab("click", sel, check=False)[0] != 0:
                problems.append(f"누를 요소를 못 찾음: {sel}")
            ab("wait", "--load", "networkidle", check=False, timeout=15)
        if args.wait_text and ab("wait", "--text", args.wait_text, check=False, timeout=20)[0] != 0:
            problems.append(f"'{args.wait_text}' 가 나타나지 않음 — 로그인이 풀렸으면 login 을 다시")
        ab("wait", "500", check=False)
        _, text = ab("get", "text", "body", check=False)
        shot_args = ["screenshot", "--full", str(out)] if args.full else ["screenshot", str(out)]
        ab(*shot_args, timeout=60)
    except RuntimeError as e:
        print(f"캡처 실패: {e}", file=sys.stderr)
        return EXIT_OPEN_FAILED
    finally:
        ab("close", check=False)

    hits = find_real_names(text, real_names())
    if hits:
        out.unlink(missing_ok=True)
        print("멈춤: 화면에 실제 회원 이름(" + ", ".join(mask(h) for h in hits) + ")이 보여 사진을 지웠습니다.\n"
              "테스트 계정으로 다시 로그인하세요: python scripts/app_capture.py forget → login", file=sys.stderr)
        return EXIT_REAL_NAME
    print(f"캡처(로그인): {out.relative_to(ROOT)}  ({args.width}×{args.height}{', 전체' if args.full else ''})")
    for p in problems:
        print(f"- {p}")
    return EXIT_PROBLEMS if problems else 0


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    args = parse_args(argv)
    if args.cmd == "status":
        return cmd_status()
    if args.cmd == "login":
        return cmd_login(args)
    if args.cmd == "forget":
        return cmd_forget()
    return cmd_shot(args)


if __name__ == "__main__":
    sys.exit(main())

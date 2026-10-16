"""화면 캡처 — 폰 크기(기본 390×844)로 페이지를 찍어 .shots/ 에 PNG 로 저장한다.

AI 가 코드만 읽어서는 모르는 것(글자 겹침·잘림·균형)을 사진으로 확인하려고 쓴다.
ui-designer·ui-checker 에이전트와 /design·/feature 가 부른다. 사람도 직접 쓸 수 있다.

사용법:
    python scripts/screenshot.py                         # index.html
    python scripts/screenshot.py design-system/styleguide.html --full
    python scripts/screenshot.py index.html --hash "#members" --name members
    python scripts/screenshot.py https://ayoajeyo.github.io/posture-check/ --width 360

--full 은 긴 화면을 폰 한 화면 높이씩 잘라 여러 장(-1, -2 …)으로 저장한다(한 장이면 너무 길어 글자가 안 보임).
끝나는 번호: 0 = 정상, 2 = 찍었지만 문제 발견(가로 스크롤·스크립트 오류·404), 3 = 캡처 도구 없음, 4 = 페이지를 열지 못함.

파일 경로를 주면 저장소 폴더를 잠깐 로컬 서버(http://127.0.0.1)로 열어서 찍는다
(카메라·서비스워커·모듈 스크립트가 file:// 에서는 안 되기 때문). 서비스워커는 막고 찍는다
(예전 화면이 캐시로 보이는 것 방지).

처음 한 번 설치(PC 마다):
    python -m pip install playwright
    python -m playwright install chromium
"""

import argparse
import functools
import http.server
import re
import socketserver
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXIT_PROBLEMS = 2
EXIT_NO_PLAYWRIGHT = 3
EXIT_OPEN_FAILED = 4
MAX_SLICES = 12
# 글꼴 CDN 은 병원 PC·오프라인에서 막힐 수 있다 — 화면 문제가 아니므로 따로 알린다
CDN_HOSTS = ("cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com")

INSTALL_HELP = (
    "화면 캡처 도구(Playwright)가 이 PC 에 없습니다. 아래 두 줄을 한 번만 실행하세요:\n"
    "  python -m pip install playwright\n"
    "  python -m playwright install chromium\n"
    "(설치 전에는 캡처 없이 코드만 보고 점검합니다)"
)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="폰 크기로 화면을 캡처해 .shots/ 에 저장")
    p.add_argument("target", nargs="?", default="index.html", help="html 파일 경로 또는 http(s) 주소 (기본 index.html)")
    p.add_argument("--width", type=int, default=390, help="화면 폭 px (기본 390)")
    p.add_argument("--height", type=int, default=844, help="화면 높이 px (기본 844)")
    p.add_argument("--full", action="store_true", help="스크롤 끝까지, 한 화면 높이씩 잘라 여러 장으로")
    p.add_argument("--hash", default="", help='주소 뒤에 붙일 #화면 (예: "#members")')
    p.add_argument("--click", action="append", default=[], help="찍기 전에 누를 요소(CSS 선택자). 여러 번 가능")
    p.add_argument("--wait", type=int, default=400, help="찍기 전 기다릴 ms (기본 400)")
    p.add_argument("--name", default="", help="저장 파일 이름 (기본: 파일 이름)")
    p.add_argument("--out", default=".shots", help="저장 폴더 (기본 .shots, git 에 안 올라감)")
    return p.parse_args(argv)


def slug(text):
    s = re.sub(r"[^\w가-힣-]+", "-", text).strip("-")
    return s or "page"


def output_path(args, part=0):
    if args.name:
        base = slug(args.name)
    elif re.match(r"https?://", args.target):
        base = slug(re.sub(r"https?://", "", args.target).rstrip("/").split("/")[-1] or "site")
    else:
        base = slug(Path(args.target).stem)
    if args.hash:
        base += "-" + slug(args.hash.lstrip("#"))
    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    suffix = f"-{part}" if part else ""
    return out_dir / f"{base}-{args.width}{suffix}.png"


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    # Windows 는 레지스트리 설정에 따라 .js 를 text/plain 으로 보내 모듈 스크립트가 안 돌 수 있어 직접 지정
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
        ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".wasm": "application/wasm",
        ".html": "text/html", "": "application/octet-stream",
    }

    def log_message(self, *a):  # 서버 로그는 감춘다
        pass


def start_server(directory):
    """저장소 폴더를 빈 포트의 로컬 서버로 연다. (server, base_url) 반환."""
    handler = functools.partial(_QuietHandler, directory=str(directory))
    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def resolve_url(target, base_url):
    if re.match(r"https?://", target):
        return target
    path = Path(target)
    if not path.is_absolute():
        here = Path.cwd() / path
        path = here if here.exists() else ROOT / path   # scripts\ 안에서 실행해도 저장소 기준으로 찾는다
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {target}")
    path = path.resolve()
    try:
        rel = path.relative_to(ROOT.resolve())
    except ValueError:
        raise SystemExit(f"저장소 밖의 파일은 찍을 수 없습니다: {target}")
    return f"{base_url}/{rel.as_posix()}"


def _is_cdn(text):
    return any(h in text for h in CDN_HOSTS)


def capture(args):
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(INSTALL_HELP, file=sys.stderr)
        return EXIT_NO_PLAYWRIGHT

    server = None
    base_url = ""
    if not re.match(r"https?://", args.target):
        server, base_url = start_server(ROOT)
    url = resolve_url(args.target, base_url) + args.hash
    problems, cdn_blocked, saved = [], [], []
    try:
        with sync_playwright() as pw:
            try:
                browser = pw.chromium.launch()
            except PlaywrightError as e:  # 브라우저 본체가 없을 때
                print(INSTALL_HELP + f"\n({str(e).splitlines()[0][:120]})", file=sys.stderr)
                return EXIT_NO_PLAYWRIGHT
            try:
                ctx = browser.new_context(
                    viewport={"width": args.width, "height": args.height},
                    device_scale_factor=2, is_mobile=True, has_touch=True,
                    locale="ko-KR", color_scheme="light", service_workers="block",
                )
                page = ctx.new_page()

                def on_console(m):
                    if m.type != "error":
                        return
                    where = (m.location or {}).get("url", "")
                    (cdn_blocked if _is_cdn(where) or _is_cdn(m.text) else problems).append(f"콘솔 오류: {m.text}")

                page.on("console", on_console)
                page.on("pageerror", lambda e: problems.append(f"스크립트 오류: {e}"))
                page.on("requestfailed", lambda r: cdn_blocked.append(r.url) if _is_cdn(r.url) else None)
                try:
                    resp = page.goto(url, wait_until="load", timeout=30000)
                except PlaywrightError as e:
                    print(f"페이지를 열지 못했습니다: {url}\n({str(e).splitlines()[0][:160]})", file=sys.stderr)
                    return EXIT_OPEN_FAILED
                if resp is not None and not resp.ok:
                    problems.append(f"페이지 응답 {resp.status} — 주소나 파일 이름을 확인하세요")
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except PlaywrightError:
                    pass  # 외부 글꼴·CDN 이 느려도 찍는다
                page.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true")
                for sel in args.click:
                    try:
                        page.click(sel, timeout=5000)
                    except PlaywrightError:
                        problems.append(f"누를 요소를 못 찾음: {sel}")
                    page.wait_for_timeout(200)
                page.wait_for_timeout(args.wait)
                # 폰 브라우저는 넘치는 화면을 축소해 보여 주므로 지정한 폭과 직접 비교한다
                overflow = page.evaluate("document.documentElement.scrollWidth") - args.width
                if overflow > 1:
                    problems.append(f"가로 스크롤 {overflow}px — {args.width}px 폭에서 넘치는 요소가 있습니다")

                first = output_path(args)
                first.parent.mkdir(parents=True, exist_ok=True)
                if not args.full:
                    page.screenshot(path=str(first))
                    saved.append(first)
                else:
                    total = page.evaluate("Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)")
                    pieces = max(1, min(MAX_SLICES, -(-total // args.height)))
                    for i in range(pieces):
                        y = i * args.height
                        h = min(args.height, total - y)
                        out = output_path(args, part=i + 1)
                        page.screenshot(path=str(out), full_page=True,
                                        clip={"x": 0, "y": y, "width": args.width, "height": h})
                        saved.append(out)
                    if -(-total // args.height) > MAX_SLICES:
                        problems.append(f"화면이 너무 길어 앞쪽 {MAX_SLICES}장만 저장했습니다")
            except PlaywrightError as e:
                print(f"캡처 중 오류: {str(e).splitlines()[0][:160]}", file=sys.stderr)
                return EXIT_OPEN_FAILED
            finally:
                browser.close()
    except KeyboardInterrupt:
        print("중단했습니다.", file=sys.stderr)
        return 130
    finally:
        if server:
            server.shutdown()
            server.server_close()

    def shown(p):
        try:
            return p.relative_to(ROOT)
        except ValueError:
            return p

    label = f"{args.width}×{args.height}" + (f", {len(saved)}장으로 나눔" if args.full else "")
    print(f"캡처: {', '.join(str(shown(p)) for p in saved)}  ({label})")
    for p in problems[:10]:
        print(f"- {p}")
    if len(problems) > 10:
        print(f"- 그 밖에 {len(problems) - 10}건")
    if cdn_blocked:
        print("- 참고: 글꼴 CDN 에 연결되지 않아 기본 글꼴로 찍혔습니다 (인터넷·병원 방화벽 문제, 화면 오류 아님)")
    return EXIT_PROBLEMS if problems else 0


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    return capture(parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())

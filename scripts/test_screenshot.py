"""scripts/screenshot.py 점검 — 인자 해석, 설치 안내, (가능하면) 실제 캡처."""
import builtins
import importlib.util
import struct
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("screenshot", ROOT / "scripts" / "screenshot.py")
shot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shot)


def _png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    assert head[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", head[16:24])


def test_defaults():
    a = shot.parse_args([])
    assert (a.target, a.width, a.height, a.full, a.out) == ("index.html", 390, 844, False, ".shots")


def test_output_name_from_file_hash_and_width():
    a = shot.parse_args(["design-system/styleguide.html", "--hash", "#members", "--width", "360"])
    out = shot.output_path(a)
    assert out.name == "styleguide-members-360.png"
    assert out.parent == ROOT / ".shots"


def test_output_name_custom_and_url():
    assert shot.output_path(shot.parse_args(["index.html", "--name", "회원 목록"])).name == "회원-목록-390.png"
    assert shot.output_path(shot.parse_args(["https://example.com/app/"])).name == "app-390.png"


def test_resolve_url_inside_repo(tmp_path):
    url = shot.resolve_url(str(ROOT / "design-system" / "styleguide.html"), "http://127.0.0.1:9")
    assert url == "http://127.0.0.1:9/design-system/styleguide.html"
    assert shot.resolve_url("https://a.b/c", "") == "https://a.b/c"


def test_resolve_url_rejects_outside_and_missing(tmp_path):
    outside = tmp_path / "x.html"
    outside.write_text("<p>x</p>", encoding="utf-8")
    with pytest.raises(SystemExit):
        shot.resolve_url(str(outside), "http://127.0.0.1:9")
    with pytest.raises(SystemExit):
        shot.resolve_url(str(ROOT / "없는파일.html"), "http://127.0.0.1:9")


def test_missing_playwright_prints_install_help(monkeypatch, capsys):
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name.startswith("playwright"):
            raise ImportError("no playwright")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    code = shot.capture(shot.parse_args(["design-system/styleguide.html"]))
    assert code == shot.EXIT_NO_PLAYWRIGHT
    assert "python -m playwright install chromium" in capsys.readouterr().err


def _playwright_ready():
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            pw.chromium.launch().close()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _playwright_ready(), reason="이 PC 에 Playwright·Chromium 이 없음")
def test_real_capture_reports_overflow_and_errors(tmp_path, capsys):
    page = ROOT / ".shots" / "_test_page.html"
    page.parent.mkdir(exist_ok=True)
    page.write_text('<!doctype html><meta name="viewport" content="width=device-width">'
                    '<div style="width:600px">넓은 상자</div><script>undefinedFn()</script>', encoding="utf-8")
    try:
        code = shot.capture(shot.parse_args([str(page), "--out", str(tmp_path), "--wait", "0"]))
        out = capsys.readouterr().out
        assert code == shot.EXIT_PROBLEMS              # 찍었지만 문제 발견
        png = tmp_path / "_test_page-390.png"
        assert png.exists()
        w, h = _png_size(png)
        assert w == 780 and abs(h - 1688) <= 2      # 2배 해상도 (모바일 주소창 반올림 1px 허용)
        assert "가로 스크롤" in out and "스크립트 오류" in out
    finally:
        page.unlink(missing_ok=True)


@pytest.mark.skipif(not _playwright_ready(), reason="이 PC 에 Playwright·Chromium 이 없음")
def test_full_page_is_sliced_and_missing_page_reported(tmp_path, capsys):
    page = ROOT / ".shots" / "_tall_page.html"
    page.parent.mkdir(exist_ok=True)
    page.write_text('<!doctype html><meta name="viewport" content="width=device-width">'
                    '<body style="margin:0"><div style="height:2000px">긴 화면</div></body>', encoding="utf-8")
    try:
        code = shot.capture(shot.parse_args([str(page), "--out", str(tmp_path), "--wait", "0", "--full"]))
        assert code == 0, capsys.readouterr()
        pieces = sorted(tmp_path.glob("_tall_page-390-*.png"))
        assert len(pieces) == 3                         # 2000 / 844 → 3장
        assert _png_size(pieces[0])[1] in (1687, 1688)
    finally:
        page.unlink(missing_ok=True)


def test_relative_path_from_other_folder(monkeypatch):
    monkeypatch.chdir(ROOT / "scripts")
    url = shot.resolve_url("design-system/styleguide.html", "http://127.0.0.1:9")
    assert url.endswith("/design-system/styleguide.html")

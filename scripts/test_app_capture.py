"""scripts/app_capture.py 점검 — 설정·경로·이름 가림·실제 이름 감지·준비 안 됨 처리 (브라우저 없이)."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("app_capture", ROOT / "scripts" / "app_capture.py")
cap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cap)


def test_profile_outside_repo():
    prof = cap.profile_dir()
    assert ROOT not in prof.parents and prof.name.endswith("-test")


def test_url_from_cli_and_config(tmp_path, monkeypatch):
    assert cap.load_url("https://a.b/") == "https://a.b/"
    monkeypatch.setattr(cap, "ROOT", tmp_path)
    (tmp_path / ".claude").mkdir()
    (tmp_path / ".claude" / "capture.json").write_text(json.dumps({"url": "https://x.y/app/"}), encoding="utf-8")
    assert cap.load_url("") == "https://x.y/app/"


def test_missing_url_stops(tmp_path, monkeypatch):
    monkeypatch.setattr(cap, "ROOT", tmp_path)
    try:
        cap.load_url("")
        assert False, "멈춰야 함"
    except SystemExit as e:
        assert "capture.json" in str(e)


def test_real_name_detection_and_mask(tmp_path, monkeypatch):
    monkeypatch.setattr(cap, "ROOT", tmp_path)
    (tmp_path / ".claude").mkdir()
    (tmp_path / ".claude" / "pii-names.local.txt").write_text("# 메모\n김실명\n\n", encoding="utf-8")
    names = cap.real_names()
    assert names == ["김실명"]
    assert cap.find_real_names("회원 목록 김실명 63점", names) == ["김실명"]
    assert cap.find_real_names("홍길동", names) == []
    assert cap.mask("김실명") == "김○○"


def test_shot_without_tool_or_login(monkeypatch, capsys):
    monkeypatch.setattr(cap, "ab_bin", lambda: None)
    assert cap.main(["shot", "--url", "https://a.b/"]) == cap.EXIT_NOT_READY
    assert "npm i -g agent-browser" in capsys.readouterr().err
    monkeypatch.setattr(cap, "ab_bin", lambda: "/usr/bin/agent-browser")
    monkeypatch.setattr(cap, "profile_dir", lambda: Path("/없는/폴더"))
    assert cap.main(["shot", "--url", "https://a.b/"]) == cap.EXIT_NOT_READY
    assert "login" in capsys.readouterr().err


def test_login_refuses_without_terminal(monkeypatch, capsys):
    monkeypatch.setattr(cap, "ab_bin", lambda: "/usr/bin/agent-browser")
    monkeypatch.setattr(cap.sys.stdin, "isatty", lambda: False, raising=False)
    assert cap.main(["login", "--url", "https://a.b/"]) == cap.EXIT_NOT_READY
    assert "사람이" in capsys.readouterr().err


def test_shot_deletes_picture_when_real_name_visible(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(cap, "ROOT", tmp_path)
    (tmp_path / ".claude").mkdir()
    (tmp_path / ".claude" / "pii-names.local.txt").write_text("김실명\n", encoding="utf-8")
    monkeypatch.setattr(cap, "ab_bin", lambda: "/usr/bin/agent-browser")
    monkeypatch.setattr(cap, "profile_dir", lambda: tmp_path)

    def fake_ab(*args, check=True, timeout=60):
        if args[:2] == ("get", "text"):
            return 0, "회원 목록\n김실명\n"
        if args and args[0] == "screenshot":
            Path(args[-1]).write_bytes(b"png")
        return 0, ""

    monkeypatch.setattr(cap, "ab", fake_ab)
    assert cap.main(["shot", "--url", "https://a.b/", "--name", "m"]) == cap.EXIT_REAL_NAME
    assert not (tmp_path / ".shots" / "m-390-login.png").exists()
    assert "김○○" in capsys.readouterr().err

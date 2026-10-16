""".claude/hooks 스크립트 테스트. 실제 명령은 실행하지 않고 JSON만 넘겨 본다."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HOOKS = Path(__file__).parent.parent / ".claude" / "hooks"


def run_hook(name, stdin, env=None):
    return subprocess.run([sys.executable, str(HOOKS / name)], input=stdin.encode("utf-8"),
                          capture_output=True, env={**os.environ, **(env or {})})


@pytest.mark.parametrize("cmd", [
    "rm -rf build", "rm -fr x", "git push --force origin main", "git push origin main -f",
    "git reset --hard HEAD~1", "drop table users", "echo 한글 && rm -rf /",
    "Remove-Item -Recurse -Force .\\build", "Remove-Item C:\\x -Force -Recurse",
    "rmdir /s /q build", "rd /S dist", "del /s *.js", "git clean -fd", "format d:",
    "rm -r build", "rm -R dist", "Remove-Item .\\build -Recurse", "npx rimraf dist",
    "git checkout -- .", "git restore .", "git stash drop", "git branch -D feat-x",
])
def test_blocks_dangerous(cmd):
    r = run_hook("block_dangerous.py", json.dumps({"tool_input": {"command": cmd}}, ensure_ascii=False))
    assert r.returncode == 2
    assert "BLOCKED" in r.stderr.decode("utf-8")


@pytest.mark.parametrize("cmd", ["ls -la", "git push origin main", "rm file.txt", "echo 한글",
                                 "Remove-Item old.txt", "git status", "python -m http.server",
                                 'git commit -m "docs: rm -rf 설명 추가"', 'echo "format d: is bad"',
                                 "git push --force-with-lease origin main", "git checkout -- app.js",
                                 "git restore js/app.js", "git stash", "git branch -d feat-x",
                                 "npm run format", "rm -f temp.txt"])
def test_allows_safe(cmd):
    r = run_hook("block_dangerous.py", json.dumps({"tool_input": {"command": cmd}}, ensure_ascii=False))
    assert r.returncode == 0


def test_stop_passes_without_package_json(tmp_path):
    r = run_hook("stop_check.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)})
    assert r.returncode == 0 and r.stdout == b"" and r.stderr == b""


@pytest.mark.parametrize("lint,code", [("echo ok", 0), ("node -e process.exit(3)", 2)])
def test_stop_runs_npm_scripts(tmp_path, lint, code):
    scripts = {"lint": lint, "build": "echo ok", "test": "echo ok"}
    (tmp_path / "package.json").write_text(json.dumps({"scripts": scripts}), encoding="utf-8")
    r = run_hook("stop_check.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)})
    assert r.returncode == code


# --- secret_guard.py ---------------------------------------------------------

import base64


def jwt(payload: str) -> str:
    enc = lambda t: base64.urlsafe_b64encode(t.encode()).decode().rstrip("=")
    return f"{enc('{\"alg\":\"HS256\",\"typ\":\"JWT\"}')}.{enc(payload)}.abcdefghijklmnopqrstuvwxyz012345"


def write(path, content, tool="content"):
    key = "new_string" if tool == "edit" else "content"
    return run_hook("secret_guard.py", json.dumps({"tool_input": {"file_path": path, key: content}},
                                                  ensure_ascii=False))


@pytest.mark.parametrize("content", [
    'const KEY = "sk-proj-Ab3dEfGh1jKlMn0pQrStUvWxYz123456AbCd"',
    "ANTHROPIC_KEY = 'sk-ant-api03-Xy9zAbCdEfGh12345678IjKlMnOpQrStUvWxYz-AbCdEfGhIjKlMnAA'",
    "aws = 'AKIAABCDEFGHIJKLMNOP'",
    "token: ghp_" + "a" * 36,
    "-----BEGIN RSA PRIVATE KEY-----",
    "const s = '" + "sb_secret_" + "x" * 30 + "'",
])
def test_secret_blocked(content):
    r = write("js/app.js", content)
    assert r.returncode == 2
    assert "BLOCKED" in r.stderr.decode("utf-8")


def test_service_role_jwt_blocked():
    token = jwt('{"iss":"supabase","role":"service_role"}')
    assert write("js/config.js", f"const k = '{token}'").returncode == 2


def test_anon_jwt_allowed():
    token = jwt('{"iss":"supabase","role":"anon"}')
    assert write("js/config.js", f"const k = '{token}'").returncode == 0


def test_secret_in_edit_blocked():
    assert write("js/app.js", "x = 'sk-ant-api03-Xy9zAbCdEfGh12345678IjKlMnOpQrStUvWxYz'", tool="edit").returncode == 2


def test_secret_in_multiedit_blocked():
    payload = {"tool_input": {"file_path": "a.js", "edits": [{"new_string": "AKIAABCDEFGHIJKLMNOP"}]}}
    assert run_hook("secret_guard.py", json.dumps(payload)).returncode == 2


@pytest.mark.parametrize("path", [".env", ".env.local", "C:\\proj\\.env", "/home/u/p/.env.production"])
def test_env_files_allowed(path):
    assert write(path, "OPENAI_KEY=sk-proj-Ab3dEfGh1jKlMn0pQrStUvWxYz123456AbCd").returncode == 0


def test_env_example_with_real_key_blocked():
    assert write(".env.example", "KEY=sk-proj-Ab3dEfGh1jKlMn0pQrStUvWxYz123456AbCd").returncode == 2


@pytest.mark.parametrize("content", [
    "const name = '홍길동'; // 한글 주석",
    ".sk-loading-indicator-container { display: none }",
    "task-id: sk-2026-10-14-measure-report-abcdefghijklmnop",
    "const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='",
    "aws 예시 키 AKIAIOSFODNN7EXAMPLE 는 공식 문서 예시다",
])
def test_plain_code_allowed(content):
    assert write("js/app.js", content).returncode == 0


# --- session_start.py --------------------------------------------------------

def git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


def test_session_start_silent_outside_git(tmp_path):
    r = run_hook("session_start.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)})
    assert r.returncode == 0 and r.stdout == b""


def test_session_start_reports_uncommitted(tmp_path):
    git(tmp_path, "init", "-q")
    (tmp_path / "a.txt").write_text("x", encoding="utf-8")
    r = run_hook("session_start.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)})
    assert r.returncode == 0
    assert "1개" in r.stdout.decode("utf-8")


def test_session_start_reports_behind(tmp_path):
    remote, local, other = tmp_path / "remote.git", tmp_path / "local", tmp_path / "other"
    git(tmp_path, "init", "-q", "--bare", str(remote))
    git(tmp_path, "clone", "-q", str(remote), str(other))
    for k, v in (("user.email", "t@example.com"), ("user.name", "t")):
        git(other, "config", k, v)
    (other / "f.txt").write_text("1", encoding="utf-8")
    git(other, "add", ".")
    git(other, "commit", "-qm", "c1")
    git(other, "push", "-q", "origin", "HEAD")
    git(tmp_path, "clone", "-q", str(remote), str(local))  # 병원 PC: 여기까지 받은 상태
    (other / "f.txt").write_text("2", encoding="utf-8")
    git(other, "commit", "-qam", "c2")
    git(other, "push", "-q", "origin", "HEAD")             # 집 PC에서 새로 올림
    r = run_hook("session_start.py", "{}", {"CLAUDE_PROJECT_DIR": str(local)})
    out = r.stdout.decode("utf-8")
    assert r.returncode == 0
    assert "git pull" in out and "1개" in out


def test_session_start_shows_handoff_in_progress(tmp_path):
    git(tmp_path, "init", "-q")
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "HANDOFF.md").write_text(
        "# 인수인계\n상태: 진행 중\n갱신: 2026-10-17 00:40\n\n## 지금 하던 일\n삭제 기능\n\n"
        "## 다음 할 일 (순서대로)\n1. 계획 승인받기\n2. /fix 실행\n\n## 이번에 끝낸 것\n- 없음\n", encoding="utf-8")
    out = run_hook("session_start.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)}).stdout.decode("utf-8")
    assert "인수인계" in out and "1. 계획 승인받기" in out and "2026-10-17" in out
    assert "이번에 끝낸 것" not in out            # 다음 할 일만 짧게


def test_session_start_ignores_finished_handoff(tmp_path):
    git(tmp_path, "init", "-q")
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "HANDOFF.md").write_text("상태: 완료\n## 다음 할 일\n1. 없음\n", encoding="utf-8")
    (tmp_path / ".gitignore").write_text("docs/\n.gitignore\n", encoding="utf-8")
    out = run_hook("session_start.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)}).stdout.decode("utf-8")
    assert "인수인계" not in out


# --- syntax_check.py ---------------------------------------------------------

def post_write(path):
    return run_hook("syntax_check.py", json.dumps({"tool_input": {"file_path": str(path)}}))


def test_json_broken_blocked(tmp_path):
    f = tmp_path / "manifest.json"; f.write_text('{"a": 1,}', encoding="utf-8")
    r = post_write(f)
    assert r.returncode == 2 and "JSON" in r.stderr.decode("utf-8")


def test_json_ok(tmp_path):
    f = tmp_path / "manifest.json"; f.write_text('{"a": 1}', encoding="utf-8")
    assert post_write(f).returncode == 0


def test_html_unbalanced_blocked(tmp_path):
    f = tmp_path / "index.html"; f.write_text("<div><section></section>", encoding="utf-8")
    r = post_write(f)
    assert r.returncode == 2 and "div" in r.stderr.decode("utf-8")


def test_html_ok(tmp_path):
    f = tmp_path / "index.html"
    f.write_text('<div class="a"><button>저장</button></div><script src="x.js"></script>', encoding="utf-8")
    assert post_write(f).returncode == 0


@pytest.mark.skipif(not __import__("shutil").which("node"), reason="node 없음")
def test_js_syntax_error_blocked(tmp_path):
    f = tmp_path / "app.js"; f.write_text("function (", encoding="utf-8")
    assert post_write(f).returncode == 2


@pytest.mark.parametrize("html", [
    '<div>a</div><!-- <div class="old"> -->',
    '<div>a</div><script>const t = "</div>";</script>',
    '<div>a</div><style>/* <div> */ .a{}</style>',
])
def test_html_comments_and_scripts_ignored(tmp_path, html):
    f = tmp_path / "index.html"; f.write_text(html, encoding="utf-8")
    assert post_write(f).returncode == 0


@pytest.mark.skipif(not __import__("shutil").which("node"), reason="node 없음")
def test_html_inline_script_error_blocked_with_html_line(tmp_path):
    f = tmp_path / "index.html"
    f.write_text("<!-- 여러\n줄\n주석 -->\n<div>a</div>\n<script>\nvar ok = 1;\nfunction (\n</script>", encoding="utf-8")
    r = post_write(f)
    err = r.stderr.decode("utf-8")
    assert r.returncode == 2 and "줄 7" in err   # HTML 파일 기준 줄 번호 (앞 주석의 줄도 셈)


@pytest.mark.skipif(not __import__("shutil").which("node"), reason="node 없음")
@pytest.mark.parametrize("html", [
    '<script>var a = 1;</script>',
    '<script type="module">import x from "https://cdn.example/x.js"; export const y = x;</script>',
    '<script type="application/ld+json">{"a": 1}</script>',
    '<script src="x.js"></script>',
])
def test_html_inline_script_ok(tmp_path, html):
    f = tmp_path / "index.html"; f.write_text(html, encoding="utf-8")
    assert post_write(f).returncode == 0


def test_missing_file_ignored(tmp_path):
    assert post_write(tmp_path / "nope.js").returncode == 0


# --- commit_guard.py ---------------------------------------------------------

def repo(tmp_path):
    git(tmp_path, "init", "-q")
    git(tmp_path, "config", "user.email", "t@example.com")
    git(tmp_path, "config", "user.name", "t")
    return tmp_path


def guard(cmd, cwd):
    return run_hook("commit_guard.py", json.dumps({"tool_input": {"command": cmd}}),
                    {"CLAUDE_PROJECT_DIR": str(cwd)})


def test_non_commit_ignored(tmp_path):
    assert guard("git status", repo(tmp_path)).returncode == 0


def test_env_file_blocks_commit(tmp_path):
    r = repo(tmp_path); (r / ".env").write_text("KEY=1", encoding="utf-8")
    res = guard('git add -A && git commit -m "x"', r)
    assert res.returncode == 2 and ".env" in res.stderr.decode("utf-8")


def test_unstaged_big_file_does_not_block_partial_commit(tmp_path):
    r = repo(tmp_path)
    (r / "photo.jpg").write_bytes(b"0" * (6 * 1024 * 1024))
    (r / "app.js").write_text("const a = 1;", encoding="utf-8")
    git(r, "add", "app.js")
    assert guard('git commit -m "feat: x"', r).returncode == 0


def test_staged_korean_big_file_blocks(tmp_path):
    r = repo(tmp_path)
    (r / "사진.jpg").write_bytes(b"0" * (6 * 1024 * 1024))
    git(r, "add", "사진.jpg")
    res = guard('git commit -m "x"', r)
    assert res.returncode == 2 and "사진.jpg" in res.stderr.decode("utf-8")


def test_env_example_allowed(tmp_path):
    r = repo(tmp_path); (r / ".env.example").write_text("KEY=", encoding="utf-8")
    assert guard('git commit -am "x"', r).returncode == 0


def test_big_file_blocks_commit(tmp_path):
    r = repo(tmp_path); (r / "photo.jpg").write_bytes(b"0" * (6 * 1024 * 1024))
    res = guard('git commit -am "x"', r)
    assert res.returncode == 2 and "5MB" in res.stderr.decode("utf-8")


def test_keystore_blocks_commit(tmp_path):
    r = repo(tmp_path); (r / "release.jks").write_bytes(b"x")
    assert guard('git add . && git commit -m "x"', r).returncode == 2


def test_clean_commit_allowed(tmp_path):
    r = repo(tmp_path); (r / "app.js").write_text("const a = 1;", encoding="utf-8")
    assert guard('git add -A && git commit -m "feat: 추가"', r).returncode == 0


FAKE_GH = "ghp_" + "a1B2" * 9   # 가짜 GitHub 토큰 모양


def test_secret_in_staged_content_blocks(tmp_path):
    r = repo(tmp_path); (r / "run.sh").write_text(f"TOKEN={FAKE_GH}\n", encoding="utf-8")
    git(r, "add", "run.sh")   # Write/Edit 를 안 거치고(셸로) 만든 파일
    res = guard('git commit -m "x"', r)
    assert res.returncode == 2 and "GitHub 토큰" in res.stderr.decode("utf-8")


def test_secret_in_untracked_file_blocks_add_all(tmp_path):
    r = repo(tmp_path); (r / "app.js").write_text(f'const t = "{FAKE_GH}";', encoding="utf-8")
    assert guard('git add -A && git commit -m "x"', r).returncode == 2


def test_secret_in_modified_tracked_file_blocks_commit_a(tmp_path):
    r = repo(tmp_path); f = r / "app.js"; f.write_text("const a = 1;", encoding="utf-8")
    git(r, "add", "app.js"); git(r, "commit", "-qm", "init")
    f.write_text(f'const t = "{FAKE_GH}";', encoding="utf-8")
    assert guard('git commit -am "x"', r).returncode == 2


def names_file(r, *names):
    (r / ".claude").mkdir(exist_ok=True)
    (r / ".claude" / "pii-names.local.txt").write_text("# 실제 회원 이름\n" + "\n".join(names), encoding="utf-8")


def test_pii_name_in_content_blocks_and_is_masked(tmp_path):
    r = repo(tmp_path); names_file(r, "가나다")
    (r / "app.js").write_text("// 가나다 기록처럼", encoding="utf-8"); git(r, "add", "app.js")
    res = guard('git commit -m "x"', r)
    err = res.stderr.decode("utf-8")
    assert res.returncode == 2 and "가○○" in err and "가나다" not in err


def test_pii_name_in_commit_message_blocks(tmp_path):
    r = repo(tmp_path); names_file(r, "가나다")
    (r / "app.js").write_text("const a = 1;", encoding="utf-8"); git(r, "add", "app.js")
    assert guard('git commit -m "fix: 가나다 회원 오류"', r).returncode == 2


def test_pii_removed_line_allowed(tmp_path):
    r = repo(tmp_path); names_file(r, "가나다"); f = r / "app.js"
    f.write_text("// 가나다\n", encoding="utf-8"); git(r, "add", "app.js"); git(r, "commit", "-qm", "init")
    f.write_text("// 회원\n", encoding="utf-8"); git(r, "add", "app.js")   # 이름을 지우는 커밋은 통과
    assert guard('git commit -m "fix: 실명 삭제"', r).returncode == 0


def test_no_names_file_is_fine(tmp_path):
    r = repo(tmp_path); (r / "app.js").write_text("// 홍길동", encoding="utf-8"); git(r, "add", "app.js")
    assert guard('git commit -m "x"', r).returncode == 0


# --- stop_check.py: scripts 에 없는 명령은 건너뜀, 실패는 exit 2 ---------------

def test_stop_skips_missing_scripts(tmp_path):
    (tmp_path / "package.json").write_text(json.dumps({"scripts": {"test": "echo ok"}}), encoding="utf-8")
    assert run_hook("stop_check.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)}).returncode == 0


def test_stop_failure_is_blocking_once(tmp_path):
    (tmp_path / "package.json").write_text(json.dumps({"scripts": {"test": "node -e process.exit(3)"}}), encoding="utf-8")
    assert run_hook("stop_check.py", "{}", {"CLAUDE_PROJECT_DIR": str(tmp_path)}).returncode == 2
    assert run_hook("stop_check.py", '{"stop_hook_active": true}', {"CLAUDE_PROJECT_DIR": str(tmp_path)}).returncode == 1

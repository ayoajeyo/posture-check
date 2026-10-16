"""하네스 도구 파일의 구조 점검 — 명령·에이전트·스킬 형식과 계획(plan) 기능 연결."""
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CLAUDE = ROOT / ".claude"


def _frontmatter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert m, f"frontmatter 없음: {path}"
    return {k.strip(): v.strip() for k, v in (ln.split(":", 1) for ln in m.group(1).splitlines() if ":" in ln)}


def test_commands_have_description():
    files = sorted((CLAUDE / "commands").glob("*.md"))
    assert files
    for f in files:
        assert _frontmatter(f).get("description"), f.name


def test_agents_have_name_matching_file_and_tools():
    for f in sorted((CLAUDE / "agents").glob("*.md")):
        fm = _frontmatter(f)
        assert fm.get("name") == f.stem, f.name
        assert fm.get("description") and fm.get("tools"), f.name


def test_skills_have_name_matching_folder():
    dirs = [d for d in (CLAUDE / "skills").iterdir() if d.is_dir()]
    assert dirs
    for d in dirs:
        fm = _frontmatter(d / "SKILL.md")
        assert fm.get("name") == d.name, d.name
        assert fm.get("description"), d.name


def test_plan_feature_is_wired():
    assert (CLAUDE / "commands" / "plan.md").exists()
    assert (CLAUDE / "skills" / "plan-gate" / "SKILL.md").exists()
    for name in ("plan", "feature", "fix"):
        text = (CLAUDE / "commands" / f"{name}.md").read_text(encoding="utf-8")
        assert "plan-gate" in text, f"{name}.md 가 plan-gate 를 가리키지 않음"
        assert "docs/PLANS" in text, f"{name}.md 가 docs/PLANS 를 가리키지 않음"


def test_plan_gate_lists_all_required_sections():
    text = (CLAUDE / "skills" / "plan-gate" / "SKILL.md").read_text(encoding="utf-8")
    for key in ("승인이 필수인 작업", "계획서 양식", "진행 규칙", "상태:", "되돌리는 법"):
        assert key in text, key


def test_plan_command_does_not_allow_code_changes():
    text = (CLAUDE / "commands" / "plan.md").read_text(encoding="utf-8")
    assert "계획서만" in text and "건드리지 않는다" in text


def test_adopt_copies_plans_folder():
    if not (ROOT / "scripts" / "adopt.ps1").exists():
        pytest.skip("앱 저장소에는 adopt.ps1 이 없음 (틀에서만 점검)")
    text = (ROOT / "scripts" / "adopt.ps1").read_text(encoding="utf-8-sig")
    assert "docs\\PLANS\\README.md" in text


def test_start_here_counts_match_files():
    if not (ROOT / "START_HERE.md").exists():
        pytest.skip("앱 저장소에는 START_HERE.md 가 없음 (틀에서만 점검)")
    text = (ROOT / "START_HERE.md").read_text(encoding="utf-8")
    cmds = len(list((CLAUDE / "commands").glob("*.md")))
    skills = len([d for d in (CLAUDE / "skills").iterdir() if d.is_dir()])
    agents = len(list((CLAUDE / "agents").glob("*.md")))
    assert f"슬래시 명령 {cmds}개" in text
    assert f"노하우 {skills}개" in text
    assert f"전문 담당 {agents}명" in text


def test_plans_folder_not_injected_into_executor_docs():
    # 실행기는 docs/*.md 만 매 step 에 전달한다 — 계획서 폴더가 섞이면 안 된다
    text = (ROOT / "scripts" / "execute.py").read_text(encoding="utf-8")
    assert 'docs_dir.glob("*.md")' in text


# ── 디자인 도구 연결 ──────────────────────────────
DS = ROOT / "design-system"


def test_design_tools_are_wired():
    assert (CLAUDE / "agents" / "ui-designer.md").exists()
    assert (CLAUDE / "commands" / "design.md").exists()
    for skill in ("ui-polish", "measure-viz", "clean-ui"):
        assert (CLAUDE / "skills" / skill / "SKILL.md").exists(), skill
    feature = (CLAUDE / "commands" / "feature.md").read_text(encoding="utf-8")
    assert "screenshot.py" in feature and "ui-designer" in feature and "TASTE.md" in feature
    assert "TASTE.md" in (CLAUDE / "agents" / "ui-checker.md").read_text(encoding="utf-8")
    assert "screenshot.py" in (CLAUDE / "agents" / "ui-designer.md").read_text(encoding="utf-8")


def test_taste_doc_exists_in_template():
    if not (ROOT / "START_HERE.md").exists():
        pytest.skip("틀에서만 점검 (앱은 /adopt 때 생김)")
    text = (ROOT / "docs" / "TASTE.md").read_text(encoding="utf-8")
    assert "## 기록" in text and "확정 취향" in text


def _need_design_system():
    if not (DS / "tokens.css").exists():
        pytest.skip("design-system 이 없는 앱")


def test_ui_guide_colors_match_tokens():
    _need_design_system()
    guide = (ROOT / "docs" / "UI_GUIDE.md").read_text(encoding="utf-8")
    tokens = (DS / "tokens.css").read_text(encoding="utf-8").upper()
    if "## 2. 색상" not in guide:
        pytest.skip("이 앱의 UI_GUIDE 는 틀과 형식이 다름")
    section = guide.split("## 2. 색상", 1)[1].split("## 3.", 1)[0]
    colors = {c.upper() for c in re.findall(r"#[0-9A-Fa-f]{6}", section)}
    assert colors, "UI_GUIDE 색상표를 못 읽음"
    missing = sorted(c for c in colors if c not in tokens)
    assert not missing, f"UI_GUIDE 색이 tokens.css 에 없음: {missing}"
    root = tokens.split("}", 1)[0]                     # :root 블록
    extra = sorted({c for c in re.findall(r"#[0-9A-F]{6}", root)} - colors)
    assert not extra, f"tokens.css 에만 있는 색 (UI_GUIDE 2번 표에 추가하세요): {extra}"


def test_styleguide_uses_only_defined_classes():
    _need_design_system()
    html = (DS / "styleguide.html").read_text(encoding="utf-8")
    css = (DS / "tokens.css").read_text(encoding="utf-8") + html  # 견본 전용 .sg-* 는 html 안 <style>
    assert 'href="tokens.css"' in html and "pretendard" in html.lower()
    used = {c for attr in re.findall(r'class="([^"]+)"', html) for c in attr.split()}
    undefined = sorted(c for c in used if not re.search(r"\." + re.escape(c) + r"(?![\w-])", css))
    assert not undefined, f"정의되지 않은 클래스: {undefined}"


def test_tokens_have_no_forbidden_styles():
    _need_design_system()
    css = (DS / "tokens.css").read_text(encoding="utf-8").lower()
    for bad in ("linear-gradient", "radial-gradient", "backdrop-filter", "blur("):
        assert bad not in css, bad
    body = css.split("/* ── 기본", 1)[1]               # :root 밖에서는 숫자 대신 변수
    assert not re.findall(r"font-size:\s*\d+px", body), "글자 크기는 --fs-* 변수로"
    assert not re.findall(r"#[0-9a-f]{3,6}\b", body), "색은 변수로"


def test_account_design_skills_blocked():
    # 계정에 동기화된 일반 디자인 스킬이 하네스 디자인 규칙과 부딪히지 않게
    text = (ROOT / "CLAUDE.md").read_text(encoding="utf-8")
    assert "일반 디자인 스킬" in text and "design-taste-frontend" in text

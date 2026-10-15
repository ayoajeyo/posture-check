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

<#
이미 하네스를 쓰는 앱에 **틀의 새 버전(도구만)** 을 반영한다.
덮어쓰는 것: .claude\hooks, commands, agents, skills, settings.json, scripts\execute.py, screenshot.py, test_*.py, update-harness.ps1
없을 때만 추가: docs\ 의 새 문서, design-system\ (참고용 견본), .gitignore 규칙
건드리지 않는 것: CLAUDE.md, 기존 docs\, 앱 코드, phases\, .claude\settings.local.json

사용법:  powershell -ExecutionPolicy Bypass -File scripts\update-harness.ps1 C:\Users\USER\Documents\posture-check
(틀 폴더에서 먼저 git pull 로 틀을 최신으로 만든 뒤 실행)
#>
param(
    [Parameter(Mandatory = $true)][string]$Target
)
$ErrorActionPreference = "Stop"
$template = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Target ".claude"))) { Write-Error "하네스가 없는 폴더입니다. 먼저 adopt.ps1 을 쓰세요: $Target" }

# 되돌릴 수 있게: 대상에 저장 안 된 변경이 있으면 멈춘다
$dirty = git -C $Target status --porcelain
if ($dirty) { Write-Error "저장(커밋)하지 않은 변경이 있습니다. 먼저 커밋한 뒤 실행하세요 (문제 생기면 git checkout 으로 되돌릴 수 있게)." }

$items = @(".claude\hooks", ".claude\commands", ".claude\agents", ".claude\skills", ".claude\settings.json",
           "scripts\execute.py", "scripts\test_execute.py", "scripts\test_hooks.py", "scripts\test_structure.py", "scripts\screenshot.py", "scripts\test_screenshot.py", "scripts\update-harness.ps1")
foreach ($rel in $items) {
    $src = Join-Path $template $rel; $dst = Join-Path $Target $rel
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    Copy-Item $src $dst -Recurse -Force
    Write-Host "  갱신: $rel"
}
# 새 문서 틀은 없는 것만 추가 (기존 문서는 보존)
foreach ($doc in Get-ChildItem (Join-Path $template "docs") -Filter *.md) {
    $dst = Join-Path $Target ("docs\" + $doc.Name)
    if (-not (Test-Path $dst)) { Copy-Item $doc.FullName $dst; Write-Host "  추가: docs\$($doc.Name)" }
}
foreach ($rel in @("docs\PLANS\README.md", "design-system")) {
    $dst = Join-Path $Target $rel
    if (-not (Test-Path $dst)) {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
        Copy-Item (Join-Path $template $rel) $dst -Recurse; Write-Host "  추가: $rel"
    }
}
# .gitignore 규칙 보강 (화면 캡처 .shots/ 가 GitHub 에 올라가지 않게 등)
$gi = Join-Path $Target ".gitignore"
$rules = @(".env", ".env.*", "!.env.example", ".mcp.json", ".claude/pii-names.local.txt", "__pycache__/", ".pytest_cache/", ".shots/")
$existing = if (Test-Path $gi) { Get-Content $gi } else { @() }
$add = $rules | Where-Object { $existing -notcontains $_ }
if ($add) { Add-Content $gi ("`n# harness`n" + ($add -join "`n")); Write-Host ("  보강: .gitignore 규칙 " + $add.Count + "개") }
Write-Host ""
Write-Host "참고: 이 앱의 CLAUDE.md 와 docs\UI_GUIDE.md 는 그대로 두었습니다. 틀의 새 규칙(글꼴·측정 데이터·견본·취향 기록)을 합치려면"
Write-Host "      이 앱 폴더에서 Claude 에게: `"틀의 CLAUDE.md 화면 규칙과 UI_GUIDE 3·13·14장을 이 앱 문서에 합쳐줘`""
Write-Host ""
Write-Host "완료. 바뀐 내용 확인: git -C `"$Target`" status   /   되돌리기: git -C `"$Target`" checkout -- ."
Write-Host "이상 없으면: git -C `"$Target`" add -A ; git -C `"$Target`" commit -m `"chore: 하네스 도구 갱신`""

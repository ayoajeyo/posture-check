---
name: app-capture
description: 로그인해야 보이는 앱 화면(회원 목록·측정 결과·리포트·설정)을 테스트 계정으로 캡처하는 방법 — agent-browser 와 scripts/app_capture.py, 개인정보 안전 규칙. 화면 점검·개선안(ui-designer)·시안 비교에서 로그인 뒤 화면을 봐야 할 때, "로그인 화면 말고 안쪽 화면", "회원 목록 찍어줘" 에 사용한다.
---

# 로그인 뒤 화면 캡처

`scripts/screenshot.py` 는 매번 새 브라우저라 **로그인 전 화면**만 찍힌다. 로그인 뒤 화면은 `scripts/app_capture.py` 를 쓴다. 이 스크립트는 agent-browser(브라우저 자동 조작 도구)로, PC 에 저장된 **테스트 계정 전용 브라우저**를 열어 찍는다.

## 어느 쪽을 쓰나
| 상황 | 도구 |
|------|------|
| 로그인 없이 보이는 화면, 견본, `/design` 시안, 아직 배포 안 한 로컬 변경 | `python scripts/screenshot.py …` |
| 로그인해야 보이는 화면 (배포된 주소 기준) | `python scripts/app_capture.py shot …` |

배포된 주소(`.claude/capture.json` 의 url)를 찍으므로 **아직 배포 안 한 변경은 안 보인다.** 배포 전 확인은 로컬 화면을 `screenshot.py` 로, 배포 후 확인은 이 도구로.

## 준비 (사람이 PC 마다 한 번 — AI 는 대신 하지 않는다)
```powershell
npm i -g agent-browser
agent-browser install
python scripts/app_capture.py login
```
뜬 창에서 **테스트 계정**으로 로그인 → PowerShell 에서 Enter. 로그인 정보는 저장소 밖 `~/.agent-browser/profiles/{앱폴더}-test` 에만 남는다.

## 찍기 (AI 가 실행)
```bash
python scripts/app_capture.py status                                   # 준비됐나
python scripts/app_capture.py shot --name home                          # 첫 화면
python scripts/app_capture.py shot --text "회원" --name members         # 화면의 '회원' 글자를 눌러 이동
python scripts/app_capture.py shot --text "홍길동" --text "리포트" --name report --full
python scripts/app_capture.py shot --hash "#settings" --wait-text "설정" --name settings
```
- 결과는 `.shots/{이름}-390-login.png` (git 에 안 올라감). Read 로 직접 본다.
- 끝 번호: 0 정상 · 2 찍었지만 문제(글자 못 찾음 등) · 3 준비 안 됨 → 사용자에게 준비 3줄 안내 · 4 페이지 실패 · 5 실제 회원 이름 발견.
- 어디를 눌러야 할지 모르면 `agent-browser --session {앱폴더}-capture snapshot` 대신, 먼저 첫 화면을 찍어 보고 보이는 글자로 `--text` 를 정한다.

## 개인정보 규칙 (CRITICAL)
- **테스트 계정 + 가짜 회원(홍길동, 010-0000-0000)만.** 실제 회원이 있는 계정으로 로그인하게 안내하지 않는다.
- AI 는 비밀번호·인증 코드를 입력하거나 묻지 않는다. 로그인은 사람이 `login` 으로 한다.
- `.claude/pii-names.local.txt` 에 실제 회원 이름이 적혀 있으면, 화면에 그 이름이 보일 때 스크립트가 사진을 지우고 5번으로 멈춘다. 이때 사진을 다시 찍으려 하지 말고 사용자에게 알린다.
- 캡처 사진을 다른 곳(이슈·외부 서비스)에 올리지 않는다. 커밋하지 않는다.
- `agent-browser state save` 로 로그인 정보를 저장소 안에 파일로 만들지 않는다.
- 로그인이 풀렸으면(2번 + "나타나지 않음") 사용자에게 `python scripts/app_capture.py login` 을 다시 해 달라고 한다.

## 설정 파일
`.claude/capture.json` (비밀값 없음, 커밋함):
```json
{ "url": "https://ayoajeyo.github.io/앱이름/" }
```

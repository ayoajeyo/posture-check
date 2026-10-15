---
name: git-two-pc
description: 병원 PC 와 집 PC 두 곳에서 같은 프로젝트를 작업할 때의 git 사용법 — 시작 전 pull, 끝날 때 push, 충돌 해결, 실수 되돌리기, 브랜치 정리. /sync, "충돌 났어요", "되돌리고 싶어요", 두 PC 내용이 다를 때 사용한다.
---

# 두 PC 에서 git 쓰기

## 매일 습관
| 때 | 명령 | 뜻 |
|----|------|----|
| 작업 시작 | `git pull` | 다른 PC 에서 올린 것 받기 |
| 작업 끝 | `git add -A` → `git commit -m "feat: …"` → `git push` | 저장하고 올리기 |
Claude Code 를 켜면 SessionStart 훅이 pull 필요 여부를 알려 준다. `/sync` 가 위 과정을 대신한다.

## 충돌이 났을 때 (`CONFLICT` 라는 글자가 보이면)
1. 당황하지 않는다. 파일은 안 지워졌다.
2. 충돌 파일을 열면 아래 표시가 있다:
   ```
   <<<<<<< HEAD        ← 이 PC 의 내용
   …
   =======
   …                   ← 다른 PC 의 내용
   >>>>>>> origin/main
   ```
3. 둘 중 남길 것을 고르고(또는 합치고) 표시 줄 3개를 지운다. Claude 에게 "이 충돌 합쳐줘" 라고 하면 된다.
4. `git add -A` → `git commit -m "merge: 두 PC 작업 합침"` → `git push`.
- 사진·바이너리 파일 충돌은 한쪽을 고른다: `git checkout --ours 파일` 또는 `--theirs 파일`.

## 되돌리기
| 상황 | 명령 | 안전도 |
|------|------|-------|
| 저장 안 한 파일 하나 원래대로 | `git checkout -- 파일` | 그 파일 변경만 사라짐 |
| 마지막 커밋을 취소하되 변경은 남김 | `git reset --soft HEAD~1` | 안전 |
| 이미 push 한 커밋을 없던 일로 | `git revert HEAD` → push | 안전(기록이 남음) |
| 과거 특정 시점으로 전체 복구 | `git log --oneline` 으로 번호 확인 → `git revert 번호..HEAD` | 안전 |
`git reset --hard`, `git push --force` 는 훅이 막는다(되돌릴 수 없어서). 꼭 필요하면 사용자가 직접 실행.

## 브랜치
- 일상 작업은 `main` 에 바로 해도 된다(1인 개발). 실행기(`execute.py`)는 `feat-…` 브랜치를 만든다 → 끝나면 `git checkout main` → `git merge feat-…` → push → `git branch -d feat-…`.
- 오래된 브랜치 목록: `git branch`. 지우기: `git branch -d 이름`.

## 자주 하는 실수
- 두 PC 에서 같은 파일을 pull 없이 고침 → 충돌. 시작 전 pull.
- `.env` 를 커밋 → 훅이 막음. 이미 올라갔으면 키를 즉시 교체(삭제만으로는 기록에 남음).
- 사진·zip 같은 큰 파일 커밋 → 훅이 5MB 이상을 막음. 사진은 코드에 넣지 않는다.
- 커밋 메시지를 비움 → 편집기가 뜨고 멈춘 듯 보임. `-m "메시지"` 를 붙인다.

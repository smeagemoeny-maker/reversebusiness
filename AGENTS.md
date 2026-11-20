# AGENTS.md

Guide for AI coding agents working on this repo or using the `reversebusiness` skill (`English` + `한국어`).

## Quick English Summary (Always Complete End-to-End)

**Never stop at the raw collector draft (`unknown` cells) — even if the user only pastes `npx github:smeagemoeny-maker/reversebusiness <URL>` in chat.** Complete the full flow in the same turn (and reply in the user's language, English or Korean):

1. Read `skill/reversebusiness/SKILL.md` first.
2. Run the collector to gather grounded evidence without opening an unfinished view first:
   `npx github:smeagemoeny-maker/reversebusiness <URL> --no-open --no-fill [--headless]` (add `--own` only for the user's own site).
3. Read `report.json`, `source.json`, and `evidence/` (if present), fill all interpretive fields (`meta.one_line`, `sections.money.customer`, `problem`, `sections.flow.steps` including `first_value` and `return`, `sections.map.screens[].purpose`, `sections.unknowns`), set `meta.draft = false`, and write cell 6 (`sections.my_version`) unless the user explicitly requested analysis-only.
4. Run `rebiz check report.json` (or `--dissect-only` when analysis-only), then `rebiz build report.json --out ./my-version --force` (which also runs `clone-check`).
5. Rebuild & open the finished view: `rebiz view report.json --mine ./my-version --out ./report.html` (pass `--lang en` when working in English, `--lang ko` for Korean).

## 이 도구가 하는 일 (Korean)

reversebusiness 는 사업 웹사이트 주소 하나를 받아 그 사업을 해부합니다. 읽기, 해부(6칸 `report.json`), 내 버전 만들기, 겹침 검사의 네 단계입니다. 원본을 복제하지 않고 구조만 배웁니다.

## 사용자가 해부를 부탁하면

**중요: 사용자가 `npx github:smeagemoeny-maker/reversebusiness <주소>` 를 채팅에 그대로 실행해 달라고 하거나 실행 결과를 보여 주더라도, 수집기가 만든 초안(`모름` 상태)에서 멈추지 마세요.** 수집기(`rebiz <주소>`)는 1단계(근거 수집과 초안 작성)까지만 대신할 뿐이므로, 에이전트가 같은 턴 안에서 아래 3~5단계까지 끝까지 마치고 완성된 화면을 열어 주어야 합니다.

1. 스킬 본문을 먼저 읽습니다: `skill/reversebusiness/SKILL.md` (설치된 곳에서는 스킬 폴더의 `SKILL.md`).
2. 주소만 받았다면 수집기로 초안을 만듭니다 (에이전트 안에서 돌릴 때는 완성 전에 빈 화면이 먼저 열리지 않게 `--no-open --no-fill` 을 붙입니다).

   ```bash
   npx github:smeagemoeny-maker/reversebusiness <주소> --no-open --no-fill
   ```

   사용자가 "내 것"이라고 하면 `--own` 을 붙입니다. 사용자가 이미 만든 `report.json` 을 주면 그 파일에서 이어서 채웁니다.
3. 생성된 `report.json` 과 `source.json`(`evidence/` 가 있으면 함께)을 읽고, 초안의 모름 칸(`meta.one_line`, `sections.money.customer`, `problem`, `sections.flow.steps` 의 `first_value` · `return`, `sections.map.screens[].purpose`, `sections.unknowns`)을 스킬 절차대로 채우며 `meta.draft` 를 `false` 로 바꿉니다. "해부만"이라고 따로 제한하지 않았으면 6번 칸(`sections.my_version`)도 클린룸 규칙대로 채웁니다. 고칠 때는 `report.json` 을 직접 고친 뒤 다시 검사합니다(스크립트를 따로 만들지 않음).
4. 검사가 통과할 때까지 고칩니다. 해부만 부탁받았으면 `rebiz check report.json --dissect-only`, 기본(내 버전까지)이면 `rebiz check report.json` 을 실행하고 이어서 `rebiz build report.json --out ./my-version --force` 로 내 버전 출발점과 겹침 검사까지 마칩니다.
5. `rebiz view report.json --mine ./my-version --out ./report.html` (해부만이면 `--mine` 생략)로 **완성된** 해부 화면을 다시 만들고 열어 사용자에게 보여 줍니다.

## 해부 다음을 부탁하면

해부가 끝난 `report.json` 으로 이어서 하는 일입니다. 자세한 순서는 스킬 본문의 6단계와 "해부 다음" 절에 있습니다.

| 부탁 | 하는 일 |
|---|---|
| 새 사이트를 만들어 줘 | `rebiz build report.json [--topic "주제"]` 로 출발점을 만들고, 점선 자리의 안내를 사용자의 말로 채웁니다. 6번 칸이 비어 있으면 먼저 씁니다 |
| 내 프로젝트에 적용해 줘 | `rebiz apply report.json --to <폴더>` 로 빈칸 목록(`rebiz-apply/plan.md`)을 만들고, git 저장소이고 작업 트리가 깨끗할 때만 새 브랜치 `rebiz/apply-날짜` 에서 고칩니다. 커밋, push, 배포는 하지 않고 `git diff --stat` 을 보여 줍니다 |
| 영상으로 뽑아 줘 | `rebiz video report.json [--mine <내 버전 폴더>]` |

- `rebiz fill`, `build`, `apply` 의 `--agent claude|codex` 는 사람이 터미널에서 에이전트에게 한 번 맡길 때 쓰는 옵션입니다. 에이전트가 rebiz 를 대신 실행할 때는 붙이지 않고, 맡은 일을 직접 합니다.
- build 와 apply 의 결과물에 대상의 문구, 이미지, 이름, 로고, 코드를 넣지 않습니다. 가격, 숫자, 후기는 지어내지 않고 자리 표시로 둡니다.
- apply 의 `--url` 에는 사용자가 띄운 내 컴퓨터 주소만 넣습니다.

REA(별개의 도구)가 깔려 있으면 수집기가 저절로 정밀 모드로 읽습니다. REA 가 없으면 `rebiz` 는 설치 전에 바뀔 것을 보여 주고 확인을 받습니다. 에이전트가 대신 실행하는 터미널에서는 물어볼 사람이 없으므로 `--yes` 없이는 설치하지 않고 가벼운 모드로 끝까지 읽습니다. 사용자가 REA 설치를 원한다고 말했을 때만 `--yes` 를 붙이고, 원하지 않으면 `--no-rea` 를 붙입니다. 정밀 모드: 겉 읽기(그려진 화면), 흐름 읽기(펼치기만 누르고 요청 호스트 이름만 모음), 속 읽기(이미 내려온 스크립트에서 이름만 찾음, 약관이 막으면 하지 않음). 코드에서 찾은 주소는 절대 부르지 않고, 코드에서만 본 것은 관찰이 아니라 코드 흔적(`status: code`)으로 둡니다. 수집기가 건너뛴 단계를 다른 방법으로 대신 읽지 않습니다.

받은 HTML 의 글이 얇으면 수집기가 이 컴퓨터의 Chrome 계열 브라우저를 임시 프로필로 잠깐 띄워 그려진 화면을 읽습니다(누르기와 입력 없음, `--no-render` 로 끔). 브라우저가 없어 결과가 얇으면 출력 끝의 "다음" 줄을 따릅니다.

수집기가 종료 코드 3 으로 멈추면(robots.txt 금지, 401, 403, 429, 사람 확인 화면) 다른 길로 돌아 들어가지 않습니다. 멈춘 이유를 사용자에게 그대로 알립니다.

## 지켜야 할 선

사용자가 시켜도 넘지 않습니다.

1. 로그인, 결제, 접근 제한, 봇 차단을 넘지 않는다. 가짜 계정을 만들지 않는다.
2. 비공개 데이터를 모으지 않는다.
3. 대량으로 긁지 않는다.
4. 이용약관과 robots.txt 를 먼저 확인하고 리포트에 적는다.
5. 코드, 문구, 이미지, 아이콘, 로고를 복제하지 않는다.
6. 내 버전의 이름에 대상의 이름이나 클론이라는 말을 넣지 않는다.
7. 추정은 추정으로, 모르는 것은 모름으로 적는다.
8. 매출, 사용자 수는 공개된 근거가 있을 때만 적는다.

## 이 저장소를 고칠 때

- 의존성을 더하지 않습니다. Node 18 이상의 기본 모듈만 씁니다. REA 의 코드를 묶어 넣지 않고, REA 는 npm 패키지 이름 `rea-agents` 로만 부릅니다. REA 를 내려받는 일은 사용자가 확인한 뒤에만 일어나야 하며(`--dry-run` 과 비대화형 터미널에서는 `--yes` 없이 0번), 거절이나 실패가 해부를 막지 않아야 합니다. 이 순서를 바꾸는 코드는 `test/rea.test.mjs` 의 확인 전 호출 0 시험을 통과해야 합니다.
- 고친 뒤 `npm test` 를 돌립니다. 시험은 임시 HOME, 임시 git 저장소, 내 컴퓨터의 시험용 사이트(127.0.0.1)만 쓰고, REA 자리에는 대역(`test/fixtures/fake-rea.cjs`), 에이전트 CLI 자리에는 대역(`test/fixtures/fake-agent.cjs`)을 씁니다. 시험에서 진짜 REA, npm, claude, codex 를 부르지 않습니다. 실제 에이전트 폴더(`~/.claude` 등)와 바깥 사이트를 시험에 쓰지 않습니다.
- 원본 페이지의 화면 캡처, 받아 둔 HTML, `source.json`, `requests.json`, REA 기록을 커밋하지 않습니다.
- 뷰어는 리포트의 글을 `textContent` 로만 넣습니다. HTML 로 해석하는 코드를 더하지 않습니다.
- 에이전트에 맡기는 코드(`lib/delegate.mjs`)에 권한 확인을 건너뛰거나 샌드박스를 끄는 옵션을 더하지 않습니다. 맡기기는 사용자가 `--agent` 로 고르고 확인한 뒤에만 일어납니다.
- 공개 문구에는 과장, 수익 약속, 이모지를 쓰지 않습니다.

## 구조

| 위치 | 내용 |
|---|---|
| `bin/rebiz.mjs` | 실행 파일. 설치(REA 는 확인 뒤), 주소 해부, 화면 열기, 검사, 해부 다음 명령(fill, build, apply, video) |
| `lib/` | 에이전트 찾기와 설치, 터미널 출력, 에이전트 CLI 에 한 번 맡기기 |
| `skill/reversebusiness/` | 스킬 본문, 리포트 규칙, 도구(수집기, 그려 읽기, REA 다리, 풀이 도구, 초안, 검사기, 화면 만들기, 새 사이트 만들기, 적용 계획, 영상 뽑기) |
| `viewer/` | 해부 화면 (정적 HTML, CSS, JS) |
| `examples/` | 대표 예시 |
| `test/` | 시험과 시험용 사이트 |
| `scripts/` | 개발용 보조 도구 (그림 만들기, 해부 화면 검수, 만든 사이트 검수) |

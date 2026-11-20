# 명령 기록: 판매 페이지 한 장을 REA 로 읽고 내 버전까지 (정밀 모드)

- 날짜: 2026-11-17
- 대상: `https://www.aicitybuilders.com/vibecoding` (채널 주인 본인의 공개 판매 페이지). 남의 서비스와 같은 방식으로, 밖에서 보이는 것만 읽었다. 소스 저장소는 열지 않았다.
- 도구: REA 6.9.0 (CLI), 임시 프로필의 별도 Chrome(헤드리스), reversebusiness 스킬의 도구들. 이 기록을 만들 때 스킬 폴더의 이름은 지금과 달랐고, 아래 명령의 경로는 지금 이름으로 고쳐 적었다.
- 지킨 한도: 공개 주소 4개(robots.txt, 판매 페이지, 이용약관, 환불 정책), 직접 보낸 요청 5번, 요청 사이 2초 이상, 로그인과 결제 0, 누르기와 제출 0. `/api/` 는 직접 요청하지 않았다.
- 아래 명령은 실제로 돌린 순서다. `TARGET` 은 그때 받은 페이지 ID 자리다. 근거 파일(`evidence/`: 화면 캡처, 받아 둔 HTML, REA 기록, 원본 글 묶음)과 보조 스크립트(`helpers/`)는 공개 저장소에 올리지 않았다. 가격과 날짜는 2026-11-17 에 읽은 값이다.

## 0. 준비

```bash
rea --version          # 6.9.0
rea --help             # 명령 목록
rea capture-web-screenshot --help
rea inspect-web-page --help
rea analyze-web-bundle --help
```

REA 의 웹 명령은 스스로 브라우저를 띄우거나 페이지를 열지 않는다. 내가 띄운 브라우저에 붙어서 읽기만 한다. 그래서 브라우저를 먼저 띄운다.

## 1. 읽기

### 1-1. robots.txt 먼저 (12:37:34)

```bash
curl -sS -m 20 -D evidence/robots.headers.txt -o evidence/robots.txt https://www.aicitybuilders.com/robots.txt
```

얻은 것: 모든 로봇에 `Allow: /`, `Disallow: /api/`. 응답 머리말 사본.

### 1-2. 임시 프로필 브라우저 띄우기 (12:37:48)

```bash
PROFILE=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check --disable-extensions \
  --window-size=1440,900 --hide-scrollbars about:blank &
echo $! > chrome.pid          # 끝날 때 이 번호로 끈다

# 대상 페이지를 새 탭으로 연다 (브라우저의 디버깅 주소에 요청)
curl -s -X PUT "http://127.0.0.1:9333/json/new?https://www.aicitybuilders.com/vibecoding"
```

내 평소 브라우저 프로필과 쿠키는 쓰지 않는다. 디버깅 포트는 내 컴퓨터 안(127.0.0.1)에서만 연다.

### 1-3. 붙을 페이지 찾기 (0.6초)

```bash
rea list-browser-targets http://127.0.0.1:9333 \
  --allowed-origins https://www.aicitybuilders.com --format json > evidence/01_targets.json
```

얻은 것: 페이지 ID 와 제목.

막힌 곳 1: 처음에는 `--allowed-origins '["https://..."]'` 처럼 JSON 배열로 줬다가 `invalid_request` 가 났다. 도움말에 `<array>` 라고 적혀 있지만 CLI 에서는 주소를 그대로 한 개 적는다. 오류 사본: `evidence/막힘_01_allowed-origins_JSON배열.json`.

### 1-4. 첫 화면 캡처 (약 1초)

```bash
rea capture-web-screenshot http://127.0.0.1:9333 TARGET \
  --allowed-origins https://www.aicitybuilders.com --format json > evidence/02_screenshot_viewport.json
```

얻은 것: 보이는 화면 한 장(1440x813). PNG 는 JSON 안에 base64 로 들어 있어서 꺼내 저장했다(`02_screenshot_viewport.png`, sha256 일치 확인).

막힌 곳 2: REA 는 보이는 화면만 찍는다. 전체 길이나 폰 너비는 따로 못 찍는다. 아래 1-7 에서 창 크기를 바꿔 해결했다.

### 1-5. 페이지 읽기 (약 3초)

```bash
rea inspect-web-page http://127.0.0.1:9333 TARGET \
  --allowed-origins https://www.aicitybuilders.com --observation-ms 1500 \
  --include-accessibility-text --include-storage-keys --format json > evidence/03_inspect_page.json
```

얻은 것:

- 접근성 글자 889마디: 구역 이름, 제목 15개, 버튼 9개, 링크 31개, 가격 문구, 강 목록, 후기, 꼬리말. 리포트의 대부분이 여기서 나온다.
- 구조 644마디(태그 이름과 속성 이름만, 값은 없음), 같은 출처의 주소 65개.
- 스크립트 10개의 주소와 크기, 자원 11개(영상 4, 그림 6, 스크립트 1).
- 저장소 키 이름만: localStorage 1개, IndexedDB 2개. 값은 REA 가 남기지 않는다.

REA 가 못 준 것:

- 접혀 있는 글(자주 묻는 질문의 답, 더 보기 안쪽). REA 는 누르지 않으므로 접근성 글자에 없다.
- 메타 태그의 값과 JSON-LD. 속성 이름만 온다. 1-9 에서 공개 HTML 한 장으로 보충했다.
- 붙기 전에 오간 네트워크 요청. 기록은 붙은 순간부터다.
- 다른 출처의 자원 74개. 허용한 출처 밖이라 기록에서 빠진다(개수만 남는다).
- 색, 글꼴 같은 계산된 스타일.

### 1-6. 스크립트 정적 분석 (23초, 재시도 포함 약 5분)

```bash
rea analyze-web-bundle http://127.0.0.1:9333 TARGET \
  --allowed-origins https://www.aicitybuilders.com \
  --detail summary --evidence_output evidence/04_bundle_evidence.json \
  --view '{"kind":"web-bundle","collection":"summary"}' --format json > evidence/04_bundle_summary.json
```

얻은 것: 스크립트 10개 가운데 9개를 실행 없이 읽음. 경로 후보 12개(`/program`, `/curriculum`, `/dashboard`, `/refund-policy` 등), 호출 주소 후보 0개.

막힌 곳 3: `--view` 의 모양이 도움말에 없다. `{"kind":"web-bundle","section":"summary"}` 로 줬다가 오류가 났고, 오류 글이 알려 준 대로 `collection` 으로 고쳤다. 오류 사본: `evidence/막힘_02_bundle_view_인자.json`.

막힌 곳 4: 가장 큰 스크립트 하나(약 1.3MB)는 끝내 분석되지 않았다.

```bash
# 기본값: 분석기 메모리 1GB 를 다 써서 실패 (resource_constraint)
# 다시 1: 메모리만 늘림 → 스크립트당 30초 한도에 걸림 (33초)
rea analyze-web-bundle ... --max-heap-mb 6144 --evidence_output evidence/05_bundle_evidence_heap6g.json ...
# 다시 2: 메모리 8GB, 스크립트당 240초 → 240초 한도에 걸림 (243초)
rea analyze-web-bundle ... --max-heap-mb 8192 --analysis-timeout-ms 240000 --evidence_output evidence/06_bundle_evidence_heap8g_240s.json ...
```

세 번 모두 결과가 같았다(9개만). 사업을 읽는 데는 없어도 되므로 모름으로 남기고 넘어갔다. 강의에서는 기본값 한 번만 돌리면 된다.

### 1-7. 전체 길이와 좁은 화면 캡처 (약 20초)

```bash
node helpers/set-window.mjs http://127.0.0.1:9333 TARGET 1440 full     # 창을 문서 길이만큼 늘림
rea capture-web-screenshot http://127.0.0.1:9333 TARGET --allowed-origins https://www.aicitybuilders.com --format json > evidence/07_screenshot_desktop_full.json

node helpers/set-window.mjs http://127.0.0.1:9333 TARGET 390 844
rea capture-web-screenshot ... > evidence/08_screenshot_narrow500_viewport.json
node helpers/set-window.mjs http://127.0.0.1:9333 TARGET 390 full
rea capture-web-screenshot ... > evidence/09_screenshot_narrow500_full.json
```

얻은 것: 전체 길이 1440x8426, 좁은 화면 500x9075.

`helpers/set-window.mjs` 는 REA 가 아닌 보충 도구다. 창 크기만 바꾸고 페이지 안의 코드는 실행하지 않는다. 페이지를 다시 불러오지 않으므로 요청이 늘지 않는다.

막힌 곳 5: 헤드리스 Chrome 의 창은 너비 500 아래로 줄지 않았다. 390 을 달라고 했지만 500 으로 찍혔다. 진짜 폰 너비는 기기 흉내(에뮬레이션)가 필요한데, REA 는 그것을 하지 않고 다른 도구가 건 흉내는 REA 가 붙을 때 풀릴 수 있다. 그래서 원본은 500 너비를 좁은 화면 근거로 썼다.

### 1-8. 이용약관과 환불 정책 (각 약 10초)

```bash
curl -s -X PUT "http://127.0.0.1:9333/json/new?https://www.aicitybuilders.com/terms"
rea inspect-web-page http://127.0.0.1:9333 TARGET2 --allowed-origins https://www.aicitybuilders.com \
  --observation-ms 1000 --include-accessibility-text --format json > evidence/10_inspect_terms.json

curl -s -X PUT "http://127.0.0.1:9333/json/new?https://www.aicitybuilders.com/refund-policy"
rea inspect-web-page http://127.0.0.1:9333 TARGET3 ... > evidence/11_inspect_refund.json
```

얻은 것: 약관 12개 조(결제 수단, 환불, 콘텐츠 복제 금지, 잠금 우회 금지), 환불 계산식과 예시.

순서에 대한 메모: 약관 주소는 판매 페이지의 꼬리말에서 알았다. 그래서 robots.txt, 판매 페이지, 약관 순서가 됐다. 약관 주소를 미리 알면 약관을 먼저 읽는다.

### 1-9. 공개 HTML 한 장으로 보충 (1초)

```bash
curl -sS -m 20 -o evidence/12_public.html https://www.aicitybuilders.com/vibecoding
```

얻은 것: 메타 24개(공유용 13개), JSON-LD 3건(기관, 강의, 길잡이), 스크립트 없이도 보이는 안내문.

### 1-10. 대상 탭 닫기

```bash
curl -s http://127.0.0.1:9333/json/close/TARGET     # 대상 탭 닫기 (세 개)
```

브라우저 자체는 내 리포트와 내 버전을 찍는 데 더 쓰고, 맨 끝에 번호로 껐다(아래 4-4).

읽기에 걸린 시간: 12:37:34 부터 12:47:42 까지 약 10분. 이 가운데 스크립트 분석을 다시 돌린 대기가 약 5분 30초다. 다시 돌리지 않으면 약 4분 30초.

## 2. 해부

### 2-1. 초안 만들기 (0.06초)

```bash
node ../../skill/reversebusiness/tools/from-rea.mjs \
  evidence/03_inspect_page.json evidence/10_inspect_terms.json evidence/11_inspect_refund.json \
  evidence/07_screenshot_desktop_full.json evidence/09_screenshot_narrow500_full.json \
  evidence/04_bundle_evidence.json \
  --html evidence/12_public.html --robots evidence/robots.txt \
  --brand "<원본 브랜드 이름>" \
  --out report.draft.json --source-out evidence/source.json
```

출력:

```
초안: report.draft.json
원본 글 묶음: evidence/source.json  (글 322줄, 자원 주소 16개. 겹침 검사에만 쓴다)
읽은 페이지 3개 · 근거 8개 · 관찰 15 · 추정 0 · 모름 6
남은 일 9개 (검사기가 알려 주는 빈칸):
  - meta.one_line: 한 줄 요약이 비었어요
  - my_version.working_name: 비었어요
  ...
```

초안에 들어간 것: 가격 문구 5개, 가입과 결제로 가는 누르는 곳, 구역 순서, 스크립트와 저장소 키 이름, 근거 장부 E1 부터 E8. 고객, 문제, 첫 가치, 내 버전은 모름이나 빈칸이다. 꼬리말에 있던 이메일 주소와 사업자 번호는 가려져서 초안과 원본 글 묶음 어디에도 없다.

### 2-2. 6칸 완성과 검사 (약 3분)

초안을 `report.json` 으로 옮겨 스킬 절차대로 채웠다. 근거 2개(E9 응답 머리말, E10 첫 화면 캡처)를 더했다.

```bash
node ../../skill/reversebusiness/tools/check-report.mjs report.json
# 관찰 20 · 추정 6 · 모름 7
# 통과 (경고 0개)
node ../../skill/reversebusiness/tools/build-view.mjs report.json      # report.html
```

리포트 캡처는 내 컴퓨터의 파일을 찍는 보조 스크립트로 남겼다. 지금 저장소에서는 `scripts/qa-viewer.mjs` 가 같은 일을 한다.

## 3. 만들기 (약 2분)

리포트 6번 칸의 명세만 보고 가상의 다른 주제로 한 장을 새로 썼다: `my-version/index.html`, `my-version/style.css`. 주제는 음식점 사장님을 위한 휴대폰 음식 사진 수업(가상의 예시). 화면 맨 위와 가격 상자, 맨 아래에 예시라고 적었다. 바깥 자원은 하나도 부르지 않는다.

## 4. 검사 (약 2분)

### 4-1. 겹침 검사

```bash
node ../../skill/reversebusiness/tools/check-clone.mjs my-version --source evidence/source.json
```

```
내 버전: 파일 2개 (글 파일 2개, 낱말 1964개)
원본: 글 322줄, 이름과 도메인 9개, 자원 주소 16개. 기준: 5낱말 연속
  1. 같은 문장 구간     없음
  2. 원본 이름, 도메인  없음
  3. 원본 자원 주소     없음
통과 (경고 0건). ...
```

막힌 곳 6: 처음 돌렸을 때는 실패가 1건 나왔다. 내 문장이 아니라 `viewport` 메타의 설정 값(`width=device-width, initial-scale=1`)이 원본과 같다고 잡힌 것이다. 어느 페이지에나 있는 설정 값이라, 도구가 메타 가운데 사람이 읽는 글(소개, 제목, 열쇠말)만 보도록 고쳤다. 고친 뒤 통과.

### 4-2. 일부러 실패시키기

```bash
node helpers/fail-demo.mjs my-version evidence/source.json
```

내 버전을 복사한 뒤 원본 문장 하나, 원본 이름 하나, 원본 그림 주소 하나를 넣고 검사한다.

```
  1. 같은 문장 구간     실패 1건
  2. 원본 이름, 도메인  실패 2건
  3. 원본 자원 주소     실패 1건
실패  [문장] index.html: 원본과 8낱말이 연달아 같아요: ...
실패  [이름] index.html: 원본 이름 "..." 이 들어 있어요 (164번째 줄).
실패  [자원] index.html: 원본 자원 주소를 그대로 써요: ...
종료 코드 1 (1 이면 검사가 겹침을 잡은 것)
```

### 4-3. 나란히 놓고 보기

```bash
node helpers/shot-local.mjs http://127.0.0.1:9333 "file://$PWD/my-version/index.html" 내버전_데스크톱.png 1440 full
node helpers/shot-local.mjs http://127.0.0.1:9333 "file://$PWD/my-version/index.html" 내버전_폰.png 390 full phone
python3 helpers/make-compare.py evidence/07_screenshot_desktop_full.png 내버전_데스크톱.png 구조비교.png
```

그때 만든 비교 그림은 왼쪽이 원본 캡처라서 공개 저장소에 올리지 않았다. 공개용 그림 `structure-compare.png` 는 왼쪽을 선으로만 그린 뼈대로 다시 만든 것이다(`scripts/make-figures.mjs`). 같은 구실의 구역을 번호로 이었고, 원본의 구역 하나는 가져오지 않았다. 색과 글꼴과 그림이 닮았는지는 검사기가 보지 않으므로 원본 화면과 내 버전을 나란히 놓고 사람이 본다.

### 4-4. 브라우저 끄기

```bash
kill $(cat chrome.pid)      # 내가 띄운 브라우저만, 번호로 끈다. 임시 프로필 폴더도 지운다
```

## 걸린 시간

| 단계 | 시간 | 메모 |
|---|---|---|
| 읽기 | 약 10분 | 스크립트 분석을 다시 돌린 대기 약 5분 30초 포함. 다시 돌리지 않으면 약 4분 30초 |
| 초안 | 0.06초 | from-rea |
| 해부 | 약 3분 | 6칸 완성, 검사, 리포트 캡처 |
| 만들기 | 약 2분 | 한 장짜리 정적 페이지 |
| 검사 | 약 2분 | 겹침 검사, 실패 시연, 캡처, 비교 그림 |
| 합계 | 약 17분 | 12:37:34 부터 12:54:47 까지 |

에이전트가 쉬지 않고 돌린 시간이고, 그 사이에 도구 두 개를 새로 쓰는 일이 섞여 있었다. 사람이 말하면서 시연하면 더 걸린다.

## 확인하지 못한 것

- REA 를 MCP 로 붙여서(에이전트 안에서) 같은 흐름을 돌리는 것. 이번에는 CLI 만 썼다.
- 진짜 폰 너비(390)에서의 원본 화면.
- 접혀 있는 글의 내용, 다른 출처 자원 74개의 정체, 가장 큰 스크립트의 안쪽.
- 남의 서비스에서 같은 흐름. 이번 대상은 채널 주인 본인의 페이지 하나뿐이다.

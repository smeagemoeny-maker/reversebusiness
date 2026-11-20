# 기여 안내

고쳐 주셔서 고맙습니다. 작은 수정도 환영합니다.

## 시작하기

```bash
git clone https://github.com/smeagemoeny-maker/reversebusiness.git
cd reversebusiness
npm test
node bin/rebiz.mjs demo
```

설치할 패키지가 없습니다. Node 18 이상이면 됩니다.

## 지켜 주세요

- 의존성을 더하지 않습니다.
- 시험은 임시 HOME 과 `test/fixtures` 의 시험용 사이트만 씁니다. 남의 사이트를 대상으로 한 시험이나 기록을 넣지 않습니다.
- 남의 페이지의 화면 캡처, 문구 묶음, `source.json` 을 올리지 않습니다. 예시가 필요하면 본인이 운영하는 페이지이거나 지어낸 페이지여야 합니다.
- 수집기의 한도(최대 5장, 요청 사이 2초, robots.txt 우선, 로그인과 폼 제출 없음, 찾은 주소를 부르지 않음, 약관이 막으면 속 읽기 없음)를 느슨하게 하는 변경은 받지 않습니다.
- 시험에서 진짜 REA 나 npm 을 부르지 않습니다. REA 자리에는 `test/fixtures/fake-rea.cjs` 를 씁니다.
- 시험에서 진짜 에이전트(claude, codex)를 부르지 않습니다. 에이전트 CLI 자리에는 `test/fixtures/fake-agent.cjs` 를 씁니다. 에이전트에 맡기는 코드에 권한 확인을 건너뛰거나 샌드박스를 끄는 옵션을 더하는 변경은 받지 않습니다.
- `rebiz build` 와 `rebiz apply` 가 만드는 것에 대상의 문구, 이미지, 이름이 들어가게 하는 변경은 받지 않습니다.
- 뷰어는 인터넷 없이 열려야 합니다. 바깥 글꼴, CDN, 추적 코드를 넣지 않습니다.
- 문서와 화면 문구는 한국어가 먼저이고, 과장과 이모지를 쓰지 않습니다.

## 변경을 보낼 때

- 무엇을 왜 바꿨는지 한두 문장으로 적어 주세요.
- 고친 곳을 확인하는 시험을 `test/` 에 더해 주세요.
- 화면을 바꿨다면 데스크톱과 폰 너비의 캡처를 붙여 주세요. `scripts/qa-viewer.mjs` 가 해부 화면의 캡처, 콘솔 오류, 바깥 요청을 확인하고, `scripts/qa-site.mjs` 가 `rebiz build` 로 만든 페이지의 캡처, 가로 넘침, 콘솔 오류, 바깥 요청을 확인합니다.

## 버그 신고

깃허브 이슈에 실행한 명령, 나온 출력, 운영체제와 Node 판 번호를 적어 주세요. 보안 문제는 [SECURITY.md](SECURITY.md) 를 봐 주세요.

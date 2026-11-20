// 약관 링크로 보고 연 페이지가 정말 약관인지 가리는 검사. 약관이 아닌 글을 약관으로 읽으면 속 읽기를 잘못 허락하게 된다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeTerms } from '../skill/reversebusiness/tools/collect.mjs';

test('약관 가리기: 주소나 제목이 약관을 가리키거나, 본문에 약관에서 쓰는 말이 여럿 있어야 약관으로 본다', () => {
  assert.equal(looksLikeTerms({ url: 'https://shop.test/terms', title: '', lines: ['조항 하나'] }), true);
  assert.equal(looksLikeTerms({ url: 'https://shop.test/p/12', title: '이용약관', lines: [] }), true);
  assert.equal(looksLikeTerms({ url: 'https://shop.test/p/12', title: '', lines: ['Terms of Service', 'Limitation of liability', 'Governing law', 'We may terminate your account', 'You agree to these rules'] }), true);
  // 링크 글자 때문에 약관으로 잡혔지만 실제로는 소개 페이지인 경우
  assert.equal(looksLikeTerms({ url: 'https://shop.test/digital-nomad', title: 'Photo pack for travelers', lines: ['Take photos in any weather conditions', 'You agree this looks great'] }), false);
  assert.equal(looksLikeTerms({ url: 'not a url', title: '', lines: [] }), false);
});

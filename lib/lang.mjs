// CLI와 뷰어의 기본 언어를 정한다: 명시한 --lang > REBIZ_LANG > 시스템 로캘(한국어면 ko, 그 밖의 글로벌 환경은 en).
export function pickLang(explicit = '', env = process.env) {
  const v = String(explicit || env.REBIZ_LANG || '').trim().toLowerCase();
  if (v === 'en' || v.startsWith('en-') || v.startsWith('en_')) return 'en';
  if (v === 'ko' || v.startsWith('ko-') || v.startsWith('ko_')) return 'ko';
  const loc = String(env.LC_ALL || env.LC_MESSAGES || env.LANG || '').trim().toLowerCase()
    || String(Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return /^ko([-_.]|$)/.test(loc) ? 'ko' : 'en';
}

// 터미널 출력 도우미. 색은 사람이 보는 터미널(TTY)일 때만 쓴다. NO_COLOR 가 있으면 쓰지 않는다.
const useColor = (stream) => !!(stream && stream.isTTY) && !process.env.NO_COLOR && process.env.TERM !== 'dumb';

export function makeTerm(stream = process.stdout) {
  const on = useColor(stream);
  const wrap = (open, close = '\x1b[0m') => (s) => (on ? `${open}${s}${close}` : String(s));
  const t = {
    color: on,
    gold: wrap('\x1b[38;2;214;137;42m'),
    hi: wrap('\x1b[38;2;242;180;90m'),
    ivory: wrap('\x1b[38;2;235;226;210m'),
    dim: wrap('\x1b[38;2;138;132;120m'),
    bold: wrap('\x1b[1m'),
    say: (s = '') => stream.write(`${s}\n`),
    rule: () => stream.write(`${on ? '\x1b[38;2;214;137;42m' : ''}${'─'.repeat(56)}${on ? '\x1b[0m' : ''}\n`),
  };
  // 글자 너비: 한글과 한자는 두 칸으로 센다.
  t.width = (s) => [...String(s)].reduce((n, ch) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1), 0);
  t.pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - t.width(s)));
  return t;
}

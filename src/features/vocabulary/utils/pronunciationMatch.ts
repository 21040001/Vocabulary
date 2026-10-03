import { normalizeAnswer } from './answerUtils';

export type Verdict = 'correct' | 'close' | 'wrong';

export const normalizeSpoken = (s: string) =>
  normalizeAnswer(s)
    .replace(/[^a-z' -]/g, '')
    .replace(/^(to|a|an|the) /, '')
    .replace(/\s+/g, ' ')
    .trim();

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export const similarity = (a: string, b: string) =>
  !a && !b ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length);

export function judgePronunciation(heard: string[], expected: string[]): { verdict: Verdict; best: string } {
  const hs = heard.map(normalizeSpoken).filter(Boolean);
  const es = expected.map(normalizeSpoken).filter(Boolean);
  if (!hs.length || !es.length) {
    return { verdict: 'wrong', best: heard[0] ?? '' };
  }
  let bestScore = 0;
  let best = hs[0];
  for (const h of hs) {
    for (const e of es) {
      if (h === e || ` ${h} `.includes(` ${e} `)) {
        return { verdict: 'correct', best: h };
      }
      const sc = similarity(h, e);
      if (sc > bestScore) {
        bestScore = sc;
        best = h;
      }
    }
  }
  return { verdict: bestScore >= 0.8 ? 'close' : 'wrong', best };
}
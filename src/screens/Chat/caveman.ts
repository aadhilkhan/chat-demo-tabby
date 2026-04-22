/**
 * Translates modern English into caveman grunt-speak.
 * Strips articles and helpers, swaps pronouns, collapses tenses,
 * uppercases everything, and throws in a grunt for good measure.
 *
 * Not linguistically serious — just enough to sell the joke for the prototype.
 */

const FILLERS = new Set([
  'a', 'an', 'the',
  'is', 'are', 'was', 'were', 'am', 'be', 'being', 'been',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  'will', 'would', 'could', 'should', 'shall', 'may', 'might', 'must',
  'of', 'for', 'in', 'on', 'at', 'to', 'with', 'by', 'from', 'about',
  'this', 'that', 'these', 'those',
  'so', 'just', 'really', 'very', 'quite', 'too', 'also',
  'and', 'or', 'but',
  'am',
]);

const SWAPS: Record<string, string> = {
  i: 'me',
  "i'm": 'me',
  "i've": 'me',
  "i'll": 'me',
  "i'd": 'me',
  me: 'me',
  my: 'me',
  mine: 'me',
  myself: 'me',
  we: 'us',
  our: 'us',
  ours: 'us',
  you: 'you',
  "you're": 'you',
  "you've": 'you',
  "you'll": 'you',
  your: 'you',
  yours: 'you',
  he: 'him',
  she: 'her',
  they: 'them',
  'their': 'them',
  "don't": 'no',
  dont: 'no',
  "doesn't": 'no',
  "didn't": 'no',
  "won't": 'no',
  "can't": 'no',
  cant: 'no',
  cannot: 'no',
  "isn't": 'no',
  "aren't": 'no',
  "wasn't": 'no',
  "weren't": 'no',
  "couldn't": 'no',
  "wouldn't": 'no',
  "shouldn't": 'no',
  not: 'no',
  never: 'no',
  refund: 'coin back',
  money: 'coin',
  cash: 'coin',
  dollars: 'coin',
  dollar: 'coin',
  dirham: 'coin',
  dirhams: 'coin',
  payment: 'coin',
  payments: 'coin',
  charged: 'take coin',
  charge: 'take coin',
  rings: 'ring',
  fingers: 'finger',
  fits: 'fit',
  problem: 'trouble',
  problems: 'trouble',
  issue: 'trouble',
  issues: 'trouble',
  help: 'help',
  understand: 'see',
  want: 'want',
  wants: 'want',
  wanted: 'want',
  need: 'need',
  needs: 'need',
  needed: 'need',
  give: 'give',
  gives: 'give',
  gave: 'give',
  get: 'get',
  gets: 'get',
  got: 'get',
  take: 'take',
  takes: 'take',
  took: 'take',
  broken: 'smash',
  break: 'smash',
  broke: 'smash',
  fix: 'fix',
  fixed: 'fix',
  fixing: 'fix',
  please: 'please',
  thanks: 'thank',
  thank: 'thank',
  sorry: 'sorry',
  hello: 'hello',
  hi: 'hi',
  hey: 'hey',
  yes: 'yes',
  no: 'no',
  okay: 'ok',
  ok: 'ok',
  why: 'why',
  what: 'what',
  when: 'when',
  where: 'where',
  who: 'who',
  how: 'how',
  here: 'here',
  there: 'there',
  now: 'now',
  soon: 'soon',
  today: 'sun',
  tomorrow: 'next sun',
  yesterday: 'last sun',
};

const GRUNTS = ['UGG', 'GRRR', 'HMPH', 'OOOK', 'URGH', 'HNGH'];

function pickGrunt(seed: string): string {
  // Deterministic-ish pick so the same input reads the same way
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRUNTS[Math.abs(h) % GRUNTS.length];
}

/** Small canned openers — pick by a cheap keyword scan before translating. */
function opener(lower: string): string | null {
  if (/\b(hi|hello|hey|howdy)\b/.test(lower)) return 'ME SEE YOU';
  if (/\b(thanks|thank you|ty)\b/.test(lower)) return 'NO THANK. ME DO';
  if (/\b(refund|money back|coin back)\b/.test(lower)) return 'COIN COME BACK SOON';
  if (/\b(help|stuck|problem|issue)\b/.test(lower)) return 'ME HELP';
  if (/\b(sorry|apolog)/.test(lower)) return 'NO SORRY';
  if (/^\s*(ok|okay|cool|great|good)\b/.test(lower)) return 'UGG. GOOD';
  if (/\?$/.test(lower.trim())) return 'ME THINK';
  return null;
}

export function toCaveman(text: string): string {
  const raw = text.trim();
  if (!raw) return 'UGG?';

  const lower = raw.toLowerCase();
  const lead = opener(lower);

  // Tokenize into words + punctuation atoms
  const atoms = lower.match(/[a-z']+|[.!?,]/g) ?? [];
  const out: string[] = [];
  for (const atom of atoms) {
    if (/^[.!?,]$/.test(atom)) {
      out.push(atom);
      continue;
    }
    if (FILLERS.has(atom)) continue;
    const swap = SWAPS[atom];
    out.push(swap ?? atom);
  }

  // Collapse internal whitespace around punctuation, uppercase everything
  let body = out.join(' ').replace(/\s+([.!?,])/g, '$1').trim();
  body = body.replace(/\s+/g, ' ').toUpperCase();

  // Make sure it ends with terminal punctuation
  if (!/[.!?]$/.test(body)) body += '.';

  const grunt = pickGrunt(raw);
  return lead ? `${lead}. ${body} ${grunt}.` : `${body} ${grunt}.`;
}

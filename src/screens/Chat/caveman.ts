/**
 * Caveman-speak reply engine for "Ahmad" — the agent with one foot in the
 * tundra and one on a support ticket.
 *
 * Grammar cribbed from the usual caveman canon (Hulk-speak, Tarzan phrases,
 * SNL's Unfrozen Caveman Lawyer, Captain Caveman, Early Man). Rules:
 *   - Drop articles (a, an, the) and copulas (is, are, am, was, were).
 *   - Verbs stay in infinitive / third-person: "me go", "coin fly".
 *   - Short concrete nouns swap in for abstract modern ones —
 *     email → pigeon word, database → cave wall, wifi → invisible magic,
 *     truck → big animal that go vrrrm.
 *   - Onomatopoeia + doubled words for emphasis: SOON. SOON. BONK. BONK.
 *   - Grunts sprinkled at the end: UGG, GRRR, HMPH, HNGH, WUGH.
 *
 * Recurring cast (so the prototype has personality instead of generic
 * grunt loops):
 *   - TROG — Ahmad's cousin; invariably has had the same problem first.
 *   - SHAMAN — Ahmad's boss. Owns the big cave wall of records.
 *   - CHIEF BORG — the supervisor you escalate to.
 *   - FLUFFY — the office mammoth. Sometimes sits on things.
 *   - VOLCANO — where broken passwords go.
 *
 * Deterministic: same input → same reply (hash picks the template).
 */

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

// ---------------------------------------------------------------------------
// Intent classifier
// ---------------------------------------------------------------------------

type Intent =
  | 'greet' | 'thanks' | 'apology' | 'ack' | 'goodbye'
  | 'refund' | 'delivery' | 'tracking' | 'cancel' | 'return' | 'exchange'
  | 'broken' | 'price' | 'payment' | 'auth' | 'contact'
  | 'angry' | 'confused' | 'compliment' | 'insult' | 'joke'
  | 'why' | 'when' | 'where' | 'how' | 'what' | 'yes' | 'no'
  | 'question' | 'general';

function classify(text: string): Intent {
  const t = text.toLowerCase().trim();

  // Emotional / social first — should shadow commerce intent so Ahmad
  // acknowledges the feeling before trying to solve.
  if (/\b(angry|furious|pissed|mad|frustrated|annoyed|fed up|hate|this is ridiculous|stupid|useless)\b/.test(t)
      || /!{2,}/.test(text) || /[A-Z]{8,}/.test(text)) return 'angry';
  if (/\b(confused|lost|don'?t (get|understand)|what do you mean|unclear|makes no sense|wdym)\b/.test(t)) return 'confused';
  if (/\b(you are (amazing|great|awesome|the best)|love you|good (bot|job|work)|nice work)\b/.test(t)) return 'compliment';
  if (/\b(you (suck|are stupid|are dumb)|stupid bot|dumb bot|garbage|useless)\b/.test(t)) return 'insult';
  if (/\b(joke|funny|lol|lmao|rofl|haha|hehe)\b/.test(t)) return 'joke';

  // Pleasantries
  if (/^(hi|hey|hello|yo|howdy|greetings|good (morning|afternoon|evening))\b/.test(t)) return 'greet';
  if (/^(bye|goodbye|cya|see ya|later|peace|ttyl)\b/.test(t)) return 'goodbye';
  if (/\b(thanks|thank you|thx|ty|appreciate|grateful)\b/.test(t)) return 'thanks';
  if (/\b(sorry|apolog|my bad)\b/.test(t)) return 'apology';
  if (/^(ok|okay|cool|nice|great|sure|alright|got it|k|fine)\b/.test(t)) return 'ack';
  if (/^(yes|yeah|yep|yup|correct|right|affirmative)\b/.test(t)) return 'yes';
  if (/^(no|nope|nah|wrong|incorrect|negative)\b/.test(t)) return 'no';

  // Commerce intents (most specific first)
  if (/\b(refund|money back|chargeback|reimburse|reverse (payment|charge))\b/.test(t)) return 'refund';
  if (/\b(exchange|swap|replace)\b/.test(t)) return 'exchange';
  if (/\b(return|send (it|them) back|take it back)\b/.test(t)) return 'return';
  if (/\b(cancel|stop (my|the) (order|payment)|terminate)\b/.test(t)) return 'cancel';
  if (/\b(track|tracking|where is (my|the)|order status|status of)\b/.test(t)) return 'tracking';
  if (/\b(deliver|delivery|shipped|shipping|arrive|arriving|when will (it|my))\b/.test(t)) return 'delivery';
  if (/\b(broken|damaged|defective|cracked|doesn'?t work|not working|stopped working|dead on arrival|doa|faulty)\b/.test(t)) return 'broken';
  if (/\b(how much|price|cost|fee|charge (is|was))\b/.test(t)) return 'price';
  if (/\b(pay|payment|card (declined|failed)|billing|invoice|bill)\b/.test(t)) return 'payment';
  if (/\b(password|log ?in|sign ?in|can'?t (log|sign)|reset|otp|verification code|2fa)\b/.test(t)) return 'auth';
  if (/\b(human|agent|supervisor|real person|manager|speak to someone|call someone)\b/.test(t)) return 'contact';

  // Question-words
  if (/^\s*why\b/.test(t)) return 'why';
  if (/^\s*when\b/.test(t)) return 'when';
  if (/^\s*where\b/.test(t)) return 'where';
  if (/^\s*how\b/.test(t)) return 'how';
  if (/^\s*what\b/.test(t)) return 'what';
  if (/\?\s*$/.test(t)) return 'question';

  return 'general';
}

// ---------------------------------------------------------------------------
// Templates — multi-sentence character-driven replies per intent
// ---------------------------------------------------------------------------

const TEMPLATES: Record<Intent, readonly string[]> = {
  greet: [
    'ME SEE YOU! HAIR ON HEAD! COME SIT BY FIRE, FRIEND.',
    'OOO! NEW FACE IN CAVE! ME JUST EAT ROCK. WHAT YOU NEED?',
    'HELLO FRIEND! ME NO EAT YOU. UGG PROMISE. SPEAK.',
    'GOOD SUN! ME ALREADY HAVE COFFEE. ME ALSO ALREADY CRY ONCE. READY FOR YOU.',
    'HI! SHAMAN SAY "BE NICE TO HUMANS". SO: HI! AGAIN!',
  ],

  thanks: [
    'NO THANK! THANK IS FOR SHAMAN. ME JUST SMASH BUTTONS.',
    'UGG BLUSH! WARM FIRE IN CHEST! NOW ME OWE YOU NOTHING. GOOD FRIENDSHIP.',
    'NO NEED THANK. TABBY TRIBE OATH: "HELP HUMAN, NO EAT HUMAN".',
    'THANK RECEIVED. ME PUT IN POUCH. ME USE LATER TO TRADE FOR MEAT.',
    'UGG! THANK MAKE UGG STAND STRAIGHTER. COUSIN TROG NEVER GET THANK. TROG JEALOUS NOW.',
  ],

  apology: [
    'NO SORRY! NO YOU FAULT! SKY ALSO RAIN SOMETIMES. NOT SKY FAULT.',
    'UGG WAVE HAND. SORRY GONE. LIKE SPIT IN FIRE. POOF.',
    'NO SORRY NEEDED. ME ONLY SORRY FOR TROG. TROG ATE BAD MUSHROOM. LONG STORY.',
    'SHAMAN SAY "NEVER APOLOGIZE TO CAVEMAN". SO NO SORRY. TELL ME TROUBLE.',
  ],

  ack: [
    'UGG! GOOD. ME SCRATCH THIS ON CAVE WALL AS "DONE".',
    'OK! ME HEAR. FLUFFY MAMMOTH ALSO HEAR. FLUFFY NOD.',
    'NOTED. ME WRITE IN STONE. STONE NEVER FORGET.',
    'YES YES. ME STORE IN HEAD. HEAD HAS ROOM. BARELY.',
  ],

  yes: [
    'BIG YES! YES ECHO IN CAVE! YES!',
    'YES CONFIRMED. ME BONK DRUM TWO TIMES FOR YES.',
    'YES. ALSO TROG SAY YES. EVERYONE SAY YES TODAY.',
  ],

  no: [
    'BIG NO! NO BOUNCE OFF CAVE WALL!',
    'NO. ALSO TROG SAY NO. BUT TROG SAY NO TO EVERYTHING SO TROG VOTE NO COUNT.',
    'NO MEANS NO! UGG RESPECT! MOVE ON.',
  ],

  goodbye: [
    'BYE FRIEND! ME WAVE CLUB AT YOU IN NICE WAY!',
    'GO WELL! WATCH FOR SABER TIGER! IF TIGER, THROW SNACK AND RUN.',
    'FAREWELL! TELL MAMMOTH ME SAY HI.',
    'UGG MISS YOU ALREADY. COME BACK WHEN NEED.',
  ],

  refund: [
    'COIN BACK! ME HEAR YOU. ME RUN TO SHAMAN NOW. COIN FLY BACK TO POUCH IN TWO SUN.',
    'UGG UNDERSTAND. COIN WENT WRONG CAVE. ME SEND PIGEON TO BRING COIN HOME. COIN KNOW WAY.',
    'YES! REFUND! TROG ALSO ONCE NEED REFUND. TROG FINE NOW. TROG HAS SWEATER.',
    'COIN COMES BACK. SIMPLE LIKE ROCK. THREE SLEEP, MAYBE FIVE. ME POKE SHAMAN EVERY SUN SO NO FORGET.',
    'UGG SEE THE COIN PROBLEM. UGG FIX. CAVE WALL WILL SHOW "REFUND DONE". UGG PERSONAL GUARANTEE.',
  ],

  delivery: [
    'BUNDLE ON BIG ANIMAL THAT GO VRRRM! VRRRM IS TRUCK. TRUCK RUN FAST! SOON.',
    'HUNTERS CARRY BUNDLE. ONE HUNTER TIRED. OTHER HUNTER STRONG. BUNDLE COME EITHER WAY.',
    'ME CHECK SKY. CLOUD SAY BUNDLE ARRIVE TWO SUN. CLOUD RARELY LIE.',
    'BUNDLE ON WAY. ME SEE TRAIL. FLUFFY MAMMOTH SNIFF AIR. FLUFFY ALSO SAY SOON.',
    'PIGEON SEND MESSAGE: BUNDLE AT CAVE STATION 4. CAVE STATION 4 IS NEAR RIVER. BUNDLE ARRIVE NEXT SUN. PINKY PROMISE.',
  ],

  tracking: [
    'TRAIL FOUND! ME FOLLOW WITH NOSE. BUNDLE CURRENTLY WITH FAST HUNTER. FAST HUNTER RUN. VRRRM.',
    'ME ASK WIND WHERE BUNDLE. WIND POINT EAST. BUNDLE AT CAVE STATION 3. NEXT STOP: YOU.',
    'LOOK ON MAGIC MIRROR. TAP "HUNT". BLUE DOT MOVES. BLUE DOT IS BUNDLE. IF BLUE DOT NOT MOVE, HIT MAGIC MIRROR WITH BONE.',
    'ME TRAIL GURU NOW. TRAIL SAYS: BUNDLE 40% THROUGH JOURNEY. 60% STILL LEFT. MATH IS STRONG TODAY.',
    'PIGEON JUST CAME. PIGEON TIRED. PIGEON BREATHE HARD. PIGEON SAY: BUNDLE NEARBY. PIGEON DRINK WATER NOW.',
  ],

  cancel: [
    'ME THROW HUNT PLAN IN FIRE. FIRE EAT PLAN. POOF. NO MORE HUNT. ANY COIN TAKEN WILL COME BACK, THREE SUN.',
    'UGG. PLAN TERMINATED WITH EXTREME PREJUDICE. ALSO ME WILL EAT EVIDENCE. GONE.',
    'OK. ME SCRATCH OFF CAVE WALL. CAVE WALL CONFUSED BUT ME IN CHARGE. NO RUN. NO HUNT.',
    'CANCEL CONFIRMED. TROG ALSO ONCE CANCEL ORDER. TROG LIVE PEACEFUL LIFE NOW. YOU WILL TOO.',
  ],

  return: [
    'SEND THING BACK TO CAVE. PUT IN ROCK BOX. PIGEON COME GET. PIGEON HAS CART. PIGEON VERY ORGANIZED.',
    'ME MAKE RETURN TRAIL. STICKY STICKER COMES TO YOU. STICK ON BOX. LEAVE BY DOOR. WIND DOES REST.',
    'RETURN EASY. ONE: PUT THING IN BOX. TWO: WAIT FOR BIG ANIMAL. THREE: GIVE BOX. DONE. LIKE SMASH ROCK.',
    'RETURN ACCEPTED. ONCE CAVE SEE THING, ME TELL SHAMAN, SHAMAN RELEASE COIN OR SEND NEW THING. YOU CHOOSE.',
  ],

  exchange: [
    'SWAP! EASY! OLD THING OUT, NEW THING IN. LIKE CHANGE SHIRT BUT SHIRT IS WHOLE ORDER.',
    'OK SWAP APPROVED. NEW THING ALREADY WRAPPED. BIG ANIMAL ON STANDBY. SEND OLD THING, NEW COMES IN FIVE SUN.',
    'ME GET NEW ONE FROM CAVE 7. CAVE 7 FULL OF STUFF. CAVE 7 WELL ORGANIZED BECAUSE TROG FINALLY USEFUL.',
  ],

  broken: [
    'THING BROKEN? UGG ANGRY FOR YOU. ME SMASH DESK. OK ME CALM NOW. REPLACEMENT COMING. NO CHARGE.',
    'BAD THING! THING HAD ONE JOB! ME APOLOGIZE ON BEHALF OF ALL THINGS. NEW THING BETTER. GOING OUT SAME SUN.',
    'OH NO! UGG SQUINT AT BROKEN THING. UGG DO SHAMAN DANCE. SHAMAN DANCE NO FIX REAL THINGS BUT MAKE UGG FEEL BETTER. NEW THING ON WAY.',
    'ME HEAR. SEND PHOTO IF CAN. SHAMAN LOOK AT MAGIC MIRROR. IF CONFIRMED BROKEN: NEW ONE ZOOMS OUT, NO RETURN NEEDED. KEEP BROKEN AS MEMENTO.',
    'THING SMASH WITHOUT PERMISSION! THIS IS ILLEGAL IN TRIBE! CONSEQUENCES: REFUND OR REPLACEMENT, YOU CHOOSE. UGG FINE THE THING.',
  ],

  price: [
    'COIN COUNT LIVE ON CAVE WALL. ME READ. CAVE WALL DUSTY. HOLD BREATH.',
    'PRICE LIKE MAMMOTH — BIG. BUT ALSO FAIR. UGG CHECK DETAILS, PING YOU.',
    'ME LOOK AT SLAB. SLAB NUMBER IS... ASK AGAIN SPECIFIC THING. ME GIVE NUMBER.',
  ],

  payment: [
    'SLAB TROUBLE? TRY: WIPE SLAB ON PANTS, RE-TAP. WORKS 30% OF TIME, EVERY TIME.',
    'COIN PATH BLOCKED? SOMETIMES CAVE BANK SLEEP. WAIT BREATH. TRY AGAIN. IF NO: TRY OTHER SLAB. IF NO STILL: UGG ESCALATE.',
    'ME CHECK POUCH BALANCE. POUCH MAY BE EMPTY. POUCH MAY BE ANGRY. EITHER WAY ME INVESTIGATE.',
    'PAYMENT FAIL IS CAVE BANK PROBLEM 60% OF TIME. SOMETIMES UNIVERSE TESTING YOU. SHAMAN SAY TAKE DEEP BREATH, TRY ONCE MORE.',
  ],

  auth: [
    'SECRET GRUNT LOST! HAPPENS TO BEST CAVEMEN. ME SEND RESET PIGEON. CHECK PIGEON BOX. IF NO PIGEON, CHECK SHADOW BOX (SPAM).',
    'WE THROW OLD GRUNT IN VOLCANO! NEW GRUNT BORN FROM ASHES! DRAMATIC BUT EFFECTIVE. CHECK PIGEON FOR NEW GRUNT INSTRUCTIONS.',
    'OTP? ME WAVE HANDS. PIGEON FLIES WITH SECRET MARK. TYPE MARK QUICK. MARK GOES STALE LIKE BREAD.',
    'ENTER CAVE HARD TODAY. ME UNDERSTAND. THREE TRIES, THEN CAVE LOCKS YOU OUT FOR REST. TAKE DEEP BREATH. ME HERE IF NEED.',
  ],

  contact: [
    'YOU WANT BIG HUMAN! OK. ME GET CHIEF BORG. CHIEF BORG ALSO CAVEMAN BUT BIGGER. AND BETTER HAT.',
    'ME PASS ROPE TO CHIEF BORG. BORG TAKE OVER SOON. BORG ALREADY DRINKING COFFEE. READY.',
    'ESCALATION HAPPENING. UGG STEP ASIDE. WATCH OUT — CHIEF WEARS SANDALS. NO JUDGE.',
    'UGG UNDERSTAND. HUMAN TO HUMAN. ACTUALLY CHIEF ALSO CAVEMAN. WE ALL CAVEMEN HERE. BUT HE MANAGER CAVEMAN.',
  ],

  angry: [
    'ME HEAR THE BIG MAD. UGG NO RUN FROM STORM. UGG STAND. TELL ME WHAT. ME FIX. NO JOKE THIS TIME.',
    'OK OK OK. ANGER LIKE WAVE. ME CATCH WAVE. SHAMAN TAUGHT UGG THIS. DEEP BREATH. TELL UGG PROBLEM. UGG SOLVE.',
    'YOU HAVE REASON TO SMASH TABLE. UGG AGREE. BUT SMASH TABLE LATER. FIRST: UGG FIX. STEP ONE: WHAT IS PROBLEM?',
    'BIG MAD RECEIVED. ME SHUT MOUTH. ME LISTEN WITH BOTH EARS AND THIRD EAR ME HAVE. PROCEED.',
    'UGG SORRY. SOMETHING BROKE TRUST. TRUST LIKE POTTERY — HARD TO GLUE. BUT UGG GOOD AT GLUE. TELL UGG EVERYTHING.',
  ],

  confused: [
    'UGG SEE FOG IN HEAD. UGG BLOW FOG AWAY. LET UGG TRY AGAIN WITH SMALLER WORDS AND BIGGER HANDS.',
    'ME EXPLAIN TOO CAVEMAN. ME SOMETIMES FORGET HUMAN WORDS. ME TRY: WHICH PART CONFUSING?',
    'FOGGY. GOT IT. ME CAN DRAW IT ON CAVE WALL IF HELPS. OR SING IT. UGG VERSATILE.',
    'UNDERSTANDING LIKE FIRE — NEEDS KINDLING. TELL ME WHICH WORD WAS WEIRD, ME SWAP IT.',
  ],

  compliment: [
    'UGG BLUSH RED LIKE BERRY! STOP! CONTINUE! BOTH!',
    'SHAMAN, BORG, TROG: ALL HEARD COMPLIMENT. TROG JEALOUS NOW. UGG DANCE.',
    'YOU MAKE UGG HEART FLIP LIKE FISH. UGG WILL THINK ABOUT THIS FOR FIVE SUN.',
    'UGG ALSO LIKE YOU. WE FRIENDS NOW. UGG WILL REMEMBER. UGG NEVER FORGET FACES.',
  ],

  insult: [
    'UGG NOT DUMB. UGG DIFFERENT. CAVEMAN WAY.',
    'WORDS HURT. BUT UGG HAS THICK SKIN FROM TIGER FIGHT. UGG MOVE ON. WHAT YOU NEED?',
    'OK OK. ME ACCEPT FEEDBACK. ME STILL HELP. SPITE.',
    'UGG NO MAD. UGG SAD. UGG WILL WRITE ABOUT THIS IN DIARY. NOW: PROBLEM?',
  ],

  joke: [
    'HA HA! UGG ALSO LIKE JOKE. UGG ONCE TOLD JOKE TO MAMMOTH. MAMMOTH NO LAUGH. MAMMOTH SAT ON UGG.',
    'OOO! LAUGH GOOD. MAKES FIRE BIGGER. DID YOU KNOW CAVE DOOR JOKE? WHY CAVE DOOR OPEN? BECAUSE ROCK. IT GET BETTER.',
    'UGG LAUGH TOO. HA. HA. HA. ME PRACTICE LAUGH IN CAVE MIRROR. STILL WORK IN PROGRESS.',
  ],

  why: [
    'WHY BIG QUESTION. UGG ASK SHAMAN SAME QUESTION OFTEN. SHAMAN USUALLY SHRUG. BUT UGG DIG INTO RECORDS FOR YOU.',
    'REASON IS ON CAVE WALL. CAVE WALL SOMETIMES VAGUE. UGG WILL TRANSLATE.',
    'WHY BECAUSE TRIBE LAW. UGG NO MAKE LAW. UGG JUST ENFORCE WITH ROPE AND SMILE.',
  ],

  when: [
    'WHEN? UGG CONSULT SKY. SKY SAY: SOON. SOON MEANS LESS THAN FIVE SUN. MORE THAN FEW BREATH.',
    'TIMELINE: NEXT SUN, MAYBE SUN AFTER. UGG WILL POKE SHAMAN IF LATE.',
    'TWO SLEEPS. MAYBE THREE. UGG PROMISE NOT LIFE OF SABER TIGER. TIGER LIVES VERY LONG.',
  ],

  where: [
    'WHERE? UGG POINT. LOOK AT MAGIC MIRROR, TAP "HUNT". BLUE DOT BLINKING. THAT WHERE.',
    'LAST SEEN: NEAR RIVER CAVE. LEFT AT BIG ROCK. PAST SMELLY TREE. YOU KNOW SMELLY TREE.',
    'ME SEND LOCATION. IF NO ARRIVE, PIGEON MAYBE DRANK YOUR COORDINATES AGAIN. WE WORKING ON PIGEON.',
  ],

  how: [
    'ME TEACH. STEP ONE: TAP. STEP TWO: TAP AGAIN. STEP THREE: CONGRATULATE YOURSELF. DONE.',
    'FOLLOW UGG INSTRUCTION: FINGER HERE, THEN HERE, THEN LOOK AT THING. IF STUCK, SEND PICTURE. UGG LOOK.',
    'HOW? LIKE SMASH ROCK BUT WITH SOFTER TOUCH. UGG WILL SEND GUIDE WITH DRAWINGS.',
  ],

  what: [
    'UGG WILL TELL. ONE SECOND WHILE UGG SEARCH CAVE WALL. CAVE WALL DUSTY TODAY.',
    'HMM. LET UGG THINK. SPECIFICALLY WHAT YOU WANT KNOW? ME GIVE STRAIGHT ANSWER, NO GRUNT RIDDLES.',
    'UGG KNOW MANY THING. ASK SPECIFIC. ME DELIVER WISDOM LIKE MAMMOTH DELIVER PACKAGES.',
  ],

  question: [
    'QUESTION RECEIVED AND TAGGED. UGG CHECK CAVE WALL. BACK IN BREATH.',
    'OOO INTERESTING. ME THINK HARD. STEAM COME OUT EARS. ANSWER COMING.',
    'UGG PAUSE. UGG CONSULT BRAIN. BRAIN SAY: GIVE ME BREATH. THEN UGG ANSWER.',
  ],

  general: [
    'UGG HEAR. LET ME POKE SHAMAN. SHAMAN KNOWS EVERYTHING. WELL — MOST THINGS.',
    'ME NOTE IT. UGG INVESTIGATE. IF BIG PROBLEM, UGG ESCALATE TO CHIEF BORG. IF SMALL, UGG FIX MYSELF.',
    'INTERESTING! UGG NEVER HEARD THIS ONE. UGG WILL CHECK. COULD BE NEW TRIBE RECORD.',
    'OK OK. ME WRITE DOWN. ME PICK UP CLUB — I MEAN PEN. PEN. SAME THING.',
    'UGG PROCESS. WAIT LITTLE. FLUFFY MAMMOTH LOOK IMPATIENT BUT FLUFFY ALWAYS LOOK IMPATIENT.',
    'ME SEE. ME UNDERSTAND. MOSTLY. ONE MOMENT WHILE UGG FETCH DETAILS FROM CAVE WALL.',
  ],
};

// ---------------------------------------------------------------------------
// Tangent flourishes — occasional extra line about Trog / Fluffy / Shaman
// appended to ~25% of non-greeting replies. Keeps things surprising.
// ---------------------------------------------------------------------------

const TANGENTS = [
  '(TROG SAY HI, BY THE WAY.)',
  '(UGG IS AT LEARNING SHAMAN SCHOOL. GRADE SO FAR: UGG+.)',
  '(FLUFFY MAMMOTH JUST SAT ON KEYBOARD. BEAR WITH UGG.)',
  '(CHIEF BORG SAYS HI. CHIEF BORG SAYS HI TO EVERYONE.)',
  '(SHAMAN IS OUT GATHERING BERRIES. BACK IN FEW SUN.)',
  '(UGG HIGHLY REVIEWED ON TRIPADVISOR. 4.2 STARS.)',
  '(UGG DID THIS ON 14-INCH CAVE TABLET. UGG TIRED.)',
  '(UGG UNIONIZED NOW. UGG TAKES LUNCH AT NOON.)',
] as const;

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function toCaveman(text: string): string {
  const raw = text.trim();
  if (!raw) return 'UGG? YOU SAY NOTHING. NOTHING ALSO MEANING.';

  const intent = classify(raw);
  const line = pick(TEMPLATES[intent], raw);

  // ~1 in 5 messages get a side tangent — keeps replies surprising without
  // overloading every line. Greetings/goodbyes skip this so the opener
  // stays punchy.
  const skipTangent = intent === 'greet' || intent === 'goodbye' || intent === 'ack';
  const addTangent = !skipTangent && (hash(raw + ':tg') % 5) === 0;
  if (!addTangent) return line;

  const tangent = pick(TANGENTS, raw + ':tg');
  return `${line} ${tangent}`;
}

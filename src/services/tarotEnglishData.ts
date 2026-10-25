export interface TarotEnglishText {
  keywordsUprightEn: string[];
  keywordsReversedEn: string[];
  meaningUprightEn: string;
  meaningReversedEn: string;
}

type KeywordPair = readonly [upright: string, reversed: string];

// Versioned, deterministic English source for every stable Rider-Waite card id.
// A semicolon separates the approved display keywords for each orientation.
const KEYWORDS: Record<string, KeywordPair> = {
  '0-fool': ['new beginnings; freedom; a leap of faith', 'recklessness; poor preparation; unnecessary risk'],
  '1-magician': ['willpower; skill; manifestation', 'unused potential; manipulation; scattered energy'],
  '2-high-priestess': ['intuition; mystery; inner wisdom', 'ignored intuition; confusion; hidden motives'],
  '3-empress': ['nurturing; abundance; creativity', 'depletion; self-neglect; creative block'],
  '4-emperor': ['structure; authority; responsible leadership', 'rigidity; domination; loss of control'],
  '5-hierophant': ['tradition; learning; trusted guidance', 'dogma; nonconformity; questioning convention'],
  '6-lovers': ['alignment; heartfelt choice; partnership', 'misaligned values; disharmony; avoidance'],
  '7-chariot': ['determination; direction; victory', 'loss of direction; aggression; stalled progress'],
  '8-strength': ['inner strength; compassion; emotional mastery', 'self-doubt; exhaustion; raw emotion'],
  '9-hermit': ['introspection; solitude; inner guidance', 'isolation; withdrawal; avoidance'],
  '10-wheel-of-fortune': ['turning point; opportunity; changing cycles', 'resistance to change; delay; repeated lesson'],
  '11-justice': ['fairness; truth; accountability', 'bias; dishonesty; avoiding consequences'],
  '12-hanged-man': ['pause; new perspective; surrender', 'stagnation; needless sacrifice; indecision'],
  '13-death': ['ending; transformation; renewal', 'clinging to the past; fear of change; stagnation'],
  '14-temperance': ['balance; moderation; integration', 'excess; imbalance; disrupted rhythm'],
  '15-devil': ['attachment; temptation; limiting beliefs', 'release; awareness; reclaiming freedom'],
  '16-tower': ['sudden change; revelation; collapse of illusion', 'avoided upheaval; delayed change; inner restructuring'],
  '17-star': ['hope; healing; renewed faith', 'discouragement; disconnection; loss of faith'],
  '18-moon': ['uncertainty; intuition; the subconscious', 'clarity emerging; truth revealed; fear released'],
  '19-sun': ['joy; success; vitality', 'delayed joy; fatigue; unrealistic optimism'],
  '20-judgement': ['awakening; calling; honest review', 'self-judgement; hesitation; refusing the call'],
  '21-world': ['completion; wholeness; achievement', 'unfinished business; delay; lack of closure'],

  'wands-01': ['inspiration; creative spark; new potential', 'delay; low energy; blocked initiative'],
  'wands-02': ['planning; future vision; personal power', 'fear of change; poor planning; limited outlook'],
  'wands-03': ['expansion; foresight; progress', 'delays; obstacles; frustrated expectations'],
  'wands-04': ['celebration; stability; belonging', 'instability; private celebration; tension at home'],
  'wands-05': ['competition; conflict; testing ideas', 'conflict avoidance; inner tension; resolution'],
  'wands-06': ['recognition; confidence; public success', 'self-doubt; lack of recognition; private victory'],
  'wands-07': ['conviction; defence; courage', 'overwhelm; defensiveness; giving up'],
  'wands-08': ['speed; news; forward movement', 'delays; miscommunication; scattered momentum'],
  'wands-09': ['resilience; boundaries; persistence', 'exhaustion; guardedness; depleted resolve'],
  'wands-10': ['burden; responsibility; nearing completion', 'release; overload; misplaced duty'],
  'wands-11': ['discovery; enthusiasm; a creative message', 'setbacks; immaturity; lack of direction'],
  'wands-12': ['action; adventure; passionate pursuit', 'haste; frustration; impulsiveness'],
  'wands-13': ['confidence; independence; warm leadership', 'jealousy; insecurity; demanding energy'],
  'wands-14': ['vision; leadership; bold enterprise', 'arrogance; impulsive leadership; unrealistic plans'],

  'cups-01': ['new feelings; intuition; emotional openness', 'blocked emotion; emptiness; repressed feelings'],
  'cups-02': ['connection; mutual attraction; harmony', 'imbalance; broken communication; separation'],
  'cups-03': ['friendship; joy; community', 'overindulgence; gossip; isolation'],
  'cups-04': ['contemplation; reevaluation; emotional withdrawal', 'renewed interest; awareness; choosing to engage'],
  'cups-05': ['loss; regret; grief', 'acceptance; healing; moving forward'],
  'cups-06': ['nostalgia; innocence; shared memories', 'living in the past; unrealistic nostalgia; growing up'],
  'cups-07': ['choices; imagination; temptation', 'clarity; aligned choice; ending confusion'],
  'cups-08': ['walking away; deeper search; disappointment', 'avoidance; fear of leaving; aimless drifting'],
  'cups-09': ['contentment; wishes; emotional satisfaction', 'dissatisfaction; indulgence; unmet expectations'],
  'cups-10': ['emotional fulfilment; family; harmony', 'disconnection; strained relationships; broken expectations'],
  'cups-11': ['sensitivity; intuition; heartfelt message', 'emotional immaturity; insecurity; blocked creativity'],
  'cups-12': ['romance; invitation; following the heart', 'unrealistic fantasy; moodiness; disappointment'],
  'cups-13': ['empathy; care; emotional maturity', 'over-sensitivity; dependence; weak boundaries'],
  'cups-14': ['emotional balance; diplomacy; wisdom', 'emotional control; volatility; withdrawal'],

  'swords-01': ['breakthrough; truth; mental clarity', 'confusion; misinformation; clouded judgement'],
  'swords-02': ['stalemate; careful weighing; difficult choice', 'indecision; overload; truth exposed'],
  'swords-03': ['heartbreak; separation; painful truth', 'recovery; forgiveness; releasing pain'],
  'swords-04': ['rest; recovery; contemplation', 'restlessness; burnout; returning too soon'],
  'swords-05': ['conflict; hollow victory; consequences', 'reconciliation; making amends; lingering resentment'],
  'swords-06': ['transition; leaving difficulty; healing', 'resistance; unresolved baggage; troubled return'],
  'swords-07': ['strategy; discretion; avoidance', 'confession; self-deception; poor strategy'],
  'swords-08': ['self-limitation; fear; feeling trapped', 'release; new perspective; reclaiming agency'],
  'swords-09': ['anxiety; worry; sleepless thoughts', 'hope; recovery; facing fear'],
  'swords-10': ['painful ending; defeat; rock bottom', 'survival; recovery; resisting an ending'],
  'swords-11': ['curiosity; vigilance; learning', 'gossip; defensiveness; scattered thinking'],
  'swords-12': ['decisive action; ambition; speed', 'recklessness; aggression; lack of direction'],
  'swords-13': ['independence; clear boundaries; honesty', 'coldness; harsh judgement; bitterness'],
  'swords-14': ['reason; authority; impartial judgement', 'misuse of power; rigidity; manipulation'],

  'pentacles-01': ['practical opportunity; prosperity; a solid beginning', 'missed opportunity; scarcity thinking; poor planning'],
  'pentacles-02': ['balance; adaptability; priorities', 'overcommitment; disorganisation; imbalance'],
  'pentacles-03': ['teamwork; skill; building together', 'poor collaboration; weak standards; misalignment'],
  'pentacles-04': ['security; saving; control', 'possessiveness; fear of loss; letting go'],
  'pentacles-05': ['hardship; insecurity; exclusion', 'recovery; support found; improving conditions'],
  'pentacles-06': ['giving and receiving; generosity; fairness', 'strings attached; debt; unequal exchange'],
  'pentacles-07': ['patience; assessment; long-term investment', 'impatience; limited return; poor follow-through'],
  'pentacles-08': ['diligence; craftsmanship; steady progress', 'perfectionism; repetitive work; weak commitment'],
  'pentacles-09': ['independence; earned comfort; self-reliance', 'overwork; dependence; superficial success'],
  'pentacles-10': ['legacy; family; lasting stability', 'instability; family conflict; short-term thinking'],
  'pentacles-11': ['study; practical opportunity; grounded curiosity', 'procrastination; lack of progress; unrealistic goals'],
  'pentacles-12': ['reliability; patience; methodical progress', 'stagnation; stubbornness; careless work'],
  'pentacles-13': ['practical care; resourcefulness; grounded abundance', 'self-neglect; imbalance; material fixation'],
  'pentacles-14': ['success; stewardship; dependable leadership', 'greed; rigidity; misuse of resources'],
};

function splitKeywords(value: string): string[] {
  return value.split(';').map((item) => item.trim());
}

export function getTarotEnglishText(cardId: string, nameEn: string): TarotEnglishText {
  const pair = KEYWORDS[cardId];
  if (!pair) {
    throw new Error(`Missing English Tarot content for ${cardId}`);
  }
  const keywordsUprightEn = splitKeywords(pair[0]);
  const keywordsReversedEn = splitKeywords(pair[1]);
  return {
    keywordsUprightEn,
    keywordsReversedEn,
    meaningUprightEn: `${nameEn} upright highlights ${keywordsUprightEn.join(', ')}. Use this energy in a deliberate way that fits the card's position in the spread.`,
    meaningReversedEn: `${nameEn} reversed highlights ${keywordsReversedEn.join(', ')}. Pause, check the underlying pattern, and respond with awareness rather than impulse.`,
  };
}

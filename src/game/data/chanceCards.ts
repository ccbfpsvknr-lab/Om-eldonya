export type ChanceCardType = 'money' | 'move' | 'police' | 'bonus' | 'govt';

export interface ChanceCardDef {
  id: string;
  type: ChanceCardType;
  title: string;
  text: string;
  amount?: number;
  spaces?: number;
  toTile?: number;
  freePass?: boolean;
  rollAgain?: boolean;
  /** End the current turn immediately when drawn. */
  /** Skip the player's NEXT turn (current turn continues normally). */
  skipNextTurn?: boolean;
}

export const CHANCE_CARDS: ChanceCardDef[] = [
  // ---- Money ----
  { id: 'M1', type: 'money', title: '💵 بقشيش',           text: 'البواب بعتلك بقشيش!',                amount: 500  },
  { id: 'M2', type: 'money', title: '⚡ فاتورة كهرباء',    text: 'الكهرباء جابتلك فاتورة مفاجأة',       amount: -300 },
  { id: 'M3', type: 'money', title: '🎰 لوتو',             text: 'ربحت في اللوتو يا نجم!',              amount: 1000 },
  { id: 'M4', type: 'money', title: '🚦 غرامة مرور',       text: 'الترافيك كتبلك مخالفة يا طور',        amount: -200 },
  { id: 'M5', type: 'money', title: '💼 مكافأة سنوية',     text: 'المدير راضي عنك... نادراً',           amount: 800  },
  { id: 'M6', type: 'money', title: '🔧 إصلاح عربية',      text: 'العربية اتكسرت. دفع!',                amount: -500 },
  { id: 'M7', type: 'money', title: '🎁 هدية',             text: 'أهلك بعتولك فلوس!',                  amount: 600  },
  { id: 'M8', type: 'money', title: '🏥 فاتورة دكتور',     text: 'الدكتور مش بالرخيص',                 amount: -400 },
  // ---- Movement ----
  { id: 'V1', type: 'move',  title: '🚂 روح رمسيس',       text: 'الرحلة تاخدك لميدان رمسيس',          toTile: 0    },
  { id: 'V2', type: 'move',  title: '⬅️ تراجع شوية',      text: 'الطريق مسدود، ارجع ٣ خطوات',         spaces: -3   },
  { id: 'V3', type: 'move',  title: '➡️ قدما!',            text: 'في الأمامك، تقدم ٤ خطوات',           spaces: 4    },
  // ---- Police ----
  { id: 'P1', type: 'police', title: '🚔 قبض عليك!',       text: 'الباشا شافك وما عجبوش. روح السجن!' },
  // ---- Bonus ----
  { id: 'B1', type: 'bonus', title: '🛡️ حظك بره',          text: 'المرة الجاية متدفعش إيجار',           freePass: true  },
  { id: 'B2', type: 'bonus', title: '🎲 دور تاني',          text: 'يومك بختك، ارمي الزهر تاني!',        rollAgain: true },
  // ---- Government Office ----
  { id: 'G1', type: 'govt',  title: '🏛️ الديوان الحكومي', text: 'الموظف بيفطر وجاي\nدور لوحدك في الكرسي.' },
  { id: 'G2', type: 'govt',  title: '💻 السيستم واقع',    text: 'السيستم واقع ومحدش شايل هم.\nدورك الجاي هيتأجل!', skipNextTurn: true },
  { id: 'G3', type: 'govt',  title: '✅ خدمة مثالية',      text: 'خلصت من أول مرة! 😳\nده مش طبيعي.',  amount: 300 },
];

/**
 * Fast mode only includes money, movement, and roll-again cards.
 * No police/arrest, no govt office, no free-pass.
 */
const FAST_MODE_IDS = new Set(['M1','M2','M3','M4','M5','M6','M7','M8','V1','V2','V3','B2']);

export function buildShuffledDeck(fastMode = false): string[] {
  const source = fastMode
    ? CHANCE_CARDS.filter((c) => FAST_MODE_IDS.has(c.id))
    : CHANCE_CARDS;
  const ids = source.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function getCard(id: string): ChanceCardDef {
  const card = CHANCE_CARDS.find((c) => c.id === id);
  if (!card) throw new Error(`Unknown chance card: ${id}`);
  return card;
}

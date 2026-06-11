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
  /** Skip the player's NEXT turn (current turn continues normally). */
  skipNextTurn?: boolean;
}

export const CHANCE_CARDS: ChanceCardDef[] = [
  // ---- Money ----
  { id: 'M1', type: 'money', title: '💵 بقشيش',           text: 'البواب اداك بقشيش',                         amount: 500  },
  { id: 'M2', type: 'money', title: '⚡ فاتورة كهرباء',    text: 'الكهرباء فاجأتك بفاتورة 😤',                  amount: -300 },
  { id: 'M3', type: 'money', title: '🤝 راهنت',            text: 'راهنت صاحبك وكسبت!',                       amount: 1000 },
  { id: 'M4', type: 'money', title: '🚦 غرامة مرور',       text: 'المرور كتبلك مخالفة يا خرتيت',          amount: -200 },
  { id: 'M5', type: 'money', title: '💼 مكافأة سنوية',     text: 'المدير راضي عنك… نادرا يعني',                   amount: 800  },
  { id: 'M6', type: 'money', title: '🔧 إصلاح عربية',      text: 'العربية فتحت بوقها, ايه الجديد؟ 🤦🏻\u200d♂️',             amount: -500 },
  { id: 'M7', type: 'money', title: '🎁 هدية',             text: 'أهلك بعتولك فلوس!',                          amount: 600  },
  { id: 'M8', type: 'money', title: '🏥 فاتورة دكتور',     text: 'حقنة… بس الحمدلله مش عضل',                   amount: -400 },
  // ---- Movement ----
  { id: 'V1', type: 'move',  title: '🚂 روح رمسيس',       text: 'يلا على رمسيس',                        toTile: 0    },
  { id: 'V2', type: 'move',  title: '⬅️ ارجع شوية',      text: 'الطريق مقفول، ارجع شوية ⬅️',                  spaces: -3   },
  { id: 'V3', type: 'move',  title: '➡️ اجري!',            text: 'الطريق فاضي، دوس بنزين!',                spaces: 4    },
  // ---- Police ----
  { id: 'P1', type: 'police', title: '🚔 الباشا موده مش رايق',      text: 'شكلك مش عاجبه، روح الحجز!' },
  // ---- Bonus ----
  { id: 'B1', type: 'bonus', title: '🛡️ صاحبك جدع',         text: 'المرة الجاية الإيجار مش عليك 😏',              freePass: true  },
  { id: 'B2', type: 'bonus', title: '🎲 دور تاني',         text: 'يا بختك، ارمي الزهر تاني',                  rollAgain: true },
  // ---- Government Office ----
  { id: 'G1', type: 'govt',  title: '🏛️ الديوان الحكومي', text: 'الموظف بيفطر وجاي\nدور لوحدك في الكرسي 😂' },
  { id: 'G2', type: 'govt',  title: '💻 السيستم واقع',    text: 'السيستم واقع ومحدش شايل هم.\nدورك الجاي هيتأجل!', skipNextTurn: true },
  { id: 'G3', type: 'govt',  title: '✅ خدمة مثالية',     text: 'خلصت من أول مرة! 😳\nده مش طبيعي.',            amount: 300 },
];

const FAST_MODE_IDS = new Set(['M1','M2','M3','M4','M5','M6','M7','M8','V1','V2','V3','B2']);

export function buildShuffledDeck(fastMode = false): string[] {
  const source = fastMode ? CHANCE_CARDS.filter((c) => FAST_MODE_IDS.has(c.id)) : CHANCE_CARDS;
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

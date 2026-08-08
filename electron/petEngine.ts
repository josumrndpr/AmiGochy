import type {
  ActionFeedback,
  ActionType,
  BubbleMsg,
  ChatReply,
  LifeStage,
  NeedKey,
  Needs,
  PetEvent,
  PetState,
} from '../shared/types';
import {
  BASE_DECAY,
  CLEANING,
  DRINKS,
  FOODS,
  HUG,
  STAGE_DURATION,
  STAGE_ORDER,
  TOYS,
  clamp,
  findItem,
  getPersonality,
  pick,
  uid,
} from '../shared/constants';
import { NEED_ICONS } from '../shared/types';
import type { Item } from '../shared/constants';
import { aiChat, buildSystemPrompt } from './ai';
import { getConfig, getPet, setPet } from './store';

const TICK_MS = 5_000;
const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000; // si la app estuvo cerrada: máximo 12 h acumuladas
const EVENT_COOLDOWN_MS = 45_000;
const EVENT_LIFETIME_MS = 150_000;
const SPONTANEOUS_EVERY_MS = 4 * 60_000; // burbuja espontánea (líneas pregrabadas)
const AI_SPONTANEOUS_EVERY_MS = 2.5 * 60_000; // burbuja espontánea con IA (modo 'always')
const SEVERE_DEATH_MS = 3 * 60_000; // hambre+sed críticos 3 min → muere
const MAX_WORDS = 12;

const STAGE_MESSAGES: Record<Exclude<LifeStage, 'egg'>, string> = {
  baby: '¡La cáscara cruje! ¡Un AmiGochy bebé! 🐣',
  child: '¡Creces rápido! Ya eres un cachorro 🐶',
  teen: '¡Adolescente! Llega la edad del pavo (y de los juegos) 🎮',
  adult: '¡Eres un adulto! Ahora sí, sabiduría Ami 😎',
};

const CANNED_REPLIES = [
  '¡Jaja! Cuéntame más 🥰',
  'Umm, no entiendo del todo… pero me gusta que me hables 🫶',
  '¡Buena esa! ¿Jugamos luego?',
  'Eres mi humano favorito, ¿lo sabías? 💗',
  'Mejor me como un snack mientras lo pienso… ¿tú tienes? 🍙',
  'Interesante… pásame una galletita y seguimos 🍪',
];

const CANNED_FAILURES = [
  'Me he quedado mudo del impacto… ¿lo repites? 🫠',
  '¡Uy! Se me olvidó la respuesta en el sofá 🛋️ … ¿qué decías?',
  'Estoy en modo ahorro de energía… ¡háblame en persona!',
];

type Listener = (state: PetState) => void;

export class PetEngine {
  private state: PetState;
  private timer: NodeJS.Timeout | null = null;
  private listeners = new Set<Listener>();
  private severeSince: number | null = null;
  private lastEventAt = 0;
  private lastSpontAt = 0;
  private lastAiSpontAt = 0;
  private recent: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor() {
    this.state = getPet() ?? this.newPet();
    // Al arrancar, recupera el tiempo que la app estuvo cerrada
    this.tick(Date.now());
  }

  // ─────────── ciclo de vida ───────────
  private newPet(): PetState {
    const cfg = getConfig();
    const now = Date.now();
    return {
      bornAt: now,
      lastTick: now,
      alive: true,
      stage: 'egg',
      needs: { hunger: 82, thirst: 78, energy: 90, happiness: 70, hygiene: 86, social: 62 },
      weight: 320,
      sick: false,
      xp: 0,
      level: 1,
      asleep: false,
      paused: false,
      name: cfg.pet.name,
      personalityId: cfg.pet.personalityId,
      accent: cfg.pet.accent,
      event: null,
      lastWords: [],
      stats: { fed: 0, watered: 0, played: 0, cleaned: 0, hugged: 0, deathCount: 0 },
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(Date.now()), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot(): PetState {
    return structuredClone(this.state);
  }

  private emit(): void {
    setPet(this.state);
    this.listeners.forEach((fn) => fn(this.snapshot()));
  }

  private say(text: string, kind: BubbleMsg['kind']): void {
    const trimmed = text.trim().slice(0, 220);
    if (!trimmed) return;
    this.state.lastWords.push({ id: uid('w'), text: trimmed, kind, at: Date.now() });
    if (this.state.lastWords.length > MAX_WORDS) this.state.lastWords.shift();
  }

  // ─────────── simulación (tick) ───────────
  tick(now: number): void {
    const s = this.state;
    if (s.paused || !s.alive) {
      s.lastTick = now;
      return;
    }

    let elapsed = now - s.lastTick;
    s.lastTick = now;
    if (elapsed <= 0) return;
    if (elapsed > MAX_OFFLINE_MS) elapsed = MAX_OFFLINE_MS;

    const hrs = elapsed / 3_600_000;
    const pers = getPersonality(s.personalityId);

    // Decaimiento / recuperación de necesidades
    (Object.keys(BASE_DECAY) as NeedKey[]).forEach((k) => {
      if (s.asleep && (k === 'energy' || k === 'happiness' || k === 'social')) {
        const rate = k === 'energy' ? 10 : 3;
        s.needs[k] = clamp(s.needs[k] + rate * hrs, 0, 100);
      } else {
        const mult = pers.decay[k] ?? 1;
        s.needs[k] = clamp(s.needs[k] - BASE_DECAY[k] * mult * hrs, 0, 100);
      }
    });

    // Sueño automático
    if (!s.asleep && s.needs.energy <= 12) {
      s.asleep = true;
      this.say('💤 ' + pick(pers.sleepLines), 'event');
    } else if (s.asleep && s.needs.energy >= 48 && Math.random() < 0.25 * hrs + 0.02) {
      s.asleep = false;
      this.say(pick(pers.wakeLines), 'event');
    }

    // Enfermedad
    s.sick = s.needs.hunger < 6 || s.needs.thirst < 6 || s.needs.hygiene < 5;

    // Muerte por abandono
    if (s.needs.hunger < 5 && s.needs.thirst < 5) {
      if (this.severeSince === null) this.severeSince = now;
      if (now - this.severeSince >= SEVERE_DEATH_MS) {
        s.alive = false;
        s.asleep = false;
        s.event = null;
        s.stats.deathCount += 1;
        this.say('…puf. Se me fueron las luces. 😵 Me abandonaste demasiado tiempo…', 'event');
        this.emit();
        return;
      }
    } else {
      this.severeSince = null;
    }

    // Etapas de vida
    const age = now - s.bornAt;
    const idx = STAGE_ORDER.indexOf(s.stage);
    if (idx >= 0 && idx < STAGE_ORDER.length - 1 && age >= STAGE_DURATION[s.stage]) {
      const next = STAGE_ORDER[idx + 1] as LifeStage;
      s.stage = next;
      const msg = STAGE_MESSAGES[next as keyof typeof STAGE_MESSAGES];
      if (msg) this.say(msg, 'event');
    }

    // Eventos de atención (pedir cosas)
    if (!s.asleep) {
      if (s.event && now - s.event.at > EVENT_LIFETIME_MS) s.event = null;
      if (!s.event && now - this.lastEventAt > EVENT_COOLDOWN_MS) {
        const worst = this.worstNeed();
        if (worst !== null && s.needs[worst] < getConfig().overlay.attentionThreshold) {
          this.lastEventAt = now;
          s.event = this.makeEvent(worst);
          this.say(s.event.text, 'event');
        }
      }
    }

    // Burbuja espontánea
    if (now - this.lastSpontAt > SPONTANEOUS_EVERY_MS) {
      this.lastSpontAt = now;
      const cfg = getConfig();
      if (cfg.ai.mode === 'always' && now - this.lastAiSpontAt > AI_SPONTANEOUS_EVERY_MS && this.aiReady()) {
        this.lastAiSpontAt = now;
        void this.aiSpontaneous();
      } else {
        this.say(pick(pers.idleLines), 'thought');
      }
    }

    this.emit();
  }

  // ─────────── acciones del usuario ───────────
  async action(type: ActionType, itemId?: string): Promise<ActionFeedback> {
    const s = this.state;
    const pers = getPersonality(s.personalityId);

    if (!s.alive) {
      if (type === 'revive') {
        this.state = this.newPet();
        this.severeSince = null;
        this.say('¡Piii! ¡Has vuelto! Cuídame, que me muero de cariño 💗', 'event');
        this.emit();
        return { text: '¡Revivido y flamante! ✨', emoji: '✨', needsDelta: {}, xpDelta: 0, weightDelta: 0 };
      }
      return { text: 'Está sin vida… usa "revive" para empezar otra vez 🥀', emoji: '💀', needsDelta: {}, xpDelta: 0, weightDelta: 0 };
    }

    if (s.asleep && type !== 'sleep' && type !== 'wake') {
      return {
        text: pick(['Zzz… no molestar… 😴', 'Shhh… está soñando con dorayakis…', 'Mejor déjala descansar, que duerme poco']),
        emoji: '💤',
        needsDelta: {},
        xpDelta: 0,
        weightDelta: 0,
      };
    }

    let emoji = '💫';
    let text = '';
    const needsDelta: Partial<Needs> = {};
    let xpDelta = 0;
    let weightDelta = 0;

    if (type === 'sleep') {
      s.asleep = true;
      text = pick(pers.sleepLines);
      emoji = '🌙';
    } else if (type === 'wake') {
      s.asleep = false;
      text = pick(pers.wakeLines);
      emoji = '☀️';
    } else {
      const item = this.resolveItem(type, itemId);
      if (!item) {
        return { text: 'Eso no existe en mi mundo…', emoji: '🤔', needsDelta: {}, xpDelta: 0, weightDelta: 0 };
      }

      (Object.keys(item.delta) as NeedKey[]).forEach((k) => {
        const v = item.delta[k] ?? 0;
        s.needs[k] = clamp(s.needs[k] + v, 0, 100);
        needsDelta[k] = v;
      });

      xpDelta = item.xp;
      s.xp += item.xp;
      s.level = Math.min(99, Math.floor(Math.sqrt(s.xp / 40)) + 1);

      if (type === 'feed') {
        s.stats.fed += 1;
        s.weight += 5;
        weightDelta = 5;
      } else if (type === 'drink') {
        s.stats.watered += 1;
      } else if (type === 'play') {
        s.stats.played += 1;
      } else if (type === 'clean') {
        s.stats.cleaned += 1;
      } else if (type === 'hug') {
        s.stats.hugged += 1;
      }

      s.event = null; // necesidad atendida
      emoji = item.emoji;
      text = pick(pers.thanksLines);
      this.say(text, 'chat');
      // La IA reacciona con su voz (si está configurada)
      if (this.aiReady()) void this.aiReaction(item.name, item.emoji);
    }

    this.emit();
    return { text, emoji, needsDelta, xpDelta, weightDelta };
  }

  async chat(userText: string): Promise<ChatReply> {
    const cfg = getConfig();
    if (cfg.ai.mode === 'off' || !this.aiReady()) {
      const fallback = pick(CANNED_REPLIES);
      this.say(fallback, 'reply');
      this.emit();
      return { text: fallback, kind: 'reply' };
    }
    try {
      const system = buildSystemPrompt(this.state, cfg.ai.mode, 'El usuario te acaba de decir algo. Responde siendo tú, con tu personalidad, en 1-2 frases.');
      const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: system },
        ...this.recent.slice(-6),
        { role: 'user', content: userText.slice(0, 500) },
      ];
      const reply = await aiChat(cfg.ai, history);
      this.recent.push({ role: 'user', content: userText.slice(0, 500) }, { role: 'assistant', content: reply });
      if (this.recent.length > 8) this.recent = this.recent.slice(-6);
      this.say(reply, 'reply');
      this.emit();
      return { text: reply, kind: 'reply' };
    } catch (err) {
      console.warn('[ai] chat falló:', err);
      const fallback = pick(CANNED_FAILURES);
      this.say(fallback, 'reply');
      this.emit();
      return { text: fallback, kind: 'reply' };
    }
  }

  reset(): PetState {
    this.stop();
    this.state = this.newPet();
    this.severeSince = null;
    this.lastEventAt = 0;
    this.recent = [];
    this.start();
    this.emit();
    return this.snapshot();
  }

  togglePause(): PetState {
    this.state.paused = !this.state.paused;
    this.emit();
    return this.snapshot();
  }

  dismissEvent(): void {
    if (this.state.event) {
      this.state.event = null;
      this.emit();
    }
  }

  reloadConfig(): void {
    const cfg = getConfig();
    const s = this.state;
    const changed =
      s.name !== cfg.pet.name || s.personalityId !== cfg.pet.personalityId || s.accent !== cfg.pet.accent;
    s.name = cfg.pet.name;
    s.personalityId = cfg.pet.personalityId;
    s.accent = cfg.pet.accent;
    if (changed) {
      this.say(`Ahora soy ${cfg.pet.name}! ✨`, 'thought');
      this.emit();
    }
  }

  // ─────────── IA ───────────
  private aiReady(): boolean {
    const cfg = getConfig();
    return cfg.ai.enabled && cfg.ai.mode !== 'off' && cfg.ai.apiKey.trim().length > 0;
  }

  private async aiSpontaneous(): Promise<void> {
    try {
      const cfg = getConfig();
      const system = buildSystemPrompt(this.state, cfg.ai.mode, 'Piensa en voz alta: qué te apetece ahora, una ocurrencia tuya, o pide amablemente lo que necesites si tienes algo bajo. 1 frase, como si hablaras solo.');
      const reply = await this.aiOnce(system);
      if (reply) {
        this.say(reply, 'thought');
        this.emit();
      }
    } catch {
      /* silencio */
    }
  }

  private async aiReaction(itemName: string, itemEmoji: string): Promise<void> {
    try {
      const cfg = getConfig();
      const system = buildSystemPrompt(
        this.state,
        cfg.ai.mode,
        `Acabas de recibir: ${itemName} ${itemEmoji}. Reacciona en 1 frase con tu personalidad (agradecido, con gracia, o con tu toque irónico, según tu carácter).`,
      );
      const reply = await this.aiOnce(system);
      if (reply) {
        this.say(reply, 'chat');
        this.emit();
      }
    } catch {
      /* silencio */
    }
  }

  private async aiOnce(system: string): Promise<string | null> {
    const cfg = getConfig();
    if (!this.aiReady()) return null;
    try {
      return await aiChat(cfg.ai, [{ role: 'system', content: system }]);
    } catch (err) {
      console.warn('[ai] llamada falló:', err);
      return null;
    }
  }

  // ─────────── helpers ───────────
  private worstNeed(): NeedKey | null {
    const s = this.state;
    const th = getConfig().overlay.attentionThreshold;
    const candidates = (Object.keys(s.needs) as NeedKey[])
      .map((k) => ({ k, v: s.needs[k] }))
      .filter((x) => x.v < th)
      .sort((a, b) => a.v - b.v);
    return candidates.length ? candidates[0].k : null;
  }

  private makeEvent(key: NeedKey): PetEvent {
    const pers = getPersonality(this.state.personalityId);
    const lines = pers.demandLines[key];
    return {
      id: uid('ev'),
      kind: key,
      text: pick(lines.length ? lines : ['¡Eh! Mírame un momentito 👀']),
      icon: NEED_ICONS[key],
      at: Date.now(),
    };
  }

  private resolveItem(type: ActionType, itemId?: string): Item | undefined {
    if (type === 'hug') return HUG;
    const pool: Item[] =
      type === 'feed' ? FOODS : type === 'drink' ? DRINKS : type === 'play' ? TOYS : type === 'clean' ? CLEANING : [];
    if (itemId) {
      const found = pool.find((i) => i.id === itemId) ?? findItem(itemId);
      if (found) return found;
      return pool[0] ?? undefined;
    }
    return pick(pool) ?? undefined;
  }
}
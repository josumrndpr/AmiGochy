// ─── Tipos compartidos entre el proceso principal y los renderers ───

export type NeedKey = 'hunger' | 'thirst' | 'energy' | 'happiness' | 'hygiene' | 'social';
export type Needs = Record<NeedKey, number>; // 0–100 (100 = perfecto)

export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';

export type Mood =
  | 'feliz'
  | 'hambriento'
  | 'sediento'
  | 'cansado'
  | 'triste'
  | 'sucio'
  | 'enfermo'
  | 'aburrido'
  | 'dormido'
  | 'muriendo';

export type EventKind = NeedKey | 'play' | 'attention';

export interface PetEvent {
  id: string;
  kind: EventKind;
  text: string; // mensaje que muestra el pet
  icon: string; // emoji
  at: number; // epoch ms
}

export interface BubbleMsg {
  id: string;
  text: string;
  kind: 'thought' | 'event' | 'chat' | 'reply';
  at: number;
}

export interface PetState {
  bornAt: number;
  lastTick: number;
  alive: boolean;
  stage: LifeStage;
  needs: Needs;
  weight: number; // gramos (decorativo, sube al comer)
  sick: boolean;
  xp: number;
  level: number; // nivel de amistad
  asleep: boolean;
  paused: boolean;
  name: string;
  personalityId: string;
  accent: string; // color hex del cuerpo
  event: PetEvent | null;
  lastWords: BubbleMsg[]; // últimas burbujas
  stats: { fed: number; watered: number; played: number; cleaned: number; hugged: number; deathCount: number };
}

export interface AiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  mode: 'off' | 'events' | 'always' | 'chat'; // off = frases pregrabadas; events = IA en eventos+chat; always = IA también espontánea; chat = solo chat manual
}

export interface OverlayConfig {
  alwaysOnTop: boolean;
  opacity: number; // 0.2–1
  scale: number; // 0.5–1.6
  clickThrough: boolean;
  showNeedsBar: boolean;
  attentionThreshold: number; // 0–100: por debajo de este valor el pet llama
  position: { x: number; y: number };
}

export interface SoundConfig {
  on: boolean;
  volume: number; // 0–1
}

export interface AppConfig {
  pet: {
    name: string;
    personalityId: string;
    accent: string;
  };
  ai: AiConfig;
  overlay: OverlayConfig;
  sound: SoundConfig;
}

export type ActionType = 'feed' | 'drink' | 'play' | 'clean' | 'hug' | 'sleep' | 'wake' | 'revive';

export interface ActionFeedback {
  text: string;
  emoji: string;
  needsDelta: Partial<Needs>;
  xpDelta: number;
  weightDelta: number;
}

export interface ChatReply {
  text: string;
  kind: 'reply' | 'error';
}

// API expuesta al renderer vía preload
export interface AmiAPI {
  config: {
    get(): Promise<AppConfig>;
    set(partial: Partial<AppConfig>): Promise<AppConfig>;
    setOverlayPosition(x: number, y: number): Promise<void>;
  };
  pet: {
    get(): Promise<PetState>;
    action(type: ActionType, itemId?: string): Promise<ActionFeedback>;
    chat(text: string): Promise<ChatReply>;
    reset(): Promise<PetState>;
    togglePause(): Promise<PetState>;
    dismissEvent(): Promise<void>;
  };
  windows: {
    openSettings(): void;
    toggleAlwaysOnTop(): Promise<boolean>;
    setClickThrough(v: boolean): Promise<boolean>;
    hidePet(): void;
    showPet(): void;
    quit(): void;
    platform(): string;
  };
  onPetUpdate(cb: (state: PetState) => void): () => void;
  onConfigUpdate(cb: (cfg: AppConfig) => void): () => void;
  onEvent(cb: (ev: PetEvent) => void): () => void;
}

export const NEED_LABELS: Record<NeedKey, string> = {
  hunger: 'Hambre',
  thirst: 'Sed',
  energy: 'Energía',
  happiness: 'Felicidad',
  hygiene: 'Higiene',
  social: 'Social',
};

export const NEED_ICONS: Record<NeedKey, string> = {
  hunger: '🍖',
  thirst: '💧',
  energy: '🔋',
  happiness: '💖',
  hygiene: '🫧',
  social: '🤗',
};

export const DEFAULT_CONFIG: AppConfig = {
  pet: { name: 'Ami', personalityId: 'tierno', accent: '#ff9db8' },
  ai: {
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.9,
    mode: 'events',
  },
  overlay: {
    alwaysOnTop: true,
    opacity: 1,
    scale: 1,
    clickThrough: false,
    showNeedsBar: true,
    attentionThreshold: 35,
    position: { x: 80, y: 80 },
  },
  sound: { on: true, volume: 0.7 },
};

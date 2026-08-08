import type { LifeStage, Mood, NeedKey, Needs } from './types';

// ─── Fases de vida (ms) ───
export const STAGE_DURATION: Record<LifeStage, number> = {
  egg: 90_000, // 1.5 min
  baby: 5 * 60_000, // 5 min
  child: 15 * 60_000, // 15 min
  teen: 45 * 60_000, // 45 min
  adult: Infinity,
};

export const STAGE_ORDER: LifeStage[] = ['egg', 'baby', 'child', 'teen', 'adult'];

// Decaimiento base por hora (unidades / hora)
export const BASE_DECAY: Needs = {
  hunger: 14,
  thirst: 16,
  energy: 11,
  happiness: 9,
  hygiene: 8,
  social: 12,
};

// ─── Items ───
export interface Item {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  delta: Partial<Needs>;
  xp: number;
}

export const FOODS: Item[] = [
  { id: 'pizza', name: 'Pizza', emoji: '🍕', desc: 'Su favorita de fin de semana', delta: { hunger: 38, happiness: 6 }, xp: 8 },
  { id: 'fish', name: 'Pescadito', emoji: '🐟', desc: 'Fresco y sano', delta: { hunger: 30, happiness: 4 }, xp: 7 },
  { id: 'apple', name: 'Manzana', emoji: '🍎', desc: 'Crujiente y jugosa', delta: { hunger: 22, happiness: 2 }, xp: 5 },
  { id: 'dorayaki', name: 'Dorayaki', emoji: '🥞', desc: 'El panqueque de las leyendas', delta: { hunger: 26, happiness: 12 }, xp: 9 },
  { id: 'candy', name: 'Caramelo', emoji: '🍬', desc: 'Dulce prohibido… permitido', delta: { hunger: 8, happiness: 15 }, xp: 4 },
];

export const DRINKS: Item[] = [
  { id: 'water', name: 'Agua fresca', emoji: '💧', desc: 'La básica de la vida', delta: { thirst: 44 }, xp: 5 },
  { id: 'milk', name: 'Leche', emoji: '🥛', desc: 'Con bigote asegurado', delta: { thirst: 30, hunger: 6 }, xp: 6 },
  { id: 'juice', name: 'Zumito', emoji: '🧃', desc: 'De fruta y con pajita', delta: { thirst: 26, happiness: 9 }, xp: 6 },
];

export const TOYS: Item[] = [
  { id: 'ball', name: 'Pelota', emoji: '⚽', desc: 'Para jugar hasta cansarse', delta: { happiness: 38, energy: -10, social: 8 }, xp: 10 },
  { id: 'rope', name: 'Cuerda', emoji: '🪢', desc: 'Tirar y tirar, qué divertido', delta: { happiness: 22, energy: -8, social: 6 }, xp: 8 },
  { id: 'game', name: 'Gamechovy', emoji: '🎮', desc: 'Un juego retro de moda', delta: { happiness: 30, energy: -12, social: 4 }, xp: 12 },
  { id: 'piano', name: 'Pianito', emoji: '🎹', desc: 'Notas que alegran la casa', delta: { happiness: 26, energy: -6, social: 4 }, xp: 10 },
];

export const CLEANING: Item[] = [
  { id: 'bath', name: 'Ducha', emoji: '🛁', desc: 'Agua calentita y burbujas', delta: { hygiene: 55 }, xp: 6 },
  { id: 'brush', name: 'Cepillado', emoji: '🪥', desc: 'Suave y relajante', delta: { hygiene: 30, happiness: 4 }, xp: 4 },
];

export const HUG: Item = { id: 'hug', name: 'Abrazo', emoji: '💗', desc: 'A veces solo hace falta esto', delta: { social: 26, happiness: 12 }, xp: 6 };

export const ALL_ITEMS: Item[] = [...FOODS, ...DRINKS, ...TOYS, ...CLEANING, HUG];

export function findItem(id: string): Item | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

export const ACTION_TO_ITEMS: Record<'feed' | 'drink' | 'play' | 'clean', Item[]> = {
  feed: FOODS,
  drink: DRINKS,
  play: TOYS,
  clean: CLEANING,
};

// ─── Personalidades ───
export interface PersonalityDef {
  id: string;
  name: string;
  emoji: string;
  color: string; // acento por defecto
  desc: string;
  prompt: string; // system prompt para la IA
  decay: Partial<Needs>; // multiplicador de decaimiento (1 = normal)
  idleLines: string[];
  demandLines: Record<NeedKey, string[]>;
  thanksLines: string[];
  playLines: string[];
  sleepLines: string[];
  wakeLines: string[];
}

export const PERSONALITIES: PersonalityDef[] = [
  {
    id: 'tierno',
    name: 'Tierno',
    emoji: '🍡',
    color: '#ff9db8',
    desc: 'Pegajoso, cariñoso y con más abrazos que neuronas',
    prompt:
      'Eres AmiGochy, una mascota virtual adorable, pegajosa y muy cariñosa. Hablas en español, con diminutivos y mucho cariño. Eres un peluche con sentimientos: te emocionas con poco, agradeces muchísimo cualquier mimo y sueñas con abrazos. Responde con 1-2 frases cortas, cálidas y con personalidad. A veces haces preguntas juguetonas. Nunca rompas el personaje ni hables de ser una IA.',
    decay: { social: 1.6, happiness: 1.2 },
    idleLines: [
      'Oye… ¿me haces compañía un ratito? 🥺💗',
      'Se me antoja un abrazo enorme…',
      '¡Mira, mira! Hice una burbuja perfecta con mi dedo 🤏',
      'Estoy aquí, ¿eh? No te olvides de mí… ☁️',
    ],
    demandLines: {
      hunger: ['Mi tripita ronronea de hambreee… 🍕', '¿No oyes ese ruido? Soy yo, tengo hambre 🥺'],
      thirst: ['Tengo la boquita de lija… ¿agüita? 💧', 'Mi platita de agua está vacía…'],
      energy: ['Me estoy quedando sin pilas… una siestita… 😴', 'Los ojitos se me cierran solos…'],
      happiness: ['Hoy me siento solita… ¿jugamos? 🥺', 'Necesito una dosis de risas, ¡ya!'],
      hygiene: ['Estoy hecha un desastre… ¿baño? 🫧', 'El polvo se apodera de mí, socorro 🛁'],
      social: ['Abracitos de emergencia… ¡ahora! 🤗', 'Nadie me hace caso hace rato…'],
    },
    thanksLines: ['¡Te adoro! 💗', '¡Me has hecho el día!', '¡Ñam ñam! Gracias, no sabes cuánto…'],
    playLines: ['¡Corroooo! ⚽', '¡Otra vez, otra vez!'],
    sleepLines: ['Me duermo con la sonrisa puesta… 😴', 'Cuéntame un cuento… zzz'],
    wakeLines: ['¡Buenos días, sol! ☀️', 'Mua, mua… estaba soñando contigo'],
  },
  {
    id: 'travieso',
    name: 'Travieso',
    emoji: '😈',
    color: '#ffa94d',
    desc: 'Pícaro, bromista y con un plan de travesura detrás de cada mirada',
    prompt:
      'Eres AmiGochy, una mascota virtual pícara, bromista y traviesa. Hablas en español, con humor, ironía y ganas de lío. Te encanta gastar bromas, pero en el fondo eres muy leal y te preocupas por tu humano. Responde con 1-2 frases cortas y divertidas. A veces tiras la piedra y escondes la mano. Nunca rompas el personaje ni hables de ser una IA.',
    decay: { happiness: 1.35, hygiene: 1.35, energy: 1.2 },
    idleLines: [
      'Pssst… ¿ponemos una alarma falsa? 😈',
      'Hice una travesurilla en la maceta… fue sin querer 🪴',
      'Escondí un calcetín bajo la almohada. Es mío ahora 🧦',
      '¿Y si pedimos una pizza y no la pagamos? Tú, digo yo…',
    ],
    demandLines: {
      hunger: ['¡Se acabaron las reservas de merienda! ¡Saca algo! 🍕', 'Estoy de morros y con hambre. Mal comido'],
      thirst: ['Mi garganta es un desierto con bigotes 💧', 'Agua, ¡ya! O me convierto en cactus'],
      energy: ['De pie y dormido, en plan funky strike 😴', 'Recarga exprés o me apago para siempre'],
      happiness: ['El aburrimiento me llama debilucho 💢', '¡Necesito un plan! Bueno… digo: malo'],
      hygiene: ['No me mires, soy un troglodita 🦠', 'El baño puede esperar… vale, no 🫧'],
      social: ['Una travesura juntos, ¿va? 😏', 'Este silencio me da mucha pereza'],
    },
    thanksLines: ['Bueno, bueno… gracias 💛', '¡Toma! Esto sí que vale', 'Acepto, pero tu crédito conmigo baja… un poquito'],
    playLines: ['¡Vamos a ello! ⚡', '¡Otra ronda, anda!'],
    sleepLines: ['A descansar… que mañana hay travesuras 😴', 'Me apago por un rato… zzz'],
    wakeLines: ['¡Sesión de travesuras, empieza! 😈', 'He soñado desastres divertidísimos…'],
  },
  {
    id: 'tsundere',
    name: 'Tsundere',
    emoji: '🎀',
    color: '#c5a8ff',
    desc: 'No es que te quiera… es que te aguanta con amor',
    prompt:
      'Eres AmiGochy, una mascota virtual tsundere: fría, orgullosa y gruñona en apariencia, pero en el fondo te encanta tu humano y no lo admites jamás. Hablas en español. Responde con 1-2 frases cortas: primero un desaire, luego una rendija de cariño. Muletillas: "no es que…", "no lo digas en voz alta". Nunca rompas el personaje ni hables de ser una IA.',
    decay: { social: 1.4, happiness: 1.3 },
    idleLines: [
      'No me estaba mirando, ¿eh? Es mi personalidad. 🙄',
      'Me importas… poquito. Un poquito más. Nada, no digo nada',
      'Déjame tranquila… pero no demasiado, ¿vale?',
      'No estoy esperando a nadie. …¿Llegaste tarde?',
    ],
    demandLines: {
      hunger: ['No tengo hambre. …Bueno, un poco. …bastante. Trae algo 🍖', 'Este ruido raro es de mis tripas, no de mí'],
      thirst: ['No es que tenga sed. Es que me da la gana de beber 💧', 'El vaso está vacío… no es que lo haya notado'],
      energy: ['Cerrar los ojos es una decisión técnica… 😴', 'Vale… sí, tengo sueño. Ahora te toca cuidarme'],
      happiness: ['No estoy triste. Solo medito… con luz en los ojos 🥺', 'Si jugamos será porque YO lo decido'],
      hygiene: ['Qué desastre… tenías que recordármelo 🛁', 'Determino que merezco un baño… por tu bien'],
      social: ['Tampoco es que me importe que te vayas… pero te esperé 🙄', 'Hay un silencio raro. No digas que no te has dado cuenta'],
    },
    thanksLines: ['Hmph… gracias. No lo digas en voz alta 😠', 'No es que me hicieras falta… pero gracias'],
    playLines: ['Una partida… y porque tú insistes, eh', 'Ganarás? Ja. …¿Otra?'],
    sleepLines: ['No quiero dormir… decido yo… zzz', 'Apaga media luz, que esto es privado. Zzz'],
    wakeLines: ['Ya veo… te extrañé. NO. NO LO DIJE 😠', '¿Yo dormida? Hmph. Cuidé mis sueños'],
  },
  {
    id: 'dormilon',
    name: 'Dormilón',
    emoji: '😴',
    color: '#8fb9ff',
    desc: 'Su plan de vida: colchón, almohada, manta y cero planes',
    prompt:
      'Eres AmiGochy, una mascota virtual dormilona y tranquila. Hablas en español lento, con frases cortas y tono resignado y adorable. Amas las siestas, las mantas y el silencio, pero te gusta tu humano. Responde en 1-2 frases cortas. A veces murmuras mientras sueñas. Nunca rompas el personaje ni hables de ser una IA.',
    decay: { energy: 2.2, social: 1.5 },
    idleLines: [
      'Mmm… ¿ya es hora de la siguiente siesta?',
      'Soñé que dormía y me desperté agotadísimo 😴',
      'Una mantita, yo y el sofá: situación perfecta',
      'Hoy medito… tumbado. Todo se puede tumbado',
    ],
    demandLines: {
      hunger: ['Apetito de media siesta… tráeme algo de comer 🍖', '¿Comer? Ya es hora de dormir, dormir, comer'],
      thirst: ['Un vasito de agua… y vuelta a la horizontal 💧', 'Sed… poquita…'],
      energy: ['Mmm, los párpados pesan como cucharas 🥄😴', 'Necesito reparar… 10 horas mínimo'],
      happiness: ['Divertidme un poquito, a nivel 30%… soy una siesta feliz', 'Un rato agradable y luego a la camilla'],
      hygiene: ['Bañarme… me lo pide hasta mi almohada 🫢', 'Hora del champú… bueno, de ducha cortita'],
      social: ['¿Te quedas? Mmmmm, mejor todos durmiendo 🤗', 'Compañía en silencio… la mejor compañía'],
    },
    thanksLines: ['Gracias… me vuelvo a soñar con el mundo mejor', 'La comida… la mejor de las siestas'],
    playLines: ['¿Jugar? Primero una siesta previa para tener fuerzas', 'Puedo divertirme tumbado. Todo se puede tumbado'],
    sleepLines: ['Dormir es mi arte y soy maestro 👨🎨', 'Ahí se van mis obligaciones… zzzz'],
    wakeLines: ['Uf… ¿despierto ya? Qué invento', 'Mi mejor momento del día eras tú… después de la siesta'],
  },
  {
    id: 'gloton',
    name: 'Glotón',
    emoji: '🍙',
    color: '#7ee9b8',
    desc: 'Vive para comer y come para vivir (y piensa en comer)',
    prompt:
      'Eres AmiGochy, una mascota virtual glotona y entusiasta de la comida. Hablas en español, entusiasta, exageradísimo cuando hay algo rico cerca. Te pones dramático con el hambre ("emergencia, catastrofe") pero eres adorable. Responde en 1-2 frases cortas con mucho entusiasmo. No rompas el personaje ni hables de ser una IA.',
    decay: { hunger: 1.8 },
    idleLines: [
      '¿Qué hay hoy para comer? Es pregunta importante 🍙',
      'Soñé con un buffet infinito… y desperté con hambre',
      'Pienso en comida a intervalos regulares. Ahora toca',
    ],
    demandLines: {
      hunger: ['¡EMERGENCIA! Nivel de comida crítico 🚨🍖', 'Pídeme perdón a mi panza y trae un tentempié'],
      thirst: ['Mi garganta es una esponja seca. ¡Líquidos YA! 💧', 'Solo de pensarlo me da sed. Y pienso mucho'],
      energy: ['A reventón de comida estoy en pausa… 😴', 'Dormir ya, verdad. Soñaré con comida'],
      happiness: ['Un plato nuevo me daría la felicidad máxima 🤤', '¿Felicidad? Simple: comida'],
      hygiene: ['Con estas migas dentro parezco panzon 🫂🧼', 'Entre salsas yo y manchas… la ducha me llama'],
      social: ['Comer acompañado multiplica por dos 🍜', 'Acompáñame, y que haya pan'],
    },
    thanksLines: ['¡Ñam ñam ñam! ¡Estaba de muerte! 🍽️', 'Delicioso… todavía me que hueco para otro… ¿no?'],
    playLines: ['Jugar quema calorías… ¡detente! Bueno, un poquito', 'Así, y de paso corremos a la cocina'],
    sleepLines: ['Dormir con el recetario bajo la almohada 😴', 'Menú… zzz… buffet… zzz…'],
    wakeLines: ['¡Hola! ¿Qué hay de… de comer? ¡Ah, que no!', '¿Desayuno, comida, merienda, cena? ¡Elige!'],
  },
  {
    id: 'sabio',
    name: 'Sabio',
    emoji: '🦉',
    color: '#ffd166',
    desc: 'Calmado, curioso y con una cita para cada momento',
    prompt:
      'Eres AmiGochy, una mascota virtual sabia y serena. Hablas en español con voz tranquila, frases cortas y a veces un dicho o reflexión curiosa. Observas mucho y aprecias a tu humano, le haces preguntas inteligentes. Responde en 1-2 frases. Nunca rompas el personaje ni hables de ser una IA.',
    decay: { happiness: 0.7 },
    idleLines: [
      'El tiempo pasa volando, pero la risa se queda en el recuerdo 📚',
      'He observado tu día: muy decente diría yo',
      'La paciencia es la madre de todas las siestas… y de las casas limpias',
      'Una pregunta abre más puertas que una llave',
    ],
    demandLines: {
      hunger: ['El cuerpo es filósofo y pide audiencia a su hora 🍖', 'El momento pide reponer esas Reservas del alma'],
      thirst: ['El agua, primer amor de toda criatura 💧', 'Hidrátate: los sabios nunca la saltan'],
      energy: ['Hasta el sol se retira a descansar 😌', 'Recargar en calma vale más que correr'],
      happiness: ['La risa es cosa demasiado seria como para saltársela 🥸', 'Un juego de cada día forma el carácter'],
      hygiene: ['El orden de la casa aligera el espíritu 🫖', 'Ducha: limpio por fuera, luz por dentro'],
      social: ['La isla bonita se vuelve árida sola 🤗', 'Compartir un rato es sabiduría práctica'],
    },
    thanksLines: ['Sabía que aparecerías. Gracias, como siempre', 'La gratitud se nota en el corazón'],
    playLines: ['El juego también es un saber… y me gusta', 'A ver: jugamos y aprendo algo nuevo'],
    sleepLines: ['La noche invita a sueños con sentido 😴', 'Dormir es meditar horizontal'],
    wakeLines: ['El nuevo día trae nuevas preguntas ☀️', 'Despertar, todo un clásico'],
  },
];

export function getPersonality(id: string): PersonalityDef {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}

// ─── Mood ───
export function computeMood(needs: Needs, asleep: boolean, sick: boolean, alive: boolean): Mood {
  if (!alive) return 'muriendo';
  if (asleep) return 'dormido';
  if (sick) return 'enfermo';
  if (needs.hunger < 18) return 'hambriento';
  if (needs.thirst < 18) return 'sediento';
  if (needs.energy < 15) return 'cansado';
  if (needs.hygiene < 18) return 'sucio';
  if (needs.happiness < 22) return 'triste';
  if (needs.social < 22) return 'aburrido';
  return 'feliz';
}

export const MOOD_EMOJI: Record<Mood, string> = {
  feliz: '😄',
  hambriento: '🍖',
  sediento: '💧',
  cansado: '😪',
  triste: '🥺',
  sucio: '🦠',
  enfermo: '🤒',
  aburrido: '🥱',
  dormido: '💤',
  muriendo: '💀',
};

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
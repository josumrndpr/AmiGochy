import type { AiConfig, PetState } from '../shared/types';
import { STAGE_ORDER, getPersonality } from '../shared/constants';

const TIMEOUT_MS = 20_000;

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Manda un chat completion a cualquier API compatible con OpenAI. */
export async function aiChat(cfg: AiConfig, messages: AiMessage[]): Promise<string> {
  const baseUrl = cfg.baseUrl.trim().replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: 140,
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Respuesta vacía de la API');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Prompt de sistema con estado actual del pet para dar contexto a la IA. */
export function buildSystemPrompt(state: PetState, mode: 'off' | 'events' | 'always' | 'chat', extra = ''): string {
  const p = getPersonality(state.personalityId);
  const stageName = STAGE_NAMES[state.stage];
  const needs = state.needs;
  void mode;
  const lines = [
    p.prompt,
    `Contexto actual: te llamas ${state.name}, eres un AmiGochy ${stageName} de nivel ${state.level} con personalidad "${p.name}".`,
    `Tus sensaciones ahora mismo: hambre ${Math.round(needs.hunger)}/100, sed ${Math.round(needs.thirst)}/100, energía ${Math.round(needs.energy)}/100, felicidad ${Math.round(needs.happiness)}/100, higiene ${Math.round(needs.hygiene)}/100, ganas de socializar ${Math.round(needs.social)}/100.${state.asleep ? ' ESTÁS DORMIDO: tus respuestas deben sonar a media voz o somnolientas.' : ''}`,
    'Reglas: responde SIEMPRE en español; 1-2 frases cortas (máximo ~90 caracteres); usa emojis con moderación; refleja ese estado en lo que dices y pide lo que de verdad necesitas; nunca digas que es un sistema, un juego o una IA.',
    extra ? `Nota del momento: ${extra}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export const STAGE_NAMES: Record<string, string> = {
  egg: 'huevo',
  baby: 'bebé',
  child: 'cachorro',
  teen: 'adolescente',
  adult: 'adulto',
};
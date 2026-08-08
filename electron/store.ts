import { app } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AppConfig, PetState } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';

interface StoreFile {
  config: AppConfig;
  pet: PetState | null;
}

const file = (): string => join(app.getPath('userData'), 'amigochy.json');

let cache: StoreFile | null = null;

function load(): StoreFile {
  if (cache) return cache;
  try {
    const raw = readFileSync(file(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    cache = {
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
      pet: parsed.pet ?? null,
    };
    // merge deep defaults per section (en caso de configs viejas/parciales)
    cache.config.pet = { ...DEFAULT_CONFIG.pet, ...cache.config.pet };
    cache.config.ai = { ...DEFAULT_CONFIG.ai, ...cache.config.ai };
    cache.config.overlay = { ...DEFAULT_CONFIG.overlay, ...cache.config.overlay };
    cache.config.sound = { ...DEFAULT_CONFIG.sound, ...cache.config.sound };
  } catch {
    cache = { config: structuredClone(DEFAULT_CONFIG), pet: null };
  }
  return cache;
}

function save(): void {
  const path = file();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(cache ?? { config: DEFAULT_CONFIG, pet: null }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] no se pudo guardar:', err);
  }
}

export function getConfig(): AppConfig {
  return load().config;
}

export function setConfig(patch: Partial<AppConfig>): AppConfig {
  const cfg = load().config;
  if (patch.pet) cfg.pet = { ...cfg.pet, ...patch.pet };
  if (patch.ai) cfg.ai = { ...cfg.ai, ...patch.ai };
  if (patch.overlay) cfg.overlay = { ...cfg.overlay, ...patch.overlay };
  if (patch.sound) cfg.sound = { ...cfg.sound, ...patch.sound };
  save();
  return cfg;
}

export function getPet(): PetState | null {
  return load().pet;
}

export function setPet(pet: PetState): void {
  load().pet = pet;
  save();
}
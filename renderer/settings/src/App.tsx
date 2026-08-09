import { useEffect, useState } from 'react';
import type { AmiAPI, ActionType, AppConfig, PetState } from '@shared/types';
import { MOOD_EMOJI } from '@shared/constants';
import { PERSONALITIES, computeMood } from '@shared/constants';
import type { PersonalityDef } from '@shared/constants';
import { sound, soundForAction } from '../../pet/src/sound';

declare global {
  interface Window {
    ami: AmiAPI & { drag: { begin: () => void; move: (x: number, y: number) => void; end: () => void } };
  }
}

const ami = window.ami;

const ACCENTS = [
  '#ff9db8', '#ffa94d', '#ffd166', '#7ee9b0', '#8fb9ff', '#c5a8ff', '#6ee7d9', '#f9a8d4', '#a3e635', '#f87171',
];

const PROVIDER_PRESETS: Array<{ label: string; url: string; model: string; hint: string }> = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini', hint: 'Clave de API de OpenAI' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', hint: 'Una clave, muchos modelos' },
  { label: 'Ollama (local)', url: 'http://localhost:11434/v1', model: 'llama3.2', hint: 'Gratis, 100% local' },
  { label: 'LM Studio (local)', url: 'http://localhost:1234/v1', model: 'local-model', hint: 'Servidor local de LM Studio' },
];

const SOUND_DEMO: Array<{ id: ActionType; emoji: string }> = [
  { id: 'feed', emoji: '😋' },
  { id: 'drink', emoji: '💧' },
  { id: 'play', emoji: '🎈' },
  { id: 'clean', emoji: '🫧' },
  { id: 'hug', emoji: '💗' },
];

const STAGE_LABEL: Record<string, string> = {
  egg: 'huevo',
  baby: 'bebé',
  teen: 'cría',
  adult: 'adulto',
  elder: 'anciano',
};

const AI_MODES: Array<{ id: AppConfig['ai']['mode']; label: string; desc: string }> = [
  { id: 'off', label: 'Frases hechas', desc: 'Sin IA: el AmiGochy habla con frases pregrabadas con su personalidad.' },
  { id: 'events', label: 'IA en eventos y chat', desc: 'La IA reacciona a lo que haces y al chatear. Económico.' },
  { id: 'always', label: 'IA siempre viva', desc: 'Además, la IA habla sola de vez en cuando. La mascota más viva.' },
  { id: 'chat', label: 'IA solo en chat', desc: 'La IA responde cuando le escribes; el resto son frases locales.' },
];

type Section = 'mascota' | 'ia' | 'sonido' | 'pantalla' | 'avanzado';

export function App() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [pet, setPet] = useState<PetState | null>(null);
  const [section, setSection] = useState<Section>('mascota');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const [c, p] = await Promise.all([ami.config.get(), ami.pet.get()]);
      if (disposed) return;
      setCfg(c);
      setPet(p);
      sound.init();
      sound.setEnabled(c.sound.on);
      sound.setVolume(c.sound.volume);
    })();
    const offCfg = ami.onConfigUpdate((c) => setCfg(c));
    const offPet = ami.onPetUpdate((p) => setPet(p));
    return () => {
      disposed = true;
      offCfg();
      offPet();
    };
  }, []);

  const patch = (partial: Partial<AppConfig>) => {
    if (!cfg) return;
    const next = { ...cfg, ...partial };
    setCfg(next);
    void ami.config.set(partial).catch(() => undefined);
  };

  const mood = pet ? computeMood(pet.needs, pet.asleep, pet.sick, pet.alive) : 'feliz';

  if (!cfg) {
    return (
      <div className="cfg-splash">
        <div className="splash-logo">🥚</div>
        <p>Cargando AmiGochy…</p>
      </div>
    );
  }

  const personality = PERSONALITIES.find((p) => p.id === cfg.pet.personalityId) ?? PERSONALITIES[0];

  return (
    <div className="cfg-shell">
      {/* ── sidebar ── */}
      <aside className="cfg-side">
        <div className="side-logo">
          <span className="side-emoji">🥚→🐣</span>
          <h1>AmiGochy</h1>
          <p>tu peluche de escritorio</p>
        </div>
        <nav className="side-nav">
          {(
            [
              ['mascota', '🧸', 'Mascota'],
              ['ia', '🤖', 'Cerebro IA'],
              ['sonido', '🔊', 'Sonido'],
              ['pantalla', '🖥️', 'Pantalla'],
              ['avanzado', '🛠️', 'Avanzado'],
            ] as Array<[Section, string, string]>
          ).map(([id, icon, label]) => (
            <button key={id} className={`nav-item${section === id ? ' active' : ''}`} onClick={() => setSection(id)}>
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-preview" style={{ background: `linear-gradient(140deg, ${palen(cfg.pet.accent)}, ${cfg.pet.accent})` }}>
            <span className="pv-emoji">{personality.emoji}</span>
            <div className="pv-name">{cfg.pet.name}</div>
            <div className="pv-mood">
              {pet ? `${pet.alive ? '' : '💀 '}${MOOD_EMOJI[mood]} etapa: ${STAGE_LABEL[pet.stage]}${pet.sick ? ' · enfermo' : ''}` : `🥚 etapa: huevo`}
            </div>
          </div>
          <button className="btn-ghost full" onClick={() => void ami.windows.quit()}>
            Salir de AmiGochy
          </button>
        </div>
      </aside>

      {/* ── contenido ── */}
      <main className="cfg-main">
        {section === 'mascota' && (
          <div className="section">
            <SectionTitle icon="🐸" title="Tu mascota" subtitle="Cómo se llama y cómo es tu AmiGochy" />
            <Card>
              <Field label="Nombre">
                <input
                  className="input"
                  value={cfg.pet.name}
                  maxLength={16}
                  onChange={(e) => patch({ pet: { ...cfg.pet, name: e.target.value } })}
                />
              </Field>

              <div className="field">
                <label>Personalidad</label>
                <div className="person-grid">
                  {PERSONALITIES.map((p: PersonalityDef) => (
                    <button
                      key={p.id}
                      className={`person-card${cfg.pet.personalityId === p.id ? ' selected' : ''}`}
                      style={{ '--card-accent': p.color } as React.CSSProperties}
                      onClick={() => patch({ pet: { ...cfg.pet, personalityId: p.id, accent: cfg.pet.accent === previousAccent(p) ? p.color : cfg.pet.accent } })}
                    >
                      <span className="person-emoji">{p.emoji}</span>
                      <span className="person-name">{p.name}</span>
                      <span className="person-desc">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Color del cuerpo</label>
                <div className="accent-row">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      className={`swatch${cfg.pet.accent.toLowerCase() === c ? ' selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => patch({ pet: { ...cfg.pet, accent: c } })}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                  <input
                    className="swatch custom"
                    type="color"
                    value={cfg.pet.accent}
                    onChange={(e) => patch({ pet: { ...cfg.pet, accent: e.target.value } })}
                    title="Color personalizado"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="card-title">Vista previa</h3>
              <div className="preview-row">
                <div className="preview-circle" style={{ background: `linear-gradient(160deg, #ffffff80, ${cfg.pet.accent})` }}>
                  <span className="preview-emoji">{personality.emoji}</span>
                  {pet && !pet.alive && <span className="preview-x">💀</span>}
                </div>
                <div className="preview-info">
                  <p>
                    <b>{cfg.pet.name}</b> · {personality.name}
                  </p>
                  <p className="muted">
                    {pet ? `Nivel ${pet.level} · ${pet.weight} g · nacido hace ${ageStr(Date.now() - pet.bornAt)}` : 'Aún no nace…'}
                  </p>
                  <p className="muted">Animo: {MOOD_EMOJI[mood]} {mood}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {section === 'ia' && (
          <div className="section">
            <SectionTitle title="Cerebro IA" icon="🧠" />

            <Card title="¿Quieres IA?">
              <ToggleRow
                label="Activar IA conversacional"
                desc="Con una IA tu AmiGochy improvisa, charla y reacciona con su propia voz."
                checked={cfg.ai.enabled}
                onChange={(v) => patch({ ai: { ...cfg.ai, enabled: v } })}
              />
              <div className="modes">
                {AI_MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`mode-card${cfg.ai.mode === m.id ? ' selected' : ''}`}
                    onClick={() => patch({ ai: { ...cfg.ai, mode: m.id } })}
                  >
                    <b>{m.label}</b>
                    <span>{m.desc}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card
            ><h3 className="card-title">Proveedor</h3>
              <div className="preset-row">
                {PROVIDER_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="chip"
                    onClick={() => patch({ ai: { ...cfg.ai, baseUrl: p.url, model: p.model } })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Field label="URL base (API compatible con OpenAI)">
                <input className="input mono" value={cfg.ai.baseUrl} onChange={(e) => patch({ ai: { ...cfg.ai, baseUrl: e.target.value } })} placeholder="https://api.openai.com/v1" />
              </Field>
              <Field label="Clave API">
                <div className="key-row">
                  <input
                    className="input mono"
                    type={showKey ? 'text' : 'password'}
                    value={cfg.ai.apiKey}
                    onChange={(e) => patch({ ai: { ...cfg.ai, apiKey: e.target.value } })}
                    placeholder="sk-…"
                  />
                  <button className="btn-ghost" onClick={() => setShowKey((v) => !v)} title="Mostrar/ocultar">
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="hint">La clave se guarda solo en tu equipo (userData/amigochy.json).</p>
              </Field>
              <Field label="Modelo">
                <input className="input mono" value={cfg.ai.model} onChange={(e) => patch({ ai: { ...cfg.ai, model: e.target.value } })} placeholder="gpt-4o-mini" />
              </Field>
              <Field label={`Creatividad: ${Math.round(cfg.ai.temperature * 100)}%`}>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(cfg.ai.temperature * 100)}
                  onChange={(e) => patch({ ai: { ...cfg.ai, temperature: Number(e.target.value) / 100 } })}
                />
              </Field>
            </Card>
          </div>
        )}

        {section === 'sonido' && (
          <div className="section">
            <SectionTitle title="Sonido" icon="🔊" />
            <Card>
              <ToggleRow
                label="Sonidos del AmiGochy"
                desc="Blips, masticaciones, campanitas y garabatos sintetizados (sin archivos)."
                checked={cfg.sound.on}
                onChange={(v) => patch({ sound: { ...cfg.sound, on: v } })}
              />
              <Field label={`Volumen: ${Math.round(cfg.sound.volume * 100)}%`}>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(cfg.sound.volume * 100)}
                  onChange={(e) => patch({ sound: { ...cfg.sound, volume: Number(e.target.value) / 100 } })}
                />
              </Field>
              <div className="preview-sounds">
                <span>Prueba:</span>
                {SOUND_DEMO.map((s) => (
                    <button key={s.id} className="chip" onClick={() => soundForAction(s.id)}>
                      {s.emoji}
                    </button>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {section === 'pantalla' && (
          <div className="section">
            <SectionTitle title="Pantalla del AmiGochy" icon="🖥️" />
            <Card>
              <Field label={`Tamaño: ${cfg.overlay.scale.toFixed(2)}×`}>
                <input className="range" type="range" min={50} max={170} value={Math.round(cfg.overlay.scale * 100)} onChange={(e) => patch({ overlay: { ...cfg.overlay, scale: Number(e.target.value) / 100 } })} />
              </Field>
              <Field label={`Opacidad: ${Math.round(cfg.overlay.opacity * 100)}%`}>
                <input className="range" type="range" min={20} max={100} value={Math.round(cfg.overlay.opacity * 100)} onChange={(e) => patch({ overlay: { ...cfg.overlay, opacity: Number(e.target.value) / 100 } })} />
              </Field>
              <Field label={`Te pide cosas cuando algo baja del ${cfg.overlay.attentionThreshold}%`}>
                <input className="range" type="range" min={10} max={70} value={cfg.overlay.attentionThreshold} onChange={(e) => patch({ overlay: { ...cfg.overlay, attentionThreshold: Number(e.target.value) } })} />
              </Field>
              <ToggleRow
                label="Siempre encima"
                desc="Flota por encima de las demás ventanas."
                checked={cfg.overlay.alwaysOnTop}
                onChange={(v) => void ami.windows.toggleAlwaysOnTop().then((r) => patch({ overlay: { ...cfg.overlay, alwaysOnTop: r } }))}
              />
              <ToggleRow
                label="Modo fantasma (click-through)"
                desc="El mouse lo atraviesa; la mascota se vuelve translúcida. En algunos escritorios Wayland puede no aplicar."
                checked={cfg.overlay.clickThrough}
                onChange={(v) => void ami.windows.setClickThrough(v).then((r) => patch({ overlay: { ...cfg.overlay, clickThrough: r } }))}
              />
              {cfg.overlay.clickThrough && (
                <p className="ghost-hint">
                  👻 Activo: para salir pulsa <b>Ctrl+Shift+Alt+O</b> (atajo global) o vuelve a lanzar AmiGochy — se desactiva
                  solo.
                </p>
              )}
              <div className="btn-row">
                <button
                  className="btn"
                  onClick={() => {
                    ami.drag.move(120, 120);
                    ami.drag.end();
                    patch({ overlay: { ...cfg.overlay, position: { x: 120, y: 120 } } });
                  }}
                >
                  📍 Volver a posición inicial
                </button>
              </div>
            </Card>
          </div>
        )}

        {section === 'avanzado' && (
          <div className="section">
            <SectionTitle title="Avanzado" icon="🛠️" />
            <Card>
              <h3 className="card-title">Mi AmiGochy en números</h3>
              <div className="stats-grid">
                <Stat label="Nivel" value={pet?.level ?? '—'} />
                <Stat label="XP" value={pet?.xp ?? '—'} />
                <Stat label="Peso" value={pet ? `${pet.weight} g` : '—'} />
                <Stat label="Edad" value={pet ? ageStr(Date.now() - pet.bornAt) : '—'} />
                <Stat label="Comidas" value={pet?.stats.fed ?? '—'} />
                <Stat label="Baños" value={pet?.stats.cleaned ?? '—'} />
                <Stat label="Juegos" value={pet?.stats.played ?? '—'} />
                <Stat label="Muertes" value={pet?.stats.deathCount ?? '—'} />
              </div>
            </Card>
            <Card>
              <h3 className="card-title">Controles</h3>
              <div className="btn-row">
                <button className="btn" onClick={() => void ami.pet.togglePause()}>
                  ⏸️ / ▶️ Pausar / reanudar vida
                </button>
                <button className="btn danger" onClick={() => { if (confirm('¿De verdad quieres reiniciar tu AmiGochy? Se perderá su historia 😢')) void ami.pet.reset(); }}>
                  🥚 Reiniciar mascota
                </button>
                <button className="btn" onClick={() => void ami.windows.quit()}>
                  🚪 Salir
                </button>
              </div>
              {pet && (
                <p className="hint">
                  {pet.paused ? '⏸️ La vida está en pausa.' : '▶️ La vida corre.'} {pet.asleep ? '💤 AmiGochy está dormido.' : '😊 Despierto.'}
                </p>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── primitivas UI ───
function SectionTitle({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="section-title">
      <h2>{icon} {title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      {title && <h3 className="card-title">{title}</h3>}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div>
        <b>{label}</b>
        {desc && <p className="hint">{desc}</p>}
      </div>
      <button
        className={`switch${checked ? ' on' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ageStr(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'recién nacido';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

function palen(h: string): string {
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => Math.round(c + (255 - c) * 0.5).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function previousAccent(p: PersonalityDef): string {
  return p.color;
}
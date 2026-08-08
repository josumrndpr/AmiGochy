import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionType, AmiAPI, AppConfig, NeedKey, PetEvent, PetState } from '@shared/types';
import { NEED_ICONS, NEED_LABELS } from '@shared/types';
import { HUG, MOOD_EMOJI, PERSONALITIES, computeMood, getPersonality, uid } from '@shared/constants';
import type { Item } from '@shared/constants';
import { ACTION_TO_ITEMS } from '@shared/constants';
import { Creature } from './Creature';
import { sound, soundForAction } from './sound';

declare global {
  interface Window {
    ami: AmiAPI & { drag: { move: (x: number, y: number) => void; end: () => void } };
  }
}

const ami = window.ami;
const NEED_ORDER: NeedKey[] = ['hunger', 'thirst', 'energy', 'happiness', 'hygiene', 'social'];

const CATEGORIES: Array<{ kind: ActionType; label: string; icon: string }> = [
  { kind: 'feed', label: 'Comer', icon: '🍖' },
  { kind: 'drink', label: 'Beber', icon: '🥤' },
  { kind: 'play', label: 'Jugar', icon: '🎈' },
  { kind: 'clean', label: 'Aseo', icon: '🫧' },
];

function itemsFor(kind: ActionType): Item[] {
  if (kind === 'hug') return [HUG];
  return ACTION_TO_ITEMS[kind as 'feed' | 'drink' | 'play' | 'clean'] ?? [];
}

function trayForEvent(kind: PetEvent['kind']): ActionType {
  switch (kind) {
    case 'hunger':
      return 'feed';
    case 'thirst':
      return 'drink';
    case 'energy':
      return 'play';
    case 'hygiene':
      return 'clean';
    case 'happiness':
    case 'social':
    case 'attention':
      return 'hug';
    default:
      return 'play';
  }
}

function needColor(k: NeedKey, v: number): string {
  if (v < 25) return '#ff5d5d';
  if (v < 55) return '#ffb257';
  return '#7ee0a3';
}

interface Particle {
  id: string;
  emoji: string;
  left: string;
  bottom: string;
}

export function App() {
  const [pet, setPet] = useState<PetState | null>(null);
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [tray, setTray] = useState<ActionType | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flash, setFlash] = useState<{ text: string; emoji: string } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; wx: number; wy: number; moved: boolean } | null>(null);
  const prevRef = useRef<Partial<PetState>>({});
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── carga inicial + suscripciones ──
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const [p, c] = await Promise.all([ami.pet.get(), ami.config.get()]);
      if (disposed) return;
      prevRef.current = p;
      setPet(p);
      setCfg(c);
      sound.init();
      sound.setEnabled(c.sound.on);
      sound.setVolume(c.sound.volume);
    })();

    const offPet = ami.onPetUpdate((s) => {
      const prev = prevRef.current;
      detectTransitions(prev, s);
      prevRef.current = s;
      setPet(s);
    });
    const offCfg = ami.onConfigUpdate((c) => {
      setCfg(c);
      sound.setEnabled(c.sound.on);
      sound.setVolume(c.sound.volume);
    });
    return () => {
      disposed = true;
      offPet();
      offCfg();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── transiciones → sonidos ──
  function detectTransitions(prev: Partial<PetState> | undefined, next: PetState): void {
    if (!prev || !prev.alive) return;
    if (!prev.alive && next.alive) sound.birth();
    else if (prev.alive && !next.alive) sound.death();
    else if (prev.stage !== next.stage && next.stage !== 'egg') sound.levelUp();
    else if (prev.level !== next.level) sound.levelUp();
    else if (prev.asleep !== next.asleep) {
      if (next.asleep) sound.sleep();
    } else if (next.event && (!prev.event || prev.event.id !== next.event.id)) {
      sound.attention();
      showFlash(`${next.event.icon} ${next.event.text}`, '❗');
    }
  }

  const showFlash = useCallback((text: string, emoji: string) => {
    setFlash({ text, emoji });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 3200);
  }, []);

  // ── ojos que siguen el ratón ──
  const onWindowMove = useCallback((e: PointerEvent) => {
    const nx = (e.screenX - window.screenX) / Math.max(1, window.innerWidth) - 0.5;
    const ny = (e.screenY - window.screenY) / Math.max(1, window.innerHeight) - 0.5;
    setEye({ x: Math.max(-1, Math.min(1, nx * 2)), y: Math.max(-1, Math.min(1, ny * 2)) });
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onWindowMove);
    return () => window.removeEventListener('pointermove', onWindowMove);
  }, [onWindowMove]);

  // ── arrastre de la ventana (funciona con Wayland) ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    sound.resume();
    dragRef.current = { sx: e.screenX, sy: e.screenY, wx: window.screenX, wy: window.screenY, moved: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.screenX - d.sx;
    const dy = e.screenY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    ami.drag.move(d.wx + dx, d.wy + dy);
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) {
      setDragging(false);
      ami.drag.end();
    }
  }, []);

  // ── acciones ──
  const burst = useCallback((emoji: string) => {
    const p: Particle = { id: uid('pt'), emoji, left: `${30 + Math.random() * 40}%`, bottom: `${80 + Math.random() * 60}%` };
    setParticles((prev) => [...prev.slice(-8), p]);
    setTimeout(() => setParticles((prev) => prev.filter((x) => x.id !== p.id)), 1600);
  }, []);

  const doAction = useCallback(
    (type: ActionType, itemId?: string, emoji = '✨') => {
      soundForAction(type);
      burst(emoji);
      setTray(null);
      void ami.pet
        .action(type, itemId)
        .then((fb) => {
          if (fb.text) showFlash(fb.text, fb.emoji);
          if ((fb.needsDelta?.happiness ?? 0) > 0) burst('💗');
          if (fb.xpDelta > 8) burst('⭐');
        })
        .catch(() => undefined);
    },
    [burst, showFlash],
  );

  const sendChat = useCallback(async () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText('');
    setThinking(true);
    try {
      await ami.pet.chat(text);
    } finally {
      setThinking(false);
    }
  }, [chatText]);

  // ── derivados ──
  const mood = pet ? computeMood(pet.needs, pet.asleep, pet.sick, pet.alive) : 'feliz';
  const personality = pet ? getPersonality(pet.personalityId) : PERSONALITIES[0];
  const accent = cfg?.pet.accent ?? personality.color;
  const scale = cfg?.overlay.scale ?? 1;
  const threshold = cfg?.overlay.attentionThreshold ?? 35;
  const lowNeeds = pet ? NEED_ORDER.some((k) => pet.needs[k] < threshold) : false;
  const lastWord = pet?.lastWords[pet.lastWords.length - 1];
  const trayItems = tray ? itemsFor(tray) : [];

  if (!pet || !cfg) {
    return <div className="pet-root" />;
  }

  return (
    <div
      className={`pet-root${dragging ? ' dragging' : ''}${lowNeeds ? ' needs-low' : ''}${chatOpen ? ' chat-open' : ''}${
        cfg.overlay.clickThrough ? ' ghost' : ''
      }`}
      style={
        {
          '--accent': accent,
          '--scale': scale,
          opacity: cfg.overlay.opacity,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }}
    >
      {/* banner de evento */}
      {pet.event && pet.alive && (
        <button className="event-banner" onClick={() => setTray(trayForEvent(pet.event!.kind))} title="Atender">
          <span className="pulse-dot" />
          {pet.event.icon} {pet.event.text}
        </button>
      )}

      {/* nombre + nivel */}
      <div className="name-badge">
        {personality.emoji} {pet.name} · nv.{pet.level}
        {pet.paused && ' ⏸'}
      </div>

      {/* burbuja */}
      {(lastWord || thinking) && (
        <div className="bubble" key={lastWord?.id}>
          {thinking ? (
            <span className="thinking-dots">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <>
              <span className="bubble-who">
                {pet.name} {MOOD_EMOJI[mood]}
              </span>
              <span className="bubble-txt">{lastWord!.text}</span>
            </>
          )}
        </div>
      )}

      {/* flash rápido (feedback de acción) */}
      {flash && (
        <div className="bubble flash">
          <span className="bubble-who">{flash.emoji}</span>
          <span className="bubble-txt">{flash.text}</span>
        </div>
      )}

      {/* criatura */}
      <div className="creature-zone">
        {pet.alive && pet.event && <span className="attention-ring" />}
        <Creature
          accent={accent}
          mood={mood}
          stage={pet.stage}
          asleep={pet.asleep && pet.alive}
          alive={pet.alive}
          sick={pet.sick}
          eye={eye}
          pulse={0}
        />
        {pet.stage === 'egg' && pet.alive && <span className="mood-acc" style={{ top: '2%', left: '70%' }}>💭</span>}
      </div>

      {/* bandeja de acciones */}
      {tray && (
        <div className="action-tray" style={{ bottom: 118 }}>
          {trayItems.map((item) => (
            <button key={item.id} className="item-chip" onClick={() => doAction(tray, item.id, item.emoji)}>
              <span className="big">{item.emoji}</span>
              {item.name}
            </button>
          ))}
          {tray === 'hug' && (
            <button className="item-chip" onClick={() => doAction('hug', 'hug', '💗')}>
              <span className="big">💗</span>
              Abrazo
            </button>
          )}
        </div>
      )}

      {/* menú contextual */}
      {menuOpen && (
        <div className="action-tray" style={{ bottom: 196 }}>
          <button
            className="item-chip"
            onClick={() => {
              void ami.pet.action(pet.asleep ? 'wake' : 'sleep');
              setMenuOpen(false);
            }}
          >
            <span className="big">{pet.asleep ? '☀️' : '🌙'}</span>
            {pet.asleep ? 'Despertar' : 'Dormir'}
          </button>
          <button
            className="item-chip"
            onClick={() => {
              void ami.pet.togglePause();
              setMenuOpen(false);
            }}
          >
            <span className="big">{pet.paused ? '▶️' : '⏸️'}</span>
            {pet.paused ? 'Reanudar' : 'Pausa'}
          </button>
          <button
            className="item-chip"
            onClick={() => {
              void ami.windows.hidePet();
              setMenuOpen(false);
            }}
          >
            <span className="big">🙈</span>
            Ocultar
          </button>
          <button
            className="item-chip"
            onClick={() => {
              void ami.windows.openSettings();
              setMenuOpen(false);
            }}
          >
            <span className="big">⚙️</span>
            Ajustes
          </button>
        </div>
      )}

      {/* chat */}
      {chatOpen && (
        <div className="chat-box">
          <input
            autoFocus
            value={chatText}
            placeholder={`Habla con ${pet.name}…`}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void sendChat()}
          />
          <button onClick={() => void sendChat()} aria-label="Enviar">
            ➤
          </button>
        </div>
      )}

      {/* dock de barras */}
      <div className="needs-dock">
        {NEED_ORDER.map((k) => (
          <div
            key={k}
            className={`need-chip${pet.needs[k] < threshold ? ' low' : ''}`}
            title={`${NEED_LABELS[k]}: ${Math.round(pet.needs[k])}%`}
          >
            <span className="icon">{NEED_ICONS[k]}</span>
            <div className="track">
              <div className="fill" style={{ height: `${pet.needs[k]}%`, background: needColor(k, pet.needs[k]) }} />
            </div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="toolbar">
        {CATEGORIES.map((c) => (
          <button
            key={c.kind}
            className={`tool-btn${tray === c.kind ? ' active' : ''}`}
            title={c.label}
            onClick={() => setTray(tray === c.kind ? null : c.kind)}
          >
            {c.icon}
          </button>
        ))}
        <button className="tool-btn" title="Abrazar" onClick={() => doAction('hug', 'hug', '💗')}>
          💗
        </button>
        <button className="tool-btn" title={`Hablar con ${pet.name}`} onClick={() => setChatOpen((v) => !v)}>
          💬
        </button>
        <button className="tool-btn" title="Más opciones" onClick={() => setMenuOpen((v) => !v)}>
          ⋯
        </button>
      </div>

      {/* partículas */}
      <div className="particles">
        {particles.map((p) => (
          <span key={p.id} className="particle" style={{ left: p.left, bottom: p.bottom }}>
            {p.emoji}
          </span>
        ))}
      </div>

      {/* overlay de muerte */}
      {!pet.alive && (
        <div className="dead-overlay">
          <span className="big">💔</span>
          <p>
            {pet.name} ha cruzado el arcoíris del escritorio…
            <br />
            <small>La descuidaste demasiado, chaval.</small>
          </p>
          <button onClick={() => doAction('revive', undefined, '✨')}>¡Volver a la vida!</button>
        </div>
      )}
    </div>
  );
}
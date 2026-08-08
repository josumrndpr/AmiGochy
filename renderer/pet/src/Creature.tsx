import { useEffect, useMemo, useRef, useState } from 'react';
import type { LifeStage, Mood } from '@shared/types';

const MOOD_ACC: Partial<Record<Mood, string[]>> = {
  hambriento: ['🍖'],
  sediento: ['💦'],
  cansado: ['💤'],
  triste: ['💧'],
  sucio: ['🦠', '💨'],
  enfermo: ['🤒', '💊'],
  aburrido: ['🫥'],
  dormido: ['💤', '💤'],
  feliz: [],
  muriendo: ['💀'],
};

interface CreatureProps {
  accent: string;
  mood: Mood;
  stage: LifeStage;
  asleep: boolean;
  alive: boolean;
  sick: boolean;
  eye: { x: number; y: number };
  pulse: number;
}

export function Creature({ accent, mood, stage, asleep, alive, sick, eye, pulse }: CreatureProps) {
  void pulse;
  const gradId = useMemo(() => `g${Math.random().toString(36).slice(2, 9)}`, []);
  const [blink, setBlink] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parpadeo aleatorio
  useEffect(() => {
    const schedule = () => {
      timer.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2500 + Math.random() * 4500);
    };
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const isEgg = stage === 'egg' && alive;
  const dead = !alive;
  const acc = alive ? MOOD_ACC[mood] ?? [] : ['💀'];

  const iris = (cx: number, cy: number) => {
    const ox = eye.x * 4;
    const oy = eye.y * 3;
    return { cx: cx + ox, cy: cy + oy };
  };

  const mouth = () => {
    if (dead) return <path d="M112 172 Q130 160 148 172 Q130 182 112 172 Z" fill="#6e4a4a" />;
    if (asleep) return <path d="M114 168 Q130 178 146 168" stroke="#6e4a4a" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    switch (mood) {
      case 'hambriento':
        return (
          <g>
            <path d="M114 164 Q130 184 146 164 Z" fill="#8a4b4b" />
            <path d="M118 166 Q130 178 142 166" stroke="#f2a" strokeWidth="1.6" fill="none" />
          </g>
        );
      case 'sediento':
        return (
          <g>
            <path d="M116 164 Q130 174 142 164 Q130 180 116 164 Z" fill="#c96f4f" />
            <ellipse cx="132" cy="172" rx="7" ry="5" fill="#ff9db8" />
          </g>
        );
      case 'cansado':
        return <path d="M116 166 Q130 156 144 166" stroke="#6e4a4a" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
      case 'triste':
        return <path d="M116 176 Q130 160 144 176" stroke="#6e4a4a" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
      case 'sucio':
        return <path d="M122 174 Q130 168 138 174" stroke="#6e4a4a" strokeWidth="3" strokeLinecap="round" fill="none" transform="rotate(12 130 172)" />;
      case 'enfermo':
        return <path d="M118 166 Q130 178 142 166 M116 174 Q130 162 144 174" stroke="#5a7a5a" strokeWidth="3" strokeLinecap="round" fill="none" />;
      case 'aburrido':
        return <path d="M122 170 Q130 166 138 170" stroke="#6e4a4a" strokeWidth="3" strokeLinecap="round" fill="none" />;
      case 'feliz':
      default:
        return <path d="M110 164 Q130 188 150 164" stroke="#6e4a4a" strokeWidth="4" strokeLinecap="round" fill="none" />;
    }
  };

  const eyesMarkup = () => {
    if (!alive)
      return (
        <g className="eye-group" stroke="#3a2a2a" strokeWidth="4" strokeLinecap="round">
          <path d="M76 104 L108 136 M108 104 L76 136" />
          <path d="M166 104 L198 136 M198 104 L166 136" />
        </g>
      );
    if (asleep)
      return (
        <g>
          <path d="M70 118 Q92 132 114 118" stroke="#4a3a3a" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M144 118 Q166 132 188 118" stroke="#4a3a3a" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
    if (mood === 'cansado' || mood === 'aburrido')
      return (
        <g>
          <path d="M70 112 Q92 124 114 112" stroke="#4a3a3a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M144 112 Q166 124 188 112" stroke="#4a3a3a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );

    const eyeW = blink ? 26 : 27;
    const eyeH = blink ? 3 : 29;
    return (
      <g>
        {[96, 162].map((cx) => {
          const p = iris(cx, 116);
          return (
            <g key={cx}>
              <ellipse cx={cx} cy={116} rx={eyeW} ry={eyeH} fill="#ffffff" stroke="#00000018" strokeWidth="2" />
              {!blink && (
                <>
                  <circle cx={p.cx} cy={p.cy} r="11.5" fill="#4b3621" />
                  <circle cx={p.cx - 3} cy={p.cy - 4} r="4" fill="#ffffff" />
                </>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const cheeks = (
    <g>
      <ellipse cx="52" cy="162" rx="13" ry="9" fill="#ff8aa0" opacity="0.45" />
      <ellipse cx="208" cy="162" rx="13" ry="9" fill="#ff8aa0" opacity="0.45" />
    </g>
  );

  return (
    <div className={`creature${asleep ? ' sleeping' : ''}${!alive ? ' dead' : ''}`}>
      <svg viewBox="0 0 260 260" className="creature-svg" aria-label="AmiGochy">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="34%" stopColor={accent} stopOpacity="0.62" />
            <stop offset="100%" stopColor={accent} stopOpacity="1" />
          </radialGradient>
          <filter id={`${gradId}s`} x="-40%" y="-30%" width="180%" height="170%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#00000030" />
          </filter>
        </defs>

        {isEgg ? (
          <g filter={`url(#${gradId}s)`} className="egg">
            <ellipse cx="130" cy="152" rx="74" ry="96" fill={`url(#${gradId})`} stroke="#00000014" strokeWidth="2" />
            <path d="M96 90 Q80 64 98 52 Q114 42 124 60 Q166 36 184 68 Q198 86 174 102 Z" fill="#ffffff88" />
            <path d="M98 94 q7 16 -5 30" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
          </g>
        ) : (
          <g filter={`url(#${gradId}s)`}>
            <ellipse cx="130" cy="232" rx="62" ry="11" fill="#00000018" />
            {stage !== 'egg' && (
              <g fill={accent} opacity="0.92">
                <ellipse cx="102" cy="228" rx="22" ry="12" />
                <ellipse cx="158" cy="228" rx="22" ry="12" />
              </g>
            )}
            <path d="M82 60 Q68 26 96 20 Q118 28 114 60 Z" fill={accent} opacity="0.95" />
            <path d="M178 60 Q192 26 164 20 Q142 28 146 60 Z" fill={accent} opacity="0.95" />
            <ellipse cx="130" cy="152" rx="96" ry="84" fill={`url(#${gradId})`} stroke="#00000012" strokeWidth="2" />
            {!sick && !dead && <ellipse cx="130" cy="176" rx="56" ry="46" fill="#ffffff55" />}
            <path d="M46 148 Q26 160 40 176 q8 10 18 -10" fill={accent} opacity="0.9" />
            <path d="M214 148 Q234 160 220 176 q-8 10 -18 -10" fill={accent} opacity="0.9" />
            {eyesMarkup()}
            {mouth()}
            {(mood === 'feliz' || mood === 'muriendo') && !asleep && cheeks}
            {mood === 'cansado' && <ellipse cx="130" cy="196" rx="12" ry="6" fill="#ff8db055" />}
          </g>
        )}
      </svg>
      <div className="mood-accessories" aria-hidden>
        {acc.map((a, i) => (
          <span key={i} className="mood-acc" style={{ animationDelay: `${i * 0.5}s` }}>
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}
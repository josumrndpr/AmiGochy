# 🥚→🐣 AmiGochy

Tu peluche de escritorio: una mascota virtual con IA que vive **sobre tu pantalla**. Como el Tamagotchi de los 90, pero en tu desktop: necesita comer, beber, jugar, bañarse y cariño — si la descuidas, se enferma y puede cruzar el arcoíris. 💔

Escrito en **TypeScript + React + Electron** (proceso principal en CommonJS, renderers con Vite).

## ✨ Qué hace

- 🐾 **Mascota viva siempre encima** (overlay transparente): arrástrala por el escritorio, hace los ojos a tu cursor, parpadea, duerme, se enferma… 
- 🎭 **6 personalidades** con voz propia: Tierno, Travieso, Dormilón, Tsundere, Glotón y Sabio — cada una con frases y colores distintos.
- 📊 **Necesidades en tiempo real**: hambre, sed, energía, felicidad, higiene y sociabilidad. Si una cae, el AmiGochy te avisa con un banner.
- 🧬 **Etapas de vida**: huevo → bebé → cría → adulto → anciano. Y sí, puede morirse (después puedes revivirla con un botón).
- 🤖 **IA opcional** (OpenAI-compatible): chatea con él y reacciona a tus cuidados con su personalidad. Funciona con OpenAI, OpenRouter, Ollama o LM Studio local.
- 🔊 **Sonido sintetizado** con WebAudio — sin archivos de audio.
- ⚙️ **Configuración completa**: nombre, personalidad, color, tamaño, opacidad, click-through, IA…

## 🚀 Empezar

```bash
npm install
npm run dev        # modo desarrollo (Vite + Electron)
npm run build      # build producción
npm start          # build + lanzar
npm run dist       # AppImage para Linux
```

## 🗺️ Estructura

```
electron/             proceso principal (CommonJS)
  main.ts             arranque, ventanas, smoke-test
  petEngine.ts        simulación: necesidades, etapas, eventos, acciones
  store.ts            persistencia JSON (userData)
  ai.ts               cliente de IA con timeout
  ipc.ts              canales IPC
  windows.ts          2 ventanas (overlay pet + ajustes), tray, arrastre
renderer/
  pet/                overlay transparente: criatura SVG, burbujas, sonidos
  settings/           UI de configuración
shared/               tipos y constantes (personalidades, ítems, decays)
```

## 🧪 Smoke test

`AMIGOCHY_SMOKE=1 electron .` captura ambas ventanas en `/tmp/amigochy-*.png` y sale solo.

Hecho con ❤️ y mucha paciencia virtual.
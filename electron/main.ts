import { app, BrowserWindow, globalShortcut } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PetEngine } from './petEngine';
import { broadcast, registerIpc } from './ipc';
import { createPetWindow, createSettingsWindow, createTray, petWindow, settingsWindow } from './windows';
import { getConfig, getPet, setConfig } from './store';

let engine: PetEngine;

// ── modo smoke: captura ambas ventanas y sale ──
const SMOKE = process.env.AMIGOCHY_SMOKE === '1';
let shots = 0;

function smokeShot(win: BrowserWindow | null, tag: string): void {
  if (!SMOKE || !win || win.isDestroyed()) return;
  const out = join('/tmp', `amigochy-${tag}.png`);
  setTimeout(() => {
    void win.webContents
      .capturePage()
      .then((img) => {
        writeFileSync(out, img.toPNG());
        console.log(`[SMOKE] ${tag} -> ${out} (${img.getSize().width}x${img.getSize().height})`);
      })
      .catch((err) => console.error('[SMOKE] capture falló:', err))
      .finally(() => {
        shots += 1;
        if (shots >= 2) app.quit();
      });
  }, 2200);
}

/** Desactiva el modo fantasma (click-through) y avisa a los renderers. */
function disableGhost(): void {
  const cfg = getConfig();
  if (!cfg.overlay.clickThrough) return;
  setConfig({ overlay: { ...cfg.overlay, clickThrough: false } });
  const w = petWindow;
  if (w && !w.isDestroyed()) w.setIgnoreMouseEvents(false);
  broadcast('cfg:update', getConfig());
}

/** Activa/desactiva el modo fantasma (usado por el atajo global). */
function toggleGhost(): void {
  const cfg = getConfig();
  const next = !cfg.overlay.clickThrough;
  setConfig({ overlay: { ...cfg.overlay, clickThrough: next } });
  const w = petWindow;
  if (w && !w.isDestroyed()) {
    try {
      if (next) w.setIgnoreMouseEvents(true, { forward: true });
      else w.setIgnoreMouseEvents(false);
    } catch {
      /* no op */
    }
  }
  broadcast('cfg:update', getConfig());
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Re-lanzar la app es siempre una salida del modo fantasma
    disableGhost();
    createSettingsWindow();
    if (petWindow && !petWindow.isDestroyed()) petWindow.show();
  });

  app.whenReady().then(() => {
    app.setName('AmiGochy');
    engine = new PetEngine();
    engine.start();
    registerIpc(engine);

    createPetWindow();
    createTray();

    // El modo fantasma NUNCA se hereda de una sesión anterior: al arrancar
    // siempre se desactiva, así es imposible quedarse atrapado sin ratón.
    disableGhost();

    // Atajo global para salir del modo fantasma (funciona aunque la mascota no reciba clicks)
    try {
      globalShortcut.register('CommandOrControl+Shift+Alt+O', toggleGhost);
    } catch {
      /* en algunos escritorios los atajos globales no están disponibles */
    }

    // Primera ejecución: abre la configuración para bautizar al AmiGochy
    if (getPet() === null) createSettingsWindow();

    if (SMOKE) {
      setTimeout(() => {
        smokeShot(petWindow, 'pet');
        smokeShot(settingsWindow, 'settings');
      }, 1500);
    }
  });

  // La app vive aunque se cierre la ventana de ajustes (la mascota sigue en pantalla).
  app.on('window-all-closed', () => {
    // sin salir: solo se sale desde el tray o cmd+Q
  });

  app.on('activate', () => {
    createSettingsWindow();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('before-quit', () => {
    engine?.stop();
  });
}
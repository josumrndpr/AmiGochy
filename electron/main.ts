import { app, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PetEngine } from './petEngine';
import { registerIpc } from './ipc';
import { createPetWindow, createSettingsWindow, createTray, petWindow, settingsWindow } from './windows';
import { getPet } from './store';

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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
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

  app.on('before-quit', () => {
    engine?.stop();
  });
}
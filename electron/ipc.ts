import { ipcMain, BrowserWindow, app } from 'electron';
import { spawn, spawnSync } from 'node:child_process';
import type { ActionType } from '../shared/types';
import { getConfig, setConfig } from './store';
import { PetEngine } from './petEngine';
import { createSettingsWindow, petWindow, savePetPosition, createPetWindow, togglePetWindow } from './windows';

// En Wayland el programa no puede mover su propia ventana (setPosition es no-op).
// En Hyprland se mueve con `hyprctl dispatch movewindowpixel`; en X11, con setPosition.
let hyprAddress: string | null | undefined; // undefined = aún sin probar, null = no aplica
const hypr = (cmd: string[]) => {
  try {
    spawn('hyprctl', cmd, { stdio: 'ignore' });
  } catch {
    /* no op */
  }
};

function findHyprAddress(): string | null {
  try {
    const out = spawnSync('hyprctl', ['clients', '-j'], { encoding: 'utf8', timeout: 2000 });
    if (out.status !== 0 || !out.stdout) return null;
    const clients = JSON.parse(out.stdout) as Array<{ address: string; title: string; class: string }>;
    const pet = clients.find((c) => c.title === 'AmiGochy');
    return pet?.address ?? null;
  } catch {
    return null;
  }
}

function movePetWindow(x: number, y: number): void {
  const w = petWindow;
  if (!w || w.isDestroyed()) return;
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);

  // 1· intento: Hyprland (Wayland) — el compositor mueve la ventana
  if (process.platform === 'linux' && process.env.WAYLAND_DISPLAY && hyprAddress !== null) {
    if (hyprAddress === undefined) {
      hyprAddress = findHyprAddress();
      if (!hyprAddress) return; // sin ventana pet visible aún
    }
    hypr(['dispatch', `movewindowpixel exact ${roundedX} ${roundedY},address:${hyprAddress}`]);
    return;
  }

  // 2· intento: X11 / resto
  w.setPosition(roundedX, roundedY);
}

export function registerIpc(engine: PetEngine): void {
  // ── config ──
  ipcMain.handle('cfg:get', () => getConfig());
  ipcMain.handle('cfg:set', (_e, patch: any) => {
    const cfg = setConfig(patch ?? {});
    engine.reloadConfig();
    broadcast('cfg:update', cfg);
    return cfg;
  });
  ipcMain.handle('cfg:overlay-position', (_e, x: number, y: number) => {
    const cfg = getConfig();
    setConfig({ overlay: { ...cfg.overlay, position: { x: Math.round(x), y: Math.round(y) } } });
  });

  // ── pet ──
  ipcMain.handle('pet:get', () => engine.snapshot());
  ipcMain.handle('pet:action', (_e, type: ActionType, itemId?: string) => engine.action(type, itemId));
  ipcMain.handle('pet:chat', (_e, text: string) => engine.chat(String(text ?? '').slice(0, 500)));
  ipcMain.handle('pet:reset', () => engine.reset());
  ipcMain.handle('pet:pause', () => engine.togglePause());
  ipcMain.handle('pet:dismiss-event', () => engine.dismissEvent());

  // ── ventanas ──
  ipcMain.handle('win:open-settings', () => createSettingsWindow());
  ipcMain.handle('win:hide-pet', () => petWindow?.hide());
  ipcMain.handle('win:show-pet', () => {
    createPetWindow();
    petWindow?.show();
  });
  ipcMain.handle('win:toggle-always-on-top', () => {
    const w = petWindow;
    if (!w || w.isDestroyed()) return false;
    const next = !w.isAlwaysOnTop();
    w.setAlwaysOnTop(next, 'floating');
    const cfg = getConfig();
    setConfig({ overlay: { ...cfg.overlay, alwaysOnTop: next } });
    return next;
  });
  ipcMain.handle('win:set-click-through', (_e, value: boolean) => {
    const w = petWindow;
    if (!w || w.isDestroyed()) return false;
    try {
      if (value) w.setIgnoreMouseEvents(true, { forward: true });
      else w.setIgnoreMouseEvents(false);
      const cfg = getConfig();
      setConfig({ overlay: { ...cfg.overlay, clickThrough: value } });
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle('win:quit', () => app.quit());
  ipcMain.handle('win:platform', () => process.platform);

  // ── arrastre de la mascota (Hyprland vía hyprctl, X11 vía setPosition) ──
  ipcMain.on('pet:drag-begin', () => {
    hyprAddress = undefined; // busca la ventana de nuevo al empezar el arrastre
  });
  ipcMain.on('pet:drag-move', (_e, x: number, y: number) => {
    movePetWindow(x, y);
  });
  ipcMain.on('pet:drag-end', () => savePetPosition());
  void togglePetWindow;

  // ── push de estado y config a todos los renderers ──
  engine.subscribe((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('pet:state', state);
    }
  });
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

export { broadcast };
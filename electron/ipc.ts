import { ipcMain, BrowserWindow, app } from 'electron';
import type { ActionType } from '../shared/types';
import { getConfig, setConfig } from './store';
import { PetEngine } from './petEngine';
import { createSettingsWindow, petWindow, savePetPosition, createPetWindow, togglePetWindow } from './windows';

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

  // ── arrastre de la mascota (funciona también en Wayland) ──
  ipcMain.on('pet:drag-begin', () => {
    /* el renderer manda deltas absolutos */
  });
  ipcMain.on('pet:drag-move', (_e, x: number, y: number) => {
    const w = petWindow;
    if (!w || w.isDestroyed()) return;
    w.setPosition(Math.round(x), Math.round(y));
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
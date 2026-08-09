import { contextBridge, ipcRenderer } from 'electron';
import type { ActionType, AmiAPI, AppConfig, PetEvent, PetState } from '../shared/types';

const api: AmiAPI = {
  config: {
    get: () => ipcRenderer.invoke('cfg:get') as Promise<AppConfig>,
    set: (patch) => ipcRenderer.invoke('cfg:set', patch) as Promise<AppConfig>,
    setOverlayPosition: (x, y) => ipcRenderer.invoke('cfg:overlay-position', x, y) as Promise<void>,
  },
  pet: {
    get: () => ipcRenderer.invoke('pet:get') as Promise<PetState>,
    action: (type: ActionType, itemId?: string) => ipcRenderer.invoke('pet:action', type, itemId),
    chat: (text) => ipcRenderer.invoke('pet:chat', text),
    reset: () => ipcRenderer.invoke('pet:reset') as Promise<PetState>,
    togglePause: () => ipcRenderer.invoke('pet:pause') as Promise<PetState>,
    dismissEvent: () => ipcRenderer.invoke('pet:dismiss-event') as Promise<void>,
  },
  windows: {
    openSettings: () => void ipcRenderer.invoke('win:open-settings'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('win:toggle-always-on-top') as Promise<boolean>,
    setClickThrough: (v) => ipcRenderer.invoke('win:set-click-through', v) as Promise<boolean>,
    hidePet: () => void ipcRenderer.invoke('win:hide-pet'),
    showPet: () => void ipcRenderer.invoke('win:show-pet'),
    quit: () => void ipcRenderer.invoke('win:quit'),
    platform: () => process.platform,
  },
  onPetUpdate(cb) {
    const listener = (_: unknown, state: PetState) => cb(state);
    ipcRenderer.on('pet:state', listener);
    return () => ipcRenderer.removeListener('pet:state', listener);
  },
  onConfigUpdate(cb) {
    const listener = (_: unknown, cfg: AppConfig) => cb(cfg);
    ipcRenderer.on('cfg:update', listener);
    return () => ipcRenderer.removeListener('cfg:update', listener);
  },
  onEvent(cb) {
    const listener = (_: unknown, ev: PetEvent) => cb(ev);
    ipcRenderer.on('pet:event', listener);
    return () => ipcRenderer.removeListener('pet:event', listener);
  },
};

// Arrastre de la mascota (del renderer → main), expuesto junto al resto
contextBridge.exposeInMainWorld('ami', {
  ...api,
  drag: {
    begin: () => ipcRenderer.send('pet:drag-begin'),
    move: (x: number, y: number) => ipcRenderer.send('pet:drag-move', x, y),
    end: () => ipcRenderer.send('pet:drag-end'),
  },
});

export type AmiBridge = typeof api;
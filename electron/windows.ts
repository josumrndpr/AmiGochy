import { screen, shell, BrowserWindow, app, Menu, nativeImage, Tray } from 'electron';
import { join } from 'node:path';
import { getConfig, setConfig } from './store';

export let settingsWindow: BrowserWindow | null = null;
export let petWindow: BrowserWindow | null = null;

const devUrl = (path: string): string => {
  const base = process.env.ELECTRON_RENDERER_URL;
  return base ? `${base}/renderer/${path}/index.html` : '';
};

function loadRenderer(win: BrowserWindow, path: 'settings' | 'pet'): void {
  const url = devUrl(path);
  if (url) void win.loadURL(url);
  else void win.loadFile(join(__dirname, '../../dist/renderer', path, 'index.html'));
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new BrowserWindow({
    width: 920,
    height: 660,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: '#fdf6ec',
    title: 'AmiGochy — Configuración',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.on('ready-to-show', () => settingsWindow?.show());
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  loadRenderer(settingsWindow, 'settings');
  return settingsWindow;
}

export function createPetWindow(): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show();
    return petWindow;
  }
  const cfg = getConfig();
  const win = new BrowserWindow({
    width: 420,
    height: 540,
    x: cfg.overlay.position.x,
    y: cfg.overlay.position.y,
    transparent: true,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: cfg.overlay.alwaysOnTop,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(cfg.overlay.alwaysOnTop, 'floating');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {
    /* no op */
  }
  win.on('closed', () => {
    petWindow = null;
  });
  loadRenderer(win, 'pet');

  // el pet no debe acaparar foco al arrancar
  win.webContents.on('did-finish-load', () => win.blur());
  petWindow = win;
  return win;
}

export function savePetPosition(): void {
  const w = petWindow;
  if (!w || w.isDestroyed()) return;
  const [x, y] = w.getPosition();
  const cfg = getConfig();
  setConfig({ overlay: { ...cfg.overlay, position: { x, y } } });
}

// ─── Tray (best-effort; en Wayland puede no verse) ───
export let tray: Tray | null = null;

export function createTray(): void {
  try {
    const icon = makeIconBlob(18);
    tray = new Tray(nativeImage.createFromBuffer(icon, { width: 18, height: 18 }));
    tray.setToolTip('AmiGochy');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '⚙️ Configuración', click: () => createSettingsWindow() },
        { label: '🐾 Mostrar / ocultar Ami', click: () => togglePetWindow() },
        { type: 'separator' },
        { label: 'Salir', click: () => app.quit() },
      ]),
    );
    tray.on('click', () => togglePetWindow());
  } catch (err) {
    console.warn('[tray] no disponible:', err);
  }
}

export function togglePetWindow(): void {
  const w = petWindow;
  if (!w || w.isDestroyed()) return;
  if (w.isVisible()) w.hide();
  else w.show();
}

/** Genera un PNG simple (círculo rosado) sin dependencias. */
function makeIconBlob(size: number): Buffer {
  const bytesPerPixel = 4;
  const buf = Buffer.alloc(size * size * bytesPerPixel);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const i = (y * size + x) * bytesPerPixel;
      if (d <= r) {
        buf[i] = 0xff;
        buf[i + 1] = 0x9d;
        buf[i + 2] = 0xb8;
        buf[i + 3] = 0xff;
        // ojitos
        if (Math.hypot(x - cx + 3, y - cy - 1) < 1.6 || Math.hypot(x - cx - 3, y - cy - 1) < 1.6) {
          buf[i] = 0x2b;
          buf[i + 1] = 0x21;
          buf[i + 2] = 0x2b;
        }
      }
    }
  }
  return buf;
}
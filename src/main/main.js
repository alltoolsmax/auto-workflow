'use strict';
// Auto WorkFlow - Mr. Huỳnh · tiến trình chính (Windows + macOS)
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const pkg = require('../../package.json');
const store = require('./store');
const ipc = require('./ipc');
const updater = require('./updater');
const { Device } = require('./device');
const { License } = require('./license');

let win = null;
let device = null;
let license = null;

if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000, height: 700, minWidth: 900, minHeight: 640,
    backgroundColor: '#0b1020',
    title: 'Auto WorkFlow Mr. Huỳnh',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  ipc.setMain(win);
  // Liên kết ngoài luôn mở bằng trình duyệt, không mở trong cửa sổ app
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); openExternal(url); } });
  win.on('closed', () => { win = null; });
}

const safeUrl = (u) => typeof u === 'string' && /^(https:\/\/[^\s"<>]+|mailto:[^\s"<>]+)$/i.test(u);

function openExternal(url) {
  if (!safeUrl(url)) return false;
  shell.openExternal(url);
  return true;
}

// "Mở ứng dụng": mở link do bạn đặt ở trang quản trị bằng Chrome của người dùng; không có Chrome thì dùng trình duyệt mặc định.
function openInChrome(url) {
  return new Promise((resolve) => {
    if (!/^https:\/\/[^\s"<>]+$/i.test(url || '')) return resolve(false);
    const fallback = () => { shell.openExternal(url); resolve(true); };
    try {
      let child;
      if (process.platform === 'win32') {
        child = spawn('cmd.exe', ['/d', '/s', '/c', `start "" chrome "${url}"`], { windowsVerbatimArguments: true, windowsHide: true, stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        child = spawn('open', ['-a', 'Google Chrome', url], { stdio: 'ignore' });
      } else {
        return fallback();
      }
      child.on('error', fallback);
      child.on('exit', (code) => (code === 0 ? resolve(true) : fallback()));
    } catch { fallback(); }
  });
}

const handle = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => {
  try { return { ok: true, data: await fn(...a) }; } catch (err) { return { ok: false, error: err.message || String(err) }; }
});

function registerIpc() {
  handle('app:info', () => ({ version: pkg.version, platform: process.platform === 'darwin' ? 'mac' : 'win' }));
  handle('app:links', () => updater.links());
  handle('app:links-cached', () => updater.cachedLinks());
  handle('app:open', async (key) => {
    // "Mở ứng dụng" chỉ dành cho máy đã kích hoạt gói VĨNH VIỄN (kiểm tra ở đây, không chỉ ở giao diện)
    if (key === 'open' && !license.view().lifetime) throw new Error('Cần kích hoạt gói VĨNH VIỄN để mở ứng dụng.');
    const l = await updater.links();
    const url = l[key];
    if (!url) throw new Error(key === 'open' ? 'Chưa có link mở ứng dụng. Liên hệ người bán.'
      : key === 'trial' ? 'Chưa có link dùng thử. Liên hệ người bán.' : 'Chưa có đường dẫn này.');
    if (key === 'open' || key === 'trial') return openInChrome(url);
    return openExternal(url);
  });

  handle('lic:view', () => license.view());
  handle('lic:refresh', async () => { await license.refresh(); return license.view(); });
  handle('lic:activate', async (key) => { await license.activate(key); const v = license.view(); ipc.toMain('license:changed', v); return v; });
  handle('lic:plans', () => license.plans());
  handle('lic:order', (plan) => license.order(plan));
  handle('lic:orderStatus', (code) => license.orderStatus(code));

  handle('update:check', () => updater.check());
  handle('update:install', () => updater.install());
}

// Cập nhật tự động: kiểm tra khi mở và mỗi 6 giờ → tải ngầm (kiểm SHA-256) → báo "Cập nhật & khởi động lại".
// Bản bắt buộc (mandatory) thì tự cài ngay.
let updating = false;
async function autoUpdate() {
  if (updating) return;
  updating = true;
  try {
    const u = await updater.check();
    if (!u.available) return;
    await updater.download();
    if (u.mandatory) { updater.install(); return; }
    ipc.toMain('update:ready', { version: u.latest, notes: u.notes });
  } catch (e) { console.warn('[update]', e.message); }
  finally { updating = false; }
}

app.whenReady().then(async () => {
  const dir = app.getPath('userData');
  device = new Device(dir);
  license = new License(dir);
  device.tier = () => { const v = license.view(); return v.ok && v.kind !== 'dev' ? 'pro' : 'free'; };
  registerIpc();
  createWindow();
  license.startup().then(() => ipc.toMain('license:changed', license.view())).catch(() => {});
  device.ping();
  setInterval(() => device.ping(), 30 * 60 * 1000);
  setTimeout(autoUpdate, 4000);
  setInterval(autoUpdate, 6 * 3600 * 1000);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

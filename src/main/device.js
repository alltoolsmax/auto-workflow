'use strict';
// Đếm máy + video hướng dẫn qua máy chủ quản trị chung (active.mrhuynh.net/autoworkflow) (dùng chung máy chủ quản trị với các app khác).
// Auto WorkFlow miễn phí: không key, không gói trả phí. Máy chủ chỉ nhận mã máy ĐÃ BĂM (không thông tin cá nhân),
// phiên bản và hệ điều hành để trang quản trị đếm số máy đang dùng, và trả link video hướng dẫn / bản cập nhật.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const CFG = (() => { try { return require('./server-config.json'); } catch { return {}; } })();
const PKG = require('../../package.json');
const PRODUCT = CFG.product || 'autoworkflow';

function run(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 8000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return ''; }
}

let cached = null;
// Mã máy ổn định (không đổi khi cài lại phần mềm), đã băm SHA-256.
function machineId() {
  if (cached) return cached;
  if (process.env.AWF_MACHINE_ID) return (cached = crypto.createHash('sha256').update(process.env.AWF_MACHINE_ID).digest('hex').slice(0, 40));
  const parts = [];
  if (process.platform === 'win32') {
    const m = run('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64']).match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
    if (m) parts.push(m[1]);
  } else if (process.platform === 'darwin') {
    const m = run('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']).match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (m) parts.push(m[1]);
  } else {
    for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      try { parts.push(fs.readFileSync(f, 'utf8').trim()); break; } catch { /* thử file khác */ }
    }
  }
  if (!parts.length) parts.push(os.hostname());
  return (cached = crypto.createHash('sha256').update(`mrhuynh|${PRODUCT}|` + parts.join('|')).digest('hex').slice(0, 40));
}

class Device {
  constructor(dataDir) {
    this.dir = dataDir;
    this.server = (process.env.AWF_SERVER_URL || CFG.server_url || '').replace(/\/+$/, '');
    this.machine = machineId();
  }

  // Báo máy chủ "máy này đang mở Auto WorkFlow" (lúc mở và mỗi 30 phút).
  async ping() {
    if (!this.server) return;
    const q = new URLSearchParams({ os: process.platform === 'darwin' ? 'mac' : 'win', v: PKG.version, m: this.machine });
    if (this.tier) q.set('tier', this.tier());
    try { await fetch(this.server + '/v1/app/ping?' + q, { signal: AbortSignal.timeout(8000) }); } catch { /* bỏ qua */ }
  }

  // Link video hướng dẫn theo từng trang (sửa ở trang quản trị › Auto WorkFlow › Video hướng dẫn). Mất mạng → dùng bản đã lưu.
  async guides() {
    const cache = path.join(this.dir, 'guides.json');
    if (this.server) {
      try {
        const res = await fetch(this.server + '/v1/guides?product=' + PRODUCT, { signal: AbortSignal.timeout(8000) });
        const j = await res.json();
        const g = Object.fromEntries(Object.entries(j.guides || {}).filter(([, v]) => /^https?:\/\//.test(v)));
        fs.mkdirSync(this.dir, { recursive: true });
        fs.writeFileSync(cache, JSON.stringify(g));
        return g;
      } catch { /* dùng bản đã lưu */ }
    }
    try { return JSON.parse(fs.readFileSync(cache, 'utf8')); } catch { return {}; }
  }
}

module.exports = { Device, machineId };

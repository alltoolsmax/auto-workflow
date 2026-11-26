// Đổi tên bộ cài thành tên cố định, gom vào dist/downloads, và ghi tệp JSON để máy chủ/trang quản trị đọc:
//   awf_win.json  {version, sha256, size}                        (Windows)
//   awf_mac.json  {version, apple:{file,sha256,size}, intel:{…}}  (macOS)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const which = process.argv[2];
const v = require('../package.json').version;
const dist = path.join(__dirname, '..', 'dist');
const out = path.join(dist, 'downloads');
fs.mkdirSync(out, { recursive: true });

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const need = (name) => { const p = path.join(dist, name); if (!fs.existsSync(p)) { console.error('Thiếu file:', p); process.exit(1); } return p; };

if (which === 'win') {
  const src = need(`AutoWorkflow-Setup-${v}.exe`);
  fs.copyFileSync(src, path.join(out, 'auto_workflow_win.exe'));
  const info = { version: v, sha256: sha(src), size: fs.statSync(src).size, built_at: Math.floor(Date.now() / 1000) };
  fs.writeFileSync(path.join(out, 'awf_win.json'), JSON.stringify(info, null, 1));
  console.log('auto_workflow_win.exe', info.size, 'bytes sha256=' + info.sha256);
} else if (which === 'mac') {
  const info = { version: v, built_at: Math.floor(Date.now() / 1000) };
  for (const [chip, from, to] of [['apple', `AutoWorkflow-${v}-arm64.dmg`, 'auto_workflow_mac_apple.dmg'], ['intel', `AutoWorkflow-${v}-x64.dmg`, 'auto_workflow_mac_intel.dmg']]) {
    const src = need(from);
    fs.copyFileSync(src, path.join(out, to));
    info[chip] = { file: to, sha256: sha(src), size: fs.statSync(src).size };
    console.log(to, info[chip].size, 'bytes sha256=' + info[chip].sha256);
  }
  fs.writeFileSync(path.join(out, 'awf_mac.json'), JSON.stringify(info, null, 1));
} else {
  console.error('Dùng: node tools/make-downloads.js win|mac'); process.exit(1);
}

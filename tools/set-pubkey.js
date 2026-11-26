// Ghi khóa công khai bản quyền (Ed25519, dạng base64url) vào src/main/server-config.json.
// Dùng: node tools/set-pubkey.js <khóa>   hoặc đặt biến môi trường AWF_PUBLIC_KEY (GitHub Actions secret).
// Khóa lấy ở: active.mrhuynh.net/autoworkflow/v1/pubkey. Không có khóa → app chạy chế độ dùng thử, không kiểm tra bản quyền.
const fs = require('fs');
const path = require('path');
const key = (process.argv[2] || process.env.AWF_PUBLIC_KEY || '').trim();
if (!key) { console.log('Không có khóa công khai: bỏ qua.'); process.exit(0); }
if (!/^[A-Za-z0-9_-]{43}$/.test(key)) { console.error('Khóa công khai không đúng định dạng (43 ký tự base64url).'); process.exit(1); }
const f = path.join(__dirname, '..', 'src', 'main', 'server-config.json');
const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
cfg.public_key = key;
fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
console.log('Đã ghi khóa công khai vào', f);

// Lưu cấu hình cục bộ (JSON trong thư mục AppData). Cấu hình cục bộ:
// phiên đăng nhập nằm trong cookie của từng phân vùng trình duyệt riêng (persist:acc-<id>).
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const FILE = () => path.join(app.getPath('userData'), 'autoworkflow-data.json');
let data = null;

function load() {
  if (data) return data;
  try { data = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { data = {}; }
  data.settings = { ...(data.settings || {}) };
  return data;
}

let timer = null;
function flush() {
  if (!timer || !data) return;
  clearTimeout(timer);
  timer = null;
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  const tmp = FILE() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, FILE()); // ghi an toàn, không hỏng tệp nếu mất điện giữa chừng
}
function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 150);
}
process.on('exit', flush);

module.exports = {
  get: load,
  save,
  flush,
};

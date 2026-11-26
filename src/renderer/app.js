'use strict';
// Giao diện chính Auto WorkFlow Mr. Huỳnh
const $ = (s) => document.querySelector(s);
const fmtVnd = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';

let lic = null;       // trạng thái bản quyền
let payTimer = null;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
}

async function call(ch, ...a) {
  try { return await window.awf.call(ch, ...a); }
  catch (e) { toast(e.message); throw e; }
}

const licensed = () => Boolean(lic && lic.ok && lic.kind !== 'dev');

function renderLicense() {
  const card = $('#trialCard');
  card.classList.toggle('pro', licensed());
  if (licensed()) {
    $('#tcKicker').textContent = 'VĨNH VIỄN';
    $('#tcTitle').textContent = lic.exp ? (lic.plan_name || 'Đã kích hoạt') + ' · còn ' + lic.days_left + ' ngày' : 'Đã kích hoạt · dùng mãi mãi';
    $('#tcNote').textContent = 'Bấm để mở ứng dụng';
    $('#tcBtn').textContent = 'Mở ▶';
  } else {
    $('#tcKicker').textContent = 'DÙNG THỬ';
    $('#tcTitle').textContent = 'Miễn phí · đầy đủ tính năng';
    $('#tcNote').textContent = 'Bấm để mở ứng dụng ngay, không cần thanh toán';
    $('#tcBtn').textContent = 'Dùng thử ▶';
  }
}

async function openApp() {
  try { await window.awf.call('app:open', 'open'); }
  catch (e) { toast(e.message); }
}

/* ---------- Bản quyền: giống Max Video AI (Free Video) – bước 1 chọn gói, bước 2 quét QR ---------- */
const DEFAULT_PRICE = 299000;   // giá VĨNH VIỄN mặc định khi chưa tải được bảng giá (giá thật lấy ở trang quản trị)
const FEATURES = ['Đầy đủ tất cả tính năng', 'Được cập nhật tính năng mới', 'Chạy WorkFlow không giới hạn', 'Mua 1 lần — dùng mãi mãi, không gia hạn'];

function closeModal() { clearInterval(payTimer); payTimer = null; $('#modalRoot').innerHTML = ''; }

function copyText(text, msg = 'Đã chép') { navigator.clipboard.writeText(String(text || '')).then(() => toast(msg)).catch(() => {}); }
const copyBtn = (text, msg) => h('button', { class: 'copy', title: 'Chép', 'aria-label': 'Chép', onclick: () => copyText(text, msg) }, '⧉');

function showModal(title, icon, kids, extraClass = '') {
  closeModal();
  const box = h('div', { class: 'modal ' + extraClass, role: 'dialog', 'aria-label': title },
    h('div', { class: 'm-head' }, h('span', { class: 'mi' }, icon), h('div', { class: 'mt' }, title),
      h('button', { class: 'x-btn', 'aria-label': 'Đóng', onclick: closeModal }, '✕')),
    ...kids);
  $('#modalRoot').append(h('div', { class: 'overlay' }, box));
  return box;
}

async function activateKey(key, btn) {
  key = String(key || '').trim();
  if (!key) return false;
  if (btn) btn.disabled = true;
  try {
    lic = await window.awf.call('lic:activate', key);
    renderLicense(); closeModal(); toast('Kích hoạt thành công!'); openApp();
    return true;
  } catch (e) { toast(e.message); return false; } finally { if (btn) btn.disabled = false; }
}

// BƯỚC 1 – màn hình bản quyền: giới thiệu + mã máy, thẻ gói VĨNH VIỄN, ô nhập key, dùng thử
async function openPayment() {
  const v = lic || {};
  const machine = v.machine || '';
  const keyInput = h('input', { id: 'keyInput', placeholder: 'Nhập key, ví dụ AWF-XXXX-XXXX-XXXX', autocomplete: 'off', spellcheck: 'false' });
  const actBtn = h('button', { class: 'btn-grad', onclick: () => activateKey(keyInput.value, actBtn).then((ok) => ok || keyInput.focus()) }, '🔑 Kích hoạt');
  keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') actBtn.click(); });
  const priceEl = h('span', { class: 'price' }, '…');
  const buyBtn = h('button', { class: 'btn-grad wide', disabled: true }, '▦ Mua ngay');
  const notice = h('div', { class: 'status warn', hidden: true }, h('span', { class: 'sd' }), h('span', {}, ''));

  showModal('Kích hoạt Auto WorkFlow', '★', [h('div', { class: 'lic-body' },
    h('div', { class: 'lic-hero' }, h('img', { src: '../../assets/icon.png', alt: '' }),
      h('div', { class: 'grow' }, h('b', {}, 'Chọn gói để bắt đầu'), h('small', {}, 'Mua 1 lần, dùng Auto WorkFlow mãi mãi trên máy này')),
      h('div', { class: 'machine' }, h('small', {}, 'Mã máy'), h('div', {}, h('code', {}, machine.slice(0, 16) + (machine ? '…' : '')), machine ? copyBtn(machine, 'Đã chép mã máy') : null))),
    h('div', { class: 'label' }, 'Chọn gói'),
    h('div', { class: 'plan big hot' },
      h('span', { class: 'ribbon' }, 'Mua 1 lần, dùng mãi mãi'),
      h('div', { class: 'plan-top' }, h('span', { class: 'star' }, '★'), h('b', {}, 'VĨNH VIỄN')),
      priceEl,
      h('span', { class: 'per' }, 'thanh toán 1 lần duy nhất'),
      h('ul', { class: 'plan-feats' }, FEATURES.map((t) => h('li', {}, h('span', { class: 'ck' }, '✓'), t))),
      h('div', { class: 'acts' }, buyBtn,
        h('button', { class: 'btn-text', onclick: () => {
          copyText(`Mua Auto WorkFlow – gói VĨNH VIỄN (${priceEl.textContent})\nMã máy: ${machine}`, 'Đã chép tin nhắn — dán vào Zalo rồi gửi');
          window.awf.call('app:open', 'zalo').catch(() => {});
        } }, '💬 Qua Zalo'))),
    notice,
    h('div', {}, h('div', { class: 'label' }, 'Đã có key? Nhập vào đây'), h('div', { class: 'key-row' }, keyInput, actBtn)),
    h('div', { class: 'lic-note' }, '✓ 1 key cho 1 máy · hỗ trợ trực tiếp qua Zalo 0979 007 367')),
    h('div', { class: 'm-foot' }, h('div', { class: 'm-actions' },
      h('button', { class: 'btn-ghost', onclick: closeModal }, '← Quay lại'),
      h('button', { class: 'btn-trial', onclick: () => { closeModal(); openApp(); } }, 'Tiếp tục dùng thử và mở ứng dụng →')))], 'lic-modal');

  let plan = null; let payment = false;
  try {
    const data = await window.awf.call('lic:plans');
    const plans = (data && data.plans) || [];
    plan = plans.find((p) => Number(p.days) === 0) || plans[0] || null;
    payment = Boolean(data && data.payment);
  } catch {}
  priceEl.textContent = fmtVnd(plan ? plan.price : DEFAULT_PRICE);
  if (plan && payment) {
    buyBtn.disabled = false;
    buyBtn.onclick = () => openQR(plan);
  } else {
    notice.hidden = false;
    notice.lastChild.textContent = 'Chưa tải được thông tin thanh toán (kiểm tra mạng). Bấm "Qua Zalo" để mua key, hoặc tiếp tục dùng thử.';
  }
}

// BƯỚC 2 – quét QR, tự kích hoạt khi nhận tiền
async function openQR(plan) {
  const statusEl = h('div', { class: 'status wait' }, h('span', { class: 'sd' }), h('span', {}, 'Đang tạo đơn thanh toán…'));
  const pay = h('div', { class: 'pay' }, h('div', { class: 'qr-box' }, h('div', { class: 'scan' }), h('div', { class: 'ph' }, 'Đang tạo mã QR…')));
  showModal('Thanh toán gói ' + plan.name, '▦', [h('div', { class: 'pay-body' }, pay, statusEl),
    h('div', { class: 'm-foot center' }, h('button', { class: 'btn-ghost', onclick: () => openPayment() }, '← Chọn gói khác'))], 'pay-modal');
  const setStatus = (cls, text) => { statusEl.className = 'status ' + cls; statusEl.lastChild.textContent = text; };
  let o;
  try { o = await window.awf.call('lic:order', plan.code); } catch (e) { setStatus('err', e.message); return; }
  const bank = o.bank || {};
  pay.innerHTML = '';
  pay.append(
    h('div', { class: 'qr-box' }, o.qr_url ? h('img', { src: o.qr_url, alt: 'Mã QR chuyển khoản' }) : h('div', { class: 'ph' }, 'Quét bằng app ngân hàng')),
    h('div', { class: 'amount' }, fmtVnd(o.amount)),
    h('div', { class: 'pay-rows' },
      bank.id ? h('div', { class: 'row' }, h('span', {}, 'Ngân hàng'), h('b', {}, bank.id)) : null,
      h('div', { class: 'row' }, h('span', {}, 'Số tài khoản'), h('b', {}, bank.account || '', copyBtn(bank.account || ''))),
      bank.name ? h('div', { class: 'row' }, h('span', {}, 'Chủ tài khoản'), h('b', {}, bank.name)) : null),
    h('div', { class: 'code-row' }, h('div', {}, h('small', {}, 'Nội dung chuyển khoản'), h('b', {}, o.content)), copyBtn(o.content)),
    h('div', { class: 'help' }, `Quét bằng app ngân hàng bất kỳ · giữ đúng nội dung CK · hết hạn sau ${Math.round((o.expires_in || 1800) / 60)} phút`));
  setStatus('wait', 'Đang chờ chuyển khoản… tự kích hoạt ngay khi nhận tiền.');
  clearInterval(payTimer);
  payTimer = setInterval(async () => {
    let s;
    try { s = await window.awf.call('lic:orderStatus', o.code); } catch { return; }
    if (s.status === 'paid' && s.key) {
      clearInterval(payTimer);
      setStatus('ok', 'Đã nhận tiền! Đang kích hoạt…');
      if (!(await activateKey(s.key))) setStatus('warn', 'Key của bạn: ' + s.key + ' – nhập vào ô "Đã có key?" để kích hoạt.');
    } else if (s.status === 'review') {
      clearInterval(payTimer); setStatus('warn', 'Số tiền chưa đủ. Người bán sẽ kiểm tra và xử lý — liên hệ Zalo 0979 007 367.');
    } else if (s.status === 'expired') {
      clearInterval(payTimer); setStatus('err', 'Đơn đã hết hạn. Bấm "Chọn gói khác" để tạo đơn mới.');
    }
  }, 3000);
}

/* ---------- Khởi động ---------- */
async function init() {
  $('#openBtn').addEventListener('click', () => { if (licensed() || (lic && lic.kind === 'dev')) openApp(); else openPayment(); });
  $('#trialCard').addEventListener('click', openApp);
  $('#guideBtn').addEventListener('click', async () => {
    try { await window.awf.call('app:open', 'guide'); } catch (e) { toast('Chưa có video hướng dẫn. Liên hệ Zalo 0979 007 367.'); }
  });
  document.querySelectorAll('[data-link]').forEach((b) => b.addEventListener('click', () => window.awf.call('app:open', b.dataset.link).catch((e) => toast(e.message))));

  window.awf.on('license:changed', (v) => { lic = v; renderLicense(); });
  window.awf.on('update:ready', (u) => {
    $('#updateText').textContent = `Có bản mới v${u.version} đã tải xong`;
    $('#updateBanner').hidden = false;
  });
  $('#updateBtn').addEventListener('click', () => window.awf.call('update:install').catch((e) => toast(e.message)));

  try { const i = await window.awf.call('app:info'); $('#ver').textContent = 'v' + i.version; } catch {}
  try { lic = await window.awf.call('lic:view'); } catch {}
  renderLicense();
  window.awf.call('app:links').catch(() => {});   // làm nóng bộ nhớ đệm liên kết từ trang quản trị
}
init();

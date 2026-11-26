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

/* ---------- Bảng thanh toán gói VĨNH VIỄN ---------- */
function closeModal() { clearInterval(payTimer); payTimer = null; $('#modalRoot').innerHTML = ''; }

async function openPayment() {
  closeModal();
  const statusEl = h('div', { class: 'status wait' }, h('span', { class: 'sd' }), h('span', {}, 'Đang tạo đơn thanh toán…'));
  const qrBox = h('div', { class: 'qr-box' }, h('div', { class: 'scan' }), h('div', { class: 'ph' }, 'Đang tạo mã QR…'));
  const amount = h('div', { class: 'amount' }, '…');
  const info = h('div', { class: 'm-info' });
  const keyInput = h('input', { id: 'keyInput', placeholder: 'AWF-XXXX-XXXX-XXXX', autocomplete: 'off', spellcheck: 'false' });
  const actBtn = h('button', { class: 'btn-grad', onclick: () => activate(keyInput.value) }, 'Kích hoạt');
  keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') activate(keyInput.value); });

  const root = $('#modalRoot');
  root.append(h('div', { class: 'overlay' }, h('div', { class: 'modal', role: 'dialog', 'aria-label': 'Thanh toán gói VĨNH VIỄN' },
    h('div', { class: 'm-head' }, h('span', { class: 'mi' }, '▦'), h('div', { class: 'mt' }, 'Thanh toán gói VĨNH VIỄN'),
      h('button', { class: 'x-btn', 'aria-label': 'Đóng', onclick: closeModal }, '✕')),
    h('div', { class: 'm-body' }, h('div', { class: 'm-qr' }, qrBox, amount), info),
    h('div', { class: 'm-foot' },
      h('div', { class: 'key-row' }, h('label', { for: 'keyInput' }, 'Đã có key?'), keyInput, actBtn),
      h('div', { class: 'm-actions' },
        h('button', { class: 'btn-ghost', onclick: closeModal }, '← Quay lại'),
        h('button', { class: 'btn-trial', onclick: () => { closeModal(); openApp(); } }, 'Tiếp tục dùng thử và mở ứng dụng →'))))));

  const setStatus = (cls, text) => { statusEl.className = 'status ' + cls; statusEl.lastChild.textContent = text; };

  async function activate(key) {
    key = String(key || '').trim();
    if (!key) { keyInput.focus(); return; }
    actBtn.disabled = true;
    try {
      lic = await window.awf.call('lic:activate', key);
      renderLicense(); closeModal(); toast('Kích hoạt thành công!'); openApp();
    } catch (e) { toast(e.message); } finally { actBtn.disabled = false; }
  }

  try {
    const data = await window.awf.call('lic:plans');
    const plans = (data && data.plans) || [];
    const plan = plans.find((p) => Number(p.days) === 0) || plans[0];
    if (!plan || !data.payment) {
      info.append(h('div', { class: 'status warn' }, h('span', { class: 'sd' }), h('span', {}, 'Chưa tải được thông tin thanh toán. Liên hệ Zalo 0979 007 367 để mua key, hoặc dùng thử.')));
      qrBox.lastChild.textContent = 'Chưa có mã QR'; amount.textContent = plan ? fmtVnd(plan.price) : '—';
      return;
    }
    const o = await window.awf.call('lic:order', plan.code);
    amount.textContent = fmtVnd(o.amount);
    qrBox.lastChild.replaceWith(o.qr_url ? h('img', { src: o.qr_url, alt: 'Mã QR chuyển khoản' }) : h('div', { class: 'ph' }, 'Quét bằng app ngân hàng'));
    const copyBtn = (text) => h('button', { class: 'copy', 'aria-label': 'Chép', onclick: () => { navigator.clipboard.writeText(text).then(() => toast('Đã chép')); } }, '⧉');
    const bank = o.bank || {};
    info.append(
      bank.id ? h('div', { class: 'row' }, h('span', {}, 'Ngân hàng'), h('b', {}, bank.id)) : null,
      h('div', { class: 'row' }, h('span', {}, 'Số tài khoản'), h('b', {}, bank.account || '', copyBtn(bank.account || ''))),
      bank.name ? h('div', { class: 'row' }, h('span', {}, 'Chủ tài khoản'), h('b', {}, bank.name)) : null,
      h('div', { class: 'code-row' }, h('div', {}, h('small', {}, 'Nội dung chuyển khoản'), h('b', {}, o.content)), copyBtn(o.content)),
      h('div', { class: 'help' }, `Quét bằng app ngân hàng bất kỳ · giữ đúng nội dung chuyển khoản · đơn hết hạn sau ${Math.round((o.expires_in || 1800) / 60)} phút`),
      statusEl);
    setStatus('wait', 'Đang chờ chuyển khoản… tự kích hoạt ngay khi nhận tiền.');
    payTimer = setInterval(async () => {
      let s;
      try { s = await window.awf.call('lic:orderStatus', o.code); } catch { return; }
      if (s.status === 'paid' && s.key) {
        clearInterval(payTimer);
        setStatus('ok', 'Đã nhận tiền! Đang kích hoạt…');
        await activate(s.key);
      } else if (s.status === 'review') {
        clearInterval(payTimer); setStatus('warn', 'Số tiền chưa đủ. Người bán sẽ kiểm tra và xử lý, liên hệ Zalo 0979 007 367.');
      } else if (s.status === 'expired') {
        clearInterval(payTimer); setStatus('err', 'Đơn đã hết hạn. Hãy đóng và mở lại để tạo đơn mới.');
      }
    }, 3000);
  } catch (e) {
    info.append(h('div', { class: 'status err' }, h('span', { class: 'sd' }), h('span', {}, e.message)));
  }
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

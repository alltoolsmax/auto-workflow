'use strict';
// Bản quyền Auto WorkFlow — cùng cơ chế với Video AI:
//  - 2 gói: TRẢI NGHIỆM (30 ngày) và VĨNH VIỄN (mua 1 lần). Không có gói miễn phí: chưa có key thì app khoá.
//  - Mua online: VietQR + SePay → máy chủ tự cấp key → phần mềm tự kích hoạt khi nhận tiền.
//  - Máy chủ (active.mrhuynh.net/autoworkflow) cấp "giấy phép" = base64url(JSON) + "." + chữ ký Ed25519.
//  - Phần mềm chỉ có KHÓA CÔNG KHAI (server-config.json) → kiểm tra được nhưng không tự tạo / sửa được giấy phép.
//  - Giấy phép gắn mã máy (đã băm). Kiểm tra lại mỗi 24 giờ; mất mạng dùng tiếp tối đa 3 ngày; lùi đồng hồ bị phát hiện.
//  - Mỗi key 1 máy; tự chuyển máy 1 lần / 30 ngày; người bán "Đổi máy" trong trang quản trị.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { machineId } = require('./device');

const CFG = (() => { try { return require('./server-config.json'); } catch { return {}; } })();
const PKG = require('../../package.json');
const PRODUCT = CFG.product || 'autoworkflow';

const MESSAGES = {
  none: 'Chưa kích hoạt bản quyền.',
  expired: 'Gói đã hết hạn. Mua hoặc nhập key mới để tiếp tục.',
  revoked: 'Key đã bị khóa. Liên hệ người bán.',
  moved: 'Key đã được chuyển sang máy khác.',
  bad_key: 'Key không đúng. Kiểm tra lại từng ký tự.',
  bad_signature: 'Giấy phép không hợp lệ.',
  wrong_machine: 'Giấy phép không thuộc máy này.',
  clock: 'Đồng hồ máy bị lùi. Hãy chỉnh lại giờ rồi kết nối mạng để kiểm tra bản quyền.',
  need_online: 'Đã quá 3 ngày không kết nối mạng. Hãy kết nối để kiểm tra bản quyền.',
  no_network: 'Không kết nối được máy chủ bản quyền. Kiểm tra mạng rồi thử lại.',
  used: 'Key này đã được dùng để gia hạn.',
};

const b64urlDecode = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

class LicenseError extends Error {
  constructor(code, message, extra) { super(message || MESSAGES[code] || code); this.code = code; this.extra = extra || {}; }
}

class License {
  constructor(dataDir) {
    this.dir = dataDir;
    this.store = path.join(dataDir, 'license.dat');
    this.server = (process.env.AWF_LICENSE_URL || process.env.AWF_SERVER_URL || CFG.server_url || '').replace(/\/+$/, '');
    this.publicKey = process.env.AWF_LICENSE_PUBKEY || CFG.public_key || '';
    this.contact = { zalo: 'https://zalo.me/0979007367', phone: '0979007367' };
    this.machine = machineId();
    this.status = { ok: false, reason: 'none', message: MESSAGES.none };
  }

  get enabled() { return Boolean(this.server && this.publicKey); }

  read() {
    try { return JSON.parse(Buffer.from(Buffer.from(fs.readFileSync(this.store, 'utf8'), 'base64').map((b) => b ^ 0x5a)).toString()); }
    catch { return {}; }
  }
  write(d) {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.store, Buffer.from(Buffer.from(JSON.stringify(d)).map((b) => b ^ 0x5a)).toString('base64'));
  }

  verify(token) {
    let payload;
    try {
      const [body, sig] = String(token).split('.');
      const key = crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: this.publicKey }, format: 'jwk' });
      if (!crypto.verify(null, Buffer.from(body), key, b64urlDecode(sig))) throw new Error('sig');
      payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    } catch { throw new LicenseError('bad_signature'); }
    if (payload.p !== PRODUCT) throw new LicenseError('bad_signature');
    if (payload.m !== this.machine) throw new LicenseError('wrong_machine');
    return payload;
  }

  fromPayload(p, offline = false) {
    const exp = Number(p.exp || 0);
    const base = { kind: p.kind || '', plan: p.plan || '', plan_name: p.plan_name || '', exp, key: p.key || '', offline };
    if (exp && exp * 1000 <= Date.now()) return { ok: false, ...base, reason: 'expired', message: MESSAGES.expired };
    return { ok: true, ...base };
  }

  local() {
    if (!this.enabled) { this.status = { ok: true, kind: 'dev', plan_name: 'Bản phát triển' }; return this.status; }
    const d = this.read();
    if (!d.token) { this.status = { ok: false, reason: d.reason || 'none', message: d.message || MESSAGES.none }; return this.status; }
    let payload;
    try { payload = this.verify(d.token); }
    catch (e) { this.status = { ok: false, reason: e.code, message: e.message }; return this.status; }
    const t = Date.now() / 1000;
    let st = this.fromPayload(payload);
    if (st.ok) {
      if (t + 3600 < Number(d.seen || 0)) st = { ok: false, kind: st.kind, reason: 'clock', message: MESSAGES.clock };
      else if (t > Number(payload.chk || 0) + Number(payload.grace || 3 * 86400)) st = { ok: false, kind: st.kind, exp: st.exp, reason: 'need_online', message: MESSAGES.need_online };
      else { d.seen = Math.max(t, Number(d.seen || 0)); this.write(d); }
    }
    this.status = st;
    return st;
  }

  dueCheck() {
    try { return Date.now() / 1000 >= Number(this.verify(this.read().token).chk || 0); } catch { return true; }
  }

  async send(route, { method = 'GET', body, timeout = 15000 } = {}) {
    let res;
    try {
      res = await fetch(this.server + route, {
        method, signal: AbortSignal.timeout(timeout),
        headers: { 'content-type': 'application/json', 'user-agent': `AutoWorkflow/${PKG.version}` },
        body: body ? JSON.stringify({ product: PRODUCT, machine: this.machine, app_version: PKG.version, ...body }) : undefined,
      });
    } catch { throw new LicenseError('no_network'); }
    let j = {};
    try { j = await res.json(); } catch { throw new LicenseError('no_network', `Máy chủ bản quyền lỗi (${res.status}).`); }
    if (!res.ok || j.ok === false) throw new LicenseError(j.code || 'error', j.message || `Lỗi ${res.status}`, j);
    return j;
  }

  accept(res) {
    const payload = this.verify(res.token);           // luôn tự kiểm tra chữ ký của máy chủ
    const d = this.read();
    d.token = res.token;
    if (res.full_key) d.key = res.full_key;
    delete d.reason; delete d.message;
    d.seen = Math.max(Date.now() / 1000, Number(d.seen || 0));
    this.write(d);
    this.status = this.fromPayload(payload);
    return this.status;
  }

  async activate(key) {
    if (!this.enabled) return this.local();
    const res = await this.send('/v1/activate', { method: 'POST', body: { key: String(key).replace(/\s+/g, '').toUpperCase() } });
    const st = this.accept(res);
    return { ...st, renewed: Boolean(res.renewed), added_days: res.added_days || 0 };
  }

  async refresh(timeout = 15000) {
    if (!this.enabled) return this.local();
    const d = this.read();
    if (!d.key) return this.local();
    try {
      return this.accept(await this.send('/v1/check', { method: 'POST', body: { key: d.key }, timeout }));
    } catch (e) {
      if (e.code === 'no_network') { const st = this.local(); st.offline = true; return st; }
      if (['revoked', 'moved', 'expired', 'bad_key'].includes(e.code)) {
        delete d.token; d.reason = e.code; d.message = e.message; this.write(d);
        this.status = { ok: false, reason: e.code, message: e.message };
        return this.status;
      }
      throw e;
    }
  }

  async startup() {
    const st = this.local();
    if (!this.enabled || (st.ok && !this.dueCheck())) return st;
    if (!this.read().key) return st;
    try { return await this.refresh(8000); }
    catch (e) { return this.local(); }
  }

  // Dạng gửi sang giao diện
  view() {
    const s = this.status || {};
    const ok = Boolean(s.ok);
    const daysLeft = s.exp ? Math.max(0, Math.ceil((s.exp * 1000 - Date.now()) / 86400000)) : null;
    let label = 'Chưa kích hoạt';
    if (s.kind === 'dev') label = 'Bản phát triển';
    else if (ok) label = s.exp ? `${s.plan_name || 'TRẢI NGHIỆM'} · còn ${daysLeft} ngày` : `${s.plan_name || 'VĨNH VIỄN'} · vĩnh viễn`;
    else if (s.reason === 'expired') label = 'Đã hết hạn';
    return { enabled: this.enabled, ok, kind: s.kind || '', label, plan: s.plan || '', plan_name: s.plan_name || '', exp: s.exp || 0, lifetime: ok && !s.exp && s.kind !== 'dev',
      days_left: daysLeft, key: s.key || '', reason: s.reason || '', message: s.message || '', offline: Boolean(s.offline),
      machine: this.machine, contact: this.contact };
  }

  async plans() {
    const cache = path.join(this.dir, 'plans.json');
    if (this.enabled) {
      try { const j = await this.send('/v1/plans?product=' + PRODUCT, { timeout: 8000 }); fs.writeFileSync(cache, JSON.stringify(j)); return j; }
      catch { /* dùng bản đã lưu */ }
    }
    try { return JSON.parse(fs.readFileSync(cache, 'utf8')); } catch { return { plans: [], payment: false, contact: this.contact }; }
  }

  order(plan) { return this.send('/v1/order', { method: 'POST', body: { plan } }); }
  orderStatus(code) { return this.send(`/v1/order?code=${encodeURIComponent(code)}&machine=${this.machine}`, { timeout: 10000 }); }
}

module.exports = { License, LicenseError, MESSAGES };

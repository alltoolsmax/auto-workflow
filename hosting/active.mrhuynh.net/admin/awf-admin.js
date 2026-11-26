/* Auto WorkFlow - Mr. Huỳnh · mục quản trị trong trang chung active.mrhuynh.net/admin.
   index.html nạp file này sau script chính; dùng lại $, esc, dt, fmt, api, toast, go, R, TABS của trang. */
(function () {
  // ---- Gắn vào TRANG QUẢN TRỊ CHUNG (index.html): thêm nút "Auto WorkFlow" cạnh Video AI · Voice AI · GCloud Hub ·
  // Max AI, chuyển các lệnh w_… sang awf.php. Mở riêng awf.html thì phần này không chạy (trang đó tự lo).
  const bar = document.querySelector('header .prod');
  if (bar && typeof setProd === 'function') {
    if (!document.getElementById('pa')) {
      bar.insertAdjacentHTML('beforeend', '<button id="pa" class="awf" onclick="setProd(\'awf\')">🔀 Auto WorkFlow</button>');
      const st = document.createElement('style');
      st.textContent = '.prod button.on.awf{background:#5a3410;border-color:var(--ac)}';
      document.head.appendChild(st);
    }
    const baseApi = window.api;
    window.api = async function (a, body, qs = '') {
      if (!/^w_/.test(a)) return baseApi(a, body, qs);
      const r = await fetch('awf.php?a=' + a + qs, { method: body ? 'POST' : 'GET',
        headers: { 'x-admin-token': T, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      let j; try { j = await r.json(); } catch (e) { j = { ok: false, message: 'Máy chủ trả về lỗi ' + r.status }; }
      if (r.status == 401) { logout(); throw j; }
      if (!j.ok) toast(j.message || 'Lỗi');
      return j;
    };
    const baseSet = window.setProd;
    window.setProd = function (p) {
      baseSet(p);
      document.getElementById('pa').classList.toggle('on', p == 'awf');
    };
    // đang ở mục Auto WorkFlow lúc tải lại trang → bật đúng nút
    try { if (localStorage.getItem('prod') == 'awf' && document.getElementById('app').style.display != 'none') window.setProd('awf'); } catch (e) {}
  }

  const AW = (a, body, qs) => api('w_' + a, body, qs);
  const ago = (t) => { const x = Date.now() / 1000 - t; return x < 120 ? 'vừa xong' : x < 3600 ? Math.floor(x / 60) + ' phút trước' : x < 86400 ? Math.floor(x / 3600) + ' giờ trước' : Math.floor(x / 86400) + ' ngày trước'; };
  const mb = (n) => (n ? (n / 1048576).toFixed(1) + ' MB' : '');

  TABS.awf = [['w_stats', 'Tổng quan'], ['w_installs', 'Máy đã cài'], ['w_links', 'Liên kết & video'], ['w_orders', 'Đơn hàng'], ['w_release', 'Phát hành & cập nhật'], ['w_events', 'Nhật ký']];

  const LINKS = [
    ['open', 'Nút “Mở ứng dụng” – CHỈ khách đã kích hoạt VĨNH VIỄN (mở bằng Chrome)', 'https://flow.google.com/project/…/tool/…'],
    ['trial', 'Nút “Dùng thử” – ai cũng mở được (mở bằng Chrome)', 'https://…'],
    ['guide', 'Nút “Xem video hướng dẫn” (YouTube)', 'https://www.youtube.com/watch?v=…'],
    ['tools', 'Nút “Khám phá tiện ích AI khác”', 'https://mrhuynh.net/tools'],
    ['zalo', 'Zalo', 'https://zalo.me/0979007367'],
    ['email', 'Email (dạng mailto:)', 'mailto:info@mrhuynh.net'],
    ['website', 'Website', 'https://mrhuynh.net'],
    ['facebook', 'Facebook', 'https://facebook.com/…'],
  ];

  Object.assign(R, {
    async w_stats(m) {
      const [s, ins] = await Promise.all([AW('stats'), AW('installs').catch(() => null)]);
      const st = (ins && ins.ok && ins.stats) || {};
      m.innerHTML = `<div class="cards">
        <div class="card"><span>Tổng máy đã cài</span><b>${st.total ?? '—'}</b></div>
        <div class="card"><span>Đang mở (35 phút)</span><b>${st.online ?? '—'}</b></div>
        <div class="card"><span>Hoạt động 24 giờ</span><b>${st.active_24h ?? '—'}</b></div>
        <div class="card"><span>Dùng trong 30 ngày</span><b>${st.used_30d ?? '—'}</b></div>
        <div class="card"><span>Máy mới (7 ngày)</span><b>${st.new_7d ?? '—'}</b></div>
        <div class="card"><span>VĨNH VIỄN / Dùng thử (30 ngày)</span><b>${st.pro_30d ?? 0} / ${st.free_30d ?? 0}</b></div>
        <div class="card"><span>Windows / macOS (30 ngày)</span><b>${st.win_30d ?? 0} / ${st.mac_30d ?? 0}</b></div>
        <div class="card"><span>Bản đang phát hành</span><b style="font-size:18px">${[st.release_win && 'Win v' + esc(st.release_win), st.release_mac && 'Mac v' + esc(st.release_mac)].filter(Boolean).join(' · ') || '—'}</b></div></div>
        <div class="cards" style="margin-top:14px">
        <div class="card"><span>Key VĨNH VIỄN đang dùng</span><b>${s.active}</b></div>
        <div class="card"><span>Đơn chờ chuyển khoản</span><b>${s.pending}</b></div>
        <div class="card"><span>Đơn thiếu tiền / cần xem</span><b style="color:${s.review ? 'var(--warn)' : ''}">${s.review}</b></div>
        <div class="card"><span>Doanh thu hôm nay</span><b>${fmt(s.revenue_today)}</b></div>
        <div class="card"><span>Doanh thu 30 ngày</span><b>${fmt(s.revenue_30d)}</b></div>
        <div class="card"><span>Tổng doanh thu</span><b>${fmt(s.revenue_all)}</b></div></div>
        <p class="mu">Máy đang mở = phần mềm báo về trong 35 phút gần nhất. App chỉ gửi mã máy đã băm, phiên bản và hệ điều hành.</p>`;
    },

    async w_installs(m) {
      const j = await AW('installs', { limit: 300 });
      const L = j.list || [];
      m.innerHTML = `<div class="row"><label style="flex:1">Tìm máy<input id="wq" placeholder="Mã máy hoặc key" oninput="R.wFilter()"></label>
        <span class="mu" style="align-self:center">${j.stats ? j.stats.total : L.length} máy đã cài</span></div>
        <table id="wtbl"><tr><th>Mã máy</th><th>Hệ điều hành</th><th>Phiên bản</th><th>Cài lần đầu</th><th>Hoạt động gần nhất</th><th>Gói</th><th>Key</th></tr>` +
        L.map((x) => `<tr data-q="${esc((x.machine + ' ' + (x.key || '')).toLowerCase())}"><td class="mono">${esc(String(x.machine).slice(0, 12))}…</td>
          <td>${x.os == 'mac' ? 'macOS' : 'Windows'}</td><td>${esc(x.version || '?')}</td><td class="mu">${d(+x.first_at)}</td>
          <td class="mu">${ago(+x.last_at)}</td><td>${x.tier == 'pro' ? '<span class="tag t-paid">VĨNH VIỄN</span>' : '<span class="tag">Dùng thử</span>'}</td>
          <td class="k">${esc(x.key || '')}</td></tr>`).join('') + '</table>';
    },
    wFilter() { const q = $('#wq').value.trim().toLowerCase(); document.querySelectorAll('#wtbl tr[data-q]').forEach((r) => { r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'; }); },

    async w_links(m) {
      const j = await AW('links');
      m.innerHTML = `<div class="box"><h3>Tất cả liên kết trong ứng dụng</h3>
        <p class="mu" style="margin-top:0">Sửa ở đây, app của khách tự nhận link mới ở lần mở sau (không cần cập nhật lại app). Link phải bắt đầu bằng https:// (email dạng mailto:). Để trống = ẩn / chưa đặt.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px">` +
        LINKS.map(([k, label, ph]) => `<label>${label}<input id="wl_${k}" value="${esc((j.links || {})[k] || '')}" placeholder="${esc(ph)}" style="width:100%;box-sizing:border-box"></label>`).join('') +
        `</div></div>
        <div class="box"><h3>Gói VĨNH VIỄN</h3><label>Giá (VNĐ)<input id="wl_price" value="${+j.price || ''}" style="width:160px"></label>
        <p class="mu">Gói dùng thử là chế độ miễn phí trong app, luôn mở được, không có key.</p></div>
        <p><button onclick="R.wSaveLinks()">💾 Lưu tất cả</button></p>`;
    },
    async wSaveLinks() {
      const links = {}; LINKS.forEach(([k]) => { links[k] = $('#wl_' + k).value.trim(); });
      const j = await AW('links', { links, price: $('#wl_price').value.trim() });
      if (j.ok) { toast('Đã lưu. App của khách sẽ nhận link mới ở lần mở sau.'); go('w_links'); }
    },

    async w_orders(m) {
      const j = await AW('orders');
      const tag = (s) => ({ paid: 't-paid', pending: '', review: 't-exp', expired: 't-revoked' }[s] || '');
      m.innerHTML = `<table><tr><th>Lúc</th><th>Mã đơn</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Key</th></tr>` +
        (j.orders || []).map((o) => `<tr><td class="mu">${dt(+o.created_at)}</td><td class="mono">${esc(o.code)}</td><td>${esc(o.plan)}</td><td>${fmt(+o.amount)}</td>
          <td><span class="tag ${tag(o.status)}">${esc(o.status)}</span></td><td class="k">${esc(o.key || '')}</td></tr>`).join('') + '</table>' +
        '<p class="mu">Đơn thiếu tiền (review) cần xử lý tay: xác nhận ở mục Đơn hàng của Video AI/Max AI hoặc cấp key thủ công qua lệnh w_order_paid.</p>';
    },

    async w_release(m) {
      const j = await AW('releases');
      const L = (j.releases || []).find((r) => +r.id == j.latest_id);
      const G = j.win_github || {}, M = j.mac_github || {};
      const gh = 'https://github.com/' + esc(j.repo || 'alltoolsmax/auto-workflow');
      m.innerHTML = `<div class="box"><h3>Bản đang phát hành cho khách</h3>
        <div><b>Windows:</b> ${L ? `<b style="font-size:18px">v${esc(L.version)}</b> <span class="mu">· ${dt(+L.created_at)} · ${mb(+L.size)}</span>${+L.mandatory ? ' <span class="tag t-exp">bắt buộc</span>' : ''}` : '<span class="mu">chưa phát hành bản nào</span>'}</div>
        <div style="margin-top:10px"><b>macOS:</b> ${M.version ? `<b>v${esc(M.version)}</b> <span class="mu">· tự cập nhật thẳng từ GitHub</span>` : '<span class="mu">GitHub chưa có bản macOS</span>'}</div>
        <div class="mu" style="margin-top:8px">Link cài lần đầu: Windows <span class="mono">${gh}/releases/latest/download/auto_workflow_win.exe</span> · Mac chip Apple <span class="mono">${gh}/releases/latest/download/auto_workflow_mac_apple.dmg</span> · Mac Intel <span class="mono">${gh}/releases/latest/download/auto_workflow_mac_intel.dmg</span></div></div>
        <div class="box"><h3>Phát hành bản Windows mới</h3>
        <p class="mu" style="margin-top:0">GitHub tự build Windows + macOS khi bạn đẩy tag v&lt;phiên bản&gt;. Ghi những gì mới rồi bấm Phát hành. Khách Windows chỉ nhận bản mới sau khi bấm.</p>
        <div class="row"><label>Số phiên bản<input id="wrv" placeholder="1.0.0" style="width:120px" value="${esc(G.version || '')}"></label>
        <label>Bắt buộc với bản thấp hơn (tùy chọn)<input id="wrmin" placeholder="vd. 1.0.0" style="width:170px"></label>
        <label style="flex-direction:row;align-items:center;gap:6px;color:var(--tx)"><input id="wrman" type="checkbox"> Bắt buộc mọi người cập nhật</label></div>
        <p class="mu">Bản GitHub đã build: ${G.version ? 'v' + esc(G.version) + ' · ' + mb(G.size) : '<b>chưa có</b>'}</p>
        <label class="mu" style="display:block;margin-bottom:6px">Có gì mới (khách đọc trong hộp thoại cập nhật)</label><textarea id="wrn" rows="5" style="width:100%" placeholder="- Thêm …&#10;- Sửa lỗi …"></textarea>
        <p><button onclick="R.wPublish()">🚀 Phát hành</button></p></div>
        <h3>Lịch sử phát hành (Windows)</h3><table><tr><th>Phiên bản</th><th>Lúc</th><th>Dung lượng</th><th>Ghi chú</th><th>Trạng thái</th><th></th></tr>` +
        (j.releases || []).map((r) => `<tr><td><b>v${esc(r.version)}</b>${+r.id == j.latest_id ? ' <span class="tag t-active">đang phát</span>' : ''}</td><td class="mu">${dt(+r.created_at)}</td><td class="mu">${mb(+r.size)}</td>
          <td style="white-space:pre-wrap;max-width:420px">${esc(r.notes || '')}</td><td>${+r.active ? '<span class="tag t-paid">bật</span>' : '<span class="tag t-revoked">đã ngừng</span>'}</td>
          <td class="acts">${+r.active ? `<button class="r" onclick="R.wToggle(${r.id},0)">Ngừng phát</button>` : `<button class="g" onclick="R.wToggle(${r.id},1)">Phát lại</button>`}</td></tr>`).join('') + '</table>';
    },
    async wPublish() {
      const v = $('#wrv').value.trim();
      if (!confirm('Phát hành Auto WorkFlow bản ' + v + ' (Windows) cho tất cả khách?')) return;
      toast('Đang kiểm tra bộ cài…');
      const j = await AW('release_publish', { version: v, min_version: $('#wrmin').value, mandatory: $('#wrman').checked, notes: $('#wrn').value, github: true });
      if (j.ok) { toast('Đã phát hành v' + j.version + '. App của khách sẽ thấy trong vài phút.'); go('w_release'); }
    },
    async wToggle(id, on) {
      if (!on && !confirm('Ngừng phát bản này? Khách sẽ nhận bản đang bật mới nhất còn lại.')) return;
      const j = await AW('release_toggle', { id, active: on });
      if (j.ok) go('w_release');
    },

    async w_events(m) {
      const j = await AW('events');
      m.innerHTML = `<table><tr><th>Lúc</th><th>Việc</th><th>Key</th><th>Máy</th><th>Chi tiết</th></tr>` +
        (j.events || []).map((e) => `<tr><td class="mu">${dt(+e.at)}</td><td>${esc(e.kind)}</td><td class="k">${esc(e.key || '')}</td><td class="mono mu">${esc((e.machine || '').slice(0, 19))}</td><td>${esc(e.detail || '')}</td></tr>`).join('') + '</table>';
    },
  });
})();

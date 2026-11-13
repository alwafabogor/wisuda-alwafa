/* ==========================================================================
   SIM WISUDA — core.js
   Klien API (fetch text/plain → GAS), sesi, cache SWR, penggabung batch, dedupe,
   idempotensi tulis (reqId), antrean notifikasi, util UI (toast/modal/drawer), pemuat pustaka.
   ========================================================================== */
(function (W) {
  'use strict';
  const CFG = W.APP_CONFIG || {};
  const VERSI = '1.0.0';

  /* ------------------------------------------------------------ util */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const angka = (n) => (Number(n) || 0).toLocaleString('id-ID');
  const ringkasRp = (n) => { n = Number(n) || 0; const a = Math.abs(n); return (n < 0 ? '-' : '') + (a >= 1e9 ? (a / 1e9).toFixed(1).replace('.0', '') + ' M' : a >= 1e6 ? (a / 1e6).toFixed(1).replace('.0', '') + ' jt' : a >= 1e3 ? Math.round(a / 1e3) + ' rb' : a); };
  const inisial = (s) => String(s || '?').replace(/^(dr|ust|uzt|syeh|syaikh|h|hj|prof)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 300); }; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const hash = (s) => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const tglID = (iso, jam) => {
    if (!iso) return '-'; const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00+07:00' : iso); if (isNaN(d)) return String(iso);
    const o = { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }; if (jam) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString('id-ID', o);
  };
  const jamID = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }); };
  const isArab = (s) => /[؀-ۿ]/.test(String(s || ''));
  const on = (root, ev, sel, fn) => root.addEventListener(ev, (e) => { const t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); });

  /* ------------------------------------------------------------ penyimpanan lokal (aman bila diblokir) */
  const Store = {
    get(k, d) { try { const v = localStorage.getItem('sw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sw_' + k, JSON.stringify(v)); return true; } catch (e) { Store.trim(); return false; } },
    del(k) { try { localStorage.removeItem('sw_' + k); } catch (e) { } },
    trim() { try { Object.keys(localStorage).filter((k) => k.indexOf('sw_swr:') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { } }
  };

  /* ------------------------------------------------------------ sesi */
  const Sesi = {
    token: Store.get('token', ''), me: Store.get('me', null), kid: Store.get('kid', ''), boot: null,
    simpan(token, me, kid) { this.token = token; this.me = me; if (kid) this.kid = kid; Store.set('token', token); Store.set('me', me); Store.set('kid', this.kid); },
    setKid(kid) { this.kid = kid || ''; Store.set('kid', this.kid); },
    hapus() { this.token = ''; this.me = null; this.boot = null; Store.del('token'); Store.del('me'); Store.trim(); },
    is(...roles) { return !!(this.me && roles.indexOf(this.me.role) > -1); },
    flag(f) { return !!(this.me && (this.me.flags || []).indexOf(f) > -1); }
  };

  /* ------------------------------------------------------------ indikator & pengukur */
  let _busy = 0;
  const bar = () => $('#loadbar');
  const busy = (d) => { _busy = Math.max(0, _busy + d); const b = bar(); if (!b) return; if (_busy > 0) { b.style.opacity = 1; b.style.width = '70%'; } else { b.style.width = '100%'; setTimeout(() => { if (!_busy) { b.style.opacity = 0; b.style.width = 0; } }, 250); } };
  const Perf = { log: [], add(a, ms, srv, cached) { this.log.push({ aksi: a, total: ms, server: srv, net: ms - (srv || 0), cache: cached ? '✓' : '' }); if (this.log.length > 200) this.log.shift(); }, table() { console.table(this.log.slice(-40)); } };
  W.Perf = Perf;

  /* ------------------------------------------------------------ API */
  const konfigOK = () => CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL);
  const _inflight = {}; let _epoch = 0;
  async function kirim(body, opt) {
    opt = opt || {};
    if (!konfigOK()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', code: 'CONFIG' };
    const t0 = performance.now();
    if (!opt.silent) busy(1);
    try {
      const res = await fetch(CFG.GAS_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
      const txt = await res.text();
      let j; try { j = JSON.parse(txt); } catch (e) { return { success: false, network: true, message: 'Server membalas tidak valid (HTTP ' + res.status + '). Pastikan Web App di-deploy untuk "Anyone".' }; }
      Perf.add(body.action, Math.round(performance.now() - t0), j.ms, j.cached);
      return j;
    } catch (e) {
      return { success: false, network: true, message: navigator.onLine ? 'Koneksi ke server terputus. Coba lagi.' : 'Anda sedang offline.' };
    } finally { if (!opt.silent) busy(-1); }
  }
  function tangani(res, action) {
    if (res && res.code === 401 && action !== 'auth.google') { Sesi.hapus(); if (W.App) W.App.keLogin('Sesi berakhir. Silakan masuk lagi.'); }
    if (res && res.nq > 0) Drain.jadwal();
    if (res && res.code === 423 && res.reason === 'MODE' && W.App) W.App.segarkanBoot();
    return res;
  }
  const API = {
    /** Aksi baca: dedupe permintaan identik yang sedang berjalan, digabung batch dalam satu tik. */
    read(action, data, opt) {
      opt = opt || {};
      const key = _epoch + '|' + action + '|' + Sesi.kid + '|' + JSON.stringify(data || {});
      if (_inflight[key]) return _inflight[key];
      const p = (opt.noBatch ? kirim({ action, data: data || {}, token: Sesi.token, kid: Sesi.kid }, opt) : Batcher.add(action, data || {})).then((r) => tangani(r, action));
      _inflight[key] = p; p.finally(() => delete _inflight[key]);
      return p;
    },
    /** Aksi tulis: reqId untuk idempotensi (aman diulang saat jaringan putus). */
    async write(action, data, opt) {
      opt = opt || {}; _epoch++;
      const reqId = opt.reqId || uid();
      let res = await kirim({ action, data: data || {}, token: Sesi.token, kid: Sesi.kid, reqId }, opt);
      if (res.network && opt.retry !== false) { await new Promise((r) => setTimeout(r, 1200)); res = await kirim({ action, data: data || {}, token: Sesi.token, kid: Sesi.kid, reqId }, opt); }
      tangani(res, action);
      if (!opt.silent && res.message) toast(res.message, res.success ? 'ok' : 'err');
      if (res.success) SWR.stale();
      return res;
    },
    pub(action, data, opt) { return kirim({ action, data: data || {}, kid: (data && data.k) || '' }, opt); },
    warm(scope) {
      if (!konfigOK()) return; const k = 'warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 240000) return; try { sessionStorage.setItem(k, String(Date.now())); } catch (e) { }
      fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => { });
    }
  };
  /* Penggabung batch otomatis: semua API.read di tik yang sama → 1 eksekusi server */
  const Batcher = {
    q: null,
    add(action, data) { return new Promise((res) => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data, res }); }); },
    async flush() {
      const q = this.q; this.q = null; if (!q || !q.length) return;
      for (let i = 0; i < q.length; i += 10) {
        const part = q.slice(i, i + 10);
        if (part.length === 1) { const p = part[0]; p.res(await kirim({ action: p.action, data: p.data, token: Sesi.token, kid: Sesi.kid })); continue; }
        const r = await kirim({ action: 'batch', data: { calls: part.map((p) => ({ action: p.action, data: p.data })) }, token: Sesi.token, kid: Sesi.kid });
        if (r.success && Array.isArray(r.data)) part.forEach((p, j) => p.res(r.data[j] || { success: false, message: 'Tidak ada respons' }));
        else part.forEach((p) => p.res(r));
      }
    }
  };
  /* Cache stale-while-revalidate di localStorage */
  const SWR = {
    _stale: 0,
    key(action, data) { return 'swr:' + (Sesi.kid || '-') + ':' + (Sesi.me ? Sesi.me.role : '') + ':' + action + ':' + JSON.stringify(data || {}); },
    stale() { this._stale = Date.now(); },
    /** Render dari cache dulu, lalu ambil segar bila cache lebih tua dari maxAge (ms). cb(data, dariCache). */
    async load(action, data, cb, opt) {
      opt = opt || {};
      const k = this.key(action, data), c = Store.get(k, null);
      let rendered = false;
      if (c && c.d !== undefined && !opt.fresh) { cb(c.d, true); rendered = true; }
      const segar = !c || opt.fresh || c.t < this._stale || (Date.now() - c.t) > (opt.maxAge == null ? 30000 : opt.maxAge);
      if (!segar) return c.d;
      const r = await API.read(action, opt.fresh ? Object.assign({}, data, { _fresh: true }) : data);
      if (!r.success) { if (!rendered) cb(null, false, r); else if (r.code !== 401) toast(r.message, 'err'); return null; }
      const h = hash(JSON.stringify(r.data));
      if (!rendered || !c || c.h !== h) cb(r.data, false);
      Store.set(k, { t: Date.now(), h, d: r.data });
      return r.data;
    }
  };
  /* Antrean notifikasi: bila respons membawa nq>0, minta server mengirim (tanpa membuat pengguna menunggu) */
  const Drain = {
    tm: null, n: 0,
    jadwal() { clearTimeout(this.tm); this.tm = setTimeout(() => this.jalan(), 400); },
    async jalan() { if (this.n > 3) { this.n = 0; return; } this.n++; const r = await kirim({ action: 'notif.drain', data: {}, token: Sesi.token, kid: Sesi.kid }, { silent: true }); if (r.success && r.data && r.data.sisa > 0) this.jadwal(); else this.n = 0; }
  };

  /* ------------------------------------------------------------ aktivitas (polling adaptif) */
  const Activity = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach((ev) => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
    idle() { return Date.now() - this.at > 120000; },
    due(key, activeMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : activeMs) - 300) return false;
      this.last[key] = Date.now(); return true;
    }
  };
  Activity.init();

  /* ------------------------------------------------------------ UI: toast, modal, drawer, confirm */
  function toast(msg, type) {
    if (!msg) return; let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const ic = { ok: 'check_circle', err: 'error', info: 'info', warn: 'warning' }[type || 'info'];
    const t = document.createElement('div'); t.className = 'toast ' + (type || 'info');
    t.innerHTML = '<span class="ms">' + ic + '</span><div style="flex:1">' + esc(msg) + '</div>';
    box.appendChild(t); setTimeout(() => { t.style.opacity = 0; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, type === 'err' ? 6000 : 3800);
  }
  function modal(o) {
    const ov = document.createElement('div'); ov.className = 'overlay' + (o.drawer ? ' drawer' : '');
    ov.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h"><h3>' + (o.title || '') + '</h3><button class="btn ghost sm icon" data-x aria-label="Tutup"><span class="ms">close</span></button></div><div class="modal-b"></div>' + (o.foot !== false ? '<div class="modal-f"></div>' : '') + '</div>';
    const m = { el: ov, body: $('.modal-b', ov), foot: $('.modal-f', ov), close() { ov.remove(); document.removeEventListener('keydown', esc_); if (o.onClose) o.onClose(); } };
    const esc_ = (e) => { if (e.key === 'Escape') m.close(); };
    if (typeof o.body === 'string') m.body.innerHTML = o.body; else if (o.body) m.body.appendChild(o.body);
    if (m.foot) {
      (o.buttons || [{ label: 'Tutup', cls: '' }]).forEach((b) => {
        const btn = document.createElement('button'); btn.className = 'btn ' + (b.cls || ''); btn.innerHTML = (b.icon ? '<span class="ms">' + b.icon + '</span>' : '') + b.label;
        btn.onclick = async () => { if (!b.onClick) return m.close(); btn.disabled = true; try { const r = await b.onClick(m); if (r !== false) m.close(); } finally { btn.disabled = false; } };
        m.foot.appendChild(btn);
      });
    }
    $('[data-x]', ov).onclick = () => m.close();
    ov.addEventListener('mousedown', (e) => { if (e.target === ov && !o.sticky) m.close(); });
    document.addEventListener('keydown', esc_);
    document.body.appendChild(ov);
    const f = $('input,select,textarea', m.body); if (f && !o.noFocus) setTimeout(() => f.focus(), 50);
    return m;
  }
  const drawer = (o) => modal(Object.assign({ drawer: true }, o));
  function konfirmasi(pesan, o) {
    o = o || {};
    return new Promise((res) => {
      modal({ title: o.judul || 'Konfirmasi', body: '<p style="margin:0;line-height:1.6">' + pesan + '</p>', onClose: () => res(false),
        buttons: [{ label: 'Batal' }, { label: o.ya || 'Ya, lanjutkan', cls: o.bahaya ? 'danger' : 'primary', onClick: (m) => { res(true); m.el.remove(); return false; } }] });
    });
  }

  /* ------------------------------------------------------------ pemuat pustaka (dimuat saat dibutuhkan saja) */
  const LIBS = {
    xlsx: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', () => W.XLSX],
    jspdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', () => W.jspdf],
    pptx: ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', () => W.PptxGenJS],
    qr: ['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', () => W.qrcode],
    scanner: ['https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js', () => W.Html5Qrcode],
    sortable: ['https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js', () => W.Sortable],
    docx: ['https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js', () => W.docx]
  };
  const _lib = {};
  function lib(name) {
    const L = LIBS[name]; if (!L) return Promise.reject(new Error('Pustaka tidak dikenal: ' + name));
    if (L[1]()) return Promise.resolve(L[1]());
    if (_lib[name]) return _lib[name];
    return (_lib[name] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = L[0]; s.async = true;
      s.onload = () => res(L[1]()); s.onerror = () => { delete _lib[name]; rej(new Error('Gagal memuat pustaka ' + name + '. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    }));
  }

  /* ------------------------------------------------------------ QR & gambar Drive */
  async function qrDataUrl(text, px) {
    const qrcode = await lib('qr'); const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
    const n = q.getModuleCount(), size = px || 360, cell = Math.floor(size / (n + 4)) || 1, dim = cell * (n + 4);
    const c = document.createElement('canvas'); c.width = c.height = dim; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, dim, dim); g.fillStyle = '#1F1F1F';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + 2) * cell, (r + 2) * cell, cell, cell);
    return c.toDataURL('image/png');
  }
  const _img = {};
  async function driveImg(id, pub) {
    if (!id) return '';
    if (_img[id]) return _img[id];
    return (_img[id] = (async () => {
      try { if ('caches' in W) { const c = await caches.open('sw-drive'); const hit = await c.match('/drive/' + id); if (hit) return await hit.text(); } } catch (e) { }
      const r = pub ? await API.pub('tamu.asset', Object.assign({ id }, pub), { silent: true }) : await API.read('file.get', { id });
      if (!r.success || !r.data || !r.data.dataUrl) { delete _img[id]; return ''; }
      try { if ('caches' in W) { const c = await caches.open('sw-drive'); await c.put('/drive/' + id, new Response(r.data.dataUrl)); } } catch (e) { }
      return r.data.dataUrl;
    })());
  }
  /** Kompres gambar di browser sebelum diunggah (target ≤ maxPx sisi terpanjang). */
  function kompresGambar(file, maxPx, kualitas, tipe) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, (maxPx || 1600) / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          const g = c.getContext('2d'); if ((tipe || 'image/jpeg') === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
          g.drawImage(img, 0, 0, c.width, c.height);
          res({ dataUrl: c.toDataURL(tipe || 'image/jpeg', kualitas || 0.85), w: c.width, h: c.height });
        };
        img.onerror = () => rej(new Error('Berkas bukan gambar yang valid.'));
        img.src = fr.result;
      };
      fr.onerror = () => rej(new Error('Gagal membaca berkas.'));
      fr.readAsDataURL(file);
    });
  }
  const bacaBase64 = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  function unduh(blobOrUrl, nama) {
    const a = document.createElement('a'); a.download = nama;
    a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); if (typeof blobOrUrl !== 'string') URL.revokeObjectURL(a.href); }, 1500);
  }
  async function eksporXLSX(rows, nama, sheet) {
    const XLSX = await lib('xlsx'); const wb = XLSX.utils.book_new();
    if (Array.isArray(rows)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), (sheet || 'Data').slice(0, 30));
    else Object.keys(rows).forEach((k) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows[k]), k.slice(0, 30)));
    XLSX.writeFile(wb, nama.endsWith('.xlsx') ? nama : nama + '.xlsx');
  }

  W.SW = { VERSI, CFG, $, $$, esc, rupiah, angka, ringkasRp, inisial, debounce, uid, hash, tglID, jamID, isArab, on, Store, Sesi, API, SWR, Activity, toast, modal, drawer, konfirmasi, lib, qrDataUrl, driveImg, kompresGambar, bacaBase64, unduh, eksporXLSX, konfigOK };
})(window);

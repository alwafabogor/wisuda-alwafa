/* ==========================================================================
   SIM WISUDA — ui.js : komponen (tabel, formulir, grafik SVG, kosong, skeleton)
   Grafik: palet kategorikal tervalidasi (CVD & kontras lulus) — koral, biru, oker, ungu, hijau.
   ========================================================================== */
(function (W) {
  'use strict';
  const { esc, $, $$, debounce, angka } = W.SW;
  const PAL = ['#E8502E', '#2F86C2', '#B58300', '#7B5BD3', '#2E9466'];
  const ic = (n, cls) => '<span class="ms ' + (cls || '') + '" aria-hidden="true">' + n + '</span>';

  const STATUS = {
    Aktif: 'ok', Final: 'ok', FINAL: 'ok', YA: 'ok', Sah: 'ok', SAH: 'ok', Selesai: 'ok', SELESAI: 'mute', Terkirim: 'ok', Hadir: 'ok', Konfirmasi: 'info', Sesuai: 'ok', SESUAI: 'ok', Lunas: 'ok', Tercatat: 'ok',
    Draft: 'warn', DRAFT: 'warn', Menunggu: 'warn', Belum: 'warn', BELUM: 'warn', Antri: 'warn', Proses: 'info', PROSES: 'info', Terkirim_: 'ok',
    BERJALAN: 'info', Berjalan: 'info', Arsip: 'mute', Nonaktif: 'mute', Dihentikan: 'mute', Batal: 'mute', BATAL: 'mute', Tutup: 'mute', TIDAK: 'mute',
    Gagal: 'bad', DUPLIKAT: 'bad', MELEBIHI: 'bad', 'Tidak Hadir': 'bad', Ditolak: 'bad'
  };
  const pill = (txt, kind) => txt === '' || txt == null ? '' : '<span class="pill ' + (kind || STATUS[txt] || 'mute') + '">' + (kind === 'info' && /BERJALAN|Berjalan/.test(txt) ? '<i class="pulse"></i>' : '') + esc(txt) + '</span>';
  const kosong = (judul, isi, icon, aksi) => '<div class="empty"><div class="ill">' + ic(icon || 'inbox') + '</div><h3>' + esc(judul) + '</h3><p style="margin:0 0 14px">' + (isi || '') + '</p>' + (aksi || '') + '</div>';
  const skeleton = (n) => '<div class="card flat">' + Array.from({ length: n || 5 }, (_, i) => '<div class="sk line" style="width:' + (90 - i * 9) + '%"></div>').join('') + '</div>';
  const avatar = (nama, url, cls) => '<span class="av ' + (cls || '') + '">' + (url ? '<img src="' + esc(url) + '" alt="">' : esc(W.SW.inisial(nama))) + '</span>';

  /* ------------------------------------------------------------ FORMULIR */
  function formHtml(fields, val) {
    val = val || {};
    return '<div class="form">' + fields.map((f) => {
      if (f.type === 'html') return '<div class="' + (f.full ? 'full' : '') + '">' + f.html + '</div>';
      const v = val[f.k] == null ? (f.def == null ? '' : f.def) : val[f.k];
      const lbl = '<span>' + esc(f.label) + (f.req ? ' <em>*</em>' : '') + '</span>';
      const help = f.help ? '<small>' + f.help + '</small>' : '';
      const attr = 'name="' + f.k + '"' + (f.req ? ' required' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.ro ? ' readonly' : '') + (f.ar ? ' dir="rtl" class="ar"' : '');
      let ctl;
      if (f.type === 'select') ctl = '<select ' + attr + '>' + (f.opts || []).map((o) => { const ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'textarea') ctl = '<textarea ' + attr + ' rows="' + (f.rows || 4) + '">' + esc(v) + '</textarea>';
      else if (f.type === 'switch') return '<label class="check ' + (f.full ? 'full' : '') + '"><span class="switch"><input type="checkbox" name="' + f.k + '"' + (v === true || v === 'YA' ? ' checked' : '') + '><i></i></span>' + esc(f.label) + '</label>';
      else if (f.type === 'checks') ctl = '<div class="chipset">' + f.opts.map((o) => { const ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; const on = String(v).split(',').indexOf(String(ov)) > -1; return '<label class="chip check"><input type="checkbox" data-multi="' + f.k + '" value="' + esc(ov) + '"' + (on ? ' checked' : '') + '>' + esc(ol) + '</label>'; }).join('') + '</div>';
      else ctl = '<input type="' + (f.type || 'text') + '" ' + attr + ' value="' + esc(v) + '"' + (f.step ? ' step="' + f.step + '"' : '') + '>';
      return '<label class="field ' + (f.full || f.type === 'textarea' ? 'full' : '') + '">' + lbl + ctl + help + '</label>';
    }).join('') + '</div>';
  }
  function formVal(root, fields) {
    const o = {};
    fields.forEach((f) => {
      if (f.type === 'html') return;
      if (f.type === 'checks') { o[f.k] = $$('[data-multi="' + f.k + '"]:checked', root).map((x) => x.value).join(','); return; }
      const el = $('[name="' + f.k + '"]', root); if (!el) return;
      if (f.type === 'switch') o[f.k] = f.yn ? (el.checked ? 'YA' : 'TIDAK') : el.checked;
      else if (f.type === 'number') o[f.k] = el.value === '' ? '' : Number(el.value);
      else o[f.k] = el.value.trim ? el.value.trim() : el.value;
    });
    return o;
  }
  function formCek(root, fields) {
    for (const f of fields) { if (f.req) { const el = $('[name="' + f.k + '"]', root); if (el && !String(el.value).trim()) { el.focus(); W.SW.toast(f.label + ' wajib diisi.', 'warn'); return false; } } }
    return true;
  }

  /* ------------------------------------------------------------ TABEL (cari, saring, halaman) */
  function table(el, o) {
    const st = { rows: [], q: '', page: 1, filter: o.filterDefault || '', sel: new Set() };
    const per = o.pageSize || 25;
    el.innerHTML = '<div class="card pad0"><div class="row" style="padding:14px;gap:10px">' +
      (o.search !== false ? '<div class="search" style="width:min(320px,100%)"><input class="inp" placeholder="' + esc(o.ph || 'Cari…') + '" data-q><button type="button" tabindex="-1">' + ic('search') + '</button></div>' : '') +
      (o.filters ? '<div class="seg" data-f>' + o.filters.map((f) => '<button data-v="' + esc(f[0]) + '">' + esc(f[1]) + '</button>').join('') + '</div>' : '') +
      '<span class="sp"></span><span data-tools class="row" style="gap:8px">' + (o.tools || '') + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl ' + (o.compact ? 'compact' : '') + '"><thead><tr>' + (o.select ? '<th style="width:36px"><input type="checkbox" data-all></th>' : '') + o.cols.map((c) => '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>').join('') + (o.actions ? '<th></th>' : '') + '</tr></thead><tbody></tbody></table></div><div class="pager"></div></div>';
    const tb = $('tbody', el), pg = $('.pager', el);
    const lolos = (r) => {
      if (st.filter && o.filterFn && !o.filterFn(r, st.filter)) return false;
      if (!st.q) return true;
      const s = (o.searchKeys || o.cols.map((c) => c.k)).map((k) => r[k]).join(' ').toLowerCase();
      return s.indexOf(st.q) > -1;
    };
    function render() {
      const rows = st.rows.filter(lolos), pages = Math.max(1, Math.ceil(rows.length / per)); st.page = Math.min(st.page, pages);
      const vis = rows.slice((st.page - 1) * per, st.page * per);
      tb.innerHTML = vis.length ? vis.map((r) => {
        const id = r[o.key || 'id'];
        return '<tr data-id="' + esc(id) + '" class="' + (o.rowCls ? o.rowCls(r) : '') + '">' + (o.select ? '<td><input type="checkbox" data-sel="' + esc(id) + '"' + (st.sel.has(String(id)) ? ' checked' : '') + '></td>' : '') +
          o.cols.map((c) => '<td class="' + (c.cls || '') + '">' + (c.render ? c.render(r) : esc(r[c.k])) + '</td>').join('') +
          (o.actions ? '<td class="act">' + o.actions(r) + '</td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="' + (o.cols.length + (o.actions ? 1 : 0) + (o.select ? 1 : 0)) + '">' + kosong(o.emptyTitle || 'Belum ada data', o.emptyText || '', o.emptyIcon || 'inbox', o.emptyAction || '') + '</td></tr>';
      pg.innerHTML = '<span>' + angka(rows.length) + ' data' + (st.sel.size ? ' · <b>' + st.sel.size + ' dipilih</b>' : '') + '</span>' + (pages > 1 ? '<span class="row" style="gap:4px"><button class="btn xs" data-p="-1"' + (st.page < 2 ? ' disabled' : '') + '>‹</button><span>' + st.page + ' / ' + pages + '</span><button class="btn xs" data-p="1"' + (st.page >= pages ? ' disabled' : '') + '>›</button></span>' : '');
      if (o.onRender) o.onRender(vis);
    }
    const q = $('[data-q]', el); if (q) q.addEventListener('input', debounce(() => { st.q = q.value.trim().toLowerCase(); st.page = 1; render(); }, 250));
    const fb = $('[data-f]', el);
    if (fb) { const sync = () => $$('button', fb).forEach((b) => b.classList.toggle('on', b.dataset.v === st.filter)); sync(); fb.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.filter = b.dataset.v; st.page = 1; sync(); render(); }); }
    pg.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; st.page += Number(b.dataset.p); render(); });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-sel]')) { e.target.checked ? st.sel.add(e.target.dataset.sel) : st.sel.delete(e.target.dataset.sel); render(); if (o.onSelect) o.onSelect([...st.sel]); }
      if (e.target.matches('[data-all]')) { const ids = st.rows.filter(lolos).map((r) => String(r[o.key || 'id'])); ids.forEach((id) => e.target.checked ? st.sel.add(id) : st.sel.delete(id)); render(); if (o.onSelect) o.onSelect([...st.sel]); }
    });
    if (o.onAction) el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return; const tr = b.closest('tr'); const id = tr ? tr.dataset.id : b.dataset.id; const r = st.rows.find((x) => String(x[o.key || 'id']) === String(id)); o.onAction(b.dataset.act, r, b); });
    return { set(rows) { st.rows = rows || []; render(); }, rows: () => st.rows, selected: () => [...st.sel], clearSel() { st.sel.clear(); render(); }, tools: $('[data-tools]', el), render };
  }

  /* ------------------------------------------------------------ GRAFIK SVG */
  function tipLayer(el) { let t = $('.tip', el); if (!t) { t = document.createElement('div'); t.className = 'tip'; el.appendChild(t); } return t; }
  function area(el, o) {
    const W_ = 560, H = 230, pl = 34, pr = 14, pt = 22, pb = 30, labels = o.labels || [], vals = o.values || [];
    if (!vals.length || vals.every((v) => !v)) { el.innerHTML = kosong(o.emptyTitle || 'Belum ada data', o.emptyText || '', 'monitoring'); return; }
    const max = Math.max(1, ...vals), nice = Math.ceil(max / 4) * 4 || 4;
    const x = (i) => pl + (labels.length < 2 ? (W_ - pl - pr) / 2 : i * (W_ - pl - pr) / (labels.length - 1)), y = (v) => pt + (H - pt - pb) * (1 - v / nice);
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const path = pts.map((p, i) => { if (!i) return 'M' + p[0] + ',' + p[1]; const q = pts[i - 1], cx = (q[0] + p[0]) / 2; return 'C' + cx + ',' + q[1] + ' ' + cx + ',' + p[1] + ' ' + p[0] + ',' + p[1]; }).join(' ');
    const col = o.color || PAL[0], im = vals.indexOf(max);
    let g = '';
    for (let k = 0; k <= 4; k++) { const yy = y(nice * k / 4); g += '<line x1="' + pl + '" x2="' + (W_ - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#ECE8DF"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#6B6B6B">' + Math.round(nice * k / 4) + '</text>'; }
    const step = Math.ceil(labels.length / 7);
    labels.forEach((l, i) => { if (i % step === 0 || i === labels.length - 1) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="#6B6B6B">' + esc(l) + '</text>'; });
    el.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W_ + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'grafik') + '">' + g +
      '<path d="' + path + ' L' + pts[pts.length - 1][0] + ',' + (H - pb) + ' L' + pts[0][0] + ',' + (H - pb) + ' Z" fill="' + col + '" fill-opacity=".1"/>' +
      '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + pts[im][0] + '" cy="' + pts[im][1] + '" r="5" fill="' + col + '" stroke="#fff" stroke-width="2"/><text x="' + pts[im][0] + '" y="' + (pts[im][1] - 10) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="#1F1F1F">' + angka(max) + (o.unit ? ' ' + o.unit : '') + '</text>' +
      '<line class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" stroke="#1F1F1F" stroke-width="1" opacity="0"/>' +
      '<rect x="' + pl + '" y="0" width="' + (W_ - pl - pr) + '" height="' + H + '" fill="transparent" class="hit"/></svg></div>';
    const svg = $('svg', el), tip = tipLayer($('.chart', el)), xh = $('.xh', el);
    const mv = (e) => { const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W_ / r.width; let i = Math.round((px - pl) / ((W_ - pl - pr) / Math.max(1, labels.length - 1))); i = Math.max(0, Math.min(labels.length - 1, i)); xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', .35); tip.innerHTML = '<b>' + esc(labels[i]) + '</b> · ' + angka(vals[i]) + (o.unit ? ' ' + o.unit : ''); tip.style.left = (x(i) * r.width / W_) + 'px'; tip.style.top = (y(vals[i]) * r.height / H) + 'px'; tip.classList.add('on'); };
    svg.addEventListener('pointermove', mv); svg.addEventListener('pointerleave', () => { tip.classList.remove('on'); xh.setAttribute('opacity', 0); });
  }
  function hbars(el, items, o) {
    o = o || {};
    if (!items.length) { el.innerHTML = kosong(o.emptyTitle || 'Belum ada data', '', 'bar_chart'); return; }
    el.innerHTML = '<div class="hbar">' + items.map((it, i) => {
      const pct = Math.max(0, Math.min(100, it.max ? it.value / it.max * 100 : it.value));
      return '<div class="it" title="' + esc(it.title || '') + '"><div class="t"><span>' + esc(it.label) + '</span><span class="num">' + esc(it.text != null ? it.text : Math.round(pct) + '%') + '</span></div><div class="trk"><i style="width:' + pct + '%;background:' + (it.color || PAL[i % PAL.length]) + '"></i></div></div>';
    }).join('') + '</div>';
  }
  function columns(el, o) {
    const W_ = 560, H = 240, pl = 44, pr = 10, pt = 18, pb = 46, L = o.labels || [], S = o.series || [];
    if (!L.length) { el.innerHTML = kosong('Belum ada data', '', 'bar_chart'); return; }
    const max = Math.max(1, ...S.flatMap((s) => s.values)); const mag = Math.pow(10, Math.floor(Math.log10(max))); const nice = Math.ceil(max / mag) * mag;
    const band = (W_ - pl - pr) / L.length, bw = Math.min(22, (band - 10) / S.length - 2), y = (v) => pt + (H - pt - pb) * (1 - v / nice);
    let g = '';
    for (let k = 0; k <= 4; k++) { const yy = y(nice * k / 4); g += '<line x1="' + pl + '" x2="' + (W_ - pr) + '" y1="' + yy + '" y2="' + yy + '" stroke="#ECE8DF"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#6B6B6B">' + esc(o.fmt ? o.fmt(nice * k / 4) : Math.round(nice * k / 4)) + '</text>'; }
    L.forEach((l, i) => {
      const cx = pl + band * i + band / 2, gw = S.length * (bw + 2) - 2;
      S.forEach((s, j) => {
        const v = s.values[i] || 0, x0 = cx - gw / 2 + j * (bw + 2), y0 = y(v), h = (H - pb) - y0;
        const r = Math.min(4, h / 2, bw / 2);
        g += '<path data-tip="' + esc(l + ' · ' + s.name + ': ' + (o.fmt ? o.fmt(v) : angka(v))) + '" d="M' + x0 + ',' + (H - pb) + ' V' + (y0 + r) + ' Q' + x0 + ',' + y0 + ' ' + (x0 + r) + ',' + y0 + ' H' + (x0 + bw - r) + ' Q' + (x0 + bw) + ',' + y0 + ' ' + (x0 + bw) + ',' + (y0 + r) + ' V' + (H - pb) + ' Z" fill="' + (s.color || PAL[j]) + '"/>';
      });
      const t = String(l); g += '<text x="' + cx + '" y="' + (H - pb + 14) + '" text-anchor="middle" font-size="10" fill="#6B6B6B">' + esc(t.length > 14 ? t.slice(0, 13) + '…' : t) + '</text>';
    });
    el.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W_ + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'grafik batang') + '">' + g + '</svg></div>' + (S.length > 1 ? '<div class="legend">' + S.map((s, j) => '<span><i style="background:' + (s.color || PAL[j]) + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '');
    const ch = $('.chart', el), tip = tipLayer(ch);
    ch.addEventListener('pointermove', (e) => { const p = e.target.closest('[data-tip]'); if (!p) { tip.classList.remove('on'); return; } const r = ch.getBoundingClientRect(); tip.textContent = p.dataset.tip; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on'); });
    ch.addEventListener('pointerleave', () => tip.classList.remove('on'));
  }
  function donut(el, items, o) {
    o = o || {};
    const total = items.reduce((s, x) => s + (Number(x.value) || 0), 0);
    if (!total) { el.innerHTML = kosong('Belum ada data', '', 'donut_large'); return; }
    const R = 70, C = 2 * Math.PI * R, gap = 2.5; let off = 0;
    const seg = items.map((it, i) => { const len = Math.max(0, (it.value / total) * C - gap); const s = '<circle data-tip="' + esc(it.label + ': ' + angka(it.value) + ' (' + Math.round(it.value / total * 100) + '%)') + '" r="' + R + '" cx="100" cy="100" fill="none" stroke="' + (it.color || PAL[i % PAL.length]) + '" stroke-width="26" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 100 100)"/>'; off += (it.value / total) * C; return s; }).join('');
    el.innerHTML = '<div class="chart" style="max-width:240px;margin:0 auto"><svg viewBox="0 0 200 200" role="img" aria-label="' + esc(o.aria || 'komposisi') + '">' + seg + '<text x="100" y="98" text-anchor="middle" font-size="30" font-weight="700" fill="#1F1F1F">' + angka(o.center != null ? o.center : total) + '</text><text x="100" y="118" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#6B6B6B">' + esc(o.centerLabel || 'TOTAL') + '</text></svg></div><div class="legend" style="justify-content:center">' + items.map((it, i) => '<span><i style="background:' + (it.color || PAL[i % PAL.length]) + '"></i>' + angka(it.value) + ' ' + esc(it.label) + '</span>').join('') + '</div>';
    const ch = $('.chart', el), tip = tipLayer(ch);
    ch.addEventListener('pointermove', (e) => { const p = e.target.closest('[data-tip]'); if (!p) { tip.classList.remove('on'); return; } const r = ch.getBoundingClientRect(); tip.textContent = p.dataset.tip; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on'); });
    ch.addEventListener('pointerleave', () => tip.classList.remove('on'));
  }

  /* ------------------------------------------------------------ unggah berkas (dropzone) */
  function dropzone(el, o) {
    el.innerHTML = '<label class="dropzone">' + ic(o.icon || 'cloud_upload') + '<div style="margin-top:6px"><b>' + esc(o.label || 'Pilih atau seret berkas') + '</b></div><small>' + esc(o.hint || 'PNG / JPG / PDF') + '</small><input type="file" hidden accept="' + (o.accept || 'image/*,application/pdf') + '"' + (o.multiple ? ' multiple' : '') + '><div data-prev style="margin-top:8px"></div></label>';
    const dz = $('.dropzone', el), inp = $('input', el);
    const pilih = (files) => { if (files && files.length) o.onFile(o.multiple ? Array.from(files) : files[0], $('[data-prev]', el)); };
    inp.addEventListener('change', () => pilih(inp.files));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); pilih(e.dataTransfer.files); });
  }

  W.UI = { PAL, ic, pill, kosong, skeleton, avatar, formHtml, formVal, formCek, table, area, hbars, columns, donut, dropzone, STATUS };
})(window);

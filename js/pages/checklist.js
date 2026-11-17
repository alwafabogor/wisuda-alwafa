/* Checklist Hari-H per divisi (centang dari HP), Jobdesk divisi, Catatan Evaluasi (Rencana–Aktualisasi–Akibat–Saran) */
App.page('checklist', async function (view) {
  const { esc, API, SWR, Sesi, drawer, konfirmasi, toast } = SW, { ic, pill, kosong, formHtml, formVal, formCek, table } = UI;
  if (App.perluKegiatan(view)) return;
  let tab = 'chk', D = null, fdiv = 'saya';
  const evalBoleh = Sesi.is('SUPERADMIN', 'KOORDINATOR', 'KADIV', 'PEGAWAI');
  view.innerHTML = App.head('Checklist Hari-H', 'Tugas tiap divisi saat gladi & hari-H. Centang langsung dari HP — progres tampil di dashboard.', Sesi.is('SUPERADMIN', 'KOORDINATOR') && !App.arsip() ? '<button class="btn" data-reset>' + ic('restart_alt') + 'Reset semua</button>' : '') +
    '<div class="tabs"><button data-t="chk" class="on">' + ic('task_alt') + 'Checklist</button><button data-t="job">' + ic('assignment') + 'Jobdesk</button>' + (evalBoleh ? '<button data-t="eval">' + ic('rate_review') + 'Catatan Evaluasi</button>' : '') + '</div><div data-body>' + UI.skeleton(8) + '</div>';
  const body = view.querySelector('[data-body]');
  function render() {
    if (!D) return;
    if (tab === 'eval') return renderEval();
    const jenis = tab === 'chk' ? 'ACARA' : 'PEGAWAI';
    let div = D.divisi.filter((d) => tab === 'chk' ? d.total > 0 || d.Jenis === 'ACARA' : d.jobdesk.length || d.Jenis === 'PEGAWAI');
    const punya = div.some((d) => d.DivisiID === D.divisiSaya);
    if (fdiv === 'saya' && !punya) fdiv = '';
    const vis = div.filter((d) => !fdiv || (fdiv === 'saya' ? d.DivisiID === D.divisiSaya : d.DivisiID === fdiv));
    let h = '<div class="chipset mb" data-dd aria-label="Filter divisi">' + (punya ? '<button class="chip' + (fdiv === 'saya' ? ' on' : '') + '" style="cursor:pointer;' + (fdiv === 'saya' ? 'background:#1F1F1F;color:#fff' : '') + '" data-f="saya">Divisi saya</button>' : '') + '<button class="chip' + (!fdiv ? ' on' : '') + '" style="cursor:pointer;' + (!fdiv ? 'background:#1F1F1F;color:#fff' : '') + '" data-f="">Semua</button>' + div.map((d) => '<button class="chip' + (fdiv === d.DivisiID ? ' on' : '') + '" style="cursor:pointer;' + (fdiv === d.DivisiID ? 'background:#1F1F1F;color:#fff' : '') + '" data-f="' + d.DivisiID + '">' + esc(d.Nama) + (tab === 'chk' ? ' · ' + d.persen + '%' : '') + '</button>').join('') + '</div>';
    h += vis.map((d) => {
      if (tab === 'job') return '<div class="card mb"><div class="card-h"><h3>' + esc(d.Nama) + '</h3>' + pill(d.jobdesk.length + ' tugas', 'sky') + '</div><ol style="margin:0;padding-left:20px;line-height:1.8">' + d.jobdesk.map((j) => '<li>' + esc(j.Uraian) + '</li>').join('') + '</ol>' + (d.anggota.length ? '<div class="chipset mt">' + d.anggota.map((a) => '<span class="chip">' + ic('person') + esc(a.nama) + (a.jabatan ? ' · ' + esc(a.jabatan) : '') + '</span>').join('') + '</div>' : '') + '</div>';
      return '<div class="card mb ' + (d.DivisiID === D.divisiSaya ? 'yellow' : '') + '"><div class="card-h"><div style="flex:1"><h3>' + esc(d.Nama) + '</h3><div class="small muted">' + d.anggota.map((a) => esc(a.nama)).join(', ') + '</div></div><span class="pill ' + (d.persen === 100 ? 'ok' : 'dark') + ' num">' + d.selesai + '/' + d.total + ' · ' + d.persen + '%</span></div><div class="bar mb"><i style="width:' + d.persen + '%;background:#2E9466"></i></div>' +
        '<div class="col" style="gap:6px">' + d.checklist.map((c) => '<div class="row" style="align-items:flex-start;padding:10px;border-radius:10px;background:' + (c.Status === 'Selesai' ? 'rgba(189,235,208,.55)' : 'rgba(255,255,255,.7)') + ';gap:12px"><input type="checkbox" style="width:24px;height:24px;accent-color:#2E9466;margin-top:2px" data-c="' + c.ChecklistID + '"' + (c.Status === 'Selesai' ? ' checked' : '') + (d.bisaUbah && !App.arsip() ? '' : ' disabled') + '><div style="flex:1;min-width:0"><b style="' + (c.Status === 'Selesai' ? 'text-decoration:line-through;opacity:.7' : '') + '">' + esc(c.Tugas) + '</b>' + (c.Acuan ? '<div class="small muted">' + esc(c.Acuan) + '</div>' : '') + (c.Catatan ? '<div class="small" style="color:#854D0E">📝 ' + esc(c.Catatan) + '</div>' : '') + (c.OlehNama ? '<div class="tiny muted">✔ ' + esc(c.OlehNama) + ' · ' + esc(SW.jamID(c.Waktu)) + '</div>' : '') + '</div>' + (d.bisaUbah && !App.arsip() ? '<button class="btn xs ghost" data-cat="' + c.ChecklistID + '" title="Catatan">' + ic('edit_note') + '</button>' : '') + '</div>').join('') + '</div>' +
        (d.bisaUbah && Sesi.is('SUPERADMIN', 'KOORDINATOR', 'KADIV') && !App.arsip() ? '<button class="btn sm mt" data-add="' + d.DivisiID + '">' + ic('add') + 'Tambah butir</button>' : '') + '</div>';
    }).join('') || '<div class="card">' + kosong('Belum ada checklist', '', 'task_alt') + '</div>';
    body.innerHTML = h;
  }
  let evalTbl = null;
  function renderEval() {
    body.innerHTML = '<div class="row end mb">' + (Sesi.is('SUPERADMIN', 'KOORDINATOR', 'KADIV') && !App.arsip() ? '<button class="btn primary" data-addeval>' + ic('add') + 'Tambah catatan</button>' : '') + '</div><div data-et></div>';
    evalTbl = table(body.querySelector('[data-et]'), { key: 'EvalID', search: false, cols: [{ k: 'Rencana', label: 'Rencana' }, { k: 'Aktualisasi', label: 'Aktualisasi' }, { k: 'Akibat', label: 'Akibat' }, { k: 'Saran', label: 'Saran' }, { k: 'Persen', label: '% / Remarks' }], emptyTitle: 'Belum ada catatan evaluasi', emptyText: 'Catatan per kejadian otomatis masuk ke LPJ (Tabel Evaluasi).', actions: () => Sesi.is('SUPERADMIN', 'KOORDINATOR', 'KADIV') ? '<button class="btn xs" data-act="edit">' + ic('edit') + '</button>' : '', onAction: (a, r) => formEval(r) });
    API.read('eval.list', {}).then((r) => r.success && evalTbl.set(r.data));
    const ad = body.querySelector('[data-addeval]'); if (ad) ad.onclick = () => formEval(null);
  }
  function formEval(r) {
    const F = [{ k: 'Rencana', label: 'Rencana', type: 'textarea', req: true, rows: 2 }, { k: 'Aktualisasi', label: 'Aktualisasi', type: 'textarea', rows: 2 }, { k: 'Akibat', label: 'Akibat / faktor', type: 'textarea', rows: 2 }, { k: 'Saran', label: 'Saran', type: 'textarea', rows: 2 }, { k: 'Persen', label: '% / Remarks' }];
    const b = document.createElement('div'); b.innerHTML = formHtml(F, r || {});
    drawer({ title: r ? 'Ubah Catatan Evaluasi' : 'Catatan Evaluasi Baru', size: 'wide', body: b, buttons: [r && Sesi.is('SUPERADMIN', 'KOORDINATOR') ? { label: 'Hapus', cls: 'danger', onClick: async () => { await API.write('eval.delete', { EvalID: r.EvalID }); renderEval(); } } : { label: 'Batal' }, { label: 'Simpan', cls: 'primary', onClick: async () => { if (!formCek(b, F)) return false; const v = formVal(b, F); if (r) v.EvalID = r.EvalID; const x = await API.write('eval.save', v); if (!x.success) return false; renderEval(); } }] });
  }
  body.addEventListener('change', async (e) => {
    const c = e.target.closest('[data-c]'); if (!c) return;
    const it = D.divisi.flatMap((d) => d.checklist).find((x) => x.ChecklistID === c.dataset.c);
    const lama = it.Status; it.Status = c.checked ? 'Selesai' : 'Belum'; it.OlehNama = c.checked ? Sesi.me.nama : ''; it.Waktu = c.checked ? new Date().toISOString() : '';
    D.divisi.forEach((d) => { d.selesai = d.checklist.filter((x) => x.Status === 'Selesai').length; d.persen = d.total ? Math.round(d.selesai / d.total * 100) : 0; });
    render();
    const r = await API.write('checklist.toggle', { ChecklistID: it.ChecklistID, Status: it.Status }, { silent: true });
    if (!r.success) { it.Status = lama; render(); toast(r.message, 'err'); }
  });
  body.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-f]'); if (f) { fdiv = f.dataset.f; render(); return; }
    const ct = e.target.closest('[data-cat]'); if (ct) { const it = D.divisi.flatMap((d) => d.checklist).find((x) => x.ChecklistID === ct.dataset.cat); const v = prompt('Catatan untuk "' + it.Tugas + '":', it.Catatan || ''); if (v == null) return; it.Catatan = v; render(); await API.write('checklist.toggle', { ChecklistID: it.ChecklistID, Status: it.Status, Catatan: v }, { silent: true }); return; }
    const ad = e.target.closest('[data-add]'); if (ad) { const t = prompt('Tugas baru:'); if (!t) return; const r = await API.write('checklist.save', { DivisiID: ad.dataset.add, Tugas: t }); if (r.success) muat(true); }
  });
  view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  const rs = view.querySelector('[data-reset]'); if (rs) rs.onclick = async () => { if (await konfirmasi('Reset semua checklist menjadi belum selesai (mis. setelah gladi)?', { bahaya: true, ya: 'Reset' })) { await API.write('checklist.reset', {}); muat(true); } };
  const muat = (fresh) => SWR.load('checklist.get', {}, (d) => { if (d) { D = d; render(); } }, { maxAge: 8000, fresh });
  await muat();
  App.every(15000, () => { if (SW.Activity.due('chk', 15000, 60000) && tab === 'chk') muat(); });
});

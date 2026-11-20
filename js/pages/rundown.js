/* Rundown — Plan A/B/C, satu FINAL; susun ulang (seret), durasi menggeser jam otomatis */
App.page('rundown', async function (view, params) {
  const { esc, API, SWR, Sesi, drawer, modal, konfirmasi, toast, lib } = SW, { ic, pill, kosong, formHtml, formVal, formCek } = UI;
  if (App.perluKegiatan(view)) return;
  const edit = App.boleh('rundown', Sesi.is('SUPERADMIN', 'KOORDINATOR')) && !App.arsip();
  let planId = params.plan || '', D = null;
  view.innerHTML = App.head('Rundown Acara', 'Susun beberapa rencana (Plan A/B/C), lalu tetapkan satu sebagai <b>FINAL</b> — itulah yang tampil di HP panitia dan layar MC.', '<a class="btn" href="#/live">' + ic('sensors') + 'Mode Live</a>' + (edit ? '<button class="btn" data-copy>' + ic('content_copy') + 'Plan baru</button><button class="btn primary" data-final>' + ic('verified') + 'Jadikan Final</button>' : '')) +
    '<div class="row mb" data-plans></div><div class="grid g-2-1"><div data-list>' + UI.skeleton(8) + '</div><div class="col" data-side></div></div>';
  const elPlans = view.querySelector('[data-plans]'), elList = view.querySelector('[data-list]'), elSide = view.querySelector('[data-side]');
  const JENIS = ['', 'PROSESI', 'SAMBUTAN', 'PENAMPILAN', 'VIDEO', 'HIMBAUAN', 'PEMBUKAAN', 'PENUTUPAN', 'SESI FOTO'];
  function render(d) {
    D = d; if (!d) return;
    planId = d.plan ? d.plan.PlanID : '';
    elPlans.innerHTML = '<div class="seg">' + d.plans.map((p) => '<button data-p="' + p.PlanID + '" class="' + (p.PlanID === planId ? 'on' : '') + '">' + esc(p.Nama) + (p.IsFinal === 'YA' ? ' ✓' : '') + '</button>').join('') + '</div>' +
      (d.plan ? (d.plan.IsFinal === 'YA' ? pill('FINAL — tampil di semua HP panitia', 'ok') : pill('Draft', 'warn')) + (edit ? '<button class="btn sm ghost" data-editplan>' + ic('tune') + 'Atur rencana</button>' : '') : '');
    if (!d.plan) { elList.innerHTML = '<div class="card">' + kosong('Belum ada rencana rundown', 'Buat Plan A untuk memulai.', 'event_note', edit ? '<button class="btn primary" data-newplan>' + ic('add') + 'Buat Plan A</button>' : '') + '</div>'; const nb = elList.querySelector('[data-newplan]'); if (nb) nb.onclick = () => simpanPlan({ Nama: 'Plan A', JamMulai: '08:00' }); elSide.innerHTML = ''; return; }
    const tanpaPetugas = d.items.filter((x) => !x.PetugasNama && /SAMBUTAN|PENAMPILAN/.test(x.Jenis)).length, tanpaTeks = d.items.filter((x) => !x.TeksMCID).length;
    elList.innerHTML = '<div class="timeline" data-sort>' + d.items.map((it) => '<div class="tl-item ' + (it.StatusLive === 'SELESAI' ? 'selesai' : it.StatusLive === 'BERJALAN' ? 'berjalan' : '') + '" data-id="' + it.ItemID + '">' +
      '<span class="drag">' + (edit ? ic('drag_indicator') : '<b class="num">' + it.No + '</b>') + '</span>' +
      '<div class="jam num">' + esc(it.Mulai) + '<small>s.d. ' + esc(it.Selesai) + '</small></div>' +
      '<div style="min-width:0"><div class="ttl">' + esc(it.Kegiatan) + '</div>' + (it.KegiatanArab ? '<div class="ar small" style="direction:rtl;text-align:left">' + esc(it.KegiatanArab) + '</div>' : '') +
      '<div class="meta">' + (it.Jenis ? pill(it.Jenis, it.Jenis === 'PROSESI' ? 'lilac' : it.Jenis === 'SAMBUTAN' ? 'yellow' : 'mute') : '') + (it.KodeInstrumen ? '<span class="kbd">♪ ' + esc(it.KodeInstrumen) + '</span>' : '') +
      (it.PetugasNama ? '<span class="small">' + ic('person') + ' ' + esc(it.PetugasNama) + '</span>' : (/SAMBUTAN|PENAMPILAN/.test(it.Jenis) ? '<span class="pill warn">' + ic('warning') + 'Belum ada petugas</span>' : '')) +
      (it.TeksMCID ? '<span class="pill mute">' + ic('record_voice_over') + esc(it.TeksJudul || 'Teks MC') + '</span>' : '<span class="pill warn">Teks MC kosong</span>') + (it.StatusLive === 'BERJALAN' ? pill('Berjalan', 'info') : '') + '</div></div>' +
      '<div class="row" style="gap:6px;flex-wrap:nowrap">' + (edit ? '<button class="btn xs" data-dur="-5" title="Kurangi 5 menit">−</button>' : '') + '<span class="pill mute num">' + it.Durasi + ' mnt</span>' + (edit ? '<button class="btn xs" data-dur="5" title="Tambah 5 menit">+</button><button class="btn xs" data-ed title="Ubah">' + ic('edit') + '</button>' : '') + '</div></div>').join('') + '</div>' +
      (edit ? '<button class="btn block mt" data-additem>' + ic('add') + 'Tambah agenda</button>' : '');
    elSide.innerHTML = '<div class="card yellow"><div class="lbl small b" style="letter-spacing:.1em">RINGKASAN ' + esc(d.plan.Nama.toUpperCase()) + '</div><div style="font-size:34px;font-weight:700;margin:8px 0" class="num">' + esc(d.items.length ? d.items[0].Mulai : '-') + ' – ' + esc(d.selesai || '-') + '</div><div class="chipset"><span class="chip">' + d.items.length + ' agenda</span><span class="chip">' + Math.floor(d.totalMenit / 60) + ' jam ' + (d.totalMenit % 60) + ' menit</span></div></div>' +
      '<div class="card"><h3>Pemeriksaan</h3><div class="col" style="margin-top:10px;gap:8px">' + (tanpaPetugas ? '<div class="notice">' + ic('warning') + '<div>' + tanpaPetugas + ' sambutan/penampilan belum ada petugas.</div></div>' : '') + (tanpaTeks ? '<div class="notice">' + ic('record_voice_over') + '<div>' + tanpaTeks + ' agenda belum terhubung ke teks MC.</div></div>' : '') + (!tanpaPetugas && !tanpaTeks ? '<div class="notice ok">' + ic('check_circle') + '<div>Rundown lengkap.</div></div>' : '') + '</div></div>' +
      '<div class="card cream"><h3>Perbandingan rencana</h3><table class="tbl compact mt"><tbody>' + d.plans.map((p) => '<tr><td>' + esc(p.Nama) + '</td><td>' + (p.IsFinal === 'YA' ? pill('Final') : '') + '</td><td class="small muted">' + esc(p.Keterangan || '') + '</td></tr>').join('') + '</tbody></table></div>';
    if (edit) pasangSortable();
  }
  async function pasangSortable() {
    const Sortable = await lib('sortable');
    const el = elList.querySelector('[data-sort]'); if (!el) return;
    Sortable.create(el, { handle: '.drag', animation: 150, ghostClass: 'sortable-ghost', onEnd: async () => { const ids = [...el.children].map((x) => x.dataset.id); const r = await API.write('rundown.reorder', { PlanID: planId, ids }, { silent: true }); if (r.success) { toast('Urutan disimpan — jam otomatis menyesuaikan.', 'ok'); muat(true); } } });
  }
  const muat = (fresh) => SWR.load('rundown.get', { planId }, (d, c, err) => err ? (elList.innerHTML = '<div class="card">' + kosong('Gagal memuat', esc(err.message), 'error') + '</div>') : render(d), { maxAge: 10000, fresh });
  async function simpanPlan(p) { const r = await API.write('rundown.savePlan', p); if (r.success) { planId = r.data.PlanID || planId; muat(true); } return r.success; }
  function formItem(it) {
    const teksOpt = [['', '— tanpa teks MC —']].concat((D.teks || []).map((t) => [t.TeksID, 'TEKS ' + t.No + ' · ' + t.Judul]));
    const F = [{ k: 'Kegiatan', label: 'Nama agenda', req: true, full: true }, { k: 'KegiatanArab', label: 'Nama (Arab)', ar: true, full: true }, { k: 'Jenis', label: 'Jenis', type: 'select', opts: JENIS }, { k: 'Durasi', label: 'Durasi (menit)', type: 'number', def: 5 },
      { k: 'PetugasNama', label: 'Petugas / pembicara' }, { k: 'PetugasJabatan', label: 'Jabatan petugas' }, { k: 'KodeInstrumen', label: 'Kode instrumen (audio/video)' }, { k: 'PIC', label: 'PIC lapangan' },
      { k: 'TeksMCID', label: 'Teks MC', type: 'select', opts: teksOpt, full: true }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2 }];
    const body = document.createElement('div'); body.innerHTML = formHtml(F, it || {}) + '<p class="small muted mt">' + ic('info') + ' Nama petugas otomatis mengisi <span class="kbd">{{petugas}}</span> di teks MC.</p>';
    drawer({ title: it ? 'Ubah Agenda' : 'Tambah Agenda', size: 'wide', body, buttons: [it ? { label: 'Hapus', cls: 'danger', icon: 'delete', onClick: async () => { if (!(await konfirmasi('Hapus agenda ini?', { bahaya: true, ya: 'Hapus' }))) return false; const r = await API.write('rundown.deleteItem', { ItemID: it.ItemID }); if (r.success) muat(true); } } : { label: 'Batal' }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      if (!formCek(body, F)) return false; const v = formVal(body, F); if (it) v.ItemID = it.ItemID; else v.PlanID = planId;
      const r = await API.write('rundown.saveItem', v); if (!r.success) return false; muat(true);
    } }] });
  }
  elPlans.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (b) { planId = b.dataset.p; muat(); return; }
    if (e.target.closest('[data-editplan]')) {
      const F = [{ k: 'Nama', label: 'Nama rencana', req: true }, { k: 'JamMulai', label: 'Jam mulai', type: 'time' }, { k: 'Keterangan', label: 'Keterangan', full: true }];
      const body = document.createElement('div'); body.innerHTML = formHtml(F, D.plan);
      modal({ title: 'Atur ' + esc(D.plan.Nama), body, buttons: [{ label: 'Hapus rencana', cls: 'danger', onClick: async () => { if (!(await konfirmasi('Hapus ' + esc(D.plan.Nama) + ' beserta agendanya?', { bahaya: true }))) return false; const r = await API.write('rundown.deletePlan', { PlanID: planId }); if (r.success) { planId = ''; muat(true); } } }, { label: 'Simpan', cls: 'primary', onClick: async () => { const v = formVal(body, F); v.PlanID = planId; return await simpanPlan(v) ? undefined : false; } }] });
    }
  });
  elList.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-id]'); const it = row && D.items.find((x) => x.ItemID === row.dataset.id);
    const dur = e.target.closest('[data-dur]');
    if (dur && it) { const n = Math.max(1, Number(it.Durasi) + Number(dur.dataset.dur)); it.Durasi = n; render(D); await API.write('rundown.saveItem', { ItemID: it.ItemID, Durasi: n }, { silent: true }); muat(true); return; }
    if (e.target.closest('[data-ed]') && it) return formItem(it);
    if (e.target.closest('[data-additem]')) return formItem(null);
    if (it && !edit) drawer({ title: esc(it.Kegiatan), body: '<p><b>' + esc(it.Mulai) + ' – ' + esc(it.Selesai) + '</b> (' + it.Durasi + ' menit)</p><p>Petugas: ' + esc(it.PetugasNama || '-') + '</p><p>Kode instrumen: ' + esc(it.KodeInstrumen || '-') + '</p><p>Teks MC: ' + esc(it.TeksJudul || '-') + '</p><p class="muted">' + esc(it.Catatan || '') + '</p>' });
  });
  const cp = view.querySelector('[data-copy]'); if (cp) cp.onclick = async () => { const r = await API.write('rundown.copyPlan', { dari: planId }); if (r.success) { planId = r.data.PlanID; muat(true); } };
  const fn = view.querySelector('[data-final]'); if (fn) fn.onclick = async () => { if (D.plan.IsFinal === 'YA') return toast(D.plan.Nama + ' sudah FINAL.', 'info'); if (await konfirmasi('Jadikan <b>' + esc(D.plan.Nama) + '</b> sebagai rundown FINAL? Semua HP panitia & layar MC akan mengikuti rencana ini.', { ya: 'Jadikan Final' })) { await API.write('rundown.setFinal', { PlanID: planId }); muat(true); } };
  await muat();
});

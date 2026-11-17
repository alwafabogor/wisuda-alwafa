/* Teks MC — tampilan baca panggung (sinkron rundown live) + editor teks dengan variabel & riwayat versi */
App.page('mc', async function (view, params) {
  const { esc, API, SWR, Sesi, Store, drawer, modal, konfirmasi, toast, Activity } = SW, { ic, pill, kosong, formHtml, formVal } = UI;
  if (App.perluKegiatan(view)) return;
  const bisaEdit = Sesi.is('SUPERADMIN', 'KOORDINATOR', 'MC') && !App.arsip(), admin = Sesi.is('SUPERADMIN', 'KOORDINATOR');
  let mode = params.mode === 'editor' && bisaEdit ? 'editor' : 'baca';
  let R = null, idx = 0, ikutLive = Store.get('mc_ikut', true), fs = Store.get('mc_fs', 22), gelap = Store.get('mc_gelap', false), liveV = '';
  view.innerHTML = '<div class="row sb mb"><div class="seg" data-mode><button data-v="baca">' + ic('chrome_reader_mode') + ' Panggung</button>' + (bisaEdit ? '<button data-v="editor">' + ic('edit_note') + ' Editor</button>' : '') + '</div><span data-live></span></div><div data-body>' + UI.skeleton(8) + '</div>';
  const body = view.querySelector('[data-body]');
  const setMode = () => view.querySelectorAll('[data-mode] button').forEach((b) => b.classList.toggle('on', b.dataset.v === mode));

  /* ---------- render teks dengan variabel ---------- */
  function teksHtml(isi, vars, it) {
    const v = Object.assign({}, vars, it ? { petugas: it.petugas, jabatan_petugas: it.jabatan_petugas } : {});
    return String(isi || '').split('\n').map((ln) => {
      const t = ln.trim();
      if (!t) return '';
      if (/^-{2,}$/.test(t) || /^—*\s*jeda\s*—*$/i.test(t)) return '<div class="jeda">jeda</div>';
      if (t === '{{daftar_wisudawan}}') return '<div class="panggil">' + (R.wisudawan || []).map((w, i) => '<div><b class="num">' + (w.no || i + 1) + '</b><span><b>' + esc(w.nama) + '</b>' + (w.terbaik === 'YA' ? ' ⭐' : '') + '<br><span class="small">' + esc([w.prodi, w.asal].filter(Boolean).join(' · ')) + (w.ayah || w.ibu ? '<br>Putra/i dari Bapak ' + esc(w.ayah || '-') + ' & Ibu ' + esc(w.ibu || '-') : '') + (w.predikat ? ' · <i>' + esc(w.predikat) + '</i>' : '') + '</span></span></div>').join('') + '</div>';
      if (t === '{{daftar_senat}}') return '<div class="panggil">' + (R.senat || []).map((s) => '<div><b>' + esc(s.no) + '</b><span><b>' + esc(s.nama) + '</b><br><span class="small">' + esc(s.jabatan) + '</span></span></div>').join('') + '</div>';
      let h = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{\{(\w+)\}\}/g, (m, k) => { const val = v[k]; return val === undefined || val === '' ? '<span class="var kosong">{{' + k + '}}</span>' : '<span class="var">' + esc(val) + '</span>'; });
      return SW.isArab(t) && !/[A-Za-z]{4,}/.test(t) ? '<span class="ar">' + h + '</span>' : '<p>' + h + '</p>';
    }).join('');
  }
  const daftar = () => (R.urut || []).filter((u) => u.teks).concat((R.lepas || []).map((t) => ({ Kegiatan: t.Judul, teks: t, lepas: true })));

  /* ---------- PANGGUNG ---------- */
  function renderBaca() {
    const list = daftar(); if (!list.length) { body.innerHTML = '<div class="card">' + kosong('Belum ada teks MC', 'Hubungkan teks MC ke agenda rundown di menu Rundown.', 'record_voice_over') + '</div>'; return; }
    idx = Math.max(0, Math.min(idx, list.length - 1));
    const it = list[idx], t = it.teks;
    body.innerHTML = '<div class="mc-wrap"><div class="card row sb" style="padding:12px 14px;margin-bottom:12px;position:sticky;top:0;z-index:5"><div style="min-width:0;flex:1"><div class="small muted">' + (it.lepas ? 'Teks tambahan' : esc(it.Mulai + ' · ') + (it.StatusLive === 'BERJALAN' ? '<span class="pill info"><i class="pulse"></i>Berjalan</span>' : '')) + '</div><b style="font-size:16px">TEKS ' + esc(t.No) + ' · ' + esc(t.Judul) + '</b></div>' +
      '<div class="row" style="gap:6px"><span class="pill mute">' + esc(t.Durasi) + ' mnt</span><button class="btn sm icon" data-nav="-1" aria-label="Sebelumnya">' + ic('chevron_left') + '</button><span class="small num">' + (idx + 1) + '/' + list.length + '</span><button class="btn sm icon" data-nav="1" aria-label="Berikutnya">' + ic('chevron_right') + '</button>' +
      '<button class="btn sm icon" data-fs="-2" aria-label="Perkecil">A-</button><button class="btn sm icon" data-fs="2" aria-label="Perbesar">A+</button><button class="btn sm icon" data-gelap aria-label="Mode gelap">' + ic(gelap ? 'light_mode' : 'dark_mode') + '</button><button class="btn sm icon desk-only" data-full aria-label="Layar penuh">' + ic('fullscreen') + '</button><button class="btn sm icon" data-list aria-label="Daftar teks">' + ic('list') + '</button></div></div>' +
      '<label class="check small" style="margin:0 0 10px 4px"><input type="checkbox" data-ikut' + (ikutLive ? ' checked' : '') + '> Ikuti agenda yang sedang berjalan (otomatis pindah teks)</label>' +
      '<article class="mc-read' + (gelap ? ' dark' : '') + '" style="--mcfs:' + fs + 'px">' + (t.Instruksi ? '<div class="instr">' + ic('campaign') + ' <b>Instruksi MC:</b> ' + esc(t.Instruksi) + '</div>' : '') + (it.petugas ? '<div class="instr" style="border-style:solid">' + ic('person') + ' Petugas: <b>' + esc(it.petugas) + '</b>' + (it.jabatan_petugas ? ' — ' + esc(it.jabatan_petugas) : '') + '</div>' : '') + teksHtml(t.Isi, R.vars, it) + '</article></div>';
  }
  function lompatKeLive(items) {
    if (!ikutLive || !R) return;
    const jalan = (items || []).find((x) => x.StatusLive === 'BERJALAN'); if (!jalan) return;
    const list = daftar(), i = list.findIndex((u) => u.ItemID === jalan.ItemID);
    if (i > -1 && i !== idx) { idx = i; if (mode === 'baca') renderBaca(); toast('Pindah ke: ' + list[i].teks.Judul, 'info'); }
  }
  async function pollLive() {
    const r = await API.read('live.state', { v: liveV }, { silent: true, noBatch: true });
    if (!r.success || r.data.changed === false) return;
    const pertama = !liveV; liveV = r.data.v;
    if (!pertama) await muat(true);
    (R.urut || []).forEach((u) => { const x = (r.data.items || []).find((y) => y.ItemID === u.ItemID); if (x) u.StatusLive = x.StatusLive; });
    lompatKeLive(r.data.items);
    view.querySelector('[data-live]').innerHTML = r.data.berjalanId ? pill('Live tersambung', 'info') : pill('Belum ada agenda berjalan', 'mute');
  }

  /* ---------- EDITOR ---------- */
  let edSel = null, teksAll = [];
  async function renderEditor() {
    const r = await API.read('mc.list', {}); if (!r.success) { body.innerHTML = '<div class="card">' + kosong('Gagal memuat', esc(r.message), 'error') + '</div>'; return; }
    teksAll = r.data.teks; const vars = r.data.vars;
    if (!edSel && teksAll[0]) edSel = teksAll[0].TeksID;
    const t = teksAll.find((x) => x.TeksID === edSel);
    const boleh = (x) => admin || !x.PenugasanMC || String(x.PenugasanMC).split(/[,;\s]+/).indexOf(Sesi.me.email) > -1;
    body.innerHTML = '<div class="grid g-hp1" style="grid-template-columns:minmax(0,300px) minmax(0,1fr)"><div class="card pad0"><div class="row sb" style="padding:12px 14px"><b>' + teksAll.length + ' teks</b>' + (admin ? '<button class="btn xs primary" data-new>' + ic('add') + 'Baru</button>' : '') + '</div><div style="max-height:70vh;overflow:auto">' +
      teksAll.map((x) => '<button class="row" style="width:100%;border:0;border-top:1px solid #E5E1D8;background:' + (x.TeksID === edSel ? '#FFD35C' : '#fff') + ';padding:10px 14px;text-align:left;cursor:pointer;gap:8px" data-sel="' + x.TeksID + '"><span class="kbd">' + esc(x.No) + '</span><span style="flex:1;min-width:0"><b class="small" style="display:block">' + esc(x.Judul) + '</b><span class="tiny muted">' + esc(x.Jenis) + ' · v' + esc(x.Versi || 1) + (x.PenugasanMC ? ' · ' + esc(x.PenugasanMC) : '') + '</span></span>' + (boleh(x) ? '' : ic('lock')) + '</button>').join('') + '</div>' +
      (admin ? '<div class="col" style="padding:12px 14px;border-top:1px solid #E5E1D8"><button class="btn sm" data-reset>' + ic('restart_alt') + 'Muat ulang dari master</button><button class="btn sm" data-master>' + ic('save_as') + 'Simpan sebagai master</button></div>' : '') + '</div>' +
      '<div>' + (t ? '<div class="card"><div class="row sb mb"><h3>TEKS ' + esc(t.No) + '</h3><div class="row">' + pill('Versi ' + (t.Versi || 1), 'mute') + '<button class="btn sm" data-ver>' + ic('history') + 'Riwayat</button>' + (admin ? '<button class="btn sm danger" data-del>' + ic('delete') + '</button>' : '') + '</div></div>' +
        formHtml([{ k: 'Judul', label: 'Judul', full: true }, { k: 'Jenis', label: 'Jenis acara', type: 'select', opts: ['', 'HIMBAUAN', 'PEMBUKAAN', 'PROSESI', 'SAMBUTAN', 'PENAMPILAN', 'VIDEO', 'INDONESIA RAYA', 'SESI FOTO', 'PENUTUPAN'] }, { k: 'Durasi', label: 'Durasi (menit)', type: 'number' }, { k: 'Instruksi', label: 'Instruksi untuk MC', full: true }].concat(admin ? [{ k: 'PenugasanMC', label: 'Ditugaskan ke (email MC, pisahkan koma)', full: true, help: 'Kosong = semua MC boleh mengubah.' }] : []), t) +
        '<div class="field full mt"><span>Isi teks</span><div class="chipset" style="margin-bottom:6px">' + ['petugas', 'jabatan_petugas', 'hari_tanggal', 'wisuda_ke', 'wisuda_ke_teks', 'wisuda_ke_urut', 'acara', 'institusi', 'lokasi', 'jumlah_wisudawan', 'wisudawan_terbaik', 'daftar_wisudawan', 'daftar_senat'].concat(Object.keys(vars).filter((k) => !/^(acara|angkatan|wisuda_ke|wisuda_ke_teks|wisuda_ke_urut|tahun|tanggal|hari_tanggal|jam|lokasi|tema|institusi|singkat|kota|jumlah_wisudawan|wisudawan_terbaik)$/.test(k))).map((k) => '<button class="chip" style="cursor:pointer" data-ins="' + k + '">{{' + k + '}}</button>').join('') + '<button class="chip" style="cursor:pointer" data-ins="---">— jeda —</button></div><textarea class="inp" data-isi rows="16" style="font-size:15px;line-height:1.7"' + (boleh(t) ? '' : ' readonly') + '>' + esc(t.Isi) + '</textarea><small>Baris <b>---</b> = jeda · <b>**teks**</b> = tebal · baris berhuruf Arab otomatis kanan-ke-kiri · terakhir diubah ' + esc(t.DiubahOleh || '-') + '</small></div>' +
        '<div class="row end mt">' + (boleh(t) ? '<button class="btn" data-prev>' + ic('visibility') + 'Pratinjau</button><button class="btn primary" data-save>' + ic('save') + 'Simpan</button>' : '<span class="pill warn">' + ic('lock') + 'Ditugaskan ke MC lain</span>') + '</div></div>' : '<div class="card">' + kosong('Pilih teks', '', 'record_voice_over') + '</div>') + '</div></div>';
    const ta = body.querySelector('[data-isi]');
    body.querySelectorAll('[data-ins]').forEach((b) => b.onclick = () => { if (!ta || ta.readOnly) return; const s = b.dataset.ins === '---' ? '\n---\n' : '{{' + b.dataset.ins + '}}'; const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + s + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = p + s.length; });
  }
  body.addEventListener('click', async (e) => {
    const nv = e.target.closest('[data-nav]'); if (nv) { idx += Number(nv.dataset.nav); ikutLive = false; Store.set('mc_ikut', false); renderBaca(); window.scrollTo(0, 0); return; }
    const f = e.target.closest('[data-fs]'); if (f) { fs = Math.max(14, Math.min(44, fs + Number(f.dataset.fs))); Store.set('mc_fs', fs); body.querySelector('.mc-read').style.setProperty('--mcfs', fs + 'px'); return; }
    if (e.target.closest('[data-gelap]')) { gelap = !gelap; Store.set('mc_gelap', gelap); renderBaca(); return; }
    if (e.target.closest('[data-full]')) { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen(); else document.exitFullscreen(); return; }
    if (e.target.closest('[data-list]')) { const list = daftar(); const m = drawer({ title: 'Daftar Teks MC', foot: false, body: '<div class="col">' + list.map((u, i) => '<button class="card ' + (i === idx ? 'yellow' : 'flat') + '" style="text-align:left;cursor:pointer" data-i="' + i + '"><div class="small muted">' + (u.lepas ? 'Tambahan' : esc(u.Mulai)) + (u.StatusLive === 'BERJALAN' ? ' · <b style="color:#1D4ED8">BERJALAN</b>' : '') + '</div><b>TEKS ' + esc(u.teks.No) + ' · ' + esc(u.teks.Judul) + '</b></button>').join('') + '</div>' }); m.body.addEventListener('click', (ev) => { const b = ev.target.closest('[data-i]'); if (!b) return; idx = Number(b.dataset.i); ikutLive = false; m.close(); renderBaca(); }); return; }
    const s = e.target.closest('[data-sel]'); if (s) { edSel = s.dataset.sel; renderEditor(); return; }
    const t = teksAll.find((x) => x.TeksID === edSel);
    if (e.target.closest('[data-save]')) { const F = [{ k: 'Judul' }, { k: 'Jenis' }, { k: 'Durasi', type: 'number' }, { k: 'Instruksi' }].concat(admin ? [{ k: 'PenugasanMC' }] : []); const v = formVal(body, F); v.TeksID = edSel; v.Isi = body.querySelector('[data-isi]').value; const r = await API.write('mc.save', v); if (r.success) { renderEditor(); muat(true); } return; }
    if (e.target.closest('[data-prev]')) { const isi = body.querySelector('[data-isi]').value; modal({ title: 'Pratinjau', size: 'wide', body: '<article class="mc-read" style="--mcfs:19px">' + teksHtml(isi, R ? R.vars : {}, { petugas: '(nama petugas)', jabatan_petugas: '' }) + '</article>' }); return; }
    if (e.target.closest('[data-ver]')) { const r = await API.read('mc.versions', { TeksID: edSel }); const m = drawer({ title: 'Riwayat versi', size: 'wide', foot: false, body: (r.data || []).length ? r.data.map((v) => '<div class="card flat mb"><div class="row sb"><b>Versi ' + v.Versi + '</b><span class="small muted">' + esc(v.Oleh || '') + ' · ' + esc(SW.tglID(v.Waktu, true)) + '</span><button class="btn xs" data-rest="' + v.VersiID + '">Pulihkan</button></div><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;max-height:200px;overflow:auto">' + esc(v.Isi) + '</pre></div>').join('') : kosong('Belum ada versi lama', '', 'history') }); m.body.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-rest]'); if (!b) return; const x = await API.write('mc.restore', { VersiID: b.dataset.rest }); if (x.success) { m.close(); renderEditor(); } }); return; }
    if (e.target.closest('[data-del]') && t) { if (await konfirmasi('Hapus teks <b>' + esc(t.Judul) + '</b>?', { bahaya: true })) { await API.write('mc.delete', { TeksID: edSel }); edSel = null; renderEditor(); } return; }
    if (e.target.closest('[data-new]')) { const r = await API.write('mc.create', { Judul: 'Teks baru' }); if (r.success) { edSel = r.data.TeksID; renderEditor(); } return; }
    if (e.target.closest('[data-reset]')) { if (await konfirmasi('Muat ulang semua teks dari master? Teks angkatan ini akan diganti (versi lama tidak dapat dipulihkan).', { bahaya: true, ya: 'Muat ulang' })) { await API.write('mc.resetMaster', { konfirmasi: true }); edSel = null; renderEditor(); } return; }
    if (e.target.closest('[data-master]')) { if (await konfirmasi('Simpan semua teks angkatan ini sebagai master bawaan untuk angkatan berikutnya?')) await API.write('mc.simpanKeMaster', {}); }
  });
  body.addEventListener('change', (e) => { if (e.target.matches('[data-ikut]')) { ikutLive = e.target.checked; Store.set('mc_ikut', ikutLive); if (ikutLive) pollLive(); } });
  view.querySelector('[data-mode]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.v; setMode(); mode === 'baca' ? renderBaca() : renderEditor(); });
  const muat = (fresh) => SWR.load('mc.render', {}, (d) => { if (!d) return; R = d; if (mode === 'baca') renderBaca(); }, { maxAge: 15000, fresh });
  setMode();
  await muat();
  if (mode === 'editor') renderEditor();
  await pollLive();
  App.every(2000, () => { if (Activity.due('mclive', 5000, 20000)) pollLive(); });
});

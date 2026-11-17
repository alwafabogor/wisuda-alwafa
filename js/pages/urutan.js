/* Urutan Maju — wisudawan (seret untuk mengatur) & barisan masuk Senat */
App.page('urutan', async function (view) {
  const { esc, API, SWR, Sesi, lib, toast, konfirmasi } = SW, { ic, pill, kosong, avatar } = UI;
  if (App.perluKegiatan(view)) return;
  const edit = Sesi.is('SUPERADMIN', 'KOORDINATOR') && !App.arsip();
  let tab = 'mhs', D = null, ubah = false;
  view.innerHTML = App.head('Urutan Maju', 'Urutan maju mengisi urutan masuk, daftar panggil MC, dan urutan slide PPT secara otomatis.', '<button class="btn" data-print>' + ic('print') + 'Cetak</button>' + (edit ? '<select class="inp sm" data-cara style="width:auto"><option value="prodi_jk">Prodi → Ikhwan/Akhwat</option><option value="jk_prodi">Ikhwan/Akhwat → Prodi</option><option value="nama">Abjad nama</option></select><button class="btn" data-auto>' + ic('auto_awesome') + 'Urutkan otomatis</button><button class="btn primary" data-save disabled>' + ic('save') + 'Simpan urutan</button>' : '')) +
    '<div class="tabs"><button data-t="mhs" class="on">' + ic('school') + 'Mahasiswa</button><button data-t="senat">' + ic('gavel') + 'Senat / Tokoh</button></div><div data-body>' + UI.skeleton(8) + '</div>';
  const body = view.querySelector('[data-body]'), btnSave = view.querySelector('[data-save]');
  function render() {
    if (!D) return;
    if (tab === 'mhs') {
      const w = D.wisudawan;
      if (!w.length) { body.innerHTML = '<div class="card">' + kosong('Belum ada wisudawan', 'Tambahkan atau impor data wisudawan di Master Data.', 'school', '<a class="btn primary" href="#/master?tab=Wisudawan">Master Data</a>') + '</div>'; return; }
      body.innerHTML = '<div class="grid g-2-1"><div class="card pad0"><div class="row sb" style="padding:14px 16px"><b>' + w.length + ' wisudawan</b><span class="small muted">' + (edit ? 'Seret ' + ic('drag_indicator') + ' untuk mengubah urutan' : 'Urutan maju ke panggung') + '</span></div><div data-sort>' +
        w.map((x, i) => '<div class="row" data-id="' + x.id + '" style="padding:10px 16px;border-top:1px solid #E5E1D8;gap:12px;background:#fff"><span class="drag" style="cursor:' + (edit ? 'grab' : 'default') + ';color:#A3A199">' + ic('drag_indicator') + '</span><b class="num" style="width:28px" data-no>' + (i + 1) + '</b>' + avatar(x.nama, '', 'sm') + '<div style="flex:1 1 150px;min-width:0"><b>' + esc(x.nama) + (x.terbaik === 'YA' ? ' ⭐' : '') + '</b><div class="small muted">' + esc(x.nim || '') + ' · ' + esc(x.singkat || x.prodi) + '</div></div>' + pill(x.jk === 'P' ? 'Akhwat' : 'Ikhwan', x.jk === 'P' ? 'lilac' : 'sky') + (x.kursi ? pill(x.kursi, 'mute') : '') + '</div>').join('') + '</div></div>' +
        '<div class="col"><div class="card yellow"><b>Ringkasan</b><div class="chipset mt">' + Object.entries(w.reduce((m, x) => { const k = x.singkat || x.prodi || '—'; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([k, n]) => '<span class="chip">' + n + ' ' + esc(k) + '</span>').join('') + '<span class="chip">' + w.filter((x) => x.jk === 'L').length + ' ikhwan</span><span class="chip">' + w.filter((x) => x.jk === 'P').length + ' akhwat</span></div></div><div class="card cream small">' + ic('info') + ' Setelah disimpan, MC melihat daftar panggil sesuai urutan ini (<span class="kbd">{{daftar_wisudawan}}</span>) dan Studio Dokumen membuat slide dengan urutan yang sama.</div></div></div>';
    } else {
      const s = D.senat;
      body.innerHTML = '<div class="card"><div class="row sb mb"><b>Barisan masuk Dewan Senat & Tokoh</b>' + (edit ? '<a class="btn sm" href="#/master?tab=SusunanSenat">' + ic('edit') + 'Kelola data</a>' : '') + '</div>' + (s.length ? '<div class="row" data-sort style="gap:12px;align-items:stretch">' + s.map((x, i) => '<div class="card lilac" data-id="' + x.SenatID + '" style="width:170px;padding:14px;cursor:' + (edit ? 'grab' : 'default') + '"><span class="pill dark" data-no>' + (i + 1) + '</span><div class="b" style="margin-top:10px">' + esc(x.Nama) + '</div><div class="small">' + esc(x.Jabatan || '') + '</div></div>').join('') + '</div>' : kosong('Belum ada susunan senat', 'Isi di Master Data → Senat & Tokoh.', 'gavel')) + '</div>';
    }
    if (edit) pasang();
  }
  async function pasang() {
    const Sortable = await lib('sortable'); const el = body.querySelector('[data-sort]'); if (!el) return;
    Sortable.create(el, { handle: tab === 'mhs' ? '.drag' : undefined, animation: 150, ghostClass: 'sortable-ghost', onEnd: () => { ubah = true; btnSave.disabled = false; [...el.children].forEach((c, i) => { const n = c.querySelector('[data-no]'); if (n) n.textContent = i + 1; }); } });
  }
  const muat = (fresh) => SWR.load('urutan.get', {}, (d) => { if (d) { D = d; render(); } }, { maxAge: 10000, fresh });
  view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { if (ubah && !confirm('Perubahan urutan belum disimpan. Lanjutkan?')) return; ubah = false; if (btnSave) btnSave.disabled = true; tab = b.dataset.t; view.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  if (edit) {
    btnSave.onclick = async () => {
      const ids = [...body.querySelector('[data-sort]').children].map((c) => c.dataset.id);
      const r = tab === 'mhs' ? await API.write('urutan.save', { maju: ids, masuk: ids }) : await API.write('data.bulkSave', { tabel: 'SusunanSenat', rows: ids.map((id, i) => ({ SenatID: id, No: i + 1 })) });
      if (r.success) { ubah = false; btnSave.disabled = true; muat(true); }
    };
    view.querySelector('[data-auto]').onclick = async () => { if (tab !== 'mhs') return toast('Urutan otomatis hanya untuk mahasiswa.', 'info'); if (await konfirmasi('Urutkan ulang semua wisudawan secara otomatis? Urutan manual akan diganti.')) { const r = await API.write('urutan.auto', { cara: view.querySelector('[data-cara]').value }); if (r.success) muat(true); } };
  }
  view.querySelector('[data-print]').onclick = () => {
    const w = window.open('', '_blank'); if (!w || !D) return;
    const rows = tab === 'mhs' ? D.wisudawan.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.nim || '') + '</td><td>' + esc(x.prodi) + '</td><td>' + (x.jk === 'P' ? 'P' : 'L') + '</td><td>' + esc(x.kursi || '') + '</td></tr>').join('') : D.senat.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.Nama) + '</td><td colspan="4">' + esc(x.Jabatan || '') + '</td></tr>').join('');
    w.document.write('<html><head><meta charset="utf-8"><title>Urutan Maju</title><style>body{font-family:Arial;margin:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:6px}th{background:#eee}h2{text-align:center}</style></head><body><h2>' + (tab === 'mhs' ? 'URUTAN MAJU WISUDAWAN' : 'SUSUNAN MASUK SENAT') + '</h2><table><tr><th>No</th><th>Nama</th><th>NIM</th><th>Prodi</th><th>JK</th><th>Kursi</th></tr>' + rows + '</table><script>setTimeout(()=>print(),400)<\/script></body></html>'); w.document.close();
  };
  await muat();
});

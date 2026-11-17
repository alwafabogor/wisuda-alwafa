/* Rekrutmen Panitia (v1.1) — mahasiswa mendaftar lewat tautan publik daftar.html?k=<kid>
   (foto profil, nama, NIM, WhatsApp, email, divisi pilihan 1 & 2). Koordinator/Superadmin menyeleksi:
   Terima → otomatis masuk Master Panitia sebagai Panitia Acara; Tolak → status Ditolak. */
App.page('rekrutmen', async function (view) {
  const { esc, API, SWR, modal, drawer, konfirmasi, toast, tglID, jamID, driveImg, eksporXLSX, angka, qrDataUrl } = SW;
  const { ic, pill, table, kosong, avatar } = UI;
  if (App.perluKegiatan(view)) return;
  const arsip = App.arsip();
  const base = ((App.boot.settings || {}).APP_URL || location.href.split('#')[0].replace(/index\.html$/, '')).replace(/\/+$/, '').replace(/\/index\.html$/, '');
  const link = base + '/daftar.html?k=' + encodeURIComponent(SW.Sesi.kid);
  let D = null, tbl = null;
  view.innerHTML = App.head('Rekrutmen Panitia', 'Mahasiswa mendaftar sendiri lewat tautan publik. Pilih pendaftar lalu <b>Terima</b> — otomatis masuk Master Panitia sebagai Panitia Acara dan bisa login dengan akun Google-nya.',
    '<button class="btn" data-qr>' + ic('qr_code_2') + 'QR & tautan</button><button class="btn" data-exp>' + ic('download') + 'Ekspor</button>') +
    '<div data-top>' + UI.skeleton(3) + '</div><div data-tbl class="mt"></div>';
  const top = view.querySelector('[data-top]'), host = view.querySelector('[data-tbl]');
  const namaDiv = (id) => { if (!id) return ''; const d = ((D && D.divisi) || []).concat((App.boot && App.boot.divisi) || []).find((x) => x.DivisiID === id); return d ? d.Nama : ''; };
  const waktu = (s) => s ? tglID(s) + ' · ' + jamID(s) : '-';

  function renderTop() {
    const s = D.stat || {};
    top.innerHTML = '<div class="grid g2">' +
      '<div class="card"><div class="row sb" style="gap:10px"><div style="min-width:0;flex:1"><b>' + ic(D.buka ? 'lock_open' : 'lock') + ' Pendaftaran ' + (D.buka ? 'DIBUKA' : 'DITUTUP') + '</b><div class="small muted">' + (D.buka ? 'Tautan bisa diisi siapa saja yang menerimanya.' : 'Calon pendaftar melihat pesan "pendaftaran ditutup".') + '</div></div>' +
        (arsip ? '' : '<label class="check" style="margin:0"><span class="switch"><input type="checkbox" data-buka' + (D.buka ? ' checked' : '') + '><i></i></span>' + (D.buka ? 'Buka' : 'Tutup') + '</label>') + '</div>' +
        '<div class="row mt" style="gap:8px;flex-wrap:nowrap"><input class="inp" readonly value="' + esc(link) + '" data-link style="flex:1;min-width:0"><button class="btn sm" data-salin>' + ic('content_copy') + 'Salin</button></div>' +
        '<label class="field mt"><span>Info untuk pendaftar (opsional)</span><textarea rows="2" data-info placeholder="Mis. syarat semester, jadwal wawancara, kontak panitia"' + (arsip ? ' disabled' : '') + '>' + esc(D.info || '') + '</textarea></label>' +
        (arsip ? '' : '<div class="row end mt"><button class="btn sm" data-simpaninfo>' + ic('save') + 'Simpan info</button></div>') + '</div>' +
      '<div class="grid" style="gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))">' + [['Menunggu', s.Menunggu, 'yellow', 'hourglass_top'], ['Diterima', s.Diterima, 'mint', 'how_to_reg'], ['Ditolak', s.Ditolak, '', 'person_off'], ['Total pendaftar', s.total, 'sky', 'groups']]
        .map((x) => '<div class="card ' + x[2] + ' stat" style="padding:14px;min-height:0"><div class="lbl">' + x[0] + ' <span class="ico">' + ic(x[3]) + '</span></div><div class="big num" style="font-size:30px;margin:8px 0 0">' + angka(x[1] || 0) + '</div></div>').join('') + '</div></div>';
  }
  function mount() {
    tbl = table(host, { key: 'PendaftarID', select: !arsip, pageSize: 25, ph: 'Cari nama / NIM / WA / email…', searchKeys: ['Nama', 'NIM', 'NoWA', 'Email'],
      filters: [['', 'Semua status'], ['Menunggu', 'Menunggu'], ['Diterima', 'Diterima'], ['Ditolak', 'Ditolak']].concat((D.divisi || []).map((d) => ['div:' + d.DivisiID, 'Minat: ' + d.Nama])),
      filterFn: (r, f) => f.indexOf('div:') === 0 ? (r.Divisi1 === f.slice(4) || r.Divisi2 === f.slice(4)) : (r.Status || 'Menunggu') === f,
      emptyTitle: 'Belum ada pendaftar', emptyText: D.buka ? 'Bagikan tautan pendaftaran ke grup mahasiswa.' : 'Buka pendaftaran lalu bagikan tautannya.', emptyIcon: 'how_to_reg',
      tools: arsip ? '' : '<button class="btn sm" data-bulk="terima" disabled>' + ic('how_to_reg') + 'Terima terpilih</button><button class="btn sm" data-bulk="tolak" disabled>' + ic('person_off') + 'Tolak</button>',
      cols: [{ k: 'Nama', label: 'Pendaftar', render: (r) => '<div class="person">' + avatar(r.Nama, '', 'sm') + '<div><b>' + esc(r.Nama) + '</b><small>NIM ' + esc(r.NIM) + '</small></div></div>' },
        { k: 'NoWA', label: 'Kontak', render: (r) => '<div class="small">' + esc(r.NoWA) + '</div><div class="small muted" style="word-break:break-all">' + esc(r.Email) + '</div>' },
        { k: 'Divisi1', label: 'Divisi minat', render: (r) => '<div class="small"><b>1.</b> ' + esc(namaDiv(r.Divisi1) || '-') + '</div>' + (r.Divisi2 ? '<div class="small muted"><b>2.</b> ' + esc(namaDiv(r.Divisi2)) + '</div>' : '') },
        { k: 'Status', label: 'Status', render: (r) => pill(r.Status || 'Menunggu', { Menunggu: 'warn', Diterima: 'ok', Ditolak: 'bad' }[r.Status || 'Menunggu']) + (r.Status === 'Diterima' && r.DivisiDitetapkan ? '<div class="tiny muted" style="margin-top:4px">' + esc(namaDiv(r.DivisiDitetapkan)) + '</div>' : '') },
        { k: 'Waktu', label: 'Mendaftar', render: (r) => '<span class="small">' + esc(waktu(r.Waktu)) + '</span>' }],
      actions: (r) => '<button class="btn xs" data-act="lihat" title="Detail">' + ic('visibility') + '</button>' + (arsip || r.Status === 'Diterima' ? '' : '<button class="btn xs" data-act="terima" title="Terima">' + ic('check') + '</button>'),
      onSelect: (ids) => host.querySelectorAll('[data-bulk]').forEach((b) => { b.disabled = !ids.length; }),
      onAction: (a, r) => a === 'lihat' ? detail(r) : terima([r]) });
    host.querySelectorAll('[data-bulk]').forEach((b) => b.onclick = () => { const pilih = tbl.selected().map((id) => D.rows.find((x) => x.PendaftarID === id)).filter(Boolean); if (pilih.length) (b.dataset.bulk === 'terima' ? terima(pilih) : tolak(pilih)); });
  }
  function render() { renderTop(); if (!tbl) mount(); tbl.set(D.rows || []); }

  async function proses(ids, aksi, extra) {
    const r = await API.write('rekrut.proses', Object.assign({ ids, aksi }, extra || {}));
    if (r.success) { if (tbl) tbl.clearSel(); await muat(); }
    return r.success;
  }
  function pilihanDivisi(def) { return '<select class="inp" data-div><option value="">Sesuai pilihan 1 pendaftar</option>' + (D.divisi || []).map((d) => '<option value="' + esc(d.DivisiID) + '"' + (d.DivisiID === def ? ' selected' : '') + '>' + esc(d.Nama) + '</option>').join('') + '</select>'; }
  function terima(list) {
    const b = document.createElement('div');
    b.innerHTML = '<p style="margin-top:0">' + (list.length === 1 ? 'Terima <b>' + esc(list[0].Nama) + '</b> sebagai Panitia Acara?' : 'Terima <b>' + list.length + ' pendaftar</b> sebagai Panitia Acara?') + '</p>' +
      '<div class="form"><label class="field"><span>Ditempatkan di divisi</span>' + pilihanDivisi(list.length === 1 ? list[0].Divisi1 : '') + '</label><label class="field"><span>Jabatan</span><input class="inp" data-jab value="Anggota"></label></div>' +
      '<div class="notice info mt">' + ic('info') + '<div>Otomatis masuk Master Panitia (jenis Mahasiswa, peran Panitia Acara) dan bisa login dengan email Google yang didaftarkan. Notifikasi WA/email terkirim bila diaktifkan di Pengaturan → Notifikasi.</div></div>';
    modal({ title: 'Terima pendaftar', body: b, buttons: [{ label: 'Batal' }, { label: 'Terima', cls: 'primary', icon: 'how_to_reg', onClick: () => proses(list.map((x) => x.PendaftarID), 'terima', { DivisiID: b.querySelector('[data-div]').value, Jabatan: b.querySelector('[data-jab]').value.trim() || 'Anggota' }) }] });
  }
  function tolak(list) {
    const b = document.createElement('div');
    b.innerHTML = '<p style="margin-top:0">Tolak ' + (list.length === 1 ? '<b>' + esc(list[0].Nama) + '</b>' : '<b>' + list.length + ' pendaftar</b>') + '?</p><label class="field"><span>Catatan (opsional, ikut dikirim bila notifikasi penolakan aktif)</span><textarea rows="2" data-cat></textarea></label>';
    modal({ title: 'Tolak pendaftar', body: b, buttons: [{ label: 'Batal' }, { label: 'Tolak', cls: 'danger', onClick: () => proses(list.map((x) => x.PendaftarID), 'tolak', { Catatan: b.querySelector('[data-cat]').value.trim() }) }] });
  }
  function detail(r) {
    const b = document.createElement('div');
    b.innerHTML = '<div class="row" style="align-items:flex-start;gap:16px"><div data-foto style="width:120px;height:150px;border:1.5px solid #1F1F1F;border-radius:14px;overflow:hidden;background:#F7F5EF;display:grid;place-items:center;flex-shrink:0">' + ic('person') + '</div>' +
      '<div style="flex:1;min-width:0"><h3 style="margin:0 0 6px">' + esc(r.Nama) + '</h3>' + pill(r.Status || 'Menunggu', { Menunggu: 'warn', Diterima: 'ok', Ditolak: 'bad' }[r.Status || 'Menunggu']) +
      '<div class="mt" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">' + [['NIM', r.NIM], ['WhatsApp', r.NoWA], ['Email', r.Email], ['Pilihan 1', namaDiv(r.Divisi1) || '-'], ['Pilihan 2', namaDiv(r.Divisi2) || '-'], ['Mendaftar', waktu(r.Waktu)]]
        .concat(r.DiprosesPada ? [['Diproses', waktu(r.DiprosesPada) + ' · ' + (r.DiprosesOleh || '')]] : []).concat(r.Status === 'Diterima' ? [['Divisi', namaDiv(r.DivisiDitetapkan) || '-']] : []).concat(r.Catatan ? [['Catatan', r.Catatan]] : [])
        .map((x) => '<div class="small"><span class="muted">' + esc(x[0]) + '</span><br><b style="word-break:break-word">' + esc(x[1]) + '</b></div>').join('') + '</div>' +
      '<div class="row mt" style="gap:8px"><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(r.NoWA || '').replace(/^0/, '62')) + '">' + ic('chat') + 'WhatsApp</a></div></div></div>';
    if (r.FotoID) driveImg(r.FotoID).then((u) => { const f = b.querySelector('[data-foto]'); if (u && f) f.innerHTML = '<img src="' + u + '" alt="Foto ' + esc(r.Nama) + '" style="width:100%;height:100%;object-fit:cover">'; });
    const tombol = arsip ? [{ label: 'Tutup' }] : [{ label: 'Hapus', cls: 'ghost', onClick: async () => { if (!(await konfirmasi('Hapus data pendaftar <b>' + esc(r.Nama) + '</b>? Data panitia (bila sudah diterima) tidak ikut terhapus.', { bahaya: true, ya: 'Hapus' }))) return false; const x = await API.write('rekrut.hapus', { ids: [r.PendaftarID] }); if (x.success) muat(); return x.success; } }]
      .concat(r.Status && r.Status !== 'Menunggu' ? [{ label: 'Kembalikan ke Menunggu', onClick: () => proses([r.PendaftarID], 'menunggu') }] : [])
      .concat(r.Status !== 'Ditolak' && r.Status !== 'Diterima' ? [{ label: 'Tolak', cls: 'danger', onClick: (m) => { m.close(); tolak([r]); return false; } }] : [])
      .concat(r.Status !== 'Diterima' ? [{ label: 'Terima', cls: 'primary', icon: 'how_to_reg', onClick: (m) => { m.close(); terima([r]); return false; } }] : []);
    drawer({ title: 'Pendaftar Panitia', size: 'wide', body: b, buttons: tombol });
  }
  async function tampilQR() {
    const qr = await qrDataUrl(link, 420);
    modal({ title: 'Tautan Pendaftaran Panitia', body: '<div style="text-align:center"><div class="qrbox"><img src="' + qr + '" alt="QR pendaftaran panitia"></div><p class="small muted">Pindai untuk membuka formulir pendaftaran panitia mahasiswa.</p><input class="inp" readonly value="' + esc(link) + '"></div>',
      buttons: [{ label: 'Tutup' }, { label: 'Unduh QR', icon: 'download', onClick: () => { SW.unduh(qr, 'QR-Pendaftaran-Panitia.png'); return false; } }, { label: 'Salin tautan', cls: 'primary', icon: 'content_copy', onClick: () => { salin(); return false; } }] });
  }
  async function salin() { try { await navigator.clipboard.writeText(link); toast('Tautan pendaftaran disalin.', 'ok'); } catch (e) { const i = view.querySelector('[data-link]'); if (i) { i.select(); } toast('Salin manual dari kolom tautan.', 'warn'); } }

  view.addEventListener('click', async (e) => {
    if (e.target.closest('[data-qr]')) return tampilQR();
    if (e.target.closest('[data-salin]')) return salin();
    if (e.target.closest('[data-exp]') && D) return eksporXLSX((D.rows || []).map((r) => ({ Nama: r.Nama, NIM: r.NIM, WhatsApp: r.NoWA, Email: r.Email, 'Pilihan 1': namaDiv(r.Divisi1), 'Pilihan 2': namaDiv(r.Divisi2), Status: r.Status, 'Divisi ditetapkan': namaDiv(r.DivisiDitetapkan), Mendaftar: r.Waktu, Catatan: r.Catatan })), 'Pendaftar-Panitia-' + new Date().toISOString().slice(0, 10), 'Pendaftar');
    if (e.target.closest('[data-simpaninfo]')) { const t = view.querySelector('[data-info]').value; await API.write('rekrut.setting', { info: t }); muat(); }
  });
  view.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-buka]')) return;
    const buka = e.target.checked;
    if (!buka && !(await konfirmasi('Tutup pendaftaran panitia? Tautan tetap ada, tetapi formulir tidak bisa diisi.', { ya: 'Tutup pendaftaran' }))) { e.target.checked = true; return; }
    const r = await API.write('rekrut.setting', { buka }); if (r.success) muat(); else e.target.checked = !buka;
  });
  const muat = (fresh) => SWR.load('rekrut.list', {}, (d, c, err) => { if (err) { top.innerHTML = '<div class="card">' + kosong('Tidak dapat memuat', esc(err.message), 'error') + '</div>'; return; } D = d; render(); }, { maxAge: 15000, fresh });
  await muat();
  App.every(30000, () => { if (SW.Activity.due('rekrut', 30000, 120000)) muat(); });
});

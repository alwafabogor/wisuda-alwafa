/* Rekrutmen Panitia — mahasiswa mendaftar lewat tautan publik daftar.html?k=<kid>
   (foto profil, nama, NIM, WhatsApp, email, divisi pilihan 1 & 2). Koordinator/Superadmin menyeleksi:
   Terima → otomatis masuk Master Panitia sebagai Panitia Acara; Tolak → status Ditolak.
   v1.2: Distribusi & Kuota (rekap per divisi, kuota, papan pindah/tukar divisi, saran pemerataan)
         + Kirim notifikasi (pemberitahuan diterima / pengumuman) lewat WhatsApp & email. */
App.page('rekrutmen', async function (view, params) {
  const { esc, API, SWR, modal, drawer, konfirmasi, toast, tglID, jamID, driveImg, eksporXLSX, angka, qrDataUrl } = SW;
  const { ic, pill, table, kosong, avatar } = UI;
  if (App.perluKegiatan(view)) return;
  const arsip = App.arsip(), tulis = App.boleh('rekrutmen', true) && !arsip;
  const base = ((App.boot.settings || {}).APP_URL || location.href.split('#')[0].replace(/index\.html$/, '')).replace(/\/+$/, '').replace(/\/index\.html$/, '');
  const link = base + '/daftar.html?k=' + encodeURIComponent(SW.Sesi.kid);
  let D = null, tbl = null, tampil = (params && params.v) === 'distribusi' ? 'distribusi' : 'pendaftar';
  let draf = {}, dipilih = null, kuotaDraf = null, sortables = [];
  view.innerHTML = App.head('Rekrutmen Panitia', 'Mahasiswa mendaftar sendiri lewat tautan publik. Pilih pendaftar lalu <b>Terima</b> — otomatis masuk Master Panitia sebagai Panitia Acara. Atur kuota & penempatan di <b>Distribusi & Kuota</b>.',
    '<button class="btn" data-qr>' + ic('qr_code_2') + 'QR & tautan</button>' + (tulis ? '<button class="btn" data-kirim>' + ic('send') + 'Kirim notifikasi</button>' : '') + '<button class="btn" data-exp>' + ic('download') + 'Ekspor</button>') +
    '<div class="tabs" data-tampil><button data-v="pendaftar"' + (tampil === 'pendaftar' ? ' class="on"' : '') + '>' + ic('how_to_reg') + 'Pendaftar</button><button data-v="distribusi"' + (tampil === 'distribusi' ? ' class="on"' : '') + '>' + ic('account_tree') + 'Distribusi & Kuota</button></div>' +
    '<div data-hal="pendaftar"' + (tampil === 'pendaftar' ? '' : ' hidden') + '><div data-top>' + UI.skeleton(3) + '</div><div data-tbl class="mt"></div></div>' +
    '<div data-hal="distribusi"' + (tampil === 'distribusi' ? '' : ' hidden') + '>' + UI.skeleton(5) + '</div>';
  const top = view.querySelector('[data-top]'), host = view.querySelector('[data-tbl]'), dist = view.querySelector('[data-hal="distribusi"]');
  const namaDiv = (id) => { if (!id) return ''; const d = ((D && D.divisi) || []).concat((App.boot && App.boot.divisi) || []).find((x) => x.DivisiID === id); return d ? d.Nama : ''; };
  const waktu = (s) => s ? tglID(s) + ' · ' + jamID(s) : '-';
  const posisi = (a) => draf[a.PanitiaID] !== undefined ? draf[a.PanitiaID] : a.DivisiID;
  const divAcara = () => (D && D.divisi) || [];
  const terisi = () => { const n = {}; ((D && D.anggota) || []).forEach((a) => { const p = posisi(a); n[p] = (n[p] || 0) + 1; }); return n; };

  /* ============================================================ PENDAFTAR */
  function renderTop() {
    const s = D.stat || {};
    top.innerHTML = '<div class="grid g2">' +
      '<div class="card"><div class="row sb" style="gap:10px"><div style="min-width:0;flex:1"><b>' + ic(D.buka ? 'lock_open' : 'lock') + ' Pendaftaran ' + (D.buka ? 'DIBUKA' : 'DITUTUP') + '</b><div class="small muted">' + (D.buka ? 'Tautan bisa diisi siapa saja yang menerimanya.' : 'Calon pendaftar melihat pesan "pendaftaran ditutup".') + '</div></div>' +
        (tulis ? '<label class="check" style="margin:0"><span class="switch"><input type="checkbox" data-buka' + (D.buka ? ' checked' : '') + '><i></i></span>' + (D.buka ? 'Buka' : 'Tutup') + '</label>' : '') + '</div>' +
        '<div class="row mt" style="gap:8px;flex-wrap:nowrap"><input class="inp" readonly value="' + esc(link) + '" data-link style="flex:1;min-width:0"><button class="btn sm" data-salin>' + ic('content_copy') + 'Salin</button></div>' +
        '<label class="field mt"><span>Info untuk pendaftar (opsional)</span><textarea rows="2" data-info placeholder="Mis. syarat semester, jadwal wawancara, kontak panitia"' + (tulis ? '' : ' disabled') + '>' + esc(D.info || '') + '</textarea></label>' +
        (tulis ? '<div class="row end mt"><button class="btn sm" data-simpaninfo>' + ic('save') + 'Simpan info</button></div>' : '') + '</div>' +
      '<div class="grid" style="gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))">' + [['Menunggu', s.Menunggu, 'yellow', 'hourglass_top'], ['Diterima', s.Diterima, 'mint', 'how_to_reg'], ['Ditolak', s.Ditolak, '', 'person_off'], ['Total pendaftar', s.total, 'sky', 'groups']]
        .map((x) => '<div class="card ' + x[2] + ' stat" style="padding:14px;min-height:0"><div class="lbl">' + x[0] + ' <span class="ico">' + ic(x[3]) + '</span></div><div class="big num" style="font-size:30px;margin:8px 0 0">' + angka(x[1] || 0) + '</div></div>').join('') + '</div></div>';
  }
  function mount() {
    tbl = table(host, { key: 'PendaftarID', select: tulis, pageSize: 25, ph: 'Cari nama / NIM / WA / email…', searchKeys: ['Nama', 'NIM', 'NoWA', 'Email'],
      filters: [['', 'Semua status'], ['Menunggu', 'Menunggu'], ['Diterima', 'Diterima'], ['Ditolak', 'Ditolak']].concat((D.divisi || []).map((d) => ['div:' + d.DivisiID, 'Minat: ' + d.Nama])),
      filterFn: (r, f) => f.indexOf('div:') === 0 ? (r.Divisi1 === f.slice(4) || r.Divisi2 === f.slice(4)) : (r.Status || 'Menunggu') === f,
      emptyTitle: 'Belum ada pendaftar', emptyText: D.buka ? 'Bagikan tautan pendaftaran ke grup mahasiswa.' : 'Buka pendaftaran lalu bagikan tautannya.', emptyIcon: 'how_to_reg',
      tools: tulis ? '<button class="btn sm" data-bulk="terima" disabled>' + ic('how_to_reg') + 'Terima terpilih</button><button class="btn sm" data-bulk="tolak" disabled>' + ic('person_off') + 'Tolak</button><button class="btn sm" data-bulk="kabari" disabled>' + ic('send') + 'Kabari</button>' : '',
      cols: [{ k: 'Nama', label: 'Pendaftar', render: (r) => '<div class="person">' + avatar(r.Nama, '', 'sm') + '<div><b>' + esc(r.Nama) + '</b><small>NIM ' + esc(r.NIM) + '</small></div></div>' },
        { k: 'NoWA', label: 'Kontak', render: (r) => '<div class="small">' + esc(r.NoWA) + '</div><div class="small muted" style="word-break:break-all">' + esc(r.Email) + '</div>' },
        { k: 'Divisi1', label: 'Divisi minat', render: (r) => '<div class="small"><b>1.</b> ' + esc(namaDiv(r.Divisi1) || '-') + '</div>' + (r.Divisi2 ? '<div class="small muted"><b>2.</b> ' + esc(namaDiv(r.Divisi2)) + '</div>' : '') },
        { k: 'Status', label: 'Status', render: (r) => pill(r.Status || 'Menunggu', { Menunggu: 'warn', Diterima: 'ok', Ditolak: 'bad' }[r.Status || 'Menunggu']) + (r.Status === 'Diterima' && r.DivisiDitetapkan ? '<div class="tiny muted" style="margin-top:4px">' + esc(namaDiv(r.DivisiDitetapkan)) + '</div>' : '') },
        { k: 'Waktu', label: 'Mendaftar', render: (r) => '<span class="small">' + esc(waktu(r.Waktu)) + '</span>' }],
      actions: (r) => '<button class="btn xs" data-act="lihat" title="Detail">' + ic('visibility') + '</button>' + (!tulis || r.Status === 'Diterima' ? '' : '<button class="btn xs" data-act="terima" title="Terima">' + ic('check') + '</button>'),
      onSelect: (ids) => host.querySelectorAll('[data-bulk]').forEach((b) => { b.disabled = b.dataset.bulk === 'kabari' ? !panitiaDariPendaftar(ids).length : !ids.length; }),
      onAction: (a, r) => a === 'lihat' ? detail(r) : terima([r]) });
    host.querySelectorAll('[data-bulk]').forEach((b) => b.onclick = () => {
      const ids = tbl.selected();
      if (b.dataset.bulk === 'kabari') return kirimNotif(panitiaDariPendaftar(ids));
      const pilih = ids.map((id) => D.rows.find((x) => x.PendaftarID === id)).filter(Boolean); if (pilih.length) (b.dataset.bulk === 'terima' ? terima(pilih) : tolak(pilih));
    });
  }
  const panitiaDariPendaftar = (ids) => ids.map((id) => D.rows.find((x) => x.PendaftarID === id)).filter((r) => r && r.Status === 'Diterima' && r.PanitiaID).map((r) => r.PanitiaID);
  function render() { renderTop(); if (!tbl) mount(); tbl.set(D.rows || []); if (tampil === 'distribusi') renderDist(); }

  async function proses(ids, aksi, extra) {
    const r = await API.write('rekrut.proses', Object.assign({ ids, aksi }, extra || {}));
    if (r.success) { if (tbl) tbl.clearSel(); await muat(); }
    return r.success;
  }
  function pilihanDivisi(def) {
    const n = terisi(), k = D.kuota || {};
    return '<select class="inp" data-div><option value="">Sesuai pilihan 1 pendaftar</option>' + divAcara().map((d) => '<option value="' + esc(d.DivisiID) + '"' + (d.DivisiID === def ? ' selected' : '') + '>' + esc(d.Nama) + ' — ' + (n[d.DivisiID] || 0) + (k[d.DivisiID] ? '/' + k[d.DivisiID] + (n[d.DivisiID] >= k[d.DivisiID] ? ' (penuh)' : '') : ' orang') + '</option>').join('') + '</select>';
  }
  function terima(list) {
    const b = document.createElement('div');
    b.innerHTML = '<p style="margin-top:0">' + (list.length === 1 ? 'Terima <b>' + esc(list[0].Nama) + '</b> sebagai Panitia Acara?' : 'Terima <b>' + list.length + ' pendaftar</b> sebagai Panitia Acara?') + '</p>' +
      '<div class="form"><label class="field"><span>Ditempatkan di divisi (terisi/kuota)</span>' + pilihanDivisi(list.length === 1 ? list[0].Divisi1 : '') + '</label><label class="field"><span>Jabatan</span><input class="inp" data-jab value="Anggota"></label></div>' +
      '<div class="notice info mt">' + ic('info') + '<div>Otomatis masuk Master Panitia (jenis Mahasiswa, peran Panitia Acara) dan bisa login dengan email Google yang didaftarkan. Notifikasi WA/email otomatis terkirim bila diaktifkan di Pengaturan → Notifikasi; bisa juga dikirim ulang lewat <b>Kirim notifikasi</b>.</div></div>';
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
    const tombol = !tulis ? [{ label: 'Tutup' }] : [{ label: 'Hapus', cls: 'ghost', onClick: async () => { if (!(await konfirmasi('Hapus data pendaftar <b>' + esc(r.Nama) + '</b>? Data panitia (bila sudah diterima) tidak ikut terhapus.', { bahaya: true, ya: 'Hapus' }))) return false; const x = await API.write('rekrut.hapus', { ids: [r.PendaftarID] }); if (x.success) muat(); return x.success; } }]
      .concat(r.Status && r.Status !== 'Menunggu' ? [{ label: 'Kembalikan ke Menunggu', onClick: () => proses([r.PendaftarID], 'menunggu') }] : [])
      .concat(r.Status === 'Diterima' && r.PanitiaID ? [{ label: 'Kabari', icon: 'send', onClick: (m) => { m.close(); kirimNotif([r.PanitiaID]); return false; } }] : [])
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

  /* ============================================================ DISTRIBUSI & KUOTA (v1.2) */
  function renderDist() {
    if (!D) return;
    const divs = divAcara(), kuota = kuotaDraf || D.kuota || {}, n = terisi(), ubahKuota = !!kuotaDraf;
    const nRek = {}, p1 = {}, p2 = {};
    (D.anggota || []).forEach((a) => { if (a.sumber === 'Rekrutmen') { const p = posisi(a); nRek[p] = (nRek[p] || 0) + 1; } });
    (D.rows || []).filter((r) => (r.Status || 'Menunggu') === 'Menunggu').forEach((r) => { if (r.Divisi1) p1[r.Divisi1] = (p1[r.Divisi1] || 0) + 1; if (r.Divisi2) p2[r.Divisi2] = (p2[r.Divisi2] || 0) + 1; });
    const tot = { k: 0, n: 0, r: 0, nk: 0 };
    const baris = divs.map((d) => {
      const k = Number(kuota[d.DivisiID]) || 0, isi = n[d.DivisiID] || 0, sel = k ? isi - k : null; tot.k += k; tot.n += isi; tot.r += nRek[d.DivisiID] || 0; if (k) tot.nk += isi;
      const pct = k ? Math.min(100, Math.round(isi / k * 100)) : 0, cls = sel === null ? '' : sel > 0 ? 'lebih' : sel < 0 ? 'kurang' : '';
      return '<tr><td class="c1"><b>' + esc(d.Nama) + '</b>' + (k ? '<div class="kuota-bar"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' : '') + '</td>' +
        '<td class="r"><input class="inp sm num" type="number" min="0" max="999" inputmode="numeric" data-kuota="' + esc(d.DivisiID) + '" value="' + (k || '') + '" placeholder="—" style="width:76px;text-align:right"' + (tulis ? '' : ' disabled') + ' aria-label="Kuota ' + esc(d.Nama) + '"></td>' +
        '<td class="r num b">' + isi + '</td><td class="r num">' + (nRek[d.DivisiID] || 0) + '</td><td class="r small">' + (p1[d.DivisiID] || 0) + ' / ' + (p2[d.DivisiID] || 0) + '</td>' +
        '<td>' + (sel === null ? '<span class="muted small">tanpa kuota</span>' : sel > 0 ? pill('+' + sel + ' lebih', 'bad') : sel < 0 ? pill(Math.abs(sel) + ' kurang', 'warn') : pill('pas', 'ok')) + '</td></tr>';
    }).join('');
    const tanpa = (D.anggota || []).filter((a) => !divs.some((d) => d.DivisiID === posisi(a)));
    const nPindah = Object.keys(draf).length, kanal = D.kanal || {};
    dist.innerHTML =
      '<div class="card"><div class="row sb" style="gap:10px"><div><b>Rekap distribusi panitia mahasiswa</b><div class="small muted">Terisi = semua panitia mahasiswa aktif di divisi (hasil rekrutmen + input manual). Peminat = pendaftar yang masih menunggu (pilihan 1 / pilihan 2).</div></div>' +
        (tulis ? '<div class="row" style="gap:6px"><button class="btn sm" data-saran>' + ic('auto_fix_high') + 'Saran pemerataan</button><button class="btn sm primary" data-simpankuota' + (ubahKuota ? '' : ' disabled') + '>' + ic('save') + 'Simpan kuota</button></div>' : '') + '</div>' +
        '<div class="tbl-wrap mt"><table class="tbl compact rekap-tbl"><thead><tr><th>Divisi</th><th class="r">Kuota</th><th class="r">Terisi</th><th class="r">Rekrutmen</th><th class="r">Peminat 1/2</th><th>Status</th></tr></thead><tbody>' + baris +
        (tanpa.length ? '<tr><td class="c1"><b>Belum ada divisi</b></td><td></td><td class="r num b">' + tanpa.length + '</td><td></td><td></td><td>' + pill('perlu ditempatkan', 'warn') + '</td></tr>' : '') +
        '</tbody><tfoot><tr><td class="r b">TOTAL</td><td class="r num b">' + (tot.k || '—') + '</td><td class="r num b">' + (tot.n + tanpa.length) + '</td><td class="r num">' + tot.r + '</td><td></td><td>' + (tot.k ? pill(tot.nk + '/' + tot.k + ' di divisi berkuota', tot.nk > tot.k ? 'bad' : tot.nk < tot.k ? 'warn' : 'ok') : '') + '</td></tr></tfoot></table></div></div>' +
      '<div class="card mt"><div class="row sb" style="gap:10px"><div><b>Papan penempatan</b><div class="small muted">' + (tulis ? 'Seret kartu ke divisi lain, pilih tujuan di menu kartu, atau <b>klik dua kartu</b> dari divisi berbeda untuk menukar posisinya. Kepala Divisi & MC terkunci.' : 'Hanya lihat.') + '</div></div>' +
        (dipilih ? pill('Pilih kartu kedua untuk ditukar', 'warn') : '') + '</div>' +
        '<div class="papan mt">' + divs.map((d) => kolom(d.DivisiID, d.Nama, kuota[d.DivisiID], n[d.DivisiID] || 0)).join('') + (tanpa.length ? kolom('', 'Belum ada divisi', 0, tanpa.length) : '') + '</div></div>' +
      (nPindah ? '<div class="simpan-bar" data-bar><b>' + ic('swap_horiz') + ' ' + nPindah + ' perubahan penempatan belum disimpan</b><span style="flex:1"></span>' +
        '<label class="check" style="margin:0"><input type="checkbox" data-kabwa' + (kanal.wa ? '' : ' disabled') + '> Kabari via WA</label><label class="check" style="margin:0"><input type="checkbox" data-kabem' + (kanal.email ? '' : ' disabled') + '> Email</label>' +
        '<button class="btn sm" data-batalpindah>Batal</button><button class="btn sm primary" data-simpanpindah>' + ic('save') + 'Simpan penempatan</button></div>' : '');
    pasangSeret();
  }
  function kolom(id, nama, k, isi) {
    k = Number(k) || 0;
    const ang = (D.anggota || []).filter((a) => id ? posisi(a) === id : !divAcara().some((d) => d.DivisiID === posisi(a)))
      .sort((a, b) => (b.terkunci - a.terkunci) || String(a.Nama).localeCompare(String(b.Nama)));
    const cls = k ? (isi > k ? ' lebih' : isi === k ? ' pas' : '') : '';
    return '<div class="kol' + cls + '"><div class="kol-h"><b>' + esc(nama) + '</b><span class="pill ' + (k ? (isi > k ? 'bad' : isi === k ? 'ok' : 'warn') : 'mute') + '">' + isi + (k ? '/' + k : '') + '</span></div>' +
      '<div class="kol-b" data-kol="' + esc(id) + '">' + (ang.map(kartu).join('') || '<div class="tiny muted" style="padding:6px">Kosong</div>') + '</div></div>';
  }
  function kartu(a) {
    const p = posisi(a), cocok = p && p === a.Divisi1 ? 'P1' : p && p === a.Divisi2 ? 'P2' : '', pindah = draf[a.PanitiaID] !== undefined;
    const bisa = tulis && !a.terkunci;
    return '<div class="kartu' + (a.terkunci ? ' kunci' : '') + (pindah ? ' pindah' : '') + (dipilih === a.PanitiaID ? ' dipilih' : '') + '" data-pid="' + esc(a.PanitiaID) + '"' + (bisa ? '' : ' data-kunci') + '>' +
      '<b title="' + esc(a.Nama) + '">' + (a.terkunci ? ic('lock') + ' ' : '') + esc(a.Nama) + '</b>' +
      (cocok ? '<span class="pill ' + (cocok === 'P1' ? 'ok' : 'info') + '" title="Sesuai pilihan ' + cocok.slice(1) + '">' + cocok + '</span>' : a.sumber === 'Rekrutmen' ? '<span class="pill warn" title="Bukan pilihannya">≠</span>' : '<span class="pill mute" title="Input manual">M</span>') +
      '<div class="tiny muted">' + esc([a.NIM, a.Jabatan || (a.Peran === 'ACARA' ? 'Anggota' : ''), a.terkunci ? (a.Peran === 'KADIV' ? 'Kepala Divisi' : a.Peran) : ''].filter(Boolean).join(' · ')) + (pindah ? ' · <b style="color:var(--coral)">dari ' + esc(namaDiv(a.DivisiID) || 'tanpa divisi') + '</b>' : '') + '</div>' +
      (bisa ? '<select data-ke aria-label="Pindahkan ' + esc(a.Nama) + '">' + divAcara().map((d) => '<option value="' + esc(d.DivisiID) + '"' + (d.DivisiID === p ? ' selected' : '') + '>' + (d.DivisiID === p ? 'Di: ' : 'Pindah ke ') + esc(d.Nama) + '</option>').join('') + (p && divAcara().some((d) => d.DivisiID === p) ? '' : '<option value="" selected>Belum ada divisi</option>') + '</select>' : '') + '</div>';
  }
  function setPos(pid, div) {
    const a = (D.anggota || []).find((x) => x.PanitiaID === pid); if (!a || a.terkunci) return;
    if ((a.DivisiID || '') === (div || '')) delete draf[pid]; else draf[pid] = div || '';
  }
  async function pasangSeret() {
    sortables.forEach((s) => { try { s.destroy(); } catch (e) { } }); sortables = [];
    if (!tulis || !dist.querySelector('.kol-b')) return;
    let Sortable; try { Sortable = await SW.lib('sortable'); } catch (e) { return; }
    dist.querySelectorAll('.kol-b').forEach((el) => {
      sortables.push(Sortable.create(el, { group: 'papan', filter: '[data-kunci], select', preventOnFilter: false, animation: 150, ghostClass: 'sortable-ghost', delay: 150, delayOnTouchOnly: true,
        onEnd: (ev) => { if (ev.from === ev.to) return; setPos(ev.item.dataset.pid, ev.to.dataset.kol); dipilih = null; renderDist(); } }));
    });
  }
  function saran() {
    const kuota = kuotaDraf || D.kuota || {}, n = terisi(), sisa = (d) => kuota[d] ? kuota[d] - (n[d] || 0) : 0;
    const ang = (D.anggota || []).filter((a) => !a.terkunci);
    let jml = 0;
    const pindah = (a, ke) => { const dari = posisi(a); n[dari] = (n[dari] || 1) - 1; n[ke] = (n[ke] || 0) + 1; setPos(a.PanitiaID, ke); jml++; };
    // 1) yang belum punya divisi → pilihan 1/2 yang masih ada kuota
    ang.filter((a) => !divAcara().some((d) => d.DivisiID === posisi(a))).forEach((a) => { const ke = [a.Divisi1, a.Divisi2].find((t) => t && sisa(t) > 0); if (ke) pindah(a, ke); });
    // 2) divisi yang melebihi kuota → pindahkan ke pilihan lain yang masih kurang (utamakan yang bukan di pilihan 1-nya)
    divAcara().forEach((d) => {
      if (!kuota[d.DivisiID]) return;
      ang.filter((a) => posisi(a) === d.DivisiID).sort((a, b) => (a.Divisi1 === d.DivisiID) - (b.Divisi1 === d.DivisiID)).forEach((a) => {
        if (sisa(d.DivisiID) >= 0) return;
        const ke = [a.Divisi1, a.Divisi2].find((t) => t && t !== d.DivisiID && sisa(t) > 0); if (ke) pindah(a, ke);
      });
    });
    renderDist();
    toast(jml ? jml + ' saran penempatan dibuat — periksa kartu bergaris putus-putus, lalu Simpan penempatan.' : 'Tidak ada saran: kuota sudah sesuai atau pilihan divisi peminat tidak memungkinkan.', jml ? 'ok' : 'info');
  }
  dist.addEventListener('input', (e) => {   // kuota: simpan di draf tanpa menggambar ulang (fokus tidak hilang)
    const t = e.target; if (!t.matches('[data-kuota]')) return;
    kuotaDraf = Object.assign({}, kuotaDraf || D.kuota || {}); const v = Math.max(0, Math.round(Number(t.value) || 0));
    if (v) kuotaDraf[t.dataset.kuota] = v; else delete kuotaDraf[t.dataset.kuota];
    const sb = dist.querySelector('[data-simpankuota]'); if (sb) sb.disabled = false;
  });
  dist.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-ke]')) { setPos(t.closest('[data-pid]').dataset.pid, t.value); dipilih = null; renderDist(); }
  });
  dist.addEventListener('click', async (e) => {
    if (e.target.closest('select, input, label')) return;
    if (e.target.closest('[data-saran]')) return saran();
    if (e.target.closest('[data-simpankuota]')) { const r = await API.write('rekrut.setting', { kuota: kuotaDraf || {} }); if (r.success) { kuotaDraf = null; muat(); } return; }
    if (e.target.closest('[data-batalpindah]')) { draf = {}; dipilih = null; renderDist(); return; }
    const sp = e.target.closest('[data-simpanpindah]');
    if (sp) {
      sp.disabled = true;
      const kabari = { wa: !!(dist.querySelector('[data-kabwa]') || {}).checked, email: !!(dist.querySelector('[data-kabem]') || {}).checked };
      const r = await API.write('rekrut.pindah', { pindah: Object.keys(draf).map((pid) => ({ PanitiaID: pid, DivisiID: draf[pid] })), kabari });
      if (r.success) { draf = {}; dipilih = null; await muat(); } else sp.disabled = false;
      return;
    }
    const k = e.target.closest('.kartu[data-pid]');
    if (!k || !tulis || k.hasAttribute('data-kunci')) return;
    const pid = k.dataset.pid;
    if (!dipilih || dipilih === pid) { dipilih = dipilih === pid ? null : pid; renderDist(); return; }
    const A = D.anggota.find((x) => x.PanitiaID === dipilih), B = D.anggota.find((x) => x.PanitiaID === pid);
    const pa = posisi(A), pb = posisi(B);
    if (pa === pb) { dipilih = pid; renderDist(); return; }
    setPos(A.PanitiaID, pb); setPos(B.PanitiaID, pa); dipilih = null; renderDist();
    toast('Ditukar: ' + A.Nama + ' ⇄ ' + B.Nama + '. Simpan penempatan untuk menerapkan.', 'ok');
  });

  /* ============================================================ KIRIM NOTIFIKASI (v1.2) */
  function kirimNotif(pilihan) {
    const ang = D.anggota || [], kanal = D.kanal || {}, tpl = D.templat || {}, V = D.vars || {};
    const grup = [['rek', 'Semua yang diterima lewat rekrutmen', ang.filter((a) => a.sumber === 'Rekrutmen')], ['semua', 'Semua panitia mahasiswa', ang]]
      .concat(divAcara().map((d) => ['div:' + d.DivisiID, 'Divisi ' + d.Nama, ang.filter((a) => posisi(a) === d.DivisiID)]))
      .concat(pilihan && pilihan.length ? [['pilih', 'Yang dipilih', ang.filter((a) => pilihan.indexOf(a.PanitiaID) > -1)]] : []);
    const b = document.createElement('div');
    b.innerHTML = (kanal.wa || kanal.email ? '' : '<div class="notice bad mb">' + ic('error') + '<div>WhatsApp & email belum aktif. Superadmin: <b>Pengaturan → Notifikasi</b> (token Fonnte, saklar WA/Email).</div></div>') +
      '<div class="form"><label class="field"><span>Jenis pesan</span><select class="inp" data-jenis><option value="diterima">Pemberitahuan diterima (divisi & cara masuk)</option><option value="pengumuman">Pengumuman (tulis sendiri)</option></select></label>' +
      '<label class="field"><span>Kirim ke</span><select class="inp" data-sasaran>' + grup.map((g) => '<option value="' + esc(g[0]) + '"' + (g[0] === (pilihan && pilihan.length ? 'pilih' : 'rek') ? ' selected' : '') + '>' + esc(g[1]) + ' (' + g[2].length + ')</option>').join('') + '</select></label>' +
      '<div class="field full"><span>Kanal</span><div class="row" style="gap:16px"><label class="check"><input type="checkbox" data-kwa' + (kanal.wa ? ' checked' : ' disabled') + '> WhatsApp' + (kanal.wa ? '' : ' <span class="tiny muted">(nonaktif)</span>') + '</label><label class="check"><input type="checkbox" data-kem' + (kanal.email ? ' checked' : ' disabled') + '> Email' + (kanal.email ? '' : ' <span class="tiny muted">(nonaktif)</span>') + '</label></div></div>' +
      '<label class="field full" data-pg hidden><span>Judul (subjek email)</span><input class="inp" data-subjek maxlength="150" placeholder="Mis. Briefing panitia {acara}"></label>' +
      '<label class="field full" data-pg hidden><span>Isi pengumuman</span><textarea rows="5" data-pesan maxlength="3000" placeholder="Assalamu\'alaikum {nama}, briefing divisi {divisi} hari Sabtu pukul 08.00 di Aula."></textarea>' +
        '<span class="row" style="gap:6px;margin-top:6px">' + ['nama', 'divisi', 'jabatan', 'nim', 'acara', 'link'].map((v) => '<button type="button" class="chip" data-var="' + v + '" style="cursor:pointer">{' + v + '}</button>').join('') + '</span></label></div>' +
      '<div class="mt"><div class="small muted" data-info></div><div class="card flat mt" style="white-space:pre-wrap;font-size:13.5px;line-height:1.55" data-pratinjau></div></div>';
    const g = (s) => b.querySelector(s);
    const penerima = () => (grup.find((x) => x[0] === g('[data-sasaran]').value) || [0, 0, []])[2];
    const isiTpl = (t, a) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => ({ nama: a.Nama, divisi: namaDiv(posisi(a)) || '-', jabatan: a.Jabatan || 'Anggota', nim: a.NIM, email: a.Email, acara: V.acara, institusi: V.institusi, link: V.link })[k] ?? m);
    function segar() {
      const pg = g('[data-jenis]').value === 'pengumuman', p = penerima();
      b.querySelectorAll('[data-pg]').forEach((x) => { x.hidden = !pg; });
      const wa = g('[data-kwa]').checked, em = g('[data-kem]').checked;
      g('[data-info]').innerHTML = '<b>' + p.length + ' penerima</b> · ' + p.filter((a) => /^08\d{8,12}$/.test(a.NoWA || '')).length + ' punya WhatsApp · ' + p.filter((a) => /@/.test(a.Email || '')).length + ' punya email' + (!wa && !em ? ' · <span style="color:var(--bad)">pilih minimal satu kanal</span>' : '');
      const contoh = p[0] || { Nama: 'Nama Mahasiswa', NIM: '22xxxxx', DivisiID: '', Jabatan: 'Anggota' };
      const subj = pg ? g('[data-subjek]').value : tpl.diterima && tpl.diterima.subjek, isi = pg ? g('[data-pesan]').value : tpl.diterima && tpl.diterima.pesan;
      g('[data-pratinjau]').innerHTML = '<div class="tiny muted mb">Pratinjau untuk ' + esc(contoh.Nama) + '</div>' + (em && subj ? '<b>' + esc(isiTpl(subj, contoh)) + '</b>\n' : '') + esc(isiTpl(isi || '(isi pengumuman)', contoh));
    }
    b.addEventListener('input', segar); b.addEventListener('change', segar);
    b.addEventListener('click', (e) => { const v = e.target.closest('[data-var]'); if (!v) return; const t = g('[data-pesan]'), s = t.selectionStart || t.value.length; t.value = t.value.slice(0, s) + '{' + v.dataset.var + '}' + t.value.slice(t.selectionEnd || s); t.focus(); segar(); });
    modal({ title: 'Kirim notifikasi ke panitia mahasiswa', size: 'wide', body: b, buttons: [{ label: 'Batal' }, { label: 'Kirim', cls: 'primary', icon: 'send', onClick: async () => {
      const p = penerima(), kan = { wa: g('[data-kwa]').checked, email: g('[data-kem]').checked };
      if (!p.length) { toast('Tidak ada penerima pada pilihan ini.', 'warn'); return false; }
      if (!kan.wa && !kan.email) { toast('Pilih kanal WhatsApp dan/atau Email.', 'warn'); return false; }
      const r = await API.write('rekrut.kirim', { jenis: g('[data-jenis]').value, ids: p.map((a) => a.PanitiaID), kanal: kan, subjek: g('[data-subjek]').value.trim(), pesan: g('[data-pesan]').value.trim() });
      return r.success;
    } }] });
    segar();
  }

  /* ============================================================ peristiwa */
  view.addEventListener('click', async (e) => {
    const tv = e.target.closest('[data-tampil] [data-v]');
    if (tv) { tampil = tv.dataset.v; view.querySelectorAll('[data-tampil] [data-v]').forEach((x) => x.classList.toggle('on', x === tv)); view.querySelectorAll('[data-hal]').forEach((x) => { x.hidden = x.dataset.hal !== tampil; }); if (tampil === 'distribusi') renderDist(); return; }
    if (e.target.closest('[data-qr]')) return tampilQR();
    if (e.target.closest('[data-salin]')) return salin();
    if (e.target.closest('[data-kirim]') && D) return kirimNotif(tbl && tampil === 'pendaftar' ? panitiaDariPendaftar(tbl.selected()) : []);
    if (e.target.closest('[data-exp]') && D) {
      if (tampil === 'distribusi') return eksporXLSX((D.anggota || []).map((a) => ({ Divisi: namaDiv(posisi(a)) || '(belum ada)', Nama: a.Nama, NIM: a.NIM, WhatsApp: a.NoWA, Email: a.Email, Jabatan: a.Jabatan, Peran: a.Peran, 'Pilihan 1': namaDiv(a.Divisi1), 'Pilihan 2': namaDiv(a.Divisi2), Sumber: a.sumber }))
        .sort((x, y) => x.Divisi.localeCompare(y.Divisi) || String(x.Nama).localeCompare(String(y.Nama))), 'Distribusi-Panitia-' + new Date().toISOString().slice(0, 10), 'Distribusi');
      return eksporXLSX((D.rows || []).map((r) => ({ Nama: r.Nama, NIM: r.NIM, WhatsApp: r.NoWA, Email: r.Email, 'Pilihan 1': namaDiv(r.Divisi1), 'Pilihan 2': namaDiv(r.Divisi2), Status: r.Status, 'Divisi ditetapkan': namaDiv(r.DivisiDitetapkan), Mendaftar: r.Waktu, Catatan: r.Catatan })), 'Pendaftar-Panitia-' + new Date().toISOString().slice(0, 10), 'Pendaftar');
    }
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
  App.every(30000, () => { if (SW.Activity.due('rekrut', 30000, 120000) && !Object.keys(draf).length && !kuotaDraf) muat(); });
});

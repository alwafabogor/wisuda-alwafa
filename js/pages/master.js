/* Master Data — Wisudawan, Tamu, Panitia, Divisi, Prodi, Susunan Senat, Pejabat TTD, Daftar Acara, Pengguna.
   Impor Excel (worksheet lama otomatis / templat), ekspor, token QR, foto, cetak Daftar Tamu Kehormatan. */
App.page('master', async function (view, params) {
  const { esc, API, SWR, Sesi, modal, drawer, konfirmasi, toast, lib, eksporXLSX, kompresGambar, driveImg, angka } = SW;
  const { ic, pill, table, formHtml, formVal, formCek, avatar, dropzone } = UI;
  if (App.perluKegiatan(view)) return;
  const boot = App.boot, prodiOpt = [['', '—']].concat((boot.prodi || []).map((p) => [p.ProdiID, p.Nama]));
  const divisi = () => (App.boot.divisi || []);
  const divOpt = () => [['', '—']].concat(divisi().map((d) => [d.DivisiID, (d.Jenis === 'PEGAWAI' ? 'Pegawai · ' : 'Acara · ') + d.Nama]));
  const prodiNama = (id) => ((boot.prodi || []).find((p) => p.ProdiID === id) || {}).Singkatan || '';
  const divNama = (id) => (divisi().find((d) => d.DivisiID === id) || {}).Nama || '';
  const tulis = Sesi.is('SUPERADMIN', 'KOORDINATOR');

  const T = {
    Wisudawan: { icon: 'school', key: 'WisudawanID', ph: 'Cari nama / NIM / kota…',
      F: () => [{ k: 'Nama', label: 'Nama lengkap', req: true }, { k: 'NIM', label: 'NIM' }, { k: 'NamaArab', label: 'Nama (Arab)', ar: true }, { k: 'JK', label: 'Jenis kelamin', type: 'select', opts: [['L', 'Laki-laki'], ['P', 'Perempuan']] },
        { k: 'ProdiID', label: 'Program studi', type: 'select', opts: prodiOpt }, { k: 'TempatLahir', label: 'Tempat lahir' }, { k: 'TglLahir', label: 'Tanggal lahir', type: 'date' },
        { k: 'Provinsi', label: 'Provinsi' }, { k: 'Kota', label: 'Kota / Kabupaten' }, { k: 'Kecamatan', label: 'Kecamatan' }, { k: 'Ayah', label: 'Nama ayah' }, { k: 'Ibu', label: 'Nama ibu' },
        { k: 'IPK', label: 'IPK', type: 'number', step: '0.01' }, { k: 'Predikat', label: 'Predikat', type: 'select', opts: ['', 'Pujian (Cum Laude)', 'Sangat Memuaskan', 'Memuaskan'] },
        { k: 'Terbaik', label: 'Wisudawan terbaik', type: 'switch', yn: true }, { k: 'UkuranToga', label: 'Ukuran toga', type: 'select', opts: ['', 'S', 'M', 'L', 'XL', 'XXL'] },
        { k: 'NoWA', label: 'No. WhatsApp', type: 'tel' }, { k: 'Email', label: 'Email', type: 'email' }, { k: 'JumlahPendamping', label: 'Jumlah pendamping', type: 'number', def: 2 },
        { k: 'StatusBayar', label: 'Status bayar', type: 'select', opts: ['Belum', 'Lunas'] }, { k: 'StatusBerkas', label: 'Berkas ijazah', type: 'select', opts: ['Belum', 'Lengkap'] },
        { k: 'Status', label: 'Status', type: 'select', opts: ['Aktif', 'Batal'] }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2 }],
      cols: [{ k: 'Nama', label: 'Wisudawan', render: (r) => '<div class="person">' + avatar(r.Nama, '', 'sm') + '<div><b>' + esc(r.Nama) + (r.Terbaik === 'YA' ? ' ⭐' : '') + '</b><small>' + esc(r.NIM || '-') + '</small></div></div>' },
        { k: 'ProdiID', label: 'Prodi', render: (r) => esc(prodiNama(r.ProdiID)) }, { k: 'JK', label: 'JK' }, { k: 'IPK', label: 'IPK', render: (r) => esc(r.IPK === '' || r.IPK == null ? '-' : Number(r.IPK).toFixed(2)) + (r.Predikat ? '<div class="small muted">' + esc(r.Predikat) + '</div>' : '') },
        { k: 'Kota', label: 'Asal', render: (r) => esc([r.Kota, r.Provinsi].filter(Boolean).join(', ').replace(/Kab\.|Kota |Prop\. /g, '')) }, { k: 'UrutMaju', label: 'Urut', cls: 'num' }, { k: 'Kursi', label: 'Kursi', render: (r) => r.Kursi ? pill(r.Kursi, 'sky') : '<span class="muted">—</span>' },
        { k: 'FotoID', label: 'Foto', render: (r) => r.FotoID ? pill('Ada', 'ok') : pill('Belum', 'warn') }],
      search: ['Nama', 'NIM', 'Kota', 'Provinsi', 'Ayah', 'Ibu'], filters: [['', 'Semua']].concat((boot.prodi || []).map((p) => [p.ProdiID, p.Singkatan || p.Nama])).concat([['L', 'Ikhwan'], ['P', 'Akhwat']]), ff: (r, f) => r.ProdiID === f || r.JK === f },
    Tamu: { icon: 'groups', key: 'TamuID', ph: 'Cari nama / jabatan / instansi…',
      F: () => [{ k: 'Kategori', label: 'Kategori', type: 'select', opts: [['VVIP', 'Tamu VVIP'], ['VIP', 'Tamu VIP'], ['DOSEN', 'Dosen'], ['UMUM', 'Tamu Umum']], req: true }, { k: 'Nama', label: 'Nama lengkap', req: true },
        { k: 'NamaArab', label: 'Nama (Arab)', ar: true }, { k: 'Jabatan', label: 'Jabatan' }, { k: 'JabatanArab', label: 'Jabatan (Arab)', ar: true }, { k: 'Instansi', label: 'Instansi' },
        { k: 'NoWA', label: 'No. WhatsApp', type: 'tel' }, { k: 'Email', label: 'Email', type: 'email' }, { k: 'PJUndang', label: 'PJ undang' },
        { k: 'StatusUndangan', label: 'Status undangan', type: 'select', opts: ['Belum', 'Terkirim', 'Konfirmasi', 'Hadir', 'Tidak Hadir'] }, { k: 'Kehormatan', label: 'Masuk Daftar Tamu Kehormatan (cetak)', type: 'switch', yn: true }, { k: 'Urutan', label: 'Urutan', type: 'number' }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2 }],
      cols: [{ k: 'Nama', label: 'Tamu', render: (r) => '<div class="person">' + avatar(r.Nama, '', 'sm') + '<div><b>' + esc(r.Nama) + '</b>' + (r.NamaArab ? '<small class="ar" style="display:block;text-align:left">' + esc(r.NamaArab) + '</small>' : '') + '</div></div>' },
        { k: 'Kategori', label: 'Kategori', render: (r) => pill(r.Kategori, { VVIP: 'lilac', VIP: 'yellow', DOSEN: 'sky', UMUM: 'mute' }[r.Kategori]) }, { k: 'Jabatan', label: 'Jabatan', render: (r) => esc(r.Jabatan) + (r.Instansi ? '<div class="small muted">' + esc(r.Instansi) + '</div>' : '') },
        { k: 'PJUndang', label: 'PJ Undang' }, { k: 'StatusUndangan', label: 'Status', render: (r) => pill(r.StatusUndangan || 'Belum') }, { k: 'Kursi', label: 'Kursi', render: (r) => r.Kursi ? pill(r.Kursi, 'sky') : '<span class="muted">—</span>' }],
      search: ['Nama', 'Jabatan', 'Instansi', 'PJUndang'], filters: [['', 'Semua'], ['VVIP', 'VVIP'], ['VIP', 'VIP'], ['DOSEN', 'Dosen'], ['UMUM', 'Umum']], ff: (r, f) => r.Kategori === f },
    Panitia: { icon: 'badge', key: 'PanitiaID', ph: 'Cari nama / email / jabatan…',
      F: () => [{ k: 'Nama', label: 'Nama lengkap', req: true }, { k: 'Email', label: 'Email Google (untuk login)', type: 'email', help: 'Wajib agar panitia bisa masuk dengan akun Google.' }, { k: 'NoWA', label: 'No. WhatsApp', type: 'tel' },
        { k: 'Jenis', label: 'Jenis panitia', type: 'select', opts: [['PEGAWAI', 'Panitia Pegawai'], ['MAHASISWA', 'Panitia Acara (mahasiswa)']] }, { k: 'DivisiID', label: 'Divisi', type: 'select', opts: divOpt() },
        { k: 'Jabatan', label: 'Jabatan / tugas' }, { k: 'Peran', label: 'Peran di aplikasi', type: 'select', opts: [['KOORDINATOR', 'Koordinator Umum'], ['KADIV', 'Kepala Divisi'], ['PEGAWAI', 'Panitia Pegawai'], ['ACARA', 'Panitia Acara'], ['MC', 'MC']] },
        { k: 'Penanda', label: 'Penanda khusus', type: 'checks', full: true, opts: [['PJ_BELANJA', 'PJ Belanja'], ['PETUGAS_SCAN', 'Petugas Scan QR'], ['PANITIA_FOTO', 'Panitia Foto']] },
        { k: 'Gender', label: 'Gender', type: 'select', opts: ['', 'IKHWAN', 'AKHWAT'] }, { k: 'Status', label: 'Status', type: 'select', opts: ['Aktif', 'Nonaktif'] }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2 }],
      cols: [{ k: 'Nama', label: 'Panitia', render: (r) => '<div class="person">' + avatar(r.Nama, '', 'sm') + '<div><b>' + esc(r.Nama) + '</b><small>' + esc(r.Email || 'belum ada email') + '</small></div></div>' },
        { k: 'Jenis', label: 'Jenis', render: (r) => pill(r.Jenis === 'PEGAWAI' ? 'Pegawai' : 'Mahasiswa', r.Jenis === 'PEGAWAI' ? 'sky' : 'mint') }, { k: 'DivisiID', label: 'Divisi', render: (r) => esc(divNama(r.DivisiID)) },
        { k: 'Jabatan', label: 'Jabatan' }, { k: 'Peran', label: 'Peran', render: (r) => pill((App.boot.peranLabel || {})[r.Peran] || r.Peran, 'yellow') + ' ' + String(r.Penanda || '').split(',').filter(Boolean).map((f) => pill(f.replace('_', ' ').toLowerCase(), 'lilac')).join(' ') },
        { k: 'Status', label: 'Status', render: (r) => pill(r.Status || 'Aktif') }],
      search: ['Nama', 'Email', 'Jabatan', 'NoWA'], filters: [['', 'Semua'], ['PEGAWAI', 'Pegawai'], ['MAHASISWA', 'Mahasiswa'], ['tanpa-email', 'Tanpa email']], ff: (r, f) => f === 'tanpa-email' ? !r.Email : r.Jenis === f },
    Divisi: { icon: 'account_tree', key: 'DivisiID', F: () => [{ k: 'Nama', label: 'Nama divisi', req: true }, { k: 'Jenis', label: 'Jenis', type: 'select', opts: [['PEGAWAI', 'Divisi Pegawai'], ['ACARA', 'Divisi Acara (mahasiswa)']] }, { k: 'Urutan', label: 'Urutan', type: 'number' }, { k: 'Keterangan', label: 'Keterangan', type: 'textarea', rows: 2 }],
      cols: [{ k: 'Nama', label: 'Divisi', render: (r) => '<b>' + esc(r.Nama) + '</b>' }, { k: 'Jenis', label: 'Jenis', render: (r) => pill(r.Jenis === 'PEGAWAI' ? 'Pegawai' : 'Acara', r.Jenis === 'PEGAWAI' ? 'sky' : 'mint') }, { k: 'Urutan', label: 'Urutan' }, { k: 'Keterangan', label: 'Keterangan' }], filters: [['', 'Semua'], ['PEGAWAI', 'Pegawai'], ['ACARA', 'Acara']], ff: (r, f) => r.Jenis === f },
    Prodi: { icon: 'menu_book', key: 'ProdiID', F: () => [{ k: 'Nama', label: 'Nama program studi', req: true }, { k: 'Singkatan', label: 'Singkatan' }, { k: 'NamaArab', label: 'Nama (Arab)', ar: true }, { k: 'Gelar', label: 'Gelar', ph: 'S.E. / S.H.' }, { k: 'Urutan', label: 'Urutan', type: 'number' }],
      cols: [{ k: 'Nama', label: 'Program Studi', render: (r) => '<b>' + esc(r.Nama) + '</b>' }, { k: 'Singkatan', label: 'Singkatan' }, { k: 'NamaArab', label: 'Arab', render: (r) => '<span class="ar">' + esc(r.NamaArab) + '</span>' }, { k: 'Gelar', label: 'Gelar' }, { k: 'Urutan', label: 'Urutan' }] },
    SusunanSenat: { label: 'Senat & Tokoh', icon: 'gavel', key: 'SenatID', F: () => [{ k: 'No', label: 'Urutan masuk', type: 'number' }, { k: 'Nama', label: 'Nama', req: true }, { k: 'Jabatan', label: 'Jabatan' }, { k: 'Singkatan', label: 'Nama singkat (label kursi)' }, { k: 'PosisiPanggung', label: 'Posisi di panggung' }, { k: 'Catatan', label: 'Catatan' }],
      cols: [{ k: 'No', label: 'No', cls: 'num' }, { k: 'Nama', label: 'Nama', render: (r) => '<b>' + esc(r.Nama) + '</b>' }, { k: 'Jabatan', label: 'Jabatan' }, { k: 'PosisiPanggung', label: 'Posisi' }] },
    PejabatTTD: { label: 'Pejabat TTD', icon: 'signature', key: 'PejabatID', F: () => [{ k: 'Peran', label: 'Peran dalam dokumen', type: 'select', opts: [['PENYUSUN', 'Penyusun (Sekretaris)'], ['PJ', 'Penanggung Jawab'], ['MENGETAHUI', 'Mengetahui (Ketua)'], ['PEMBINA', 'Pembina']] }, { k: 'Nama', label: 'Nama' }, { k: 'Jabatan', label: 'Jabatan', req: true }, { k: 'Urutan', label: 'Urutan', type: 'number' }],
      cols: [{ k: 'Peran', label: 'Peran', render: (r) => pill(r.Peran, 'yellow') }, { k: 'Nama', label: 'Nama', render: (r) => '<b>' + esc(r.Nama || '— belum diisi —') + '</b>' }, { k: 'Jabatan', label: 'Jabatan' }] },
    DaftarAcara: { label: 'Daftar Acara Baku', icon: 'list_alt', key: 'AcaraID', F: () => [{ k: 'Nama', label: 'Nama acara', req: true }, { k: 'NamaArab', label: 'Nama (Arab)', ar: true }, { k: 'Jenis', label: 'Jenis', type: 'select', opts: ['', 'PROSESI', 'SAMBUTAN', 'PENAMPILAN', 'VIDEO', 'HIMBAUAN', 'PEMBUKAAN', 'PENUTUPAN'] }, { k: 'Durasi', label: 'Durasi (menit)', type: 'number' }, { k: 'KodeInstrumen', label: 'Kode instrumen' }, { k: 'Urutan', label: 'Urutan', type: 'number' }],
      cols: [{ k: 'Urutan', label: 'No', cls: 'num' }, { k: 'Nama', label: 'Acara', render: (r) => '<b>' + esc(r.Nama) + '</b>' }, { k: 'Jenis', label: 'Jenis', render: (r) => r.Jenis ? pill(r.Jenis, 'mute') : '' }, { k: 'Durasi', label: 'Menit' }, { k: 'KodeInstrumen', label: 'Kode' }] },
    Pengguna: { label: 'Superadmin', icon: 'admin_panel_settings', key: 'PenggunaID', only: ['SUPERADMIN'], F: () => [{ k: 'Email', label: 'Email Google', type: 'email', req: true }, { k: 'Nama', label: 'Nama' }, { k: 'NoWA', label: 'No. WhatsApp' }, { k: 'Status', label: 'Status', type: 'select', opts: ['Aktif', 'Nonaktif'] }],
      cols: [{ k: 'Email', label: 'Email', render: (r) => '<b>' + esc(r.Email) + '</b>' }, { k: 'Nama', label: 'Nama' }, { k: 'Status', label: 'Status', render: (r) => pill(r.Status) }] }
  };
  const tabs = Object.keys(T).filter((t) => !T[t].only || Sesi.is(...T[t].only));
  let cur = params.tab && T[params.tab] ? params.tab : 'Wisudawan', tbl = null, rows = [];
  view.innerHTML = App.head('Master Data', 'Data induk dipakai ulang di semua modul — diinput sekali, otomatis ke rundown, denah, QR, dokumen, dan laporan.',
    (tulis ? '<button class="btn" data-imp>' + ic('upload_file') + 'Impor Excel</button>' : '') + '<button class="btn" data-exp>' + ic('download') + 'Ekspor</button>' + (tulis ? '<button class="btn primary" data-add>' + ic('add') + 'Tambah</button>' : '')) +
    '<div class="tabs" data-tabs>' + tabs.map((t) => '<button data-t="' + t + '">' + ic(T[t].icon) + (T[t].label || t) + '</button>').join('') + '</div><div data-tbl></div>';
  const host = view.querySelector('[data-tbl]');
  function mount() {
    view.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === cur));
    const D = T[cur];
    tbl = table(host, { key: D.key, cols: D.cols, ph: D.ph, searchKeys: D.search, filters: D.filters, filterFn: D.ff, pageSize: 30, emptyTitle: 'Belum ada data ' + (D.label || cur), emptyText: tulis ? 'Tambah manual atau impor dari Excel.' : '', emptyIcon: D.icon,
      tools: (cur === 'Tamu' ? '<button class="btn sm" data-kehormatan>' + ic('print') + 'Daftar Tamu Kehormatan</button>' : '') + (cur === 'Wisudawan' || cur === 'Tamu' || cur === 'Panitia' ? (tulis ? '<button class="btn sm" data-token>' + ic('qr_code_2') + 'Token QR</button>' : '') : ''),
      actions: (r) => (cur === 'Wisudawan' && (tulis || Sesi.flag('PANITIA_FOTO')) ? '<button class="btn xs" data-act="foto" title="Foto">' + ic('photo_camera') + '</button>' : '') + (r.Token && (cur === 'Wisudawan' || cur === 'Tamu') ? '<button class="btn xs" data-act="qr" title="QR & tautan undangan">' + ic('qr_code') + '</button>' : '') + '<button class="btn xs" data-act="edit">' + ic(tulis ? 'edit' : 'visibility') + '</button>' + (tulis ? '<button class="btn xs" data-act="hapus">' + ic('delete') + '</button>' : ''),
      onAction: aksi });
    if (params.q) { const q = host.querySelector('[data-q]'); if (q) { q.value = params.q; q.dispatchEvent(new Event('input')); } params.q = ''; }
    const kh = host.querySelector('[data-kehormatan]'); if (kh) kh.onclick = cetakKehormatan;
    const tk = host.querySelector('[data-token]'); if (tk) tk.onclick = async () => { await API.write('data.tokens', {}); muat(true); };
    muat();
  }
  const muat = (fresh) => SWR.load('data.list', { tabel: cur }, (d, c, err) => { if (err) return toast(err.message, 'err'); rows = d || []; tbl.set(rows); }, { maxAge: 15000, fresh });
  function form(r) {
    const D = T[cur], F = D.F(), baru = !r, body = document.createElement('div');
    body.innerHTML = formHtml(F, r || {}) + (cur === 'Panitia' && baru ? '<label class="check mt"><input type="checkbox" data-kirim> Kirim info akun lewat WA/email (bila notifikasi aktif)</label>' : '');
    if (!tulis) body.querySelectorAll('input,select,textarea').forEach((x) => x.disabled = true);
    drawer({ title: (baru ? 'Tambah ' : tulis ? 'Ubah ' : 'Detail ') + (D.label || cur), size: 'wide', body, buttons: tulis ? [{ label: 'Batal' }, { label: 'Simpan', cls: 'primary', icon: 'save', onClick: async () => {
      if (!formCek(body, F)) return false;
      const row = formVal(body, F); if (r) row[D.key] = r[D.key];
      const k = body.querySelector('[data-kirim]');
      const res = await API.write('data.save', { tabel: cur, row, kirimAkun: k ? k.checked : false });
      if (!res.success) return false;
      muat(true); if (cur === 'Divisi' || cur === 'Prodi') App.segarkanBoot();
    } }] : [{ label: 'Tutup' }] });
  }
  async function aksi(a, r) {
    if (a === 'edit') return form(r);
    if (a === 'hapus') { if (await konfirmasi('Hapus <b>' + esc(r.Nama || r.Email || r[T[cur].key]) + '</b>? Tindakan ini tidak bisa dibatalkan.', { ya: 'Hapus', bahaya: true })) { const x = await API.write('data.delete', { tabel: cur, ids: [r[T[cur].key]] }); if (x.success) muat(true); } }
    if (a === 'qr') return tampilQR(r);
    if (a === 'foto') return fotoWisudawan(r);
  }
  async function tampilQR(r) {
    const base = ((App.boot.settings || {}).APP_URL || location.href.split('#')[0].replace(/index\.html$/, '')).replace(/\/+$/, '').replace(/\/index\.html$/, '');
    const link = base + '/tamu.html?k=' + encodeURIComponent(Sesi.kid) + '&t=' + r.Token;
    const qr = await SW.qrDataUrl(r.Token, 360);
    const m = modal({ title: 'QR & Undangan Digital', body: '<div style="text-align:center"><div class="qrbox"><img src="' + qr + '" alt="QR ' + esc(r.Nama) + '"></div><h3 style="margin:12px 0 2px">' + esc(r.Nama) + '</h3><div class="kbd">' + esc(r.Token) + '</div><p class="small muted">Satu QR untuk kehadiran, snack, makan, dan foto.</p><input class="inp" readonly value="' + esc(link) + '"></div>',
      buttons: [{ label: 'Tutup' }, { label: 'Unduh QR', icon: 'download', onClick: () => { SW.unduh(qr, 'QR-' + r.Nama + '.png'); return false; } }, { label: 'Salin tautan', cls: 'primary', icon: 'content_copy', onClick: async () => { try { await navigator.clipboard.writeText(link); toast('Tautan disalin.', 'ok'); } catch (e) { toast('Salin manual dari kolom tautan.', 'warn'); } return false; } }] });
    return m;
  }
  function fotoWisudawan(r) {
    const body = document.createElement('div'); body.innerHTML = '<div class="row" style="align-items:flex-start"><div data-prev style="width:120px;height:150px;border:1.5px solid #1F1F1F;border-radius:12px;overflow:hidden;background:#F7F5EF;display:grid;place-items:center">' + ic('person') + '</div><div style="flex:1" data-dz></div></div>';
    let data = null;
    if (r.FotoID) driveImg(r.FotoID).then((u) => { if (u) body.querySelector('[data-prev]').innerHTML = '<img src="' + u + '" style="width:100%;height:100%;object-fit:cover">'; });
    dropzone(body.querySelector('[data-dz]'), { label: 'Pilih foto wisudawan', hint: 'JPG/PNG — otomatis dikompres', accept: 'image/*', onFile: async (f) => { const k = await kompresGambar(f, 1200, 0.86); data = k.dataUrl; body.querySelector('[data-prev]').innerHTML = '<img src="' + data + '" style="width:100%;height:100%;object-fit:cover">'; } });
    modal({ title: 'Foto · ' + esc(r.Nama), body, buttons: [{ label: 'Batal' }, { label: 'Simpan foto', cls: 'primary', onClick: async () => { if (!data) { toast('Pilih foto dulu.', 'warn'); return false; } const x = await API.write('doc.fotoWisudawan', { WisudawanID: r.WisudawanID, base64: data, mime: 'image/jpeg' }); if (!x.success) return false; muat(true); } }] });
  }
  async function cetakKehormatan() {
    const pilih = await new Promise((res) => {
      const body = document.createElement('div');
      body.innerHTML = '<div class="col"><label class="field"><span>Sumber daftar</span><select name="s"><option value="kehormatan">Tamu bertanda Kehormatan</option><option value="VVIP">Semua VVIP</option><option value="VVIPVIP">VVIP + VIP</option><option value="semua">Semua tamu</option></select></label><label class="field"><span>Judul cetakan</span><input name="j" value="DAFTAR TAMU KEHORMATAN"></label><label class="field"><span>Keterangan / tujuan</span><input name="k" placeholder="Untuk MC / untuk pembicara sambutan / untuk panitia"></label></div>';
      modal({ title: 'Cetak Daftar Tamu Kehormatan', body, onClose: () => res(null), buttons: [{ label: 'Batal' }, { label: 'Cetak', cls: 'primary', icon: 'print', onClick: (m) => { res({ s: body.querySelector('[name=s]').value, j: body.querySelector('[name=j]').value, k: body.querySelector('[name=k]').value }); m.el.remove(); return false; } }] });
    });
    if (!pilih) return;
    const list = rows.filter((t) => pilih.s === 'semua' || (pilih.s === 'kehormatan' ? t.Kehormatan === 'YA' : pilih.s === 'VVIP' ? t.Kategori === 'VVIP' : (t.Kategori === 'VVIP' || t.Kategori === 'VIP'))).sort((a, b) => (Number(a.Urutan) || 999) - (Number(b.Urutan) || 999));
    const w = window.open('', '_blank'); if (!w) return toast('Izinkan pop-up untuk mencetak.', 'warn');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(pilih.j) + '</title><link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&display=swap" rel="stylesheet"><style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{text-align:center;font-size:20px;margin:0}p{text-align:center;margin:4px 0 18px;color:#444}table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid #333;padding:8px 10px;vertical-align:middle}th{background:#eee}.ar{font-family:"Noto Naskh Arabic",serif;direction:rtl;display:block;font-size:15px;color:#333}td.no{text-align:center;width:40px}@media print{body{margin:10mm}}</style></head><body><h1>' + esc(pilih.j) + '</h1><p>' + esc((App.boot.kegiatan || {}).Nama || '') + (pilih.k ? ' — ' + esc(pilih.k) : '') + '</p><table><thead><tr><th>NO</th><th>NAMA LENGKAP</th><th>JABATAN</th></tr></thead><tbody>' +
      list.map((t, i) => '<tr><td class="no">' + (i + 1) + '</td><td><b>' + esc(t.Nama) + '</b>' + (t.NamaArab ? '<span class="ar">' + esc(t.NamaArab) + '</span>' : '') + '</td><td>' + esc([t.Jabatan, t.Instansi].filter(Boolean).join(' – ')) + (t.JabatanArab ? '<span class="ar">' + esc(t.JabatanArab) + '</span>' : '') + '</td></tr>').join('') + '</tbody></table><script>setTimeout(function(){window.print()},600)<\/script></body></html>');
    w.document.close();
  }
  /* ---------------------------------------------------- impor */
  async function impor() {
    const body = document.createElement('div');
    body.innerHTML = '<div class="tabs"><button class="on" data-m="lama">Worksheet lama (otomatis)</button><button data-m="templat">Templat per tabel</button></div><div data-z></div><div data-hasil class="mt"></div>';
    let mode = 'lama', paket = null;
    const z = body.querySelector('[data-z]'), hasil = body.querySelector('[data-hasil]');
    const gambar = () => {
      z.innerHTML = mode === 'lama' ? '<p class="small muted" style="margin-top:0">Unggah berkas Excel panitia (mis. <b>Wisuda 2024 Angkatan 3.xlsx</b>). Sheet <b>URUTAN MAJU</b>, <b>DAFTAR TAMU</b>, <b>KEPANITIAAN PEGAWAI</b>, dan <b>KEPANITIAAN ACARA</b> dibaca otomatis.</p><div data-dz></div>'
        : '<div class="row" style="margin-bottom:10px"><select class="inp sm" data-tt style="max-width:220px">' + ['Wisudawan', 'Tamu', 'Panitia', 'Divisi', 'SusunanSenat', 'DaftarAcara'].map((t) => '<option>' + t + '</option>').join('') + '</select><button class="btn sm" data-tpl>' + ic('download') + 'Unduh templat</button></div><div data-dz></div>';
      UI.dropzone(z.querySelector('[data-dz]'), { label: 'Pilih berkas Excel', hint: '.xlsx / .xls / .csv', accept: '.xlsx,.xls,.csv', onFile: baca });
      const tp = z.querySelector('[data-tpl]'); if (tp) tp.onclick = async () => { const t = z.querySelector('[data-tt]').value; const cols = T[t].F().filter((f) => f.type !== 'html').map((f) => f.k).filter((k) => !/ID$/.test(k) || k === 'ProdiID'); const o = {}; cols.forEach((c) => o[c] = ''); if (t === 'Wisudawan') { delete o.ProdiID; o.Prodi = 'Ekonomi Syariah'; } if (t === 'Panitia') { delete o.DivisiID; o.Divisi = ''; } eksporXLSX([o], 'Templat-' + t); };
    };
    async function baca(file) {
      hasil.innerHTML = UI.skeleton(3);
      const XLSX = await lib('xlsx'); const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      if (mode === 'lama') { await muatScript('js/import-legacy.js'); const h = W_.ImportLegacy.baca(wb, XLSX); paket = { Wisudawan: h.Wisudawan, Tamu: h.Tamu, Panitia: h.Panitia }; if (!h.dikenali.length) { hasil.innerHTML = '<div class="notice bad">' + ic('error') + 'Sheet format lama tidak ditemukan. Gunakan tab "Templat per tabel".</div>'; return; } }
      else { const t = z.querySelector('[data-tt]').value; paket = {}; paket[t] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false }); }
      await pindai(false);
    }
    async function pindai(jalan) {
      const tabel = Object.keys(paket).filter((t) => paket[t].length);
      const timpa = body.querySelector('[data-timpa]') ? body.querySelector('[data-timpa]').checked : false;
      const lap = {};
      for (const t of tabel) { const r = jalan ? await API.write('data.import', { tabel: t, rows: paket[t], dryRun: false, timpa }, { silent: true }) : await API.write('data.import', { tabel: t, rows: paket[t], dryRun: true, timpa }, { silent: true }); lap[t] = r; }
      hasil.innerHTML = '<div class="card flat pad0"><table class="tbl"><thead><tr><th>Data</th><th class="r">Di berkas</th><th class="r">Ditambah</th><th class="r">Diperbarui</th><th class="r">Dilewati</th></tr></thead><tbody>' +
        tabel.map((t) => { const r = lap[t]; if (!r.success) return '<tr><td>' + t + '</td><td colspan="4" style="color:#991B1B">' + esc(r.message) + '</td></tr>'; const l = r.data.laporan; return '<tr><td><b>' + t + '</b></td><td class="r">' + l.sumber + '</td><td class="r">' + l.ditambah + '</td><td class="r">' + l.diperbarui + '</td><td class="r">' + l.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        tabel.map((t) => (lap[t].data && lap[t].data.peringatan.length ? '<details class="mt"><summary class="small">' + lap[t].data.peringatan.length + ' catatan untuk ' + t + '</summary><ul class="small muted">' + lap[t].data.peringatan.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul></details>' : '')).join('') +
        (jalan ? '<div class="notice ok mt">' + ic('check_circle') + 'Impor selesai. Data langsung dipakai di semua modul.</div>' : '<label class="check mt"><input type="checkbox" data-timpa> Timpa data yang sudah ada (cocok berdasarkan NIM / nama)</label><div class="notice info mt">' + ic('info') + 'Ini hasil <b>pindai</b> — belum ada yang ditulis. Tekan <b>Jalankan Impor</b> untuk menyimpan.</div>');
      if (jalan) { muat(true); App.segarkanBoot(); }
    }
    gambar();
    body.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { mode = b.dataset.m; body.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b)); hasil.innerHTML = ''; paket = null; gambar(); });
    modal({ title: 'Impor Data dari Excel', size: 'wide', body, buttons: [{ label: 'Tutup' }, { label: 'Jalankan Impor', cls: 'primary', icon: 'play_arrow', onClick: async () => { if (!paket) { toast('Pilih berkas dulu.', 'warn'); return false; } await pindai(true); return false; } }] });
  }
  const W_ = window;
  const muatScript = (src) => W_.ImportLegacy ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  view.querySelector('[data-tabs]').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; cur = b.dataset.t; mount(); });
  const add = view.querySelector('[data-add]'); if (add) add.onclick = () => form(null);
  const imp = view.querySelector('[data-imp]'); if (imp) imp.onclick = impor;
  view.querySelector('[data-exp]').onclick = () => eksporXLSX(rows.map((r) => { const o = Object.assign({}, r); delete o.KegiatanID; delete o.Token; if (o.ProdiID) o.Prodi = prodiNama(o.ProdiID); if (o.DivisiID) o.Divisi = divNama(o.DivisiID); return o; }), (T[cur].label || cur) + '-' + new Date().toISOString().slice(0, 10), cur);
  mount();
});

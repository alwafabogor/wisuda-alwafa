/* ==========================================================================
   SIM WISUDA — app.js : boot, login (Google + darurat), kerangka, menu per peran & mode,
   pemilih kegiatan, saklar mode, router halaman (dimuat saat dibuka), pop-up pengumuman, PWA.
   ========================================================================== */
(function (W) {
  'use strict';
  const { $, $$, esc, Sesi, API, SWR, Store, toast, modal, drawer, konfirmasi, Activity, debounce } = W.SW;
  const { ic, pill, kosong, avatar } = W.UI;
  const SA = 'SUPERADMIN', KU = 'KOORDINATOR', KD = 'KADIV', PG = 'PEGAWAI', AC = 'ACARA', MC = 'MC', ALL = [SA, KU, KD, PG, AC, MC];

  const MENU = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: [SA, KU, KD, PG, AC], modul: 'inti', grp: 'Utama' },
    { id: 'kegiatan', label: 'Kegiatan & Arsip', icon: 'folder_shared', roles: [SA], modul: 'inti' },
    { id: 'master', label: 'Master Data', icon: 'database', roles: [SA, KU, KD, PG], modul: 'master' },
    { id: 'rekrutmen', label: 'Rekrutmen Panitia', icon: 'how_to_reg', roles: [SA, KU], modul: 'master' },
    { id: 'rundown', label: 'Rundown', icon: 'event_note', roles: ALL, modul: 'rundown', grp: 'Acara' },
    { id: 'live', label: 'Rundown Live', icon: 'sensors', roles: ALL, modul: 'rundown' },
    { id: 'mc', label: 'Teks MC', icon: 'record_voice_over', roles: [SA, KU, MC], modul: 'mc' },
    { id: 'urutan', label: 'Urutan Maju', icon: 'format_list_numbered', roles: ALL, modul: 'urutan' },
    { id: 'denah', label: 'Denah Duduk', icon: 'chair', roles: ALL, modul: 'denah' },
    { id: 'scan', label: 'Scan QR', icon: 'qr_code_scanner', roles: [SA, KU], flag: 'PETUGAS_SCAN', modul: 'scan' },
    { id: 'rekapscan', label: 'Rekap Scan', icon: 'fact_check', roles: [SA, KU, PG], modul: 'scan' },
    { id: 'checklist', label: 'Checklist Hari-H', icon: 'task_alt', roles: ALL, modul: 'checklist' },
    { id: 'pengumuman', label: 'Pengumuman', icon: 'campaign', roles: ALL, modul: 'pengumuman', grp: 'Komunikasi' },
    { id: 'wa', label: 'WhatsApp & CRM', icon: 'forum', roles: [SA, KU], modul: 'notif' },
    { id: 'keuangan', label: 'Keuangan', icon: 'payments', roles: [SA, KU, PG], modul: 'keuangan', grp: 'Administrasi' },
    { id: 'studio', label: 'Studio Dokumen', icon: 'history_edu', roles: [SA, KU, PG], flag: 'PANITIA_FOTO', modul: 'dokumen' },
    { id: 'kuisioner', label: 'Kuisioner', icon: 'quiz', roles: ALL, modul: 'kuisioner' },
    { id: 'galeri', label: 'Galeri', icon: 'photo_library', roles: ALL, modul: 'galeri' },
    { id: 'laporan', label: 'Laporan & LPJ', icon: 'description', roles: [SA, KU, PG], modul: 'laporan' },
    { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', roles: [SA], modul: 'inti', grp: 'Sistem' },
    { id: 'akses', label: 'Hak Akses Divisi', icon: 'admin_panel_settings', roles: [SA], modul: 'inti' }
  ];
  const PAGES = {};
  const App = {
    MENU, PAGES, boot: Store.get('boot', null), cur: null, params: {}, _timers: [],

    page(id, render) { PAGES[id] = render; },
    bolehMenu(m) {
      const me = Sesi.me; if (!me) return false;
      // v1.2: divisi pegawai yang diatur Superadmin → menu fitur mengikuti Hak Akses Divisi (penanda pribadi tetap berlaku)
      const lv = me.aksesMenu && me.aksesMenu[m.id], punyaFlag = !!(m.flag && (me.flags || []).indexOf(m.flag) > -1);
      const peran = lv ? (lv !== 'tidak' || punyaFlag) : (m.roles.indexOf(me.role) > -1 || punyaFlag);
      if (!peran) return false;
      const mm = this.boot && this.boot.modulMode;
      if (mm && me.role !== SA && mm.indexOf(m.modul) === -1) return false;
      if (!this.boot || !this.boot.kegiatan) return ['kegiatan', 'pengaturan'].indexOf(m.id) > -1 || (me.role === SA && m.id === 'dashboard');
      return true;
    },
    menuSaya() { return MENU.filter((m) => this.bolehMenu(m)); },
    /** Level fitur akun ini bila divisinya diatur Superadmin ('crud' | 'baca' | 'tidak'), selain itu null. */
    akses(fitur) { const a = Sesi.me && Sesi.me.akses; return a ? (a[fitur] || 'tidak') : null; },
    /** Boleh menulis (atau melihat bila butuh = 'baca') fitur ini? Tanpa pengaturan divisi → nilai bawaan peran. */
    boleh(fitur, bawaan, butuh) { const lv = this.akses(fitur); if (!lv) return !!bawaan; return butuh === 'baca' ? lv !== 'tidak' : lv === 'crud'; },
    beranda() { const me = Sesi.me || {}; const m = this.menuSaya(); if (me.role === MC && m.some((x) => x.id === 'mc')) return 'mc'; if (Sesi.flag('PETUGAS_SCAN') && [AC, PG].indexOf(me.role) > -1 && this.boot && this.boot.mode !== 'NORMAL') return 'scan'; return (m[0] || {}).id || 'dashboard'; },

    /* -------------------------------------------------- mulai */
    async start() {
      if (!W.SW.konfigOK()) return this.layarKonfig();
      if (location.hash === '#darurat') return this.layarLogin(true);
      if (!Sesi.token) return this.layarLogin();
      if (this.boot && Sesi.me) this.shell();
      const r = await API.read('app.boot', {}, { noBatch: true });
      if (!r.success) {
        if (r.code === 401 || r.code === 403) { Sesi.hapus(); return this.layarLogin(false, r.message); }
        if (!this.boot) return this.layarError(r.message);
        toast(r.message, 'warn'); return;
      }
      this.terapkanBoot(r.data);
      this.shell();
    },
    terapkanBoot(b) {
      this.boot = b; Store.set('boot', b);
      Sesi.simpan(Sesi.token, b.me, b.kid || '');
    },
    async segarkanBoot() {
      const r = await API.read('app.boot', {}, { noBatch: true });
      if (r.success) {
        const modeLama = this.boot && this.boot.mode; this.terapkanBoot(r.data); this.renderNav(); this.renderSubbar();
        if (modeLama !== r.data.mode) { toast('Mode aplikasi berubah: ' + r.data.mode, 'info'); this.route(); }
        else if (this.cur) { const it = MENU.find((x) => x.id === this.cur); if (it && !this.bolehMenu(it)) this.route(); }   // hak akses divisi berubah
      }
    },
    keLogin(pesan) { this.stopTimers(); this.layarLogin(false, pesan); },

    /* -------------------------------------------------- layar konfigurasi / error */
    layarKonfig() {
      document.body.innerHTML = '<div class="login"><div class="login-in" style="grid-template-columns:1fr"><div class="card" style="max-width:560px;margin:auto"><div class="card-h">' + ic('build') + '<h3>Konfigurasi belum lengkap</h3></div><p>Isi <span class="kbd">GAS_URL</span> pada berkas <span class="kbd">js/config.js</span> dengan URL Web App Apps Script yang berakhiran <span class="kbd">/exec</span>, lalu unggah ulang frontend.</p><p class="muted small">Lihat PANDUAN-INSTALASI.md bagian "Frontend".</p></div></div></div>';
    },
    layarError(msg) {
      $('#app').innerHTML = '<div class="login"><div class="login-in" style="grid-template-columns:1fr"><div class="card" style="max-width:520px;margin:auto">' + kosong('Tidak dapat terhubung', esc(msg), 'cloud_off', '<button class="btn primary" onclick="location.reload()">' + ic('refresh') + 'Coba lagi</button>') + '</div></div></div>';
    },

    /* -------------------------------------------------- LOGIN */
    async layarLogin(darurat, pesan) {
      document.title = 'Masuk · SIM Wisuda';
      const cfgC = Store.get('authcfg', null);
      $('#app').innerHTML = '<div class="login"><div class="login-in">' +
        '<section class="login-hero"><span class="pill dark"><i class="pulse" style="background:#FF5A36"></i> <span data-status>SIM WISUDA</span></span>' +
        '<div class="ar" style="color:#B52603;font-size:19px;margin-top:14px" data-arab>جامعة الوفاء - بوابة إدارة حفل التخرج</div>' +
        '<h1>SIM Wisuda <span data-singkat>STIS Al Wafa</span></h1><p class="muted" style="font-size:15px;margin:0">Portal terpadu panitia: rundown live, teks MC, denah & label kursi, scan QR, anggaran, kuisioner, hingga LPJ otomatis.</p>' +
        '<div class="art"><div class="logo" style="width:72px;height:72px;font-size:34px">' + ic('school', 'fill') + '</div><div><b style="font-size:17px" data-kegnama>Wisuda Sarjana</b><div class="small" style="color:#cfcac0" data-kegmeta>Sidang Senat Terbuka</div></div></div>' +
        '<div class="card flat" style="margin-top:14px;display:flex;gap:12px;align-items:center">' + ic('info') + '<div style="flex:1"><b>Khusus Wisudawan & Tamu Undangan</b><div class="small muted">Buka undangan digital lewat tautan / QR pribadi yang dikirim panitia — tanpa login.</div></div></div></section>' +
        '<section class="login-card"><div style="display:grid;place-items:center"><div class="logo" style="background:rgba(255,255,255,.2);border:0">' + ic('verified_user') + '</div></div>' +
        '<h2>Masuk ke Sistem</h2><div class="sub">Portal Panitia Sidang & Wisuda</div>' +
        (pesan ? '<div class="note" style="margin:0 0 14px;background:#fff;color:#991B1B">' + esc(pesan) + '</div>' : '') +
        (darurat ? '<form data-darurat class="col"><label class="field"><span>Nama pengguna darurat</span><input name="u" autocomplete="username" required></label><label class="field"><span>Kata sandi</span><input name="p" type="password" autocomplete="current-password" required></label><button class="btn dark lg">' + ic('lock_open') + 'Masuk Darurat</button><a href="#" data-normal style="color:#fff;font-size:12.5px;text-align:center">← Kembali ke login Google</a></form>'
          : '<div class="gbtn" data-gbtn><span class="muted small">Memuat tombol Google…</span></div><div class="note">' + ic('info') + ' Masuk dengan akun Google yang didaftarkan Koordinator Umum / Superadmin sebagai panitia.</div>') +
        '<div class="row sb" style="margin-top:18px;font-size:12px;border-top:1px solid rgba(255,255,255,.25);padding-top:14px"><span>' + ic('headset_mic') + ' Bantuan IT Wisuda</span><span>v' + W.SW.VERSI + '</span></div></section></div></div>';
      const isiHero = (c) => { if (!c) return; if (c.singkat) $('[data-singkat]').textContent = c.singkat; if (c.arab) $('[data-arab]').textContent = c.arab + ' — بوابة إدارة حفل التخرج'; if (c.kegiatan) { $('[data-kegnama]').textContent = c.kegiatan.nama; $('[data-kegmeta]').textContent = [W.SW.tglID(c.kegiatan.tanggal), c.kegiatan.lokasi].filter(Boolean).join(' · '); $('[data-status]').textContent = 'STATUS KEGIATAN: ' + (c.kegiatan.status || 'AKTIF').toUpperCase(); } };
      isiHero(cfgC);
      API.warm('pub');
      if (darurat) {
        $('[data-normal]').onclick = (e) => { e.preventDefault(); history.replaceState(null, '', location.pathname); this.layarLogin(); };
        $('[data-darurat]').onsubmit = async (e) => {
          e.preventDefault(); const f = e.target, b = $('button', f); b.disabled = true;
          const r = await API.pub('auth.darurat', { username: f.u.value, password: f.p.value, kid: Sesi.kid });
          b.disabled = false;
          if (!r.success) return toast(r.message, 'err');
          Sesi.simpan(r.data.token, r.data.me, r.data.kid); history.replaceState(null, '', location.pathname); this.start();
        };
        return;
      }
      const r = await API.pub('auth.config', {});
      if (!r.success) { $('[data-gbtn]').innerHTML = '<span class="small" style="color:#991B1B">' + esc(r.message) + '</span>'; return; }
      Store.set('authcfg', r.data); isiHero(r.data);
      if (!r.data.googleClientId) { $('[data-gbtn]').innerHTML = '<span class="small" style="color:#991B1B;text-align:center">Login Google belum dikonfigurasi. Superadmin: masuk lewat <a href="#darurat" onclick="setTimeout(()=>location.reload(),10)">akses darurat</a> lalu isi Google Client ID.</span>'; return; }
      this.gis(r.data.googleClientId);
    },
    gis(clientId) {
      const pasang = () => {
        try {
          google.accounts.id.initialize({ client_id: clientId, callback: (resp) => this.loginGoogle(resp.credential), ux_mode: 'popup', auto_select: false });
          const box = $('[data-gbtn]'); box.innerHTML = '';
          google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left', width: Math.min(320, box.clientWidth - 20) });
        } catch (e) { $('[data-gbtn]').textContent = 'Gagal memuat login Google: ' + e.message; }
      };
      if (W.google && W.google.accounts) return pasang();
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = pasang;
      s.onerror = () => { $('[data-gbtn]').innerHTML = '<span class="small" style="color:#991B1B">Tidak bisa memuat layanan Google. Periksa koneksi.</span>'; };
      document.head.appendChild(s);
    },
    async loginGoogle(cred) {
      const box = $('[data-gbtn]'); if (box) box.innerHTML = '<span class="small muted">Memverifikasi akun…</span>';
      const r = await API.pub('auth.google', { idToken: cred, kid: Sesi.kid });
      if (!r.success) { toast(r.message, 'err'); return this.layarLogin(false, r.message); }
      Sesi.simpan(r.data.token, r.data.me, r.data.kid);
      toast('Assalamu\'alaikum, ' + r.data.me.nama + '!', 'ok');
      this.start();
    },

    /* -------------------------------------------------- KERANGKA */
    shell() {
      if (!this._dd) { this._dd = 1; W.UI.pantauDropdown(document.body); }   // submenu/kategori ≥3 pilihan → dropdown
      if ($('.shell')) { this.renderNav(); this.renderSubbar(); this.route(); return; }
      $('#app').innerHTML = '<div class="shell"><aside class="side"><div class="brand"><div class="logo">W</div><div><b>SIM Wisuda</b><small data-singkat></small></div></div><nav class="nav" data-nav></nav>' +
        '<div class="foot nav"><a href="#" data-install class="hide">' + ic('install_mobile') + '<span>Pasang Aplikasi</span></a><a href="#" data-logout>' + ic('logout') + '<span>Keluar</span></a></div></aside>' +
        '<main class="main"><header class="top"><h1 data-title>SIM Wisuda</h1><span class="grow"></span>' +
        '<form class="search desk-only" data-search><input placeholder="Cari wisudawan, tamu, panitia…" aria-label="Cari"><button aria-label="Cari">' + ic('search') + '</button></form>' +
        '<button class="iconbtn" data-bell aria-label="Pengumuman">' + ic('notifications') + '<i class="dot hide"></i></button>' +
        '<div class="who" data-who></div></header><div class="subbar" data-subbar></div>' +
        '<section class="view" id="view" tabindex="-1"></section></main></div><nav class="bnav" data-bnav></nav><div class="loading-bar" id="loadbar"></div>';
      $('[data-logout]').onclick = (e) => { e.preventDefault(); this.keluar(); };
      $('[data-bell]').onclick = () => this.inbox();
      $('[data-search]').onsubmit = (e) => { e.preventDefault(); const q = $('input', e.target).value.trim(); if (q) this.go('master', { q }); };
      $('[data-who]').onclick = () => this.menuProfil();
      W.addEventListener('hashchange', () => this.route());
      this.renderNav(); this.renderSubbar(); this.route(); this.mulaiTimer(); this.pwa();
    },
    /**
     * Prefetch (gas-scale-turbo): setelah halaman pertama tampil, modul halaman lain & data utama tiap menu
     * dimuat diam-diam (digabung batch → 1–2 eksekusi server). Pindah menu lalu tampil seketika dari cache.
     */
    prefetch() {
      clearTimeout(this._pfT);
      this._pfT = setTimeout(() => {
        const jalan = () => {
          if (!Sesi.token || !this.boot || !this.boot.kegiatan) return;
          const menu = this.menuSaya();
          menu.forEach((m) => { if (!PAGES[m.id]) this.muatHalaman(m.id).catch(() => { }); });
          const PF = { dashboard: [['dashboard.get', {}]], master: [['data.list', { tabel: 'Wisudawan' }]], rundown: [['rundown.get', { planId: '' }]], denah: [['denah.get', {}]],
            checklist: [['checklist.get', {}]], keuangan: [['keu.get', {}]], pengumuman: [['pengumuman.list', {}]], urutan: [['urutan.get', {}]], mc: [['mc.render', {}]],
            rekapscan: [['scan.report', { jenis: 'HADIR' }]], kegiatan: [['kegiatan.list', {}]], galeri: [['galeri.list', {}]], kuisioner: [['kuis.list', {}]], laporan: [['lpj.data', {}]], rekrutmen: [['rekrut.list', {}]], akses: [['akses.get', {}]], wa: [['notif.config', {}], ['kegiatan.variabel', {}]] };
          const list = [];
          menu.forEach((m) => { if (m.id !== this.cur) (PF[m.id] || []).forEach((x) => list.push(x.concat([120000]))); });
          SWR.prefetch(list);
        };
        (W.requestIdleCallback || ((f) => setTimeout(f, 30)))(jalan, { timeout: 2500 });
      }, 900);
    },
    renderNav() {
      const me = Sesi.me || {}, b = this.boot || {}, menu = this.menuSaya();
      let grp = '', html = '';
      menu.forEach((m) => { if (m.grp && m.grp !== grp) { grp = m.grp; html += '<div class="grp">' + m.grp + '</div>'; } html += '<a href="#/' + m.id + '" data-m="' + m.id + '" title="' + esc(m.label) + '">' + ic(m.icon) + '<span>' + esc(m.label) + '</span></a>'; });
      $('[data-nav]').innerHTML = html;
      $('[data-singkat]').textContent = (b.settings && b.settings.NAMA_SINGKAT) || 'STIS Al Wafa';
      $('[data-who]').innerHTML = avatar(me.nama, '') + '<div><b>' + esc(me.nama || '') + '</b><small>' + esc(me.peranLabel || me.role || '') + '</small></div>';
      const fav = ['dashboard', 'live', 'mc', 'scan', 'checklist', 'denah', 'pengumuman'].map((id) => menu.find((m) => m.id === id)).filter(Boolean).slice(0, 4);
      $('[data-bnav]').innerHTML = fav.map((m) => '<a href="#/' + m.id + '" data-m="' + m.id + '">' + ic(m.icon) + '<span>' + esc(m.label.split(' ')[0]) + '</span></a>').join('') + '<a href="#" data-more>' + ic('menu') + '<span>Menu</span></a>';
      $('[data-more]').onclick = (e) => { e.preventDefault(); this.menuMobile(); };
      this.tandaiMenu();
    },
    tandaiMenu() { $$('[data-m]').forEach((a) => a.classList.toggle('on', a.dataset.m === this.cur)); },
    renderSubbar() {
      const b = this.boot || {}, k = b.kegiatan, me = Sesi.me || {}, sa = me.role === SA;
      const mode = (b.mode || 'NORMAL');
      const btn = (m, l) => '<button class="' + m.toLowerCase() + (mode === m ? ' on' : '') + '" data-mode="' + m + '"' + (sa && k ? '' : ' disabled') + '><i></i>' + l + '</button>';
      $('[data-subbar]').innerHTML = '<div class="modes">MODE SISTEM:' + btn('NORMAL', 'Normal') + btn('GLADIH', 'Gladih') + btn('ACARA', 'Acara (Live)') + '</div>' +
        (b.backend === 'supabase' ? '<span class="pill info">' + ic('cloud') + ' Supabase</span>' : '') +
        (k && k.Status === 'Arsip' ? '<span class="pill mute">' + ic('inventory_2') + ' Arsip · hanya baca</span>' : '') +
        '<button class="kegsel" data-keg title="Ganti kegiatan">' + (k ? esc(k.Nama) + (k.Tahun ? ' · ' + esc(k.Tahun) : '') : 'Belum ada Kegiatan Master') + ' ▾</button>';
      $$('[data-mode]').forEach((x) => x.onclick = () => this.gantiMode(x.dataset.mode));
      $('[data-keg]').onclick = () => this.pilihKegiatan();
    },
    async gantiMode(m) {
      if (!Sesi.is(SA) || !this.boot || this.boot.mode === m) return;
      const info = { NORMAL: 'Semua modul aktif sesuai hak akses.', GLADIH: 'Hanya Rundown, Teks MC, dan Scan QR yang aktif untuk panitia.', ACARA: 'Hari-H: Rundown, Teks MC, Scan QR, Pengumuman, Denah (lihat), dan Checklist.' }[m];
      if (!(await konfirmasi('Ganti mode ke <b>' + m + '</b>?<br><span class="muted">' + info + '</span>', { ya: 'Ganti mode' }))) return;
      const r = await API.write('kegiatan.setMode', { mode: m });
      if (r.success) this.segarkanBoot();
    },
    async pilihKegiatan() {
      const b = this.boot || {}, list = b.daftarKegiatan || [];
      const m = modal({ title: 'Pilih Kegiatan Master', size: 'wide', body: '<div class="col">' + (list.length ? list.map((k) => '<button class="card flat row" style="text-align:left;cursor:pointer;width:100%" data-k="' + esc(k.KegiatanID) + '"><div style="flex:1"><b>' + esc(k.Nama) + '</b><div class="small muted">' + esc([k.Angkatan && 'Angkatan ' + k.Angkatan, W.SW.tglID(k.TanggalAcara), k.Lokasi].filter(Boolean).join(' · ')) + '</div></div>' + pill(k.Status) + (k.KegiatanID === b.kid ? pill('Dipakai', 'dark') : '') + '</button>').join('') : kosong('Belum ada Kegiatan Master', 'Superadmin perlu membuat Kegiatan Master untuk angkatan wisuda.', 'event')) + '</div>',
        buttons: Sesi.is(SA) ? [{ label: 'Tutup' }, { label: 'Kelola Kegiatan', cls: 'dark', onClick: () => this.go('kegiatan') }] : [{ label: 'Tutup' }] });
      $$('[data-k]', m.body).forEach((x) => x.onclick = async () => { m.close(); Sesi.setKid(x.dataset.k); Store.trim(); await this.segarkanBoot(); this.route(); this.prefetch(); toast('Kegiatan aktif: ' + (this.boot.kegiatan || {}).Nama, 'ok'); });
    },
    menuMobile() {
      const menu = this.menuSaya();
      const m = drawer({ title: 'Menu', foot: false, body: '<div class="grid g2">' + menu.map((x) => '<a class="card flat" style="text-decoration:none;color:inherit;display:flex;gap:10px;align-items:center;padding:14px" href="#/' + x.id + '">' + ic(x.icon) + '<b class="small">' + esc(x.label) + '</b></a>').join('') + '</div><div class="row mt"><button class="btn block" data-pr>' + ic('person') + 'Profil & keluar</button></div>' });
      $$('a', m.body).forEach((a) => a.addEventListener('click', () => m.close()));
      $('[data-pr]', m.body).onclick = () => { m.close(); this.menuProfil(); };
    },
    menuProfil() {
      const me = Sesi.me || {};
      const m = modal({ title: 'Akun Saya', body: '<div class="row">' + avatar(me.nama) + '<div><b>' + esc(me.nama) + '</b><div class="small muted">' + esc(me.email) + '</div><div class="row" style="gap:6px;margin-top:6px">' + pill(me.peranLabel || me.role, 'yellow') + (me.flags || []).filter(() => me.role !== SA).map((f) => pill(f.replace('_', ' '), 'lilac')).join('') + '</div></div></div>' +
        '<div class="col mt"><button class="btn" data-a="semua">' + ic('devices') + 'Keluar dari semua perangkat</button><button class="btn danger" data-a="keluar">' + ic('logout') + 'Keluar</button></div><p class="small muted mt">SIM Wisuda v' + W.SW.VERSI + ' · Server v' + esc((this.boot || {}).versi || '-') + ' · Database: ' + esc((this.boot || {}).backend || '-') + '</p>' });
      $('[data-a=keluar]', m.body).onclick = () => { m.close(); this.keluar(); };
      $('[data-a=semua]', m.body).onclick = async () => { m.close(); await API.write('auth.keluarSemua', {}); this.keluar(); };
    },
    keluar() { try { W.google && google.accounts.id.disableAutoSelect(); } catch (e) { } Sesi.hapus(); Store.del('boot'); this.boot = null; this.stopTimers(); location.hash = ''; this.layarLogin(); },

    /* -------------------------------------------------- ROUTER */
    go(id, params) { const q = params ? '?' + new URLSearchParams(params).toString() : ''; if (location.hash === '#/' + id + q) this.route(); else location.hash = '#/' + id + q; },
    parse() { const h = location.hash.replace(/^#\/?/, ''); const [id, q] = h.split('?'); return { id: id || '', params: Object.fromEntries(new URLSearchParams(q || '')) }; },
    async route() {
      if (!Sesi.me || !$('#view')) return;
      let { id, params } = this.parse();
      const menu = this.menuSaya(), item = MENU.find((m) => m.id === id);
      if (!id || !item || !this.bolehMenu(item)) {
        const tujuan = this.beranda();
        if (id && item && !this.bolehMenu(item)) toast('Menu "' + item.label + '" tidak tersedia untuk peran/mode saat ini.', 'warn');
        if (id !== tujuan) { history.replaceState(null, '', '#/' + tujuan); id = tujuan; params = {}; }
      }
      this.cur = id; this.params = params; this.tandaiMenu();
      const m = MENU.find((x) => x.id === id) || {};
      $('[data-title]').innerHTML = esc(m.label || 'SIM Wisuda');
      document.title = (m.label || 'SIM Wisuda') + ' · SIM Wisuda';
      this.stopPageTimers();
      SWR.aktif = [];
      const lama = $('#view'), view = lama.cloneNode(false); lama.replaceWith(view);   // buang listener halaman sebelumnya
      view.innerHTML = W.UI.skeleton(6); view.scrollTop = 0;
      try {
        if (!PAGES[id]) await this.muatHalaman(id);
        if (this.cur !== id) return;
        await PAGES[id](view, params);
        if (!this._pfAwal) { this._pfAwal = 1; this.prefetch(); }   // prefetch setelah halaman pertama selesai dimuat
      } catch (e) { console.error(e); view.innerHTML = '<div class="card">' + kosong('Halaman gagal dimuat', esc(e.message), 'error', '<button class="btn" onclick="location.reload()">Muat ulang</button>') + '</div>'; }
    },
    _pg: {},
    muatHalaman(id) {
      if (this._pg[id]) return this._pg[id];
      return (this._pg[id] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/pages/' + id + '.js?v=' + W.SW.VERSI; s.onload = res; s.onerror = () => { delete this._pg[id]; s.remove(); rej(new Error('Berkas halaman ' + id + ' tidak ditemukan.')); }; document.head.appendChild(s); }));
    },
    /** Timer milik halaman (dibersihkan otomatis saat pindah halaman). */
    every(ms, fn) { const t = setInterval(fn, ms); this._timers.push(t); return t; },
    stopPageTimers() { this._timers.forEach(clearInterval); this._timers = []; if (this.onLeave) { try { this.onLeave(); } catch (e) { } this.onLeave = null; } },
    stopTimers() { this.stopPageTimers(); clearInterval(this._g); },

    /* -------------------------------------------------- pengumuman (pop-up) & sinkron boot */
    _pgmV: '', _pgmShown: Store.get('pgmShown', {}),
    mulaiTimer() {
      clearInterval(this._g);
      const tick = async () => {
        if (!Sesi.token || !this.boot || !this.boot.kegiatan) return;
        if (Activity.due('pgm', 30000, 120000)) this.cekPengumuman();
        if (Activity.due('boot', 300000, 900000)) this.segarkanBoot();
      };
      this._g = setInterval(tick, 5000); setTimeout(() => this.cekPengumuman(), 1500);
    },
    async cekPengumuman(paksa) {
      const r = await API.read('pengumuman.inbox', { v: paksa ? '' : this._pgmV }, { silent: true });
      if (!r.success || !r.data || r.data.changed === false) return;
      this._pgmV = r.data.v; this._inbox = r.data.items || [];
      const dot = $('[data-bell] .dot'); if (dot) dot.classList.toggle('hide', !r.data.belum);
      const baru = this._inbox.filter((g) => !g.dibaca && !this._pgmShown[g.id]);
      if (baru.length) this.popup(baru[0]);
    },
    popup(g) {
      this._pgmShown[g.id] = 1; Store.set('pgmShown', this._pgmShown);
      const m = modal({ title: (g.prioritas === 'TINGGI' ? '🔴 ' : '📢 ') + esc(g.judul), body: '<div style="background:#FFD35C;border:1.5px solid #1F1F1F;border-radius:12px;padding:6px 12px;font-size:12px;margin-bottom:12px">' + esc(g.pembuat || '') + ' · ' + esc(W.SW.tglID(g.waktu, true)) + ' · Untuk: ' + esc(g.target) + '</div><div style="white-space:pre-wrap;line-height:1.6">' + esc(g.isi) + '</div>',
        buttons: [{ label: 'Mengerti', cls: 'dark', onClick: () => { API.write('pengumuman.read', { ids: [g.id] }, { silent: true }); g.dibaca = true; } }] });
      return m;
    },
    inbox() {
      const items = this._inbox || [];
      const m = drawer({ title: 'Pengumuman', foot: false, body: items.length ? '<div class="col">' + items.map((g) => '<div class="card ' + (g.dibaca ? 'flat' : '') + '"><div class="row sb"><b>' + esc(g.judul) + '</b>' + (g.dibaca ? '' : pill('Baru', 'coral')) + '</div><div class="small muted" style="margin:4px 0 8px">' + esc(g.pembuat) + ' · ' + esc(W.SW.tglID(g.waktu, true)) + ' · ' + esc(g.target) + '</div><div style="white-space:pre-wrap">' + esc(g.isi) + '</div></div>').join('') + '</div>' : kosong('Belum ada pengumuman', 'Pengumuman dari Koordinator Umum / Kepala Divisi akan muncul di sini.', 'campaign') });
      const belum = items.filter((g) => !g.dibaca).map((g) => g.id);
      if (belum.length) { API.write('pengumuman.read', { ids: belum }, { silent: true }); items.forEach((g) => g.dibaca = true); const dot = $('[data-bell] .dot'); if (dot) dot.classList.add('hide'); }
      return m;
    },

    /* -------------------------------------------------- PWA */
    pwa() {
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => { });
      W.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this._ip = e; const a = $('[data-install]'); if (a) { a.classList.remove('hide'); a.onclick = async (ev) => { ev.preventDefault(); this._ip.prompt(); await this._ip.userChoice; a.classList.add('hide'); }; } });
    },

    /* -------------------------------------------------- helper halaman */
    head(judul, sub, aksi) { return '<div class="pagehead"><div style="flex:1;min-width:220px"><h2>' + judul + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="row">' + (aksi || '') + '</div></div>'; },
    perluKegiatan(view) { if (this.boot && this.boot.kegiatan) return false; view.innerHTML = '<div class="card">' + kosong('Belum ada Kegiatan Master aktif', 'Proyek wisuda baru wajib dibuat lewat Kegiatan Master agar data tiap angkatan tidak tumpang tindih.', 'event_available', Sesi.is(SA) ? '<a class="btn primary" href="#/kegiatan">' + ic('add') + 'Buat Kegiatan Master</a>' : '<span class="muted">Hubungi Superadmin.</span>') + '</div>'; return true; },
    arsip() { return !!(this.boot && this.boot.kegiatan && this.boot.kegiatan.Status === 'Arsip'); }
  };
  W.App = App;
  document.addEventListener('DOMContentLoaded', () => App.start());
})(window);

/* Pengaturan — Mode aplikasi, Umum, Variabel, Notifikasi (WA/Email + matriks), Keamanan (Script Properties), Migrasi, Sistem & Log */
App.page('pengaturan', async function (view, params) {
  const { esc, API, Sesi, modal, konfirmasi, toast, angka, tglID, jamID, debounce } = SW, { ic, pill, kosong } = UI;
  const SA = Sesi.is('SUPERADMIN');
  const TABS = [['mode', 'Mode Acara', 'theater_comedy'], ['umum', 'Umum', 'tune'], ['variabel', 'Variabel', 'data_object'], ['notif', 'Notifikasi', 'notifications_active'], ['keamanan', 'Keamanan', 'shield_lock'], ['migrasi', 'Migrasi Data', 'move_up'], ['sistem', 'Sistem & Log', 'monitor_heart']].filter((t) => SA || ['mode', 'variabel'].indexOf(t[0]) > -1 && Sesi.is('KOORDINATOR'));
  let tab = TABS.some((t) => t[0] === params.tab) ? params.tab : TABS[0][0];
  view.innerHTML = App.head('Pengaturan', 'Rahasia (token, Client ID, sandi) disimpan di Script Properties server — tidak pernah di spreadsheet atau browser.') +
    '<div class="tabs" data-t>' + TABS.map((t) => '<button data-v="' + t[0] + '">' + ic(t[2]) + t[1] + '</button>').join('') + '</div><div data-body>' + UI.skeleton(6) + '</div>';
  const body = view.querySelector('[data-body]');
  const waktu = (s) => s ? tglID(s) + ' ' + jamID(s) : '-';
  const box = () => { const b = document.createElement('div'); body.innerHTML = ''; body.appendChild(b); return b; };

  /* ============================================================ MODE */
  function mode() {
    const b = box(), now = (App.boot.mode || 'NORMAL'), keg = App.boot.kegiatan;
    if (!keg) { b.innerHTML = '<div class="card">' + kosong('Belum ada kegiatan', 'Buat Kegiatan Master dulu.', 'event') + '</div>'; return; }
    const M = [['NORMAL', 'Normal', 'apps', 'Semua menu sesuai peran. Dipakai selama persiapan.', 'yellow'], ['GLADIH', 'Gladi', 'record_voice_over', 'Hanya Teks MC, Scan QR, dan Rundown. Master data terkunci agar latihan tidak mengubah data.', 'lilac'], ['ACARA', 'Acara (Hari-H)', 'celebration', 'Gladi + Pengumuman, Denah (lihat), dan Checklist. Menu lain disembunyikan agar panitia fokus.', 'mint']];
    b.innerHTML = '<div class="grid g3">' + M.map((m) => '<div class="card ' + (m[0] === now ? m[4] : '') + '" style="' + (m[0] === now ? 'outline:2.5px solid #1F1F1F' : '') + '"><div class="row sb"><b style="font-size:18px">' + ic(m[2]) + ' ' + m[1] + '</b>' + (m[0] === now ? pill('AKTIF', 'dark') : '') + '</div><p class="small">' + m[3] + '</p>' + (SA && m[0] !== now && !App.arsip() ? '<button class="btn primary" data-m="' + m[0] + '">Aktifkan ' + m[1] + '</button>' : '') + '</div>').join('') + '</div>' +
      '<div class="notice info mt">' + ic('info') + '<div>Perubahan mode langsung terasa di semua HP panitia dalam ±' + ((App.boot.settings || {}).POLL_LIVE_DETIK || 5) + ' detik. Superadmin tetap bisa membuka semua menu. ' + (SA ? '' : 'Hanya Superadmin yang dapat mengganti mode.') + '</div></div>';
    b.addEventListener('click', (e) => { const x = e.target.closest('[data-m]'); if (x) App.gantiMode(x.dataset.m); });
  }

  /* ============================================================ UMUM */
  async function umum() {
    const b = box(); b.innerHTML = UI.skeleton(6);
    const r = await API.read('settings.get', {}, { fresh: true }); if (!r.success) { b.innerHTML = kosong('Gagal', esc(r.message), 'error'); return; }
    const BOLEH = ['NAMA_INSTITUSI', 'NAMA_SINGKAT', 'NAMA_ARAB', 'KOTA', 'APP_URL', 'LOGO_FILE_ID', 'POLL_LIVE_DETIK', 'LABEL_KOLOM', 'LABEL_BARIS', 'CRM_SYNC_MENIT'];
    const daftar = r.data.daftar.filter((d) => BOLEH.indexOf(d[0]) > -1), nilai = r.data.nilai;
    b.innerHTML = '<div class="card"><div class="form">' + daftar.map((d) => '<label class="field' + (/NAMA_INSTITUSI|APP_URL/.test(d[0]) ? ' full' : '') + '"><span>' + esc(d[2]) + ' <code class="tiny">' + d[0] + '</code></span><input class="inp" data-k="' + d[0] + '" value="' + esc(nilai[d[0]] == null ? d[1] : nilai[d[0]]) + '"' + (d[0] === 'NAMA_ARAB' ? ' dir="rtl" style="font-family:\'Noto Naskh Arabic\',serif;font-size:18px"' : '') + (d[0] === 'APP_URL' ? ' placeholder="https://sim-wisuda.vercel.app"' : '') + '></label>').join('') + '</div>' +
      '<div class="row mt"><button class="btn sm" data-url>' + ic('my_location') + 'Isi APP_URL dari alamat ini</button><span class="sp"></span><button class="btn primary" data-save>' + ic('save') + 'Simpan pengaturan</button></div></div>';
    b.querySelector('[data-url]').onclick = () => { b.querySelector('[data-k=APP_URL]').value = location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/$/, ''); };
    b.querySelector('[data-save]').onclick = async () => { const n = {}; b.querySelectorAll('[data-k]').forEach((i) => n[i.dataset.k] = i.value.trim()); const s = await API.write('settings.save', { nilai: n }); if (s.success) { App.boot.settings = Object.assign(App.boot.settings || {}, n); } };
  }

  /* ============================================================ VARIABEL */
  async function variabel() {
    const b = box(); b.innerHTML = UI.skeleton(6);
    const r = await API.read('kegiatan.variabelList', {}, { fresh: true }); if (!r.success) { b.innerHTML = '<div class="card">' + kosong('Gagal', esc(r.message), 'error') + '</div>'; return; }
    let rows = r.data.rows.map((x) => ({ Kunci: x.Kunci, Nilai: x.Nilai, Keterangan: x.Keterangan })), hapus = [];
    const oto = r.data.otomatis, manual = new Set(rows.map((x) => x.Kunci));
    const render = () => {
      b.innerHTML = '<div class="grid g-hp1" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px"><div class="card"><div class="row sb"><b>Variabel tambahan kegiatan</b><button class="btn xs" data-add>' + ic('add') + 'Tambah</button></div><p class="small muted">Dipakai di Teks MC, LPJ, undangan, dan pesan WA sebagai <code>{{kunci}}</code> / <code>{kunci}</code>. <b>biaya_wisuda</b> dipakai untuk proyeksi pemasukan RAB.</p>' +
        '<div class="col" style="gap:8px">' + rows.map((x, i) => '<div class="row" style="gap:6px;align-items:flex-start"><input class="inp sm" style="width:160px" data-i="' + i + '" data-c="Kunci" value="' + esc(x.Kunci) + '" placeholder="kunci_huruf_kecil"><input class="inp sm" style="flex:1" data-i="' + i + '" data-c="Nilai" value="' + esc(x.Nilai) + '" placeholder="nilai"><input class="inp sm" style="flex:1" data-i="' + i + '" data-c="Keterangan" value="' + esc(x.Keterangan) + '" placeholder="keterangan"><button class="btn xs danger" data-del="' + i + '">' + ic('delete') + '</button></div>').join('') + '</div>' +
        '<div class="row end mt"><button class="btn primary" data-save>' + ic('save') + 'Simpan variabel</button></div></div>' +
        '<div class="card"><b>Variabel otomatis (dari data aplikasi)</b><div class="tbl-wrap mt"><table class="tbl compact"><tbody>' + Object.keys(oto).filter((k) => !manual.has(k)).map((k) => '<tr><td><code>{{' + k + '}}</code></td><td class="small">' + esc(String(oto[k]).slice(0, 120)) + '</td></tr>').join('') + '</tbody></table></div></div></div>';
    };
    render();
    b.addEventListener('input', (e) => { const i = e.target.dataset.i; if (i != null) rows[i][e.target.dataset.c] = e.target.value; });
    b.addEventListener('click', async (e) => {
      const x = e.target.closest('button'); if (!x) return;
      if (x.matches('[data-add]')) { rows.push({ Kunci: '', Nilai: '', Keterangan: '' }); render(); }
      if (x.dataset.del != null) { const k = rows[x.dataset.del].Kunci; if (k && manual.has(k)) hapus.push(k); rows.splice(x.dataset.del, 1); render(); }
      if (x.matches('[data-save]')) { const bad = rows.find((y) => y.Kunci && !/^[a-z0-9_]+$/i.test(y.Kunci)); if (bad) return toast('Kunci "' + bad.Kunci + '" hanya boleh huruf, angka, garis bawah.', 'warn'); const s = await API.write('kegiatan.saveVariabel', { rows: rows.filter((y) => y.Kunci), hapus }); if (s.success) variabel(); }
    });
  }

  /* ============================================================ NOTIFIKASI */
  async function notif() {
    const b = box(); b.innerHTML = UI.skeleton(8);
    const r = await API.read('notif.config', {}, { fresh: true }); if (!r.success) { b.innerHTML = kosong('Gagal', esc(r.message), 'error'); return; }
    const c = r.data, M = c.matriks;
    b.innerHTML = '<div class="grid g-hp1" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">' +
      '<div class="card"><b>' + ic('chat') + ' WhatsApp (Fonnte)</b><div class="col mt"><label class="row" style="gap:10px;cursor:pointer;flex-wrap:nowrap"><span class="switch"><input type="checkbox" data-wa' + (c.waAktif ? ' checked' : '') + '><i></i></span><span>Aktifkan notifikasi WhatsApp</span></label>' +
      '<label class="field"><span>Token Fonnte ' + (c.tokenAda ? pill('tersimpan ' + c.token, 'ok') : pill('belum diisi', 'warn')) + '</span><input class="inp" type="password" autocomplete="off" data-token placeholder="' + (c.tokenAda ? 'Kosongkan bila tidak diganti' : 'Tempel token dari fonnte.com → Device') + '"></label>' +
      '<div class="grid g3"><label class="field"><span>Batch bawaan</span><select class="inp" data-batch>' + [10, 20, 50].map((n) => '<option' + (c.batchDefault === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><label class="field"><span>Jeda (detik)</span><input class="inp" data-jeda value="' + esc(c.jeda) + '"></label><label class="row" style="gap:10px;cursor:pointer;flex-wrap:nowrap;margin-top:22px"><span class="switch"><input type="checkbox" data-deteksi' + (c.deteksiOtomatis ? ' checked' : '') + '><i></i></span><span class="small">Cek nomor otomatis</span></label></div>' +
      '<div class="row"><button class="btn sm" data-device>' + ic('smartphone') + 'Cek perangkat</button><input class="inp sm" data-nomor placeholder="08… untuk tes" style="width:150px"><button class="btn sm" data-tes>' + ic('send') + 'Kirim tes</button>' + (c.tokenAda ? '<button class="btn sm danger" data-hapustok>' + ic('key_off') + 'Hapus token</button>' : '') + '</div><div class="small" data-devinfo></div></div></div>' +
      '<div class="card"><b>' + ic('mail') + ' Email (Gmail akun pemilik)</b><div class="col mt"><label class="row" style="gap:10px;cursor:pointer;flex-wrap:nowrap"><span class="switch"><input type="checkbox" data-em' + (c.emailAktif ? ' checked' : '') + '><i></i></span><span>Aktifkan notifikasi email</span></label><label class="field"><span>Nama pengirim</span><input class="inp" data-pengirim value="' + esc(c.namaPengirim) + '"></label><label class="field"><span>APP_URL (untuk tautan {link})</span><input class="inp" data-appurl value="' + esc(c.appUrl) + '"></label>' +
      '<div class="row"><span class="small muted">Sisa kuota hari ini: <b>' + angka(c.kuotaEmail) + '</b></span><span class="sp"></span><button class="btn sm" data-tesemail>' + ic('forward_to_inbox') + 'Kirim email tes ke saya</button></div>' +
      '<div class="notice ' + (c.trigger ? 'ok' : 'warn') + ' small">' + ic(c.trigger ? 'check_circle' : 'schedule') + '<div>' + (c.trigger ? 'Pengirim otomatis (trigger 1 menit) aktif.' : 'Trigger pengirim akan dipasang otomatis saat Anda menyimpan.') + '</div></div></div></div></div>' +
      '<div class="card mt"><div class="row sb"><b>Matriks notifikasi — kejadian × kanal</b><span class="small muted">Klik baris untuk menyunting templat. Variabel: {nama} {acara} {hari_tanggal} {jam} {lokasi} {link} {institusi}</span></div><div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Kejadian</th><th style="width:90px">WhatsApp</th><th style="width:90px">Email</th><th>Templat</th></tr></thead><tbody>' +
      Object.keys(M).map((k) => '<tr><td><b>' + esc(M[k].label) + '</b><div class="tiny muted">' + k + '</div></td><td><label class="switch"><input type="checkbox" data-mx="' + k + '" data-kn="wa"' + (M[k].wa ? ' checked' : '') + '><i></i></label></td><td><label class="switch"><input type="checkbox" data-mx="' + k + '" data-kn="email"' + (M[k].email ? ' checked' : '') + '><i></i></label></td><td><button class="btn xs" data-tpl="' + k + '">' + ic('edit') + (M[k].pesan !== M[k].pesanDefault ? 'Disesuaikan' : 'Bawaan') + '</button> <span class="tiny muted">' + esc(String(M[k].pesan).slice(0, 70)) + '…</span></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row end mt"><button class="btn primary" data-save>' + ic('save') + 'Simpan pengaturan notifikasi</button></div></div>';
    const g = (s) => b.querySelector(s);
    const kumpul = (extra) => {
      const mat = {}; Object.keys(M).forEach((k) => mat[k] = { wa: M[k].wa, email: M[k].email, subjek: M[k].subjek, pesan: M[k].pesan });
      b.querySelectorAll('[data-mx]').forEach((x) => mat[x.dataset.mx][x.dataset.kn] = x.checked);
      return Object.assign({ waAktif: g('[data-wa]').checked, emailAktif: g('[data-em]').checked, token: g('[data-token]').value.trim(), batchDefault: Number(g('[data-batch]').value), jeda: g('[data-jeda]').value.trim(), deteksiOtomatis: g('[data-deteksi]').checked, namaPengirim: g('[data-pengirim]').value.trim(), appUrl: g('[data-appurl]').value.trim(), matriks: mat }, extra || {});
    };
    b.addEventListener('click', async (e) => {
      const x = e.target.closest('button'); if (!x) return;
      if (x.matches('[data-save]')) { const s = await API.write('notif.configSave', kumpul()); if (s.success) notif(); }
      if (x.matches('[data-hapustok]') && await konfirmasi('Hapus token Fonnte dari Script Properties? WhatsApp akan nonaktif.', { bahaya: true })) { const s = await API.write('notif.configSave', kumpul({ token: '__HAPUS__', waAktif: false })); if (s.success) notif(); }
      if (x.matches('[data-device]')) { const d = await API.read('wa.device', {}, { fresh: true }); g('[data-devinfo]').innerHTML = d.success ? pill(d.data.device_status === 'connect' ? 'Perangkat terhubung' : 'Perangkat: ' + (d.data.device_status || '-'), d.data.device_status === 'connect' ? 'ok' : 'bad') + ' ' + esc([d.data.device, d.data.package, d.data.quota != null ? 'kuota ' + d.data.quota : '', d.data.expired ? 'aktif s.d. ' + d.data.expired : ''].filter(Boolean).join(' · ')) : '<span class="pill bad">' + esc(d.message) + '</span>'; }
      if (x.matches('[data-tes]')) { const n = g('[data-nomor]').value.trim(); if (!n) return toast('Isi nomor tujuan tes.', 'warn'); const d = await API.read('wa.test', { nomor: n }, { fresh: true }); toast(d.message, d.success ? 'ok' : 'err'); }
      if (x.matches('[data-tesemail]')) { const d = await API.read('email.test', {}, { fresh: true }); toast(d.message, d.success ? 'ok' : 'err'); }
      if (x.dataset.tpl) {
        const k = x.dataset.tpl, m = M[k], f = document.createElement('div');
        f.innerHTML = '<label class="field"><span>Subjek email</span><input class="inp" data-s value="' + esc(m.subjek) + '"></label><label class="field mt"><span>Pesan (WA & isi email) — *tebal* _miring_</span><textarea class="inp" rows="8" data-p>' + esc(m.pesan) + '</textarea></label>';
        modal({ title: esc(m.label), body: f, buttons: [{ label: 'Batal' }, { label: 'Kembalikan bawaan', onClick: () => { m.subjek = m.subjekDefault; m.pesan = m.pesanDefault; toast('Templat dikembalikan — klik Simpan untuk menerapkan.', 'info'); } }, { label: 'Pakai', cls: 'primary', onClick: () => { m.subjek = f.querySelector('[data-s]').value; m.pesan = f.querySelector('[data-p]').value; x.innerHTML = ic('edit') + 'Disesuaikan'; toast('Klik "Simpan pengaturan notifikasi" untuk menerapkan.', 'info'); } }] });
      }
    });
  }

  /* ============================================================ KEAMANAN */
  async function keamanan() {
    const b = box(); b.innerHTML = UI.skeleton(6);
    const r = await API.read('rahasia.status', {}, { fresh: true }); if (!r.success) { b.innerHTML = kosong('Gagal', esc(r.message), 'error'); return; }
    const s = r.data;
    b.innerHTML = '<div class="grid g2">' +
      '<div class="card"><b>' + ic('account_circle') + ' Login Google (OAuth Client ID)</b><p class="small muted">Dari Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Tambahkan domain frontend Anda ke <i>Authorized JavaScript origins</i>.</p>' +
      '<div class="small">Saat ini: ' + (s.GOOGLE_CLIENT_ID.ada ? '<code style="word-break:break-all">' + esc(s.GOOGLE_CLIENT_ID.samar) + '</code>' : pill('belum diisi', 'warn')) + '</div><div class="row mt"><input class="inp" data-cid placeholder="xxxx.apps.googleusercontent.com" style="flex:1"><button class="btn primary sm" data-simpancid>' + ic('save') + 'Simpan</button></div></div>' +
      '<div class="card"><b>' + ic('emergency') + ' Akses darurat (break-glass)</b><p class="small muted">Dipakai bila login Google bermasalah. Login lewat <code>#darurat</code> di halaman masuk. Dikunci 15 menit setelah 5× salah.</p><div class="small">Status: ' + pill(s.EMERGENCY.ada ? 'Sandi terpasang' : 'Belum ada', s.EMERGENCY.ada ? 'ok' : 'warn') + '</div><div class="row mt"><input class="inp" type="password" autocomplete="new-password" data-sandi placeholder="Sandi baru (≥12, huruf + angka)" style="flex:1"><button class="btn sm" data-gen>' + ic('casino') + '</button><button class="btn primary sm" data-rotasi>' + ic('autorenew') + 'Ganti</button></div><div class="tiny mt" data-sandiinfo></div></div>' +
      '<div class="card"><b>' + ic('database') + ' Database</b><div class="small mt">Backend aktif: ' + pill(String(s.backend).toUpperCase(), 'dark') + '</div><div class="small mt">Supabase: ' + (s.supabase.url ? '<code>' + esc(s.supabase.url) + '</code>' : '<span class="muted">belum dikonfigurasi</span>') + ' · service key ' + pill(s.supabase.key ? 'ada' : 'tidak ada', s.supabase.key ? 'ok' : 'mute') + '</div>' +
      '<div class="notice info small mt">' + ic('code') + '<div>Perpindahan database (Sheets ⇄ Supabase) adalah pengaturan developer. Jalankan dari editor Apps Script: <code>cekKoneksiSupabase()</code> → <code>migrasiSheetsKeSupabase()</code> → <code>pakaiSupabase()</code>, atau sebaliknya <code>migrasiSupabaseKeSheets()</code> → <code>pakaiSheets()</code>. Lihat PANDUAN bagian Supabase.</div></div></div>' +
      '<div class="card"><b>' + ic('devices') + ' Sesi perangkat</b><p class="small muted">Keluarkan akun Anda dari semua HP/laptop (mis. HP hilang). Sesi lain perlu login ulang.</p><button class="btn danger sm" data-keluar>' + ic('logout') + 'Keluarkan semua sesi saya</button></div></div>';
    const g = (q) => b.querySelector(q);
    g('[data-simpancid]').onclick = async () => { const v = g('[data-cid]').value.trim(); if (!v) return; const x = await API.write('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: v }); if (x.success) keamanan(); };
    g('[data-gen]').onclick = () => { const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', a = new Uint32Array(16); crypto.getRandomValues(a); let p = Array.from(a, (n) => cs[n % cs.length]).join(''); if (!/\d/.test(p)) p = p.slice(0, 15) + '7'; g('[data-sandi]').value = p; g('[data-sandi]').type = 'text'; g('[data-sandiinfo]').innerHTML = 'Simpan sandi ini di pengelola sandi / amplop tertutup. Tidak akan ditampilkan lagi.'; };
    g('[data-rotasi]').onclick = async () => { const p = g('[data-sandi]').value; if (!p) return; if (!(await konfirmasi('Ganti sandi akses darurat? Semua sesi darurat lama dicabut.', { bahaya: true }))) return; const x = await API.write('darurat.rotasi', { sandiBaru: p }); if (x.success) { g('[data-sandi]').value = ''; keamanan(); } };
    g('[data-keluar]').onclick = async () => { if (await konfirmasi('Keluarkan semua sesi Anda di semua perangkat?', { bahaya: true })) { const x = await API.write('auth.keluarSemua', {}); if (x.success) App.keluar(true); } };
  }

  /* ============================================================ MIGRASI */
  function migrasi() {
    const b = box();
    const TB = ['Divisi', 'Panitia', 'Jobdesk', 'Checklist', 'Wisudawan', 'Tamu', 'SusunanSenat', 'RundownPlan', 'RundownItem', 'TeksMC', 'RABPos', 'RABRealisasi', 'Pemasukan', 'Kuisioner', 'KuisionerSoal', 'KuisionerJawaban', 'Denah', 'Kursi', 'PejabatTTD', 'Variabel', 'LPJNarasi', 'Galeri', 'CatatanEvaluasi', 'CRM_Kontak'];
    b.innerHTML = '<div class="card"><b>' + ic('move_up') + ' Impor dari spreadsheet SIM Wisuda lain</b><p class="small muted">Untuk upgrade / pindah akun: data dibaca dari spreadsheet sumber (tidak pernah ditulis), dicocokkan berdasarkan ID, aman dijalankan berulang (delta sync). Spreadsheet harus bisa dibuka oleh akun pemilik aplikasi. Untuk impor dari worksheet Excel lama, gunakan <a href="#/master">Master Data → Import</a>.</p>' +
      '<label class="field"><span>URL / ID spreadsheet sumber (per kegiatan)</span><input class="inp" data-src placeholder="https://docs.google.com/spreadsheets/d/…"></label>' +
      '<div class="chipset mt">' + TB.map((t) => '<label class="chip" style="cursor:pointer"><input type="checkbox" data-tb="' + t + '"' + (['KuisionerJawaban', 'CRM_Kontak', 'Galeri'].indexOf(t) > -1 ? '' : ' checked') + '> ' + t + '</label>').join('') + '</div>' +
      '<label class="check mt"><input type="checkbox" data-timpa> Timpa data yang sudah ada (bawaan: hanya tambah yang belum ada)</label>' +
      '<div class="row mt"><button class="btn" data-scan>' + ic('search') + 'Pindai (dry-run)</button><button class="btn primary" data-run>' + ic('play_arrow') + 'Jalankan impor</button></div><div data-hasil class="mt"></div></div>';
    const g = (q) => b.querySelector(q);
    const jalan = async (dry) => {
      const src = g('[data-src]').value.trim(); if (!src) return toast('Tempel URL spreadsheet sumber.', 'warn');
      if (!dry && !(await konfirmasi('Jalankan impor ke kegiatan aktif <b>' + esc(App.boot.kegiatan.Nama) + '</b>?'))) return;
      g('[data-hasil]').innerHTML = UI.skeleton(4);
      const r = await API.write(dry ? 'migrasi.scan' : 'migrasi.run', { source: src, sheets: [...b.querySelectorAll('[data-tb]:checked')].map((x) => x.dataset.tb), timpa: g('[data-timpa]').checked });
      if (!r.success) { g('[data-hasil]').innerHTML = '<div class="notice bad">' + esc(r.message) + '</div>'; return; }
      const L = r.data.laporan;
      g('[data-hasil]').innerHTML = '<div class="small"><b>' + esc(r.data.sumber.nama) + '</b> · ' + (r.data.dryRun ? pill('DRY-RUN — belum ada yang ditulis', 'warn') : pill('Selesai', 'ok')) + '</div><div class="tbl-wrap mt"><table class="tbl compact"><thead><tr><th>Data</th><th class="num">Di sumber</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>' + Object.keys(L).map((t) => '<tr><td>' + t + '</td><td class="num">' + angka(L[t].sumber) + '</td><td class="num">' + angka(L[t].ditambah) + '</td><td class="num">' + angka(L[t].diperbarui) + '</td><td class="num">' + angka(L[t].dilewati) + '</td></tr>').join('') + '</tbody></table></div>' + (r.data.peringatan.length ? '<div class="notice warn mt small">' + ic('warning') + '<div>' + r.data.peringatan.map(esc).join('<br>') + '</div></div>' : '');
    };
    g('[data-scan]').onclick = () => jalan(true); g('[data-run]').onclick = () => jalan(false);
  }

  /* ============================================================ SISTEM & LOG */
  async function sistem() {
    const b = box(); b.innerHTML = UI.skeleton(6);
    const [ri, rl] = await Promise.all([API.read('sistem.info', {}, { fresh: true }), API.read('log.list', {}, { fresh: true })]);
    const s = ri.success ? ri.data : {};
    const pl = (window.Perf && window.Perf.log) || [], perf = pl.length ? Math.round(pl.reduce((a, x) => a + x.total, 0) / pl.length) + ' ms (' + pl.length + ' panggilan, server ±' + Math.round(pl.reduce((a, x) => a + (x.server || 0), 0) / pl.length) + ' ms)' : null;
    b.innerHTML = '<div class="grid g3 mb">' +
      '<div class="card"><b>' + ic('info') + ' Versi</b><div class="small mt">Frontend <code>' + esc(SW.VERSI) + '</code> · Backend <code>' + esc(s.versi || '-') + '</code></div><div class="small">Database: ' + pill(String(s.backend || '-').toUpperCase(), 'dark') + '</div><div class="small">Keep-warm: ' + pill(s.keepWarm === 'on' ? 'ON' : 'OFF', s.keepWarm === 'on' ? 'ok' : 'mute') + (s.warmTerakhir ? ' <span class="tiny muted">terakhir ' + waktu(s.warmTerakhir.t || s.warmTerakhir) + '</span>' : '') + '</div></div>' +
      '<div class="card"><b>' + ic('link') + ' Tautan</b><div class="col mt small" style="gap:4px">' + (s.spreadsheet ? '<a target="_blank" rel="noopener" href="' + esc(s.spreadsheet) + '">' + ic('table') + ' Spreadsheet induk</a>' : '') + (s.kegiatanSheet ? '<a target="_blank" rel="noopener" href="' + esc(s.kegiatanSheet) + '">' + ic('table_view') + ' Spreadsheet kegiatan aktif</a>' : '') + (s.folder ? '<a target="_blank" rel="noopener" href="' + esc(s.folder) + '">' + ic('folder') + ' Folder Drive aplikasi</a>' : '') + '</div></div>' +
      '<div class="card"><b>' + ic('bolt') + ' Kinerja & cache</b><div class="small mt">Trigger: ' + ((s.trigger || []).map((t) => '<code>' + esc(t) + '</code>').join(' ') || '-') + '</div><div class="small">Ukuran Script Properties: ' + angka(s.ukuranProperties || 0) + ' byte</div>' + (perf ? '<div class="small">Rata-rata respons API: ' + esc(perf) + '</div>' : '') + '<div class="row mt"><button class="btn sm" data-flush>' + ic('mop') + 'Segarkan cache server</button><button class="btn sm" data-lokal>' + ic('cleaning_services') + 'Bersihkan cache HP ini</button></div></div></div>' +
      '<div data-log></div>';
    const t = UI.table(b.querySelector('[data-log]'), { key: 'LogID', compact: true, pageSize: 30, ph: 'Cari email, aksi, objek…', searchKeys: ['Email', 'Aksi', 'Objek', 'Detail'], cols: [{ k: 'Waktu', label: 'Waktu', render: (r) => '<span class="tiny">' + waktu(r.Waktu) + '</span>' }, { k: 'Email', label: 'Pengguna', render: (r) => '<span class="small">' + esc(r.Nama || r.Email) + '</span><div class="tiny muted">' + esc(r.Peran || '') + '</div>' }, { k: 'Aksi', label: 'Aksi', render: (r) => '<code class="small">' + esc(r.Aksi) + '</code>' }, { k: 'Objek', label: 'Objek' }, { k: 'Detail', label: 'Detail', render: (r) => '<span class="tiny">' + esc(String(r.Detail || '').slice(0, 120)) + '</span>' }] });
    t.set(rl.success ? rl.data.map((x, i) => Object.assign({ LogID: x.LogID || i }, x)) : []);
    b.querySelector('[data-flush]').onclick = async () => { const r = await API.read('sistem.flush', {}, { fresh: true }); toast(r.message, r.success ? 'ok' : 'err'); if (SW.SWR.stale) SW.SWR.stale(); };
    b.querySelector('[data-lokal]').onclick = async () => { try { Object.keys(localStorage).filter((k) => k.indexOf('sw_swr:') === 0).forEach((k) => localStorage.removeItem(k)); if ('caches' in window) await caches.delete('sw-drive'); } catch (e) { } toast('Cache perangkat dibersihkan.', 'ok'); };
  }

  function buka() {
    view.querySelectorAll('[data-t] button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    history.replaceState(null, '', '#/pengaturan?tab=' + tab);
    ({ mode, umum, variabel, notif, keamanan, migrasi, sistem })[tab]();
  }
  view.querySelector('[data-t]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { tab = b.dataset.v; buka(); } });
  buka();
});

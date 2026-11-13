/* Portal tamu & wisudawan tanpa login — tamu.html?k=<KegiatanID>&t=<token pribadi>
   Undangan digital (desain PNG panitia + data + QR), konfirmasi hadir, letak kursi, pengumuman, kuisioner. */
(function () {
  const { esc, API, toast, qrDataUrl, driveImg, unduh, tglID, jamID, konfigOK } = SW, { ic, pill, kosong } = UI;
  const root = document.getElementById('tamu');
  const q = new URLSearchParams(location.search), K = q.get('k') || '', T = (q.get('t') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const PUB = { k: K, t: T };
  let D = null, tab = 'undangan', tpl = null, pollT = null;
  const simpanLokal = (d) => { try { localStorage.setItem('sw_tamu:' + K + ':' + T, JSON.stringify({ d, w: Date.now() })); } catch (e) { } };
  const bacaLokal = () => { try { return JSON.parse(localStorage.getItem('sw_tamu:' + K + ':' + T) || 'null'); } catch (e) { return null; } };

  function gagal(judul, pesan) { root.innerHTML = '<div class="guest-body" style="padding-top:60px">' + '<div class="card">' + kosong(judul, pesan, 'link_off') + '</div></div>'; }
  async function muat(diam) {
    if (!konfigOK()) return gagal('Aplikasi belum dikonfigurasi', 'Alamat server belum diisi oleh panitia.');
    if (!T || T.length < 6) return gagal('Tautan tidak lengkap', 'Buka tautan undangan persis seperti yang dikirim panitia, atau pindai ulang QR undangan Anda.');
    const r = await API.pub('tamu.get', PUB, { silent: true });
    if (!r.success) { const c = bacaLokal(); if (c && !diam) { D = c.d; render(); toast('Mode luring — menampilkan data terakhir.', 'warn'); return; } if (!diam) gagal('Undangan tidak ditemukan', r.message || 'Tautan tidak valid.'); return; }
    D = r.data; simpanLokal(D);
    if (!diam) render(); else perbaruiBadge();
  }
  const blmBaca = () => (D.pengumuman || []).filter((p) => !p.dibaca).length;
  function perbaruiBadge() { const b = root.querySelector('[data-badge]'); if (b) { const n = blmBaca(); b.textContent = n; b.hidden = !n; } }

  function render() {
    const P = D.peserta, Kg = D.kegiatan, I = D.institusi, wis = P.jenis === 'WISUDAWAN';
    document.title = (wis ? 'Kartu Wisudawan' : 'Undangan') + ' · ' + (Kg.nama || 'Wisuda');
    const kuisBelum = (D.kuisioner || []).filter((f) => !f.sudah).length;
    const TABS = [['undangan', wis ? 'Kartu' : 'Undangan', 'mail'], ['kursi', 'Kursi', 'event_seat'], ['info', 'Info', 'campaign']].concat(wis && (D.kuisioner || []).length ? [['kuis', 'Kuisioner', 'rate_review']] : []);
    root.innerHTML = '<div class="guest-top"><div style="width:40px;height:40px;border-radius:12px;background:#1F1F1F;color:#FFD35C;display:grid;place-items:center">' + ic('school') + '</div><div style="flex:1;min-width:0"><b style="display:block;line-height:1.2">' + esc(I.singkat || I.nama) + '</b><span class="tiny muted">' + esc(Kg.nama || 'Wisuda') + '</span></div>' + (Kg.status === 'Arsip' ? pill('Selesai', 'mute') : '') + '</div>' +
      '<div class="guest-body"><div class="card dark" style="padding:18px"><div class="tiny" style="letter-spacing:.12em;color:#FFD35C">' + (wis ? 'WISUDAWAN' : 'TAMU ' + esc(P.kategori || '')) + '</div><div style="font-size:22px;font-weight:700;margin:4px 0 2px">' + esc(P.nama) + '</div>' + (P.namaArab ? '<div dir="rtl" style="font-family:\'Noto Naskh Arabic\',serif;font-size:20px;color:#FFD35C">' + esc(P.namaArab) + '</div>' : '') + '<div class="small" style="opacity:.85">' + esc(P.jabatan || P.sub || '') + '</div>' +
      '<div class="row mt" style="gap:6px">' + (P.kursi ? pill('Kursi ' + P.kursi, 'yellow') : '') + (P.status ? pill(P.status === 'Konfirmasi' ? 'Akan hadir' : P.status) : '') + (P.sudahScan || []).map((s) => pill({ HADIR: '✓ Hadir', SNACK: '✓ Snack', MAKAN: '✓ Makan', FOTO: '✓ Foto' }[s] || s, 'ok')).join('') + '</div></div>' +
      '<div class="seg" data-tabs style="width:100%;display:grid;grid-template-columns:repeat(' + TABS.length + ',1fr)">' + TABS.map((t) => '<button data-v="' + t[0] + '" style="position:relative">' + ic(t[2]) + t[1] + (t[0] === 'info' ? '<span data-badge class="pill bad" style="position:absolute;top:-6px;right:-2px;padding:0 6px"' + (blmBaca() ? '' : ' hidden') + '>' + blmBaca() + '</span>' : t[0] === 'kuis' && kuisBelum ? '<span class="pill warn" style="position:absolute;top:-6px;right:-2px;padding:0 6px">' + kuisBelum + '</span>' : '') + '</button>').join('') + '</div><div data-isi></div>' +
      '<p class="tiny muted" style="text-align:center">Tautan ini bersifat pribadi — mohon tidak dibagikan. QR hanya berlaku 1× untuk setiap layanan.</p></div>';
    root.querySelector('[data-tabs]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { tab = b.dataset.v; isi(); } });
    isi();
  }
  function isi() {
    root.querySelectorAll('[data-tabs] button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    const el = root.querySelector('[data-isi]');
    ({ undangan, kursi, info, kuis })[tab](el);
  }

  /* ---------------- undangan digital */
  async function undangan(el) {
    const P = D.peserta, Kg = D.kegiatan, wis = P.jenis === 'WISUDAWAN';
    el.innerHTML = '<div class="inv"><canvas data-cv></canvas></div>' +
      '<div class="card" style="text-align:center"><div class="small b">QR pribadi Anda</div><div class="qrbox mt"><img data-qr alt="QR ' + esc(P.nama) + '"></div><div class="num" style="letter-spacing:.2em;font-weight:700;margin-top:8px">' + esc(P.token) + '</div><div class="tiny muted">Tunjukkan ke petugas saat registrasi, snack, makan, dan foto.</div><div class="row mt" style="justify-content:center"><button class="btn sm" data-dl>' + ic('download') + 'Simpan undangan</button><button class="btn sm" data-dlqr>' + ic('qr_code_2') + 'Simpan QR</button></div></div>' +
      '<div class="card"><div class="col" style="gap:10px">' + [['event', Kg.hariTanggal || tglID(Kg.tanggal)], ['schedule', Kg.jam ? 'Pukul ' + Kg.jam + ' WIB s.d. selesai' : '-'], ['location_on', Kg.lokasi || '-']].map((x) => '<div class="row" style="flex-wrap:nowrap">' + ic(x[0]) + '<span>' + esc(x[1]) + '</span></div>').join('') + (Kg.lokasi ? '<a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(Kg.lokasi) + '">' + ic('map') + 'Buka peta</a>' : '') + '</div></div>' +
      (!wis && P.jenis === 'TAMU' && Kg.status !== 'Arsip' && P.status !== 'Hadir' ? '<div class="card"><b>Konfirmasi kehadiran</b><p class="small muted">Mohon konfirmasi agar panitia dapat menyiapkan tempat dan konsumsi.</p><div class="row"><button class="btn primary" data-rsvp="Hadir"' + (P.status === 'Konfirmasi' ? ' disabled' : '') + '>' + ic('check') + (P.status === 'Konfirmasi' ? 'Sudah dikonfirmasi' : 'Insya Allah hadir') + '</button><button class="btn" data-rsvp="Tidak"' + (P.status === 'Tidak Hadir' ? ' disabled' : '') + '>Berhalangan</button></div></div>' : '');
    el.querySelector('[data-qr]').src = await qrDataUrl(P.token, 520);
    const cv = el.querySelector('[data-cv]');
    try {
      if (!tpl) tpl = await DocGen.siapkan('UNDANGAN', D.template, PUB);
      const data = { nama: P.nama, nama_arab: P.namaArab, jabatan: P.jabatan || P.sub, kategori: wis ? 'WISUDAWAN' : P.kategori, kursi: P.kursi ? 'Kursi ' + P.kursi : '', qr: P.token, acara: Kg.nama, hari_tanggal: Kg.hariTanggal, jam: Kg.jam ? 'Pukul ' + Kg.jam + ' WIB' : '', lokasi: Kg.lokasi, institusi: D.institusi.nama, singkat: D.institusi.singkat };
      const w = Math.min(el.clientWidth || 420, 460);
      await DocGen.gambar(tpl, data, { canvas: cv, pxPerMm: w / tpl.LebarMM * Math.min(2, window.devicePixelRatio || 1) });
    } catch (e) { cv.replaceWith(Object.assign(document.createElement('div'), { className: 'card', innerHTML: kosong('Undangan', 'Desain undangan belum dapat dimuat.', 'mail') })); }
    el.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.matches('[data-dl]')) { const c = el.querySelector('[data-cv]'); if (c) c.toBlob((bl) => unduh(bl, 'Undangan ' + P.nama + '.png'), 'image/png'); }
      if (b.matches('[data-dlqr]')) unduh(el.querySelector('[data-qr]').src, 'QR ' + P.nama + '.png');
      if (b.dataset.rsvp) { b.disabled = true; const r = await API.pub('tamu.rsvp', Object.assign({ status: b.dataset.rsvp }, PUB)); if (r.success) { D.peserta.status = r.data.status; simpanLokal(D); render(); } else b.disabled = false; }
    };
  }

  /* ---------------- letak kursi (denah mini tanpa nama orang lain) */
  function kursi(el) {
    const dn = D.denah, mine = dn ? dn.kursi : [];
    if (!dn || !dn.blok.length) { el.innerHTML = '<div class="card">' + kosong('Denah belum tersedia', 'Panitia akan menampilkan letak kursi menjelang acara.', 'event_seat') + '</div>'; return; }
    const blokSaya = new Set(mine.map((k) => k.blok));
    const urut = (z) => ({ S: 0, A: 1, B: 1, C: 2, D: 2, E: 3, F: 3, G: 4 }[z] != null ? { S: 0, A: 1, B: 1, C: 2, D: 2, E: 3, F: 3, G: 4 }[z] : 5);
    const baris = {}; dn.blok.forEach((b) => (baris[urut(b.id)] = baris[urut(b.id)] || []).push(b));
    el.innerHTML = '<div class="card"><div class="small b mb">Letak kursi Anda</div>' + (mine.length ? '<div class="row" style="gap:6px">' + mine.map((k) => pill((k.pendamping ? 'Pendamping ' : '') + k.kode, k.pendamping ? 'info' : 'yellow')).join('') + '</div>' : '<div class="notice small">' + ic('info') + '<div>Kursi Anda belum ditetapkan. Silakan menuju meja registrasi.</div></div>') +
      '<div class="mt" style="background:#F4F1EA;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px">' + Object.keys(baris).sort().map((r) => '<div style="display:flex;gap:8px;justify-content:center">' + baris[r].map((b) => '<div style="flex:' + Math.max(1, b.kolom || 1) + ';max-width:' + (b.id === 'S' ? '70%' : '48%') + ';padding:10px 6px;border-radius:10px;text-align:center;font-size:12px;font-weight:600;border:1.5px solid #1F1F1F;' + (blokSaya.has(b.id) ? 'background:#FFD35C' : b.id === 'S' ? 'background:#1F1F1F;color:#fff' : 'background:#fff;opacity:.7') + '">' + esc(b.nama || b.id) + (blokSaya.has(b.id) ? '<div class="tiny">● Anda di sini</div>' : '') + '</div>').join('') + '</div>').join('') + '</div><div class="tiny muted mt" style="text-align:center">Panggung di bagian atas. Ikuti arahan petugas among tamu.</div></div>';
  }

  /* ---------------- pengumuman */
  function info(el) {
    const L = D.pengumuman || [];
    el.innerHTML = L.length ? '<div class="col">' + L.map((p) => '<div class="card' + (p.dibaca ? '' : ' yellow') + '"><div class="row sb"><b>' + esc(p.judul) + '</b>' + (p.dibaca ? '' : pill('Baru', 'bad')) + '</div><div class="small mt" style="white-space:pre-wrap">' + esc(p.isi) + '</div><div class="tiny muted mt">' + esc(p.pembuat || 'Panitia') + ' · ' + tglID(p.waktu) + ' ' + jamID(p.waktu) + '</div></div>').join('') + '</div>' : '<div class="card">' + kosong('Belum ada pengumuman', 'Informasi terbaru dari panitia akan muncul di sini.', 'campaign') + '</div>';
    const baru = L.filter((p) => !p.dibaca).map((p) => p.id);
    if (baru.length) { API.pub('tamu.baca', Object.assign({ ids: baru }, PUB), { silent: true }); L.forEach((p) => p.dibaca = true); simpanLokal(D); setTimeout(perbaruiBadge, 1500); }
  }

  /* ---------------- kuisioner wisudawan */
  function soalHtml(s) {
    const nm = 'q_' + s.SoalID;
    if (s.Jenis === 'SKALA10') return '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">' + Array.from({ length: 10 }, (_, i) => '<label style="cursor:pointer"><input type="radio" name="' + nm + '" value="' + (i + 1) + '" hidden><span class="btn sm" style="width:100%">' + (i + 1) + '</span></label>').join('') + '</div><div class="row sb tiny muted mt"><span>Sangat kurang</span><span>Sangat baik</span></div>';
    if (s.Jenis === 'BINTANG') return '<div class="row">' + [1, 2, 3, 4, 5].map((i) => '<label style="cursor:pointer;font-size:32px"><input type="radio" name="' + nm + '" value="' + i + '" hidden><span>☆</span></label>').join('') + '</div>';
    if (s.Jenis === 'PILIHAN') return '<div class="col" style="gap:6px">' + (s.opsi || []).map((o) => '<label class="check"><input type="radio" name="' + nm + '" value="' + esc(o) + '">' + esc(o) + '</label>').join('') + '</div>';
    return '<textarea class="inp" name="' + nm + '" rows="3" placeholder="Tulis saran Anda…"></textarea>';
  }
  function kuis(el) {
    const L = D.kuisioner || [];
    el.innerHTML = L.map((f) => '<div class="card"><b>' + esc(f.Judul) + '</b><div class="small muted">' + esc(f.Deskripsi || '') + '</div>' + (f.sudah ? '<div class="notice ok mt">' + ic('check_circle') + '<div>Terima kasih, penilaian Anda sudah kami terima.</div></div>' :
      '<form class="col mt" data-f="' + f.FormID + '">' + f.soal.map((s, i) => '<div class="card flat" style="padding:12px"><div class="tiny muted">' + esc(s.Aspek || '') + '</div><b class="small">' + (i + 1) + '. ' + esc(s.Pertanyaan) + (s.Wajib === 'YA' ? ' <span style="color:#991B1B">*</span>' : '') + '</b><div class="mt">' + soalHtml(s) + '</div></div>').join('') + '<button class="btn primary lg">' + ic('send') + 'Kirim penilaian</button></form>') + '</div>').join('') || '<div class="card">' + kosong('Tidak ada kuisioner', '', 'rate_review') + '</div>';
    el.querySelectorAll('form[data-f]').forEach((fm) => {
      fm.addEventListener('change', (e) => { if (e.target.type !== 'radio') return; fm.querySelectorAll('[name="' + e.target.name + '"]').forEach((x) => { const s = x.nextElementSibling; if (!s) return; if (s.classList.contains('btn')) s.classList.toggle('primary', x.checked); else s.textContent = Number(x.value) <= Number(e.target.value) ? '★' : '☆'; }); });
      fm.onsubmit = async (e) => {
        e.preventDefault(); const f = L.find((x) => x.FormID === fm.dataset.f), jaw = {};
        f.soal.forEach((s) => { const x = fm.querySelector('[name="q_' + s.SoalID + '"]:checked') || fm.querySelector('textarea[name="q_' + s.SoalID + '"]'); if (x && x.value) jaw[s.SoalID] = x.value; });
        const kurang = f.soal.filter((s) => s.Wajib === 'YA' && !jaw[s.SoalID]); if (kurang.length) return toast('Lengkapi ' + kurang.length + ' pertanyaan wajib.', 'warn');
        const btn = fm.querySelector('button'); btn.disabled = true;
        const r = await API.pub('tamu.kuisSubmit', Object.assign({ FormID: f.FormID, jawaban: jaw }, PUB));
        if (r.success) { f.sudah = true; simpanLokal(D); render(); tab = 'kuis'; isi(); } else btn.disabled = false;
      };
    });
  }

  /* PWA (sw untuk aset statis; QR tetap tampil luring dari cache) */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && D) muat(true); });
  muat().then(() => { pollT = setInterval(() => { if (!document.hidden && D) muat(true); }, 60000); });
})();

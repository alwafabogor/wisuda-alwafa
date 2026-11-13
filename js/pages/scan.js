/* Scan QR — Hadir / Snack / Makan / Foto. 1 orang 1 QR, tiap jenis sah 1×. Antrean offline otomatis. */
App.page('scan', async function (view) {
  const { esc, API, Sesi, Store, modal, toast, lib, uid, debounce } = SW, { ic, pill } = UI;
  if (App.perluKegiatan(view)) return;
  const JENIS = [['HADIR', 'Hadir', 'how_to_reg'], ['SNACK', 'Snack', 'cookie'], ['MAKAN', 'Makan', 'restaurant'], ['FOTO', 'Foto', 'photo_camera']];
  let jenis = Store.get('scan_jenis', 'HADIR'), scanner = null, aktif = false, terakhir = { kode: '', t: 0 }, idx = Store.get('scanidx:' + Sesi.kid, null), stats = null;
  const QK = 'scanq:' + Sesi.kid; let antre = Store.get(QK, []);
  view.innerHTML = '<div style="max-width:560px;margin:0 auto"><div class="row sb mb"><div class="row"><span class="iconbtn" style="background:#FFE9E3">' + ic('qr_code_scanner') + '</span><div><b style="font-size:20px">Pos Pemindaian</b><div class="small muted">SIM Wisuda</div></div></div><span class="pill mint">' + ic('circle', 'fill') + ' ' + esc((Sesi.me.nama || '').split(' ')[0]) + '</span></div>' +
    '<div class="seg mb" style="display:flex;width:100%" data-j>' + JENIS.map((j) => '<button style="flex:1" data-v="' + j[0] + '">' + j[1] + '</button>').join('') + '</div>' +
    '<div class="scanbox" data-box><div id="qr-reader"></div><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i><i class="laser" data-laser style="display:none"></i><span class="modelbl" data-lbl></span><div data-start style="position:absolute;inset:0;display:grid;place-items:center;z-index:3"><button class="btn primary lg">' + ic('photo_camera') + 'Aktifkan Kamera</button></div></div>' +
    '<p class="small muted" style="text-align:center;margin:8px 0 14px">Arahkan kamera ke QR undangan, kartu panitia, atau tiket wisudawan</p><div data-res></div>' +
    '<div class="grid g2 mt"><div class="card cream" style="padding:14px"><div class="small muted">Total scan pos ini</div><div style="font-size:28px;font-weight:700" class="num" data-tot>–</div></div><div class="card cream" style="padding:14px"><div class="small muted">Status jaringan</div><div class="b small" data-net>–</div></div></div>' +
    '<button class="btn lg block mt" data-manual>' + ic('keyboard') + 'Input Manual (ketik nama / NIM / kode)</button><div class="card mt" data-log><b>Scan terakhir</b><div data-loglist class="col small" style="margin-top:8px;gap:6px"></div></div></div>';
  const $ = (s) => view.querySelector(s);
  const setJenis = () => { view.querySelectorAll('[data-j] button').forEach((b) => b.classList.toggle('on', b.dataset.v === jenis)); $('[data-lbl]').textContent = 'MODE: ' + { HADIR: 'KEHADIRAN', SNACK: 'SNACK', MAKAN: 'MAKAN SIANG', FOTO: 'FOTO WISUDAWAN & KELUARGA' }[jenis]; updStat(); };
  const bunyi = (ok) => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = ok ? 880 : 220; g.gain.value = .15; o.start(); o.stop(c.currentTime + (ok ? .12 : .35)); } catch (e) { } if (navigator.vibrate) navigator.vibrate(ok ? 60 : [80, 60, 80]); };
  function hasil(r) {
    const p = r.peserta || {}, cls = r.status === 'SAH' ? 'ok' : r.status === 'DUPLIKAT' ? 'dup' : 'nf';
    const ik = r.status === 'SAH' ? 'check' : r.status === 'DUPLIKAT' ? 'close' : r.status === 'OFFLINE' ? 'cloud_off' : 'priority_high';
    $('[data-res]').innerHTML = '<div class="scanres ' + cls + '"><div class="ph">' + ic(p.jenis === 'WISUDAWAN' ? 'school' : p.jenis === 'PANITIA' ? 'badge' : 'person') + '</div><div style="min-width:0"><div class="row" style="gap:6px">' + (p.kategori ? pill(p.kategori, 'dark') : '') + (p.kursi ? pill('Kursi ' + p.kursi, 'mute') : '') + '</div><div style="font-size:19px;font-weight:600;margin:4px 0 2px">' + esc(p.nama || r.kode || 'Tidak dikenal') + '</div><div class="small">' + esc(p.sub || '') + '</div><div class="small b" style="margin-top:6px">' + esc(r.pesan || '') + (r.status === 'SAH' && jenis === 'FOTO' && p.pendamping ? ' · bersama ' + p.pendamping + ' keluarga' : '') + '</div></div><div class="big">' + ic(ik) + '</div></div>';
    bunyi(r.status === 'SAH' || r.status === 'OFFLINE');
    const li = document.createElement('div'); li.className = 'row sb'; li.innerHTML = '<span>' + esc(p.nama || r.kode || '-') + '</span>' + pill(r.status === 'SAH' ? 'Sah' : r.status === 'DUPLIKAT' ? 'Duplikat' : r.status === 'OFFLINE' ? 'Offline' : 'Tidak dikenal', r.status === 'SAH' ? 'ok' : r.status === 'DUPLIKAT' ? 'bad' : 'warn');
    const ll = $('[data-loglist]'); ll.prepend(li); while (ll.children.length > 8) ll.lastChild.remove();
  }
  function cekLokal(kode) {
    const t = String(kode).toUpperCase().replace(/.*[?&]t=([A-Z0-9]+).*/i, '$1').replace(/[^A-Z0-9]/g, '');
    const p = idx && idx.peserta.find((x) => x.t === t);
    if (!p) return { status: 'TIDAK_DITEMUKAN', pesan: 'QR tidak ada di data offline.', kode: t };
    if ((p.sd || []).indexOf(jenis) > -1) return { status: 'DUPLIKAT', pesan: 'Sudah tercatat (data offline).', peserta: { nama: p.n, kategori: p.k, sub: p.s, kursi: p.kr } };
    (p.sd = p.sd || []).push(jenis); Store.set('scanidx:' + Sesi.kid, idx);
    return { status: 'OFFLINE', pesan: 'Tersimpan offline — akan disinkronkan otomatis.', peserta: { nama: p.n, kategori: p.k, sub: p.s, kursi: p.kr } };
  }
  async function proses(kode) {
    const now = Date.now(); if (kode === terakhir.kode && now - terakhir.t < 3500) return; terakhir = { kode, t: now };
    const item = { kode, jenis, clientId: uid(), waktu: new Date().toISOString(), perangkat: navigator.userAgent.slice(0, 60) };
    if (!navigator.onLine) { antre.push(item); Store.set(QK, antre); hasil(cekLokal(kode)); updNet(); return; }
    const r = await API.write('scan.do', item, { silent: true, retry: false, reqId: item.clientId });
    if (r.network) { antre.push(item); Store.set(QK, antre); hasil(cekLokal(kode)); updNet(); return; }
    if (!r.success) { hasil((r.data) || { status: 'TIDAK_DITEMUKAN', pesan: r.message, kode }); return; }
    hasil(r.data);
    if (idx && r.data.status === 'SAH') { const t = String(kode).toUpperCase().replace(/[^A-Z0-9]/g, ''); const p = idx.peserta.find((x) => x.t === t || kode.indexOf(x.t) > -1); if (p) { (p.sd = p.sd || []).push(jenis); } }
    updStat(true);
  }
  async function sinkron() {
    if (!antre.length || !navigator.onLine) return;
    const kirim = antre.slice(0, 100);
    const r = await API.write('scan.sync', { items: kirim }, { silent: true, retry: false });
    if (r.success) { antre = antre.slice(kirim.length); Store.set(QK, antre); toast(r.data.sah + ' scan offline tersinkron.', 'ok'); updStat(true); }
    updNet();
  }
  function updNet() { $('[data-net]').innerHTML = navigator.onLine ? (antre.length ? '<span style="color:#854D0E">' + ic('cloud_sync') + ' ' + antre.length + ' antrean sinkron</span>' : '<span style="color:#166534">' + ic('cloud_done') + ' Tersambung</span>') : '<span style="color:#991B1B">' + ic('cloud_off') + ' Offline · ' + antre.length + ' antre</span>'; }
  async function updStat(paksa) {
    if (paksa || !stats) { const r = await API.read('scan.stats', { jenis }, { silent: true }); if (r.success) stats = r.data; }
    if (!stats) return; const tot = (stats.per[jenis] || {}).total || 0;
    $('[data-tot]').innerHTML = tot + ' <span class="muted" style="font-size:16px;font-weight:400">/ ' + (jenis === 'FOTO' ? (stats.totalKategori.WISUDAWAN || 0) : stats.peserta) + '</span>';
  }
  async function muatIndeks() { const r = await API.read('scan.index', {}, { silent: true }); if (r.success) { idx = r.data; Store.set('scanidx:' + Sesi.kid, idx); } }
  async function mulai() {
    try {
      const H = await lib('scanner');
      $('[data-start]').innerHTML = '<span class="pill dark">Membuka kamera…</span>';
      scanner = new H('qr-reader', { verbose: false });
      await scanner.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; }, aspectRatio: 1 }, (txt) => proses(txt), () => { });
      aktif = true; $('[data-start]').style.display = 'none'; $('[data-laser]').style.display = '';
    } catch (e) {
      $('[data-start]').innerHTML = '<div style="text-align:center;color:#fff;padding:20px"><p>' + esc(/Permission|NotAllowed/i.test(String(e)) ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser.' : 'Kamera tidak tersedia: ' + (e.message || e)) + '</p><button class="btn primary">' + ic('refresh') + 'Coba lagi</button></div>';
    }
  }
  $('[data-start]').addEventListener('click', (e) => { if (e.target.closest('button')) mulai(); });
  view.querySelector('[data-j]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; jenis = b.dataset.v; Store.set('scan_jenis', jenis); setJenis(); });
  $('[data-manual]').onclick = () => {
    const body = document.createElement('div'); body.innerHTML = '<input class="inp" placeholder="Ketik nama, NIM, atau kode QR (min. 2 huruf)" data-q><div class="col mt" data-hs style="gap:6px"></div>';
    const m = modal({ title: 'Input Manual · ' + jenis, body, buttons: [{ label: 'Tutup' }] });
    const cariOnline = debounce(async (q) => {
      const hs = body.querySelector('[data-hs]');
      let list = [];
      if (navigator.onLine) { const r = await API.read('scan.cari', { q }, { silent: true }); list = r.success ? r.data : []; }
      else if (idx) list = idx.peserta.filter((p) => (p.n + ' ' + p.s).toLowerCase().indexOf(q.toLowerCase()) > -1).slice(0, 20).map((p) => ({ t: p.t, nama: p.n, kategori: p.k, sub: p.s, sudah: p.sd || [] }));
      hs.innerHTML = list.map((p) => '<button class="card flat row" style="cursor:pointer;text-align:left" data-t="' + p.t + '"><div style="flex:1"><b>' + esc(p.nama) + '</b><div class="small muted">' + esc(p.kategori + (p.sub ? ' · ' + p.sub : '')) + '</div></div>' + ((p.sudah || []).indexOf(jenis) > -1 ? pill('Sudah', 'bad') : pill('Pilih', 'ok')) + '</button>').join('') || '<div class="small muted">Tidak ditemukan.</div>';
    }, 350);
    body.querySelector('[data-q]').addEventListener('input', (e) => { if (e.target.value.trim().length >= 2) cariOnline(e.target.value.trim()); });
    body.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { m.close(); proses(b.dataset.t); } });
  };
  const onl = () => { updNet(); sinkron(); }; window.addEventListener('online', onl); window.addEventListener('offline', updNet);
  App.onLeave = () => { window.removeEventListener('online', onl); window.removeEventListener('offline', updNet); if (scanner && aktif) scanner.stop().catch(() => { }); };
  setJenis(); updNet();
  muatIndeks(); sinkron();
  App.every(20000, () => { sinkron(); if (SW.Activity.due('scanstat', 20000, 60000)) updStat(true); });
  App.every(300000, muatIndeks);
});

/* Rundown Live — tampil di HP semua panitia (hanya baca); Koordinator Umum mengendalikan ritme acara */
App.page('live', async function (view) {
  const { esc, API, Sesi, Store, konfirmasi, toast, Activity } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  const ctrl = App.boleh('rundown', Sesi.is('SUPERADMIN', 'KOORDINATOR')) && !App.arsip();
  const KEY = 'live:' + Sesi.kid;
  let S = Store.get(KEY, null), v = '', offset = 0, lastOk = S ? S.at : 0, buka = false;
  view.innerHTML = '<div style="max-width:720px;margin:0 auto" data-root></div>';
  const root = view.querySelector('[data-root]');
  const menitNow = () => { const d = new Date(Date.now() + offset); const j = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })); return j.getHours() * 60 + j.getMinutes() + j.getSeconds() / 60; };
  function render() {
    if (!S) { root.innerHTML = UI.skeleton(6); return; }
    const items = S.items || [], jalan = items.find((x) => x.ItemID === S.berjalanId) || null;
    const next = items.filter((x) => x.StatusLive !== 'SELESAI' && x !== jalan);
    const done = items.filter((x) => x.StatusLive === 'SELESAI');
    const offline = !navigator.onLine || (Date.now() - lastOk > 30000);
    let h = '<div class="row sb mb"><div class="row"><span class="logo" style="width:40px;height:40px">' + ic('school') + '</span><div><b>Rundown Live</b><div class="small muted">' + esc(S.plan ? S.plan.Nama : '-') + ' · ' + items.length + ' agenda</div></div></div>' + pill(S.mode === 'ACARA' ? 'ACARA' : S.mode === 'GLADIH' ? 'GLADIH' : 'NORMAL', S.mode === 'ACARA' ? 'coral' : S.mode === 'GLADIH' ? 'yellow' : 'mute') + '</div>';
    if (offline) h += '<div class="notice mb">' + ic('wifi_off') + '<div>Offline — menampilkan data terakhir (' + new Date(lastOk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ').</div></div>';
    if (jalan) {
      h += '<div class="live-now"><div class="row sb"><span class="pill info"><i class="pulse"></i>SEDANG BERJALAN</span><span class="num" style="font-weight:600">' + esc(jalan.Mulai) + ' – ' + esc(jalan.Selesai) + ' WIB</span></div>' +
        (jalan.KegiatanArab ? '<div class="ar" style="font-size:20px;color:#FFD35C;margin-top:12px;text-align:right">' + esc(jalan.KegiatanArab) + '</div>' : '') + '<div class="ttl">' + esc(jalan.Kegiatan) + '</div>' +
        (jalan.KodeInstrumen ? '<span class="pill" style="background:#3a3a3a;color:#fff">♪ ' + esc(jalan.KodeInstrumen) + '</span>' : '') +
        '<div class="pic"><span class="av">' + esc(SW.inisial(jalan.PetugasNama || jalan.PIC || '?')) + '</span><div style="flex:1"><div class="small" style="color:#bbb">Petugas</div><b>' + esc(jalan.PetugasNama || jalan.PIC || '—') + '</b>' + (jalan.TeksNo ? '<div class="small" style="color:#bbb">Teks MC #' + esc(jalan.TeksNo) + '</div>' : '') + '</div><div style="text-align:right"><div class="small" style="color:#bbb">SISA WAKTU</div><div class="timer num" data-timer>--:--</div></div></div>' +
        (ctrl ? '<div class="grid g2" style="margin-top:14px"><button class="btn primary lg" data-a="selesai">' + ic('check_circle') + 'Tandai Selesai</button><button class="btn lg" style="background:#3a3a3a;color:#fff;border-color:#000" data-a="extend">' + ic('more_time') + 'Extend +5m</button></div>' : '') + '</div>';
    } else {
      h += '<div class="live-now"><span class="pill mute">BELUM DIMULAI</span><div class="ttl">' + esc(next[0] ? next[0].Kegiatan : 'Semua agenda selesai') + '</div><div class="muted" style="color:#bbb">' + (next[0] ? 'Dijadwalkan ' + esc(next[0].Mulai) + ' WIB' : 'Alhamdulillah, acara selesai.') + '</div>' + (ctrl && next[0] ? '<button class="btn primary lg block" style="margin-top:14px" data-a="mulai">' + ic('play_arrow') + 'Mulai Agenda Pertama</button>' : '') + '</div>';
    }
    h += '<div class="row sb" style="margin:22px 0 10px"><h3>' + ic('event_upcoming') + ' Rundown Berikutnya</h3>' + pill(next.length + ' agenda', 'lilac') + '</div><div class="col">' +
      (next.map((it) => '<div class="card"><div class="row sb"><span class="num b">' + esc(it.Mulai) + ' – ' + esc(it.Selesai) + ' WIB <span class="muted" style="font-weight:400">· ' + it.Durasi + 'm</span></span>' + pill(it.Jenis || 'Menunggu', it.Jenis === 'PROSESI' ? 'lilac' : 'warn') + '</div>' + (it.KegiatanArab ? '<div class="ar" style="color:#5b48a8;text-align:center">' + esc(it.KegiatanArab) + '</div>' : '') + '<div style="font-size:17px;font-weight:500;margin:6px 0">' + esc(it.Kegiatan) + '</div><div class="row sb small"><span class="muted">' + ic('person') + ' ' + esc(it.PetugasNama || '—') + '</span><span class="row" style="gap:6px">' + (it.KodeInstrumen ? '<span class="kbd">' + esc(it.KodeInstrumen) + '</span>' : '') + (it.TeksNo ? '<span class="kbd">Teks MC #' + esc(it.TeksNo) + '</span>' : '') + (ctrl ? '<button class="btn xs" data-a="mulai" data-id="' + it.ItemID + '">Mulai</button>' : '') + '</span></div></div>').join('') || '<div class="card">' + kosong('Tidak ada agenda tersisa', '', 'celebration') + '</div>') + '</div>' +
      '<details class="card cream mt" ' + (buka ? 'open' : '') + ' data-done><summary class="b" style="cursor:pointer">' + ic('task_alt') + ' Telah Selesai (' + done.length + ' agenda)</summary><div class="col mt">' + done.map((it) => '<div class="row sb small"><span>' + esc(it.Mulai) + ' · ' + esc(it.Kegiatan) + '</span>' + (ctrl ? '<button class="btn xs" data-a="ulang" data-id="' + it.ItemID + '">Ulang</button>' : '') + '</div>').join('') + '</div></details>' +
      '<div class="card mt row sb"><div class="row">' + ic('sync') + '<div class="small"><b>Status sinkronisasi</b><div class="muted" data-sync-t>Update ' + new Date(lastOk).toLocaleTimeString('id-ID') + '</div></div></div>' + (ctrl ? '<div class="row"><a class="btn sm" href="#/rundown">' + ic('swap_vert') + 'Ubah urutan</a><button class="btn sm" data-a="reset">' + ic('restart_alt') + 'Reset</button></div>' : '<span class="small muted">Tampilan baca-saja</span>') + '</div>';
    root.innerHTML = h;
    tick();
  }
  function tick() {
    const t = root.querySelector('[data-timer]'); if (!t || !S) return;
    const jalan = (S.items || []).find((x) => x.ItemID === S.berjalanId); if (!jalan) return;
    let sisa = (jalan.selesaiMenit - menitNow()) * 60; const neg = sisa < 0; sisa = Math.abs(Math.round(sisa));
    t.textContent = (neg ? '+' : '') + String(Math.floor(sisa / 60)).padStart(2, '0') + ':' + String(sisa % 60).padStart(2, '0');
    t.classList.toggle('over', neg);
  }
  async function poll(paksa) {
    const r = await API.read('live.state', { v: paksa ? '' : v }, { silent: true, noBatch: true });
    if (!r.success) { render(); return; }
    lastOk = Date.now();
    if (r.data.now) { const [h, m, s] = r.data.now.split(':').map(Number); const j = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })); offset = ((h * 3600 + m * 60 + s) - (j.getHours() * 3600 + j.getMinutes() * 60 + j.getSeconds())) * 1000; }
    if (r.data.changed === false) { const st = root.querySelector('[data-sync-t]'); if (st) st.textContent = 'Update ' + new Date(lastOk).toLocaleTimeString('id-ID'); const off = root.querySelector('.notice'); if (off && /Offline/.test(off.textContent)) render(); return; }
    v = r.data.v; S = Object.assign({}, r.data, { at: lastOk }); Store.set(KEY, S); render();
    if (App.boot && r.data.mode && App.boot.mode !== r.data.mode) App.segarkanBoot();
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'reset' && !(await konfirmasi('Reset semua status live (untuk gladi/acara ulang)?', { bahaya: true, ya: 'Reset' }))) return;
    b.disabled = true;
    const r = a === 'reset' ? await API.write('live.reset', {}) : await API.write('live.action', { aksi: a, ItemID: b.dataset.id || '', menit: 5 }, { silent: a !== 'extend' });
    b.disabled = false;
    if (r.success) poll(true);
  });
  root.addEventListener('toggle', (e) => { if (e.target.matches('[data-done]')) buka = e.target.open; }, true);
  render();
  await poll(true);
  const detik = Number((App.boot.settings || {}).POLL_LIVE_DETIK || 5) * 1000;
  App.every(1000, () => { tick(); if (Activity.due('live', detik, Math.max(detik * 4, 20000))) poll(); });
  const onl = () => poll(true); window.addEventListener('online', onl); App.onLeave = () => window.removeEventListener('online', onl);
});

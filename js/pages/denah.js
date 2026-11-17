/* Denah & Penempatan Duduk — editor visual, isi otomatis, kursi ganda, FINAL → cetak label */
App.page('denah', async function (view) {
  const { esc, API, SWR, Sesi, modal, konfirmasi, toast } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  const edit = Sesi.is('SUPERADMIN', 'KOORDINATOR') && !App.arsip() && (!App.boot.modulMode || Sesi.is('SUPERADMIN'));
  let D = null, sel = null, pilihOrang = null, modeTampil = 'duduk', cari = '';
  const ZW = { VVIP: 'VVIP', VIP: 'VIP & Dosen', DOSEN: 'Dosen', WISUDAWAN: 'Wisudawan', WISUDAWATI: 'Wisudawati', PENDAMPING: 'Pendamping', UMUM: 'Tamu Umum', PANITIA: 'Panitia', SENAT: 'Senat', KOSONG: 'Cadangan' };
  view.innerHTML = '<div class="card row mb" style="padding:14px" data-top></div><div class="grid g-hp1" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start" data-grid><div class="card" data-map>' + UI.skeleton(10) + '</div><div class="col" data-side></div></div>';
  const elTop = view.querySelector('[data-top]'), elMap = view.querySelector('[data-map]'), elSide = view.querySelector('[data-side]');
  if (window.innerWidth < 1000) view.querySelector('[data-grid]').style.gridTemplateColumns = 'minmax(0,1fr)';
  const peserta = () => D.peserta, pById = () => { const m = {}; D.peserta.forEach((p) => m[p.jenis + ':' + p.id] = p); return m; };
  function namaKursi(k, P) {
    if (k.PenghuniJenis === 'PENDAMPING') { const w = P['WISUDAWAN:' + k.PenghuniID]; return k.Label || ('Ortu ' + (w ? w.nama.split(' ')[0] : '')); }
    const p = P[k.PenghuniJenis + ':' + k.PenghuniID]; return p ? p.nama : (k.Label || '');
  }
  function render() {
    const P = pById(), st = D.stat, final = D.denah.Status === 'FINAL';
    elTop.innerHTML = '<div class="seg"><button data-mt="duduk" class="' + (modeTampil === 'duduk' ? 'on' : '') + '">' + ic('event_seat') + ' Mode Duduk</button><button data-mt="prosesi" class="' + (modeTampil === 'prosesi' ? 'on' : '') + '">' + ic('alt_route') + ' Mode Prosesi</button></div>' +
      (final ? pill('STATUS: FINAL', 'ok') : pill('DRAFT', 'warn')) + (st.ganda.length ? pill(st.ganda.length + ' kursi ganda', 'bad') : pill('0 kursi ganda', 'mute')) + '<span class="small muted">Terisi ' + st.terisi + '/' + st.kapasitas + ' · ' + st.belum + ' peserta belum dapat kursi</span><span class="sp"></span>' +
      (edit && !final ? '<button class="btn sm" data-a="layout">' + ic('dashboard_customize') + 'Tata letak</button><button class="btn sm" data-a="auto">' + ic('auto_awesome') + 'Isi otomatis</button><button class="btn sm" data-a="clear">' + ic('mop') + 'Kosongkan</button>' : '') +
      (Sesi.is('SUPERADMIN', 'KOORDINATOR', 'PEGAWAI') ? '<a class="btn sm" href="#/studio?jenis=LABEL">' + ic('print') + 'Cetak Label (24/A4)</a>' : '') +
      (edit ? (final ? '<button class="btn sm" data-a="draft">' + ic('lock_open') + 'Buka kunci</button>' : '<button class="btn sm primary" data-a="final">' + ic('lock') + 'Tandai Final</button>') : '');
    const blok = (D.layout.blok || []), kursi = D.kursi, perBlok = {};
    kursi.forEach((k) => (perBlok[k.Blok] = perBlok[k.Blok] || []).push(k));
    const ganda = {}; st.ganda.forEach((g) => ganda[g] = 1);
    const urutMaju = {}; peserta().forEach((p) => { if (p.jenis === 'WISUDAWAN') urutMaju[p.id] = p.urut; });
    const seatHtml = (k) => {
      const nm = namaKursi(k, P), isi = !!(k.PenghuniID || k.Label);
      const r = k.Kode.split('-')[1] || k.Kode;
      return '<button class="seat ' + (isi ? 'isi ' : '') + (sel === k.KursiID ? 'sel ' : '') + (ganda[k.Kode] ? 'ganda ' : '') + '" data-k="' + k.KursiID + '" title="' + esc(k.Kode + (nm ? ' · ' + nm : ' · kosong')) + '"><b>' + esc(r) + (modeTampil === 'prosesi' && k.PenghuniJenis === 'WISUDAWAN' && urutMaju[k.PenghuniID] < 9999 ? ' · #' + urutMaju[k.PenghuniID] : '') + '</b><span>' + esc(nm || (modeTampil === 'prosesi' ? '' : 'Kosong')) + '</span></button>';
    };
    const blokHtml = (b) => '<div class="blok z-' + b.zona + '"><h4><span>' + esc(b.nama) + '</span><span class="muted tiny">' + b.baris + '×' + b.kolom + '</span></h4><div class="seats" style="grid-template-columns:repeat(' + b.kolom + ',minmax(0,1fr))">' + (perBlok[b.id] || []).map(seatHtml).join('') + '</div></div>';
    const pg = blok.filter((b) => b.sisi === 'panggung'), ki = blok.filter((b) => b.sisi === 'kiri'), ka = blok.filter((b) => b.sisi === 'kanan'), bl = blok.filter((b) => b.sisi === 'belakang' || !b.sisi);
    elMap.innerHTML = '<div class="row sb mb"><span class="small b" style="letter-spacing:.1em">' + ic('north') + ' KIBLAT / SISI DEPAN AUDITORIUM</span><span class="pill mute">Kapasitas ' + st.kapasitas + '</span></div><div class="denah">' +
      '<div class="stage"><div class="row sb" style="margin-bottom:8px"><b>' + ic('account_balance') + ' PANGGUNG UTAMA & PODIUM SENAT</b><span class="ar" style="font-size:14px">منصة مجلس الشيوخ الأكاديمي</span></div>' + (pg.length ? pg.map((b) => '<div class="stage-in">' + (perBlok[b.id] || []).map(seatHtml).join('') + '</div>').join('') : '<div class="stage-in" style="color:#999;padding:16px">Tidak ada blok panggung</div>') + '<div class="chipset" style="justify-content:center;margin-top:8px"><span class="chip">Podium Sambutan</span><span class="chip" style="background:#B52603;color:#fff">Area Pemindahan Tali Toga</span><span class="chip">Podium MC & Doa</span></div></div>' +
      '<div class="aisle-grid"><div class="col">' + ki.map(blokHtml).join('') + '</div><div class="aisle">' + (modeTampil === 'prosesi' ? '↑ Alur prosesi wisudawan ↑' : 'Selasar karpet merah') + '</div><div class="col">' + ka.map(blokHtml).join('') + '</div></div>' + bl.map(blokHtml).join('') + '</div>' +
      '<div class="legend">' + Object.keys(ZW).filter((z) => blok.some((b) => b.zona === z)).map((z) => '<span><i class="z-' + z + '" style="border:1px solid #ccc"></i>' + ZW[z] + '</span>').join('') + '</div>';
    renderSide();
  }
  function renderSide() {
    const P = pById(), k = D.kursi.find((x) => x.KursiID === sel), final = D.denah.Status === 'FINAL';
    let h = '';
    if (k) {
      const nm = namaKursi(k, P), p = k.PenghuniJenis === 'PENDAMPING' ? P['WISUDAWAN:' + k.PenghuniID] : P[k.PenghuniJenis + ':' + k.PenghuniID];
      h += '<div class="card"><div class="row sb"><span class="pill coral">' + esc(k.Kode) + '</span>' + pill(ZW[k.Zona] || k.Zona, 'lilac') + '</div><h3 style="margin:12px 0 2px">' + esc(nm || 'Kursi kosong') + '</h3><div class="small muted">' + esc(k.PenghuniJenis === 'PENDAMPING' ? 'Pendamping ' + (p ? p.nama : '') : p ? p.sub || p.kategori : 'Belum terisi') + '</div>' +
        (edit && !final ? '<div class="grid g2 mt"><button class="btn sm" data-s="pindah"' + (k.PenghuniID ? '' : ' disabled') + '>' + ic('swap_horiz') + 'Pindahkan</button><button class="btn sm danger" data-s="kosong"' + (k.PenghuniID || k.Label ? '' : ' disabled') + '>' + ic('person_remove') + 'Kosongkan</button></div><button class="btn sm block mt" data-s="label">' + ic('label') + 'Isi label manual</button>' : '') + '</div>';
    }
    const belum = peserta().filter((p) => !p.kursi && p.jenis !== 'SENAT' && (!cari || (p.nama + ' ' + p.sub).toLowerCase().indexOf(cari) > -1));
    h += '<div class="card"><div class="row sb"><b>' + ic('person_add') + ' Belum Dapat Kursi</b>' + pill(peserta().filter((p) => !p.kursi && p.jenis !== 'SENAT').length + ' orang', 'yellow') + '</div><p class="small muted" style="margin:6px 0 10px">' + (edit ? (final ? 'Denah FINAL — buka kunci untuk mengubah.' : 'Klik nama lalu klik kursi kosong (atau seret ke kursi).') : 'Hanya Koordinator Umum yang dapat mengatur kursi.') + '</p><input class="inp sm" placeholder="Cari nama atau NIM…" data-cari value="' + esc(cari) + '"><div class="col" style="gap:6px;margin-top:10px;max-height:340px;overflow:auto">' +
      (belum.slice(0, 80).map((p) => '<div class="row" draggable="' + (edit && !final) + '" data-p="' + p.jenis + ':' + p.id + '" style="padding:8px 10px;border-radius:10px;background:' + (pilihOrang === p.jenis + ':' + p.id ? '#FFD35C' : '#F7F5EF') + ';cursor:' + (edit && !final ? 'pointer' : 'default') + ';gap:8px"><span class="ms" style="color:#A3A199">drag_indicator</span><div style="flex:1;min-width:0"><b class="small" style="display:block">' + esc(p.nama) + '</b><span class="tiny muted">' + esc(p.kategori + (p.sub ? ' · ' + p.sub : '')) + '</span></div></div>').join('') || '<div class="small muted">Semua peserta sudah mendapat kursi ✔</div>') + '</div></div>';
    h += '<div class="card cream"><b>' + ic('checklist') + ' Catatan Protokoler</b><ul class="small" style="padding-left:18px;margin:8px 0 0">' + (D.layout.catatan || []).map((c) => '<li>' + esc(c) + '</li>').join('') + '</ul></div>';
    elSide.innerHTML = h;
  }
  async function assign(kursiId, key, label, tukar) {
    const [jenis, id] = key ? key.split(':') : ['', ''];
    const r = await API.write('denah.assign', { KursiID: kursiId, PenghuniJenis: jenis, PenghuniID: id, Label: label || '', tukar: !!tukar }, { silent: true });
    if (r.success) { toast(r.message, 'ok'); pilihOrang = null; muat(true); }
  }
  elMap.addEventListener('click', (e) => {
    const s = e.target.closest('[data-k]'); if (!s) return;
    const k = D.kursi.find((x) => x.KursiID === s.dataset.k);
    if (pilihOrang && edit && D.denah.Status !== 'FINAL') { assign(k.KursiID, pilihOrang, '', true); return; }
    sel = k.KursiID; render();
  });
  elMap.addEventListener('dragover', (e) => { const s = e.target.closest('[data-k]'); if (s) { e.preventDefault(); s.classList.add('drop'); } });
  elMap.addEventListener('dragleave', (e) => { const s = e.target.closest('[data-k]'); if (s) s.classList.remove('drop'); });
  elMap.addEventListener('drop', (e) => { const s = e.target.closest('[data-k]'); if (!s) return; e.preventDefault(); const key = e.dataTransfer.getData('text/plain'); if (key) assign(s.dataset.k, key, '', true); });
  elSide.addEventListener('dragstart', (e) => { const p = e.target.closest('[data-p]'); if (p) e.dataTransfer.setData('text/plain', p.dataset.p); });
  elSide.addEventListener('input', SW.debounce((e) => { if (e.target.matches('[data-cari]')) { cari = e.target.value.toLowerCase(); renderSide(); const i = elSide.querySelector('[data-cari]'); i.focus(); i.selectionStart = i.value.length; } }, 250));
  elSide.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-p]'); if (p && edit && D.denah.Status !== 'FINAL') { pilihOrang = pilihOrang === p.dataset.p ? null : p.dataset.p; renderSide(); if (pilihOrang) toast('Sekarang klik kursi tujuan di denah.', 'info'); return; }
    const b = e.target.closest('[data-s]'); if (!b) return; const k = D.kursi.find((x) => x.KursiID === sel);
    if (b.dataset.s === 'kosong') assign(k.KursiID, '', '');
    if (b.dataset.s === 'pindah') { pilihOrang = k.PenghuniJenis + ':' + k.PenghuniID; toast('Klik kursi tujuan. Penghuni kursi tujuan (bila ada) akan ditukar.', 'info'); }
    if (b.dataset.s === 'label') { const v = prompt('Label kursi (mis. "Cadangan Panitia", "Ortu Fulan"):', k.Label || ''); if (v != null) assign(k.KursiID, '', v); }
  });
  elTop.addEventListener('click', async (e) => {
    const mt = e.target.closest('[data-mt]'); if (mt) { modeTampil = mt.dataset.mt; render(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'auto') { const body = '<p>Isi kursi kosong sesuai zona: Senat → panggung, VVIP → blok VVIP, VIP & Dosen → blok VIP, wisudawan/wisudawati sesuai urutan masuk, pendamping 2 kursi per wisudawan, tamu umum → belakang.</p><label class="check"><input type="checkbox" data-timpa> Timpa penempatan yang sudah ada</label>'; const m = modal({ title: 'Isi Otomatis', body, buttons: [{ label: 'Batal' }, { label: 'Isi sekarang', cls: 'primary', onClick: async (mm) => { const r = await API.write('denah.autofill', { timpa: mm.body.querySelector('[data-timpa]').checked }); if (r.success) muat(true); } }] }); return m; }
    if (a === 'clear' && await konfirmasi('Kosongkan SEMUA kursi?', { bahaya: true, ya: 'Kosongkan' })) { await API.write('denah.clear', {}); muat(true); }
    if (a === 'final' && await konfirmasi('Tandai denah sebagai <b>FINAL</b>? Kursi terkunci dan label siap dicetak.' + (D.stat.ganda.length ? '<br><b style="color:#991B1B">Masih ada ' + D.stat.ganda.length + ' kursi ganda!</b>' : ''), { ya: 'Tandai Final' })) { await API.write('denah.setStatus', { Status: 'FINAL' }); muat(true); }
    if (a === 'draft' && await konfirmasi('Buka kunci denah (kembali ke Draft)?')) { await API.write('denah.setStatus', { Status: 'DRAFT' }); muat(true); }
    if (a === 'layout') editorLayout();
  });
  function editorLayout() {
    const L = JSON.parse(JSON.stringify(D.layout));
    const body = document.createElement('div');
    const gambar = () => {
      body.innerHTML = '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Kode</th><th>Nama blok</th><th>Zona</th><th>Posisi</th><th>Baris</th><th>Kolom</th><th></th></tr></thead><tbody>' + L.blok.map((b, i) => '<tr data-i="' + i + '"><td><input class="inp sm" style="width:56px" data-f="id" value="' + esc(b.id) + '"></td><td><input class="inp sm" data-f="nama" value="' + esc(b.nama) + '"></td><td><select class="inp sm" data-f="zona">' + Object.keys(ZW).map((z) => '<option' + (z === b.zona ? ' selected' : '') + '>' + z + '</option>').join('') + '</select></td><td><select class="inp sm" data-f="sisi">' + [['panggung', 'Panggung'], ['kiri', 'Kiri'], ['kanan', 'Kanan'], ['belakang', 'Belakang']].map((s) => '<option value="' + s[0] + '"' + (s[0] === b.sisi ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select></td><td><input class="inp sm" type="number" min="1" max="30" style="width:64px" data-f="baris" value="' + b.baris + '"></td><td><input class="inp sm" type="number" min="1" max="26" style="width:64px" data-f="kolom" value="' + b.kolom + '"></td><td><button class="btn xs danger" data-del>' + ic('delete') + '</button></td></tr>').join('') + '</tbody></table></div><button class="btn sm mt" data-add>' + ic('add') + 'Tambah blok</button><label class="field mt"><span>Catatan protokoler (satu per baris)</span><textarea class="inp" data-cat rows="3">' + esc((L.catatan || []).join('\n')) + '</textarea></label><p class="small muted">Kapasitas: <b>' + L.blok.reduce((s, b) => s + b.baris * b.kolom, 0) + ' kursi</b>. Kursi yang masih ada tetap mempertahankan penghuninya.</p>';
    };
    gambar();
    body.addEventListener('input', (e) => { const tr = e.target.closest('[data-i]'); if (!tr || !e.target.dataset.f) return; const b = L.blok[tr.dataset.i], f = e.target.dataset.f; b[f] = f === 'baris' || f === 'kolom' ? Number(e.target.value) : e.target.value; });
    body.addEventListener('click', (e) => { if (e.target.closest('[data-add]')) { L.blok.push({ id: String.fromCharCode(65 + L.blok.length), nama: 'Blok baru', zona: 'UMUM', sisi: 'belakang', baris: 2, kolom: 6 }); gambar(); } const d = e.target.closest('[data-del]'); if (d) { L.blok.splice(Number(d.closest('[data-i]').dataset.i), 1); gambar(); } });
    modal({ title: 'Tata Letak Denah', size: 'xwide', body, buttons: [{ label: 'Batal' }, { label: 'Simpan tata letak', cls: 'primary', onClick: async () => { L.catatan = body.querySelector('[data-cat]').value.split('\n').map((x) => x.trim()).filter(Boolean); const r = await API.write('denah.saveLayout', { layout: L }); if (!r.success) return false; muat(true); } }] });
  }
  const muat = (fresh) => SWR.load('denah.get', {}, (d, c, err) => { if (err) { elMap.innerHTML = kosong('Gagal memuat denah', esc(err.message), 'error'); return; } D = d; render(); }, { maxAge: 10000, fresh });
  await muat();
});

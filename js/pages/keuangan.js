/* Keuangan — RAB, PJ Belanja (Panitia Pegawai), realisasi + invoice + bukti transfer, pemasukan */
App.page('keuangan', async function (view) {
  const { esc, API, SWR, Sesi, drawer, modal, konfirmasi, toast, rupiah, ringkasRp, kompresGambar, bacaBase64, driveImg, eksporXLSX, angka } = SW;
  const { ic, pill, kosong, columns, formHtml, formVal, formCek, dropzone, PAL } = UI;
  if (App.perluKegiatan(view)) return;
  const sa = App.boleh('keuangan', Sesi.is('SUPERADMIN')) && !App.arsip();   // RAB & PJ (ikut Hak Akses Divisi)
  const saAsli = Sesi.is('SUPERADMIN') && !App.arsip();                          // pemasukan: khusus Superadmin (v1.2)
  let D = null, tab = 'rab';
  view.innerHTML = App.head('Keuangan & RAB', 'Hanya terlihat oleh Panitia Pegawai. PJ Belanja yang ditunjuk mencatat penggunaan dana + invoice + bukti transfer — dashboard otomatis terbarui.', '<button class="btn" data-xls>' + ic('table_view') + 'Ekspor</button>' + (sa ? '<button class="btn" data-rabexcel>' + ic('upload_file') + 'RAB via Excel</button><button class="btn primary" data-addpos>' + ic('add') + 'Pos RAB</button>' : '')) +
    '<div data-top>' + UI.skeleton(4) + '</div><div class="tabs mt"><button data-t="rab" class="on">' + ic('receipt_long') + 'RAB & Realisasi</button><button data-t="masuk">' + ic('account_balance_wallet') + 'Pemasukan</button><button data-t="riwayat">' + ic('history') + 'Riwayat Belanja</button></div><div data-body></div>';
  const top = view.querySelector('[data-top]'), body = view.querySelector('[data-body]');
  function render() {
    if (!D) return; const k = D.ringkas;
    top.innerHTML = '<div class="grid g3"><div class="card sky stat"><div class="lbl">Total RAB <span class="ico">' + ic('request_quote') + '</span></div><div class="big num" style="font-size:30px">' + rupiah(k.totalRAB) + '</div><div class="foot"><span>' + D.pos.length + ' pos anggaran</span><span>' + k.jumlahWisudawan + ' wisudawan</span></div></div>' +
      '<div class="card yellow stat"><div class="lbl">Total Realisasi <span class="ico">' + ic('shopping_cart') + '</span></div><div class="big num" style="font-size:30px">' + rupiah(k.totalRealisasi) + '</div><div class="bar"><i style="width:' + Math.min(100, k.persenTerpakai) + '%"></i></div><div class="foot" style="margin-top:8px"><span>' + k.persenTerpakai + '% terpakai</span></div></div>' +
      '<div class="card ' + (k.saldo < 0 ? '' : 'mint') + ' stat" style="' + (k.saldo < 0 ? 'background:#FEE2E2' : '') + '"><div class="lbl">Sisa Anggaran <span class="ico">' + ic('account_balance_wallet') + '</span></div><div class="big num" style="font-size:30px">' + rupiah(k.sisa) + '</div><div class="foot"><span>Pemasukan ' + rupiah(k.totalPemasukan) + '</span><span>Proyeksi ' + ringkasRp(k.proyeksiPemasukan) + '</span></div><div style="margin-top:8px">' + (k.saldo < 0 ? pill('Proyeksi defisit ' + rupiah(k.saldo), 'bad') : pill('Saldo proyeksi ' + rupiah(k.saldo), 'ok')) + '</div></div></div>' +
      (D.peringatan.length ? '<div class="notice bad mt">' + ic('warning') + '<div>' + D.peringatan.map(esc).join('<br>') + '</div></div>' : '') +
      '<div class="card mt"><div class="card-h"><h3>Anggaran vs Realisasi per Kelompok</h3>' + (D.saya.pj ? pill('Anda PJ Belanja', 'lilac') : '') + '</div><div data-chart></div></div>';
    columns(top.querySelector('[data-chart]'), { labels: D.kelompok.map((x) => x.kelompok), series: [{ name: 'RAB', values: D.kelompok.map((x) => x.rab), color: PAL[1] }, { name: 'Realisasi', values: D.kelompok.map((x) => x.realisasi), color: PAL[0] }], fmt: ringkasRp, aria: 'RAB vs realisasi' });
    if (tab === 'rab') {
      const grp = {}; D.pos.forEach((p) => (grp[p.Kelompok] = grp[p.Kelompok] || []).push(p));
      body.innerHTML = '<div class="card pad0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th class="r">Qty × Pcs × Harga</th><th class="r">Anggaran</th><th>PJ Belanja</th><th>Realisasi</th><th>Status</th><th></th></tr></thead><tbody>' +
        Object.keys(grp).map((g) => (grp[g].length > 1 || grp[g][0].Item !== g ? '<tr><td colspan="7" style="background:#F7F5EF;font-weight:600">' + esc(g) + '</td></tr>' : '') + grp[g].map((p) => {
          const pct = p.Nominal ? Math.min(100, Math.round(p.Terpakai / p.Nominal * 100)) : 0, mine = p.PJEmail && p.PJEmail === Sesi.me.email;
          return '<tr data-id="' + p.PosID + '" style="cursor:pointer"><td><b>' + esc(p.Item) + '</b>' + (p.SumberPcs === 'WISUDAWAN' ? '<div class="tiny muted">pcs otomatis = jumlah wisudawan</div>' : '') + '</td><td class="r num small">' + angka(p.Qty) + ' × ' + angka(p.PcsEfektif) + ' × ' + rupiah(p.Harga) + '</td><td class="r num b">' + rupiah(p.Nominal) + '</td><td>' + (p.PJNama ? '<span class="person">' + UI.avatar(p.PJNama, '', 'sm') + '<span class="small">' + esc(p.PJNama) + (mine ? ' (Anda)' : '') + '</span></span>' : '<span class="muted small">— belum ditunjuk —</span>') + '</td><td style="min-width:140px"><div class="small num">' + rupiah(p.Terpakai) + '</div><div class="bar light" style="height:6px"><i style="width:' + pct + '%;' + (p.Status === 'MELEBIHI' ? 'background:#991B1B' : '') + '"></i></div></td><td>' + pill(p.Status === 'MELEBIHI' ? 'Melebihi' : p.Status === 'SESUAI' ? 'Sesuai' : p.Status === 'PROSES' ? 'Proses' : 'Belum', p.Status === 'MELEBIHI' ? 'bad' : p.Status === 'SESUAI' ? 'ok' : p.Status === 'PROSES' ? 'info' : 'mute') + '</td><td class="act">' + (mine || sa ? '<button class="btn xs primary" data-real="' + p.PosID + '">' + ic('add') + 'Realisasi</button>' : '') + '</td></tr>';
        }).join('')).join('') + '</tbody><tfoot><tr><td colspan="2" class="r b">TOTAL</td><td class="r num b">' + rupiah(D.ringkas.totalRAB) + '</td><td></td><td class="num b">' + rupiah(D.ringkas.totalRealisasi) + '</td><td colspan="2"></td></tr></tfoot></table></div></div>';
    } else if (tab === 'masuk') {
      const boleh = saAsli, total = D.pemasukan.reduce((t, x) => t + (Number(x.Nominal) || 0), 0);
      body.innerHTML = '<div class="row sb mb"><span class="muted">Biaya per wisudawan: <b>' + rupiah(D.ringkas.biayaPerWisudawan) + '</b> (atur di Pengaturan → Variabel: <span class="kbd">biaya_wisuda</span>)</span>' + (boleh ? '<button class="btn primary" data-addmasuk>' + ic('add') + 'Catat pemasukan</button>' : '') + '</div>' +
        (boleh ? '' : '<p class="small muted" style="margin-top:-6px">' + ic('lock') + ' Pemasukan dicatat, diubah, dan dihapus oleh Superadmin.</p>') +
        '<div class="card pad0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Sumber</th><th class="r">Nominal</th><th>Keterangan</th><th>Bukti</th>' + (boleh ? '<th></th>' : '') + '</tr></thead><tbody>' +
        (D.pemasukan.map((x) => '<tr data-masuk="' + esc(x.PemasukanID) + '"><td class="c1">' + esc(SW.tglID(x.Tanggal)) + '</td><td>' + esc(x.Sumber || '-') + '</td><td class="r num b">' + rupiah(x.Nominal) + '</td><td>' + esc(x.Keterangan || '') + '</td><td>' + (x.BuktiID ? '<button class="btn xs" data-lihat="' + x.BuktiID + '">' + ic('image') + '</button>' : '') + '</td>' +
          (boleh ? '<td class="act"><button class="btn xs" data-ubahmasuk="' + esc(x.PemasukanID) + '" title="Ubah">' + ic('edit') + '</button><button class="btn xs" data-hapusmasuk="' + esc(x.PemasukanID) + '" title="Hapus">' + ic('delete') + '</button></td>' : '') + '</tr>').join('') ||
          '<tr><td colspan="' + (boleh ? 6 : 5) + '">' + kosong('Belum ada pemasukan tercatat', 'Proyeksi dihitung dari biaya per wisudawan.', 'account_balance_wallet') + '</td></tr>') + '</tbody>' +
        (D.pemasukan.length ? '<tfoot><tr><td colspan="2" class="r b">TOTAL</td><td class="r num b">' + rupiah(total) + '</td><td colspan="' + (boleh ? 3 : 2) + '"></td></tr></tfoot>' : '') + '</table></div></div>';
    } else {
      body.innerHTML = '<div class="card pad0"><table class="tbl"><thead><tr><th>Tanggal</th><th>Pos</th><th>Vendor</th><th class="r">Nominal</th><th>Oleh</th><th>Berkas</th><th>Status</th></tr></thead><tbody>' +
        (D.realisasi.map((x) => { const p = D.pos.find((y) => y.PosID === x.PosID) || {}; return '<tr><td>' + esc(SW.tglID(x.Tanggal)) + '</td><td>' + esc(p.Item || x.PosID) + '</td><td>' + esc(x.Vendor || '-') + '</td><td class="r num b">' + rupiah(x.Nominal) + '</td><td class="small">' + esc(x.OlehNama || '') + '</td><td>' + (x.InvoiceID ? '<button class="btn xs" data-lihat="' + x.InvoiceID + '">Invoice</button> ' : '') + (x.BuktiTFID ? '<button class="btn xs" data-lihat="' + x.BuktiTFID + '">TF</button>' : '') + '</td><td>' + pill(x.Status) + '</td></tr>'; }).join('') || '<tr><td colspan="7">' + kosong('Belum ada belanja', '', 'shopping_cart') + '</td></tr>') + '</tbody></table></div>';
    }
  }
  async function unggah(file, kategori) {
    const isImg = /^image\//.test(file.type);
    const data = isImg ? (await kompresGambar(file, 1800, 0.82)).dataUrl : await bacaBase64(file);
    const r = await API.write('file.upload', { base64: data, mime: isImg ? 'image/jpeg' : file.type, nama: file.name, kategori }, { silent: true });
    if (!r.success) { toast(r.message, 'err'); return ''; }
    return r.data.id;
  }
  function drawerPos(p) {
    const real = D.realisasi.filter((x) => x.PosID === p.PosID), mine = (p.PJEmail === Sesi.me.email) || sa;
    const b = document.createElement('div');
    b.innerHTML = '<div class="card cream"><div class="row sb"><b>' + esc(p.Item) + '</b>' + pill(p.Kelompok, 'mute') + '</div><div class="grid g3 mt small"><div>Anggaran<br><b class="num">' + rupiah(p.Nominal) + '</b></div><div>Terpakai<br><b class="num">' + rupiah(p.Terpakai) + '</b></div><div>Sisa<br><b class="num" style="color:' + (p.Sisa < 0 ? '#991B1B' : '#166534') + '">' + rupiah(p.Sisa) + '</b></div></div></div>' +
      (sa ? '<div class="field mt"><span>PJ Belanja (hanya Panitia Pegawai)</span><div class="row"><select class="inp" data-pj style="flex:1"><option value="">— tidak ada —</option>' + D.pegawai.map((x) => '<option value="' + esc(x.email) + '"' + (x.email === p.PJEmail ? ' selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '</select><button class="btn" data-setpj>Tetapkan</button></div></div>' : '') +
      '<h3 class="mt">Realisasi (' + real.length + ')</h3><div class="col mt" style="gap:8px">' + (real.map((x) => '<div class="card flat" style="padding:12px"><div class="row sb"><b class="num">' + rupiah(x.Nominal) + '</b><span class="small muted">' + esc(SW.tglID(x.Tanggal)) + '</span></div><div class="small">' + esc(x.Vendor || '') + ' · ' + esc(x.Keterangan || '') + '</div><div class="row mt" style="gap:6px">' + (x.InvoiceID ? '<button class="btn xs" data-lihat="' + x.InvoiceID + '">' + ic('receipt') + 'Invoice</button>' : pill('Invoice belum', 'warn')) + (x.BuktiTFID ? '<button class="btn xs" data-lihat="' + x.BuktiTFID + '">' + ic('payments') + 'Bukti TF</button>' : pill('Bukti TF belum', 'warn')) + pill(x.Status) + (mine && x.Status !== 'Batal' ? '<button class="btn xs ghost" data-batal="' + x.RealisasiID + '">Batalkan</button>' : '') + '</div></div>').join('') || '<div class="small muted">Belum ada realisasi.</div>') + '</div>' +
      (mine && !App.arsip() ? '<div class="card mt"><h3>' + ic('add_card') + ' Catat penggunaan dana</h3><div class="form mt"><label class="field"><span>Tanggal</span><input type="date" data-tg value="' + new Date().toISOString().slice(0, 10) + '"></label><label class="field"><span>Nominal (Rp)</span><input type="number" data-nom></label><label class="field"><span>Vendor / toko</span><input data-ven></label><label class="field"><span>Keterangan</span><input data-ket></label></div><div class="grid g2 mt"><div><span class="small b">Invoice / nota</span><div data-dz1></div></div><div><span class="small b">Bukti transfer</span><div data-dz2></div></div></div><button class="btn primary block mt" data-simpan>' + ic('save') + 'Simpan realisasi</button></div>' : (p.PJEmail ? '' : '<div class="notice info mt">' + ic('info') + 'Belum ada PJ Belanja untuk pos ini.</div>'));
    const files = { inv: null, tf: null };
    if (b.querySelector('[data-dz1]')) {
      dropzone(b.querySelector('[data-dz1]'), { label: 'Unggah invoice', hint: 'Foto / PDF', onFile: (f, prev) => { files.inv = f; prev.innerHTML = '<span class="pill ok">' + esc(f.name) + '</span>'; } });
      dropzone(b.querySelector('[data-dz2]'), { label: 'Unggah bukti TF', hint: 'Foto / PDF', onFile: (f, prev) => { files.tf = f; prev.innerHTML = '<span class="pill ok">' + esc(f.name) + '</span>'; } });
    }
    const m = drawer({ title: 'Pos RAB', size: 'wide', body: b, buttons: sa ? [{ label: 'Hapus pos', cls: 'danger', onClick: async () => { if (!(await konfirmasi('Hapus pos ini?', { bahaya: true }))) return false; const r = await API.write('keu.deletePos', { PosID: p.PosID }); if (r.success) muat(true); else return false; } }, { label: 'Ubah pos', icon: 'edit', onClick: () => { formPos(p); } }] : [{ label: 'Tutup' }] });
    b.addEventListener('click', async (e) => {
      const l = e.target.closest('[data-lihat]'); if (l) return lihat(l.dataset.lihat);
      if (e.target.closest('[data-setpj]')) { const r = await API.write('keu.setPJ', { PosID: p.PosID, PJEmail: b.querySelector('[data-pj]').value }); if (r.success) { m.close(); muat(true); } }
      const bt = e.target.closest('[data-batal]'); if (bt && await konfirmasi('Batalkan realisasi ini?', { bahaya: true })) { await API.write('keu.deleteRealisasi', { RealisasiID: bt.dataset.batal }); m.close(); muat(true); }
      if (e.target.closest('[data-simpan]')) {
        const nom = Number(b.querySelector('[data-nom]').value); if (!(nom > 0)) return toast('Isi nominal.', 'warn');
        const btn = e.target.closest('[data-simpan]'); btn.disabled = true; btn.textContent = 'Mengunggah berkas…';
        const InvoiceID = files.inv ? await unggah(files.inv, 'invoice') : '', BuktiTFID = files.tf ? await unggah(files.tf, 'bukti') : '';
        const r = await API.write('keu.saveRealisasi', { PosID: p.PosID, Tanggal: b.querySelector('[data-tg]').value, Nominal: nom, Vendor: b.querySelector('[data-ven]').value, Keterangan: b.querySelector('[data-ket]').value, InvoiceID, BuktiTFID });
        btn.disabled = false; if (r.success) { m.close(); muat(true); }
      }
    });
  }
  async function lihat(id) { const m = modal({ title: 'Berkas', size: 'wide', body: UI.skeleton(3) }); const u = await driveImg(id); m.body.innerHTML = u ? (u.indexOf('data:application/pdf') === 0 ? '<iframe src="' + u + '" style="width:100%;height:70vh;border:0"></iframe>' : '<img src="' + u + '" style="width:100%">') : kosong('Tidak bisa menampilkan berkas', '', 'broken_image'); }
  function formPos(p) {
    const kel = D.kelompokMaster || [...new Set(D.pos.map((x) => x.Kelompok).filter(Boolean))], opsiKel = [['', '— pilih kelompok —']].concat(kel.map((k) => [k, k])).concat(p && p.Kelompok && kel.indexOf(p.Kelompok) === -1 ? [[p.Kelompok, p.Kelompok + ' (belum ada di master)']] : []);
    const F = [{ k: 'Kelompok', label: 'Kelompok', type: 'select', opts: opsiKel, req: true, help: 'Daftar kelompok diatur di <a href="#/master?tab=KelompokRAB">Master Data → Kelompok RAB</a>.' }, { k: 'Item', label: 'Item', req: true }, { k: 'Qty', label: 'Qty', type: 'number' }, { k: 'Pcs', label: 'Pcs', type: 'number' }, { k: 'Harga', label: 'Harga satuan', type: 'number' }, { k: 'SumberPcs', label: 'Pcs otomatis', type: 'select', opts: [['', 'Manual'], ['WISUDAWAN', '= jumlah wisudawan']] }, { k: 'Keterangan', label: 'Keterangan', full: true }];
    const b = document.createElement('div'); b.innerHTML = formHtml(F, p || { Qty: 1, Pcs: 1 });
    modal({ title: p ? 'Ubah Pos RAB' : 'Pos RAB Baru', size: 'wide', body: b, buttons: [{ label: 'Batal' }, { label: 'Simpan', cls: 'primary', onClick: async () => { if (!formCek(b, F)) return false; const v = formVal(b, F); if (p) v.PosID = p.PosID; const r = await API.write('keu.savePos', v); if (!r.success) return false; muat(true); } }] });
  }
  function formMasuk(r) {
    const F = [{ k: 'Tanggal', label: 'Tanggal', type: 'date', def: new Date().toISOString().slice(0, 10) }, { k: 'Nominal', label: 'Nominal', type: 'number', req: true }, { k: 'Sumber', label: 'Sumber', ph: 'Biaya wisuda / donasi / yayasan' }, { k: 'Keterangan', label: 'Keterangan', full: true }];
    const b = document.createElement('div'); b.innerHTML = formHtml(F, r ? Object.assign({}, r, { Tanggal: String(r.Tanggal || '').slice(0, 10) }) : {}) + '<div class="mt" data-dz></div>' + (r && r.BuktiID ? '<p class="small muted">Bukti tersimpan. Unggah berkas baru untuk menggantinya.</p>' : ''); let file = null;
    dropzone(b.querySelector('[data-dz]'), { label: r && r.BuktiID ? 'Ganti bukti (opsional)' : 'Bukti (opsional)', onFile: (f, prev) => { file = f; prev.innerHTML = '<span class="pill ok">' + esc(f.name) + '</span>'; } });
    modal({ title: r ? 'Ubah Pemasukan' : 'Catat Pemasukan', body: b, buttons: [{ label: 'Batal' }, { label: 'Simpan', cls: 'primary', icon: 'save', onClick: async () => {
      if (!formCek(b, F)) return false; const v = formVal(b, F); if (r) v.PemasukanID = r.PemasukanID;
      if (file) v.BuktiID = await unggah(file, 'bukti');
      const x = await API.write('data.save', { tabel: 'Pemasukan', row: v }); if (!x.success) return false; muat();
    } }] });
  }
  async function hapusMasuk(r) {
    if (!(await konfirmasi('Hapus pemasukan <b>' + rupiah(r.Nominal) + '</b> (' + esc(r.Sumber || '-') + ', ' + esc(SW.tglID(r.Tanggal)) + ')? Tindakan ini tidak bisa dibatalkan.', { bahaya: true, ya: 'Hapus' }))) return;
    const x = await API.write('data.delete', { tabel: 'Pemasukan', ids: [r.PemasukanID] }); if (x.success) muat();
  }
  body.addEventListener('click', (e) => {
    const l = e.target.closest('[data-lihat]'); if (l) return lihat(l.dataset.lihat);
    if (e.target.closest('[data-addmasuk]')) return formMasuk(null);
    const um = e.target.closest('[data-ubahmasuk]'); if (um) return formMasuk(D.pemasukan.find((x) => x.PemasukanID === um.dataset.ubahmasuk));
    const hm = e.target.closest('[data-hapusmasuk]'); if (hm) return hapusMasuk(D.pemasukan.find((x) => x.PemasukanID === hm.dataset.hapusmasuk));
    const tr = e.target.closest('tr[data-id]'); if (tr) drawerPos(D.pos.find((p) => p.PosID === tr.dataset.id));
  });
  view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  const ap = view.querySelector('[data-addpos]'); if (ap) ap.onclick = () => formPos(null);
  const rx = view.querySelector('[data-rabexcel]'); if (rx) rx.onclick = () => rabExcel();

  /* ---------------------------------------------------- RAB via Excel (v1.1): unduh berisi data + dropdown Kelompok, ubah, unggah */
  const namaBerkas = () => 'RAB-' + String((App.boot.kegiatan || {}).Nama || 'Wisuda').replace(/[^\w-]+/g, '-').replace(/-+/g, '-') + '.xlsx';
  async function unduhRAB() {
    if (!D) return;
    const ExcelJS = await SW.lib('exceljs'), wb = new ExcelJS.Workbook(); wb.creator = 'SIM Wisuda'; wb.created = new Date();
    const kel = D.kelompokMaster || [...new Set(D.pos.map((x) => x.Kelompok).filter(Boolean))], jw = D.ringkas.jumlahWisudawan || 0, N = Math.max(D.pos.length + 300, 400);
    const ws = wb.addWorksheet('RAB', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [{ header: 'Kode', key: 'k', width: 12 }, { header: 'Kelompok', key: 'g', width: 26 }, { header: 'Item', key: 'i', width: 40 }, { header: 'Qty', key: 'q', width: 8 }, { header: 'Pcs', key: 'p', width: 8 },
      { header: 'Pcs Otomatis', key: 'o', width: 19 }, { header: 'Harga Satuan', key: 'h', width: 16 }, { header: 'Jumlah', key: 'j', width: 18 }, { header: 'Keterangan', key: 'ket', width: 32 }, { header: 'Urutan', key: 'u', width: 8 }];
    sortByUrut(D.pos).forEach((p, i) => { const r = i + 2; ws.addRow({ k: p.PosID, g: p.Kelompok, i: p.Item, q: Number(p.Qty) || 0, p: Number(p.Pcs) || 0, o: p.SumberPcs === 'WISUDAWAN' ? 'Jumlah wisudawan' : '', h: Number(p.Harga) || 0, ket: p.Keterangan || '', u: Number(p.Urutan) || i + 1 }); });
    for (let r = 2; r <= N; r++) {
      ws.getCell('H' + r).value = { formula: 'IF(C' + r + '="","",D' + r + '*IF(F' + r + '="Jumlah wisudawan",' + jw + ',E' + r + ')*G' + r + ')' };
      ws.getCell('B' + r).dataValidation = { type: 'list', allowBlank: true, formulae: ['Kelompok!$A$2:$A$' + (kel.length + 1)], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Kelompok tidak dikenal', error: 'Pilih kelompok dari daftar. Kelompok baru ditambahkan di Master Data → Kelompok RAB.' };
      ws.getCell('F' + r).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Jumlah wisudawan"'] };
      ['D', 'E', 'G'].forEach((c) => { ws.getCell(c + r).dataValidation = { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, error: 'Isi angka (tanpa titik ribuan).' }; });
      ['G', 'H'].forEach((c) => { ws.getCell(c + r).numFmt = '#,##0'; });
      ws.getCell('A' + r).font = { color: { argb: 'FF8A857B' } };
    }
    const h = ws.getRow(1); h.font = { bold: true, color: { argb: 'FFFFD35C' } }; h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1F1F' } }; h.height = 22;
    const ks = wb.addWorksheet('Kelompok'); ks.columns = [{ header: 'Kelompok RAB (Master Data)', key: 'n', width: 34 }]; kel.forEach((k) => ks.addRow({ n: k })); ks.getRow(1).font = { bold: true };
    const pt = wb.addWorksheet('Petunjuk'); pt.columns = [{ header: 'Cara mengubah RAB lewat Excel', key: 'a', width: 110 }]; pt.getRow(1).font = { bold: true, size: 13 };
    ['1. Ubah atau tambah baris di sheet RAB. Kolom Kelompok wajib dipilih dari dropdown (daftar diatur di Master Data → Kelompok RAB).',
      '2. Jangan ubah kolom Kode — kode menghubungkan baris dengan pos RAB di aplikasi. Baris baru: biarkan Kode kosong.',
      '3. Pcs Otomatis = "Jumlah wisudawan" bila jumlah pcs mengikuti jumlah wisudawan aktif (' + jw + ' orang saat berkas ini dibuat).',
      '4. Isi angka tanpa titik ribuan. Sel kosong = nilai lama tidak diubah. Kolom Jumlah dihitung otomatis dan tidak ikut diimpor.',
      '5. Menghapus baris di Excel TIDAK menghapus pos di aplikasi (hapus pos lewat menu Keuangan).',
      '6. Simpan, lalu di aplikasi: Keuangan → RAB via Excel → Unggah → periksa hasil pindai → Jalankan Impor.'].forEach((t) => pt.addRow({ a: t }));
    const buf = await wb.xlsx.writeBuffer();
    SW.unduh(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaBerkas());
  }
  const sortByUrut = (a) => a.slice().sort((x, y) => (Number(x.Urutan) || 0) - (Number(y.Urutan) || 0));
  function rabExcel() {
    const b = document.createElement('div'); let rows = null;
    b.innerHTML = '<div class="col"><div class="card flat"><div class="row sb" style="gap:12px"><div style="flex:1;min-width:200px"><b>1. Unduh RAB sekarang</b><div class="small muted">Berkas berisi semua pos RAB + dropdown Kelompok dari Master Data.</div></div><button class="btn" data-unduh>' + ic('download') + 'Unduh Excel RAB</button></div></div>' +
      '<div class="card flat"><b>2. Unggah berkas yang sudah diubah</b><div class="small muted" style="margin:4px 0 10px">Baris yang sama diperbarui, baris baru ditambah, pos yang tidak ada di berkas tetap aman.</div><div data-dz></div></div><div data-hasil></div></div>';
    const hasil = b.querySelector('[data-hasil]');
    b.querySelector('[data-unduh]').onclick = async (e) => { const t = e.currentTarget; t.disabled = true; try { await unduhRAB(); } catch (x) { toast(x.message, 'err'); } t.disabled = false; };
    const KOL = { kode: 'PosID', kelompok: 'Kelompok', item: 'Item', qty: 'Qty', pcs: 'Pcs', 'pcs otomatis': 'SumberPcs', 'harga satuan': 'Harga', harga: 'Harga', keterangan: 'Keterangan', urutan: 'Urutan' };
    async function laporkan(r, jalan) {
      if (!r.success) { hasil.innerHTML = '<div class="notice bad">' + ic('error') + '<div>' + esc(r.message) + '</div></div>'; return; }
      const L = r.data.laporan;
      hasil.innerHTML = '<div class="grid g4 mt">' + [['Di berkas', L.sumber, ''], ['Ditambah', L.ditambah, 'mint'], ['Diperbarui', L.diperbarui, 'sky'], ['Dilewati', L.dilewati, L.dilewati ? 'yellow' : '']].map((x) => '<div class="card ' + x[2] + '" style="padding:12px"><div class="small muted">' + x[0] + '</div><b style="font-size:22px">' + angka(x[1]) + '</b></div>').join('') + '</div>' +
        (L.tetap ? '<p class="small muted">' + angka(L.tetap) + ' baris sama persis dengan data sekarang.</p>' : '') +
        (r.data.kelompokTidakAda.length ? '<div class="notice warn mt">' + ic('category') + '<div>Kelompok belum ada di Master Data: <b>' + r.data.kelompokTidakAda.map(esc).join(', ') + '</b>. Tambahkan di <a href="#/master?tab=KelompokRAB">Master Data → Kelompok RAB</a> lalu unggah lagi.</div></div>' : '') +
        (r.data.peringatan.length ? '<details class="mt"><summary class="small">' + r.data.peringatan.length + ' catatan</summary><ul class="small muted">' + r.data.peringatan.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul></details>' : '') +
        (jalan ? '<div class="notice ok mt">' + ic('check_circle') + '<div>Impor RAB selesai. Dashboard keuangan sudah diperbarui.</div></div>' : '<div class="notice info mt">' + ic('info') + '<div>Ini hasil <b>pindai</b> — belum ada yang disimpan. Tekan <b>Jalankan Impor</b>.</div></div>');
    }
    UI.dropzone(b.querySelector('[data-dz]'), { label: 'Pilih berkas Excel RAB', hint: '.xlsx / .xls / .csv', accept: '.xlsx,.xls,.csv', icon: 'upload_file', onFile: async (file) => {
      hasil.innerHTML = UI.skeleton(3);
      try {
        const XLSX = await SW.lib('xlsx'), wb = XLSX.read(await file.arrayBuffer());
        const sh = wb.Sheets['RAB'] || wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sh, { defval: '', raw: true }).map((r, i) => { const o = { _baris: i + 2 }; Object.keys(r).forEach((k) => { const kk = KOL[String(k).trim().toLowerCase()]; if (kk) o[kk] = typeof r[k] === 'string' ? r[k].trim() : r[k]; }); return o; })
          .filter((o) => o.Item !== '' || o.PosID !== '' || o.Kelompok !== '');
        if (!rows.length) { hasil.innerHTML = '<div class="notice bad">' + ic('error') + '<div>Sheet RAB kosong atau kolom tidak dikenali (Kelompok, Item, Qty, Pcs, Harga Satuan).</div></div>'; rows = null; return; }
        laporkan(await API.write('keu.importRAB', { rows, dryRun: true }, { silent: true }), false);
      } catch (x) { hasil.innerHTML = '<div class="notice bad">' + ic('error') + '<div>' + esc(x.message) + '</div></div>'; rows = null; }
    } });
    modal({ title: 'RAB via Excel', size: 'wide', body: b, buttons: [{ label: 'Tutup' }, { label: 'Jalankan Impor', cls: 'primary', icon: 'play_arrow', onClick: async () => {
      if (!rows) { toast('Unggah berkas Excel RAB dulu.', 'warn'); return false; }
      const r = await API.write('keu.importRAB', { rows, dryRun: false }); laporkan(r, true); if (r.success) { rows = null; muat(); } return false;
    } }] });
  }
  view.querySelector('[data-xls]').onclick = () => D && eksporXLSX({ RAB: D.pos.map((p) => ({ Kelompok: p.Kelompok, Item: p.Item, Qty: p.Qty, Pcs: p.PcsEfektif, Harga: p.Harga, Anggaran: p.Nominal, Realisasi: p.Terpakai, Sisa: p.Sisa, PJ: p.PJNama, Status: p.Status })), Realisasi: D.realisasi.map((x) => ({ Tanggal: x.Tanggal, Pos: (D.pos.find((p) => p.PosID === x.PosID) || {}).Item, Vendor: x.Vendor, Nominal: x.Nominal, Keterangan: x.Keterangan, Oleh: x.OlehNama, Status: x.Status })), Pemasukan: D.pemasukan }, 'Keuangan-Wisuda');
  const muat = (fresh) => SWR.load('keu.get', {}, (d, c, err) => { if (err) { top.innerHTML = '<div class="card">' + kosong('Tidak dapat memuat', esc(err.message), 'lock') + '</div>'; return; } D = d; render(); }, { maxAge: 15000, fresh });
  await muat();
});

/* Laporan & LPJ — LPJ otomatis (struktur LPJ Wisuda III), Laporan Evaluasi Feedback, Laporan Data Aplikasi */
App.page('laporan', async function (view, params) {
  const { esc, API, Sesi, modal, toast, rupiah, angka, tglID, driveImg, eksporXLSX, unduh } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  const bolehEdit = App.boleh('laporan', Sesi.is('SUPERADMIN', 'KOORDINATOR')) && !App.arsip();
  let tab = ['lpj', 'evaluasi', 'data'].indexOf(params.tab) > -1 ? params.tab : 'lpj', L = null, formId = '';
  view.innerHTML = '<div class="noprint">' + App.head('Laporan & LPJ', 'Disusun otomatis dari data aplikasi. Bagian berlatar kuning bisa disunting.', '<span data-aksi class="row"></span>') +
    '<div class="tabs" data-t><button data-v="lpj">' + ic('description') + 'LPJ Wisuda</button><button data-v="evaluasi">' + ic('query_stats') + 'Evaluasi Feedback</button><button data-v="data">' + ic('table_view') + 'Data Aplikasi</button></div></div><div data-body>' + UI.skeleton(10) + '</div>';
  const body = view.querySelector('[data-body]'), aksi = view.querySelector('[data-aksi]');

  /* ============================================================ MODEL LPJ (satu sumber untuk HTML & DOCX) */
  const romawi = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
  const N = (k) => (L.narasi[k] || { teks: '' }).teks;
  function model() {
    const v = L.vars || {}, keg = L.kegiatan || {}, s = L.settings || {}, B = [];
    const pj = (p) => (L.pejabat || []).find((x) => x.Peran === p) || {};
    const judul = 'LAPORAN PERTANGGUNGJAWABAN', sub = 'WISUDA ' + String(v.wisuda_ke_urut || ('KE-' + (v.wisuda_ke || ''))).toUpperCase(), inst = String(v.institusi || s.NAMA_INSTITUSI || '').toUpperCase();
    // Sampul
    B.push({ t: 'title', text: judul }, { t: 'title', text: sub }, { t: 'title', text: inst }, { t: 'center', text: 'Tahun ' + (v.tahun || String(keg.TanggalAcara || '').slice(0, 4) || new Date().getFullYear()) }, { t: 'break' });
    // Lembar pengesahan
    B.push({ t: 'h1', text: 'LEMBAR PENGESAHAN' }, { t: 'p', text: 'Laporan Pertanggungjawaban ' + (v.acara || 'Wisuda') + ' yang dilaksanakan pada ' + (v.hari_tanggal || '-') + ' bertempat di ' + (v.lokasi || '-') + ' telah diperiksa dan disahkan.' },
      { t: 'ttd', kiri: { atas: 'Penanggung Jawab,', nama: pj('PJ').Nama, jabatan: pj('PJ').Jabatan }, kanan: { atas: 'Penyusun,', nama: pj('PENYUSUN').Nama, jabatan: pj('PENYUSUN').Jabatan } },
      { t: 'ttd1', atas: 'Mengetahui,', nama: pj('MENGETAHUI').Nama, jabatan: pj('MENGETAHUI').Jabatan }, { t: 'break' });
    // BAB I
    B.push({ t: 'h1', text: 'BAB I\nPENDAHULUAN' }, { t: 'h2', text: 'A. Latar Belakang' }, { t: 'p', text: N('latar_belakang'), edit: 'latar_belakang' },
      { t: 'h2', text: 'B. Tujuan Kegiatan' }, { t: 'list', items: N('tujuan').split('\n').filter((x) => x.trim()), edit: 'tujuan' },
      { t: 'h2', text: 'C. Waktu dan Tempat Pelaksanaan' }, { t: 'kv', rows: [['Hari, tanggal', v.hari_tanggal || '-'], ['Waktu', v.jam ? 'Pukul ' + v.jam + ' WIB s.d. selesai' : '-'], ['Tempat', v.lokasi || '-']] }, { t: 'break' });
    // BAB II
    B.push({ t: 'h1', text: 'BAB II\nRANGKAIAN ACARA' }, { t: 'h2', text: 'A. Susunan Kepanitiaan' });
    ['PEGAWAI', 'MAHASISWA'].forEach((j) => {
      const rows = L.panitia.filter((p) => (String(p.jenis).toUpperCase() === 'PEGAWAI') === (j === 'PEGAWAI'));
      if (!rows.length) return;
      B.push({ t: 'h3', text: j === 'PEGAWAI' ? 'Panitia Pegawai' : 'Panitia Acara (Mahasiswa)' }, { t: 'table', head: ['No', 'Nama', 'Kepanitiaan', 'Divisi'], w: [6, 40, 30, 24], rows: rows.map((p, i) => [i + 1, p.nama, p.kepanitiaan, p.divisi]) });
    });
    B.push({ t: 'h2', text: 'B. Susunan Acara' + (L.plan ? ' (' + L.plan + ' — FINAL)' : '') });
    if (L.rundown.length) B.push({ t: 'table', head: ['No', 'Waktu', 'Kegiatan', 'Petugas'], w: [6, 20, 50, 24], rows: L.rundown.map((r, i) => [i + 1, (r.Mulai || '') + (r.Selesai ? '–' + r.Selesai : ''), r.Kegiatan, r.PetugasNama || '']) });
    else B.push({ t: 'p', text: '(Rundown belum ditetapkan FINAL.)', muted: true });
    B.push({ t: 'h2', text: 'C. Peserta Wisuda' }, { t: 'p', text: 'Wisuda diikuti oleh ' + angka(L.peserta.total) + ' wisudawan dengan rincian sebagai berikut:' },
      { t: 'table', head: ['No', 'Program Studi', 'Jumlah'], w: [8, 70, 22], rows: L.peserta.perProdi.map((p, i) => [i + 1, p.prodi, p.jumlah]).concat([['', 'JUMLAH', L.peserta.total]]), bold: 'last' });
    B.push({ t: 'h2', text: 'D. Tamu Undangan' }, { t: 'p', text: 'Tamu undangan berjumlah ' + angka(L.tamu.total) + ' orang, yang hadir ' + angka(L.tamu.hadir) + ' orang (' + String(L.tamu.persen).replace('.', ',') + '%) berdasarkan pemindaian QR kehadiran.' });
    Object.keys(L.tamu.perKategori).forEach((k) => B.push({ t: 'h3', text: 'Tamu ' + k }, { t: 'table', head: ['No', 'Nama', 'Jabatan / Instansi', 'Hadir'], w: [6, 40, 40, 14], rows: L.tamu.perKategori[k].map((t, i) => [i + 1, t.nama, [t.jabatan, t.instansi].filter(Boolean).join(' — '), t.hadir ? '✓' : '—']) }));
    // Kehadiran & layanan dari scan
    const sc = L.scan || {}, lbl = { HADIR: 'Kehadiran', SNACK: 'Snack', MAKAN: 'Makan', FOTO: 'Foto Wisudawan & Keluarga' }, rowsScan = [];
    Object.keys(sc).forEach((j) => Object.keys(sc[j] || {}).forEach((kat) => { const x = sc[j][kat]; rowsScan.push([lbl[j] || j, kat, x.total, x.sudah, x.total ? Math.round(x.sudah / x.total * 1000) / 10 + '%' : '-']); }));
    if (rowsScan.length) B.push({ t: 'h3', text: 'Rekap Layanan (Scan QR)' }, { t: 'table', head: ['Layanan', 'Kategori', 'Sasaran', 'Terlayani', '%'], w: [28, 24, 16, 16, 16], rows: rowsScan });
    B.push({ t: 'h2', text: 'E. Evaluasi Pelaksanaan' }, { t: 'p', text: N('evaluasi_pengantar'), edit: 'evaluasi_pengantar' });
    if (L.kuis && L.kuis.hasil) {
      const sk = L.kuis.hasil.filter((h) => h.rata != null);
      B.push({ t: 'h3', text: 'Indikator Penilaian (' + esc(L.kuis.form.Judul) + ' · ' + L.kuis.totalRespon + ' responden)' }, { t: 'table', head: ['No', 'Aspek', 'Nilai rata-rata (skala 10)'], w: [8, 62, 30], rows: sk.map((h, i) => [i + 1, h.Aspek || h.Pertanyaan, String(h.rata).replace('.', ',')]).concat([['', 'RATA-RATA KESELURUHAN', String(L.kuis.rataTotal || '-').replace('.', ',')]]), bold: 'last' });
    }
    if (L.evaluasi.length) B.push({ t: 'h3', text: 'Catatan Evaluasi' }, { t: 'table', head: ['No', 'Rencana', 'Aktualisasi', 'Akibat', 'Saran', '%/Remarks'], w: [5, 19, 19, 19, 26, 12], rows: L.evaluasi.map((e, i) => [i + 1, e.Rencana, e.Aktualisasi, e.Akibat, e.Saran, e.Persen]) });
    B.push({ t: 'break' });
    // BAB III
    const k = L.keuangan.ringkas || {};
    B.push({ t: 'h1', text: 'BAB III\nBIAYA PENGELUARAN' }, { t: 'p', text: N('biaya'), edit: 'biaya' });
    const kel = {}; L.keuangan.pos.forEach((p) => (kel[p.Kelompok || 'Lainnya'] = kel[p.Kelompok || 'Lainnya'] || []).push(p));
    const rk = []; let no = 0;
    Object.keys(kel).forEach((g) => { rk.push({ grup: g }); kel[g].forEach((p) => rk.push([++no, p.Item, p.Qty || '', p.PcsEfektif || '', rupiah(p.Harga), rupiah(p.Nominal), rupiah(p.Terpakai)])); });
    rk.push(['', 'TOTAL', '', '', '', rupiah(k.totalRAB), rupiah(k.totalRealisasi)]);
    B.push({ t: 'table', head: ['No', 'Uraian', 'Qty', 'Pcs', 'Harga', 'RAB', 'Realisasi'], w: [5, 33, 7, 7, 15, 16, 17], rows: rk, bold: 'last', small: true },
      { t: 'kv', rows: [['Total anggaran (RAB)', rupiah(k.totalRAB)], ['Total realisasi', rupiah(k.totalRealisasi) + ' (' + (k.persenTerpakai || 0) + '%)'], ['Pemasukan tercatat', rupiah(k.totalPemasukan)], ['Proyeksi pemasukan', rupiah(k.proyeksiPemasukan) + (k.biayaPerWisudawan ? ' (' + rupiah(k.biayaPerWisudawan) + ' × ' + angka(k.jumlahWisudawan) + ' wisudawan)' : '')], ['Sisa anggaran', rupiah(k.sisa)]] }, { t: 'break' });
    // BAB IV
    const poin = L.evaluasi.map((e) => e.Saran).filter(Boolean);
    B.push({ t: 'h1', text: 'BAB IV\nPENUTUP' }, { t: 'h2', text: 'A. Kesimpulan' }, { t: 'p', text: N('kesimpulan'), edit: 'kesimpulan' });
    if (poin.length) B.push({ t: 'list', items: poin, num: true });
    B.push({ t: 'h2', text: 'B. Rekomendasi' }, { t: 'p', text: N('rekomendasi') || (bolehEdit ? '(Klik untuk menulis rekomendasi.)' : '-'), edit: 'rekomendasi' });
    B.push({ t: 'p', text: 'Demikian laporan pertanggungjawaban ini kami susun. Atas perhatian dan kerja sama semua pihak, kami ucapkan terima kasih.' },
      { t: 'ttd', kiri: { atas: 'Penanggung Jawab,', nama: pj('PJ').Nama, jabatan: pj('PJ').Jabatan }, kanan: { atas: (s.KOTA || 'Bogor') + ', ' + tglID(new Date()) + '\nPenyusun,', nama: pj('PENYUSUN').Nama, jabatan: pj('PENYUSUN').Jabatan } });
    if (L.galeri.length) B.push({ t: 'break' }, { t: 'h1', text: 'LAMPIRAN\nDOKUMENTASI KEGIATAN' }, { t: 'img', items: L.galeri.map((g) => ({ id: g.FileID, cap: [g.Kategori, g.Keterangan].filter(Boolean).join(' — ') })) });
    return B;
  }

  /* ============================================================ render HTML */
  function blokHtml(b) {
    const e = (t) => esc(t == null ? '' : t).replace(/\n/g, '<br>');
    const ed = (k) => bolehEdit && k ? ' class="edit" data-edit="' + k + '" title="Klik untuk menyunting"' : '';
    switch (b.t) {
      case 'title': return '<h1 style="font-size:20px;margin:6px 0">' + e(b.text) + '</h1>';
      case 'center': return '<p style="text-align:center">' + e(b.text) + '</p>';
      case 'break': return '<div style="break-after:page;height:1px;border-top:1px dashed #ccc;margin:30px 0" class="pgb"></div>';
      case 'h1': return '<h1 style="margin-top:8px">' + e(b.text) + '</h1>';
      case 'h2': return '<h2>' + e(b.text) + '</h2>';
      case 'h3': return '<h3>' + e(b.text) + '</h3>';
      case 'p': return '<p style="text-align:justify;text-indent:' + (b.muted ? 0 : '1.2cm') + (b.muted ? ';color:#777' : '') + '"><span' + ed(b.edit) + '>' + e(b.text) + '</span></p>';
      case 'list': return '<div' + ed(b.edit) + '><ol style="margin:0 0 12px;padding-left:1.4cm" type="' + (b.num ? '1' : 'a') + '">' + b.items.map((x) => '<li>' + e(x) + '</li>').join('') + '</ol></div>';
      case 'kv': return '<table style="border:0;width:auto"><tbody>' + b.rows.map((r) => '<tr><td style="border:0;padding:2px 14px 2px 0">' + e(r[0]) + '</td><td style="border:0;padding:2px 6px">:</td><td style="border:0;padding:2px 0">' + e(r[1]) + '</td></tr>').join('') + '</tbody></table>';
      case 'table': return '<table' + (b.small ? ' style="font-size:12px"' : '') + '><thead><tr>' + b.head.map((h, i) => '<th style="width:' + (b.w ? b.w[i] + '%' : 'auto') + '">' + e(h) + '</th>').join('') + '</tr></thead><tbody>' +
        b.rows.map((r, ri) => r.grup ? '<tr><td colspan="' + b.head.length + '" style="background:#f4f4f4;font-weight:700">' + e(r.grup) + '</td></tr>' : '<tr' + (b.bold === 'last' && ri === b.rows.length - 1 ? ' style="font-weight:700"' : '') + '>' + r.map((c, i) => '<td' + (i === 0 || /^\d/.test(String(c)) && i > 1 ? ' style="text-align:' + (i === 0 ? 'center' : 'right') + '"' : '') + '>' + e(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      case 'ttd': return '<div class="ttd">' + [b.kiri, b.kanan].map((x) => '<div><span>' + e(x.atas) + '</span><span><b><u>' + e(x.nama || '.................................') + '</u></b><br>' + e(x.jabatan || '') + '</span></div>').join('') + '</div>';
      case 'ttd1': return '<div style="text-align:center;margin-top:30px;min-height:120px;display:flex;flex-direction:column;justify-content:space-between"><span>' + e(b.atas) + '</span><span><b><u>' + e(b.nama || '.................................') + '</u></b><br>' + e(b.jabatan || '') + '</span></div>';
      case 'img': return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' + b.items.map((x) => '<figure style="margin:0;break-inside:avoid"><img data-src="' + esc(x.id) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover;background:#eee;border:1px solid #ccc"><figcaption style="font-size:12px;text-align:center">' + e(x.cap) + '</figcaption></figure>').join('') + '</div>';
    }
    return '';
  }
  async function lpj(fresh) {
    aksi.innerHTML = '';
    body.innerHTML = UI.skeleton(12);
    const [r, forms] = await Promise.all([SW.SWR.get('lpj.data', formId ? { FormID: formId } : {}, { fresh: !!fresh, maxAge: 120000 }), SW.SWR.get('kuis.list', {}, { maxAge: 60000 })]);
    if (!r.success) { body.innerHTML = '<div class="card">' + kosong('Gagal memuat LPJ', esc(r.message), 'error') + '</div>'; return; }
    L = r.data;
    const daftarForm = forms.success ? (forms.data || []).filter((f) => f.Status !== 'Draft') : [];
    aksi.innerHTML = (daftarForm.length > 1 ? '<select class="inp sm" data-form style="max-width:220px">' + daftarForm.map((f) => '<option value="' + f.FormID + '"' + (L.kuis && L.kuis.form.FormID === f.FormID ? ' selected' : '') + '>Kuis: ' + esc(f.Judul) + '</option>').join('') + '</select>' : '') +
      '<button class="btn sm" data-ref>' + ic('refresh') + 'Segarkan</button><button class="btn sm" data-print>' + ic('print') + 'Cetak / PDF</button><button class="btn sm primary" data-docx>' + ic('description') + 'Unduh DOCX</button>';
    const B = model();
    const cek = [['Panitia', L.panitia.length], ['Rundown FINAL', L.rundown.length], ['Wisudawan', L.peserta.total], ['Tamu', L.tamu.total], ['Kuisioner', L.kuis ? L.kuis.totalRespon : 0], ['Catatan evaluasi', L.evaluasi.length], ['RAB', L.keuangan.pos.length], ['Foto LPJ', L.galeri.length]];
    const isi = cek.filter((c) => c[1]).length;
    body.innerHTML = '<div class="card mb noprint"><div class="row sb"><div><b>Kelengkapan data LPJ: ' + Math.round(isi / cek.length * 100) + '% terisi otomatis</b><div class="row mt" style="gap:6px">' + cek.map((c) => pill(c[0] + ' · ' + angka(c[1]), c[1] ? 'ok' : 'warn')).join('') + '</div></div>' +
      (bolehEdit ? '<span class="small muted">' + ic('edit_note') + ' Klik teks berlatar kuning untuk menyunting narasi.</span>' : '') + '</div></div><div class="paper" data-paper>' + B.map(blokHtml).join('') + '</div>';
    lazyImg(body);
  }
  function lazyImg(root) {
    const io = new IntersectionObserver((ents) => ents.forEach(async (en) => { if (!en.isIntersecting) return; io.unobserve(en.target); const u = await driveImg(en.target.dataset.src); if (u) en.target.src = u; }), { rootMargin: '300px' });
    root.querySelectorAll('img[data-src]').forEach((i) => io.observe(i));
  }
  function sunting(k) {
    const n = L.narasi[k] || { raw: '' };
    const b = document.createElement('div');
    b.innerHTML = '<p class="small muted">Variabel otomatis: ' + ['acara', 'wisuda_ke_urut', 'institusi', 'singkat', 'hari_tanggal', 'lokasi', 'jumlah_wisudawan'].map((x) => '<code>{{' + x + '}}</code>').join(' ') + (k === 'tujuan' ? '<br>Satu tujuan per baris.' : '') + '</p><textarea class="inp" rows="9" style="font-family:\'Times New Roman\',serif;font-size:15px">' + esc(n.raw || '') + '</textarea>';
    modal({ title: 'Sunting narasi: ' + k.replace(/_/g, ' '), size: 'wide', body: b, buttons: [{ label: 'Batal' }, { label: 'Kembalikan bawaan', onClick: async () => { await API.write('lpj.saveNarasi', { Kunci: k, Isi: '' }); lpj(true); } }, { label: 'Simpan', cls: 'primary', onClick: async () => { const r = await API.write('lpj.saveNarasi', { Kunci: k, Isi: b.querySelector('textarea').value }); if (!r.success) return false; lpj(true); } }] });
  }
  /* ============================================================ DOCX (pustaka docx 8.5) */
  async function docxLPJ() {
    const btn = aksi.querySelector('[data-docx]'); btn.disabled = true; btn.innerHTML = ic('hourglass_top') + 'Menyusun…';
    try {
      const D = await SW.lib('docx'), B = model();
      const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, ImageRun, LevelFormat } = D;
      const F = 'Times New Roman', run = (t, o) => new TextRun(Object.assign({ text: String(t == null ? '' : t), font: F, size: 24 }, o || {}));
      const multi = (t, o) => String(t || '').split('\n').map((x, i) => new TextRun(Object.assign({ text: x, font: F, size: 24, break: i ? 1 : 0 }, o || {})));
      const P = (kids, o) => new Paragraph(Object.assign({ children: kids, spacing: { after: 120, line: 360 } }, o || {}));
      const sel = (t, o) => new TableCell({ children: [new Paragraph({ children: multi(t, Object.assign({ size: o && o.small ? 18 : 20 }, o && o.bold ? { bold: true } : {})), alignment: o && o.align })], shading: o && o.fill ? { fill: o.fill } : undefined, columnSpan: o && o.span });
      const kids = [];
      for (const b of B) {
        if (b.t === 'title') kids.push(P([run(b.text, { bold: true, size: 32 })], { alignment: AlignmentType.CENTER }));
        else if (b.t === 'center') kids.push(P([run(b.text)], { alignment: AlignmentType.CENTER }));
        else if (b.t === 'break') kids.push(new Paragraph({ children: [new PageBreak()] }));
        else if (b.t === 'h1') kids.push(P(multi(b.text, { bold: true, size: 28 }), { alignment: AlignmentType.CENTER, spacing: { after: 240 } }));
        else if (b.t === 'h2') kids.push(P([run(b.text, { bold: true })], { spacing: { before: 200, after: 120 } }));
        else if (b.t === 'h3') kids.push(P([run(b.text, { bold: true, italics: true })]));
        else if (b.t === 'p') kids.push(P(multi(b.text, b.muted ? { color: '777777' } : {}), { alignment: AlignmentType.JUSTIFIED, indent: b.muted ? undefined : { firstLine: 680 } }));
        else if (b.t === 'list') b.items.forEach((x) => kids.push(P([run(x)], { numbering: { reference: b.num ? 'angka' : 'huruf', level: 0 }, alignment: AlignmentType.JUSTIFIED })));
        else if (b.t === 'kv') kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows: b.rows.map((r) => new TableRow({ children: [new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, children: [P([run(r[0])])] }), new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, children: [P([run(':')])] }), new TableCell({ width: { size: 63, type: WidthType.PERCENTAGE }, children: [P([run(r[1])])] })] })) }), P([]));
        else if (b.t === 'table') kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: b.w ? b.w.map((x) => Math.round(x * 90)) : undefined, rows: [new TableRow({ tableHeader: true, children: b.head.map((h) => sel(h, { bold: true, fill: 'EEEEEE', align: AlignmentType.CENTER, small: b.small })) })].concat(b.rows.map((r, ri) => r.grup ? new TableRow({ children: [sel(r.grup, { bold: true, fill: 'F4F4F4', span: b.head.length, small: b.small })] }) : new TableRow({ children: r.map((c, i) => sel(c, { bold: b.bold === 'last' && ri === b.rows.length - 1, small: b.small, align: i === 0 ? AlignmentType.CENTER : undefined })) }))) }), P([]));
        else if (b.t === 'ttd') kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows: [new TableRow({ children: [b.kiri, b.kanan].map((x) => new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [P(multi(x.atas), { alignment: AlignmentType.CENTER }), P([run('')]), P([run('')]), P([run('')]), P([run(x.nama || '.................................', { bold: true, underline: {} })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }), P([run(x.jabatan || '')], { alignment: AlignmentType.CENTER })] })) })] }));
        else if (b.t === 'ttd1') kids.push(P([run(b.atas)], { alignment: AlignmentType.CENTER, spacing: { before: 400 } }), P([run('')]), P([run('')]), P([run('')]), P([run(b.nama || '.................................', { bold: true, underline: {} })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } }), P([run(b.jabatan || '')], { alignment: AlignmentType.CENTER }));
        else if (b.t === 'img') for (let i = 0; i < b.items.length; i++) {
          btn.innerHTML = ic('hourglass_top') + 'Foto ' + (i + 1) + '/' + b.items.length;
          const u = await driveImg(b.items[i].id); if (!u) continue;
          const buf = Uint8Array.from(atob(u.split(',')[1]), (c) => c.charCodeAt(0));
          const dim = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([4, 3]); im.src = u; });
          const w = 520, h = Math.round(w * dim[1] / dim[0]);
          kids.push(P([new ImageRun({ data: buf, transformation: { width: w, height: Math.min(h, 640) } })], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }), P([run(b.items[i].cap, { size: 20, italics: true })], { alignment: AlignmentType.CENTER, spacing: { after: 240 } }));
        }
      }
      const doc = new Document({
        creator: 'SIM Wisuda', title: 'LPJ ' + ((App.boot.kegiatan || {}).Nama || 'Wisuda'),
        numbering: { config: [{ reference: 'huruf', levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }, { reference: 'angka', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
        sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1701, bottom: 1701, left: 2268, right: 1701 } } }, children: kids }]
      });
      unduh(await Packer.toBlob(doc), 'LPJ ' + ((App.boot.kegiatan || {}).Nama || 'Wisuda') + '.docx');
      toast('DOCX siap — buka dengan Microsoft Word / Google Docs.', 'ok');
    } catch (e) { toast('Gagal menyusun DOCX: ' + e.message, 'err'); }
    btn.disabled = false; btn.innerHTML = ic('description') + 'Unduh DOCX';
  }

  /* ============================================================ EVALUASI FEEDBACK */
  async function evaluasi() {
    aksi.innerHTML = ''; body.innerHTML = UI.skeleton(8);
    const fl = await SW.SWR.get('kuis.list', {}, { maxAge: 60000 });
    const forms = fl.success ? (fl.data || []) : [];
    if (!forms.length) { body.innerHTML = '<div class="card">' + kosong('Belum ada kuisioner', 'Buat formulir evaluasi di menu Kuisioner.', 'quiz', '<a class="btn primary" href="#/kuisioner">Buka Kuisioner</a>') + '</div>'; return; }
    if (!formId || !forms.some((f) => f.FormID === formId)) formId = (forms.find((f) => f.Status !== 'Draft') || forms[0]).FormID;
    aksi.innerHTML = '<select class="inp sm" data-form style="max-width:260px">' + forms.map((f) => '<option value="' + f.FormID + '"' + (f.FormID === formId ? ' selected' : '') + '>' + esc(f.Judul) + '</option>').join('') + '</select><button class="btn sm" data-xls>' + ic('table_view') + 'Excel</button><button class="btn sm primary" data-print>' + ic('print') + 'Cetak / PDF</button>';
    const r = await API.read('kuis.hasil', { FormID: formId });
    if (!r.success || !r.data) { body.innerHTML = '<div class="card">' + kosong('Belum ada hasil', r.message || '', 'query_stats') + '</div>'; return; }
    const H = r.data, sk = H.hasil.filter((h) => h.rata != null), teks = H.hasil.filter((h) => h.komentar && h.komentar.length);
    const KL = { WISUDAWAN: 'Wisudawan', ACARA: 'Panitia Acara', PEGAWAI: 'Panitia Pegawai', TAMU: 'Tamu' }, kel = Object.keys(H.sasaran || {}).length ? Object.keys(H.sasaran) : Object.keys(H.respon || {});
    body.innerHTML = '<div class="paper" style="font-family:Outfit,sans-serif;max-width:1000px"><h1>LAPORAN EVALUASI FEEDBACK</h1><p style="text-align:center;margin:0">' + esc(H.form.Judul) + ' · ' + esc((App.boot.kegiatan || {}).Nama || '') + '</p>' +
      '<div class="grid g4 mt">' + [['Total respon', angka(H.totalRespon)], ['Rata-rata', H.rataTotal != null ? String(H.rataTotal).replace('.', ',') + ' / 10' : '-'], ['Aspek terbaik', (H.terbaik || [])[0] || '-'], ['Perlu perbaikan', (H.terendah || [])[0] || '-']].map((x) => '<div class="card flat" style="padding:12px"><div class="small muted">' + x[0] + '</div><div style="font-size:20px;font-weight:700">' + esc(x[1]) + '</div></div>').join('') + '</div>' +
      '<h2>1. Partisipasi Responden</h2><table><thead><tr><th>Kelompok</th><th>Sasaran</th><th>Mengisi</th><th>%</th></tr></thead><tbody>' + kel.map((k) => { const s = (H.sasaran || {})[k] || 0, n = (H.respon || {})[k] || 0; return '<tr><td>' + esc(KL[k] || k) + '</td><td>' + angka(s) + '</td><td>' + angka(n) + '</td><td>' + (s ? Math.round(n / s * 100) + '%' : '-') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>2. Nilai Rata-rata per Aspek (skala 10)</h2><div data-hb></div>' +
      (kel.length > 1 ? '<h2>3. Perbandingan antar Kelompok</h2><div data-col></div>' : '') +
      '<h2>' + (kel.length > 1 ? 4 : 3) + '. Tabel Analisis</h2><table><thead><tr><th>No</th><th>Aspek / Pertanyaan</th><th>n</th><th>Rata-rata</th>' + kel.map((k) => '<th>' + esc(KL[k] || k) + '</th>').join('') + '</tr></thead><tbody>' + sk.map((h, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(h.Aspek || '') + '</b><div class="small">' + esc(h.Pertanyaan) + '</div></td><td>' + h.n + '</td><td><b>' + String(h.rata).replace('.', ',') + '</b></td>' + kel.map((k) => '<td>' + (h.perKelompok[k] != null ? String(h.perKelompok[k]).replace('.', ',') : '-') + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
      (teks.length ? '<h2>' + (kel.length > 1 ? 5 : 4) + '. Saran & Komentar</h2>' + teks.map((h) => '<h3>' + esc(h.Pertanyaan) + '</h3><ul>' + h.komentar.slice(0, 80).map((c) => '<li>' + esc(c.isi || c) + (c.oleh ? ' <i class="small">(' + esc(KL[c.oleh] || c.oleh) + ')</i>' : '') + '</li>').join('') + '</ul>').join('') : '') + '</div>';
    UI.hbars(body.querySelector('[data-hb]'), sk.map((h) => ({ label: h.Aspek || h.Pertanyaan, value: h.rata, max: 10, text: String(h.rata).replace('.', ','), color: h.rata >= 8 ? '#2E9466' : h.rata >= 7 ? '#2F86C2' : '#E8502E' })));
    const col = body.querySelector('[data-col]');
    if (col) UI.columns(col, { labels: sk.map((h) => h.Aspek || h.Pertanyaan), series: kel.map((k, j) => ({ name: KL[k] || k, values: sk.map((h) => h.perKelompok[k] || 0), color: UI.PAL[j] })), fmt: (v) => String(Math.round(v * 10) / 10).replace('.', ',') });
    aksi.querySelector('[data-xls]').onclick = () => eksporXLSX({ 'Analisis': sk.map((h, i) => Object.assign({ No: i + 1, Aspek: h.Aspek, Pertanyaan: h.Pertanyaan, n: h.n, RataRata: h.rata }, ...kel.map((k) => ({ [KL[k] || k]: h.perKelompok[k] })))), 'Komentar': teks.flatMap((h) => h.komentar.map((c) => ({ Pertanyaan: h.Pertanyaan, Komentar: c.isi || c, Kelompok: KL[c.oleh] || c.oleh || '' }))) }, 'Evaluasi ' + H.form.Judul);
  }

  /* ============================================================ DATA APLIKASI */
  const JD = [['wisudawan', 'Wisudawan', 'school'], ['tamu', 'Tamu', 'groups'], ['panitia', 'Panitia', 'badge'], ['keuangan', 'Keuangan', 'payments'], ['checklist', 'Checklist', 'checklist']];
  let jd = 'wisudawan';
  async function dataApp() {
    aksi.innerHTML = '<button class="btn sm" data-allxls>' + ic('download') + 'Semua (1 Excel)</button><a class="btn sm" href="#/rekapscan">' + ic('qr_code_scanner') + 'Rekap Scan</a>';
    body.innerHTML = '<div class="seg mb" data-jd>' + JD.map((j) => '<button data-v="' + j[0] + '" class="' + (j[0] === jd ? 'on' : '') + '">' + ic(j[2]) + j[1] + '</button>').join('') + '</div><div data-tb>' + UI.skeleton(8) + '</div>';
    const r = await API.read('laporan.data', { jenis: jd });
    const el = body.querySelector('[data-tb]');
    if (!r.success) { el.innerHTML = '<div class="card">' + kosong('Gagal', esc(r.message), 'error') + '</div>'; return; }
    const rows = r.data || [], cols = rows.length ? Object.keys(rows[0]).map((k) => ({ k, label: k, render: (x) => /^(RAB|Realisasi|Sisa|Harga)$/.test(k) ? rupiah(x[k]) : esc(x[k] == null ? '' : x[k]), cls: /^(RAB|Realisasi|Sisa|Harga|Qty|Pcs|IPK)$/.test(k) ? 'num' : '' })) : [{ k: 'x', label: '-' }];
    const t = UI.table(el, { cols, compact: true, pageSize: 50, tools: '<button class="btn sm" data-xls>' + ic('table_view') + 'Excel</button>', key: '_i' });
    t.set(rows.map((x, i) => Object.assign({ _i: i }, x)));
    el.querySelector('[data-xls]').onclick = () => eksporXLSX({ [JD.find((j) => j[0] === jd)[1]]: rows }, 'Data ' + JD.find((j) => j[0] === jd)[1] + ' ' + ((App.boot.kegiatan || {}).Nama || ''));
  }
  async function semuaExcel() {
    const out = {};
    for (const j of JD) { const r = await API.read('laporan.data', { jenis: j[0] }); if (r.success) out[j[1]] = r.data.length ? r.data : [{ Keterangan: 'Tidak ada data' }]; }
    eksporXLSX(out, 'Laporan Data ' + ((App.boot.kegiatan || {}).Nama || 'Wisuda'));
  }

  /* ============================================================ navigasi & event */
  function buka() {
    view.querySelectorAll('[data-t] button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    history.replaceState(null, '', '#/laporan?tab=' + tab);
    if (tab === 'lpj') lpj(); else if (tab === 'evaluasi') evaluasi(); else dataApp();
  }
  view.querySelector('[data-t]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { tab = b.dataset.v; buka(); } });
  view.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'); if (ed && tab === 'lpj') return sunting(ed.dataset.edit);
    const b = e.target.closest('button'); if (!b) return;
    if (b.matches('[data-print]')) { document.body.classList.add('cetak'); setTimeout(() => { window.print(); document.body.classList.remove('cetak'); }, 50); }
    if (b.matches('[data-docx]')) docxLPJ();
    if (b.matches('[data-ref]')) lpj(true);
    if (b.matches('[data-allxls]')) semuaExcel();
    const j = b.closest('[data-jd] button'); if (j) { jd = j.dataset.v; dataApp(); }
  });
  view.addEventListener('change', (e) => { if (e.target.matches('[data-form]')) { formId = e.target.value; tab === 'lpj' ? lpj(true) : evaluasi(); } });
  buka();
});

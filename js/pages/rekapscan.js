/* Rekap Scan — laporan Kehadiran, Snack, Makanan, Foto (siapa sudah / belum) + unduh PDF/Excel */
App.page('rekapscan', async function (view) {
  const { esc, API, SWR, Sesi, lib, eksporXLSX, tglID, angka, toast, konfirmasi } = SW, { ic, pill, table, hbars, PAL } = UI;
  if (App.perluKegiatan(view)) return;
  const J = [['HADIR', 'Rekap Kehadiran'], ['SNACK', 'Pengambilan Snack'], ['MAKAN', 'Pengambilan Makanan'], ['FOTO', 'Foto Wisudawan & Keluarga']];
  let jenis = 'HADIR', D = null;
  view.innerHTML = App.head('Rekap Scan QR', 'Laporan otomatis dari pemindaian QR di hari-H.', '<button class="btn" data-xls>' + ic('table_view') + 'Excel</button><button class="btn primary" data-pdf>' + ic('picture_as_pdf') + 'Generate PDF</button>') +
    '<div class="tabs" data-tabs>' + J.map((j) => '<button data-j="' + j[0] + '">' + j[1] + '</button>').join('') + '</div><div class="grid g-1-2"><div class="col"><div class="card yellow" data-sum></div><div class="card" data-kat></div></div><div data-tbl></div></div>';
  const tbl = table(view.querySelector('[data-tbl]'), { key: 'nama', cols: [{ k: 'nama', label: 'Nama', render: (r) => '<b>' + esc(r.nama) + '</b><div class="small muted">' + esc(r.sub || '') + '</div>' }, { k: 'kategori', label: 'Kategori', render: (r) => pill(r.kategori, 'mute') }, { k: 'status', label: 'Status', render: (r) => pill(r.status, r.status === 'Sudah' ? 'ok' : 'warn') }, { k: 'waktu', label: 'Waktu', render: (r) => r.waktu ? esc(SW.jamID(r.waktu)) : '—' }, { k: 'petugas', label: 'Petugas' }],
    filters: [['', 'Semua'], ['Sudah', 'Sudah'], ['Belum', 'Belum']], filterFn: (r, f) => r.status === f, pageSize: 40, searchKeys: ['nama', 'sub', 'kategori'] });
  async function muat() {
    view.querySelectorAll('[data-j]').forEach((b) => b.classList.toggle('on', b.dataset.j === jenis));
    await SWR.load('scan.report', { jenis }, (d) => {
      if (!d) return; D = d; tbl.set(d.rows);
      const tot = d.rows.length, sudah = d.rows.filter((r) => r.status === 'Sudah').length;
      view.querySelector('[data-sum]').innerHTML = '<div class="small b" style="letter-spacing:.1em">' + esc(d.judul.toUpperCase()) + '</div><div style="font-size:40px;font-weight:700" class="num">' + sudah + '<span style="font-size:18px;font-weight:500"> / ' + tot + '</span></div><div class="bar"><i style="width:' + (tot ? sudah / tot * 100 : 0) + '%"></i></div><div class="small" style="margin-top:8px">' + (tot ? Math.round(sudah / tot * 1000) / 10 : 0) + '% · diperbarui ' + esc(SW.jamID(d.dibuat)) + '</div>';
      hbars(view.querySelector('[data-kat]'), Object.keys(d.rekap).map((k, i) => ({ label: k, value: d.rekap[k].sudah, max: d.rekap[k].total, text: d.rekap[k].sudah + ' / ' + d.rekap[k].total, color: PAL[i % 5] })));
    }, { maxAge: 10000 });
  }
  view.querySelector('[data-tabs]').addEventListener('click', (e) => { const b = e.target.closest('[data-j]'); if (b) { jenis = b.dataset.j; muat(); } });
  view.querySelector('[data-xls]').onclick = () => D && eksporXLSX({ Rekap: Object.keys(D.rekap).map((k) => ({ Kategori: k, Total: D.rekap[k].total, Sudah: D.rekap[k].sudah, Belum: D.rekap[k].total - D.rekap[k].sudah })), Detail: D.rows.map((r) => ({ Nama: r.nama, Keterangan: r.sub, Kategori: r.kategori, Status: r.status, Waktu: r.waktu ? SW.tglID(r.waktu, true) : '', Petugas: r.petugas, Jumlah: r.jumlah })) }, D.judul + ' ' + new Date().toISOString().slice(0, 10));
  view.querySelector('[data-pdf]').onclick = async () => {
    if (!D) return; const { jsPDF } = await lib('jspdf'); const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const keg = App.boot.kegiatan || {}; let y = 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(D.judul.toUpperCase(), 105, y, { align: 'center' }); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text((keg.Nama || '') + ' · dibuat ' + tglID(D.dibuat, true), 105, y, { align: 'center' }); y += 9;
    doc.setFont('helvetica', 'bold'); doc.text('Rekap per kategori', 14, y); y += 5; doc.setFont('helvetica', 'normal');
    Object.keys(D.rekap).forEach((k) => { const x = D.rekap[k]; doc.text(k + ': ' + x.sudah + ' / ' + x.total + ' (' + (x.total ? Math.round(x.sudah / x.total * 100) : 0) + '%)', 18, y); y += 5; });
    y += 3; const kol = [14, 22, 92, 128, 150, 172]; const hdr = ['No', 'Nama', 'Kategori', 'Status', 'Waktu', 'Petugas'];
    const head = () => { doc.setFillColor(238, 238, 238); doc.rect(12, y - 4, 186, 6, 'F'); doc.setFont('helvetica', 'bold'); hdr.forEach((h, i) => doc.text(h, kol[i], y)); doc.setFont('helvetica', 'normal'); y += 6; };
    head();
    D.rows.forEach((r, i) => { if (y > 285) { doc.addPage(); y = 16; head(); } doc.text(String(i + 1), kol[0], y); doc.text(doc.splitTextToSize(r.nama, 66)[0], kol[1], y); doc.text(String(r.kategori).slice(0, 18), kol[2], y); doc.text(r.status, kol[3], y); doc.text(r.waktu ? SW.jamID(r.waktu) : '-', kol[4], y); doc.text(String(r.petugas || '').slice(0, 16), kol[5], y); y += 5.5; });
    doc.save(D.judul + '.pdf');
  };
  muat();
});

/* ==========================================================================
   DocGen — mesin template Studio Dokumen (Label, ID Card, Undangan, Sertifikat, Slide PPT).
   Latar = PNG desain panitia (Canva/CorelDRAW) atau desain bawaan; isi = data + nomor + QR.
   Semua digambar ke <canvas> (huruf Arab tersusun benar oleh browser), lalu dikemas ke PDF/PNG.
   Slide PPT: latar sebagai gambar + kotak teks asli PowerPoint (tetap bisa diedit).
   Posisi kolom dalam % kanvas; ukuran huruf dalam % tinggi kanvas.
   ========================================================================== */
(function (W) {
  'use strict';
  const UK = { LABEL: [70, 35], IDCARD: [54, 86], UNDANGAN: [148, 210], SERTIFIKAT: [297, 210], SLIDE: [338.67, 190.5] };
  const KUNCI = {
    LABEL: [['nama', 'Nama'], ['sub', 'Keterangan'], ['kode', 'Kode kursi'], ['kategori', 'Kategori']],
    IDCARD: [['nama', 'Nama'], ['jabatan', 'Jabatan'], ['divisi', 'Divisi'], ['peran', 'Peran'], ['nomor', 'Nomor'], ['qr', 'QR Code'], ['foto', 'Foto'], ['acara', 'Nama acara'], ['singkat', 'Institusi']],
    SERTIFIKAT: [['nama', 'Nama'], ['jabatan', 'Jabatan'], ['divisi', 'Divisi'], ['nomor', 'Nomor sertifikat'], ['acara', 'Nama acara'], ['hari_tanggal', 'Tanggal'], ['institusi', 'Institusi'], ['ttd1_nama', 'Penandatangan 1'], ['ttd1_jabatan', 'Jabatan TTD 1'], ['ttd2_nama', 'Penandatangan 2'], ['ttd2_jabatan', 'Jabatan TTD 2'], ['qr', 'QR verifikasi']],
    UNDANGAN: [['nama', 'Nama tamu'], ['nama_arab', 'Nama (Arab)'], ['jabatan', 'Jabatan'], ['kategori', 'Kategori'], ['kursi', 'Kursi'], ['qr', 'QR Code'], ['acara', 'Nama acara'], ['hari_tanggal', 'Hari, tanggal'], ['jam', 'Jam'], ['lokasi', 'Lokasi'], ['institusi', 'Institusi']],
    SLIDE: [['nama', 'Nama'], ['nama_arab', 'Nama (Arab)'], ['prodi', 'Prodi'], ['predikat', 'Predikat'], ['ipk', 'IPK'], ['ayah', 'Ayah'], ['ibu', 'Ibu'], ['asal', 'Asal / Provinsi'], ['foto', 'Foto'], ['judul', 'Judul slide'], ['subjudul', 'Subjudul'], ['no', 'Nomor urut']]
  };
  const f = (key, x, y, w, h, size, o) => Object.assign({ key, x, y, w, h, size, color: '#1F1F1F', bold: false, align: 'center', font: 'sans' }, o || {});
  const BAWAAN = {
    LABEL: [f('kode', 6, 8, 40, 16, 13, { align: 'left', bold: true, color: '#B52603' }), f('kategori', 54, 8, 40, 14, 10, { align: 'right', color: '#6B6B6B' }), f('nama', 6, 30, 88, 38, 17, { bold: true }), f('sub', 6, 72, 88, 18, 9.5, { color: '#444' })],
    IDCARD: [f('singkat', 6, 4, 88, 6, 3.6, { bold: true, color: '#FFD35C' }), f('acara', 6, 10, 88, 6, 2.8, { color: '#FFFFFF' }), f('foto', 27, 21, 46, 29, 0, { shape: 'photo' }), f('nama', 6, 53, 88, 9, 4.4, { bold: true }), f('jabatan', 6, 62, 88, 6, 3, { color: '#444' }), f('divisi', 15, 68.5, 70, 5, 2.6, { bold: true, color: '#1F1F1F', bg: '#FFD35C' }), f('qr', 33, 76, 34, 21, 0, { shape: 'qr' }), f('nomor', 6, 96.2, 88, 3, 1.9, { color: '#6B6B6B' })],
    SERTIFIKAT: [f('static', 10, 12, 80, 9, 7.5, { bold: true, text: 'SERTIFIKAT', font: 'serif', color: '#B52603' }), f('nomor', 20, 22, 60, 4, 2.4, { color: '#444' }), f('static', 20, 30, 60, 4, 2.8, { text: 'diberikan kepada' }), f('nama', 10, 36, 80, 9, 6.4, { bold: true, font: 'serif' }), f('static', 12, 48, 76, 10, 2.8, { text: 'atas partisipasi dan pengabdiannya sebagai {{jabatan}} ({{divisi}}) pada {{acara}} {{institusi}}, {{hari_tanggal}}.' }), f('ttd1_jabatan', 10, 66, 32, 4, 2.4), f('ttd1_nama', 10, 82, 32, 4, 2.6, { bold: true }), f('ttd2_jabatan', 58, 66, 32, 4, 2.4), f('ttd2_nama', 58, 82, 32, 4, 2.6, { bold: true }), f('qr', 45, 68, 10, 14, 0, { shape: 'qr' })],
    UNDANGAN: [f('static', 8, 6, 84, 4, 2.6, { text: '{{institusi}}', color: '#FFD35C', bold: true }), f('static', 8, 12, 84, 7, 5.6, { text: 'UNDANGAN', color: '#FFFFFF', bold: true, font: 'serif' }), f('static', 8, 20, 84, 4, 2.4, { text: 'Dengan hormat kami mengundang', color: '#E5E1D8' }), f('nama', 8, 25, 84, 7, 4.2, { bold: true, color: '#FFFFFF' }), f('nama_arab', 8, 32, 84, 5, 3.2, { color: '#FFD35C', font: 'arab' }), f('jabatan', 8, 37.5, 84, 5, 2.4, { color: '#E5E1D8' }), f('acara', 8, 45, 84, 6, 3.2, { bold: true, color: '#1F1F1F', bg: '#FFD35C' }), f('hari_tanggal', 8, 53, 84, 4, 2.6, { color: '#FFFFFF' }), f('jam', 8, 57.5, 84, 4, 2.6, { color: '#FFFFFF' }), f('lokasi', 8, 62, 84, 4, 2.4, { color: '#FFFFFF' }), f('qr', 33, 69, 34, 24, 0, { shape: 'qr' }), f('kursi', 8, 94, 84, 3.5, 2.2, { color: '#FFD35C', bold: true })],
    SLIDE: [f('judul', 30, 9, 66, 8, 6.2, { bold: true, color: '#FFFFFF', align: 'right' }), f('subjudul', 30, 18, 66, 5, 3.4, { color: '#FFD35C', align: 'right' }), f('prodi', 40, 24, 56, 5, 3.6, { color: '#FFFFFF', align: 'right', bold: true }), f('predikat', 44, 33, 52, 8, 5.2, { color: '#1F1F1F', bg: '#FFD35C', bold: true, align: 'center' }), f('foto', 5, 18, 30, 66, 0, { shape: 'photo', radius: 6 }),
      f('static', 44, 52, 14, 5, 3.2, { text: 'NAMA', color: '#FFFFFF', align: 'left', bold: true }), f('nama', 58, 52, 38, 5, 3.4, { color: '#FFFFFF', align: 'left', bold: true }), f('static', 44, 60, 14, 5, 3.2, { text: 'IBU', color: '#FFFFFF', align: 'left', bold: true }), f('ibu', 58, 60, 38, 5, 3.2, { color: '#FFFFFF', align: 'left' }),
      f('static', 44, 68, 14, 5, 3.2, { text: 'AYAH', color: '#FFFFFF', align: 'left', bold: true }), f('ayah', 58, 68, 38, 5, 3.2, { color: '#FFFFFF', align: 'left' }), f('static', 44, 76, 14, 5, 3.2, { text: 'ASAL', color: '#FFFFFF', align: 'left', bold: true }), f('asal', 58, 76, 38, 5, 3.2, { color: '#FFFFFF', align: 'left' }), f('nama_arab', 44, 86, 52, 6, 3.6, { color: '#FFD35C', font: 'arab', align: 'right' })]
  };
  const ZONA_W = { VVIP: '#C9B3F5', VIP: '#FFD35C', DOSEN: '#FFD35C', WISUDAWAN: '#BFE3FA', WISUDAWATI: '#BFE3FA', PENDAMPING: '#BDEBD0', UMUM: '#E5E1D8', SENAT: '#1F1F1F', PANITIA: '#E5E1D8' };

  /** Latar bawaan bila belum ada PNG desain. */
  function latarBawaan(g, jenis, w, h, data) {
    const u = Math.min(w, h) / 100;
    if (jenis === 'LABEL') { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.fillStyle = ZONA_W[data && data.zona] || '#FFD35C'; g.fillRect(0, 0, w * 0.035, h); g.strokeStyle = '#1F1F1F'; g.lineWidth = u * 0.8; g.strokeRect(u * 0.4, u * 0.4, w - u * 0.8, h - u * 0.8); return; }
    if (jenis === 'IDCARD') { g.fillStyle = '#F7F5EF'; g.fillRect(0, 0, w, h); g.fillStyle = '#1F1F1F'; g.fillRect(0, 0, w, h * 0.18); g.fillStyle = '#FF5A36'; g.fillRect(0, h * 0.18, w, h * 0.012); g.fillStyle = '#FFD35C'; g.beginPath(); g.arc(w * 0.5, h * 0.355, w * 0.27, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1F1F1F'; g.fillRect(0, h * 0.985, w, h * 0.015); return; }
    if (jenis === 'SERTIFIKAT') { g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1F1F1F'; g.lineWidth = u * 1.6; g.strokeRect(u * 3, u * 3, w - u * 6, h - u * 6); g.strokeStyle = '#FF5A36'; g.lineWidth = u * 0.6; g.strokeRect(u * 5, u * 5, w - u * 10, h - u * 10); g.fillStyle = '#FFD35C'; g.beginPath(); g.arc(w, h, h * 0.32, 0, Math.PI * 2); g.fill(); g.fillStyle = '#C9B3F5'; g.beginPath(); g.arc(0, 0, h * 0.26, 0, Math.PI * 2); g.fill(); return; }
    if (jenis === 'UNDANGAN') { g.fillStyle = '#1F1F1F'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w * 0.85, 0, 0, w * 0.85, 0, w); gr.addColorStop(0, 'rgba(255,90,54,.45)'); gr.addColorStop(1, 'rgba(255,90,54,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#FFD35C'; g.lineWidth = u * 0.5; g.strokeRect(u * 3, u * 3, w - u * 6, h - u * 6); g.fillStyle = '#FFFFFF'; g.fillRect(w * 0.31, h * 0.685, w * 0.38, h * 0.26); return; }
    if (jenis === 'SLIDE') { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2A1F1B'); gr.addColorStop(1, '#1F1F1F'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#FF5A36'; g.fillRect(0, h * 0.94, w, h * 0.06); g.fillStyle = 'rgba(255,211,92,.12)'; g.beginPath(); g.arc(w * 0.2, h * 0.5, h * 0.55, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#FFD35C'; g.lineWidth = u * 0.6; g.strokeRect(w * 0.045, h * 0.17, w * 0.31, h * 0.69); return; }
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  }
  const FONT = { sans: "'Outfit', Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", arab: "'Noto Naskh Arabic', 'Amiri', serif" };
  const isi = (fd, data) => fd.key === 'static' ? String(fd.text || '').replace(/\{\{(\w+)\}\}/g, (m, k) => data[k] == null ? '' : String(data[k])) : (data[fd.key] == null ? '' : String(data[fd.key]));
  function teksKotak(g, txt, fd, x, y, w, h, H) {
    if (!txt) return;
    let size = Math.max(4, fd.size / 100 * H);
    const rtl = fd.font === 'arab' || /[؀-ۿ]/.test(txt);
    const fam = rtl ? FONT.arab : (FONT[fd.font] || FONT.sans);
    if (fd.bg) { g.fillStyle = fd.bg; const r = Math.min(h / 2, size * 0.6); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
    g.fillStyle = fd.color || '#1F1F1F'; g.textBaseline = 'middle'; g.direction = rtl ? 'rtl' : 'ltr';
    // bungkus baris & perkecil otomatis agar muat
    let lines;
    for (let iter = 0; iter < 12; iter++) {
      g.font = (fd.bold ? '700 ' : '400 ') + size + 'px ' + fam;
      const kata = txt.split(/\s+/); lines = ['']; kata.forEach((k) => { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + k : k; if (g.measureText(t).width > w * 0.96 && lines[lines.length - 1]) lines.push(k); else lines[lines.length - 1] = t; });
      if (lines.length * size * 1.18 <= h * 1.05 && lines.every((l) => g.measureText(l).width <= w * 0.98)) break;
      size *= 0.9;
    }
    const al = fd.align || 'center'; g.textAlign = al === 'left' ? (rtl ? 'right' : 'left') : al === 'right' ? (rtl ? 'left' : 'right') : 'center';
    const tx = al === 'left' ? x + w * 0.02 : al === 'right' ? x + w * 0.98 : x + w / 2;
    const lh = size * 1.18, y0 = y + h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, tx, y0 + i * lh));
    g.direction = 'ltr';
  }
  const imgCache = {};
  function muatGambar(src) { if (!src) return Promise.resolve(null); if (imgCache[src]) return imgCache[src]; return (imgCache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; })); }
  function gambarCover(g, img, x, y, w, h, r) {
    const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r || 0); else g.rect(x, y, w, h); g.clip(); g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore();
  }
  /**
   * Gambar satu dokumen. tpl = {Jenis, LebarMM, TinggiMM, bgUrl, fields}; data = objek nilai; opt.pxPerMm.
   * Mengembalikan canvas. opt.tanpaTeks: hanya latar + foto (untuk slide PPTX).
   */
  async function gambar(tpl, data, opt) {
    opt = opt || {};
    const jenis = tpl.Jenis, mmW = Number(tpl.LebarMM) || UK[jenis][0], mmH = Number(tpl.TinggiMM) || UK[jenis][1];
    const ppm = opt.pxPerMm || 6, w = Math.round(mmW * ppm), h = Math.round(mmH * ppm);
    const c = opt.canvas || document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h);
    const bg = tpl.bgUrl ? await muatGambar(tpl.bgUrl) : null;
    if (bg) g.drawImage(bg, 0, 0, w, h); else latarBawaan(g, jenis, w, h, data);
    for (const fd of (tpl.fields || [])) {
      const x = fd.x / 100 * w, y = fd.y / 100 * h, fw = fd.w / 100 * w, fh = fd.h / 100 * h;
      if (fd.shape === 'qr') { if (opt.tanpaTeks) continue; const v = data.qr || data[fd.key]; if (!v) continue; const q = await muatGambar(await SW.qrDataUrl(v, 600)); if (q) { const s = Math.min(fw, fh); g.fillStyle = '#fff'; g.fillRect(x + (fw - s) / 2, y + (fh - s) / 2, s, s); g.drawImage(q, x + (fw - s) / 2, y + (fh - s) / 2, s, s); } continue; }
      if (fd.shape === 'photo') { const im = data.fotoUrl ? await muatGambar(data.fotoUrl) : null; if (im) gambarCover(g, im, x, y, fw, fh, (fd.radius || 4) / 100 * Math.min(w, h)); else if (!opt.tanpaTeks) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x, y, fw, fh); g.fillStyle = '#888'; g.font = (fh * 0.12) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FOTO', x + fw / 2, y + fh / 2); } continue; }
      if (opt.tanpaTeks) continue;
      teksKotak(g, isi(fd, data), fd, x, y, fw, fh, h);
    }
    return c;
  }
  /** PDF: lembar label A4 (kolom × baris), atau satu dokumen per halaman. */
  async function pdf(tpl, rows, opt, onProg) {
    opt = opt || {};
    const { jsPDF } = await SW.lib('jspdf');
    const jenis = tpl.Jenis, mmW = Number(tpl.LebarMM) || UK[jenis][0], mmH = Number(tpl.TinggiMM) || UK[jenis][1];
    let doc;
    const c = document.createElement('canvas');
    if (jenis === 'LABEL' || jenis === 'IDCARD') {
      // tata letak lembar A4
      const kol = opt.kolom || (jenis === 'LABEL' ? 3 : 3), bar = opt.baris || (jenis === 'LABEL' ? 8 : 3);
      const gx = opt.gapX || 0, gy = opt.gapY || 0;
      const ml = opt.marginKiri != null ? opt.marginKiri : (210 - kol * mmW - (kol - 1) * gx) / 2, mt = opt.marginAtas != null ? opt.marginAtas : (297 - bar * mmH - (bar - 1) * gy) / 2;
      doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const per = kol * bar;
      for (let i = 0; i < rows.length; i++) {
        if (i && i % per === 0) doc.addPage();
        const p = i % per, cx = p % kol, cy = Math.floor(p / kol);
        const x = ml + cx * (mmW + gx) + (opt.offsetX || 0), y = mt + cy * (mmH + gy) + (opt.offsetY || 0);
        await gambar(tpl, rows[i], { pxPerMm: jenis === 'LABEL' ? 11.8 : 11.8, canvas: c });
        doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, mmW, mmH, undefined, 'FAST');
        if (opt.garisPotong) { doc.setDrawColor(190); doc.setLineWidth(0.1); doc.rect(x, y, mmW, mmH); }
        if (onProg) onProg(i + 1, rows.length);
      }
    } else {
      doc = new jsPDF({ unit: 'mm', format: [mmW, mmH], orientation: mmW > mmH ? 'landscape' : 'portrait' });
      for (let i = 0; i < rows.length; i++) {
        if (i) doc.addPage([mmW, mmH], mmW > mmH ? 'landscape' : 'portrait');
        await gambar(tpl, rows[i], { pxPerMm: jenis === 'SERTIFIKAT' ? 6 : 7, canvas: c });
        doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, mmW, mmH, undefined, 'FAST');
        if (onProg) onProg(i + 1, rows.length);
      }
    }
    return doc;
  }
  /** Halaman uji cetak label: kotak ukuran label + penggaris. */
  async function ujiCetak(opt) {
    const { jsPDF } = await SW.lib('jspdf'); const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const kol = opt.kolom || 3, bar = opt.baris || 8, w = opt.w || 70, h = opt.h || 35, gx = opt.gapX || 0, gy = opt.gapY || 0;
    const ml = opt.marginKiri != null ? opt.marginKiri : (210 - kol * w - (kol - 1) * gx) / 2, mt = opt.marginAtas != null ? opt.marginAtas : (297 - bar * h - (bar - 1) * gy) / 2;
    doc.setDrawColor(255, 90, 54); doc.setLineWidth(0.2); doc.setFontSize(7);
    for (let r = 0; r < bar; r++) for (let k = 0; k < kol; k++) { const x = ml + k * (w + gx) + (opt.offsetX || 0), y = mt + r * (h + gy) + (opt.offsetY || 0); doc.rect(x, y, w, h); doc.text(w + '×' + h + ' mm', x + w / 2, y + h / 2, { align: 'center' }); }
    doc.setTextColor(120); doc.text('UJI CETAK — cetak skala 100% (Actual size), tempel di atas lembar label untuk mengecek posisi.', 105, 4, { align: 'center' });
    return doc;
  }
  /** PPTX slide wisudawan: latar (gambar) + kotak teks asli + foto. */
  async function pptx(tpl, rows, onProg) {
    const P = await SW.lib('pptx'); const pres = new P(); pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
    const Wi = 13.333, Hi = 7.5, c = document.createElement('canvas');
    for (let i = 0; i < rows.length; i++) {
      const d = rows[i], s = pres.addSlide();
      await gambar(tpl, d, { pxPerMm: 5.5, canvas: c, tanpaTeks: true });
      s.background = { data: c.toDataURL('image/jpeg', 0.88) };
      (tpl.fields || []).forEach((fd) => {
        if (fd.shape) return;
        const txt = isi(fd, d); if (!txt) return;
        const o = { x: fd.x / 100 * Wi, y: fd.y / 100 * Hi, w: fd.w / 100 * Wi, h: fd.h / 100 * Hi, fontSize: Math.max(8, Math.round(fd.size / 100 * Hi * 72 * 0.92)), bold: !!fd.bold, color: String(fd.color || '#1F1F1F').replace('#', ''), align: fd.align || 'center', valign: 'middle', fontFace: fd.font === 'arab' ? 'Traditional Arabic' : fd.font === 'serif' ? 'Georgia' : 'Calibri', fit: 'shrink', margin: 2 };
        if (fd.bg) o.fill = { color: String(fd.bg).replace('#', '') };
        if (fd.font === 'arab' || /[؀-ۿ]/.test(txt)) o.rtlMode = true;
        s.addText(txt, o);
      });
      if (onProg) onProg(i + 1, rows.length);
    }
    return pres;
  }
  /** Gabungkan template tersimpan (dari server) menjadi objek siap gambar. */
  async function siapkan(jenis, t, pub) {
    const lay = t && t.LayoutJSON ? (typeof t.LayoutJSON === 'string' ? JSON.parse(t.LayoutJSON || '{}') : t.LayoutJSON) : {};
    const bgUrl = t && t.FilePNG ? await SW.driveImg(t.FilePNG, pub) : '';
    return { Jenis: jenis, LebarMM: (t && t.LebarMM) || UK[jenis][0], TinggiMM: (t && t.TinggiMM) || UK[jenis][1], bgUrl, fields: lay.fields && lay.fields.length ? lay.fields : JSON.parse(JSON.stringify(BAWAAN[jenis])), TemplateID: t ? t.TemplateID : '', Nama: t ? t.Nama : 'Desain bawaan', FilePNG: t ? t.FilePNG : '' };
  }
  W.DocGen = { UK, KUNCI, BAWAAN, gambar, pdf, pptx, ujiCetak, siapkan, isi };
})(window);

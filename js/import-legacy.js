/* ==========================================================================
   Pembaca worksheet lama "Wisuda 20xx Angkatan n.xlsx" (format panitia STIS Al Wafa)
   → baris siap impor untuk tabel Wisudawan, Tamu, Panitia. Dipakai di browser & uji Node.
   Sheet yang dikenali: URUTAN MAJU, DAFTAR TAMU, KEPANITIAAN PEGAWAI, KEPANITIAAN ACARA.
   ========================================================================== */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.ImportLegacy = factory(); })(this, function () {
  'use strict';
  const S = (v) => v == null ? '' : String(v).trim();
  const up = (v) => S(v).toUpperCase();
  function sel(ws, r, c) { const a = ws[XL.utils.encode_cell({ r, c })]; return a ? (a.v instanceof Date ? a.v : a.v) : ''; }
  let XL = null;
  function tgl(v) {
    if (v instanceof Date) { const d = new Date(v.getTime() + 12 * 3600e3); return d.toISOString().slice(0, 10); }
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5) + 12 * 3600e3); return d.toISOString().slice(0, 10); }
    const s = S(v); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : s;
  }
  function range(ws) { return XL.utils.decode_range(ws['!ref'] || 'A1:A1'); }

  function wisudawan(ws) {
    const rg = range(ws), out = [];
    // cari kolom header "NIM" di baris mana pun dalam 5 baris pertama
    let hr = -1; const starts = [];
    for (let r = 0; r <= Math.min(5, rg.e.r) && hr < 0; r++) for (let c = 0; c <= rg.e.c; c++) if (up(sel(ws, r, c)) === 'NIM') { hr = r; starts.push(c); }
    if (hr < 0) return out;
    for (let c = 0; c <= rg.e.c; c++) if (up(sel(ws, hr, c)) === 'NIM' && starts.indexOf(c) < 0) starts.push(c);
    starts.sort((a, b) => a - b);
    let urut = 0;
    starts.forEach((c0) => {
      const H = {}; for (let c = c0 - 1; c <= c0 + 12 && c <= rg.e.c; c++) H[up(sel(ws, hr, c))] = c;
      const col = (n) => H[n];
      for (let r = hr + 1; r <= rg.e.r; r++) {
        const nama = S(sel(ws, r, col('NAMA'))); if (!nama) continue;
        const jk = up(sel(ws, r, col('JENIS KELAMIN')));
        out.push({ NIM: S(sel(ws, r, col('NIM'))), Nama: nama, JK: jk.indexOf('P') === 0 ? 'P' : 'L', TempatLahir: S(sel(ws, r, col('TEMPAT LAHIR'))), TglLahir: tgl(sel(ws, r, col('TANGGAL LAHIR'))),
          Provinsi: S(sel(ws, r, col('PROVINSI'))), Kota: S(sel(ws, r, col('KOTA'))), Kecamatan: S(sel(ws, r, col('KECAMATAN'))), Prodi: S(sel(ws, r, col('PRODI'))),
          Ayah: S(sel(ws, r, col('AYAH'))), Ibu: S(sel(ws, r, col('IBU'))), UrutMaju: ++urut, UrutMasuk: urut, JumlahPendamping: 2 });
      }
    });
    return out;
  }
  function tamu(ws) {
    const rg = range(ws), out = [];
    // header baris dengan "NAMA LENGKAP"; judul kategori 1–3 baris di atasnya
    let hr = -1; for (let r = 0; r <= Math.min(8, rg.e.r) && hr < 0; r++) for (let c = 0; c <= rg.e.c; c++) if (up(sel(ws, r, c)) === 'NAMA LENGKAP') { hr = r; break; }
    if (hr < 0) return out;
    for (let c = 0; c <= rg.e.c; c++) {
      if (up(sel(ws, hr, c)) !== 'NAMA LENGKAP') continue;
      let judul = ''; for (let r = hr - 1; r >= 0 && !judul; r--) for (let cc = c - 1; cc <= c + 2; cc++) { const t = up(sel(ws, r, cc)); if (t) { judul = t; break; } }
      const kat = /VVIP/.test(judul) ? 'VVIP' : /VIP/.test(judul) ? 'VIP' : /DOSEN|PEGAWAI/.test(judul) ? 'DOSEN' : 'UMUM';
      const H = {}; for (let k = c - 1; k <= c + 4; k++) H[up(sel(ws, hr, k))] = k;
      let urut = 0;
      for (let r = hr + 1; r <= rg.e.r; r++) {
        const nama = S(sel(ws, r, c)), jab = S(sel(ws, r, H['JABATAN']));
        if (!nama && !jab) continue;
        out.push({ Kategori: kat, Nama: nama || jab, Jabatan: nama ? jab : '', Instansi: kat === 'VIP' && nama ? jab : '', NoWA: H['NO HP'] != null ? S(sel(ws, r, H['NO HP'])) : '', PJUndang: H['PJ UNDANG'] != null ? S(sel(ws, r, H['PJ UNDANG'])) : '', Urutan: ++urut, Kehormatan: kat === 'VVIP' ? 'YA' : 'TIDAK' });
      }
    }
    return out;
  }
  function panitiaPegawai(ws) {
    const rg = range(ws), out = []; let div = '';
    for (let r = 0; r <= rg.e.r; r++) {
      const a = S(sel(ws, r, 0)); if (a && !/^(DIVISI|PIC|JOBDESK)/i.test(a) && !/PANITIA PEGAWAI/i.test(a)) div = a.replace(/^PIC\s+/i, '');
      else if (/^PIC\s+/i.test(a)) div = a.replace(/^PIC\s+/i, '');
      const nama = S(sel(ws, r, 5)), jab = S(sel(ws, r, 6));
      if (!nama || up(nama) === 'NAMA') continue;
      const J = up(jab);
      out.push({ Nama: nama, Jenis: 'PEGAWAI', Divisi: div, Jabatan: jab, Peran: /^KETUA/.test(J) ? 'KOORDINATOR' : /KOORDINA|KOOR\b/.test(J) ? 'KADIV' : 'PEGAWAI' });
    }
    return out;
  }
  function panitiaAcara(ws) {
    const rg = range(ws), out = []; let div = '';
    for (let r = 0; r <= rg.e.r; r++) {
      const a = S(sel(ws, r, 0)); if (a && up(a) !== 'PIC' && !/TABEL/i.test(a)) div = a;
      const nama = S(sel(ws, r, 6)), tugas = S(sel(ws, r, 7)), g = up(sel(ws, r, 8));
      if (!nama || /NAMA PANITIA|REKOMENDASI/i.test(nama)) continue;
      const T = up(tugas);
      out.push({ Nama: nama, Jenis: 'MAHASISWA', Divisi: div, Jabatan: tugas, Gender: g === 'AKHWAT' ? 'AKHWAT' : g === 'IKHWAN' ? 'IKHWAN' : '', Peran: /^MC$/.test(T) ? 'MC' : /KOOR|KORUM/.test(T) && !/WAKIL/.test(T) ? 'KADIV' : 'ACARA' });
    }
    return out;
  }
  /** wb = hasil XLSX.read; xlsx = pustaka SheetJS. */
  function baca(wb, xlsx) {
    XL = xlsx;
    const cari = (re) => wb.SheetNames.find((n) => re.test(n.toUpperCase()));
    const hasil = { Wisudawan: [], Tamu: [], Panitia: [], dikenali: [] };
    const sU = cari(/URUTAN MAJU/); if (sU) { hasil.Wisudawan = wisudawan(wb.Sheets[sU]); hasil.dikenali.push(sU); }
    const sT = cari(/DAFTAR TAMU/); if (sT) { hasil.Tamu = tamu(wb.Sheets[sT]); hasil.dikenali.push(sT); }
    const sP = cari(/KEPANITIAAN PEGAWAI|PANITIA PEGAWAI/); if (sP) { hasil.Panitia = hasil.Panitia.concat(panitiaPegawai(wb.Sheets[sP])); hasil.dikenali.push(sP); }
    const sA = cari(/KEPANITIAAN ACARA|PANITIA ACARA/); if (sA) { hasil.Panitia = hasil.Panitia.concat(panitiaAcara(wb.Sheets[sA])); hasil.dikenali.push(sA); }
    return hasil;
  }
  /** Lembar templat bersih (satu baris header = nama kolom). */
  function bacaTemplat(wb, xlsx) { const ws = wb.Sheets[wb.SheetNames[0]]; return xlsx.utils.sheet_to_json(ws, { defval: '', raw: false }); }
  return { baca, bacaTemplat };
});

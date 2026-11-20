/* Studio Dokumen — Label kursi, ID Card, Undangan digital, Sertifikat, Slide PPT dari PNG desain panitia */
App.page('studio', async function (view, params) {
  const { esc, API, Sesi, modal, drawer, konfirmasi, toast, debounce, kompresGambar, bacaBase64, unduh, driveImg, Store } = SW, { ic, pill, kosong, dropzone } = UI;
  if (App.perluKegiatan(view)) return;
  await new Promise((res, rej) => { if (window.DocGen) return res(); const s = document.createElement('script'); s.src = 'js/docgen.js?v=' + SW.VERSI; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const DG = window.DocGen;
  const JENIS = [['LABEL', 'Label Kursi', 'label'], ['IDCARD', 'ID Card Panitia', 'badge'], ['UNDANGAN', 'Undangan Digital', 'mail'], ['SERTIFIKAT', 'Sertifikat Panitia', 'workspace_premium'], ['SLIDE', 'Slide PPT Wisudawan', 'slideshow']];
  const kelola = App.boleh('studio', Sesi.is('SUPERADMIN', 'KOORDINATOR', 'PEGAWAI')), fotoSaja = !kelola && Sesi.flag('PANITIA_FOTO');
  let jenis = params.jenis && JENIS.some((j) => j[0] === params.jenis) ? params.jenis : (fotoSaja ? 'SLIDE' : 'LABEL');
  let D = null, T = null, list = [], sel = -1, contoh = 0, labelOpt = Store.get('labelOpt', { kolom: 3, baris: 8, gapX: 0, gapY: 0, offsetX: 0, offsetY: 0, garisPotong: true });
  view.innerHTML = App.head('Studio Dokumen', 'Desain grafis dari Canva / CorelDRAW (PNG) — aplikasi mengisi nama, nomor, foto, dan QR secara otomatis.') +
    '<div class="tabs" data-j>' + JENIS.map((j) => '<button data-v="' + j[0] + '">' + ic(j[2]) + j[1] + '</button>').join('') + '</div><div data-body>' + UI.skeleton(8) + '</div>';
  const body = view.querySelector('[data-body]');

  function dataBaris(r) {
    const v = D.vars || {}, s = D.settings || {}, pj = D.pejabat || [];
    const t1 = pj.find((p) => p.Peran === 'MENGETAHUI') || pj[0] || {}, t2 = pj.find((p) => p.Peran === 'PJ') || pj[1] || {};
    return Object.assign({ acara: v.acara, institusi: v.institusi || s.NAMA_INSTITUSI, singkat: v.singkat || s.NAMA_SINGKAT, hari_tanggal: v.hari_tanggal, jam: v.jam ? 'Pukul ' + v.jam + ' WIB' : '', lokasi: v.lokasi,
      judul: 'WISUDA KE-' + (v.wisuda_ke || '') + ' PROGRAM SARJANA', subjudul: 'WISUDAWAN ' + String(v.institusi || '').toUpperCase(), ttd1_nama: t1.Nama || '', ttd1_jabatan: t1.Jabatan || '', ttd2_nama: t2.Nama || '', ttd2_jabatan: t2.Jabatan || '' },
      r, jenis === 'SLIDE' ? { prodi: r.prodi ? 'PRODI ' + String(r.prodi).toUpperCase() : '', predikat: r.predikat ? 'PREDIKAT | ' + String(r.predikat).toUpperCase() + (r.ipk ? ' · IPK ' + r.ipk : '') : (r.ipk ? 'IPK ' + r.ipk : '') } : {});
  }
  async function muat() {
    view.querySelectorAll('[data-j] button').forEach((b) => b.classList.toggle('on', b.dataset.v === jenis));
    body.innerHTML = UI.skeleton(8);
    const [r1, r2] = await Promise.all([API.read('doc.data', { jenis, draft: true }), API.read('tpl.list', { jenis })]);
    if (!r1.success) { body.innerHTML = '<div class="card">' + kosong('Data belum siap', esc(r1.message), jenis === 'LABEL' ? 'chair' : 'error', jenis === 'LABEL' ? '<a class="btn primary" href="#/denah">Buka Denah</a>' : '') + '</div>'; return; }
    D = r1.data; list = r2.success ? r2.data.templates : [];
    const pakai = list.find((t) => t.Aktif === 'YA') || null;
    T = await DG.siapkan(jenis, pakai);
    render();
  }
  function render() {
    const rows = D.rows || [];
    body.innerHTML = '<div class="studio"><div class="col"><div class="card" style="padding:14px"><div class="row sb"><b>Template</b>' + (kelola ? '<button class="btn xs primary" data-up>' + ic('upload') + 'PNG baru</button>' : '') + '</div><div class="col mt" style="gap:6px">' +
      '<button class="card ' + (!T.TemplateID ? 'yellow' : 'flat') + '" style="padding:10px;text-align:left;cursor:pointer" data-tpl="">' + ic('auto_awesome') + ' Desain bawaan</button>' +
      list.map((t) => '<button class="card ' + (t.TemplateID === T.TemplateID ? 'yellow' : 'flat') + '" style="padding:10px;text-align:left;cursor:pointer" data-tpl="' + t.TemplateID + '"><b class="small">' + esc(t.Nama) + '</b> ' + (t.Aktif === 'YA' ? pill('Aktif', 'ok') : '') + '<div class="tiny muted">' + esc(t.LebarMM) + '×' + esc(t.TinggiMM) + ' mm</div></button>').join('') + '</div></div>' +
      (kelola ? '<div class="card fldlist" style="padding:14px"><b>Tambah kolom data</b><div class="mt">' + DG.KUNCI[jenis].map((k) => '<button data-addf="' + k[0] + '">' + ic(k[0] === 'qr' ? 'qr_code_2' : k[0] === 'foto' ? 'image' : 'text_fields') + esc(k[1]) + '</button>').join('') + '<button data-addf="static">' + ic('title') + 'Teks bebas</button></div></div>' : '') + '</div>' +
      '<div class="col"><div class="row sb"><div class="row">' + pill(esc(T.Nama), 'dark') + '<span class="small muted">' + T.LebarMM + '×' + T.TinggiMM + ' mm · ' + rows.length + ' data</span></div><div class="row"><span class="small">Pratinjau:</span><button class="btn xs" data-c="-1">‹</button><span class="small num">' + (rows.length ? contoh + 1 : 0) + '/' + rows.length + '</span><button class="btn xs" data-c="1">›</button></div></div>' +
      '<div class="canvas-wrap"><div class="canvas" data-cv><canvas></canvas></div></div>' +
      (kelola ? '<div class="row end">' + (T.TemplateID ? '<button class="btn sm danger" data-del>' + ic('delete') + '</button><button class="btn sm" data-aktif>' + ic('verified') + 'Jadikan aktif</button>' : '') + '<button class="btn sm" data-reset>' + ic('restart_alt') + 'Tata letak bawaan</button><button class="btn sm primary" data-simpan>' + ic('save') + (T.TemplateID ? 'Simpan template' : 'Simpan sebagai template') + '</button></div>' : '') +
      '<div class="card" data-gen></div></div><div class="card props" data-props style="padding:14px"></div></div>';
    gambarUlang(); props(); panelGenerate();
  }
  const gambarUlang = debounce(async () => {
    const cv = body.querySelector('[data-cv]'); if (!cv) return;
    const maxW = Math.min(cv.parentElement.clientWidth - 44, 760), ratio = T.TinggiMM / T.LebarMM;
    let w = maxW, h = w * ratio; if (h > 620) { h = 620; w = h / ratio; }
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const rows = D.rows || [], r = rows[contoh] ? dataBaris(rows[contoh]) : dataBaris(contohKosong());
    if (r.foto && !r.fotoUrl) r.fotoUrl = await driveImg(r.foto);
    const c = cv.querySelector('canvas'); await DG.gambar(T, r, { pxPerMm: w / T.LebarMM * (window.devicePixelRatio || 1), canvas: c }); c.style.width = w + 'px'; c.style.height = h + 'px';
    cv.querySelectorAll('.fld').forEach((x) => x.remove());
    if (!kelola) return;
    T.fields.forEach((f, i) => { const d = document.createElement('div'); d.className = 'fld' + (i === sel ? ' sel' : ''); d.dataset.i = i; Object.assign(d.style, { left: f.x + '%', top: f.y + '%', width: f.w + '%', height: f.h + '%' }); d.innerHTML = '<span class="tag">' + esc(f.key === 'static' ? 'teks' : f.key) + '</span><i class="h"></i>'; cv.appendChild(d); });
  }, 60);
  function contohKosong() { const o = { nama: 'Nama Contoh, S.H.', jabatan: 'Jabatan', divisi: 'Divisi', sub: 'Keterangan', kode: 'C-1A', kategori: 'VVIP', nomor: '001/SERT/2026', qr: 'CONTOH1234', prodi: 'Hukum Ekonomi Syariah', predikat: 'Pujian', ipk: '3.80', ayah: 'Fulan', ibu: 'Fulanah', asal: 'Bogor / Jawa Barat', kursi: 'A-1A', nama_arab: 'الاسم' }; return o; }
  function props() {
    const el = body.querySelector('[data-props]'); if (!el) return;
    if (!kelola) { el.innerHTML = '<b>Petunjuk</b><p class="small muted">Anda dapat melihat pratinjau dan mengunggah foto wisudawan. Pengaturan desain hanya untuk Panitia Pegawai/Koordinator.</p>'; return; }
    const f = T.fields[sel];
    if (!f) { el.innerHTML = '<b>Properti</b><p class="small muted">Klik kotak bergaris koral di kanvas untuk mengatur posisi, huruf, ukuran, warna, dan perataan. Seret untuk memindahkan, tarik sudut kanan-bawah untuk mengubah ukuran.</p><div class="notice info small">' + ic('info') + '<div>PNG desain sebaiknya berukuran sesuai rasio dokumen (' + T.LebarMM + '×' + T.TinggiMM + ' mm). Bagian yang akan diisi data dibiarkan kosong di desain.</div></div>'; return; }
    el.innerHTML = '<div class="row sb"><b>Kolom: ' + esc(f.key === 'static' ? 'teks bebas' : f.key) + '</b><button class="btn xs danger" data-rmf>' + ic('delete') + '</button></div><div class="col mt" style="gap:10px">' +
      (f.key === 'static' ? '<label class="field"><span>Teks (boleh {{variabel}})</span><textarea class="inp" rows="3" data-p="text">' + esc(f.text || '') + '</textarea></label>' : '') +
      (!f.shape ? '<div class="grid g2"><label class="field"><span>Ukuran huruf</span><input class="inp sm" type="number" step="0.2" data-p="size" value="' + f.size + '"></label><label class="field"><span>Warna</span><input type="color" data-p="color" value="' + (f.color || '#1F1F1F') + '" style="width:100%;height:34px;border:1.5px solid #1F1F1F;border-radius:8px"></label></div>' +
        '<div class="grid g2"><label class="field"><span>Huruf</span><select class="inp sm" data-p="font"><option value="sans"' + (f.font === 'sans' ? ' selected' : '') + '>Outfit</option><option value="serif"' + (f.font === 'serif' ? ' selected' : '') + '>Serif</option><option value="arab"' + (f.font === 'arab' ? ' selected' : '') + '>Arab (Naskh)</option></select></label><label class="field"><span>Rata</span><select class="inp sm" data-p="align">' + ['left', 'center', 'right'].map((a) => '<option' + (f.align === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></label></div>' +
        '<label class="check"><input type="checkbox" data-p="bold"' + (f.bold ? ' checked' : '') + '> Tebal</label><label class="field"><span>Latar kotak (kosong = transparan)</span><div class="row"><input type="color" data-p="bg" value="' + (f.bg || '#FFD35C') + '" style="width:60px;height:34px"><label class="check small"><input type="checkbox" data-bgon' + (f.bg ? ' checked' : '') + '> pakai</label></div></label>' : '') +
      '<div class="grid g2">' + ['x', 'y', 'w', 'h'].map((k) => '<label class="field"><span>' + { x: 'Kiri %', y: 'Atas %', w: 'Lebar %', h: 'Tinggi %' }[k] + '</span><input class="inp sm" type="number" step="0.5" data-p="' + k + '" value="' + Number(f[k]).toFixed(1) + '"></label>').join('') + '</div></div>';
  }
  function panelGenerate() {
    const el = body.querySelector('[data-gen]'), rows = D.rows || [];
    let h = '<div class="row sb"><b>' + ic('rocket_launch') + ' Generate ' + esc(JENIS.find((j) => j[0] === jenis)[1]) + '</b><span class="small muted">' + rows.length + ' data</span></div>';
    if (jenis === 'LABEL') {
      h += '<div class="grid g4 mt">' + [['kolom', 'Kolom'], ['baris', 'Baris'], ['gapX', 'Jarak X mm'], ['gapY', 'Jarak Y mm'], ['offsetX', 'Geser X mm'], ['offsetY', 'Geser Y mm'], ['marginAtas', 'Margin atas'], ['marginKiri', 'Margin kiri']].map((k) => '<label class="field"><span class="small">' + k[1] + '</span><input class="inp sm" type="number" step="0.5" data-lo="' + k[0] + '" value="' + (labelOpt[k[0]] == null ? '' : labelOpt[k[0]]) + '" placeholder="otomatis"></label>').join('') + '</div><div class="row mt"><label class="check small"><input type="checkbox" data-lo="garisPotong"' + (labelOpt.garisPotong ? ' checked' : '') + '> Garis potong tipis</label><span class="pill info">' + (labelOpt.kolom * labelOpt.baris) + ' label per A4 · ' + Math.ceil(rows.length / (labelOpt.kolom * labelOpt.baris)) + ' lembar</span><span class="sp"></span><button class="btn sm" data-uji>' + ic('straighten') + 'Halaman uji cetak</button></div>' +
        (D.rows.length && D.status !== 'FINAL' ? '<div class="notice mt">' + ic('lock_open') + 'Denah belum FINAL — label tetap bisa dicetak untuk pratinjau, tetapi tandai FINAL sebelum mencetak resmi.</div>' : '');
    }
    if (jenis === 'SERTIFIKAT' && App.boleh('studio', Sesi.is('SUPERADMIN', 'KOORDINATOR'))) h += '<div class="row mt"><span class="small muted">' + rows.filter((r) => r.nomor).length + '/' + rows.length + ' sudah bernomor</span><button class="btn sm" data-nomor>' + ic('tag') + 'Buat nomor sertifikat</button></div>';
    if (jenis === 'SLIDE') { const tanpa = rows.filter((r) => !r.foto); h += '<div class="mt">' + (tanpa.length ? '<div class="notice">' + ic('no_photography') + '<div><b>' + tanpa.length + ' wisudawan belum punya foto.</b> Unggah di bawah (panitia foto) atau lewat Master Data.</div></div><div class="thumbs mt">' + tanpa.slice(0, 60).map((r) => '<div class="t"><div class="row sb"><span class="small b">' + esc(r.nama) + '</span><button class="btn xs" data-foto="' + r.id + '">' + ic('add_a_photo') + '</button></div></div>').join('') + '</div>' : '<div class="notice ok">' + ic('check_circle') + 'Semua wisudawan sudah memiliki foto.</div>') + '</div>'; }
    if (jenis === 'UNDANGAN') h += '<div class="row mt"><select class="inp sm" data-kat style="max-width:200px"><option value="">Semua penerima</option>' + ['VVIP', 'VIP', 'DOSEN', 'UMUM', 'WISUDAWAN'].map((k) => '<option>' + k + '</option>').join('') + '</select><button class="btn sm" data-links>' + ic('link') + 'Daftar tautan & kirim WA</button></div>';
    if (jenis === 'IDCARD') h += '<div class="row mt"><span class="small muted">Ukuran 54×86 mm (kartu ID standar), 9 kartu per A4 dengan garis potong.</span></div>';
    if (jenis === 'SERTIFIKAT' || jenis === 'IDCARD') h += '<div class="row mt"><select class="inp sm" data-pj style="max-width:240px"><option value="">Semua panitia</option><option value="PEGAWAI">Panitia Pegawai</option><option value="MAHASISWA">Panitia Acara</option>' + [...new Set(rows.map((r) => r.divisi).filter(Boolean))].map((d) => '<option value="div:' + esc(d) + '">Divisi ' + esc(d) + '</option>').join('') + '</select></div>';
    h += '<div class="row mt"><button class="btn primary" data-gen-go>' + ic(jenis === 'SLIDE' ? 'slideshow' : 'picture_as_pdf') + (jenis === 'SLIDE' ? 'Generate PPTX' : 'Generate PDF') + '</button>' + (jenis === 'SLIDE' ? '<button class="btn" data-gen-pdf>' + ic('picture_as_pdf') + 'PDF</button>' : '') + '<span class="small muted" data-prog></span></div>';
    el.innerHTML = h;
  }
  function saring() {
    let rows = (D.rows || []).slice(); const g = (s) => body.querySelector(s);
    if (jenis === 'UNDANGAN' && g('[data-kat]') && g('[data-kat]').value) rows = rows.filter((r) => r.kategori === g('[data-kat]').value);
    if ((jenis === 'SERTIFIKAT' || jenis === 'IDCARD') && g('[data-pj]') && g('[data-pj]').value) { const v = g('[data-pj]').value; rows = rows.filter((r) => v.indexOf('div:') === 0 ? r.divisi === v.slice(4) : String(r.jenis).toUpperCase() === v); }
    return rows;
  }
  async function generate(format) {
    const rows = saring(); if (!rows.length) return toast('Tidak ada data untuk dibuat.', 'warn');
    const prog = body.querySelector('[data-prog]'), btns = body.querySelectorAll('[data-gen] button'); btns.forEach((b) => b.disabled = true);
    try {
      const data = [];
      for (let i = 0; i < rows.length; i++) { const r = dataBaris(rows[i]); if (r.foto && (jenis === 'SLIDE' || jenis === 'IDCARD')) { prog.textContent = 'Memuat foto ' + (i + 1) + '/' + rows.length + '…'; r.fotoUrl = await driveImg(r.foto); } data.push(r); }
      const nama = (JENIS.find((j) => j[0] === jenis)[1] + ' ' + ((App.boot.kegiatan || {}).Nama || '')).trim();
      const onP = (n, t) => prog.textContent = 'Membuat ' + n + '/' + t + '…';
      if (format === 'pptx') { const p = await DG.pptx(T, data, onP); prog.textContent = 'Menyusun berkas PPTX…'; await p.writeFile({ fileName: nama + '.pptx' }); }
      else { const opt = jenis === 'LABEL' ? labelOpt : jenis === 'IDCARD' ? { kolom: 3, baris: 3, gapX: 2, gapY: 2, garisPotong: true } : {}; const doc = await DG.pdf(T, data, opt, onP); doc.save(nama + '.pdf'); }
      prog.textContent = '✔ Selesai — ' + rows.length + ' dokumen.'; toast('Berkas siap diunduh.', 'ok');
    } catch (e) { toast('Gagal membuat dokumen: ' + e.message, 'err'); prog.textContent = ''; }
    btns.forEach((b) => b.disabled = false);
  }
  /* ---------- interaksi kanvas ---------- */
  let drag = null;
  body.addEventListener('pointerdown', (e) => {
    const fld = e.target.closest('.fld'); if (!fld || !kelola) return;
    e.preventDefault(); sel = Number(fld.dataset.i); props(); body.querySelectorAll('.fld').forEach((x) => x.classList.toggle('sel', x === fld));
    const cv = body.querySelector('[data-cv]').getBoundingClientRect(), f = T.fields[sel];
    drag = { mode: e.target.classList.contains('h') ? 'size' : 'move', sx: e.clientX, sy: e.clientY, f0: Object.assign({}, f), cw: cv.width, ch: cv.height, el: fld };
    fld.setPointerCapture(e.pointerId);
  });
  body.addEventListener('pointermove', (e) => {
    if (!drag) return; const f = T.fields[sel], dx = (e.clientX - drag.sx) / drag.cw * 100, dy = (e.clientY - drag.sy) / drag.ch * 100;
    if (drag.mode === 'move') { f.x = Math.max(0, Math.min(100 - f.w, drag.f0.x + dx)); f.y = Math.max(0, Math.min(100 - f.h, drag.f0.y + dy)); }
    else { f.w = Math.max(3, Math.min(100 - f.x, drag.f0.w + dx)); f.h = Math.max(2, Math.min(100 - f.y, drag.f0.h + dy)); }
    Object.assign(drag.el.style, { left: f.x + '%', top: f.y + '%', width: f.w + '%', height: f.h + '%' });
  });
  body.addEventListener('pointerup', () => { if (drag) { drag = null; gambarUlang(); props(); } });
  body.addEventListener('input', (e) => {
    const p = e.target.dataset.p, f = T.fields[sel];
    if (p && f) { f[p] = e.target.type === 'checkbox' ? e.target.checked : ['size', 'x', 'y', 'w', 'h'].indexOf(p) > -1 ? Number(e.target.value) : e.target.value; if (p === 'bg' && !body.querySelector('[data-bgon]').checked) delete f.bg; gambarUlang(); }
    if (e.target.matches('[data-bgon]') && f) { if (e.target.checked) f.bg = body.querySelector('[data-p=bg]').value; else delete f.bg; gambarUlang(); }
    const lo = e.target.dataset.lo; if (lo) { labelOpt[lo] = e.target.type === 'checkbox' ? e.target.checked : (e.target.value === '' ? null : Number(e.target.value)); Store.set('labelOpt', labelOpt); }
  });
  body.addEventListener('change', (e) => { if (e.target.dataset.lo === 'kolom' || e.target.dataset.lo === 'baris') panelGenerate(); });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c) { const n = (D.rows || []).length; if (n) { contoh = (contoh + Number(b.dataset.c) + n) % n; render(); } return; }
    if (b.dataset.tpl !== undefined) { T = await DG.siapkan(jenis, list.find((t) => t.TemplateID === b.dataset.tpl) || null); sel = -1; render(); return; }
    if (b.dataset.addf) { const k = b.dataset.addf; T.fields.push({ key: k, x: 30, y: 40, w: 40, h: k === 'qr' || k === 'foto' ? 20 : 8, size: 4, color: '#1F1F1F', align: 'center', font: 'sans', bold: false, shape: k === 'qr' ? 'qr' : k === 'foto' ? 'photo' : undefined, text: k === 'static' ? 'Teks bebas' : undefined }); sel = T.fields.length - 1; gambarUlang(); props(); return; }
    if (b.matches('[data-rmf]')) { T.fields.splice(sel, 1); sel = -1; gambarUlang(); props(); return; }
    if (b.matches('[data-reset]')) { T.fields = JSON.parse(JSON.stringify(DG.BAWAAN[jenis])); sel = -1; gambarUlang(); props(); return; }
    if (b.matches('[data-simpan]')) {
      if (!T.TemplateID) { const nm = prompt('Nama template:', 'Desain ' + JENIS.find((j) => j[0] === jenis)[1]); if (!nm) return; const r = await API.write('tpl.save', { Jenis: jenis, Nama: nm, LebarMM: T.LebarMM, TinggiMM: T.TinggiMM, FilePNG: T.FilePNG || '', LayoutJSON: { fields: T.fields } }); if (r.success) { T.TemplateID = r.data.TemplateID; muat(); } }
      else await API.write('tpl.save', { TemplateID: T.TemplateID, LayoutJSON: { fields: T.fields } });
      return;
    }
    if (b.matches('[data-aktif]')) { await API.write('tpl.setAktif', { TemplateID: T.TemplateID }); muat(); return; }
    if (b.matches('[data-del]')) { if (await konfirmasi('Hapus template ini?', { bahaya: true })) { await API.write('tpl.delete', { TemplateID: T.TemplateID }); muat(); } return; }
    if (b.matches('[data-up]')) return unggahPNG();
    if (b.matches('[data-uji]')) { const d = await DG.ujiCetak(Object.assign({ w: T.LebarMM, h: T.TinggiMM }, labelOpt)); d.save('Uji-cetak-label.pdf'); return; }
    if (b.matches('[data-nomor]')) { await API.write('doc.nomorSertifikat', {}); muat(); return; }
    if (b.matches('[data-gen-go]')) return generate(jenis === 'SLIDE' ? 'pptx' : 'pdf');
    if (b.matches('[data-gen-pdf]')) return generate('pdf');
    if (b.dataset.foto) return unggahFoto(b.dataset.foto);
    if (b.matches('[data-links]')) return daftarTautan();
  });
  function unggahPNG() {
    const b = document.createElement('div'); let file = null;
    b.innerHTML = '<div class="form"><label class="field full"><span>Nama template</span><input class="inp" data-n value="Desain ' + esc(JENIS.find((j) => j[0] === jenis)[1]) + '"></label><label class="field"><span>Lebar (mm)</span><input class="inp" type="number" data-w value="' + DG.UK[jenis][0] + '"></label><label class="field"><span>Tinggi (mm)</span><input class="inp" type="number" data-h value="' + DG.UK[jenis][1] + '"></label></div><div class="mt" data-dz></div>';
    dropzone(b.querySelector('[data-dz]'), { label: 'Pilih PNG/JPG desain', hint: 'Ekspor dari Canva / CorelDRAW · disarankan ≥ 2000 px', accept: 'image/png,image/jpeg', onFile: (f, prev) => { file = f; prev.innerHTML = '<img src="' + URL.createObjectURL(f) + '">'; } });
    modal({ title: 'Template baru dari PNG', body: b, buttons: [{ label: 'Batal' }, { label: 'Unggah & buat', cls: 'primary', onClick: async () => {
      if (!file) { toast('Pilih berkas desain.', 'warn'); return false; }
      const k = await kompresGambar(file, 3200, 0.92, file.type === 'image/png' ? 'image/png' : 'image/jpeg');
      const up = await API.write('file.upload', { base64: k.dataUrl, mime: file.type === 'image/png' ? 'image/png' : 'image/jpeg', nama: file.name, kategori: 'desain' }, { silent: true });
      if (!up.success) { toast(up.message, 'err'); return false; }
      const r = await API.write('tpl.save', { Jenis: jenis, Nama: b.querySelector('[data-n]').value, LebarMM: Number(b.querySelector('[data-w]').value), TinggiMM: Number(b.querySelector('[data-h]').value), FilePNG: up.data.id, LayoutJSON: { fields: T.fields } });
      if (r.success) muat(); else return false;
    } }] });
  }
  function unggahFoto(id) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const k = await kompresGambar(f, 1200, 0.86); const r = await API.write('doc.fotoWisudawan', { WisudawanID: id, base64: k.dataUrl, mime: 'image/jpeg' }); if (r.success) muat(); };
    inp.click();
  }
  function daftarTautan() {
    const rows = saring();
    const teks = (r) => 'Assalamu\'alaikum ' + r.nama + ',\nDengan hormat kami mengundang Anda pada ' + (D.vars.acara || '') + ', ' + (D.vars.hari_tanggal || '') + ' pukul ' + (D.vars.jam || '') + ' WIB di ' + (D.vars.lokasi || '') + '.\nUndangan digital & QR kehadiran: ' + r.link;
    const m = drawer({ title: 'Tautan Undangan Digital (' + rows.length + ')', size: 'wide', foot: false, body: '<p class="small muted">Tautan bersifat pribadi (berisi token). Kirim satu per satu via WhatsApp, atau gunakan Blast WA di menu WhatsApp & CRM.</p><div class="col">' + rows.map((r, i) => '<div class="card flat row" style="padding:10px"><div style="flex:1;min-width:0"><b>' + esc(r.nama) + '</b><div class="tiny muted" style="word-break:break-all">' + esc(r.link) + '</div></div><button class="btn xs" data-cp="' + i + '">' + ic('content_copy') + '</button><a class="btn xs primary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(teks(r)) + '">' + ic('send') + 'WA</a></div>').join('') + '</div>' });
    m.body.addEventListener('click', async (e) => { const c = e.target.closest('[data-cp]'); if (c) { try { await navigator.clipboard.writeText(rows[c.dataset.cp].link); toast('Tautan disalin.', 'ok'); } catch (x) { } } });
  }
  view.querySelector('[data-j]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; jenis = b.dataset.v; sel = -1; contoh = 0; muat(); });
  await muat();
});

/* Galeri Dokumentasi — foto kegiatan per kategori, ditandai untuk lampiran LPJ */
App.page('galeri', async function (view) {
  const { esc, API, SWR, Sesi, modal, konfirmasi, toast, kompresGambar, driveImg } = SW, { ic, pill, kosong, dropzone } = UI;
  if (App.perluKegiatan(view)) return;
  const KAT = ['Prosesi', 'Sambutan', 'Tamu', 'Booth Foto', 'Karangan Bunga', 'Dekorasi', 'Wisudawan Terbaik', 'Foto Bersama', 'Lainnya'];
  const upload = !Sesi.is('MC') && !App.arsip(), kelola = Sesi.is('SUPERADMIN', 'KOORDINATOR');
  let rows = [], f = '';
  view.innerHTML = App.head('Galeri Dokumentasi', 'Foto yang ditandai <b>Pakai di LPJ</b> otomatis menjadi lampiran Laporan Pertanggungjawaban.') + (upload ? '<div class="card mb"><div class="row" style="align-items:flex-start"><div style="flex:1" data-dz></div><div class="col" style="width:240px"><label class="field"><span>Kategori</span><select class="inp" data-kat>' + KAT.map((k) => '<option>' + k + '</option>').join('') + '</select></label><label class="check"><input type="checkbox" data-lpj checked> Pakai di LPJ</label><div class="small muted" data-prog></div></div></div></div>' : '') +
    '<div class="chipset mb" data-f></div><div class="masonry" data-g></div>';
  const g = view.querySelector('[data-g]');
  function render() {
    view.querySelector('[data-f]').innerHTML = ['', ...KAT].map((k) => '<button class="chip' + (f === k ? ' on' : '') + '" style="cursor:pointer;' + (f === k ? 'background:#1F1F1F;color:#fff' : '') + '" data-k="' + k + '">' + (k || 'Semua') + ' · ' + rows.filter((r) => !k || r.Kategori === k).length + '</button>').join('');
    const vis = rows.filter((r) => !f || r.Kategori === f);
    g.innerHTML = vis.length ? vis.map((r) => '<div class="ph" data-id="' + r.GaleriID + '"><img data-src="' + r.FileID + '" alt="' + esc(r.Keterangan || r.Kategori) + '"><div>' + pill(r.Kategori, 'mute') + (r.PakaiLPJ === 'YA' ? pill('LPJ', 'ok') : '') + '<span class="sp"></span>' + (kelola ? '<button class="btn xs" data-lpj-t>' + ic(r.PakaiLPJ === 'YA' ? 'bookmark_remove' : 'bookmark_add') + '</button><button class="btn xs" data-del>' + ic('delete') + '</button>' : '') + '</div></div>').join('') : '<div class="card" style="column-span:all">' + kosong('Belum ada foto', 'Unggah dokumentasi kegiatan di sini.', 'photo_library') + '</div>';
    const io = new IntersectionObserver((ents) => ents.forEach(async (en) => { if (!en.isIntersecting) return; io.unobserve(en.target); const u = await driveImg(en.target.dataset.src); if (u) en.target.src = u; }), { rootMargin: '200px' });
    g.querySelectorAll('img[data-src]').forEach((i) => io.observe(i));
  }
  if (upload) dropzone(view.querySelector('[data-dz]'), { label: 'Pilih / seret foto dokumentasi', hint: 'Bisa banyak sekaligus · dikompres otomatis', accept: 'image/*', multiple: true, onFile: async (files) => {
    const prog = view.querySelector('[data-prog]'); let n = 0;
    for (const file of files) { prog.textContent = 'Mengunggah ' + (++n) + '/' + files.length + '…'; const k = await kompresGambar(file, 1600, 0.82); await API.write('galeri.add', { base64: k.dataUrl, mime: 'image/jpeg', nama: file.name, Kategori: view.querySelector('[data-kat]').value, PakaiLPJ: view.querySelector('[data-lpj]').checked }, { silent: true }); }
    prog.textContent = files.length + ' foto terunggah.'; toast(files.length + ' foto ditambahkan ke galeri.', 'ok'); muat(true);
  } });
  view.querySelector('[data-f]').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { f = b.dataset.k; render(); } });
  g.addEventListener('click', async (e) => {
    const ph = e.target.closest('[data-id]'); if (!ph) return; const r = rows.find((x) => x.GaleriID === ph.dataset.id);
    if (e.target.closest('[data-del]')) { if (await konfirmasi('Hapus foto dari galeri?', { bahaya: true })) { await API.write('galeri.delete', { GaleriID: r.GaleriID }); muat(true); } return; }
    if (e.target.closest('[data-lpj-t]')) { await API.write('galeri.update', { GaleriID: r.GaleriID, PakaiLPJ: r.PakaiLPJ === 'YA' ? 'TIDAK' : 'YA' }, { silent: true }); muat(true); return; }
    if (e.target.tagName === 'IMG') { const u = await driveImg(r.FileID); const m = modal({ title: esc(r.Kategori), size: 'wide', body: '<img src="' + u + '" style="width:100%;border-radius:10px"><label class="field mt"><span>Keterangan</span><input class="inp" data-ket value="' + esc(r.Keterangan || '') + '"' + (kelola ? '' : ' readonly') + '></label>', buttons: kelola ? [{ label: 'Tutup' }, { label: 'Simpan keterangan', cls: 'primary', onClick: async (mm) => { await API.write('galeri.update', { GaleriID: r.GaleriID, Keterangan: mm.body.querySelector('[data-ket]').value }); muat(true); } }] : [{ label: 'Tutup' }] }); return m; }
  });
  const muat = (fresh) => SWR.load('galeri.list', {}, (d) => { if (d) { rows = d; render(); } }, { maxAge: 20000, fresh });
  await muat();
});

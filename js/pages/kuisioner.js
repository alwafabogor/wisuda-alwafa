/* Kuisioner — isi (panitia), form builder (Koordinator), hasil & analisis otomatis */
App.page('kuisioner', async function (view) {
  const { esc, API, SWR, Sesi, drawer, modal, konfirmasi, toast, eksporXLSX } = SW, { ic, pill, kosong, hbars, columns, PAL } = UI;
  if (App.perluKegiatan(view)) return;
  const admin = App.boleh('kuisioner', Sesi.is('SUPERADMIN', 'KOORDINATOR')) && !App.arsip(), lihatHasil = App.boleh('kuisioner', Sesi.is('SUPERADMIN', 'KOORDINATOR', 'PEGAWAI'), 'baca');
  const tabs = [['isi', 'Isi Kuisioner', 'edit_note']].concat(admin ? [['builder', 'Form Builder', 'construction']] : []).concat(lihatHasil ? [['hasil', 'Hasil & Analisis', 'insights']] : []);
  let tab = lihatHasil ? 'hasil' : 'isi', forms = [], fsel = '';
  view.innerHTML = App.head('Kuisioner Evaluasi', 'Penilaian layanan wisuda (konsumsi, acara, tamu, panggung, souvenir, dll) dari wisudawan, panitia acara, dan panitia pegawai.') +
    '<div class="tabs">' + tabs.map((t) => '<button data-t="' + t[0] + '">' + ic(t[2]) + t[1] + '</button>').join('') + '</div><div data-body>' + UI.skeleton(6) + '</div>';
  const body = view.querySelector('[data-body]');
  const JENIS = [['SKALA10', 'Skala 1–10'], ['BINTANG', 'Bintang 1–5'], ['PILIHAN', 'Pilihan'], ['ISIAN', 'Isian']];
  function soalHtml(s) {
    const nm = 'q_' + s.SoalID;
    if (s.Jenis === 'SKALA10') return '<div class="seg" style="flex-wrap:wrap">' + Array.from({ length: 10 }, (_, i) => '<label style="cursor:pointer"><input type="radio" name="' + nm + '" value="' + (i + 1) + '" hidden><span class="btn sm" style="min-width:38px">' + (i + 1) + '</span></label>').join('') + '</div>';
    if (s.Jenis === 'BINTANG') return '<div class="row">' + [1, 2, 3, 4, 5].map((i) => '<label style="cursor:pointer;font-size:28px"><input type="radio" name="' + nm + '" value="' + i + '" hidden><span>☆</span></label>').join('') + '</div>';
    if (s.Jenis === 'PILIHAN') return '<div class="col" style="gap:6px">' + (s.opsi || []).map((o) => '<label class="check"><input type="radio" name="' + nm + '" value="' + esc(o) + '">' + esc(o) + '</label>').join('') + '</div>';
    return '<textarea class="inp" name="' + nm + '" rows="3"></textarea>';
  }
  async function renderIsi() {
    const r = await API.read('kuis.mine', {});
    const list = r.success ? r.data : [];
    body.innerHTML = list.length ? list.map((f) => '<div class="card mb"><div class="card-h"><div style="flex:1"><h3>' + esc(f.Judul) + '</h3><div class="small muted">' + esc(f.Deskripsi || '') + '</div></div>' + (f.sudah ? pill('Sudah diisi', 'ok') : pill(f.soal.length + ' pertanyaan', 'yellow')) + '</div>' +
      (f.sudah ? '<div class="notice ok">' + ic('check_circle') + 'Terima kasih, penilaian Anda sudah tersimpan.</div>' : '<form data-f="' + f.FormID + '" class="col">' + f.soal.map((s, i) => '<div class="card flat"><div class="small muted">' + esc(s.Aspek || '') + '</div><b>' + (i + 1) + '. ' + esc(s.Pertanyaan) + (s.Wajib === 'YA' ? ' <span style="color:#991B1B">*</span>' : '') + '</b><div class="mt">' + soalHtml(s) + '</div></div>').join('') + '<button class="btn primary lg">' + ic('send') + 'Kirim Penilaian</button></form>') + '</div>').join('') : '<div class="card">' + kosong('Belum ada kuisioner untuk Anda', 'Kuisioner aktif yang ditujukan ke kelompok Anda akan muncul di sini.', 'quiz') + '</div>';
    body.querySelectorAll('form[data-f]').forEach((fm) => {
      fm.addEventListener('change', (e) => { if (e.target.type === 'radio') { const grp = fm.querySelectorAll('[name="' + e.target.name + '"]'); grp.forEach((x) => { const s = x.nextElementSibling; if (!s) return; if (s.classList.contains('btn')) s.classList.toggle('primary', x.checked); else s.textContent = Number(x.value) <= Number(e.target.value) ? '★' : '☆'; }); } });
      fm.onsubmit = async (e) => { e.preventDefault(); const f = list.find((x) => x.FormID === fm.dataset.f), jaw = {}; f.soal.forEach((s) => { const el = fm.querySelector('[name="q_' + s.SoalID + '"]:checked') || fm.querySelector('textarea[name="q_' + s.SoalID + '"]'); if (el && el.value) jaw[s.SoalID] = el.value; }); const r2 = await API.write('kuis.submit', { FormID: f.FormID, jawaban: jaw }); if (r2.success) renderIsi(); };
    });
  }
  async function renderBuilder() {
    const r = await SW.SWR.get('kuis.list', {}, { maxAge: 30000 }); forms = r.success ? r.data : [];
    if (!fsel && forms[0]) fsel = forms[0].FormID;
    const f = forms.find((x) => x.FormID === fsel);
    body.innerHTML = '<div class="grid g-hp1" style="grid-template-columns:minmax(0,280px) minmax(0,1fr)"><div class="col"><button class="btn primary" data-new>' + ic('add') + 'Kuisioner baru</button>' + forms.map((x) => '<button class="card ' + (x.FormID === fsel ? 'yellow' : 'flat') + '" style="text-align:left;cursor:pointer" data-sel="' + x.FormID + '"><b>' + esc(x.Judul) + '</b><div class="row" style="gap:6px;margin-top:6px">' + pill(x.Status) + '<span class="small muted">' + x.soal.length + ' soal · ' + x.jumlahRespon + ' respon</span></div></button>').join('') + '</div>' +
      '<div>' + (f ? '<div class="card"><div class="row sb mb"><div class="row">' + pill(f.Status) + '<span class="small muted">' + f.jumlahRespon + ' respon</span></div><div class="row">' + (f.Status !== 'Aktif' ? '<button class="btn sm" data-st="Aktif">' + ic('play_arrow') + 'Aktifkan</button>' : '<button class="btn sm" data-st="Tutup">' + ic('stop') + 'Tutup</button><button class="btn sm" data-undang>' + ic('send') + 'Kirim undangan WA/Email</button>') + '<button class="btn sm danger" data-del>' + ic('delete') + '</button></div></div>' +
        '<div class="form"><label class="field full"><span>Judul</span><input data-j value="' + esc(f.Judul) + '"></label><label class="field full"><span>Deskripsi</span><input data-d value="' + esc(f.Deskripsi || '') + '"></label><div class="field full"><span>Target responden</span><div class="chipset">' + [['WISUDAWAN', 'Wisudawan (lewat tautan pribadi)'], ['ACARA', 'Panitia Acara'], ['PEGAWAI', 'Panitia Pegawai']].map((t) => '<label class="chip check"><input type="checkbox" data-tg value="' + t[0] + '"' + (String(f.Target).split(',').indexOf(t[0]) > -1 ? ' checked' : '') + '>' + t[1] + '</label>').join('') + '</div></div></div>' +
        '<h3 class="mt">Pertanyaan</h3><div class="col mt" data-soal>' + f.soal.map((s, i) => soalEd(s, i)).join('') + '</div><button class="btn sm mt" data-addq>' + ic('add') + 'Tambah pertanyaan</button><div class="row end mt"><button class="btn primary" data-save>' + ic('save') + 'Simpan kuisioner</button></div></div>' : '<div class="card">' + kosong('Belum ada kuisioner', '', 'quiz') + '</div>') + '</div></div>';
  }
  const soalEd = (s, i) => '<div class="card flat" data-q="' + esc(s.SoalID || '') + '" style="padding:12px"><div class="row" style="gap:8px;flex-wrap:nowrap"><b class="num">' + (i + 1) + '</b><input class="inp sm" data-k="Aspek" placeholder="Aspek (mis. Konsumsi)" value="' + esc(s.Aspek || '') + '" style="max-width:200px"><select class="inp sm" data-k="Jenis" style="max-width:140px">' + JENIS.map((j) => '<option value="' + j[0] + '"' + (j[0] === s.Jenis ? ' selected' : '') + '>' + j[1] + '</option>').join('') + '</select><label class="check small"><input type="checkbox" data-k="Wajib"' + (s.Wajib === 'YA' ? ' checked' : '') + '>Wajib</label><span class="sp"></span><button class="btn xs" data-up>↑</button><button class="btn xs" data-down>↓</button><button class="btn xs danger" data-rm>' + ic('close') + '</button></div><input class="inp sm mt" data-k="Pertanyaan" placeholder="Pertanyaan" value="' + esc(s.Pertanyaan || '') + '"><input class="inp sm mt" data-k="Opsi" placeholder="Opsi pilihan, pisahkan koma (khusus jenis Pilihan)" value="' + esc((s.opsi || (s.OpsiJSON ? JSON.parse(s.OpsiJSON || '[]') : [])).join(', ')) + '"></div>';
  async function renderHasil() {
    const r = await SW.SWR.get('kuis.list', {}, { maxAge: 30000 }); forms = r.success ? r.data : [];
    if (!forms.length) { body.innerHTML = '<div class="card">' + kosong('Belum ada kuisioner', '', 'quiz') + '</div>'; return; }
    if (!fsel) fsel = (forms.find((f) => f.Status !== 'Draft') || forms[0]).FormID;
    const h = await API.read('kuis.hasil', { FormID: fsel }); const A = h.data;
    if (!A) { body.innerHTML = '<div class="card">' + kosong('Tidak ada data', '', 'insights') + '</div>'; return; }
    const angkaH = A.hasil.filter((x) => x.rata !== null), komentar = A.hasil.flatMap((x) => x.komentar.map((k) => ({ aspek: x.Aspek, isi: k.isi, oleh: k.oleh })));
    const kel = Object.keys(A.respon);
    const warna = ['yellow', 'lilac', 'sky', 'mint'];
    body.innerHTML = '<div class="row mb"><select class="inp" data-pilih style="max-width:360px">' + forms.map((f) => '<option value="' + f.FormID + '"' + (f.FormID === fsel ? ' selected' : '') + '>' + esc(f.Judul) + ' (' + f.Status + ')</option>').join('') + '</select><span class="sp"></span><button class="btn" data-xls>' + ic('table_view') + 'Unduh Excel</button><a class="btn primary" href="#/laporan?tab=evaluasi">' + ic('description') + 'Generate Laporan</a></div>' +
      '<div class="grid g4">' + [['Rata-rata total', A.rataTotal == null ? '–' : String(A.rataTotal).replace('.', ','), 'dari 10'], ['Total respon', A.totalRespon, Object.keys(A.sasaran).map((k) => k + ' ' + (A.respon[k] || 0) + '/' + A.sasaran[k]).join(' · ')], ['Aspek terbaik', A.terbaik[0] || '–', A.terbaik.slice(1).join(', ')], ['Perlu perhatian', A.terendah[0] || '–', A.terendah.slice(1).join(', ')]].map((x, i) => '<div class="card ' + warna[i] + '"><div class="small b" style="letter-spacing:.08em">' + x[0].toUpperCase() + '</div><div style="font-size:' + (i > 1 ? 18 : 34) + 'px;font-weight:700;margin:8px 0">' + esc(x[1]) + '</div><div class="small">' + esc(x[2]) + '</div></div>').join('') + '</div>' +
      '<div class="grid g2 mt"><div class="card"><div class="card-h"><h3>Skor per Aspek</h3>' + pill('skala 10', 'mute') + '</div><div data-c1></div></div><div class="card"><div class="card-h"><h3>Perbandingan Kelompok Responden</h3></div><div data-c2></div></div></div>' +
      '<div class="card mt"><div class="card-h"><h3>Komentar & Saran (' + komentar.length + ')</h3></div><div class="grid g2">' + (komentar.map((k) => '<div class="card flat" style="padding:12px"><div style="font-size:15px">“' + esc(k.isi) + '”</div><div class="small muted mt">' + esc(k.aspek) + ' · ' + esc(k.oleh) + '</div></div>').join('') || '<div class="muted">Belum ada komentar.</div>') + '</div></div>';
    hbars(body.querySelector('[data-c1]'), angkaH.map((x, i) => ({ label: x.Aspek, value: x.rata, max: 10, text: String(x.rata).replace('.', ',') + ' (' + x.n + ')', color: x.rata < 7.5 ? '#E8502E' : '#2E9466' })), { emptyTitle: 'Belum ada jawaban' });
    if (kel.length) columns(body.querySelector('[data-c2]'), { labels: angkaH.map((x) => x.Aspek), series: kel.map((k, i) => ({ name: { WISUDAWAN: 'Wisudawan', ACARA: 'Panitia Acara', PEGAWAI: 'Panitia Pegawai' }[k] || k, values: angkaH.map((x) => x.perKelompok[k] || 0), color: PAL[i] })), aria: 'Perbandingan kelompok' });
    else body.querySelector('[data-c2]').innerHTML = kosong('Belum ada jawaban', '', 'groups');
    body.querySelector('[data-pilih]').onchange = (e) => { fsel = e.target.value; renderHasil(); };
    body.querySelector('[data-xls]').onclick = () => eksporXLSX({ Ringkasan: A.hasil.map((x) => ({ Aspek: x.Aspek, Pertanyaan: x.Pertanyaan, RataRata: x.rata, Jumlah: x.n })), Komentar: komentar }, 'Hasil-' + A.form.Judul);
  }
  function render() { view.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); body.innerHTML = UI.skeleton(6); ({ isi: renderIsi, builder: renderBuilder, hasil: renderHasil })[tab](); }
  body.addEventListener('click', async (e) => {
    if (tab !== 'builder') return;
    const s = e.target.closest('[data-sel]'); if (s) { fsel = s.dataset.sel; renderBuilder(); return; }
    if (e.target.closest('[data-new]')) { const r = await API.write('kuis.saveForm', { form: { Judul: 'Kuisioner baru', Target: 'WISUDAWAN' }, soal: [] }); if (r.success) { fsel = r.data.FormID; renderBuilder(); } return; }
    const box = body.querySelector('[data-soal]');
    if (e.target.closest('[data-addq]')) { box.insertAdjacentHTML('beforeend', soalEd({ Jenis: 'SKALA10', Wajib: 'YA' }, box.children.length)); return; }
    const q = e.target.closest('[data-q]');
    if (q && e.target.closest('[data-rm]')) { q.remove(); return; }
    if (q && e.target.closest('[data-up]') && q.previousElementSibling) { q.parentNode.insertBefore(q, q.previousElementSibling); return; }
    if (q && e.target.closest('[data-down]') && q.nextElementSibling) { q.parentNode.insertBefore(q.nextElementSibling, q); return; }
    const st = e.target.closest('[data-st]'); if (st) { await API.write('kuis.setStatus', { FormID: fsel, Status: st.dataset.st }); renderBuilder(); return; }
    if (e.target.closest('[data-undang]')) { await API.write('kuis.undang', { FormID: fsel }); return; }
    if (e.target.closest('[data-del]')) { if (await konfirmasi('Hapus kuisioner ini?', { bahaya: true })) { const r = await API.write('kuis.deleteForm', { FormID: fsel, paksa: true }); if (r.success) { fsel = ''; renderBuilder(); } } return; }
    if (e.target.closest('[data-save]')) {
      const soal = [...box.children].map((c) => { const g = (k) => c.querySelector('[data-k="' + k + '"]'); return { SoalID: c.dataset.q || '', Aspek: g('Aspek').value, Jenis: g('Jenis').value, Pertanyaan: g('Pertanyaan').value, Wajib: g('Wajib').checked ? 'YA' : 'TIDAK', opsi: g('Opsi').value.split(',').map((x) => x.trim()).filter(Boolean) }; });
      const f = forms.find((x) => x.FormID === fsel);
      const r = await API.write('kuis.saveForm', { form: { FormID: fsel, Judul: body.querySelector('[data-j]').value, Deskripsi: body.querySelector('[data-d]').value, Target: [...body.querySelectorAll('[data-tg]:checked')].map((x) => x.value).join(','), Status: f.Status }, soal });
      if (r.success) renderBuilder();
    }
  });
  view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; render(); });
  render();
});

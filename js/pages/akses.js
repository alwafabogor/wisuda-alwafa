/* Hak Akses Divisi (v1.2) — Superadmin mencentang fitur yang boleh DILIHAT dan DIUBAH (CRUD) oleh setiap divisi pegawai.
   Tanpa centang = tidak ada akses (menu disembunyikan, server menolak). Divisi yang tidak diatur = hak bawaan peran. */
App.page('akses', async function (view) {
  const { esc, API, SWR, toast, konfirmasi } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  const arsip = App.arsip();
  let D = null, pilih = '', draf = null, kotor = false;
  view.innerHTML = App.head('Hak Akses Divisi', 'Centang fitur yang boleh <b>dilihat</b> dan <b>diubah</b> (tambah, ubah, hapus) oleh setiap divisi pegawai. Tanpa centang = tidak ada akses: menu disembunyikan dan server menolak. Berlaku untuk semua akun di divisi itu, kecuali Superadmin & Koordinator Umum.') +
    '<div data-isi>' + UI.skeleton(6) + '</div>';
  const isi = view.querySelector('[data-isi]');
  const LBL = { crud: 'Lihat & ubah', baca: 'Lihat saja', tidak: 'Tidak ada akses' }, PILL = { crud: 'ok', baca: 'info', tidak: 'mute' };
  const bawaan = () => { const o = {}; D.fitur.forEach((f) => { o[f.id] = f.bawaan; }); return o; };
  const ringkas = (a) => { const n = { crud: 0, baca: 0, tidak: 0 }; D.fitur.forEach((f) => { n[a[f.id] || 'tidak']++; }); return n; };

  function render() {
    if (!D.divisi.length) { isi.innerHTML = '<div class="card">' + kosong('Belum ada divisi pegawai', 'Tambahkan divisi berjenis <b>Pegawai</b> di Master Data → Divisi.', 'groups', '<a class="btn" href="#/master?tab=Divisi">' + ic('database') + 'Master Data → Divisi</a>') + '</div>'; return; }
    if (!pilih || !D.divisi.some((d) => d.DivisiID === pilih)) pilih = D.divisi[0].DivisiID;
    const dv = D.divisi.find((d) => d.DivisiID === pilih), atur = D.atur[pilih];
    if (!draf) draf = atur ? Object.assign({}, atur) : null;
    const khusus = !!draf, nilai = draf || bawaan(), n = ringkas(nilai);
    isi.innerHTML =
      '<div class="tabs" data-div aria-label="Pilih divisi pegawai">' + D.divisi.map((d) => '<button data-d="' + esc(d.DivisiID) + '"' + (d.DivisiID === pilih ? ' class="on"' : '') + '>' + ic(D.atur[d.DivisiID] ? 'tune' : 'badge') + esc(d.Nama) + ' · ' + d.anggota + ' akun' + (D.atur[d.DivisiID] ? ' · diatur' : '') + '</button>').join('') + '</div>' +
      '<div class="card" data-editor>' +
        '<div class="row sb" style="gap:12px;align-items:flex-start"><div style="flex:1 1 240px;min-width:0"><h3 style="margin:0">' + esc(dv.Nama) + '</h3><div class="small muted">' + dv.anggota + ' akun aktif' + (Object.keys(dv.peran || {}).length ? ' · ' + Object.keys(dv.peran).map((r) => dv.peran[r] + ' ' + esc((D.peranLabel || {})[r] || r)).join(', ') : '') + '</div></div>' +
          (arsip ? '' : '<label class="check" style="margin:0"><span class="switch"><input type="checkbox" data-khusus' + (khusus ? ' checked' : '') + '><i></i></span>' + (khusus ? 'Diatur khusus' : 'Hak bawaan peran') + '</label>') + '</div>' +
        '<div class="row mt" style="gap:6px">' + pill(n.crud + ' lihat & ubah', 'ok') + pill(n.baca + ' lihat saja', 'info') + pill(n.tidak + ' tanpa akses', 'mute') + (kotor ? pill('Belum disimpan', 'warn') : '') + '</div>' +
        (khusus ? '' : '<div class="notice info mt">' + ic('info') + '<div>Divisi ini memakai <b>hak bawaan peran</b> (seperti sebelumnya). Nyalakan <b>Diatur khusus</b> untuk mengubah centang — isian awal mengikuti hak bawaan Panitia Pegawai.</div></div>') +
        (khusus && !arsip ? '<div class="row mt" style="gap:6px"><button class="btn sm" data-preset="baca">' + ic('visibility') + 'Semua lihat saja</button><button class="btn sm" data-preset="crud">' + ic('edit') + 'Semua lihat & ubah</button><button class="btn sm" data-preset="tidak">' + ic('block') + 'Kosongkan</button><button class="btn sm" data-preset="bawaan">' + ic('restart_alt') + 'Isi bawaan</button>' +
          (D.divisi.length > 1 ? '<select class="inp sm" data-salin style="width:auto;max-width:100%"><option value="">Salin dari divisi…</option>' + D.divisi.filter((d) => d.DivisiID !== pilih).map((d) => '<option value="' + esc(d.DivisiID) + '">' + esc(d.Nama) + (D.atur[d.DivisiID] ? '' : ' (bawaan)') + '</option>').join('') + '</select>' : '') + '</div>' : '') +
        '<div class="tbl-wrap mt"><table class="tbl akses-tbl"><thead><tr><th>Fitur</th>' +
          '<th class="c" style="width:92px">' + (khusus && !arsip ? '<label class="check" style="justify-content:center"><input type="checkbox" data-semua="baca"' + (D.fitur.every((f) => nilai[f.id] !== 'tidak') ? ' checked' : '') + '> Lihat</label>' : 'Lihat') + '</th>' +
          '<th class="c" style="width:112px">' + (khusus && !arsip ? '<label class="check" style="justify-content:center"><input type="checkbox" data-semua="crud"' + (D.fitur.filter((f) => f.ubah).every((f) => nilai[f.id] === 'crud') ? ' checked' : '') + '> Ubah</label>' : 'Ubah (CRUD)') + '</th>' +
          '<th>Hasil</th></tr></thead><tbody>' +
          D.fitur.map((f) => {
            const lv = nilai[f.id] || 'tidak', mati = !khusus || arsip;
            return '<tr data-f="' + f.id + '"><td class="c1"><div class="row" style="gap:10px;flex-wrap:nowrap">' + ic(f.icon) + '<div style="min-width:0"><b>' + esc(f.label) + '</b>' + (khusus ? '<div class="tiny muted">bawaan peran: ' + LBL[f.bawaan] + '</div>' : '') + '</div></div></td>' +
              '<td class="c"><input type="checkbox" class="cb" data-lihat aria-label="Lihat ' + esc(f.label) + '"' + (lv !== 'tidak' ? ' checked' : '') + (mati ? ' disabled' : '') + '></td>' +
              '<td class="c">' + (f.ubah ? '<input type="checkbox" class="cb" data-ubah aria-label="Ubah ' + esc(f.label) + '"' + (lv === 'crud' ? ' checked' : '') + (mati ? ' disabled' : '') + '>' : '<span class="tiny muted">—</span>') + '</td>' +
              '<td>' + pill(LBL[lv], PILL[lv]) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
        '<p class="small muted mt">' + ic('info') + ' Penugasan pribadi tetap berlaku: penanda <b>Petugas Scan</b> &amp; <b>Panitia Foto</b>, dan <b>PJ Belanja</b> tetap bisa mencatat realisasi posnya bila Keuangan minimal "lihat saja". Pemasukan tetap khusus Superadmin. Server langsung menerapkan; menu di HP panitia menyesuaikan dalam beberapa menit.</p>' +
        (arsip ? '' : '<div class="row end mt" style="gap:8px"><button class="btn" data-batal' + (kotor ? '' : ' disabled') + '>Batalkan</button><button class="btn primary" data-simpan' + (kotor ? '' : ' disabled') + '>' + ic('save') + 'Simpan hak akses</button></div>') +
      '</div>' + ringkasan();
  }
  function ringkasan() {
    const SIM = { crud: '<span class="ak ak-crud" title="Lihat & ubah">' + ic('edit') + '</span>', baca: '<span class="ak ak-baca" title="Lihat saja">' + ic('visibility') + '</span>', tidak: '<span class="ak ak-tidak" title="Tidak ada akses">–</span>' };
    return '<div class="card mt"><div class="row sb"><b>Ringkasan semua divisi pegawai</b><span class="small muted">' + SIM.crud + ' lihat & ubah · ' + SIM.baca + ' lihat saja · ' + SIM.tidak + ' tidak ada</span></div>' +
      '<div class="tbl-wrap mt"><table class="tbl compact akses-ring"><thead><tr><th>Divisi</th>' + D.fitur.map((f) => '<th class="c" title="' + esc(f.label) + '">' + ic(f.icon) + '</th>').join('') + '</tr></thead><tbody>' +
      D.divisi.map((d) => { const a = D.atur[d.DivisiID]; return '<tr><td class="c1"><b>' + esc(d.Nama) + '</b><div class="tiny muted">' + (a ? 'diatur khusus' : 'hak bawaan peran') + '</div></td>' + D.fitur.map((f) => '<td class="c">' + SIM[a ? a[f.id] : f.bawaan] + '</td>').join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="tiny muted">Arahkan kursor ke ikon kolom untuk nama fitur.</p></div>';
  }
  function ganti(fn) { fn(); kotor = true; render(); }

  isi.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-khusus]')) {
      if (t.checked) ganti(() => { draf = Object.assign(bawaan(), D.atur[pilih] || {}); });
      else ganti(() => { draf = null; });
      return;
    }
    if (t.matches('[data-salin]') && t.value) { const src = D.atur[t.value]; ganti(() => { draf = Object.assign({}, src || bawaan()); }); return; }
    if (t.matches('[data-semua]')) { const lv = t.dataset.semua; ganti(() => { D.fitur.forEach((f) => { if (lv === 'baca') draf[f.id] = t.checked ? (draf[f.id] === 'crud' ? 'crud' : 'baca') : 'tidak'; else if (f.ubah) draf[f.id] = t.checked ? 'crud' : (draf[f.id] === 'tidak' ? 'tidak' : 'baca'); }); }); return; }
    const tr = t.closest('tr[data-f]'); if (!tr || !draf) return;
    const id = tr.dataset.f;
    if (t.matches('[data-lihat]')) ganti(() => { draf[id] = t.checked ? (draf[id] === 'crud' ? 'crud' : 'baca') : 'tidak'; });
    if (t.matches('[data-ubah]')) ganti(() => { draf[id] = t.checked ? 'crud' : (draf[id] === 'tidak' ? 'tidak' : 'baca'); });
  });
  isi.addEventListener('click', async (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { if (d.dataset.d === pilih) return; if (kotor && !(await konfirmasi('Perubahan hak akses divisi ini belum disimpan. Tinggalkan?', { ya: 'Tinggalkan' }))) { render(); return; } pilih = d.dataset.d; draf = null; kotor = false; render(); return; }
    const pr = e.target.closest('[data-preset]');
    if (pr) { const p = pr.dataset.preset; ganti(() => { draf = p === 'bawaan' ? bawaan() : D.fitur.reduce((o, f) => { o[f.id] = p === 'crud' && !f.ubah ? 'baca' : p; return o; }, {}); }); return; }
    if (e.target.closest('[data-batal]')) { draf = null; kotor = false; render(); return; }
    const sv = e.target.closest('[data-simpan]');
    if (sv) {
      sv.disabled = true;
      const r = await API.write('akses.simpan', { atur: { [pilih]: draf ? draf : null } });
      if (r.success) { kotor = false; draf = null; await muat(); } else sv.disabled = false;
    }
  });
  const muat = (fresh) => SWR.load('akses.get', {}, (d, c, err) => { if (err) { isi.innerHTML = '<div class="card">' + kosong('Tidak dapat memuat', esc(err.message), 'error') + '</div>'; return; } if (kotor) return; D = d; render(); }, { maxAge: 20000, fresh });
  await muat();
});

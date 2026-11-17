/* Kegiatan Master & Arsip — 1 kegiatan = 1 angkatan wisuda */
App.page('kegiatan', async function (view) {
  const { esc, API, SWR, tglID, Sesi, modal, konfirmasi, toast, angka } = SW, { ic, pill, kosong, formHtml, formVal, formCek } = UI;
  let tab = 'aktif', rows = [];
  view.innerHTML = App.head('Kegiatan Master', 'Setiap angkatan wisuda dikelola dalam satu Kegiatan Master. Arsipkan setelah selesai agar dashboard kembali bersih.', '<button class="btn primary" data-new>' + ic('add') + 'Buat Kegiatan Master</button>') +
    '<div class="tabs"><button data-t="aktif" class="on">Aktif</button><button data-t="arsip">Arsip</button></div><div data-list>' + UI.skeleton(4) + '</div>';
  const list = view.querySelector('[data-list]');
  const warna = ['yellow', 'lilac', 'sky', 'mint'];
  const render = () => {
    const r = rows.filter((k) => tab === 'arsip' ? k.Status === 'Arsip' : k.Status !== 'Arsip');
    if (!r.length) { list.innerHTML = '<div class="card">' + (tab === 'arsip' ? kosong('Arsip kosong', 'Kegiatan yang diarsipkan akan muncul di sini (hanya baca).', 'inventory_2') : kosong('Belum ada Kegiatan Master aktif', 'Buat Kegiatan Master untuk memulai pengelolaan wisuda angkatan baru.', 'event_available', '<button class="btn primary" data-new2>' + ic('add') + 'Buat Kegiatan Master</button>')) + '</div>'; const n2 = list.querySelector('[data-new2]'); if (n2) n2.onclick = buat; return; }
    list.innerHTML = '<div class="grid g3">' + r.map((k, i) => {
      const dipakai = k.KegiatanID === Sesi.kid;
      return '<div class="card ' + (k.Status === 'Arsip' ? 'flat' : warna[i % 4]) + '"><div class="row sb"><span class="pill dark">Angkatan ' + esc(k.Angkatan || '-') + '</span>' + pill(k.Status === 'Arsip' ? 'Arsip' : 'Aktif') + '</div>' +
        '<h3 style="font-size:19px;margin:14px 0 4px">' + esc(k.Nama) + '</h3><div class="small">' + ic('calendar_month') + ' ' + esc(tglID(k.TanggalAcara)) + ' · ' + esc(k.JamMulai || '') + '</div><div class="small">' + ic('location_on') + ' ' + esc(k.Lokasi || '-') + '</div>' +
        '<div class="chipset" style="margin:12px 0"><span class="chip">' + angka(k.jumlahWisudawan) + ' wisudawan</span><span class="chip">' + angka(k.jumlahPanitia) + ' panitia</span><span class="chip">Mode ' + esc(k.Mode || 'NORMAL') + '</span></div>' +
        '<div class="row">' + (dipakai ? pill('Sedang dibuka', 'dark') : '<button class="btn sm dark" data-a="buka" data-id="' + k.KegiatanID + '">' + ic('login') + 'Buka</button>') +
        '<button class="btn sm" data-a="edit" data-id="' + k.KegiatanID + '">' + ic('edit') + 'Ubah</button>' +
        (k.Status === 'Arsip' ? '<button class="btn sm" data-a="unarsip" data-id="' + k.KegiatanID + '">' + ic('unarchive') + 'Aktifkan</button>' : '<button class="btn sm" data-a="arsip" data-id="' + k.KegiatanID + '">' + ic('inventory_2') + 'Arsipkan</button>') + '</div></div>';
    }).join('') + '</div>';
  };
  const muat = (fresh) => SWR.load('kegiatan.list', {}, (d) => { if (d) { rows = d; render(); } }, { maxAge: 0, fresh });
  const F = [
    { k: 'Nama', label: 'Nama kegiatan', req: true, full: true, ph: 'Wisuda Ke-4 Program Sarjana STIS Al Wafa' },
    { k: 'WisudaKe', label: 'Wisuda ke-', type: 'number', ph: '4' }, { k: 'Angkatan', label: 'Angkatan', ph: '4' },
    { k: 'Tahun', label: 'Tahun / T.A.', ph: '2026' }, { k: 'TanggalAcara', label: 'Tanggal acara', type: 'date' },
    { k: 'JamMulai', label: 'Jam mulai', type: 'time', def: '08:00' }, { k: 'Lokasi', label: 'Lokasi', ph: 'Aula Utama STIS Al Wafa' },
    { k: 'Tema', label: 'Tema wisuda', full: true }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2 }
  ];
  async function buat() {
    const aktif = rows.filter((k) => k.Status !== 'Arsip');
    const body = document.createElement('div');
    body.innerHTML = (aktif.length ? '<div class="notice" style="margin-bottom:14px">' + ic('info') + '<div>Masih ada kegiatan aktif <b>' + esc(aktif[0].Nama) + '</b>. Disarankan mengarsipkannya dulu agar data tidak tumpang tindih.</div></div>' : '') + formHtml(F) +
      '<div class="card cream mt" style="padding:14px"><b>Isi awal</b><div class="small muted" style="margin:4px 0 10px">Tanpa salinan: divisi, jobdesk, checklist, rundown Plan A, teks MC, RAB, kuisioner, dan denah diisi dari format wisuda sebelumnya.</div>' +
      '<label class="field"><span>Salin struktur dari kegiatan</span><select name="salinDari"><option value="">— Pakai isi bawaan —</option>' + rows.map((k) => '<option value="' + k.KegiatanID + '">' + esc(k.Nama) + '</option>').join('') + '</select></label>' +
      '<label class="check mt"><input type="checkbox" name="salinPanitia"> Salin juga daftar panitia</label>' + (aktif.length ? '<label class="check mt"><input type="checkbox" name="paralel"> Izinkan lebih dari satu kegiatan aktif</label>' : '') + '</div>';
    modal({ title: 'Buat Kegiatan Master', size: 'wide', body, buttons: [{ label: 'Batal' }, { label: 'Buat Kegiatan', cls: 'primary', icon: 'add', onClick: async () => {
      if (!formCek(body, F)) return false;
      const d = formVal(body, F); d.salinDari = body.querySelector('[name=salinDari]').value; d.salinPanitia = body.querySelector('[name=salinPanitia]').checked; const p = body.querySelector('[name=paralel]'); d.izinkanParalel = p ? p.checked : false;
      toast('Membuat database kegiatan… (±10–30 detik)', 'info');
      const r = await API.write('kegiatan.create', d);
      if (!r.success) return false;
      Sesi.setKid(r.data.KegiatanID); await App.segarkanBoot(); muat(true);
    } }] });
  }
  view.querySelector('[data-new]').onclick = buat;
  view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const k = rows.find((x) => x.KegiatanID === b.dataset.id);
    if (b.dataset.a === 'buka') { Sesi.setKid(k.KegiatanID); SW.Store.trim(); await App.segarkanBoot(); App.go('dashboard'); }
    if (b.dataset.a === 'edit') {
      const body = document.createElement('div'); body.innerHTML = formHtml(F, k);
      modal({ title: 'Ubah Kegiatan', size: 'wide', body, buttons: [{ label: 'Batal' }, { label: 'Simpan', cls: 'primary', onClick: async () => { const d = formVal(body, F); d.KegiatanID = k.KegiatanID; const r = await API.write('kegiatan.update', d); if (!r.success) return false; muat(true); App.segarkanBoot(); } }] });
    }
    if (b.dataset.a === 'arsip' && await konfirmasi('Arsipkan <b>' + esc(k.Nama) + '</b>?<br>Data tetap tersimpan (hanya baca) dan tidak lagi tampil di dashboard.', { ya: 'Arsipkan', bahaya: true })) { await API.write('kegiatan.archive', { KegiatanID: k.KegiatanID }); if (k.KegiatanID === Sesi.kid) Sesi.setKid(''); await App.segarkanBoot(); muat(true); }
    if (b.dataset.a === 'unarsip') { await API.write('kegiatan.unarchive', { KegiatanID: k.KegiatanID }); muat(true); App.segarkanBoot(); }
  });
  await muat();
});

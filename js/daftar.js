/* Formulir publik Rekrutmen Panitia Mahasiswa — daftar.html?k=<KegiatanID>
   Isian: Foto profil, Nama lengkap, NIM, No. WhatsApp, Email, Divisi pilihan 1 & 2. Tanpa login. */
(function () {
  const { esc, API, toast, kompresGambar, tglID, konfigOK } = SW, { ic, kosong } = UI;
  const root = document.getElementById('daftar');
  const K = (new URLSearchParams(location.search).get('k') || '').trim();
  const KUNCI = 'sw_daftar:' + K;
  let D = null, foto = '';
  const simpanDraf = (o) => { try { localStorage.setItem(KUNCI, JSON.stringify(o)); } catch (e) { } };
  const bacaDraf = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || 'null') || {}; } catch (e) { return {}; } };
  const hapusDraf = () => { try { localStorage.removeItem(KUNCI); } catch (e) { } };

  const kepala = () => '<div class="guest-top"><div style="width:40px;height:40px;border-radius:12px;background:#1F1F1F;color:#FFD35C;display:grid;place-items:center;flex-shrink:0">' + ic('how_to_reg') + '</div>' +
    '<div style="flex:1;min-width:0"><b style="display:block;line-height:1.2">' + esc((D && D.institusi && (D.institusi.singkat || D.institusi.nama)) || 'Pendaftaran Panitia') + '</b><span class="tiny muted">' + esc((D && D.kegiatan && D.kegiatan.nama) || 'Wisuda') + '</span></div></div>';
  function gagal(judul, pesan, icon) { root.innerHTML = kepala() + '<div class="guest-body" style="padding-top:24px"><div class="card">' + kosong(judul, pesan, icon || 'link_off') + '</div></div>'; }

  async function muat() {
    if (!konfigOK()) return gagal('Aplikasi belum dikonfigurasi', 'Alamat server belum diisi oleh panitia.');
    if (!K) return gagal('Tautan tidak lengkap', 'Buka tautan pendaftaran persis seperti yang dibagikan panitia.');
    const r = await API.pub('rekrut.info', { k: K });
    if (!r.success) return gagal('Formulir tidak ditemukan', esc(r.message || 'Tautan tidak valid.'));
    D = r.data;
    document.title = 'Pendaftaran Panitia · ' + ((D.kegiatan && D.kegiatan.nama) || 'Wisuda');
    if (!D.buka) return gagal('Pendaftaran ditutup', esc(D.alasan || 'Pendaftaran panitia sedang ditutup. Pantau informasi berikutnya dari panitia.') + (D.info ? '<br><br>' + esc(D.info).replace(/\n/g, '<br>') : ''), 'lock');
    form();
  }

  function form() {
    const f = bacaDraf(), div = D.divisi || [], K_ = D.kegiatan || {};
    const opsi = (pilih, kosongTeks) => '<option value="">' + kosongTeks + '</option>' + div.map((d) => '<option value="' + esc(d.DivisiID) + '"' + (d.DivisiID === pilih ? ' selected' : '') + '>' + esc(d.Nama) + '</option>').join('');
    root.innerHTML = kepala() + '<div class="guest-body">' +
      '<div class="card dark" style="padding:18px"><div class="tiny" style="letter-spacing:.12em;color:#FFD35C">REKRUTMEN PANITIA MAHASISWA</div><div style="font-size:21px;font-weight:700;margin:4px 0 2px;line-height:1.25">' + esc(D.acara || K_.nama || 'Wisuda') + '</div>' +
        (K_.tanggal || K_.lokasi ? '<div class="small" style="opacity:.85">' + esc([K_.tanggal ? tglID(K_.tanggal) : '', K_.lokasi || ''].filter(Boolean).join(' · ')) + '</div>' : '') + '</div>' +
      (D.info ? '<div class="notice info">' + ic('info') + '<div class="small" style="line-height:1.55">' + esc(D.info).replace(/\n/g, '<br>') + '</div></div>' : '') +
      '<form class="card" data-f novalidate autocomplete="on">' +
        '<div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap"><label data-pfoto style="width:96px;height:120px;border:1.5px dashed #1F1F1F;border-radius:14px;background:#F7F5EF;display:grid;place-items:center;cursor:pointer;overflow:hidden;flex-shrink:0;text-align:center" title="Pilih foto">' +
          '<span class="small muted" style="padding:6px">' + ic('add_a_photo') + '<br>Foto profil</span></label>' +
          '<div style="min-width:0"><b>Foto profil <span style="color:var(--bad)">*</span></b><div class="small muted" style="line-height:1.5">Foto wajah jelas, latar polos (seperti pasfoto). Dipakai untuk kartu panitia.</div>' +
          '<label class="btn sm mt" style="cursor:pointer">' + ic('photo_camera') + 'Pilih foto<input type="file" accept="image/*" data-foto hidden></label></div></div>' +
        '<div class="form mt" style="grid-template-columns:minmax(0,1fr)">' +
          '<label class="field"><span>Nama lengkap <span style="color:var(--bad)">*</span></span><input class="inp" name="Nama" autocomplete="name" maxlength="120" placeholder="Sesuai KTM" value="' + esc(f.Nama || '') + '"></label>' +
          '<label class="field"><span>NIM <span style="color:var(--bad)">*</span></span><input class="inp" name="NIM" maxlength="30" inputmode="text" autocapitalize="characters" placeholder="Nomor Induk Mahasiswa" value="' + esc(f.NIM || '') + '"></label>' +
          '<label class="field"><span>No. WhatsApp <span style="color:var(--bad)">*</span></span><input class="inp" name="NoWA" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="08xxxxxxxxxx" value="' + esc(f.NoWA || '') + '"></label>' +
          '<label class="field"><span>Email <span style="color:var(--bad)">*</span></span><input class="inp" name="Email" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="nama@gmail.com" value="' + esc(f.Email || '') + '"><small class="tiny muted">Pakai akun Google (Gmail) — bila diterima, Anda masuk aplikasi panitia dengan email ini.</small></label>' +
          (div.length ? '<label class="field"><span>Divisi pilihan 1 <span style="color:var(--bad)">*</span></span><select class="inp" name="Divisi1">' + opsi(f.Divisi1, '— Pilih divisi —') + '</select></label>' +
            '<label class="field"><span>Divisi pilihan 2 (opsional)</span><select class="inp" name="Divisi2">' + opsi(f.Divisi2, '— Tidak ada —') + '</select></label>' : '') +
          '<label style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true">Situs web<input name="situs" tabindex="-1" autocomplete="off"></label>' +
          '<label class="check"><input type="checkbox" name="setuju"' + (f.setuju ? ' checked' : '') + '><span class="small">Data yang saya isi benar dan saya bersedia dihubungi panitia.</span></label>' +
        '</div><div data-err class="small mt" style="color:var(--bad)" role="alert"></div>' +
        '<button class="btn primary mt" type="submit" data-kirim style="width:100%;justify-content:center">' + ic('send') + 'Kirim pendaftaran</button></form>' +
      '<p class="tiny muted" style="text-align:center">Data hanya dipakai panitia untuk seleksi &amp; koordinasi kegiatan.</p></div>';
    const fm = root.querySelector('[data-f]'), err = root.querySelector('[data-err]');
    const ambil = () => { const o = {}; ['Nama', 'NIM', 'NoWA', 'Email', 'Divisi1', 'Divisi2', 'situs'].forEach((k) => { const el = fm.elements[k]; o[k] = el ? String(el.value || '').trim() : ''; }); o.setuju = fm.elements.setuju.checked; return o; };
    let tDraf = 0;
    fm.addEventListener('input', () => { clearTimeout(tDraf); tDraf = setTimeout(() => { const o = ambil(); delete o.situs; simpanDraf(o); }, 400); });
    fm.elements.NIM.addEventListener('blur', (e) => { e.target.value = e.target.value.replace(/\s+/g, '').toUpperCase(); });
    root.querySelector('[data-foto]').addEventListener('change', async (e) => {
      const fl = e.target.files && e.target.files[0]; if (!fl) return;
      try {
        const g = await kompresGambar(fl, 640, 0.85, 'image/jpeg'); foto = g.dataUrl;
        root.querySelector('[data-pfoto]').innerHTML = '<img src="' + foto + '" alt="Pratinjau foto" style="width:100%;height:100%;object-fit:cover">';
        err.textContent = '';
      } catch (x) { toast(x.message, 'err'); }
      e.target.value = '';
    });
    fm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const o = ambil(); o.NIM = o.NIM.replace(/\s+/g, '').toUpperCase();
      const hp = o.NoWA.replace(/[^0-9+]/g, '').replace(/^\+?62/, '0').replace(/^8/, '08');
      const salah = !foto ? 'Unggah foto profil terlebih dahulu.' : o.Nama.length < 3 ? 'Nama lengkap wajib diisi.' : !/^[A-Z0-9.\-\/]{4,30}$/.test(o.NIM) ? 'NIM tidak valid (4–30 karakter, huruf/angka).' :
        !/^08\d{8,12}$/.test(hp) ? 'Nomor WhatsApp tidak valid (contoh 081234567890).' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.Email) ? 'Email tidak valid.' :
        (div.length && !o.Divisi1) ? 'Pilih divisi pilihan pertama.' : (o.Divisi2 && o.Divisi2 === o.Divisi1) ? 'Divisi pilihan 2 harus berbeda dari pilihan 1.' : !o.setuju ? 'Centang pernyataan persetujuan.' : '';
      if (salah) { err.textContent = salah; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      err.textContent = '';
      const b = root.querySelector('[data-kirim]'); b.disabled = true; b.innerHTML = ic('hourglass_top') + 'Mengirim…';
      const r = await API.pub('rekrut.daftar', { k: K, Nama: o.Nama, NIM: o.NIM, NoWA: hp, Email: o.Email.toLowerCase(), Divisi1: o.Divisi1, Divisi2: o.Divisi2, situs: o.situs, foto });
      if (!r.success) { b.disabled = false; b.innerHTML = ic('send') + 'Kirim pendaftaran'; err.textContent = r.message || 'Gagal mengirim. Coba lagi.'; return; }
      hapusDraf(); foto = ''; selesai(r.data || {}, r.message);
    });
  }

  function selesai(x, pesan) {
    root.innerHTML = kepala() + '<div class="guest-body"><div class="card" style="text-align:center;padding:26px 18px">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:var(--mint);border:1.5px solid #1F1F1F;display:grid;place-items:center;margin:0 auto 12px">' + ic('check') + '</div>' +
      '<h3 style="margin:0 0 6px">Pendaftaran terkirim</h3><p class="small muted" style="margin:0 0 14px;line-height:1.55">' + esc(pesan || 'Panitia akan menghubungi Anda lewat WhatsApp/email.') + '</p>' +
      '<div class="card flat" style="text-align:left;padding:12px"><div class="small"><span class="muted">Nama</span><br><b>' + esc(x.Nama || '') + '</b></div><div class="small mt"><span class="muted">NIM</span><br><b>' + esc(x.NIM || '') + '</b></div>' +
        (x.Divisi1 ? '<div class="small mt"><span class="muted">Pilihan divisi</span><br><b>' + esc(x.Divisi1) + (x.Divisi2 ? ' · ' + esc(x.Divisi2) : '') + '</b></div>' : '') +
        (x.PendaftarID ? '<div class="tiny muted mt">No. pendaftaran: ' + esc(x.PendaftarID) + '</div>' : '') + '</div>' +
      '<button class="btn mt" data-lagi style="width:100%;justify-content:center">' + ic('person_add') + 'Daftarkan teman</button></div></div>';
    root.querySelector('[data-lagi]').onclick = () => form();
  }

  muat();
})();

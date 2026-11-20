/* Pengumuman — Koordinator Umum ke semua sasaran; Kepala Divisi hanya ke anggota divisinya. Pop-up + WA/Email opsional */
App.page('pengumuman', async function (view) {
  const { esc, API, SWR, Sesi, konfirmasi, toast } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  const pembuat = App.boleh('pengumuman', Sesi.is('SUPERADMIN', 'KOORDINATOR', 'KADIV')) && !App.arsip(), kd = Sesi.is('KADIV');
  const notif = App.boot.settings || {};
  view.innerHTML = App.head('Pengumuman', kd ? 'Kirim pengumuman ke anggota divisi Anda — muncul sebagai pop-up di aplikasi mereka.' : 'Pengumuman muncul sebagai pop-up di aplikasi panitia; tamu & wisudawan melihatnya di tautan undangan pribadi.') +
    '<div class="grid ' + (pembuat ? 'g2' : '') + '"><div class="col" data-list>' + UI.skeleton(5) + '</div>' + (pembuat ? '<div class="card" data-form></div>' : '') + '</div>';
  const elList = view.querySelector('[data-list]'), elForm = view.querySelector('[data-form]');
  if (elForm) {
    const divOpt = (App.boot.divisi || []).map((d) => '<label class="chip check"><input type="checkbox" data-div value="' + d.DivisiID + '">' + esc(d.Nama) + '</label>').join('');
    elForm.innerHTML = '<h3>' + ic('edit_square') + ' Tulis Pengumuman</h3><div class="col mt"><label class="field"><span>Judul</span><input data-j placeholder="Mis. Gladi bersih dimajukan 30 menit"></label><label class="field"><span>Isi pengumuman</span><textarea data-i rows="5"></textarea></label>' +
      (kd ? '<div class="notice info">' + ic('groups') + '<div>Sasaran: anggota divisi Anda.</div></div>' :
        '<div class="field"><span>Sasaran</span><div class="chipset"><label class="chip check"><input type="checkbox" data-semua> <b>Semua</b></label><label class="chip check"><input type="checkbox" data-tamu value="VVIP">Tamu VVIP</label><label class="chip check"><input type="checkbox" data-tamu value="VIP">Tamu VIP</label><label class="chip check"><input type="checkbox" data-tamu value="DOSEN">Dosen</label><label class="chip check"><input type="checkbox" data-tamu value="UMUM">Tamu Umum</label><label class="chip check"><input type="checkbox" data-wis>Wisudawan</label><label class="chip check"><input type="checkbox" data-pan value="PEGAWAI">Panitia Pegawai</label><label class="chip check"><input type="checkbox" data-pan value="MAHASISWA">Panitia Acara</label></div></div><details><summary class="small b" style="cursor:pointer">Divisi tertentu</summary><div class="chipset mt">' + divOpt + '</div></details>') +
      '<div class="field"><span>Kanal</span><div class="chipset"><label class="chip check"><input type="checkbox" checked disabled> Pop-up aplikasi</label><label class="chip check"><input type="checkbox" data-k value="wa"' + (notif.NOTIF_WA_AKTIF === 'YA' ? '' : ' disabled') + '> WhatsApp ' + (notif.NOTIF_WA_AKTIF === 'YA' ? '' : ic('lock')) + '</label><label class="chip check"><input type="checkbox" data-k value="email"' + (notif.NOTIF_EMAIL_AKTIF === 'YA' ? '' : ' disabled') + '> Email ' + (notif.NOTIF_EMAIL_AKTIF === 'YA' ? '' : ic('lock')) + '</label></div><small>WA/Email diaktifkan Superadmin di Pengaturan → Notifikasi.</small></div>' +
      '<label class="check"><input type="checkbox" data-p> Prioritas tinggi (penanda merah)</label><button class="btn primary lg" data-kirim>' + ic('send') + 'Kirim Pengumuman</button></div>' +
      '<div class="mt"><b class="small">Pratinjau pop-up</b><div class="card" style="margin-top:8px;box-shadow:4px 4px 0 #1F1F1F"><div style="background:#FFD35C;border:1.5px solid #1F1F1F;border-radius:10px;padding:4px 10px;font-size:12px" data-pv1>' + esc(Sesi.me.nama) + '</div><b style="display:block;margin:10px 0 4px" data-pv2>Judul pengumuman</b><div class="small" style="white-space:pre-wrap" data-pv3>Isi pengumuman…</div></div></div>';
    const q = (s) => elForm.querySelector(s);
    elForm.addEventListener('input', () => { q('[data-pv2]').textContent = q('[data-j]').value || 'Judul pengumuman'; q('[data-pv3]').textContent = q('[data-i]').value || 'Isi pengumuman…'; });
    q('[data-kirim]').onclick = async () => {
      const target = kd ? {} : { semua: q('[data-semua]').checked, tamu: [...elForm.querySelectorAll('[data-tamu]:checked')].map((x) => x.value), wisudawan: q('[data-wis]').checked, panitia: [...elForm.querySelectorAll('[data-pan]:checked')].map((x) => x.value), divisi: [...elForm.querySelectorAll('[data-div]:checked')].map((x) => x.value) };
      const r = await API.write('pengumuman.create', { Judul: q('[data-j]').value, Isi: q('[data-i]').value, target, kanal: [...elForm.querySelectorAll('[data-k]:checked')].map((x) => x.value), Prioritas: q('[data-p]').checked ? 'TINGGI' : 'NORMAL' });
      if (r.success) { q('[data-j]').value = ''; q('[data-i]').value = ''; muat(true); App.cekPengumuman(true); }
    };
  }
  async function muat(fresh) {
    if (pembuat) {
      await SWR.load('pengumuman.list', {}, (rows) => {
        if (!rows) return;
        elList.innerHTML = rows.length ? rows.map((g) => '<div class="card"><div class="row sb"><b>' + (g.Prioritas === 'TINGGI' ? '🔴 ' : '') + esc(g.Judul) + '</b><div class="row">' + pill(g.dibaca + '/' + (g.JumlahPenerima || 0) + ' dibaca', 'info') + '<button class="btn xs ghost" data-del="' + g.PengumumanID + '">' + ic('delete') + '</button></div></div><div class="small muted" style="margin:4px 0 8px">' + esc(g.PembuatNama) + ' · ' + esc(SW.tglID(g.Waktu, true)) + ' · Untuk: ' + esc(g.target) + ' · ' + esc(String(g.Kanal || '').replace(/,/g, ' + ')) + '</div><div style="white-space:pre-wrap">' + esc(g.Isi) + '</div></div>').join('') : '<div class="card">' + kosong('Belum ada pengumuman', '', 'campaign') + '</div>';
      }, { maxAge: 0, fresh });
    } else {
      await App.cekPengumuman(true);
      const items = App._inbox || [];
      elList.innerHTML = items.length ? items.map((g) => '<div class="card"><b>' + esc(g.judul) + '</b><div class="small muted" style="margin:4px 0 8px">' + esc(g.pembuat) + ' · ' + esc(SW.tglID(g.waktu, true)) + '</div><div style="white-space:pre-wrap">' + esc(g.isi) + '</div></div>').join('') : '<div class="card">' + kosong('Belum ada pengumuman untuk Anda', '', 'campaign') + '</div>';
    }
  }
  elList.addEventListener('click', async (e) => { const d = e.target.closest('[data-del]'); if (d && await konfirmasi('Hapus pengumuman ini?', { bahaya: true })) { await API.write('pengumuman.delete', { id: d.dataset.del }); muat(true); } });
  muat();
});

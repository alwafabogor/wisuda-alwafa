/* WhatsApp & CRM — Blast per batch (10/20/50), antrean & riwayat, CRM Kontak (Nama · Email · WA) */
App.page('wa', async function (view, params) {
  const { esc, API, Sesi, modal, drawer, konfirmasi, toast, angka, tglID, jamID, debounce, eksporXLSX, lib } = SW, { ic, pill, kosong } = UI;
  if (App.perluKegiatan(view)) return;
  let tab = ['blast', 'antrean', 'crm'].indexOf(params.tab) > -1 ? params.tab : 'blast', cfg = null;
  view.innerHTML = App.head('WhatsApp & CRM', 'Kirim pesan bertahap per batch agar aman dari pemblokiran. Semua kontak wisudawan, tamu, dan panitia terkumpul di CRM.', '<a class="btn sm" href="#/pengaturan?tab=notif">' + ic('tune') + 'Pengaturan notifikasi</a>') +
    '<div data-status></div><div class="tabs" data-t><button data-v="blast">' + ic('campaign') + 'Blast WA</button><button data-v="antrean">' + ic('schedule_send') + 'Antrean & Riwayat</button><button data-v="crm">' + ic('contacts') + 'CRM Kontak</button></div><div data-body>' + UI.skeleton(8) + '</div>';
  const body = view.querySelector('[data-body]');
  const waktu = (s) => s ? tglID(s) + ' ' + jamID(s) : '-';

  async function status() {
    const el = view.querySelector('[data-status]');
    if (!Sesi.is('SUPERADMIN')) { el.innerHTML = ''; return; }
    const r = await API.read('notif.config', {}); if (!r.success) return; cfg = r.data;
    el.innerHTML = '<div class="row mb" style="gap:8px">' + pill('WhatsApp ' + (cfg.waAktif ? 'AKTIF' : 'NONAKTIF'), cfg.waAktif ? 'ok' : 'warn') + pill('Email ' + (cfg.emailAktif ? 'AKTIF' : 'NONAKTIF'), cfg.emailAktif ? 'ok' : 'mute') + pill(cfg.tokenAda ? 'Token Fonnte ' + cfg.token : 'Token Fonnte belum diisi', cfg.tokenAda ? 'mute' : 'bad') + pill(cfg.trigger ? 'Pengirim otomatis berjalan' : 'Trigger belum terpasang', cfg.trigger ? 'ok' : 'warn') + '<span class="small muted">Sisa kuota email hari ini: ' + angka(cfg.kuotaEmail) + '</span></div>';
  }

  /* ============================================================ BLAST */
  let aud = null, pilih = new Set(), blTimer = null;
  async function blast() {
    const SUMBER = [['', 'Semua kontak CRM'], ['Wisudawan', 'Wisudawan'], ['Tamu', 'Tamu'], ['Panitia', 'Panitia'], ['Manual', 'Manual'], ['__manual', 'Tempel nomor manual']];
    body.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px" data-g>' +
      '<div class="col"><div class="card"><b>1. Penerima</b><div class="grid g3 mt"><label class="field"><span>Sumber / segmen</span><select class="inp" data-seg>' + SUMBER.map((s) => '<option value="' + s[0] + '">' + s[1] + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Kategori tamu</span><select class="inp" data-kat><option value="">Semua</option>' + ['VVIP', 'VIP', 'DOSEN', 'UMUM'].map((k) => '<option>' + k + '</option>').join('') + '</select></label><label class="field"><span>Tag</span><input class="inp" data-tag placeholder="mis. ortu"></label></div>' +
      '<label class="field mt" data-manualbox hidden><span>Satu baris: <code>08xxxx|Nama</code></span><textarea class="inp" rows="4" data-manual placeholder="081234567890|Bapak Ahmad"></textarea></label>' +
      '<div class="row mt"><button class="btn sm" data-muat>' + ic('group_add') + 'Muat penerima</button><button class="btn sm" data-cekwa>' + ic('verified') + 'Cek nomor terdaftar WA</button><label class="check small"><input type="checkbox" data-hanyawa> Hanya yang terdaftar WA</label></div><div data-aud class="mt"></div></div>' +
      '<div class="card"><b>2. Pesan</b><label class="field mt"><span>Judul blast (internal)</span><input class="inp" data-judul value="Undangan ' + esc((App.boot.kegiatan || {}).Nama || 'Wisuda') + '"></label>' +
      '<label class="field mt"><span>Isi pesan · variabel: {nama} {acara} {hari_tanggal} {jam} {lokasi} {institusi}</span><textarea class="inp" rows="7" data-pesan>Assalamu\'alaikum {nama},\n\nDengan hormat, kami mengundang Bapak/Ibu pada *{acara}* yang insyaAllah dilaksanakan pada:\n🗓 {hari_tanggal}\n⏰ Pukul {jam} WIB\n📍 {lokasi}\n\nAtas perhatian dan kehadirannya kami ucapkan terima kasih.\n— Panitia Wisuda {institusi}</textarea></label>' +
      '<div class="grid g3 mt"><label class="field"><span>Ukuran batch</span><div class="seg" data-batch>' + [10, 20, 50].map((n) => '<button data-v="' + n + '">' + n + '</button>').join('') + '</div></label><label class="field"><span>Jeda antarpesan (detik)</span><input class="inp" data-jeda value="' + esc(cfg ? cfg.jeda : '5') + '" placeholder="5 atau 3-8"></label><div class="field"><span>Perkiraan</span><div class="small" data-est>-</div></div></div>' +
      '<div class="row mt end"><button class="btn primary" data-buat>' + ic('send') + 'Buat blast & mulai kirim</button></div></div></div>' +
      '<div class="col"><div class="card"><b>Pratinjau</b><div class="wa-preview mt"><div class="bub" data-prev></div></div></div><div class="card"><div class="row sb"><b>Blast berjalan & terakhir</b><button class="btn xs" data-refbl>' + ic('refresh') + '</button></div><div data-bl class="col mt">' + UI.skeleton(3) + '</div></div></div></div>';
    let batch = cfg ? cfg.batchDefault : 20;
    const g = (s) => body.querySelector(s), syncBatch = () => g('[data-batch]').querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === batch));
    syncBatch();
    const v = Object.assign({ nama: 'Bapak Ahmad' }, App.boot.vars || {});
    const prev = () => { g('[data-prev]').innerHTML = esc(g('[data-pesan]').value.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>'); };
    const est = () => { const n = penerima().length, j = String(g('[data-jeda]').value).split('-').map(Number), rata = j.length > 1 ? (j[0] + j[1]) / 2 : j[0] || 5; g('[data-est]').innerHTML = n ? '<b>' + angka(n) + '</b> pesan · ' + Math.ceil(n / batch) + ' batch · ±' + Math.ceil(n * rata / 60) + ' menit' : 'Muat penerima dulu'; };
    const r0 = await API.read('kegiatan.variabel', {}); if (r0.success) Object.assign(v, r0.data); prev();
    g('[data-pesan]').addEventListener('input', debounce(prev, 120));
    g('[data-jeda]').addEventListener('input', est);
    g('[data-batch]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { batch = Number(b.dataset.v); syncBatch(); est(); } });
    g('[data-seg]').addEventListener('change', () => { g('[data-manualbox]').hidden = g('[data-seg]').value !== '__manual'; });
    g('[data-hanyawa]').addEventListener('change', () => { renderAud(); est(); });
    function penerima() { if (!aud) return []; const hw = g('[data-hanyawa]').checked; return aud.rows.filter((x) => x.valid && !x.ganda && !x.optOut && pilih.has(x.id) && (!hw || x.statusWA === 'Terdaftar')); }
    function renderAud() {
      const el = g('[data-aud]'); if (!aud) { el.innerHTML = ''; return; }
      const R = aud.ringkas, hw = g('[data-hanyawa]').checked;
      el.innerHTML = '<div class="row" style="gap:6px">' + pill(angka(R.total) + ' total', 'dark') + pill(angka(R.valid) + ' nomor valid', 'ok') + (R.tidakValid ? pill(angka(R.tidakValid) + ' tidak valid', 'bad') : '') + (R.ganda ? pill(angka(R.ganda) + ' ganda', 'warn') : '') + (R.optOut ? pill(angka(R.optOut) + ' opt-out', 'mute') : '') + pill(angka(R.terdaftarWA) + ' terdaftar WA', 'info') + '</div>' +
        '<div class="tbl-wrap mt" style="max-height:300px;overflow:auto"><table class="tbl compact"><thead><tr><th><input type="checkbox" data-all checked></th><th>Nama</th><th>Nomor</th><th>Segmen</th><th>WA</th></tr></thead><tbody>' +
        aud.rows.slice(0, 1500).map((x) => { const bisa = x.valid && !x.ganda && !x.optOut && (!hw || x.statusWA === 'Terdaftar'); return '<tr style="' + (bisa ? '' : 'opacity:.45') + '"><td><input type="checkbox" data-p="' + esc(x.id) + '"' + (pilih.has(x.id) && bisa ? ' checked' : '') + (bisa ? '' : ' disabled') + '></td><td>' + esc(x.nama || '-') + '</td><td class="num">' + esc(x.hp || '-') + '</td><td>' + esc(x.segmen + (x.kategori ? ' · ' + x.kategori : '')) + '</td><td>' + (x.optOut ? pill('Opt-out', 'mute') : !x.valid ? pill('Tidak valid', 'bad') : x.ganda ? pill('Ganda', 'warn') : pill(x.statusWA || 'Belum dicek', x.statusWA === 'Terdaftar' ? 'ok' : x.statusWA ? 'bad' : 'mute')) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (aud.rows.length > 1500 ? '<div class="tiny muted">Menampilkan 1.500 dari ' + angka(aud.rows.length) + ' (semua tetap ikut terkirim bila dicentang).</div>' : '');
    }
    g('[data-aud]').addEventListener('change', (e) => {
      if (e.target.matches('[data-all]')) { aud.rows.forEach((x) => e.target.checked ? pilih.add(x.id) : pilih.delete(x.id)); renderAud(); }
      if (e.target.dataset.p) e.target.checked ? pilih.add(e.target.dataset.p) : pilih.delete(e.target.dataset.p);
      est();
    });
    async function muatAud() {
      const seg = g('[data-seg]').value, man = seg === '__manual';
      const r = await API.read('wa.audience', man ? { sumber: 'manual', manual: g('[data-manual]').value } : { segmen: seg, kategori: g('[data-kat]').value, tag: g('[data-tag]').value.trim() }, { fresh: true });
      if (!r.success) return toast(r.message, 'err');
      aud = r.data; pilih = new Set(aud.rows.map((x) => x.id)); renderAud(); est();
    }
    async function cekWA() {
      if (!aud) await muatAud(); if (!aud) return;
      const nomor = [...new Set(aud.rows.filter((x) => x.valid && !x.statusWA).map((x) => x.hp))];
      if (!nomor.length) return toast('Semua nomor sudah dicek.', 'ok');
      const b = g('[data-cekwa]'); b.disabled = true;
      for (let i = 0; i < nomor.length; i += 50) {
        b.innerHTML = ic('hourglass_top') + 'Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length;
        const r = await API.write('wa.validate', { nomor: nomor.slice(i, i + 50) }, { silent: true });
        if (!r.success) { toast(r.message, 'warn'); break; }
        aud.rows.forEach((x) => { if (r.data.peta[x.hp]) x.statusWA = r.data.peta[x.hp]; });
        renderAud();
      }
      aud.ringkas.terdaftarWA = aud.rows.filter((x) => x.statusWA === 'Terdaftar').length; renderAud();
      b.disabled = false; b.innerHTML = ic('verified') + 'Cek nomor terdaftar WA';
    }
    g('[data-muat]').onclick = muatAud; g('[data-cekwa]').onclick = cekWA;
    g('[data-buat]').onclick = async () => {
      const list = penerima(); if (!list.length) return toast('Belum ada penerima terpilih.', 'warn');
      if (!(await konfirmasi('Kirim ke ' + angka(list.length) + ' nomor dalam ' + Math.ceil(list.length / batch) + ' batch @' + batch + '?', { ya: 'Mulai blast' }))) return;
      const r = await API.write('wa.blastCreate', { judul: g('[data-judul]').value, pesan: g('[data-pesan]').value, ukuranBatch: batch, jeda: g('[data-jeda]').value, sasaran: g('[data-seg]').value || 'CRM', penerima: list.map((x) => ({ id: x.id, hp: x.hp, nama: x.nama })) });
      if (r.success) { aud = null; renderAud(); est(); daftarBlast(); API.write('wa.blastProcess', { blastId: r.data.BlastID }, { silent: true }).then(daftarBlast); }
    };
    g('[data-refbl]').onclick = daftarBlast;
    g('[data-bl]').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.next) { b.disabled = true; b.innerHTML = ic('hourglass_top') + 'Mengirim…'; await API.read('wa.blastProcess', { blastId: b.dataset.next }, { fresh: true }); daftarBlast(); }
      if (b.dataset.stop && await konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { bahaya: true })) { await API.write('wa.blastStop', { blastId: b.dataset.stop }); daftarBlast(); }
      if (b.dataset.lihat) { tab = 'antrean'; buka(b.dataset.lihat); }
    });
    daftarBlast();
  }
  async function daftarBlast() {
    const el = body.querySelector('[data-bl]'); if (!el) return;
    const r = await API.read('wa.blastList', {}, { fresh: true }); if (!r.success) return;
    el.innerHTML = r.data.length ? r.data.slice(0, 12).map((b) => '<div class="card flat" style="padding:12px"><div class="row sb"><b class="small">' + esc(b.Judul) + '</b>' + pill(b.Status) + '</div><div class="trk mt" style="height:8px;background:#ECE8DF;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:' + b.persen + '%;background:#2E9466"></i></div>' +
      '<div class="row sb mt tiny"><span>' + angka(b.Terkirim) + ' terkirim · ' + angka(b.Gagal) + ' gagal · ' + angka(b.sisa) + ' sisa / ' + angka(b.Total) + '</span><span class="muted">batch ' + b.UkuranBatch + ' · ' + waktu(b.Tanggal) + '</span></div>' +
      '<div class="row mt" style="gap:6px">' + (b.Status === 'Berjalan' && b.sisa ? '<button class="btn xs primary" data-next="' + b.BlastID + '">' + ic('fast_forward') + 'Kirim batch berikutnya</button><button class="btn xs" data-stop="' + b.BlastID + '">' + ic('stop') + 'Hentikan</button>' : '') + '<button class="btn xs" data-lihat="' + b.BlastID + '">' + ic('list') + 'Rincian</button></div></div>').join('') : kosong('Belum ada blast', 'Blast pertama akan tampil di sini.', 'campaign');
    if (!blTimer && r.data.some((b) => b.Status === 'Berjalan')) blTimer = App.every(15000, () => { if (tab === 'blast') daftarBlast(); });
  }

  /* ============================================================ ANTREAN */
  async function antrean(blastId) {
    body.innerHTML = '<div data-tb></div>';
    const t = UI.table(body.querySelector('[data-tb]'), {
      key: 'AntrianID', compact: true, select: Sesi.is('SUPERADMIN'), filters: [['', 'Semua'], ['Antri', 'Antri'], ['Terkirim', 'Terkirim'], ['Gagal', 'Gagal'], ['Batal', 'Batal']], filterFn: (r, f) => r.Status === f, searchKeys: ['NamaPenerima', 'Tujuan', 'Event', 'Pesan'],
      tools: (blastId ? pill('Blast ' + blastId, 'info') + '<button class="btn xs" data-semua>Semua</button>' : '') + '<button class="btn sm" data-proses>' + ic('play_arrow') + 'Proses sekarang</button>' + (Sesi.is('SUPERADMIN') ? '<button class="btn sm" data-retry>' + ic('replay') + 'Ulang yang gagal</button>' : '') + '<button class="btn sm" data-xls>' + ic('download') + '</button>',
      cols: [{ k: 'DibuatPada', label: 'Waktu', render: (r) => '<span class="tiny">' + waktu(r.DikirimPada || r.DibuatPada) + '</span>' }, { k: 'Kanal', label: 'Kanal', render: (r) => pill(r.Kanal, r.Kanal === 'WA' ? 'ok' : 'info') }, { k: 'NamaPenerima', label: 'Penerima', render: (r) => '<b>' + esc(r.NamaPenerima || '-') + '</b><div class="tiny muted">' + esc(r.Tujuan) + '</div>' }, { k: 'Event', label: 'Jenis', render: (r) => esc(r.Event === 'BLAST' ? 'Blast' : r.Event) }, { k: 'Pesan', label: 'Pesan', render: (r) => '<span class="tiny" title="' + esc(r.Pesan) + '">' + esc(String(r.Subjek ? r.Subjek + ' — ' : '') + String(r.Pesan).slice(0, 70)) + '…</span>' }, { k: 'Status', label: 'Status', render: (r) => pill(r.Status) + (r.Respon && r.Status !== 'Terkirim' ? '<div class="tiny muted">' + esc(String(r.Respon).slice(0, 60)) + '</div>' : '') }]
    });
    const muat = async () => { const r = await API.read('notif.queue', blastId ? { blastId } : {}, { fresh: true }); if (r.success) { t.set(r.data.rows || r.data); const s = r.data.ringkas; if (s) t.tools.insertAdjacentHTML('afterbegin', ''); } };
    t.tools.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.matches('[data-semua]')) return antrean();
      if (b.matches('[data-proses]')) { b.disabled = true; const r = await API.read('notif.processNow', {}, { fresh: true }); toast(r.success ? 'Diproses: ' + JSON.stringify(r.data && (r.data.terkirim != null ? { terkirim: r.data.terkirim, gagal: r.data.gagal } : r.data)) : r.message, r.success ? 'ok' : 'err'); b.disabled = false; muat(); }
      if (b.matches('[data-retry]')) { await API.write('notif.retry', { ids: t.selected() }); t.clearSel(); muat(); }
      if (b.matches('[data-xls]')) eksporXLSX(t.rows().map((r) => ({ Waktu: r.DikirimPada || r.DibuatPada, Kanal: r.Kanal, Penerima: r.NamaPenerima, Tujuan: r.Tujuan, Jenis: r.Event, Status: r.Status, Respon: r.Respon, Pesan: r.Pesan })), 'Antrean notifikasi');
    });
    muat();
  }

  /* ============================================================ CRM */
  const crmQ = { cari: '', segmen: '', statusWA: '', halaman: 1, per: 50 };
  let crmSel = new Set();
  async function crm() {
    const box = document.createElement('div'); body.innerHTML = ''; body.appendChild(box);
    box.innerHTML = '<div class="grid g4 mb" data-stats>' + UI.skeleton(2) + '</div><div class="card pad0"><div class="row" style="padding:14px;gap:10px"><div class="search" style="width:min(300px,100%)"><input class="inp" placeholder="Cari nama / email / nomor…" data-q value="' + esc(crmQ.cari) + '"><button tabindex="-1">' + ic('search') + '</button></div>' +
      '<select class="inp sm" data-seg style="width:auto"><option value="">Semua segmen</option></select><select class="inp sm" data-swa style="width:auto"><option value="">Status WA</option><option value="Terdaftar">Terdaftar</option><option value="Tidak Terdaftar">Tidak terdaftar</option><option value="belum">Belum dicek</option></select><span class="sp"></span>' +
      '<button class="btn sm" data-sync>' + ic('sync') + 'Sinkron</button><button class="btn sm" data-imp>' + ic('upload') + 'Import</button>' + (Sesi.is('SUPERADMIN') ? '<button class="btn sm" data-exp>' + ic('download') + 'Ekspor</button>' : '') + '</div><div data-bulk class="row" style="padding:0 14px 10px;gap:6px" hidden></div><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th style="width:34px"><input type="checkbox" data-all></th><th>Nama</th><th>WhatsApp</th><th>Email</th><th>Segmen</th><th>Tag</th><th>Pesan</th><th>Terakhir</th></tr></thead><tbody data-rows></tbody></table></div><div class="pager" data-pg></div></div>';
    const g = (s) => box.querySelector(s);
    API.read('crm.stats', {}).then((r) => {
      if (!r.success) return; const s = r.data;
      g('[data-stats]').innerHTML = [['Total kontak', s.total, 'contacts', 'yellow', s.baru7 + ' baru 7 hari'], ['Nomor WA valid', s.waValid, 'call', 'mint', s.terdaftarWA + ' terdaftar WA · ' + s.belumCek + ' belum dicek'], ['Email valid', s.emailValid, 'mail', 'lilac', s.tidakBisa + ' tak bisa dihubungi'], ['Duplikat / opt-out', s.duplikat + ' / ' + s.optOut, 'content_copy', 'peach', s.dihubungi30 + ' dihubungi 30 hari']].map((x) => '<div class="card ' + x[3] + '" style="padding:16px"><div class="row sb small b">' + x[0] + ic(x[2]) + '</div><div style="font-size:28px;font-weight:700;margin:8px 0 2px">' + (typeof x[1] === 'number' ? angka(x[1]) : x[1]) + '</div><div class="tiny">' + esc(x[4]) + '</div></div>').join('');
      g('[data-seg]').innerHTML = '<option value="">Semua segmen</option>' + Object.keys(s.segmen).map((k) => '<option' + (crmQ.segmen === k ? ' selected' : '') + ' value="' + esc(k) + '">' + esc(k) + ' (' + s.segmen[k] + ')</option>').join('');
    });
    g('[data-swa]').value = crmQ.statusWA;
    g('[data-q]').addEventListener('input', debounce(() => { crmQ.cari = g('[data-q]').value.trim(); crmQ.halaman = 1; daftar(); }, 300));
    g('[data-seg]').onchange = () => { crmQ.segmen = g('[data-seg]').value; crmQ.halaman = 1; daftar(); };
    g('[data-swa]').onchange = () => { crmQ.statusWA = g('[data-swa]').value; crmQ.halaman = 1; daftar(); };
    async function daftar() {
      const r = await API.read('crm.list', crmQ); if (!r.success) return;
      const D = r.data;
      if (!D.total && !crmQ.cari && !crmQ.segmen && !crmQ.statusWA) { g('[data-rows]').innerHTML = '<tr><td colspan="8">' + kosong('CRM masih kosong', 'Klik Sinkron untuk menarik kontak dari wisudawan, tamu, dan panitia.', 'contacts', '<button class="btn primary" data-sync2>' + ic('sync') + 'Sinkron sekarang</button>') + '</td></tr>'; return; }
      g('[data-rows]').innerHTML = D.rows.map((k) => '<tr data-id="' + k.KontakID + '" style="cursor:pointer"><td><input type="checkbox" data-sel="' + k.KontakID + '"' + (crmSel.has(k.KontakID) ? ' checked' : '') + '></td><td><b>' + esc(k.Nama || '-') + '</b>' + (k.duplikat ? ' ' + pill('duplikat', 'warn') : '') + (k.OptOut === 'YA' ? ' ' + pill('opt-out', 'mute') : '') + '</td><td class="num">' + esc(k.NoWA || '-') + ' ' + (k.StatusWA ? pill(k.StatusWA === 'Terdaftar' ? 'WA ✓' : 'bukan WA', k.StatusWA === 'Terdaftar' ? 'ok' : 'bad') : '') + '</td><td class="small">' + esc(k.Email || '-') + '</td><td>' + pill(k.Segmen, 'mute') + '</td><td class="tiny">' + esc(k.Tag || '') + '</td><td class="num">' + angka(k.JumlahPesan || 0) + '</td><td class="tiny">' + (k.TerakhirDihubungi ? tglID(k.TerakhirDihubungi) : '-') + '</td></tr>').join('') || '<tr><td colspan="8">' + kosong('Tidak ada kontak yang cocok', '', 'search_off') + '</td></tr>';
      const pages = Math.max(1, Math.ceil(D.total / crmQ.per));
      g('[data-pg]').innerHTML = '<span>' + angka(D.total) + ' kontak' + (D.sinkron ? ' · sinkron ' + waktu(D.sinkron) : '') + '</span>' + (pages > 1 ? '<span class="row" style="gap:4px"><button class="btn xs" data-hal="-1"' + (crmQ.halaman < 2 ? ' disabled' : '') + '>‹</button>' + crmQ.halaman + ' / ' + pages + '<button class="btn xs" data-hal="1"' + (crmQ.halaman >= pages ? ' disabled' : '') + '>›</button></span>' : '');
    }
    function bulkBar() {
      const el = g('[data-bulk]'); el.hidden = !crmSel.size;
      el.innerHTML = '<b class="small">' + crmSel.size + ' dipilih</b><button class="btn xs" data-b="tag">' + ic('sell') + 'Beri tag</button><button class="btn xs" data-b="untag">Hapus tag</button><button class="btn xs" data-b="optout">' + ic('block') + 'Opt-out</button><button class="btn xs" data-b="optin">Opt-in</button><button class="btn xs" data-b="clear">Batal pilih</button>';
    }
    box.addEventListener('change', (e) => {
      if (e.target.dataset.sel) { e.target.checked ? crmSel.add(e.target.dataset.sel) : crmSel.delete(e.target.dataset.sel); bulkBar(); }
      if (e.target.matches('[data-all]')) { box.querySelectorAll('[data-sel]').forEach((c) => { c.checked = e.target.checked; e.target.checked ? crmSel.add(c.dataset.sel) : crmSel.delete(c.dataset.sel); }); bulkBar(); }
    });
    box.addEventListener('click', async (e) => {
      if (e.target.closest('input')) return;
      const b = e.target.closest('button');
      if (b && (b.matches('[data-sync]') || b.matches('[data-sync2]'))) { b.disabled = true; const r = await API.write('crm.sync', {}); b.disabled = false; if (r.success) crm(); return; }
      if (b && b.dataset.hal) { crmQ.halaman += Number(b.dataset.hal); daftar(); return; }
      if (b && b.matches('[data-exp]')) { const r = await API.read('crm.export', crmQ, { fresh: true }); if (r.success) eksporXLSX(r.data.rows.map((k) => ({ Nama: k.Nama, WhatsApp: k.NoWA, StatusWA: k.StatusWA, Email: k.Email, Segmen: k.Segmen, Tag: k.Tag, OptOut: k.OptOut, JumlahPesan: k.JumlahPesan, TerakhirDihubungi: k.TerakhirDihubungi, Catatan: k.Catatan })), 'CRM Kontak'); return; }
      if (b && b.matches('[data-imp]')) return impor();
      if (b && b.dataset.b) {
        if (b.dataset.b === 'clear') { crmSel.clear(); bulkBar(); daftar(); return; }
        let nilai = ''; if (b.dataset.b === 'tag' || b.dataset.b === 'untag') { nilai = (prompt('Nama tag:') || '').trim(); if (!nilai) return; }
        await API.write('crm.bulk', { ids: [...crmSel], aksi: b.dataset.b, nilai }); crmSel.clear(); bulkBar(); daftar(); return;
      }
      const tr = e.target.closest('tr[data-id]'); if (tr) detail(tr.dataset.id);
    });
    daftar();
  }
  async function detail(id) {
    const r = await API.read('crm.detail', { KontakID: id }, { fresh: true }); if (!r.success) return;
    const k = r.data.kontak, info = (() => { try { return JSON.parse(k.Info || '{}'); } catch (e) { return {}; } })();
    const d = drawer({ title: esc(k.Nama || 'Kontak'), foot: false, body: '<div class="col">' +
      '<div class="row" style="gap:6px">' + pill(k.Segmen, 'dark') + (k.StatusWA ? pill(k.StatusWA, k.StatusWA === 'Terdaftar' ? 'ok' : 'bad') : '') + (k.OptOut === 'YA' ? pill('Opt-out', 'mute') : '') + '</div>' +
      '<div class="form"><label class="field"><span>Nama</span><input class="inp" data-f="Nama" value="' + esc(k.Nama) + '"></label><label class="field"><span>WhatsApp</span><input class="inp" data-f="NoWA" value="' + esc(k.NoWA) + '"></label><label class="field full"><span>Email</span><input class="inp" data-f="Email" value="' + esc(k.Email) + '"></label><label class="field full"><span>Tag (pisahkan koma)</span><input class="inp" data-f="Tag" value="' + esc(k.Tag) + '"></label><label class="field full"><span>Catatan</span><textarea class="inp" rows="2" data-f="Catatan">' + esc(k.Catatan) + '</textarea></label><label class="check"><input type="checkbox" data-f="OptOut"' + (k.OptOut === 'YA' ? ' checked' : '') + '> Tidak mau menerima blast (opt-out)</label></div>' +
      (Object.keys(info).length ? '<div class="small">' + Object.keys(info).map((x) => '<span class="muted">' + esc(x) + ':</span> ' + esc(info[x])).join(' · ') + '</div>' : '') +
      '<div class="row"><button class="btn sm primary" data-save>' + ic('save') + 'Simpan</button>' + (k.NoWA ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(k.NoWA).replace(/^0/, '62')) + '">' + ic('chat') + 'Buka WA</a>' : '') + '</div>' +
      '<hr><b>Catat interaksi</b><div class="row"><select class="inp sm" data-kanal style="width:auto"><option>Telepon</option><option>WA</option><option>Email</option><option>Tatap muka</option><option>Catatan</option></select><input class="inp sm" data-ring placeholder="Ringkasan…" style="flex:1"><button class="btn sm" data-int>' + ic('add') + '</button></div>' +
      '<b>Riwayat</b><div class="timeline">' + (r.data.timeline.map((t) => '<div class="card flat" style="padding:10px"><div class="tiny muted">' + waktu(t.Tanggal) + ' · ' + esc(t.Kanal) + (t.Status ? ' · ' + esc(t.Status) : '') + '</div><div class="small">' + esc(t.Ringkasan) + '</div></div>').join('') || '<div class="muted small">Belum ada riwayat.</div>') + '</div></div>' });
    d.body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-save]')) { const p = { KontakID: id }; d.body.querySelectorAll('[data-f]').forEach((f) => p[f.dataset.f] = f.type === 'checkbox' ? (f.checked ? 'YA' : 'TIDAK') : f.value); const s = await API.write('crm.save', p); if (s.success) { d.close(); crm(); } }
      if (e.target.closest('[data-int]')) { const v = d.body.querySelector('[data-ring]').value.trim(); if (!v) return; const s = await API.write('crm.interaksi', { KontakID: id, kanal: d.body.querySelector('[data-kanal]').value, ringkasan: v }); if (s.success) { d.close(); detail(id); } }
    });
  }
  function impor() {
    const b = document.createElement('div'); let rows = [];
    b.innerHTML = '<p class="small muted">Kolom yang dibaca: <code>nama</code>, <code>wa</code>, <code>email</code>, <code>segmen</code> (opsional). Bisa CSV/XLSX, atau tempel teks <code>08xx|Nama|email</code>.</p><input type="file" accept=".csv,.xlsx,.xls" data-file><textarea class="inp mt" rows="5" data-txt placeholder="081234567890|Nama|email@contoh.com"></textarea><div class="small mt" data-info></div>';
    b.querySelector('[data-file]').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const XLSX = await lib('xlsx'); const wb = XLSX.read(await f.arrayBuffer());
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      rows = raw.map((r) => { const o = {}; Object.keys(r).forEach((k) => o[k.toLowerCase().trim()] = String(r[k]).trim()); return { nama: o.nama || o.name || '', wa: o.wa || o.whatsapp || o.hp || o.nowa || o['no wa'] || '', email: o.email || '', segmen: o.segmen || 'Manual' }; }).filter((r) => r.wa || r.email);
      b.querySelector('[data-info]').textContent = rows.length + ' baris siap diimpor.';
    };
    modal({ title: 'Import kontak ke CRM', body: b, buttons: [{ label: 'Batal' }, { label: 'Import', cls: 'primary', onClick: async () => {
      const t = b.querySelector('[data-txt]').value.trim(); if (t) rows = rows.concat(t.split(/\n+/).map((l) => { const p = l.split('|'); return { wa: (p[0] || '').trim(), nama: (p[1] || '').trim(), email: (p[2] || '').trim(), segmen: 'Manual' }; }));
      if (!rows.length) { toast('Tidak ada baris.', 'warn'); return false; }
      const r = await API.write('crm.import', { rows }); if (!r.success) return false; crm();
    } }] });
  }

  function buka(arg) {
    view.querySelectorAll('[data-t] button').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    history.replaceState(null, '', '#/wa?tab=' + tab);
    if (tab === 'blast') blast(); else if (tab === 'antrean') antrean(arg); else crm();
  }
  view.querySelector('[data-t]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { tab = b.dataset.v; buka(); } });
  await status(); buka();
});

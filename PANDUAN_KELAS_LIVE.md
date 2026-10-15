# Kelas Live — Video Conference Terjadwal (self-hosted)

## Arsitektur
```
Browser (React)  ──HTTPS──>  FastAPI /api/classes/{id}/live-token   (cek jadwal + peran → token 1 sesi)
       │         ──WSS────>  FastAPI /api/ws/live/{class_id}         (notifikasi guru, auto-kick, chat, tangan, reaksi)
       └────────WebRTC────>  LiveKit SFU (open-source, di VPS Anda)  (audio/video/layar)
FastAPI ──HTTP 127.0.0.1:7880──> LiveKit Server API (hapus room saat jam habis, kick, mute-all)
Scheduler (di backend, tiap 1 detik) → buka sesi saat jam mulai, tutup + putus semua peserta saat jam selesai.
```
- Tidak memakai layanan pihak ketiga. LiveKit adalah perangkat lunak open-source (Apache-2.0) yang berjalan di VPS Anda sendiri.
- API Key/Secret LiveKit hanya ada di `backend/.env`. Frontend hanya menerima token sekali pakai untuk 1 sesi.

## Aturan Jadwal
- Sumber: menu **Jadwal Pelajaran** (koleksi `timetable`: kelas, hari, jam, mapel, guru).
- Jam aktif → room `kelas-<kelas>-<jadwal>-<tanggal>` dibuka otomatis.
- Host = guru pengampu jam itu saja (Bisukan Semua, Bagikan Layar, Kunci Ruang, +5 menit, Keluarkan, Akhiri).
- Siswa = hanya siswa yang terdaftar di kelas itu. Pemantau = wali kelas, kepala sekolah, super admin (tanpa kirim video).
- Guru lain diblokir (HTTP 403). Siswa kelas lain diblokir.
- Jam habis → sesi ditutup, room dihapus di SFU, semua peserta diputus (< 1 detik).
- +5 menit dibatasi sampai mapel berikutnya mulai (mapel berikutnya tetap tepat waktu), maksimal 30 menit.
- Guru belum masuk 10 menit → siswa melihat indikator "Guru belum bergabung".

## Database (MongoDB)
| Koleksi | Isi |
|---|---|
| `classes` | kelas (sudah ada) |
| `timetable` | jadwal mapel + `teacher_id` (sudah ada) — sumber kebenaran sesi |
| `users` | guru (`subjects`), siswa (`kelas`) (sudah ada) |
| `live_sessions` | `id, room(unik), class_id, timetable_id, subject, teacher_id, start_at, end_at, ends_at, status, locked, extended_minutes, teacher_joined_at, joined[], kicked[], ended_reason` |
| `live_chat` | pesan chat & pengumuman guru per sesi |
| `live_events` | log audit: token_issued, joined, teacher_joined, kicked, session_started, session_ended, extended, mute_all |

## Kapasitas 900 siswa / 22 kelas
- Simulcast (360p + 180p), adaptive stream, dynacast: siswa hanya menerima video yang terlihat di layar.
- Rekomendasi VPS: 8 vCPU, 16 GB RAM, bandwidth ≥ 1 Gbps. Satu node LiveKit sanggup menangani beban ini.
- Backend dijalankan 1 worker uvicorn (scheduler & WebSocket hub ada di proses itu).

## Pasang di VPS
```
bash scripts/setup-livekit-vps.sh live.domainsekolah.sch.id
```
Script memasang LiveKit, TURN (untuk jaringan sekolah yang ketat), Nginx + SSL, membuka port, dan menulis kunci ke `backend/.env`.

## Uji Otomatis
```
python backend/tests/live_schedule_e2e.py --slot 120     # Matematika 2 menit lalu Sejarah 2 menit
python scripts/seed_live_class_test.py --slot 180         # hanya seed data uji (tampil di menu Kelas)
python scripts/seed_live_class_test.py --cleanup          # hapus data uji
```
Log hasil: `test_reports/live_schedule_e2e.log`.

## Buka / Tutup Kelas Live
- Super admin & kepala sekolah: tab **Kelas Live** → panel **Pengaturan Kelas Live**.
- **Seluruh sekolah**: tombol Aktif/Ditutup. Saat ditutup, semua sesi langsung dihentikan dan setiap kelas menampilkan **ZOOM DITUTUP** (tab tetap ada).
- **Per kelas**: *Ikuti sekolah* (bawaan), *Selalu buka* (tetap buka walau sekolah menutup), *Tutup kelas ini*.
- Bisa dibuka lagi kapan saja; bila dibuka saat jam pelajaran masih berjalan, sesi jam itu langsung bisa dipakai lagi.

## Agar Lancar di VPS
1. Jalankan `bash scripts/setup-livekit-vps.sh live.domainsekolah.sch.id` (memasang server video + TURN, membuka port UDP 50000-60000, 3478, TCP 7881/5349).
2. Backend wajib **1 worker** (`--workers 1`) — sudah diatur otomatis di script & panduan VPS.
3. Cek panel admin: label **"Server video siap"** harus hijau.
4. Jaringan sekolah yang memblokir UDP otomatis lewat TURN/TCP. Bila koneksi siswa putus, aplikasi menyambung ulang sendiri.

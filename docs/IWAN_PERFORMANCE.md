# IWAN: analisis dan perbaikan CPU Worker

## Apa yang diketahui

Log produksi menunjukkan `Worker exceeded CPU time limit` pada Worker frontend
`manas.iflab.web.id`, termasuk API proxy dan halaman `/iwan/admin-access`.
Cloudflare Workers Free membatasi CPU per request hingga 10 ms. Waktu menunggu
network/database bukan CPU time. Banyak request memperbesar frekuensi kegagalan,
tetapi tidak berarti waktu CPU semua request dijumlahkan menjadi satu limit 10 ms.

Tanpa CPU profile, proporsi biaya autentikasi, framework, parsing, dan rendering
belum dapat dipastikan. Perubahan ini menghapus kerja berulang yang terlihat di
kode, bukan klaim hasil benchmark produksi di bawah 10 ms.

## Jalur API

Sebelumnya, browser melewati middleware Supabase frontend, `/api/auth/me` backend,
Next Route Handler, lalu endpoint IWAN backend. Middleware menyerialisasi identitas
ke header internal; proxy membaca JSON backend lalu menyerialisasikannya kembali.
Route handler sudah memiliki fast path header internal, jadi tidak selalu
melakukan autentikasi Supabase frontend tambahan.

Sekarang, khusus `/api/iwan/*`:

1. Middleware mengambil/menyegarkan session cookie.
2. `/api/auth/me` backend memvalidasi token dan akses aplikasi.
3. Pembatasan maintenance tetap diterapkan.
4. Middleware langsung meneruskan request ke backend dan mengalirkan body response,
   tanpa menjalankan Next Route Handler atau parsing JSON respons IWAN di frontend.
5. Endpoint backend tetap memvalidasi autentikasi dan role sendiri.

`getSession()` bukan bukti identitas. Jalur baru tetap memerlukan hasil validasi
backend sebelum proxy. Header identitas, Authorization, cookie, dan service key
yang dikirim browser tidak dipakai untuk menggantikan identitas sesi tervalidasi.
Data autentikasi dan respons IWAN tidak disimpan dalam cache lintas pengguna.

Backend `/auth/me` menggunakan kembali role aplikasi yang sudah dibaca middleware
pada request yang sama, bukan query role identik kedua.

## Polling dan query

| Area | Sebelumnya | Sesudah |
| --- | --- | --- |
| Detail ruangan | Dua request browser setiap 5 detik: session dan devices | Satu `/rooms/:id/snapshot` per siklus, query session/devices paralel |
| Daftar perangkat | Devices dan statistik rooms setiap 8 detik | Hanya devices berulang; opsi ruangan dimuat terpisah |
| Filter perangkat | Ambil seluruh perangkat lalu filter di browser | Filter roomId juga diterapkan di backend |
| Dropdown ruangan | Hitung statistik seluruh perangkat | `/rooms?view=options` hanya id dan nama |
| Agregasi statistik | Filter perangkat berulang untuk setiap ruangan | Map satu lintasan: O(perangkat + ruangan) |
| Kolom perangkat | `select('*')`, termasuk kolom rahasia yang tidak dipakai mapper | Select eksplisit kolom yang diperlukan |

Scheduler menunggu request selesai sebelum menjadwalkan siklus berikutnya,
berhenti saat tab tersembunyi, membatalkan request lama saat resource berubah,
dan melakukan exponential backoff untuk kegagalan polling hingga 60 detik.
Resource interval nol dimuat awal dan ketika tab kembali terlihat, tanpa timer
berulang. Tombol refresh dan refresh sesudah mutasi tetap tersedia.

Halaman admin-access sebelumnya tidak melakukan polling periodik. Pengurangan
polling tidak menjelaskan atau menjamin penyelesaian CPU-limit pada SSR halaman
tersebut. Shared dashboard layout, middleware halaman, SSR/RSC Next.js dan OpenNext
masih perlu diprofilkan jika error halaman tetap terjadi.

## Membedakan 502 gateway dari CPU limit

`outcome: "ok"` dengan HTTP 502 berarti Worker frontend menyelesaikan eksekusi
namun mengembalikan respons error. Penghentian CPU frontend ditandai
`outcome: "exceededCpu"`. CPU 19 ms tetap berisiko pada Free; toleransi sesekali
bukan jaminan budget baru. CPU/error backend harus diperiksa terpisah.

Proxy mencatat log terstruktur hanya pada kegagalan dan menambahkan header:

| Header / body | Arti | Pemeriksaan berikutnya |
| --- | --- | --- |
| `X-Iwan-Error-Source: upstream` | Backend/platform upstream mengembalikan 5xx; body dan status diteruskan | Cari log backend; log frontend mencatat `upstreamRayId` jika tersedia |
| `X-Iwan-Error-Source: proxy`, `IWAN_PROXY_FAILURE` | Exception saat proxy | Lihat `errorName` dan `errorMessage` pada event `iwan_proxy_failure` |
| `X-Iwan-Error-Source: proxy`, `IWAN_UPSTREAM_REDIRECT` | Backend mengembalikan redirect | Periksa origin backend/routing/Access; proxy tidak mengikuti redirect atau meneruskan token ke host lain |
| `X-Iwan-Error-Source: proxy`, `IWAN_BACKEND_TIMEOUT` | Timeout backend, HTTP 504 | Periksa log backend dan dependensinya; tidak ada retry otomatis mutasi |

Kode kegagalan proxy juga tersedia di body JSON `code` dan header
`X-Iwan-Error-Code`. `rayId` menghubungkan log proxy dengan invocation frontend.
`elapsedWallMs` adalah waktu sampai kegagalan/header upstream, **bukan CPU time**.
Tidak ada logging Authorization, cookie, body request, URL lengkap, atau query.
Pesan exception meredaksi access token, Bearer token, dan URL.

Jika 502 tidak mempunyai penanda tersebut, periksa versi deployment serta log
adapter/platform sebelum menyimpulkan error berasal dari proxy ini. Logging ini
memperbaiki keterlacakan error, bukan bukti bahwa akar kegagalan upstream atau
CPU telah diperbaiki.

## Hubungan dengan pairing desktop / localhost

Ini masalah terpisah dari limit CPU. Di `repka-user/src/api.ts`, URL kustom pada
localStorage `iwan:custom-backend-url` diprioritaskan atas `VITE_BACKEND_URL` dari
build. Mengubah build environment tidak menghapus override localhost yang sudah
tersimpan. Reset/ganti melalui pengaturan server aplikasi untuk memakai origin
backend Hono yang benar, bukan origin dashboard Next.js yang memerlukan session
cookie. Nilai konfigurasi aktual pada komputer pengguna belum diperiksa.

Heartbeat Rust juga memakai `DeviceConfig.backendUrl` tersimpan sebelum fallback
ke environment. Jika URL lama tersimpan di konfigurasi perangkat, perubahan env
saja tidak menggantinya. Task performa ini tidak mengubah desktop atau konfigurasi
tersimpan pengguna.

## Deployment

1. Terapkan **sekali** migrasi `20261101_iwan_hot_path_indexes.sql` ke database
   melalui prosedur migrasi proyek. Salinan ada di backend `migrations/` dan
   frontend `supabase/migrations/` untuk konsistensi; keduanya memakai
   `CREATE INDEX IF NOT EXISTS`.
2. Deploy backend lebih dahulu agar endpoint snapshot dan opsi ruangan tersedia.
3. Deploy frontend setelah backend siap.
4. Uji browser dengan akun ADMIN/ASLAB: daftar ruangan, ganti ruangan, buka/tutup
   sesi, daftar/filter perangkat, edit/hapus, dan buat/cabut akses admin.
5. Bandingkan CPU time sebelum/sesudah pada kedua Worker. Pisahkan request API,
   HTML, dan RSC, serta kondisi warm dan cold.

Indeks mempercepat lookup token heartbeat dan sesi aktif per ruangan di database;
ini bukan bukti langsung penurunan CPU Worker. Pembuatan indeks pada tabel besar
perlu dijadwalkan sesuai prosedur operasional database.

Jangan otomatis mengulang POST/PATCH/DELETE setelah error CPU/timeout. Backend
mungkin sudah menyimpan perubahan sebelum respons frontend gagal. Baca ulang
keadaan sebelum mencoba mutasi yang sama.

## Validasi lokal

Frontend:

```sh
pnpm exec tsx --test scripts/iwan-performance.test.mjs
pnpm exec tsc --noEmit --incremental false
pnpm run build:cf
```

Backend:

```sh
pnpm exec tsx --test tests/iwan-performance.test.mjs
pnpm exec tsc --noEmit
pnpm exec wrangler deploy --dry-run
```

Tes memakai mock network dan kredensial fiktif. Durasi tes Node bukan CPU time
Worker. Build/dry-run tidak melakukan deployment. Migrasi dan pengujian browser
terautentikasi produksi tidak dijalankan otomatis oleh perubahan ini.

Untuk evaluasi produksi, gunakan metrik CPU time Cloudflare dan CPU profiler pada
alur yang sama. Jangan membagikan session cookie/token atau memasukkannya ke repo.
Jika SSR tetap melewati 10 ms, tentukan perubahan arsitektur berdasarkan profile;
menaikkan interval polling saja tidak menurunkan biaya SSR per request.

Referensi:

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [CPU profiling](https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/)
- [OpenNext Cloudflare performance](https://opennext.js.org/cloudflare/perf)

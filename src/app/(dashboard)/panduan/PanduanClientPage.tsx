'use client';

import React from 'react';
import {
  BookOpen,
  Database,
  FileSpreadsheet,
  ArrowRight,
  AlertTriangle,
  Info,
  GitGraph,
  Library,
  Calendar,
  Users,
  Settings,
  ShieldCheck,
  Eye,
  Shield,
  Clock,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Role } from '@/config/rbac';

interface PanduanClientPageProps {
  role: Role;
}

export const MemoizedDataTable = React.memo(DataTable);

const PanduanClientPageComponent = function PanduanClientPage({ role }: PanduanClientPageProps) {
  const isKoor = role === 'ASPRAK_KOOR';

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative space-y-8">
      <header className="mb-10 pb-8 border-b border-border/50">
        <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Panduan Sistem</h1>
        <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
          Dokumentasi lengkap pengoperasian Sistem Manajemen Asisten Praktikum.
        </p>
      </header>

      <div>
        <div className="w-full">
          <Accordion
            type="single"
            collapsible
            className="w-full space-y-4"
            defaultValue={isKoor ? 'pelanggaran' : undefined}
          >
            {!isKoor && (
              <>
                {/* 1. Alur Penambahan Data */}
                <AccordionItem value="alur" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <GitGraph size={20} className="text-muted-foreground" />
                      <div className="text-left">
                        <h3 className="font-semibold text-base">Alur Penambahan Data</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Urutan wajib saat memasukkan data ke sistem.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-4">
                    <div className="relative flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-6 bg-muted/20 rounded-lg border border-border/40">
                      <StepCard
                        number={1}
                        title="Data Praktikum"
                        desc="Master data praktikum & tahun ajaran."
                      />
                      <ArrowRight className="hidden md:block text-muted-foreground" />
                      <StepCard number={2} title="Data Mata Kuliah" desc="Perlu ID Praktikum." />
                      <ArrowRight className="hidden md:block text-muted-foreground" />
                      <StepCard
                        number={3}
                        title="Jadwal Praktikum"
                        desc="Perlu Kode MK & data waktu."
                      />
                      <ArrowRight className="hidden md:block text-muted-foreground" />
                      <StepCard number={4} title="Data Asprak" desc="Data mahasiswa asisten." />
                    </div>
                    <div className="mt-4 p-4 border-l-4 border-amber-500 bg-amber-500/5 text-sm text-foreground/80">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p>
                          <strong className="text-amber-600 dark:text-amber-400">Penting:</strong>{' '}
                          Jangan melompati urutan. Anda tidak bisa membuat Jadwal jika Mata Kuliah
                          belum ada, dan tidak bisa membuat Mata Kuliah jika Praktikum belum ada.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Data Praktikum */}
                <AccordionItem value="praktikum" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <BookOpen size={20} className="text-muted-foreground" />
                      <div className="text-left">
                        <h3 className="font-semibold text-base">Data Praktikum</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Master data laboratorium dan tahun ajar.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6 px-2 space-y-4">
                    <DataTable
                      columns={[
                        {
                          name: 'Nama',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Nama lengkap praktikum (contoh: Pemrograman Web).',
                        },
                        {
                          name: 'Tahun Ajaran',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Format: YYYY-Sem (Contoh: "2425-1").',
                        },
                      ]}
                    />
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-500/5 text-sm text-foreground/80 flex gap-3 italic">
                      <Info className="h-5 w-5 text-blue-500 shrink-0" />
                      <p>
                        <strong>Info:</strong> Kombinasi (Nama + Tahun Ajaran) harus unik. Data
                        praktikum digunakan sebagai konteks utama pada halaman Pelanggaran.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Mata Kuliah */}
                <AccordionItem value="matakuliah" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Library size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Data Mata Kuliah</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Mata kuliah yang dibuka pada praktikum tertentu.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <DataTable
                      columns={[
                        { name: 'Nama MK', type: 'Teks', rule: 'Wajib', desc: 'Nama mata kuliah.' },
                        {
                          name: 'Praktikum',
                          type: 'Relasi',
                          rule: 'Wajib',
                          desc: 'Mengacu ke Data Praktikum (nama + tahun ajaran).',
                        },
                        {
                          name: 'Program Studi',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Contoh: Informatika, Sistem Informasi.',
                        },
                        {
                          name: 'Dosen Koor',
                          type: 'Teks',
                          rule: 'Opsional',
                          desc: 'Nama dosen koordinator.',
                        },
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Jadwal */}
                <AccordionItem value="jadwal" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Calendar size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Jadwal Praktikum</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Jadwal sesi, ruangan, and kebutuhan asprak.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <DataTable
                      columns={[
                        {
                          name: 'Kelas',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Nama kelas (contoh: IF-45-01).',
                        },
                        {
                          name: 'Mata Kuliah',
                          type: 'Relasi',
                          rule: 'Wajib',
                          desc: 'Harus match dengan Nama MK di Term yang sama.',
                        },
                        {
                          name: 'Hari',
                          type: 'Pilihan',
                          rule: 'SENIN - SABTU',
                          desc: 'Hari pelaksanaan.',
                        },
                        {
                          name: 'Sesi',
                          type: 'Angka',
                          rule: '1 - 10',
                          desc: 'Sesi Telkom University.',
                        },
                        {
                          name: 'Ruangan',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Kode ruangan (contoh: TULT 0612).',
                        },
                        {
                          name: 'Total Asprak',
                          type: 'Angka',
                          rule: 'Min 1',
                          desc: 'Kuota asprak yang dibutuhkan.',
                        },
                      ]}
                    />
                    <div className="mt-3 text-sm text-muted-foreground p-4 bg-muted/20 border-l-4 border-muted-foreground/30">
                      <strong>Aturan Validasi:</strong> Sistem akan menolak jika ada jadwal dengan
                      (Hari + Sesi + Ruangan) yang sama dalam satu Term.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. Data Asprak */}
                <AccordionItem value="asprak" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Data Asprak</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Database asisten praktikum.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <DataTable
                      columns={[
                        {
                          name: 'NIM',
                          type: 'Teks',
                          rule: 'Unik, 10 Digit',
                          desc: 'Nomor Induk Mahasiswa.',
                        },
                        {
                          name: 'Nama Lengkap',
                          type: 'Teks',
                          rule: 'Wajib',
                          desc: 'Nama sesuai KTM.',
                        },
                        {
                          name: 'Kode Asprak',
                          type: 'Teks',
                          rule: 'Unik, 3 Huruf',
                          desc: 'Kode inisial (contoh: ABY).',
                        },
                        {
                          name: 'Angkatan',
                          type: 'Angka',
                          rule: 'Format: YY',
                          desc: '2 digit tahun angkatan (contoh: 21).',
                        },
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* 6. Plotting */}
                <AccordionItem value="plotting" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Plotting Asprak</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Penugasan asisten ke jadwal praktikum.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Plotting adalah proses menghubungkan <strong>Data Asprak</strong> dengan{' '}
                      <strong>Jadwal Praktikum</strong>. Satu jadwal kelas bisa memiliki banyak
                      asprak sesuai kuota (Total Asprak).
                    </p>
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-500/5 text-sm text-foreground/80 flex gap-3 italic">
                      <Info className="h-5 w-5 text-blue-500 shrink-0" />
                      <p>
                        <strong>Tips:</strong> Gunakan menu <em>Plotting Asprak</em> untuk melihat
                        beban kerja setiap asisten dan menghindari jadwal bentrok.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 7. Penjagaan (Jadwal Jaga & Presensi RFID) */}
                <AccordionItem value="penjagaan" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Shield size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Jaga Lab & Presensi RFID</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Jadwal jaga lab dan aturan presensi RFID asisten per shift.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Fitur ini digunakan untuk mengelola plotting tugas jaga asisten laboratorium di setiap modul (W1 s.d. W16) serta validasi kehadiran real-time menggunakan kartu RFID di scanner laboratorium.
                    </p>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Info size={14} className="text-primary" />
                        Cara Input Jadwal Jaga
                      </h4>
                      <ul className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-1">
                        <li>
                          Pilih <strong>Modul</strong> (W1 s.d W16) dan <strong>Term</strong> pada
                          header halaman.
                        </li>
                        <li>
                          Klik tombol <Badge variant="outline">+ Input Jaga</Badge>.
                        </li>
                        <li>
                          Pilih <strong>Asisten</strong>, <strong>Hari</strong>, dan{' '}
                          <strong>Shift</strong> jam kerja.
                        </li>
                        <li>
                          <strong>Bulk Input:</strong> Centang{' '}
                          <span className="italic">"Terapkan ke semua modul"</span> jika asisten
                          tersebut memiliki jadwal jaga tetap di hari/shift yang sama untuk seluruh
                          semester.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Clock size={14} className="text-primary" />
                        Aturan Shift & Window Waktu Presensi RFID
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Sistem backend memvalidasi kehadiran otomatis ke dalam 4 shift per hari dengan window waktu tap berdasarkan zona waktu server (WIB):
                      </p>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                          1. Jadwal Senin s/d Kamis
                        </span>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[80px]">Shift</TableHead>
                                <TableHead>Jam Kerja</TableHead>
                                <TableHead>Mulai Tap (Earliest)</TableHead>
                                <TableHead>Batas Tepat Waktu</TableHead>
                                <TableHead>Status Terlambat</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Shift 1</TableCell>
                                <TableCell className="font-mono text-xs">06:00 - 09:00</TableCell>
                                <TableCell className="text-xs text-muted-foreground">05:45 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 06:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 07:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 2</TableCell>
                                <TableCell className="font-mono text-xs">09:00 - 12:00</TableCell>
                                <TableCell className="text-xs text-muted-foreground">08:45 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 09:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 10:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 3</TableCell>
                                <TableCell className="font-mono text-xs">12:00 - 15:00</TableCell>
                                <TableCell className="text-xs text-muted-foreground">11:45 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 12:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 13:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 4</TableCell>
                                <TableCell className="font-mono text-xs">15:00 - 18:00</TableCell>
                                <TableCell className="text-xs text-muted-foreground">14:45 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 15:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 16:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                          2. Jadwal Jumat s/d Sabtu
                        </span>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[80px]">Shift</TableHead>
                                <TableHead>Jam Kerja</TableHead>
                                <TableHead>Mulai Tap (Earliest)</TableHead>
                                <TableHead>Batas Tepat Waktu</TableHead>
                                <TableHead>Status Terlambat</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Shift 1</TableCell>
                                <TableCell className="font-mono text-xs">06:30 - 09:30</TableCell>
                                <TableCell className="text-xs text-muted-foreground">06:30 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 06:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 07:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 2</TableCell>
                                <TableCell className="font-mono text-xs">09:30 - 12:30</TableCell>
                                <TableCell className="text-xs text-muted-foreground">09:15 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 09:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 10:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 3</TableCell>
                                <TableCell className="font-mono text-xs">12:30 - 15:30</TableCell>
                                <TableCell className="text-xs text-muted-foreground">12:15 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 12:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 13:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Shift 4</TableCell>
                                <TableCell className="font-mono text-xs">15:30 - 18:30</TableCell>
                                <TableCell className="text-xs text-muted-foreground">15:15 WIB</TableCell>
                                <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">s/d 15:59 WIB (HADIR)</TableCell>
                                <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">&gt;= 16:00 WIB (TERLAMBAT)</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <ShieldCheck size={14} className="text-primary" />
                        Aturan & Validasi Presensi Backend
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 ml-1">
                        <li>
                          <strong>Waktu Server Otoritatif:</strong> Penentuan shift dan status kehadiran sepenuhnya mengacu pada jam server backend (WIB / UTC+7). Timestamp lokal dari scanner fisik diabaikan untuk mencegah kecurangan/manipulasi waktu.
                        </li>
                        <li>
                          <strong>Wajib Terdaftar di Jadwal Jaga:</strong> Tap kartu hanya diterima jika asisten bersangkutan <strong>sudah dijadwalkan</strong> di tabel <em>Jadwal Jaga</em> untuk modul, hari, dan shift yang sedang berlangsung. Jika tidak terjadwal, presensi otomatis ditolak oleh sistem.
                        </li>
                        <li>
                          <strong>Anti Double-Tap (Idempoten):</strong> Tap kartu lebih dari satu kali dalam shift dan tanggal yang sama tidak akan membuat record ganda. Sistem mengembalikan status bahwa asisten sudah tercatat hadir.
                        </li>
                        <li>
                          <strong>Sinkronisasi Modul Otomatis:</strong> Modul aktif dihitung dinamis dari tanggal mulai praktikum. Jika semester belum resmi dimulai (sebelum tanggal mulai Modul 1), presensi belum dapat dibuka.
                        </li>
                        <li>
                          <strong>Pencatatan Manual:</strong> Administrator dapat mencatat atau mengoreksi presensi asisten secara manual melalui menu Jadwal Jaga jika terjadi kendala scanner fisik.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Eye size={14} className="text-primary" />
                        Visibilitas & Rekap Jaga
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 ml-1">
                        <li>
                          <strong>Dashboard:</strong> Muncul di kolom "Penjagaan" pada tabel jadwal
                          harian. Arahkan kursor ke kode asisten untuk melihat nama lengkap.
                        </li>
                        <li>
                          <strong>Warna Role:</strong> Kode berwarna{' '}
                          <span className="text-blue-600 font-bold">Biru</span> adalah{' '}
                          <strong>ASLAB</strong>, sedangkan{' '}
                          <span className="text-slate-600 font-bold">Abu-abu</span> adalah{' '}
                          <strong>ASPRAK</strong>.
                        </li>
                        <li>
                          <strong>Rekap Jaga:</strong> Akumulasi total shift jaga setiap asisten
                          dapat dilihat pada menu <em>Rekap Jaga</em>.
                        </li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </>
            )}

            {/* 7. Pelanggaran */}
            <AccordionItem value="pelanggaran" className="border rounded-xl px-4 bg-card/30">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-muted-foreground" />
                  <div className="text-left">
                    <h3 className="font-semibold text-base">Pencatatan Pelanggaran</h3>
                    <p className="text-sm font-normal text-muted-foreground">
                      Log indisipliner asisten praktikum.
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-10 space-y-8">
                {!isKoor && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Info size={16} />
                      Filter Utama
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Halaman pelanggaran difilter berdasarkan <strong>Tahun Ajaran</strong> dan{' '}
                      <strong>Nama Praktikum</strong>. Filter ini juga menentukan asprak dan jadwal
                      yang tersedia saat menambahkan pelanggaran baru.
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Database size={16} />
                    Jenis Pelanggaran
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'TELAT NILAI',
                      'TELAT DATANG',
                      'TIDAK DATANG',
                      'LALAI ATURAN PAKAIAN',
                      'LAIN LAIN',
                    ].map((j) => (
                      <Badge key={j} variant="outline" className="text-xs">
                        {j}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Menambah Pelanggaran
                  </h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5">
                    <li>
                      Pilih <strong>Tahun Ajaran</strong> dan <strong>Nama Praktikum</strong>{' '}
                      sebagai konteks.
                    </li>
                    <li>
                      Pilih <strong>Asprak yang Melanggar</strong> — bisa lebih dari 1 sekaligus
                      (multi-select). Tersedia search berdasarkan nama, kode, atau NIM.
                    </li>
                    <li>
                      Pilih <strong>Kelas/Jadwal</strong> — tersedia search nama MK, kelas, atau
                      hari.
                    </li>
                    <li>
                      Pilih <strong>Jenis Pelanggaran</strong> dan <strong>Modul</strong>{' '}
                      (opsional).
                    </li>
                    <li>
                      Klik <em>Catat Pelanggaran</em>. Jika multi-asprak, sistem akan membuat satu
                      record per asprak dengan data yang sama.
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Finalisasi
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Finalisasi dilakukan <strong>satu klik per Praktikum per Tahun Ajaran</strong>.
                    Setelah difinalisasi, data tidak dapat diubah. Pastikan semua data sudah benar
                    sebelum klik tombol <em>Finalisasi</em>.
                  </p>
                  <div className="p-4 border-l-4 border-amber-500 bg-amber-500/5 text-sm text-foreground/80 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <strong className="text-amber-600 dark:text-amber-400">Peringatan:</strong>{' '}
                      Finalisasi bersifat permanen. Data yang sudah final tidak dapat diedit atau
                      dihapus.
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Eye size={16} />
                    Melihat & Filter Rekap Pelanggaran
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Halaman <strong>Rekap Pelanggaran</strong> menyediakan filter cerdas dengan
                    pendekatan ranking kronologis:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>Ranking Global:</strong> Pelanggaran diurutkan secara kronologis
                      (ke-1, ke-2, ke-3) lintas seluruh modul bagi setiap asprak.
                    </li>
                    <li>
                      <strong>Target Modul:</strong> Hanya menampilkan pelanggaran yang terjadi di
                      modul yang Anda pilih. Jika Anda memilih opsi <strong>Semua Modul</strong>,
                      sistem akan menampilkan data pelanggaran tanpa dibatasi oleh modul tertentu.
                    </li>
                    <li>
                      <strong>Min. Pelanggaran:</strong> Sistem hanya akan memunculkan data
                      pelanggaran yang urutan kronologisnya (ranking) mencapai angka minimal yang
                      Anda tentukan (misalnya, hanya memunculkan pelanggaran ke-3 atau ke-4 dari
                      seorang asprak, meskipun Anda hanya sedang melihat data di Modul 5).
                    </li>
                    <div className="mt-2 mb-3 p-4 bg-muted/30 border rounded-lg text-xs space-y-2">
                      <p className="font-semibold text-foreground/80 mb-1">
                        Contoh Studi Kasus Asprak "KZN" dengan [Target Modul: 5] & [Min.
                        Pelanggaran: 3]
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                        <li>
                          <strong className="text-foreground/70">Kasus 1:</strong> Modul 3 (1 pelg),
                          Modul 4 (1 pelg), Modul 5 (3 pelg) <br />
                          <span className="ml-5">
                            ➔ <strong>Hasil:</strong> Tampil 3 data dari Modul 5 (karena ketiganya
                            adalah pelanggaran ke-3, ke-4, dan ke-5).
                          </span>
                        </li>
                        <li>
                          <strong className="text-foreground/70">Kasus 2:</strong> Modul 4 (1 pelg),
                          Modul 5 (3 pelg) <br />
                          <span className="ml-5">
                            ➔ <strong>Hasil:</strong> Tampil 2 data dari Modul 5 (hanya pelanggaran
                            ke-3 dan ke-4).
                          </span>
                        </li>
                        <li>
                          <strong className="text-foreground/70">Kasus 3:</strong> Modul 5 (3 pelg){' '}
                          <br />
                          <span className="ml-5">
                            ➔ <strong>Hasil:</strong> Tampil 1 data dari Modul 5 (hanya pelanggaran
                            ke-3).
                          </span>
                        </li>
                      </ul>
                    </div>
                    <li>
                      <strong>Sorting Tabel:</strong> Klik pada header <strong>MK</strong> atau{' '}
                      <strong>Kode Asprak</strong> untuk mengurutkan data pelanggaran secara
                      ascending/descending.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileSpreadsheet size={16} />
                    Export Excel
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Klik tombol <em>Export Excel</em> di pojok kanan atas halaman. File akan diunduh
                    dengan kolom:
                  </p>
                  <DataTable
                    columns={[
                      {
                        name: 'NIM',
                        type: 'Teks',
                        rule: '',
                        desc: 'Nomor Induk Mahasiswa asprak.',
                      },
                      { name: 'NAMA', type: 'Teks', rule: '', desc: 'Nama lengkap asprak.' },
                      { name: 'KODE ASPRAK', type: 'Teks', rule: '', desc: 'Kode inisial asprak.' },
                      {
                        name: 'MODUL',
                        type: 'Angka',
                        rule: '',
                        desc: 'Nomor modul saat pelanggaran terjadi.',
                      },
                      { name: 'KELAS', type: 'Teks', rule: '', desc: 'Nama kelas jadwal.' },
                      {
                        name: 'PELANGGARAN',
                        type: 'Pilihan',
                        rule: '',
                        desc: 'Jenis pelanggaran yang dicatat.',
                      },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Export disesuaikan dengan filter aktif (tahun ajaran & praktikum).
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {!isKoor && (
              <>
                {/* 8. Role & Akses */}
                <AccordionItem value="role-akses" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <ShieldCheck size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Role & Hak Akses</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Perbedaan akses berdasarkan role pengguna.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-8">
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Fitur</TableHead>
                            <TableHead className="text-center">Admin</TableHead>
                            <TableHead className="text-center">Aslab</TableHead>
                            <TableHead className="text-center">Asprak Koor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            ['Dashboard', '✓', '✓', '—'],
                            ['Praktikum & MK', '✓', '✓', '—'],
                            ['Jadwal', '✓', '✓', '—'],
                            ['Data Asprak', '✓', '✓', '—'],
                            ['Plotting', '✓', '✓', '—'],
                            ['Pelanggaran', 'Semua', 'Semua', 'Assignment saja'],
                            ['Manajemen Akun', '✓', '—', '—'],
                            ['Audit Log', '✓', '✓', '—'],
                            ['Export Excel', '✓', '✓', '✓ (terbatas)'],
                          ].map(([feature, admin, aslab, koor]) => (
                            <TableRow key={feature}>
                              <TableCell className="font-medium text-sm">{feature}</TableCell>
                              <TableCell className="text-center text-sm">{admin}</TableCell>
                              <TableCell className="text-center text-sm">{aslab}</TableCell>
                              <TableCell className="text-center text-sm">{koor}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Asprak Koordinator (Koor)</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                        <li>
                          Hanya dapat mengakses halaman <strong>Pelanggaran</strong>.
                        </li>
                        <li>
                          Hanya melihat pelanggaran yang terkait dengan{' '}
                          <strong>praktikum yang di-assign</strong> padanya.
                        </li>
                        <li>Dapat mencatat pelanggaran baru untuk asprak di praktikumnya.</li>
                        <li>
                          Dapat melakukan <strong>finalisasi</strong> pelanggaran untuk
                          praktikumnya.
                        </li>
                        <li>
                          Dapat mengunduh <strong>export Excel</strong> data pelanggaran (tersaring
                          sesuai aksesnya).
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 border-l-4 border-blue-500 bg-blue-500/5 text-sm text-foreground/80 flex gap-3 italic">
                      <Info className="h-5 w-5 text-blue-500 shrink-0" />
                      <p>
                        <strong>Cara assign Asprak Koor ke praktikum:</strong> Pergi ke{' '}
                        <em>Manajemen Akun</em> → Tambah Akun → pilih role{' '}
                        <em>Koordinator Asprak</em> → pilih Tahun Ajaran dan centang Praktikum yang
                        dipegang.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 9. Manajemen Akun */}
                <AccordionItem value="manajemen-akun" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Eye size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Manajemen Akun</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Kelola akun pengguna sistem (Admin only).
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                      <li>
                        Tambah akun baru dengan role:{' '}
                        <Badge variant="outline" className="text-xs">
                          ADMIN
                        </Badge>{' '}
                        <Badge variant="outline" className="text-xs">
                          ASLAB
                        </Badge>{' '}
                        <Badge variant="outline" className="text-xs">
                          ASPRAK_KOOR
                        </Badge>
                      </li>
                      <li>Edit nama dan role pengguna yang sudah ada.</li>
                      <li>Hapus akun pengguna.</li>
                      <li>
                        Field password memiliki tombol <strong>👁 toggle</strong> untuk
                        menampilkan/menyembunyikan karakter.
                      </li>
                      <li>
                        Saat membuat akun <em>Koordinator Asprak</em>, wajib memilih{' '}
                        <strong>Tahun Ajaran</strong> dan <strong>Praktikum</strong> yang akan
                        di-assign.
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                {/* 10. Database Manager */}
                <AccordionItem value="db-manager" className="border rounded-xl px-4 bg-card/30">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Settings size={20} />
                      <div className="text-left text-foreground">
                        <h3 className="font-semibold text-base">Database & Import/Export</h3>
                        <p className="text-sm font-normal text-muted-foreground">
                          Fitur Admin untuk maintenance dan migrasi data.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-10 space-y-6">
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                      <li>
                        <strong>Bulk Import Excel:</strong> Import seluruh data satu Term
                        (Praktikum, MK, Asprak, Jadwal) sekaligus menggunakan format .xlsx khusus.
                      </li>
                      <li>
                        <strong>Export Excel:</strong> Tersedia di halaman Pelanggaran — unduh data
                        pelanggaran dalam format .xlsx dengan kolom standar (NIM, Nama, Kode Asprak,
                        Modul, Kelas, Pelanggaran).
                      </li>
                      <li>
                        <strong>Clear Database:</strong> Menghapus SEMUA data di sistem. Gunakan
                        hanya untuk reset semester baru.
                      </li>
                    </ul>

                    <div className="p-4 border-l-4 border-red-500 bg-red-500/5 text-sm text-foreground/80 flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <strong className="text-red-600 dark:text-red-400">Danger Zone:</strong>{' '}
                        &ldquo;Clear Database&rdquo; bersifat permanen dan tidak bisa dibatalkan.
                        Backup data sebelum menjalankan fitur ini.
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PanduanClientPageComponent);


function StepCard({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-1">
      <div className="flex items-center justify-center w-7 h-7 border-2 border-primary/20 rounded-lg text-primary font-bold text-xs shrink-0">
        0{number}
      </div>
      <div>
        <h4 className="font-bold text-sm text-foreground/90">{title}</h4>
        <p className="text-[11px] text-muted-foreground font-medium">{desc}</p>
      </div>
    </div>
  );
}

function DataTable({
  columns,
}: {
  columns: { name: string; type: string; rule: string; desc: string }[];
}) {
  return (
    <div className="rounded-md border border-border">
      <Table className="2xl:text-base">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[150px]">Kolom</TableHead>
            <TableHead className="w-[90px]">Tipe</TableHead>
            {columns[0].rule !== '' && <TableHead className="w-[130px]">Aturan</TableHead>}
            <TableHead>Keterangan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => (
            <TableRow key={col.name}>
              <TableCell className="font-medium text-sm">{col.name}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">{col.type}</TableCell>
              {col.rule !== '' && (
                <TableCell className="text-xs">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground border">
                    {col.rule}
                  </span>
                </TableCell>
              )}
              <TableCell className="text-sm text-muted-foreground">{col.desc}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import type { Role } from '@/config/rbac';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export type UserAppRole = {
  app_slug: string;
  role: string;
  app_name?: string;
};

export type Pengguna = {
  id: string;
  nama_lengkap: string;
  role: Role;
  status: UserStatus;
  nim?: string | null;
  catatan_request?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
};

export type UserWithEmail = Pengguna & {
  email: string;
  auth_created_at?: string;
  provider?: string;
  app_roles?: UserAppRole[];
};

export type AsprakKoordinator = {
  id: string;
  id_pengguna: string;
  id_mata_kuliah: string;
  id_praktikum?: string;
  tahun_ajaran?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  mata_kuliah?: MataKuliah;
  praktikum?: Pick<Praktikum, 'id' | 'nama' | 'tahun_ajaran'>;
};

export type Asprak = {
  id: string;
  nama_lengkap: string;
  nim: string;
  kode: string;
  role: Role;
  angkatan?: number;
  rfid_uid?: string;
  created_at: string;
  updated_at: string;
};

export type Praktikum = {
  id: string;
  nama: string;
  tahun_ajaran: string;
  created_at: string;
  updated_at: string;
};

export type MataKuliah = {
  id: string;
  id_praktikum: string;
  nama_lengkap: string;
  program_studi: string;
  dosen_koor?: string;
  warna?: string;
  created_at: string;
  updated_at: string;
  praktikum?: Pick<Praktikum, 'nama' | 'tahun_ajaran'>;
};

export type JadwalPengganti = {
  id: string;
  id_jadwal: string;
  modul: number;
  tanggal: string;
  hari: string;
  sesi?: number;
  jam: string;
  ruangan: string;
  created_at: string;
  updated_at: string;
};

export type Jadwal = {
  id: string;
  id_mk: string;
  kelas: string;
  hari: string;
  sesi?: number;
  jam: string;
  ruangan?: string;
  total_asprak: number;
  dosen?: string;
  created_at: string;
  updated_at: string;
  mata_kuliah?: MataKuliah;
  jadwal_pengganti?: JadwalPengganti[];
  is_pengganti?: boolean;
  tanggal?: string;
};

export type Pelanggaran = {
  id: string;
  id_asprak: string;
  id_jadwal: string;
  modul: number;
  jenis: string;
  created_at: string;
  updated_at: string;
  asprak?: Pick<Asprak, 'nama_lengkap' | 'nim' | 'kode'>;
  jadwal?: Pick<Jadwal, 'hari' | 'jam' | 'kelas'> & {
    mata_kuliah?: Pick<MataKuliah, 'id' | 'nama_lengkap' | 'program_studi'> & {
      praktikum?: Pick<Praktikum, 'id' | 'nama' | 'tahun_ajaran'>;
    };
  };
};

export type AuditLog = {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  old_values?: any;
  new_values?: any;
  id_pengguna?: string;
  created_at: string;
};

export type AuditLogWithUser = AuditLog & {
  pengguna?: Pick<Pengguna, 'nama_lengkap' | 'role'>;
};

export type JadwalJaga = {
  id: string;
  id_asprak: string;
  tahun_ajaran: string;
  modul: number;
  hari: string;
  shift: number;
  created_at: string;
  updated_at: string;
  asprak?: Pick<Asprak, 'nama_lengkap' | 'nim' | 'kode' | 'role'>;
};

export type PresensiJaga = {
  id: string;
  id_asprak: string;
  tahun_ajaran: string;
  modul: number;
  hari: string;
  shift: number;
  tanggal: string;
  waktu_masuk: string;
  waktu_keluar?: string;
  status: 'HADIR' | 'TERLAMBAT' | 'PENGGANTI' | 'TIDAK_TERJADWAL' | string;
  device_id?: string;
  created_at: string;
  asprak?: Pick<Asprak, 'id' | 'nama_lengkap' | 'nim' | 'kode' | 'role'>;
};

export type Praktikan = {
  id: string;
  nama: string;
  kode_asprak: string;
  kelas: string;
  mata_kuliah: string;
};

export type RoomMonitoring = {
  lab_id: string;
  kelas: string;
  status: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
};

export type MonitoringHeartbeatLog = {
  id: number;
  lab_id: string;
  kelas: string | null;
  status: string;
  response_time_ms: number | null;
  created_at: string;
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogTag = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type BlogPostStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type BlogContentFormat = 'markdown' | 'tiptap_json' | 'html';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Json;
  content_format: BlogContentFormat;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  author_id: string;
  status: BlogPostStatus;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  view_count: number;
  reading_time_minutes: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostWithRelations = BlogPost & {
  category?: Pick<BlogCategory, 'id' | 'name' | 'slug'> | null;
  tags?: Pick<BlogTag, 'id' | 'name' | 'slug'>[];
  author?: Pick<Pengguna, 'id' | 'nama_lengkap'>;
};

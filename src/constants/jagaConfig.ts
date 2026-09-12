/**
 * Konfigurasi Terpusat Jadwal Jaga & Presensi RFID Lab
 * 
 * Aturan Presensi:
 * 1. Ketentuan Shift & Sesi:
 *    - Shift Pagi: Sesi 1 dan Sesi 2
 *    - Shift Siang: Sesi 3 dan Sesi 4
 *    - Setiap shift wajib melakukan absensi 2x via KTM RFID (1x per sesi).
 *    - Absensi dibuka 15 menit sebelum batas waktu maksimal kedatangan.
 *    - Batas waktu kehadiran tepat waktu mencakup detik :59 (contoh: 06:00:59 masih HADIR, >= 06:01:00 TERLAMBAT).
 *    - Hadir melebihi jam maksimal kedatangan -> Terlambat & potong jam honor kelipatan per jam (sistem parkir).
 * 
 * 2. Senin - Kamis:
 *    - Sesi 1: 06:00 - 09:00 (Window tap: 05:45 - 06:00:59 Hadir, >=06:01:00 Terlambat)
 *    - Sesi 2: 09:00 - 12:00 (Window tap: 08:45 - 09:00:59 Hadir, >=09:01:00 Terlambat)
 *    - Sesi 3: 12:00 - 15:00 (Window tap: 11:45 - 12:00:59 Hadir, >=12:01:00 Terlambat)
 *    - Sesi 4: 15:00 - 18:00 (Window tap: 14:45 - 15:00:59 Hadir, >=15:01:00 Terlambat)
 * 
 * 3. Jumat:
 *    - Sesi 1: 06:45 - 09:45 (Window tap: 06:30 - 06:45:59 Hadir, >=06:46:00 Terlambat)
 *    - Sesi 2: 09:45 - 12:45 (Window tap: 09:30 - 09:45:59 Hadir, >=09:46:00 Terlambat)
 *    - Sesi 3: 13:00 - 15:45 (Window tap: 12:45 - 13:00:59 Hadir, >=13:01:00 Terlambat) [Sholat Jumat]
 *    - Sesi 4: 15:45 - 18:30 (Window tap: 15:30 - 15:45:59 Hadir, >=15:46:00 Terlambat)
 * 
 * 4. Sabtu:
 *    - Sesi 1: 06:45 - 09:45 (Window tap: 06:30 - 06:45:59 Hadir, >=06:46:00 Terlambat)
 *    - Sesi 2: 09:45 - 12:45 (Window tap: 09:30 - 09:45:59 Hadir, >=09:46:00 Terlambat)
 *    - Sesi 3: 12:45 - 15:45 (Window tap: 12:30 - 12:45:59 Hadir, >=12:46:00 Terlambat)
 *    - Sesi 4: 15:45 - 18:30 (Window tap: 15:30 - 15:45:59 Hadir, >=15:46:00 Terlambat)
 */

export interface JagaShiftConfig {
  shift: number;
  jam: string;
  startHour: number;
  endHour: number;
  earliestTapHour: number;
  lateThresholdHour: number;
}

// Toleransi 59 detik: tap pada menit batas kedatangan (e.g. 06:00:59) tetap terhitung HADIR
const SECONDS_TOLERANCE = 59.999 / 3600;

export const JAGA_CONFIG = {
  // Senin s/d Kamis
  WEEKDAY_SHIFTS: [
    {
      shift: 1,
      jam: '06:00 - 09:00',
      startHour: 6.0,
      endHour: 8.75, // Sampai Sesi 2 buka (08:45)
      earliestTapHour: 5.75, // 05:45 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 6.0 + SECONDS_TOLERANCE, // s/d 06:00:59 HADIR, >= 06:01:00 TERLAMBAT
    },
    {
      shift: 2,
      jam: '09:00 - 12:00',
      startHour: 9.0,
      endHour: 11.75, // Sampai Sesi 3 buka (11:45)
      earliestTapHour: 8.75, // 08:45 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 9.0 + SECONDS_TOLERANCE, // s/d 09:00:59 HADIR, >= 09:01:00 TERLAMBAT
    },
    {
      shift: 3,
      jam: '12:00 - 15:00',
      startHour: 12.0,
      endHour: 14.75, // Sampai Sesi 4 buka (14:45)
      earliestTapHour: 11.75, // 11:45 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 12.0 + SECONDS_TOLERANCE, // s/d 12:00:59 HADIR, >= 12:01:00 TERLAMBAT
    },
    {
      shift: 4,
      jam: '15:00 - 18:00',
      startHour: 15.0,
      endHour: 18.0, // 18:00 (akhir jadwal jaga harian)
      earliestTapHour: 14.75, // 14:45 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 15.0 + SECONDS_TOLERANCE, // s/d 15:00:59 HADIR, >= 15:01:00 TERLAMBAT
    },
  ] as JagaShiftConfig[],

  // Khusus Jumat (Sesi 3 mulai 13:00 setelah sholat Jumat)
  FRIDAY_SHIFTS: [
    {
      shift: 1,
      jam: '06:45 - 09:45',
      startHour: 6.75,
      endHour: 9.5, // Sampai Sesi 2 buka (09:30)
      earliestTapHour: 6.5, // 06:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 6.75 + SECONDS_TOLERANCE, // s/d 06:45:59 HADIR, >= 06:46:00 TERLAMBAT
    },
    {
      shift: 2,
      jam: '09:45 - 12:45',
      startHour: 9.75,
      endHour: 12.75, // Sampai Sesi 3 buka (12:45)
      earliestTapHour: 9.5, // 09:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 9.75 + SECONDS_TOLERANCE, // s/d 09:45:59 HADIR, >= 09:46:00 TERLAMBAT
    },
    {
      shift: 3,
      jam: '13:00 - 15:45',
      startHour: 13.0,
      endHour: 15.5, // Sampai Sesi 4 buka (15:30)
      earliestTapHour: 12.75, // 12:45 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 13.0 + SECONDS_TOLERANCE, // s/d 13:00:59 HADIR, >= 13:01:00 TERLAMBAT
    },
    {
      shift: 4,
      jam: '15:45 - 18:30',
      startHour: 15.75,
      endHour: 18.5, // 18:30 (akhir jadwal jaga harian)
      earliestTapHour: 15.5, // 15:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 15.75 + SECONDS_TOLERANCE, // s/d 15:45:59 HADIR, >= 15:46:00 TERLAMBAT
    },
  ] as JagaShiftConfig[],

  // Khusus Sabtu (Sesi 3 mulai 12:45)
  SATURDAY_SHIFTS: [
    {
      shift: 1,
      jam: '06:45 - 09:45',
      startHour: 6.75,
      endHour: 9.5, // Sampai Sesi 2 buka (09:30)
      earliestTapHour: 6.5, // 06:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 6.75 + SECONDS_TOLERANCE, // s/d 06:45:59 HADIR, >= 06:46:00 TERLAMBAT
    },
    {
      shift: 2,
      jam: '09:45 - 12:45',
      startHour: 9.75,
      endHour: 12.5, // Sampai Sesi 3 buka (12:30)
      earliestTapHour: 9.5, // 09:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 9.75 + SECONDS_TOLERANCE, // s/d 09:45:59 HADIR, >= 09:46:00 TERLAMBAT
    },
    {
      shift: 3,
      jam: '12:45 - 15:45',
      startHour: 12.75,
      endHour: 15.5, // Sampai Sesi 4 buka (15:30)
      earliestTapHour: 12.5, // 12:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 12.75 + SECONDS_TOLERANCE, // s/d 12:45:59 HADIR, >= 12:46:00 TERLAMBAT
    },
    {
      shift: 4,
      jam: '15:45 - 18:30',
      startHour: 15.75,
      endHour: 18.5, // 18:30 (akhir jadwal jaga harian)
      earliestTapHour: 15.5, // 15:30 (15 menit sebelum batas kedatangan)
      lateThresholdHour: 15.75 + SECONDS_TOLERANCE, // s/d 15:45:59 HADIR, >= 15:46:00 TERLAMBAT
    },
  ] as JagaShiftConfig[],

  // Backward compatibility alias untuk kode lama
  get WEEKEND_SHIFTS(): JagaShiftConfig[] {
    return this.SATURDAY_SHIFTS;
  },
};

export function getJagaShiftList(hari: string): JagaShiftConfig[] {
  const upper = (hari || 'SENIN').toUpperCase();
  if (upper === 'JUMAT') return JAGA_CONFIG.FRIDAY_SHIFTS;
  if (upper === 'SABTU') return JAGA_CONFIG.SATURDAY_SHIFTS;
  return JAGA_CONFIG.WEEKDAY_SHIFTS;
}

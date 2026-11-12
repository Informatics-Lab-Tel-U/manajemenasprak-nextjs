/**
 * Types for Caslab (Calon Asisten Laboratorium) Seat Plotting
 * 
 * Supports unified single-cohort shuffling across 1 or 2 rooms
 * with Spaced (Berselang / Anti-Contek) and Dense (Sebelahan) seating patterns.
 */

export interface CaslabCandidate {
  id: string;
  nim: string;
  nama_lengkap: string;
  kode: string; // 3 uppercase letters (e.g. "MAB")
  codeRule?: string;
  codeSource: 'csv' | 'generated' | 'manual';
}

export type SeatingMode = 'spaced' | 'dense';

export interface CaslabRoomConfig {
  id: string; // e.g. "room-1", "room-2"
  name: string; // e.g. "TULT 0617 (Lab Multimedia)"
  capacity: number; // e.g. 40
  disabledSeats: number[]; // 1-based seat numbers marked as broken/inactive
}

export interface CaslabSeat {
  seatNumber: number; // 1-based index (Meja 1, 2, ...)
  isDisabled: boolean; // marked as broken/inactive
  isSpacedEmpty: boolean; // intentionally left empty in 'spaced' mode
  candidate: CaslabCandidate | null;
}

export interface CaslabRoomAllocation {
  room: CaslabRoomConfig;
  seats: CaslabSeat[];
  assignedCandidates: CaslabCandidate[];
}

export interface CaslabPlottingSession {
  title: string;
  candidates: CaslabCandidate[];
  numRooms: 1 | 2;
  seatingMode: SeatingMode;
  rooms: [CaslabRoomConfig, CaslabRoomConfig];
  allocations: CaslabRoomAllocation[];
  shuffledAt: number | null;
  historyVersion: number;
}

/**
 * Caslab Seat Plotting & Shuffling Utilities
 * 
 * Implements:
 * 1. Single-cohort Fisher-Yates shuffle across 1 or 2 rooms
 * 2. Spaced (Berselang / Anti-Contek) vs Dense (Sebelahan) seat placement
 * 3. 3-letter Aslab code generation using asprakCodeGenerator
 * 4. Disabled seat handling (broken PCs)
 * 5. Manual seat swapping
 */

import { generateAsprakCode } from './asprakCodeGenerator';
import type {
  CaslabCandidate,
  CaslabRoomConfig,
  CaslabRoomAllocation,
  CaslabSeat,
  SeatingMode,
} from '@/types/caslab';

/**
 * Normalizes and ensures each candidate has a unique 3-letter Aslab code.
 * If code is provided from CSV/Excel, validates and uses it.
 * If missing or invalid, generates a unique code via asprakCodeGenerator.
 */
export function processCaslabCandidates(
  rawCandidates: Array<{
    nim: string;
    nama_lengkap: string;
    kode?: string;
  }>
): CaslabCandidate[] {
  const usedCodes = new Set<string>();
  const results: CaslabCandidate[] = [];

  // Pass 1: Register pre-existing valid codes
  rawCandidates.forEach((item) => {
    const cleanCode = (item.kode || '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(cleanCode)) {
      usedCodes.add(cleanCode);
    }
  });

  // Pass 2: Assign codes to all candidates
  rawCandidates.forEach((item, index) => {
    const nim = String(item.nim || '').trim();
    const nama = String(item.nama_lengkap || '').trim();
    if (!nim && !nama) return;

    let cleanCode = (item.kode || '').trim().toUpperCase();
    let codeRule = 'From CSV/Excel';
    let codeSource: 'csv' | 'generated' | 'manual' = 'csv';

    if (!cleanCode || !/^[A-Z]{3}$/.test(cleanCode) || results.some((r) => r.kode === cleanCode)) {
      try {
        const generated = generateAsprakCode(nama, usedCodes);
        cleanCode = generated.code;
        codeRule = generated.rule;
        codeSource = 'generated';
        usedCodes.add(cleanCode);
      } catch {
        // Fallback random 3-letter if name cannot generate
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let fallback = '';
        do {
          fallback = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } while (usedCodes.has(fallback));
        cleanCode = fallback;
        codeRule = 'Emergency Fallback';
        codeSource = 'generated';
        usedCodes.add(cleanCode);
      }
    }

    results.push({
      id: `caslab_${nim}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      nim,
      nama_lengkap: nama,
      kode: cleanCode,
      codeRule,
      codeSource,
    });
  });

  return results;
}

/**
 * Computes available seat numbers for a room given capacity, disabled seats, and seating mode.
 */
export function getUsableSeatNumbers(
  capacity: number,
  disabledSeats: Set<number>,
  mode: SeatingMode
): number[] {
  const usable: number[] = [];

  if (mode === 'dense') {
    // Mode Sebelahan: all non-disabled seats sequentially
    for (let s = 1; s <= capacity; s++) {
      if (!disabledSeats.has(s)) {
        usable.push(s);
      }
    }
  } else {
    // Mode Berselang: ensure at least 1 empty seat gap between any two participants
    let prevPicked = -2;
    for (let s = 1; s <= capacity; s++) {
      if (disabledSeats.has(s)) continue;
      if (s === prevPicked + 1) continue; // enforce gap
      usable.push(s);
      prevPicked = s;
    }
  }

  return usable;
}

/**
 * Unbiased Fisher-Yates array shuffle.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Unified multi-room shuffle.
 * Shuffles all candidates as one unified cohort and allocates to 1 or 2 rooms.
 */
export function performUnifiedShuffle(
  candidates: CaslabCandidate[],
  numRooms: 1 | 2,
  roomConfigs: [CaslabRoomConfig, CaslabRoomConfig],
  seatingMode: SeatingMode
): CaslabRoomAllocation[] {
  if (candidates.length === 0) {
    return roomConfigs.slice(0, numRooms).map((room) => ({
      room,
      seats: createEmptySeats(room.capacity, new Set(room.disabledSeats)),
      assignedCandidates: [],
    }));
  }

  // 1. Single unified Fisher-Yates shuffle on the entire master pool
  const shuffledCandidates = shuffleArray(candidates);

  const activeConfigs = roomConfigs.slice(0, numRooms);
  const allocations: CaslabRoomAllocation[] = [];

  if (numRooms === 1) {
    const room = activeConfigs[0];
    const disabledSet = new Set(room.disabledSeats);
    const usableSeats = getUsableSeatNumbers(room.capacity, disabledSet, seatingMode);

    // If candidates exceed usable spaced seats in spaced mode, fallback to any available non-disabled seats
    let targetSeatNumbers = [...usableSeats];
    if (shuffledCandidates.length > targetSeatNumbers.length) {
      const remainingNonDisabled = [];
      for (let s = 1; s <= room.capacity; s++) {
        if (!disabledSet.has(s) && !targetSeatNumbers.includes(s)) {
          remainingNonDisabled.push(s);
        }
      }
      targetSeatNumbers = [...targetSeatNumbers, ...remainingNonDisabled];
    }

    const seats = buildRoomSeats(
      room.capacity,
      disabledSet,
      targetSeatNumbers,
      shuffledCandidates,
      seatingMode
    );

    allocations.push({
      room,
      seats,
      assignedCandidates: shuffledCandidates,
    });
  } else {
    // 2 Rooms: Balanced distribution
    const room1 = activeConfigs[0];
    const room2 = activeConfigs[1];
    const disabledSet1 = new Set(room1.disabledSeats);
    const disabledSet2 = new Set(room2.disabledSeats);

    const usable1 = getUsableSeatNumbers(room1.capacity, disabledSet1, seatingMode);
    const usable2 = getUsableSeatNumbers(room2.capacity, disabledSet2, seatingMode);

    const N = shuffledCandidates.length;
    let count1 = Math.ceil(N / 2);
    let count2 = N - count1;

    // Adjust if one room has lower capacity than the equal split
    if (count1 > room1.capacity - disabledSet1.size) {
      count1 = Math.max(0, room1.capacity - disabledSet1.size);
      count2 = N - count1;
    } else if (count2 > room2.capacity - disabledSet2.size) {
      count2 = Math.max(0, room2.capacity - disabledSet2.size);
      count1 = N - count2;
    }

    const candidatesRoom1 = shuffledCandidates.slice(0, count1);
    const candidatesRoom2 = shuffledCandidates.slice(count1);

    // Build seats for Room 1
    let targetSeats1 = [...usable1];
    if (candidatesRoom1.length > targetSeats1.length) {
      const remaining1 = [];
      for (let s = 1; s <= room1.capacity; s++) {
        if (!disabledSet1.has(s) && !targetSeats1.includes(s)) {
          remaining1.push(s);
        }
      }
      targetSeats1 = [...targetSeats1, ...remaining1];
    }

    // Build seats for Room 2
    let targetSeats2 = [...usable2];
    if (candidatesRoom2.length > targetSeats2.length) {
      const remaining2 = [];
      for (let s = 1; s <= room2.capacity; s++) {
        if (!disabledSet2.has(s) && !targetSeats2.includes(s)) {
          remaining2.push(s);
        }
      }
      targetSeats2 = [...targetSeats2, ...remaining2];
    }

    allocations.push({
      room: room1,
      seats: buildRoomSeats(room1.capacity, disabledSet1, targetSeats1, candidatesRoom1, seatingMode),
      assignedCandidates: candidatesRoom1,
    });

    allocations.push({
      room: room2,
      seats: buildRoomSeats(room2.capacity, disabledSet2, targetSeats2, candidatesRoom2, seatingMode),
      assignedCandidates: candidatesRoom2,
    });
  }

  return allocations;
}

/**
 * Constructs the full seat array for a room with candidate mappings and status indicators.
 */
function buildRoomSeats(
  capacity: number,
  disabledSet: Set<number>,
  designatedSeatNumbers: number[],
  assignedCandidates: CaslabCandidate[],
  seatingMode: SeatingMode
): CaslabSeat[] {
  const seatCandidateMap = new Map<number, CaslabCandidate>();
  assignedCandidates.forEach((candidate, idx) => {
    if (idx < designatedSeatNumbers.length) {
      seatCandidateMap.set(designatedSeatNumbers[idx], candidate);
    }
  });

  const seats: CaslabSeat[] = [];
  for (let s = 1; s <= capacity; s++) {
    const isDisabled = disabledSet.has(s);
    const candidate = seatCandidateMap.get(s) || null;
    const isDesignated = designatedSeatNumbers.includes(s);

    // In spaced mode, if a seat is not disabled, not designated for candidate, it's a spacing gap
    const isSpacedEmpty = seatingMode === 'spaced' && !isDisabled && !isDesignated && candidate === null;

    seats.push({
      seatNumber: s,
      isDisabled,
      isSpacedEmpty,
      candidate,
    });
  }

  return seats;
}

function createEmptySeats(capacity: number, disabledSet: Set<number>): CaslabSeat[] {
  const seats: CaslabSeat[] = [];
  for (let s = 1; s <= capacity; s++) {
    seats.push({
      seatNumber: s,
      isDisabled: disabledSet.has(s),
      isSpacedEmpty: false,
      candidate: null,
    });
  }
  return seats;
}

/**
 * Swaps or moves candidates between any two seats (intra-room or inter-room).
 */
export function swapCaslabSeats(
  allocations: CaslabRoomAllocation[],
  sourceRoomId: string,
  sourceSeatNumber: number,
  targetRoomId: string,
  targetSeatNumber: number
): CaslabRoomAllocation[] {
  const nextAllocations = allocations.map((alloc) => ({
    ...alloc,
    seats: alloc.seats.map((seat) => ({ ...seat })),
    assignedCandidates: [...alloc.assignedCandidates],
  }));

  const sourceAlloc = nextAllocations.find((a) => a.room.id === sourceRoomId);
  const targetAlloc = nextAllocations.find((a) => a.room.id === targetRoomId);

  if (!sourceAlloc || !targetAlloc) return allocations;

  const sourceSeat = sourceAlloc.seats.find((s) => s.seatNumber === sourceSeatNumber);
  const targetSeat = targetAlloc.seats.find((s) => s.seatNumber === targetSeatNumber);

  if (!sourceSeat || !targetSeat) return allocations;

  // Swap candidate pointers
  const tempCandidate = sourceSeat.candidate;
  sourceSeat.candidate = targetSeat.candidate;
  targetSeat.candidate = tempCandidate;

  // Re-sync assignedCandidates lists
  sourceAlloc.assignedCandidates = sourceAlloc.seats
    .map((s) => s.candidate)
    .filter((c): c is CaslabCandidate => c !== null);

  targetAlloc.assignedCandidates = targetAlloc.seats
    .map((s) => s.candidate)
    .filter((c): c is CaslabCandidate => c !== null);

  return nextAllocations;
}

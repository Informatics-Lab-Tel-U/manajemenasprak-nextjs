'use client';

import React, { useState } from 'react';
import {
  Ban,
  ArrowLeftRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { CaslabRoomAllocation, CaslabSeat } from '@/types/caslab';

interface CaslabRoomSeatGridProps {
  allocations: CaslabRoomAllocation[];
  onToggleDisabledSeat: (roomId: string, seatNumber: number) => void;
  onResetDisabledSeats: (roomId: string) => void;
  onSwapSeats: (
    sourceRoomId: string,
    sourceSeatNum: number,
    targetRoomId: string,
    targetSeatNum: number
  ) => void;
}

const COLOR_VARIANTS = [
  'blue',
  'green',
  'amber',
  'purple',
  'rose',
  'cyan',
  'indigo',
  'teal',
] as const;

const ASPRAK_VARIANTS: Record<string, string> = {};

function getAsprakVariant(asprak: string): string {
  if (!ASPRAK_VARIANTS[asprak]) {
    let hash = 0;
    for (let i = 0; i < asprak.length; i++) {
      hash = (hash << 5) - hash + asprak.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % COLOR_VARIANTS.length;
    ASPRAK_VARIANTS[asprak] = COLOR_VARIANTS[idx];
  }
  return ASPRAK_VARIANTS[asprak];
}

export function CaslabRoomSeatGrid({
  allocations,
  onToggleDisabledSeat,
  onResetDisabledSeats,
  onSwapSeats,
}: CaslabRoomSeatGridProps) {
  const [activeTab, setActiveTab] = useState<string>(allocations[0]?.room.id || 'room-1');
  const [selectedSeat, setSelectedSeat] = useState<{
    roomId: string;
    seatNumber: number;
    candidateName: string;
  } | null>(null);
  const [dragSource, setDragSource] = useState<{ roomId: string; seatNumber: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ roomId: string; seatNumber: number } | null>(null);

  if (allocations.length === 0) return null;

  const handleDragStart = (roomId: string, seatNumber: number) => {
    setDragSource({ roomId, seatNumber });
  };

  const handleDragOver = (e: React.DragEvent, roomId: string, seatNumber: number) => {
    e.preventDefault();
    if (dragOver?.roomId !== roomId || dragOver?.seatNumber !== seatNumber) {
      setDragOver({ roomId, seatNumber });
    }
  };

  const handleDragLeave = (roomId: string, seatNumber: number) => {
    if (dragOver?.roomId === roomId && dragOver?.seatNumber === seatNumber) {
      setDragOver(null);
    }
  };

  const handleDrop = (targetRoomId: string, targetSeatNumber: number) => {
    if (
      dragSource &&
      (dragSource.roomId !== targetRoomId || dragSource.seatNumber !== targetSeatNumber)
    ) {
      onSwapSeats(dragSource.roomId, dragSource.seatNumber, targetRoomId, targetSeatNumber);
      toast.success(`Posisi ditukar: Meja #${dragSource.seatNumber} ⇄ #${targetSeatNumber}.`);
      setSelectedSeat(null);
    }
    setDragSource(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOver(null);
  };

  const handleSeatClick = (
    roomId: string,
    seat: CaslabSeat
  ) => {
    if (seat.isDisabled) {
      toast.info(`Meja #${seat.seatNumber} sedang dinonaktifkan.`);
      return;
    }

    if (!selectedSeat) {
      if (seat.candidate) {
        setSelectedSeat({
          roomId,
          seatNumber: seat.seatNumber,
          candidateName: seat.candidate.nama_lengkap,
        });
        toast.info(
          `Pilih kursi tujuan untuk menukar Meja #${seat.seatNumber} (${seat.candidate.nama_lengkap}).`
        );
      }
    } else {
      if (selectedSeat.roomId === roomId && selectedSeat.seatNumber === seat.seatNumber) {
        setSelectedSeat(null);
        toast.info('Batal menukar posisi.');
      } else {
        onSwapSeats(
          selectedSeat.roomId,
          selectedSeat.seatNumber,
          roomId,
          seat.seatNumber
        );
        toast.success(
          `Posisi ditukar: Meja #${selectedSeat.seatNumber} ⇄ #${seat.seatNumber}.`
        );
        setSelectedSeat(null);
      }
    }
  };

  const seatsPerCol = 10;

  return (
    <div className="space-y-4">
      {/* Swap Status Bar if active */}
      {selectedSeat && (
        <div className="flex items-center justify-between p-3 px-4 bg-muted border border-border rounded-md text-sm">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <span>
              Tukar Meja #{selectedSeat.seatNumber} ({selectedSeat.candidateName}) — klik kursi tujuan untuk menukar.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSeat(null)}
          >
            Batal
          </Button>
        </div>
      )}

      {/* Room Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {allocations.length > 1 && (
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              {allocations.map((alloc) => (
                <TabsTrigger
                  key={alloc.room.id}
                  value={alloc.room.id}
                >
                  {alloc.room.name} ({alloc.assignedCandidates.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <span className="text-sm text-muted-foreground">
              Total: {allocations.reduce((acc, a) => acc + a.assignedCandidates.length, 0)} Peserta
            </span>
          </div>
        )}

        {allocations.map((alloc) => {
          // Partition seats into columns of 10 seats (identical to generator-kursi SeatsTab)
          const columns: CaslabSeat[][] = [];
          const totalCols = Math.ceil(alloc.seats.length / seatsPerCol);
          for (let c = 0; c < totalCols; c++) {
            const col = alloc.seats.slice(c * seatsPerCol, (c + 1) * seatsPerCol);
            if (col.length > 0) columns.push(col);
          }

          return (
            <TabsContent key={alloc.room.id} value={alloc.room.id} className="space-y-4 mt-0">
              {/* Seat Grid — Identical to generator-kursi SeatsTab */}
              <div className="seats-natural overflow-x-auto pb-2">
                <div
                  className="seat-grid"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                    minWidth: `${columns.length * 220}px`,
                  }}
                >
                  {columns.map((column, colIdx) => (
                    <div key={colIdx} className="seat-column">
                      {/* Column Header: 36px 1fr 84px */}
                      <div className="seat-column-header">
                        <span className="col-no">NO</span>
                        <span className="col-nim">NAMA</span>
                        <span className="col-asprak">KODE</span>
                      </div>

                      {/* Seat Rows: 36px 1fr 84px, min-height 56px */}
                      {column.map((seat) => {
                        const c = seat.candidate;
                        const isSelected =
                          selectedSeat?.roomId === alloc.room.id &&
                          selectedSeat?.seatNumber === seat.seatNumber;
                        const isDragSource =
                          dragSource?.roomId === alloc.room.id &&
                          dragSource?.seatNumber === seat.seatNumber;
                        const isDragOver =
                          dragOver?.roomId === alloc.room.id &&
                          dragOver?.seatNumber === seat.seatNumber;

                        return (
                          <div
                            key={seat.seatNumber}
                            onClick={() => handleSeatClick(alloc.room.id, seat)}
                            draggable={Boolean(c) && !seat.isDisabled}
                            onDragStart={() => handleDragStart(alloc.room.id, seat.seatNumber)}
                            onDragOver={(e) => !seat.isDisabled && handleDragOver(e, alloc.room.id, seat.seatNumber)}
                            onDragLeave={() => handleDragLeave(alloc.room.id, seat.seatNumber)}
                            onDrop={() => !seat.isDisabled && handleDrop(alloc.room.id, seat.seatNumber)}
                            onDragEnd={handleDragEnd}
                            className={[
                              'seat-row',
                              seat.isDisabled && 'disabled',
                              c ? 'occupied' : 'empty',
                              isDragSource && 'dragging',
                              (isSelected || isDragOver) && 'drag-over',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            title={
                              seat.isDisabled
                                ? `Meja #${seat.seatNumber} (Nonaktif)`
                                : c
                                ? `Meja #${seat.seatNumber} - ${c.nama_lengkap} (${c.kode})`
                                : `Meja #${seat.seatNumber} (Kosong)`
                            }
                          >
                            {/* Meja No */}
                            <span className="cell-no">{seat.seatNumber}</span>

                            {/* Nama & NIM */}
                            <span className="cell-nim">
                              {seat.isDisabled ? (
                                <span className="text-sm text-destructive font-medium">Nonaktif</span>
                              ) : seat.isSpacedEmpty && !c ? (
                                <span className="text-sm text-muted-foreground italic">[ Jeda ]</span>
                              ) : !c ? (
                                <span className="text-sm text-muted-foreground">Kosong</span>
                              ) : (
                                <>
                                  <span className="name-default font-medium leading-tight block">
                                    {c.nama_lengkap}
                                  </span>
                                  <span className="text-[11px] font-mono text-muted-foreground block leading-none mt-0.5">
                                    {c.nim}
                                  </span>
                                </>
                              )}
                            </span>

                            {/* Kode Badge & Action */}
                            <span className="cell-asprak">
                              {c ? (
                                <span className={`asprak-badge asprak-badge-${getAsprakVariant(c.kode)}`}>
                                  {c.kode}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  title={seat.isDisabled ? 'Aktifkan Meja ini' : 'Nonaktifkan Meja ini'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleDisabledSeat(alloc.room.id, seat.seatNumber);
                                  }}
                                  className="text-muted-foreground/40 hover:text-foreground p-1 rounded transition-colors"
                                >
                                  <Ban className="size-3.5" />
                                </button>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend Footer */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                    Terisi ({alloc.assignedCandidates.length})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-border" />
                    Jeda Berselang
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-destructive/30" />
                    Nonaktif ({alloc.room.disabledSeats.length})
                  </span>
                  {alloc.room.disabledSeats.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onResetDisabledSeats(alloc.room.id)}
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive gap-1"
                    >
                      <RotateCcw className="size-3" />
                      Reset Kursi Nonaktif
                    </Button>
                  )}
                </div>

                <span>
                  Kapasitas: {alloc.room.capacity} Kursi
                </span>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

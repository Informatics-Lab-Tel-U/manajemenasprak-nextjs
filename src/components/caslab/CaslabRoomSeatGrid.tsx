'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Ban,
  ArrowLeftRight,
  Monitor,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { CaslabRoomAllocation, CaslabSeat } from '@/types/caslab';

interface CaslabRoomSeatGridProps {
  allocations: CaslabRoomAllocation[];
  onToggleDisabledSeat: (roomId: string, seatNumber: number) => void;
  onSwapSeats: (
    sourceRoomId: string,
    sourceSeatNum: number,
    targetRoomId: string,
    targetSeatNum: number
  ) => void;
}

export function CaslabRoomSeatGrid({
  allocations,
  onToggleDisabledSeat,
  onSwapSeats,
}: CaslabRoomSeatGridProps) {
  const [activeTab, setActiveTab] = useState<string>(allocations[0]?.room.id || 'room-1');
  const [selectedSeat, setSelectedSeat] = useState<{
    roomId: string;
    seatNumber: number;
    candidateName: string;
  } | null>(null);

  if (allocations.length === 0) return null;

  const handleSeatClick = (
    roomId: string,
    seat: CaslabSeat,
    e: React.MouseEvent
  ) => {
    if (e.altKey) {
      onToggleDisabledSeat(roomId, seat.seatNumber);
      return;
    }

    if (seat.isDisabled) {
      toast.info(`Meja ${seat.seatNumber} berstatus PC Rusak/Nonaktif.`);
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
          `Memilih Meja #${seat.seatNumber} (${seat.candidate.kode}). Klik kursi tujuan untuk menukar posisi.`
        );
      }
    } else {
      if (selectedSeat.roomId === roomId && selectedSeat.seatNumber === seat.seatNumber) {
        setSelectedSeat(null);
        toast.info('Pemilihan kursi dibatalkan.');
      } else {
        onSwapSeats(
          selectedSeat.roomId,
          selectedSeat.seatNumber,
          roomId,
          seat.seatNumber
        );
        toast.success(
          `Posisi ditukar: Meja #${selectedSeat.seatNumber} ⇄ Meja #${seat.seatNumber}`
        );
        setSelectedSeat(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Swap Status Bar if active */}
      {selectedSeat && (
        <div className="flex items-center justify-between p-2.5 px-4 bg-muted border border-border rounded-md text-xs">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <span>
              Menukar posisi dari <strong>Meja #{selectedSeat.seatNumber} ({selectedSeat.candidateName})</strong>. Klik kursi lain untuk menukar.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
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
                  className="text-xs"
                >
                  {alloc.room.name} ({alloc.assignedCandidates.length} Peserta)
                </TabsTrigger>
              ))}
            </TabsList>

            <span className="text-xs text-muted-foreground">
              Total 2 Ruangan: {allocations.reduce((acc, a) => acc + a.assignedCandidates.length, 0)} Peserta
            </span>
          </div>
        )}

        {allocations.map((alloc) => (
          <TabsContent key={alloc.room.id} value={alloc.room.id} className="space-y-4 mt-0">
            {/* Front of Room */}
            <div className="w-full py-2 bg-muted/60 border rounded-md text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-center gap-2">
              <Monitor className="h-4 w-4" />
              DEPAN / PAPAN TULIS — {alloc.room.name}
            </div>

            {/* Seat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5">
              {alloc.seats.map((seat) => {
                const isSelected =
                  selectedSeat?.roomId === alloc.room.id &&
                  selectedSeat?.seatNumber === seat.seatNumber;

                if (seat.isDisabled) {
                  return (
                    <div
                      key={seat.seatNumber}
                      className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 flex flex-col justify-between min-h-[96px] opacity-60 select-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-destructive">
                          #{String(seat.seatNumber).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          title="Aktifkan PC ini"
                          onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                          className="text-destructive/70 hover:text-destructive p-0.5 rounded"
                        >
                          <Wrench className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-center my-auto">
                        <span className="text-[10px] text-destructive block">
                          PC Rusak
                        </span>
                      </div>
                    </div>
                  );
                }

                if (seat.isSpacedEmpty && !seat.candidate) {
                  return (
                    <div
                      key={seat.seatNumber}
                      className="rounded-md border border-dashed p-2.5 flex flex-col justify-between min-h-[96px] opacity-40 select-none hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{String(seat.seatNumber).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          title="Tandai PC Rusak"
                          onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                          className="text-muted-foreground/40 hover:text-muted-foreground p-0.5 rounded"
                        >
                          <Wrench className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-center my-auto">
                        <span className="text-[10px] text-muted-foreground italic block">
                          Jeda
                        </span>
                      </div>
                    </div>
                  );
                }

                if (!seat.candidate) {
                  return (
                    <div
                      key={seat.seatNumber}
                      className="rounded-md border border-border/50 p-2.5 flex flex-col justify-between min-h-[96px] opacity-40 select-none hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{String(seat.seatNumber).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          title="Tandai PC Rusak"
                          onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                          className="text-muted-foreground/40 hover:text-muted-foreground p-0.5 rounded"
                        >
                          <Wrench className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-center my-auto">
                        <span className="text-[10px] text-muted-foreground block">
                          Kosong
                        </span>
                      </div>
                    </div>
                  );
                }

                const c = seat.candidate;

                return (
                  <div
                    key={seat.seatNumber}
                    onClick={(e) => handleSeatClick(alloc.room.id, seat, e)}
                    className={`rounded-md p-2.5 flex flex-col justify-between min-h-[96px] cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        #{String(seat.seatNumber).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        title="Tandai PC Rusak"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDisabledSeat(alloc.room.id, seat.seatNumber);
                        }}
                        className="text-muted-foreground/30 hover:text-muted-foreground p-0.5 rounded"
                      >
                        <Wrench className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-center my-1">
                      <Badge
                        variant="secondary"
                        className="font-mono font-bold text-[11px] px-2 py-0.5"
                      >
                        {c.kode}
                      </Badge>
                    </div>

                    <div className="space-y-0.5 text-center">
                      <p
                        className="text-[11px] font-medium text-foreground truncate leading-tight"
                        title={c.nama_lengkap}
                      >
                        {c.nama_lengkap}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {c.nim}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
              <div className="flex items-center gap-3">
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
                  PC Rusak ({alloc.room.disabledSeats.length})
                </span>
              </div>

              <span>
                Kapasitas Lab: <strong>{alloc.room.capacity} Kursi</strong>
              </span>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

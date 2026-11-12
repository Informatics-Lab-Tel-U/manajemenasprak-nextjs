'use client';

import React, { useState } from 'react';
import {
  Armchair,
  Wrench,
  Ban,
  ArrowLeftRight,
  Monitor,
  Check,
  X,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
    // If Alt key or right click, toggle disabled
    if (e.altKey) {
      onToggleDisabledSeat(roomId, seat.seatNumber);
      return;
    }

    if (seat.isDisabled) {
      toast.info(`Meja ${seat.seatNumber} berstatus PC Rusak/Nonaktif. Tekan tombol gear atau klik kanan untuk mengaktifkan.`);
      return;
    }

    // Swapping logic
    if (!selectedSeat) {
      if (seat.candidate) {
        setSelectedSeat({
          roomId,
          seatNumber: seat.seatNumber,
          candidateName: seat.candidate.nama_lengkap,
        });
        toast.info(
          `Memilih Meja ${seat.seatNumber} (${seat.candidate.kode}). Klik kursi lain (di ruangan ini atau ruangan sebelah) untuk menukar posisi.`
        );
      }
    } else {
      if (selectedSeat.roomId === roomId && selectedSeat.seatNumber === seat.seatNumber) {
        // Deselect
        setSelectedSeat(null);
        toast.info('Pemilihan kursi dibatalkan.');
      } else {
        // Execute Swap
        onSwapSeats(
          selectedSeat.roomId,
          selectedSeat.seatNumber,
          roomId,
          seat.seatNumber
        );
        toast.success(
          `Posisi berhasil ditukar: Meja ${selectedSeat.seatNumber} ⇄ Meja ${seat.seatNumber}`
        );
        setSelectedSeat(null);
      }
    }
  };

  return (
    <Card className="border border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Armchair className="w-5 h-5 text-primary" />
              3. Visual Denah Layout Kursi Ujian
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Klik kursi peserta untuk menukar posisi (swap). Klik icon obeng/kunci untuk menandai PC Rusak.
            </p>
          </div>

          {selectedSeat && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg text-xs animate-pulse">
              <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">
                Tukar dari Meja {selectedSeat.seatNumber} ({selectedSeat.candidateName})
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedSeat(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Multi-Room Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {allocations.length > 1 && (
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                {allocations.map((alloc, idx) => (
                  <TabsTrigger
                    key={alloc.room.id}
                    value={alloc.room.id}
                    className="text-xs font-semibold gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        idx === 0 ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />
                    {alloc.room.name} ({alloc.assignedCandidates.length} Caslab)
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          {allocations.map((alloc) => (
            <TabsContent key={alloc.room.id} value={alloc.room.id} className="space-y-6 mt-0">
              {/* Whiteboard / Front of Room Banner */}
              <div className="w-full py-2.5 px-4 bg-muted/60 border border-border/80 rounded-lg text-center text-xs font-medium text-muted-foreground tracking-widest uppercase flex items-center justify-center gap-2 shadow-2xs">
                <Monitor className="w-4 h-4 text-primary" />
                DEPAN / PAPAN TULIS / MEJA PENGAWAS ({alloc.room.name})
              </div>

              {/* Seat Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
                {alloc.seats.map((seat) => {
                  const isSelected =
                    selectedSeat?.roomId === alloc.room.id &&
                    selectedSeat?.seatNumber === seat.seatNumber;

                  if (seat.isDisabled) {
                    return (
                      <div
                        key={seat.seatNumber}
                        className="relative rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex flex-col justify-between min-h-[110px] opacity-70 transition-all select-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-destructive">
                            #{String(seat.seatNumber).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            title="Aktifkan PC ini kembali"
                            onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                            className="text-destructive/70 hover:text-destructive p-0.5 rounded"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-center my-auto">
                          <Ban className="w-5 h-5 mx-auto text-destructive/50 mb-1" />
                          <span className="text-[10px] font-medium text-destructive/80 block leading-tight">
                            PC Nonaktif / Rusak
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (seat.isSpacedEmpty && !seat.candidate) {
                    return (
                      <div
                        key={seat.seatNumber}
                        className="relative rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 flex flex-col justify-between min-h-[110px] opacity-60 select-none hover:opacity-100 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium text-muted-foreground">
                            #{String(seat.seatNumber).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            title="Tandai PC Rusak"
                            onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                            className="text-muted-foreground/50 hover:text-muted-foreground p-0.5 rounded"
                          >
                            <Wrench className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-center my-auto">
                          <span className="text-[10px] text-muted-foreground/80 font-mono italic block">
                            [ Jeda Berselang ]
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (!seat.candidate) {
                    return (
                      <div
                        key={seat.seatNumber}
                        className="relative rounded-xl border border-border/50 bg-background/40 p-3 flex flex-col justify-between min-h-[110px] opacity-50 select-none hover:opacity-80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium text-muted-foreground">
                            #{String(seat.seatNumber).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            title="Tandai PC Rusak"
                            onClick={() => onToggleDisabledSeat(alloc.room.id, seat.seatNumber)}
                            className="text-muted-foreground/50 hover:text-muted-foreground p-0.5 rounded"
                          >
                            <Wrench className="w-3 h-3" />
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

                  // Active candidate seat
                  const c = seat.candidate;

                  return (
                    <div
                      key={seat.seatNumber}
                      onClick={(e) => handleSeatClick(alloc.room.id, seat, e)}
                      className={`relative rounded-xl p-3 flex flex-col justify-between min-h-[110px] cursor-pointer transition-all duration-200 shadow-2xs ${
                        isSelected
                          ? 'border-2 border-primary bg-primary/15 shadow-md scale-102 ring-2 ring-primary/20'
                          : 'border border-border/80 bg-card hover:border-primary/60 hover:shadow-sm hover:scale-[1.01]'
                      }`}
                    >
                      {/* Card Header: Seat number & tool icon */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-muted-foreground">
                          Meja #{String(seat.seatNumber).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          title="Tandai PC Rusak"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDisabledSeat(alloc.room.id, seat.seatNumber);
                          }}
                          className="text-muted-foreground/40 hover:text-muted-foreground p-0.5 rounded"
                        >
                          <Wrench className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Main Candidate Badge: Kode Aslab */}
                      <div className="text-center my-1">
                        <Badge
                          variant="secondary"
                          className="font-mono font-extrabold tracking-wider text-xs px-2.5 py-1 bg-primary text-primary-foreground shadow-2xs border-0"
                        >
                          {c.kode}
                        </Badge>
                      </div>

                      {/* Candidate Name & NIM */}
                      <div className="space-y-0.5 text-center">
                        <p
                          className="text-[11px] font-semibold text-foreground truncate leading-tight"
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

              {/* Legend & Stats */}
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50 gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary" />
                    Terisi ({alloc.assignedCandidates.length})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-dashed border-border bg-muted/30" />
                    Jeda Berselang
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />
                    PC Rusak ({alloc.room.disabledSeats.length})
                  </span>
                </div>

                <div className="text-xs">
                  Total Kapasitas Fisik: <strong>{alloc.room.capacity} PC</strong>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

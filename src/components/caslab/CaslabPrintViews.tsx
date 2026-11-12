'use client';

import React, { useState } from 'react';
import { Printer, FileText, DoorOpen, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CaslabRoomAllocation } from '@/types/caslab';

interface CaslabPrintViewsProps {
  allocations: CaslabRoomAllocation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'door' | 'attendance';
}

export function CaslabPrintViews({
  allocations,
  open,
  onOpenChange,
  type,
}: CaslabPrintViewsProps) {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-xs z-10 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {type === 'door' ? (
                <>
                  <DoorOpen className="w-5 h-5 text-primary" />
                  Cetak Lembar Pintu Masuk Lab
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-primary" />
                  Cetak Berita Acara & Lembar Presensi Pengawas
                </>
              )}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Siap dicetak pada kertas A4. Gunakan opsi cetak browser (Ctrl + P / ⌘ + P).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" />
              Cetak Sekarang
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Content Area */}
        <div id="caslab-print-area" className="p-8 space-y-12 bg-white text-black text-sm">
          {allocations.map((alloc, roomIndex) => {
            // Sort assigned participants by seat number
            const seatedParticipants = alloc.seats
              .filter((s) => s.candidate !== null)
              .map((s) => ({
                seatNumber: s.seatNumber,
                candidate: s.candidate!,
              }))
              .sort((a, b) => a.seatNumber - b.seatNumber);

            return (
              <div
                key={alloc.room.id}
                className={`space-y-6 ${roomIndex > 0 ? 'break-before-page pt-8 border-t-2 border-dashed border-gray-300' : ''}`}
              >
                {/* Header */}
                <div className="border-b-2 border-black pb-4 text-center space-y-1">
                  <h1 className="text-lg font-bold tracking-tight uppercase">
                    INFORMATICS LABORATORY — TELKOM UNIVERSITY
                  </h1>
                  <h2 className="text-base font-semibold tracking-wide uppercase text-gray-800">
                    {type === 'door'
                      ? 'DENAH & DAFTAR PESERTA TES SELEKSI CASLAB'
                      : 'BERITA ACARA & DAFTAR HADIR SELEKSI CASLAB'}
                  </h2>
                  <div className="flex justify-between items-center text-xs font-medium text-gray-600 pt-2 px-2">
                    <span>Ruangan: <strong>{alloc.room.name}</strong></span>
                    <span>Tanggal: <strong>{currentDate}</strong></span>
                    <span>Total Peserta: <strong>{seatedParticipants.length} Orang</strong></span>
                  </div>
                </div>

                {type === 'door' ? (
                  /* Lembar Pintu (Door Sheet) */
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 italic">
                      * Silakan cari nama/NIM Anda dan langsung tempati meja sesuai nomor yang tertera di bawah ini.
                    </p>

                    <table className="w-full text-left text-xs border border-collapse border-black">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="border border-black py-2 px-3 text-center w-16">No Meja</th>
                          <th className="border border-black py-2 px-3 text-center w-24">Kode Aslab</th>
                          <th className="border border-black py-2 px-3 w-32">NIM</th>
                          <th className="border border-black py-2 px-3">Nama Lengkap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seatedParticipants.map((p) => (
                          <tr key={p.candidate.id} className="border-b border-gray-300">
                            <td className="border border-black py-1.5 px-3 text-center font-bold font-mono text-sm">
                              #{String(p.seatNumber).padStart(2, '0')}
                            </td>
                            <td className="border border-black py-1.5 px-3 text-center font-mono font-extrabold text-sm tracking-wider">
                              {p.candidate.kode}
                            </td>
                            <td className="border border-black py-1.5 px-3 font-mono">
                              {p.candidate.nim}
                            </td>
                            <td className="border border-black py-1.5 px-3 font-medium">
                              {p.candidate.nama_lengkap}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Lembar Presensi Pengawas (Attendance Sheet) */
                  <div className="space-y-6">
                    <table className="w-full text-left text-xs border border-collapse border-black">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <th className="border border-black py-2 px-2 text-center w-10">No</th>
                          <th className="border border-black py-2 px-2 text-center w-16">Meja</th>
                          <th className="border border-black py-2 px-2 text-center w-20">Kode</th>
                          <th className="border border-black py-2 px-3 w-28">NIM</th>
                          <th className="border border-black py-2 px-3">Nama Lengkap</th>
                          <th className="border border-black py-2 px-3 text-center w-32">Tanda Tangan</th>
                          <th className="border border-black py-2 px-2 text-center w-20">Ket.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seatedParticipants.map((p, idx) => (
                          <tr key={p.candidate.id} className="border-b border-gray-300">
                            <td className="border border-black py-2 px-2 text-center font-mono">
                              {idx + 1}
                            </td>
                            <td className="border border-black py-2 px-2 text-center font-mono font-bold">
                              #{String(p.seatNumber).padStart(2, '0')}
                            </td>
                            <td className="border border-black py-2 px-2 text-center font-mono font-bold">
                              {p.candidate.kode}
                            </td>
                            <td className="border border-black py-2 px-3 font-mono">
                              {p.candidate.nim}
                            </td>
                            <td className="border border-black py-2 px-3 font-medium">
                              {p.candidate.nama_lengkap}
                            </td>
                            <td className="border border-black py-2 px-3 text-center h-10">
                              {/* Signature placeholder */}
                            </td>
                            <td className="border border-black py-2 px-2 text-center">
                              {/* Hadir / Tidak */}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Proctors Signature Area */}
                    <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                      <div className="space-y-16">
                        <p>Pengawas Ruangan 1,</p>
                        <div>
                          <p className="font-bold underline">(........................................................)</p>
                          <p className="text-[11px] text-gray-500">Nama Lengkap & Kode Aslab</p>
                        </div>
                      </div>

                      <div className="space-y-16">
                        <p>Pengawas Ruangan 2,</p>
                        <div>
                          <p className="font-bold underline">(........................................................)</p>
                          <p className="text-[11px] text-gray-500">Nama Lengkap & Kode Aslab</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}


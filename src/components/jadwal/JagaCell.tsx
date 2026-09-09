'use client';

import React from 'react';
import { getCourseColor } from '@/utils/colorUtils';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface JagaCellProps {
  jaga: any;
  presensi?: any;
  userRole?: string;
  onEdit?: (jaga: any) => void;
  onDelete?: (jaga: any) => void;
}

export const JagaCell: React.FC<JagaCellProps> = ({
  jaga,
  presensi,
  userRole,
  onEdit,
  onDelete,
}) => {
  const isHadir = Boolean(presensi);
  const isTerlambat = presensi?.status === 'TERLAMBAT';
  const hadirTime = presensi?.waktu_masuk
    ? format(new Date(presensi.waktu_masuk), 'HH:mm', { locale: id })
    : null;

  // Base color remains the unique color for each asprak
  const bgColor = getCourseColor(jaga.asprak?.kode || jaga.asprak?.nama_lengkap || 'ASPRAK');

  return (
    <div
      role={userRole === 'ADMIN' ? 'button' : undefined}
      tabIndex={userRole === 'ADMIN' ? 0 : undefined}
      onClick={() => userRole === 'ADMIN' && onEdit?.(jaga)}
      onKeyDown={
        userRole === 'ADMIN'
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit?.(jaga);
              }
            }
          : undefined
      }
      className={`group relative w-full h-full flex flex-col items-center justify-center transition-all overflow-hidden select-none text-white min-h-[72px] 2xl:min-h-[88px] ${
        isHadir
          ? isTerlambat
            ? 'z-20 bg-amber-950/50 dark:bg-amber-950/70'
            : 'z-20 bg-slate-900/40 dark:bg-slate-950/70'
          : ''
      } ${
        userRole === 'ADMIN'
          ? 'cursor-pointer hover:brightness-110 hover:z-30 hover:shadow-lg'
          : ''
      }`}
      style={isHadir ? {} : { backgroundColor: bgColor }}
      title={`${jaga.asprak?.nama_lengkap || 'Asisten'} (${jaga.asprak?.nim || '-'}) — ${
        isHadir
          ? isTerlambat
            ? `Terlambat (${hadirTime})`
            : `Hadir (${hadirTime})`
          : 'Belum Hadir'
      }`}
    >
      {isHadir && (
        <>
          {/* Inner content mask di belakang border animasi */}
          <div className="absolute inset-[3px] z-0" style={{ backgroundColor: bgColor }} />

          <style>{`
            @keyframes snake-crawl {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -100; }
            }
          `}</style>

          {/* Efek grid dan ular retro animasi persis ScheduleCell overview */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
            {/* Rel Grid Latar Belakang (Kotak-kotak kosong) */}
            <rect
              className={
                isTerlambat
                  ? 'stroke-amber-700/30 dark:stroke-amber-400/25'
                  : 'stroke-green-700/30 dark:stroke-green-400/25'
              }
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="none"
              strokeWidth="6"
              pathLength="100"
              strokeDasharray="3 1"
            />

            {/* Ular (Kotak-kotak animasi) */}
            <rect
              className={
                isTerlambat
                  ? 'stroke-amber-500 dark:stroke-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]'
                  : 'stroke-green-600 dark:stroke-green-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]'
              }
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="none"
              strokeWidth="6"
              pathLength="100"
              strokeDasharray="3 1 3 1 3 1 3 85"
              style={{ animation: 'snake-crawl 2s steps(25) infinite' }}
            />
          </svg>
        </>
      )}
      {/* Admin quick actions */}
      {userRole === 'ADMIN' && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm rounded p-0.5 z-30">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(jaga); }}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white"
            title="Edit Jadwal"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(jaga); }}
            className="p-1 hover:bg-red-500/80 rounded transition-colors text-white"
            title="Hapus Jadwal"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main content — centered like Excel block */}
      <div className="text-center leading-tight relative z-10 w-full px-1">
        <div className="font-bold text-sm 2xl:text-base text-white drop-shadow-sm tracking-wide">
          {jaga.asprak?.kode || 'Unknown'}
        </div>

        {isHadir && hadirTime && (
          <div
            className={`mt-1 inline-block text-[10px] 2xl:text-[11px] bg-black/50 text-white px-1.5 py-0.5 rounded font-mono font-semibold backdrop-blur-sm border ${
              isTerlambat
                ? 'border-amber-400/60 text-amber-200'
                : 'border-emerald-400/60 text-emerald-200'
            }`}
          >
            {hadirTime}
          </div>
        )}
      </div>
    </div>
  );
};

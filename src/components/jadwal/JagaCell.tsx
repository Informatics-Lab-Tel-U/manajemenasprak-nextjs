'use client';

import React from 'react';
import { getCourseColor } from '@/utils/colorUtils';
import { Edit2, Trash2, Check, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface JagaCellProps {
  jaga: any;
  presensi?: any;
  userRole?: string;
  onEdit?: (jaga: any) => void;
  onDelete?: (jaga: any) => void;
  onQuickPresensi?: (jaga: any, status: 'HADIR' | 'TERLAMBAT') => void;
  onDeletePresensi?: (presensiId: string, asprakName: string) => void;
}

const SynchronizedJagaSnakeBorder: React.FC<{ isTerlambat?: boolean }> = ({ isTerlambat }) => {
  // Synchronize animation phase with global epoch clock so all cells move in unison
  const [syncDelay] = React.useState(() => `${-((Date.now() % 2000) / 1000)}s`);

  return (
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
        style={{ animation: `snake-crawl 2s steps(25) ${syncDelay} infinite` }}
      />
    </svg>
  );
};

export const JagaCell: React.FC<JagaCellProps> = ({
  jaga,
  presensi,
  userRole,
  onEdit,
  onDelete,
  onQuickPresensi,
  onDeletePresensi,
}) => {
  const isHadir = Boolean(presensi);
  const isTerlambat = presensi?.status === 'TERLAMBAT';
  const hadirTime = presensi?.waktu_masuk
    ? format(new Date(presensi.waktu_masuk), 'HH:mm', { locale: id })
    : null;

  // Base color remains the unique color for each asprak
  const bgColor = getCourseColor(jaga.asprak?.kode || jaga.asprak?.nama_lengkap || 'ASPRAK');

  const asprakLabel = `${jaga.asprak?.nama_lengkap || 'Asisten'} (${jaga.asprak?.nim || '-'})`;
  const presensiStatusText = isHadir
    ? isTerlambat
      ? `Terlambat (${hadirTime})`
      : `Hadir (${hadirTime})`
    : 'Belum Hadir';

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
      title={`${asprakLabel}: ${presensiStatusText}`}
    >
      {isHadir && (
        <>
          {/* Inner content mask di belakang border animasi */}
          <div className="absolute inset-[3px] z-0" style={{ backgroundColor: bgColor }} />
          <SynchronizedJagaSnakeBorder isTerlambat={isTerlambat} />
        </>
      )}

      {/* Admin quick actions: Presensi & Manajemen Jadwal */}
      {userRole === 'ADMIN' && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-md p-0.5 z-30 border border-white/10 shadow-sm">
          {!isHadir ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickPresensi?.(jaga, 'HADIR');
                }}
                className="p-1 hover:bg-emerald-600 rounded transition-colors text-emerald-300 hover:text-white"
                title="Tandai Hadir Cepat"
                aria-label="Tandai Hadir Cepat"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickPresensi?.(jaga, 'TERLAMBAT');
                }}
                className="p-1 hover:bg-amber-600 rounded transition-colors text-amber-300 hover:text-white"
                title="Tandai Terlambat"
                aria-label="Tandai Terlambat"
              >
                <Clock className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePresensi?.(presensi.id, jaga.asprak?.kode || 'Asisten');
              }}
              className="p-1 hover:bg-rose-600 rounded transition-colors text-rose-300 hover:text-white"
              title="Batalkan Presensi (Tandai Belum Hadir)"
              aria-label="Batalkan Presensi"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <div className="w-[1px] h-3 bg-white/20 mx-0.5" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(jaga);
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white"
            title="Edit Penugasan Jadwal"
            aria-label="Edit Penugasan Jadwal"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(jaga);
            }}
            className="p-1 hover:bg-red-500/80 rounded transition-colors text-white"
            title="Hapus Penugasan Jadwal"
            aria-label="Hapus Penugasan Jadwal"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main content: centered like Excel block */}
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

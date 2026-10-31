import 'server-only';
import { honoFetch } from '@/lib/honoClient';

export interface IwanRoom {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  totalDevices: number;
  onlineDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface IwanDevice {
  id: string;
  roomId: string;
  roomName: string;
  label: string;
  seatNumber: number;
  macAddress: string;
  localIp: string;
  port: number;
  hostnameRaw: string | null;
  status: string;
  computedStatus: 'online' | 'offline' | 'streaming';
  activeViewer: string | null;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface IwanAdminToken {
  id: string;
  pair_code: string;
  auth_token: string;
  label: string;
  scope_all: boolean;
  allowed_room_ids: string[];
  is_paired: boolean;
  paired_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export async function getIwanRooms(): Promise<IwanRoom[]> {
  const res = await honoFetch<IwanRoom[]>('/api/iwan/rooms');
  return res.ok && res.data ? res.data : [];
}

export async function getIwanDevices(roomId?: string): Promise<IwanDevice[]> {
  const path = roomId ? `/api/iwan/devices?roomId=${encodeURIComponent(roomId)}` : '/api/iwan/devices';
  const res = await honoFetch<IwanDevice[]>(path);
  return res.ok && res.data ? res.data : [];
}

export async function getIwanAdminTokens(): Promise<IwanAdminToken[]> {
  const res = await honoFetch<IwanAdminToken[]>('/api/iwan/admin-tokens');
  return res.ok && res.data ? res.data : [];
}


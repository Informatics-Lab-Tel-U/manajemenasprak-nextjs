'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import type { Role } from '@/config/rbac';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  ASLAB: 'Asisten Laboratorium',
  ASPRAK_KOOR: 'Koordinator Asprak',
  ASPRAK: 'Asisten Praktikum',
  MAHASISWA: 'Mahasiswa',
  INTERN: 'Intern',
};

export function AccountSwitcher({
  nama,
  email,
  role,
}: {
  nama: string;
  email: string;
  role: Role;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      // 1. Revoke all server-side sessions (scope: 'global')
      await logout();
      // 2. Clear client-side tokens (localStorage/cookies managed by supabase-js)
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // 3. Hard navigate — forces full page reload, clearing all in-memory React state
      window.location.href = '/login';
    }
  }

  const initials = nama
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-semibold">
                {initials}
              </div>
              <div className="flex flex-col flex-1 gap-0.5 leading-none min-w-0">
                <span className="font-medium truncate">{nama}</span>
                <span className="text-xs text-muted-foreground truncate">{ROLE_LABEL[role]}</span>
              </div>
              <ChevronsUpDown className="ml-auto shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="flex flex-col min-w-0">
              <span className="font-medium truncate">{nama}</span>
              <span className="text-xs text-muted-foreground font-normal truncate">{email}</span>
              <span className="text-xs text-muted-foreground font-normal mt-0.5 truncate">
                {ROLE_LABEL[role]}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoading}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? 'Keluar...' : 'Keluar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

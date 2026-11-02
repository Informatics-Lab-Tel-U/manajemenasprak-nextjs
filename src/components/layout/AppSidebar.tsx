'use client';

import * as React from 'react';
import { ManasLogo } from '@/components/brand/ManasLogo';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  Home,
  Logs,
  Monitor,
  PlusCircle,
  Settings,
  Shield,
  Tv,
  UserCog,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { AccountSwitcher } from '../sidebar/AccountSwitcher';
import type { Role } from '@/config/rbac';
import { hasAccess } from '@/config/rbac';

type NavSubItem = {
  label: string;
  href: string;
};

/** Item tanpa sub-menu: langsung membuka halaman. */
type NavLeaf = {
  label: string;
  href: string;
  icon: React.ElementType;
};

/** Item dengan sub-menu: hanya membuka/menutup daftar, tidak punya halaman sendiri. */
type NavParent = {
  label: string;
  icon: React.ElementType;
  items: NavSubItem[];
};

type NavItem = NavLeaf | NavParent;

type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Urutan: pekerjaan harian dulu, lalu data akademik, alat, konten, dan terakhir administrasi sistem.
 * Label mengikuti judul halaman yang dibuka. Visibilitas item dikontrol `hasAccess()` dari rbac.ts.
 */
const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      { label: 'Beranda', href: '/', icon: Home },
      { label: 'Setup Tahun Ajaran', href: '/onboard', icon: PlusCircle },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        label: 'Jadwal',
        icon: Calendar,
        items: [
          { label: 'Jadwal Praktikum', href: '/jadwal' },
          { label: 'Jadwal Pengganti', href: '/jadwal/pengganti' },
          { label: 'Tanggal Modul', href: '/jadwal/modul' },
        ],
      },
      {
        label: 'Penjagaan',
        icon: Shield,
        items: [
          { label: 'Manajemen Penjagaan', href: '/jadwal-jaga' },
          { label: 'Rekap Penjagaan', href: '/jadwal-jaga/rekap' },
        ],
      },
      {
        label: 'Pelanggaran',
        icon: AlertTriangle,
        items: [
          { label: 'Log Pelanggaran', href: '/pelanggaran' },
          { label: 'Rekap Pelanggaran', href: '/pelanggaran-rekap' },
        ],
      },
    ],
  },
  {
    label: 'Akademik',
    items: [
      { label: 'Data Praktikum', href: '/praktikum', icon: FlaskConical },
      { label: 'Mata Kuliah', href: '/mata-kuliah', icon: BookOpen },
      { label: 'Data Praktikan', href: '/data-praktikan', icon: GraduationCap },
      {
        label: 'Asprak',
        icon: Users,
        items: [
          { label: 'Daftar Asprak', href: '/asprak?tab=data' },
          { label: 'Kode Asprak', href: '/asprak?tab=rules' },
        ],
      },
    ],
  },
  {
    label: 'Alat',
    items: [
      { label: 'Generator Presensi', href: '/generator/presensi', icon: FileSpreadsheet },
      { label: 'Generator Font Fingerprint', href: '/generator/font-generator', icon: Fingerprint },
    ],
  },
  {
    label: 'Konten',
    items: [
      {
        label: 'Blog Lab',
        icon: FileText,
        items: [
          { label: 'Semua Post', href: '/manage-post' },
          { label: 'Kategori & Tag', href: '/manage-post/taxonomy' },
          { label: 'Konfigurasi Web', href: '/manage-post/config' },
        ],
      },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { label: 'Monitoring Lab', href: '/monitoring', icon: Monitor },
      {
        label: 'IWAN Monitoring',
        icon: Tv,
        items: [
          { label: 'Ruangan & Sesi', href: '/iwan/rooms' },
          { label: 'Pemetaan PC', href: '/iwan/devices' },
          { label: 'Akses Admin', href: '/iwan/admin-access' },
        ],
      },
      { label: 'Manajemen Akun', href: '/manajemen-akun', icon: UserCog },
      { label: 'Audit Logs', href: '/audit-logs', icon: Logs },
      { label: 'Pengaturan', href: '/pengaturan', icon: Settings },
      { label: 'Panduan Sistem', href: '/panduan', icon: HelpCircle },
    ],
  },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    nama: string;
    email: string;
    role: Role;
  };
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleNavGroups = ALL_NAV_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) => {
      if ('items' in item) {
        return item.items.some((sub) => hasAccess(user.role, sub.href));
      }
      return hasAccess(user.role, item.href);
    });
    return { ...group, items: visibleItems };
  }).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="group-data-[collapsible=icon]:!p-0"
            >
              <Link prefetch={false} href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                <div className="flex aspect-square bg-white size-8 items-center justify-center rounded-lg shrink-0 p-1">
                  <ManasLogo className="size-full" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                  <span className="truncate font-semibold">Informatics Lab</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.role === 'ADMIN'
                      ? 'Manajemen Asprak'
                      : user.role === 'ASLAB'
                        ? 'Aslab Portal'
                        : 'Koor Portal'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {visibleNavGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  if ('items' in item) {
                    const isActive = item.items.some((sub) =>
                      pathname.startsWith(sub.href.split('?')[0])
                    );
                    const visibleSubItems = item.items.filter((sub) =>
                      hasAccess(user.role, sub.href)
                    );

                    return (
                      <Collapsible
                        key={item.label}
                        defaultOpen={isActive}
                        className="group/collapsible"
                        asChild
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label} isActive={isActive}>
                              <Icon />
                              <span>{item.label}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleSubItems.map((subItem) => {
                                const [basePath, query] = subItem.href.split('?');

                                const isBaseActive = pathname === basePath;
                                const isPrefixActive = pathname.startsWith(basePath + '/');
                                const queryMatches =
                                  !query || searchParams?.toString().includes(query);

                                const hasMoreSpecificMatch =
                                  (isBaseActive || isPrefixActive) &&
                                  visibleSubItems.some((other) => {
                                    const [otherPath] = other.href.split('?');
                                    return (
                                      otherPath.length > basePath.length &&
                                      pathname.startsWith(otherPath)
                                    );
                                  });

                                const isSubActive =
                                  (isBaseActive || isPrefixActive) &&
                                  queryMatches &&
                                  !hasMoreSpecificMatch;

                                return (
                                  <SidebarMenuSubItem key={subItem.href}>
                                    <SidebarMenuSubButton asChild isActive={isSubActive}>
                                      <Link prefetch={false} href={subItem.href}>
                                        <span>{subItem.label}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        tooltip={item.label}
                      >
                        <Link prefetch={false} href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <AccountSwitcher nama={user.nama} email={user.email} role={user.role} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

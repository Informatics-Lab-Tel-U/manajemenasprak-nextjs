'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Users,
  Calendar,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Settings,
  Notebook,
  Logs,
  Shield,
  UserRoundCheck,
  PlusCircle,
  FileSpreadsheet,
  Monitor,
  FileText,
  Fingerprint,
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
import { ChevronRight } from 'lucide-react';
import { AccountSwitcher } from '../sidebar/AccountSwitcher';
import type { Role } from '@/config/rbac';
import { hasAccess } from '@/config/rbac';

type NavSubItem = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** If provided, the item expands into sub-items */
  items?: NavSubItem[];
  /** If true, item renders with primary background */
  isPrimary?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * All possible nav groups. Visibility of items is controlled by `hasAccess()` from rbac.ts.
 * If a group has no visible items, it will not be rendered.
 */
const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main Menu',
    items: [
      { label: 'Setup Tahun Ajaran', href: '/onboard', icon: PlusCircle, isPrimary: true },
      { label: 'Overview', href: '/', icon: Home },
    ],
  },
  {
    label: 'Akademik & Data',
    items: [
      { label: 'Data Praktikum', href: '/praktikum', icon: BookOpen },
      { label: 'Data Praktikan', href: '/data-praktikan', icon: UserRoundCheck },
      { label: 'Mata Kuliah', href: '/mata-kuliah', icon: BookOpen },
      {
        label: 'Data Asisten Praktikum',
        href: '#',
        icon: Users,
        items: [
          { label: 'Data Asprak', href: '/asprak?tab=data' },
          { label: 'Generate Kode Asprak', href: '/asprak?tab=rules' },
        ],
      },
    ],
  },
  {
    label: 'Generator',
    items: [
      { label: 'Generate Presensi', href: '/generator/presensi', icon: FileSpreadsheet },
      { label: 'Font Fingerprint', href: '/generator/font-generator', icon: Fingerprint },
    ],
  },
  {
    label: 'Jadwal & Pelanggaran',
    items: [
      {
        label: 'Jadwal Praktikum',
        href: '#',
        icon: Calendar,
        items: [
          { label: 'Overview Jadwal', href: '/jadwal' },
          { label: 'Jadwal Pengganti', href: '/jadwal/pengganti' },
          { label: 'Tanggal Mulai Modul', href: '/jadwal/modul' },
        ],
      },
      {
        label: 'Pelanggaran',
        href: '#',
        icon: AlertTriangle,
        items: [
          { label: 'Kelola Pelanggaran', href: '/pelanggaran' },
          { label: 'Lihat Pelanggaran', href: '/pelanggaran-rekap' },
        ],
      },
      {
        label: 'Jadwal Jaga',
        href: '#',
        icon: Shield,
        items: [
          { label: 'Input Jaga', href: '/jadwal-jaga' },
          { label: 'Rekap Jaga', href: '/jadwal-jaga/rekap' },
        ],
      },
    ],
  },
  {
    label: 'CMS / Blog',
    items: [
      {
        label: 'Kelola Konten',
        href: '#',
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
      { label: 'Manajemen Akun', href: '/manajemen-akun', icon: Notebook },
      { label: 'Audit Logs', href: '/audit-logs', icon: Logs },
      { label: 'Panduan Sistem', href: '/panduan', icon: HelpCircle },
      { label: 'Pengaturan', href: '/pengaturan', icon: Settings },
    ],
  }
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
      if (item.items) {
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
                <div className="flex aspect-square bg-white p-0.5 size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground shrink-0">
                  <div className="relative w-full h-full overflow-hidden rounded-md">
                    <Image src="/iflab.png" alt="Logo" fill sizes="32px" className="object-contain" />
                  </div>
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
                  const isActive =
                    pathname === item.href ||
                    item.items?.some((sub) => pathname.startsWith(sub.href.split('?')[0]));
                const hasSubmenu = item.items && item.items.length > 0;

                if (hasSubmenu) {
                  const visibleSubItems = item.items!.filter((sub) =>
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
                      className={item.isPrimary ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground font-semibold shadow-sm' : ''}
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

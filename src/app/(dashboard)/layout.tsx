import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalTermSelector } from '@/components/GlobalTermSelector';
import { PlatformWatermark } from '@/components/brand/PlatformWatermark';

import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import { getCachedAvailableTerms } from '@/services/termService';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authUser = await requireAuth();
  const availableTerms = await getCachedAvailableTerms();

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar
          user={{
            nama: authUser.pengguna.nama_lengkap,
            email: authUser.email,
            role: authUser.pengguna.role,
          }}
        />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-2 sm:px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1">
            Manajemen Asisten Praktikum
          </h1>
          <PlatformWatermark heightClass="h-6" className="hidden sm:inline-flex shrink-0 mr-1" />
          <GlobalTermSelector 
            availableTerms={availableTerms} 
            disabled={authUser.pengguna.role === 'ASPRAK_KOOR'}
          />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

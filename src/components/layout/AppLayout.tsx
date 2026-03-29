import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar, { MobileSidebar } from "./AppSidebar";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";
import CommandPalette from "@/components/CommandPalette";
import PageTransition from "@/components/PageTransition";
import { useRealtimeProductionLogs } from "@/hooks/useRealtimeProductionLogs";
import { CustomerSessionProvider } from "@/hooks/useCustomerSession";
import CustomerSessionBanner from "@/components/CustomerSessionBanner";

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useRealtimeProductionLogs();

  return (
    <CustomerSessionProvider>
      <div className="flex h-screen overflow-hidden min-w-[320px]">
        <AppSidebar />
        <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader onMenuToggle={() => setMobileOpen(true)} onSearchClick={() => setCmdkOpen(true)} />
          <CustomerSessionBanner />
          <main className="flex-1 overflow-auto p-4 sm:p-6 bg-background">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
          <AppFooter />
        </div>
        <CommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
      </div>
    </CustomerSessionProvider>
  );
};

export default AppLayout;

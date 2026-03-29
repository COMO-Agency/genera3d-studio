import { Activity, Box, Settings, ChevronLeft, ChevronRight, AlertTriangle, ClipboardList, Palette, Glasses, Store, Tag, Users, Upload, FileText, Building2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";

/** Always visible for every authenticated user */
const coreNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/catalog", label: "Free Design Catalog", icon: Box },
  { to: "/labels", label: "Label-Shop", icon: Store },
];

const settingsNavItem = { to: "/settings", label: "Einstellungen", icon: Settings };

/** Visible when user belongs to an organization */
const orgNavItems = [
  { to: "/colors", label: "Farbkatalog", icon: Palette },
  { to: "/register", label: "Produktionsregister", icon: ClipboardList },
  { to: "/post-market", label: "Post-Market", icon: AlertTriangle },
];

const designsNavItem = { to: "/my-designs", label: "Meine Designs", icon: Glasses };


const adminNavItems = [
  { to: "/admin/organizations", label: "Admin: Organisationen", icon: Building2 },
  { to: "/admin/users", label: "Admin: Benutzer", icon: Users },
];

const gtinImportItem = { to: "/admin/gtin-import", label: "GTIN-Import", icon: Upload };

const docsNavItems = [
  { to: "/docs-portal", label: "Dokumenten-Portal", icon: FileText },
];

const labelAdminNavItems = [
  { to: "/label-admin", label: "Label verwalten", icon: Tag },
];

const SidebarNav = ({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) => {
  const location = useLocation();
  const { isPlatformAdmin } = useIsPlatformAdmin();
  const { isLabelAdmin } = useIsLabelAdmin();
  const { data: profile } = useProfile();
  const canManageLabel = isPlatformAdmin || isLabelAdmin;
  const showDocs = isLabelAdmin || isPlatformAdmin;

  const hasOrg = !!profile?.org_id;

  let navItems = [...coreNavItems];
  if (hasOrg || isLabelAdmin) navItems = [...navItems, designsNavItem];
  if (hasOrg) navItems = [...navItems, ...orgNavItems];

  if (canManageLabel) navItems = [...navItems, ...labelAdminNavItems, gtinImportItem];
  if (isPlatformAdmin) navItems = [...navItems, ...adminNavItems];
  if (showDocs) navItems = [...navItems, ...docsNavItems];
  navItems = [...navItems, settingsNavItem];

  return (
    <nav className="flex-1 py-4 space-y-1 px-2">
      {navItems.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(to + "/");
        return (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/15 text-primary border-l-[3px] border-primary neon-glow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
};

const SidebarLogo = ({ collapsed = false, orgName }: { collapsed?: boolean; orgName?: string }) => (
  <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
    <div className="h-8 w-8 rounded-md bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
      <span className="text-primary-foreground font-bold text-sm">G3</span>
    </div>
    {!collapsed && (
      <span className="font-semibold text-foreground tracking-tight truncate">
        {orgName || "Genera3D"}
      </span>
    )}
  </div>
);

// Mobile Sheet sidebar
export const MobileSidebar = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data: org } = useOrganization();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-56 p-0 bg-card border-border">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarLogo orgName={org?.name} />
        <SidebarNav onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
};

const AppSidebar = () => {
  const { data: org } = useOrganization();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("genera3d_sidebar_collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("genera3d_sidebar_collapsed", String(next)); } catch { /* storage blocked */ }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <SidebarLogo collapsed={collapsed} orgName={org?.name} />
      <SidebarNav collapsed={collapsed} />

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-primary transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;

import { Outlet, NavLink, Navigate } from "react-router-dom";
import { Tag, Box, Settings, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const tabs = [
  { to: "/label-admin/designs", label: "Designs", icon: Box },
  { to: "/label-admin/udi-pool", label: "UDI-Pool", icon: Barcode },
  { to: "/label-admin/settings", label: "Einstellungen", icon: Settings },
];

const LabelAdmin = () => {
  useDocumentTitle("Label-Admin");
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const { isLabelAdmin, isLoading: labelLoading } = useIsLabelAdmin();

  if (roleLoading || labelLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isPlatformAdmin && !isLabelAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Label verwalten</h1>
      </div>

      <nav className="flex gap-1 border-b border-border pb-px">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};

export default LabelAdmin;

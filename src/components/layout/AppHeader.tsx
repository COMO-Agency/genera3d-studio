import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Search, UserPlus } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useGtinPoolCount } from "@/hooks/useGtinPool";
import NotificationsDropdown from "@/components/header/NotificationsDropdown";
import UserMenu from "@/components/header/UserMenu";
import ThemeToggle from "@/components/header/ThemeToggle";
import PrinterStatusIndicator from "@/components/header/PrinterStatusIndicator";
import CustomerSessionDialog from "@/components/CustomerSessionDialog";
interface AppHeaderProps {
  onMenuToggle?: () => void;
  onSearchClick?: () => void;
}

const AppHeader = ({ onMenuToggle, onSearchClick }: AppHeaderProps) => {
  const { data: org } = useOrganization();
  const { active: sessionActive } = useCustomerSession();
  const { data: gtinCount } = useGtinPoolCount();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  return (
    <>
      <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuToggle} aria-label="Menü öffnen">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-sm font-semibold text-foreground">{org?.name ?? "Genera3D"}</h2>
          {gtinCount != null && (
            <Badge
              variant="outline"
              className={`text-[10px] ${gtinCount < 10 ? "border-warning text-warning" : "border-muted-foreground/30 text-muted-foreground"}`}
            >
              {gtinCount} GTINs
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={onSearchClick}>
            <Search className="h-4 w-4" />
          </Button>
          <button
            onClick={onSearchClick}
            className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <span className="text-xs">⌘</span>K
          </button>

          <PrinterStatusIndicator settings={org?.settings} />

          {!sessionActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSessionDialogOpen(true)} title="Druckauftrag anlegen">
              <UserPlus className="h-4 w-4" />
            </Button>
          )}


          <NotificationsDropdown org={org} />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <CustomerSessionDialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen} />
    </>
  );
};

export default AppHeader;

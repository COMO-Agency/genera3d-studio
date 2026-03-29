import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Box, Settings, LogOut, Printer, Heart, UserPlus, UserX, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrgDesigns } from "@/hooks/useOrgDesigns";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Activity },
  { label: "Katalog", to: "/catalog", icon: Box },
  { label: "Produktionsregister", to: "/register", icon: ShieldCheck },
  { label: "Einstellungen", to: "/settings", icon: Settings },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: orgDesigns } = useOrgDesigns();
  const { active: sessionActive, endSession } = useCustomerSession();

  const allDesigns = useMemo(() =>
    orgDesigns?.map((d) => ({ id: d.id, name: d.name, collectionName: d.collection ?? "Meine Designs" })) ?? []
  , [orgDesigns]);

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runAction = async (callback: () => void | Promise<void>) => {
    onOpenChange(false);
    await callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Suche nach Seiten, Designs oder Aktionen…" />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem key={item.to} onSelect={() => runAction(() => navigate(item.to))}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {allDesigns.length > 0 && (
          <CommandGroup heading="Designs">
            {allDesigns.map((design) => (
              <CommandItem key={design.id} onSelect={() => runAction(() => navigate(`/my-designs?design=${design.id}`))}>
                <Box className="mr-2 h-4 w-4" />
                <span>{design.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{design.collectionName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Aktionen">
          <CommandItem onSelect={() => runAction(() => navigate("/catalog"))}>
            <Printer className="mr-2 h-4 w-4" />
            <span>Neuer Druckauftrag</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => navigate("/catalog?tab=favorites"))}>
            <Heart className="mr-2 h-4 w-4" />
            <span>Favoriten anzeigen</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(async () => { await signOut(); navigate("/login"); })}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Abmelden</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Kunden-Session">
          {sessionActive ? (
            <CommandItem onSelect={() => runAction(() => endSession())}>
              <UserX className="mr-2 h-4 w-4" />
              <span>Kundenberatung beenden</span>
            </CommandItem>
          ) : (
            <CommandItem onSelect={() => runAction(() => { navigate("/catalog"); })}>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Kundenberatung starten</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Glasses, ScanBarcode, Layers } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NeonRing from "@/components/NeonRing";
import { isValidEmail } from "@/lib/sanitize";
import { getErrorMessage } from "@/lib/utils";

const storeCredential = async (id: string, pw: string) => {
  if (!("PasswordCredential" in window)) return;
  try {
    // @ts-expect-error PasswordCredential is not widely typed
    const PC = (window as Window & { PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential }).PasswordCredential;
    if (!PC) return;
    const cred = new PC({ id, password: pw, name: id });
    await navigator.credentials.store(cred);
  } catch { /* unsupported or denied */ }
};

const Login = () => {
  const titleMap = { signin: "Anmelden", signup: "Account erstellen", magic: "Magic Link" } as const;
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  useDocumentTitle(titleMap[mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setCardVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const sanitizedEmail = email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!isValidEmail(sanitizedEmail)) {
      toast({ title: "Ungültige E-Mail", description: "Bitte gib eine gültige E-Mail-Adresse ein.", variant: "destructive" });
      return;
    }

    if (mode !== "magic" && password.length < 6) {
      toast({ title: "Ungültiges Passwort", description: "Das Passwort muss mindestens 6 Zeichen haben.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup" && password !== confirmPassword) {
        toast({ title: "Fehler", description: "Passwörter stimmen nicht überein.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });
        if (error) throw error;
        await storeCredential(sanitizedEmail, password);
        toast({ title: "Willkommen zurück", description: "Du bist jetzt eingeloggt." });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast({ title: "Account erstellt", description: "Bitte bestätige deine E-Mail-Adresse." });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: sanitizedEmail,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast({ title: "Magic Link gesendet", description: "Prüfe dein E-Mail-Postfach." });
      }
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Left: Hero with Neon Ring */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" onMouseMove={handleMouseMove}>
        <img
          src="/hero-login.png"
          alt="Genera3D Produktionsumgebung"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out opacity-30"
          style={{
            transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.05)`,
            filter: 'brightness(0.4) saturate(0.3)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5" />

        {/* Neon ring effect in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
          <NeonRing className="inset-0" blur={25} opacity={0.5} />
        </div>

        {/* Floating Glassmorphism Elements */}
        <div
          className="absolute top-24 right-16 glass-dark rounded-2xl p-4 shadow-xl animate-float neon-glow"
          style={{
            transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 8}px)`,
          }}
        >
          <Glasses className="h-6 w-6 text-neon-cyan" aria-hidden="true" />
          <p className="text-xs font-medium text-foreground mt-1">Individuelle Fassungen</p>
        </div>

        <div
          className="absolute top-1/2 right-12 glass-dark rounded-2xl p-4 shadow-xl animate-float neon-glow-pink"
          style={{
            animationDelay: "1s",
            transform: `translate(${mousePos.x * -8}px, ${mousePos.y * 12}px)`,
          }}
        >
          <ScanBarcode className="h-6 w-6 text-neon-pink" aria-hidden="true" />
          <p className="text-xs font-medium text-foreground mt-1">UDI-Rückverfolgung</p>
        </div>

        <div
          className="absolute bottom-32 right-24 glass-dark rounded-2xl p-4 shadow-xl animate-float"
          style={{
            animationDelay: "2s",
            transform: `translate(${mousePos.x * 6}px, ${mousePos.y * -10}px)`,
            boxShadow: "0 0 15px hsl(var(--neon-purple) / 0.3)",
          }}
        >
          <Layers className="h-6 w-6 text-neon-purple" aria-hidden="true" />
          <p className="text-xs font-medium text-foreground mt-1">3D-Produktion</p>
        </div>

        <div className="relative z-10 flex flex-col justify-end p-12 animate-slide-left">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-bold text-sm">G3</span>
          </div>
          <h1 className="text-3xl font-light text-foreground mb-2 tracking-tight">Genera3D</h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Präzise Brillenfertigung — angetrieben durch additive Produktion und MDR-konforme UDI-Rückverfolgung.
          </p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="absolute inset-0 lg:hidden overflow-hidden">
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-neon-cyan/5 blur-3xl animate-neon-pulse" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-neon-pink/5 blur-3xl animate-neon-pulse" style={{ animationDelay: "1.5s" }} />
        </div>

        <div
          ref={cardRef}
          className={`relative z-10 w-full max-w-sm transition-all duration-700 ease-out ${cardVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <Card className="glass-dark shadow-2xl border-primary/10">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 h-12 w-12 rounded-lg bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center lg:hidden shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-lg">G3</span>
              </div>
              <CardTitle className="text-xl">{mode === "signup" ? "Account erstellen" : "Anmelden"}</CardTitle>
              <CardDescription>Zugang zu deiner Produktionsumgebung</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" action="/login" method="post">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@firma.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (email && !isValidEmail(email)) {
                        toast({ title: "Hinweis", description: "Bitte gib eine gültige E-Mail-Adresse ein.", variant: "destructive" });
                      }
                    }}
                    required
                    aria-invalid={email && !isValidEmail(email) ? "true" : "false"}
                    aria-describedby="email-help"
                  />
                  <p id="email-help" className="text-xs text-muted-foreground">Erforderlich für Anmeldung</p>
                </div>

                {mode !== "magic" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Passwort</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      {mode === "signup" && (
                        <p className="text-xs text-muted-foreground">Mindestens 6 Zeichen</p>
                      )}
                    </div>
                    {mode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "…" : mode === "signup" ? "Account erstellen" : mode === "signin" ? "Anmelden" : "Magic Link senden"}
                </Button>
              </form>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  oder
                </span>
              </div>

              {mode === "signin" && (
              <Button variant="outline" className="w-full" onClick={() => { setMode("signup"); setPassword(""); setConfirmPassword(""); }}>
                  Account erstellen
                </Button>
              )}
              {mode === "signup" && (
                <Button variant="outline" className="w-full" onClick={() => { setMode("signin"); setPassword(""); setConfirmPassword(""); }}>
                  Zurück zur Anmeldung
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => { setMode(mode === "magic" ? "signin" : "magic"); setPassword(""); setConfirmPassword(""); }}
              >
                {mode === "magic" ? "Mit Passwort anmelden" : "Magic Link verwenden"}
              </Button>
              {mode === "signin" && (
                <Button
                  variant="link"
                  className="w-full text-xs text-muted-foreground"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: "E-Mail eingeben", description: "Bitte gib zuerst deine E-Mail-Adresse ein.", variant: "destructive" });
                      return;
                    }
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: window.location.origin + "/reset-password",
                    });
                    if (error) {
                      toast({ title: "Fehler", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "E-Mail gesendet", description: "Prüfe dein Postfach für den Passwort-Reset-Link." });
                    }
                  }}
                >
                  Passwort vergessen?
                </Button>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <a href="https://como.digital" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Powered by COMO Digital
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

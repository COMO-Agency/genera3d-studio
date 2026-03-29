import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import OnboardingGate from "@/components/OnboardingGate";
import AppLayout from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Catalog = lazy(() => import("@/pages/Catalog"));
const ProductionRegister = lazy(() => import("@/pages/ProductionRegister"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PostMarket = lazy(() => import("@/pages/PostMarket"));
const AdminGtinImport = lazy(() => import("@/pages/AdminGtinImport"));
const AdminOrganizations = lazy(() => import("@/pages/AdminOrganizations"));
const DocsPortal = lazy(() => import("@/pages/DocsPortal"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const ColorCatalog = lazy(() => import("@/pages/ColorCatalog"));
const MyDesigns = lazy(() => import("@/pages/MyDesigns"));
const LabelAdmin = lazy(() => import("@/pages/LabelAdmin"));
const LabelAdminDesigns = lazy(() => import("@/pages/LabelAdminDesigns"));
const LabelAdminSettings = lazy(() => import("@/pages/LabelAdminSettings"));
const LabelAdminUdiPool = lazy(() => import("@/pages/LabelAdminUdiPool"));
const Labels = lazy(() => import("@/pages/Labels"));
const LabelDetail = lazy(() => import("@/pages/LabelDetail"));
const Login = lazy(() => import("@/pages/Login"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: Error) => {
        toast({
          title: "Fehler",
          description: error.message || "Aktion fehlgeschlagen.",
          variant: "destructive",
        });
      },
    },
  },
});

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <div className="animate-fade-in">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Onboarding — authenticated but no org/label yet */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          {/* All app routes require org or label membership */}
          <Route element={<ProtectedRoute />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/colors" element={<ColorCatalog />} />
                <Route path="/my-designs" element={<MyDesigns />} />
                <Route path="/register" element={<ProductionRegister />} />
                <Route
                  path="/history"
                  element={<Navigate to="/register" replace />}
                />
                <Route
                  path="/udi"
                  element={<Navigate to="/register" replace />}
                />
                <Route path="/post-market" element={<PostMarket />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/labels" element={<Labels />} />
                <Route path="/labels/:slug" element={<LabelDetail />} />
              </Route>
            </Route>
          </Route>
          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppLayout />}>
                <Route
                  path="/admin/organizations"
                  element={<AdminOrganizations />}
                />
                <Route path="/admin/users" element={<AdminUsers />} />
              </Route>
            </Route>
          </Route>
          {/* GTIN-Import: accessible by both platform admins and label admins */}
          <Route element={<ProtectedRoute requiredRole="label_admin" />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppLayout />}>
                <Route
                  path="/admin/gtin-import"
                  element={<AdminGtinImport />}
                />
              </Route>
            </Route>
          </Route>
          {/* Label-Admin or Platform-Admin routes */}
          <Route element={<ProtectedRoute requiredRole="label_admin" />}>
            <Route element={<OnboardingGate />}>
              <Route element={<AppLayout />}>
                <Route path="/docs-portal" element={<DocsPortal />} />
                <Route path="/label-admin" element={<LabelAdmin />}>
                  <Route
                    index
                    element={<Navigate to="/label-admin/designs" replace />}
                  />
                  <Route path="designs" element={<LabelAdminDesigns />} />
                  <Route path="udi-pool" element={<LabelAdminUdiPool />} />
                  <Route path="settings" element={<LabelAdminSettings />} />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;

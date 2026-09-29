import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ApiError } from "./api/client";
import { AuthProvider, ROLE_HOME, useAuth } from "./auth/AuthContext";
import { RequireAuth, RoleGuard } from "./auth/RoleGuard";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/ui";
import "./index.css";
import AccountPage from "./routes/Account";
import AdminPage from "./routes/Admin";
import AlertsPage from "./routes/Alerts";
import AuditPage from "./routes/Audit";
import CompliancePage from "./routes/Compliance";
import Home from "./routes/Home";
import RiskPage from "./routes/Risk";
import SafetyPage from "./routes/Safety";
import SignalsPage from "./routes/Signals";
import StudiesPage from "./routes/Studies";
import StudyDetail from "./routes/StudyDetail";
import NotFound from "./routes/NotFound";

// Lazy-loaded public entry routes
const Landing = lazy(() => import("./routes/Landing"));
const Login = lazy(() => import("./routes/Login"));
const DevKit = lazy(() => import("./routes/DevKit"));

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
    },
  },
});

function AppRootRedirect() {
  const { me } = useAuth();
  if (!me) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[me.role]} replace />;
}

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#0A0F0D]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes: Landing at /, Login at /login */}
              <Route
                path="/"
                element={
                  <PageSuspense>
                    <Landing />
                  </PageSuspense>
                }
              />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route
                path="/login"
                element={
                  <PageSuspense>
                    <Login />
                  </PageSuspense>
                }
              />
              <Route
                path="/__kit"
                element={
                  <PageSuspense>
                    <DevKit />
                  </PageSuspense>
                }
              />

              {/* Workspace Routes under /app/* */}
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<AppRootRedirect />} />
                <Route path="pi" element={<RoleGuard roles={["PI"]}><Home /></RoleGuard>} />
                <Route path="coordinator" element={<RoleGuard roles={["COORDINATOR"]}><Home /></RoleGuard>} />
                <Route path="monitor" element={<RoleGuard roles={["MONITOR"]}><Home /></RoleGuard>} />
                <Route path="iec" element={<RoleGuard roles={["IEC"]}><Home /></RoleGuard>} />
                <Route path="pv" element={<RoleGuard roles={["PV"]}><Home /></RoleGuard>} />
                <Route path="admin" element={<RoleGuard roles={["ADMIN"]}><Home /></RoleGuard>} />
                <Route path="regulator" element={<RoleGuard roles={["REGULATOR"]}><Home /></RoleGuard>} />
                <Route path="studies" element={<StudiesPage />} />
                <Route path="studies/:id" element={<StudyDetail />} />
                <Route path="safety" element={<RoleGuard perm="ae.read"><SafetyPage /></RoleGuard>} />
                <Route path="signals" element={<RoleGuard perm="pv.signals"><SignalsPage /></RoleGuard>} />
                <Route path="risk" element={<RiskPage />} />
                <Route path="audit" element={<RoleGuard perm="audit.read"><AuditPage /></RoleGuard>} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="compliance" element={<CompliancePage />} />
                <Route path="settings" element={<RoleGuard perm="rules.read"><AdminPage /></RoleGuard>} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Legacy fallback / 404 handler */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);

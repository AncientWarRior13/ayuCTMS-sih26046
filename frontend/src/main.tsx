import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ApiError } from "./api/client";
import { AuthProvider, ROLE_HOME, useAuth } from "./auth/AuthContext";
import { RequireAuth, RoleGuard } from "./auth/RoleGuard";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/ui";
import "./index.css";
import AdminPage from "./routes/Admin";
import AlertsPage from "./routes/Alerts";
import AuditPage from "./routes/Audit";
import CompliancePage from "./routes/Compliance";
import Home from "./routes/Home";
import Login from "./routes/Login";
import RiskPage from "./routes/Risk";
import SafetyPage from "./routes/Safety";
import SignalsPage from "./routes/Signals";
import StudiesPage from "./routes/Studies";
import StudyDetail from "./routes/StudyDetail";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
    },
  },
});

function RootRedirect() {
  const { me } = useAuth();
  return <Navigate to={me ? ROLE_HOME[me.role] : "/login"} replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<RootRedirect />} />
                <Route path="/pi" element={<RoleGuard roles={["PI"]}><Home /></RoleGuard>} />
                <Route path="/coordinator" element={<RoleGuard roles={["COORDINATOR"]}><Home /></RoleGuard>} />
                <Route path="/monitor" element={<RoleGuard roles={["MONITOR"]}><Home /></RoleGuard>} />
                <Route path="/iec" element={<RoleGuard roles={["IEC"]}><Home /></RoleGuard>} />
                <Route path="/pv" element={<RoleGuard roles={["PV"]}><Home /></RoleGuard>} />
                <Route path="/admin" element={<RoleGuard roles={["ADMIN"]}><Home /></RoleGuard>} />
                <Route path="/regulator" element={<RoleGuard roles={["REGULATOR"]}><Home /></RoleGuard>} />
                <Route path="/studies" element={<StudiesPage />} />
                <Route path="/studies/:id" element={<StudyDetail />} />
                <Route path="/safety" element={<RoleGuard perm="ae.read"><SafetyPage /></RoleGuard>} />
                <Route path="/signals" element={<RoleGuard perm="pv.signals"><SignalsPage /></RoleGuard>} />
                <Route path="/risk" element={<RiskPage />} />
                <Route path="/audit" element={<RoleGuard perm="audit.read"><AuditPage /></RoleGuard>} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/compliance" element={<CompliancePage />} />
                <Route path="/settings" element={<RoleGuard perm="rules.read"><AdminPage /></RoleGuard>} />
                <Route path="*" element={<RootRedirect />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);

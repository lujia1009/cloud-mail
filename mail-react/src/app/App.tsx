import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auth } from "../api/auth";
import { useApp, hasPerm } from "../stores/app";
import { Skeleton, Toast } from "../components/Feedback";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/LoginPage";
const MailPage = lazy(() =>
  import("../features/mail/MailPage").then((m) => ({ default: m.MailPage })),
);
const DraftsPage = lazy(() =>
  import("../features/compose/DraftsPage").then((m) => ({
    default: m.DraftsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const AdminPage = lazy(() =>
  import("../features/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const AnalysisPage = lazy(() =>
  import("../features/admin/AnalysisPage").then((m) => ({
    default: m.AnalysisPage,
  })),
);
function ThemeSync() {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
function Protected() {
  const loc = useLocation();
  const setUser = useApp((s) => s.setUser);
  const setConfig = useApp((s) => s.setConfig);
  const account = useApp((s) => s.account);
  const setAccount = useApp((s) => s.setAccount);
  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: auth.user,
    enabled: !!localStorage.getItem("token"),
    retry: false,
  });
  const configQuery = useQuery({ queryKey: ["config"], queryFn: auth.config });
  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
      if (!account) setAccount(userQuery.data.account);
    }
  }, [userQuery.data]);
  useEffect(() => {
    if (configQuery.data) {
      setConfig(configQuery.data);
      document.title = configQuery.data.title ?? "Virevan Mail";
    }
  }, [configQuery.data]);
  if (!localStorage.getItem("token"))
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (userQuery.isLoading)
    return (
      <div className="boot-skeleton">
        <Skeleton />
      </div>
    );
  if (userQuery.isError) return <Navigate to="/login" replace />;
  return <AppLayout />;
}
function AdminGuard({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const user = useApp((s) => s.user);
  return hasPerm(user, perm) ? (
    <>{children}</>
  ) : (
    <Navigate to="/inbox" replace />
  );
}
export default function App() {
  return (
    <>
      <ThemeSync />
      <Toast />
      <Suspense fallback={<Skeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<MailPage kind="inbox" />} />
            <Route path="/starred" element={<MailPage kind="starred" />} />
            <Route
              path="/sent"
              element={
                <AdminGuard perm="email:send">
                  <MailPage kind="sent" />
                </AdminGuard>
              }
            />
            <Route path="/mail/:id" element={<MailPage kind="detail" />} />
            <Route path="/mail" element={<Navigate to="/inbox" replace />} />
            <Route
              path="/drafts"
              element={
                <AdminGuard perm="email:send">
                  <DraftsPage />
                </AdminGuard>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/all-mail"
              element={
                <AdminGuard perm="all-email:query">
                  <MailPage kind="all" />
                </AdminGuard>
              }
            />
            <Route
              path="/all-users"
              element={
                <AdminGuard perm="user:query">
                  <AdminPage kind="users" />
                </AdminGuard>
              }
            />
            <Route
              path="/role"
              element={
                <AdminGuard perm="role:query">
                  <AdminPage kind="roles" />
                </AdminGuard>
              }
            />
            <Route
              path="/invite-code"
              element={
                <AdminGuard perm="reg-key:query">
                  <AdminPage kind="keys" />
                </AdminGuard>
              }
            />
            <Route
              path="/system-settings"
              element={
                <AdminGuard perm="setting:query">
                  <AdminPage kind="system" />
                </AdminGuard>
              }
            />
            <Route
              path="/analysis"
              element={
                <AdminGuard perm="analysis:query">
                  <AnalysisPage />
                </AdminGuard>
              }
            />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1>404</h1>
                  <a href="/inbox">Virevan Mail</a>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

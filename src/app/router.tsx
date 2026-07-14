import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@layouts';
import { AdminLayout } from '@layouts';
import { LoadingScreen } from '@components/ui';

// Route-level code splitting — each page loads only when first visited
const LandingPage = lazy(() => import('@features/landing').then((m) => ({ default: m.LandingPage })));
const ValuationPage = lazy(() => import('@features/valuation').then((m) => ({ default: m.ValuationPage })));
const ValuationResultPage = lazy(() => import('@features/valuation').then((m) => ({ default: m.ValuationResultPage })));
const AdminDashboardPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminDashboardPage })));
const AdminVehiclesPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminVehiclesPage })));
const AdminQueriesPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminQueriesPage })));
const AdminSettingsPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminSettingsPage })));
const AdminMissingVehiclesPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminMissingVehiclesPage })));
const AdminPriceSuggestionsPage = lazy(() => import('@features/admin').then((m) => ({ default: m.AdminPriceSuggestionsPage })));

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingScreen message="Loading..." />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={
            <SuspenseWrapper>
              <LandingPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="/valuation"
          element={
            <SuspenseWrapper>
              <ValuationPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="/result"
          element={
            <SuspenseWrapper>
              <ValuationResultPage />
            </SuspenseWrapper>
          }
        />
      </Route>

      {/* Admin routes with admin layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route
          index
          element={
            <SuspenseWrapper>
              <AdminDashboardPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="dashboard"
          element={
            <SuspenseWrapper>
              <AdminDashboardPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="vehicles"
          element={
            <SuspenseWrapper>
              <AdminVehiclesPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="queries"
          element={
            <SuspenseWrapper>
              <AdminQueriesPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="settings"
          element={
            <SuspenseWrapper>
              <AdminSettingsPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="missing-vehicles"
          element={
            <SuspenseWrapper>
              <AdminMissingVehiclesPage />
            </SuspenseWrapper>
          }
        />
        <Route
          path="price-suggestions"
          element={
            <SuspenseWrapper>
              <AdminPriceSuggestionsPage />
            </SuspenseWrapper>
          }
        />
      </Route>
    </Routes>
  );
}

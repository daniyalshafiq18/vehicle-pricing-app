import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@layouts';
import { AdminLayout } from '@layouts';
import { LandingPage } from '@features/landing';
import { ValuationPage } from '@features/valuation';
import { ValuationResultPage } from '@features/valuation';
import { AdminDashboardPage } from '@features/admin';
import { AdminVehiclesPage } from '@features/admin';
import { AdminQueriesPage } from '@features/admin';
import { AdminSettingsPage } from '@features/admin';

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/valuation" element={<ValuationPage />} />
        <Route path="/result" element={<ValuationResultPage />} />
      </Route>

      {/* Admin routes with admin layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="vehicles" element={<AdminVehiclesPage />} />
        <Route path="queries" element={<AdminQueriesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}

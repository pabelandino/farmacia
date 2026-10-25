import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api/session';
import { AppShell } from './components/AppShell';
import { GuardedRoute } from './components/GuardedRoute';
import { PageFallback } from './components/PageFallback';
import { ToastHost } from './components/ToastHost';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const PosPage = lazy(() => import('./pages/PosPage'));
const CreditPage = lazy(() => import('./pages/CreditPage'));
const ReceivablesPage = lazy(() => import('./pages/ReceivablesPage'));
const IntakesPage = lazy(() => import('./pages/IntakesPage'));
const WriteOffsPage = lazy(() => import('./pages/WriteOffsPage'));
const CashPage = lazy(() => import('./pages/CashPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SalesDayReportPage = lazy(() => import('./pages/SalesDayReportPage'));
const InventoryReportPage = lazy(() => import('./pages/InventoryReportPage'));
const SalesLinesReportPage = lazy(() => import('./pages/SalesLinesReportPage'));
const InvoicesReportPage = lazy(() => import('./pages/InvoicesReportPage'));
const VoidInvoicesPage = lazy(() => import('./pages/VoidInvoicesPage'));
const ExpiredProductsReportPage = lazy(() => import('./pages/ExpiredProductsReportPage'));
const PayablesReportPage = lazy(() => import('./pages/PayablesReportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));

function ProtectedShell() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            element={(
              <GuardedRoute permission="billing">
                <BillingPage />
              </GuardedRoute>
            )}
          >
            <Route path="/" element={<PosPage />} />
            <Route path="/credito" element={<CreditPage />} />
          </Route>
          <Route path="/dashboard" element={<GuardedRoute permission="dashboard"><DashboardPage /></GuardedRoute>} />
          <Route path="/cxc" element={<Navigate to="/reportes/cxc" replace />} />
          <Route path="/ingresos" element={<GuardedRoute permission="intakes"><IntakesPage /></GuardedRoute>} />
          <Route path="/bajas" element={<GuardedRoute permission="writeOffs"><WriteOffsPage /></GuardedRoute>} />
          <Route path="/inventario" element={<Navigate to="/reportes/inventario" replace />} />
          <Route path="/caja" element={<GuardedRoute permission="cash"><CashPage /></GuardedRoute>} />
          <Route path="/egresos" element={<GuardedRoute permission="expenses"><ExpensesPage /></GuardedRoute>} />
          <Route path="/productos" element={<GuardedRoute permission="products"><ProductsPage /></GuardedRoute>} />
          <Route path="/clientes" element={<GuardedRoute permission="clients"><ClientsPage /></GuardedRoute>} />
          <Route path="/traslados" element={<GuardedRoute permission="transfers"><TransfersPage /></GuardedRoute>} />
          <Route path="/proveedores" element={<GuardedRoute permission="suppliers"><SuppliersPage /></GuardedRoute>} />
          <Route path="/usuarios" element={<GuardedRoute permission="users"><UsersPage /></GuardedRoute>} />
          <Route path="/reportes" element={<GuardedRoute permission="reports"><ReportsPage /></GuardedRoute>} />
          <Route path="/reportes/ventas" element={<GuardedRoute permission="reports"><SalesDayReportPage /></GuardedRoute>} />
          <Route path="/reportes/detalle-ventas" element={<GuardedRoute permission="reports"><SalesLinesReportPage /></GuardedRoute>} />
          <Route path="/reportes/inventario" element={<GuardedRoute permission="reports"><InventoryReportPage /></GuardedRoute>} />
          <Route path="/reportes/vencidos" element={<GuardedRoute permission="reports"><ExpiredProductsReportPage /></GuardedRoute>} />
          <Route path="/reportes/cxc" element={<GuardedRoute permission="reports"><ReceivablesPage /></GuardedRoute>} />
          <Route path="/reportes/cxp" element={<GuardedRoute permission="reports"><PayablesReportPage /></GuardedRoute>} />
          <Route path="/anular" element={<GuardedRoute permission="voidInvoice"><VoidInvoicesPage /></GuardedRoute>} />
          <Route path="/reportes/facturas" element={<GuardedRoute permission="reports"><InvoicesReportPage /></GuardedRoute>} />
          <Route path="/configuracion" element={<GuardedRoute permission="settings"><SettingsPage /></GuardedRoute>} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedShell />} />
      </Routes>
    </>
  );
}

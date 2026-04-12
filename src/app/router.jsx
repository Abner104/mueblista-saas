import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ClientsPage from '../pages/ClientsPage';
import QuotesPage from '../pages/QuotesPage';
import CutOptimizerPage from '../pages/CutOptimizerPage';
import InventoryPage from '../pages/InventoryPage';
import SuppliersPage from '../pages/SuppliersPage';
import SalesRoomPage from '../pages/SalesRoomPage';
import OrdersPage from '../pages/OrdersPage';
import LeadsPage from '../pages/LeadsPage';
import WorkersPage from '../pages/WorkersPage';
import CatalogPage from '../pages/CatalogPage';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from '../components/features/auth/ProtectedRoute';
import RootRoute from '../components/features/auth/RootRoute';
import MaestroPage from '../pages/MaestroPage';
import VendedorPage from '../pages/VendedorPage';

export const router = createBrowserRouter([
  // ── Landing pública — muestra LandingPage o redirige al dashboard ──
  { path: '/',               element: <RootRoute /> },

  // ── Vistas de trabajadores (requieren login, rol propio) ───────
  {
    path: '/maestro',
    element: (
      <ProtectedRoute>
        <MaestroPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendedor',
    element: (
      <ProtectedRoute>
        <VendedorPage />
      </ProtectedRoute>
    ),
  },

  // ── Rutas públicas (sin login) ──────────────────
  { path: '/login',          element: <LoginPage /> },
  { path: '/catalogo/:slug', element: <CatalogPage /> },
  // Redirige /catalogo sin slug a login
  { path: '/catalogo',       element: <Navigate to="/login" replace /> },

  // ── Panel interno (requiere login) ─────────────
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true,              element: <DashboardPage /> },
      { path: 'clientes',         element: <ClientsPage /> },
      { path: 'leads',            element: <LeadsPage /> },
      { path: 'cotizaciones',     element: <QuotesPage /> },
      { path: 'cortes',           element: <CutOptimizerPage /> },
      { path: 'inventario',       element: <InventoryPage /> },
      { path: 'proveedores',      element: <SuppliersPage /> },
      { path: 'ventas',           element: <SalesRoomPage /> },
      { path: 'ordenes',          element: <OrdersPage /> },
      { path: 'trabajadores',     element: <WorkersPage /> },
    ],
  },
]);
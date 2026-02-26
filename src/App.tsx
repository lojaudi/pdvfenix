import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import React, { Suspense } from "react";

const Index = React.lazy(() => import("./pages/Index"));
const AuthPage = React.lazy(() => import("./pages/Auth"));
const AdminPage = React.lazy(() => import("./pages/Admin"));
const ReportsPage = React.lazy(() => import("./pages/Reports"));
const ActiveOrdersPage = React.lazy(() => import("./pages/ActiveOrders"));
const TablesPage = React.lazy(() => import("./pages/Tables"));
const CashierPage = React.lazy(() => import("./pages/Cashier"));
const MenuPage = React.lazy(() => import("./pages/Menu"));
const DeliveriesPage = React.lazy(() => import("./pages/Deliveries"));
const TrackingPage = React.lazy(() => import("./pages/Tracking"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background" role="status" aria-label="Carregando página">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><ActiveOrdersPage /></ProtectedRoute>} />
            <Route path="/tables" element={<ProtectedRoute><TablesPage /></ProtectedRoute>} />
            <Route path="/cashier" element={<ProtectedRoute><CashierPage /></ProtectedRoute>} />
            <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
            <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/rastreio" element={<TrackingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

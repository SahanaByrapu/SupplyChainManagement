import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "../components/ui/sonner";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import DashboardLayout from "../components/DashboardLayout";
import InventoryDashboard from "../pages/InventoryDashboard";
import SupplierPortal from "../pages/SupplierPortal";
import ForecastDashboard from "../pages/ForecastDashboard";
import OrderTracking from "../pages/OrderTracking";
import Overview from "../pages/Overview";
import "../App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="inventory" element={<InventoryDashboard />} />
            <Route path="suppliers" element={<SupplierPortal />} />
            <Route path="forecast" element={<ForecastDashboard />} />
            <Route path="orders" element={<OrderTracking />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

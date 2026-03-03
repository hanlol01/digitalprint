import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import ServicesPage from "./pages/Services";
import DisplaysPage from "./pages/Displays";
import Customers from "./pages/Customers";
import Materials from "./pages/Materials";
import CalculatorPage from "./pages/Calculator";
import Reports from "./pages/Reports";
import MasterDataPage from "./pages/MasterData";
import Employees from "./pages/Employees";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route element={<ProtectedRoute allowedRoles={["admin", "management"]} />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/displays" element={<DisplaysPage />} />
                  <Route path="/materials" element={<Materials />} />
                  <Route path="/master-data/categories" element={<MasterDataPage type="categories" />} />
                  <Route path="/master-data/units" element={<MasterDataPage type="units" />} />
                  <Route path="/master-data/finishings" element={<MasterDataPage type="finishings" />} />
                  <Route path="/master-data/materials" element={<MasterDataPage type="materials" />} />
                  <Route path="/master-data/frames" element={<MasterDataPage type="frames" />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["admin", "management"]} />}>
                  <Route path="/master-data/employees" element={<Employees />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["admin", "management", "staff"]} />}>
                  <Route path="/pos" element={<POS />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["admin", "management", "operator"]} />}>
                  <Route path="/orders" element={<Orders />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

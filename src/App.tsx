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
                <Route path="/" element={<Index />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/products" element={<Products />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/displays" element={<DisplaysPage />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/master-data/categories" element={<MasterDataPage type="categories" />} />
                <Route path="/master-data/units" element={<MasterDataPage type="units" />} />
                <Route path="/master-data/finishings" element={<MasterDataPage type="finishings" />} />
                <Route path="/master-data/materials" element={<MasterDataPage type="materials" />} />
                <Route path="/master-data/frames" element={<MasterDataPage type="frames" />} />
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/reports" element={<Reports />} />
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

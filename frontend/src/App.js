import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import "./styles.css"
import "./components/outlook/outlook-style.css"

// Layouts
import DashboardLayout from "./components/layouts/DashboardLayout"

// Pages
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import Dashboard from "./pages/Dashboard"
import UsersList from "./pages/users/UsersList"
import UsersForm from "./pages/users/UsersForm"
import LeadsList from "./pages/leads/LeadsList"
import LeadsForm from "./pages/leads/LeadsForm"
import HardwareList from "./pages/hardware/HardwareList"
import HardwareForm from "./pages/hardware/HardwareForm"
import HardwareExcel from "./pages/hardware/HardwareExcel"
import HardwareImport from "./pages/hardware/HardwareImport"
import ClientsList from "./pages/clients/ClientsList"
import ClientsForm from "./pages/clients/ClientsForm"
import SuppliersList from "./pages/suppliers/SuppliersList"
import SuppliersForm from "./pages/suppliers/SuppliersForm"
import OpportunitiesList from "./pages/opportunities/OpportunitiesList"
import OpportunitiesForm from "./pages/opportunities/OpportunitiesForm"
import ProjectsList from "./pages/projects/ProjectsList"
import ProjectsForm from "./pages/projects/ProjectsForm"
import Communication from "./pages/Communication"
import PrivateRoute from "./components/PrivateRoute"

// Bons de commande (PO)
import PurchaseOrdersList from "./pages/po/PurchaseOrdersList"
import PurchaseOrderForm from "./pages/po/PurchaseOrderForm"
import GeneratePDFPage from "./pages/po/GenerateExcelPage"

// Produits
import ProductsList from "./pages/products/ProductsList"
import ProductsForm from "./pages/products/ProductsForm"

// Devis
import DevisList from "./pages/devis/DevisList"
import DevisForm from "./pages/devis/DevisForm"
import DevisImportForm from "./pages/devis/DevisImport"

// Frais de transport
import ShippingDashboard from "./pages/shipping/ShippingDashboard"
import ShippingCalculate from "./pages/shipping/ShippingCalculate"
import ProductShippingCalculate from "./pages/shipping/ProductShippingCalculate"

// Profil utilisateur
import UserProfile from "./pages/profile/UserProfile"

// Tasks
import TasksPage from "./pages/tasks/TasksPage"

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to login page */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard and protected routes */}
        <Route
          path="/dashboard"
          element={
            
              <DashboardLayout />
           
          }
        >
          <Route index element={<Dashboard />} />

          {/* Profil utilisateur */}
          <Route path="profile" element={<UserProfile />} />
          <Route path="profile/settings" element={<UserProfile />} />

          <Route path="users" element={<UsersList />} />
          <Route path="users/new" element={<UsersForm />} />
          <Route path="users/edit/:id" element={<UsersForm />} />
          <Route path="leads" element={<LeadsList />} />
          <Route path="leads/new" element={<LeadsForm />} />
          <Route path="leads/edit/:id" element={<LeadsForm />} />
          <Route path="hardware" element={<HardwareList />} />
          <Route path="hardware/new" element={<HardwareForm />} />
          <Route path="hardware/edit/:id" element={<HardwareForm />} />
          <Route path="hardware/generate-excel/:id" element={<HardwareExcel />} />
          <Route path="hardware/import" element={<HardwareImport />} />

          {/* Ajout de la route manquante pour le calcul des frais de transport d'équipements hardware */}
          <Route path="hardware/shipping/calculate/:hardwareId" element={<ShippingCalculate />} />

          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/new" element={<ClientsForm />} />
          <Route path="clients/edit/:id" element={<ClientsForm />} />
          <Route path="suppliers" element={<SuppliersList />} />
          <Route path="suppliers/new" element={<SuppliersForm />} />
          <Route path="suppliers/edit/:id" element={<SuppliersForm />} />
          <Route path="opportunities" element={<OpportunitiesList />} />
          <Route path="opportunities/new" element={<OpportunitiesForm />} />
          <Route path="opportunities/edit/:id" element={<OpportunitiesForm />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/new" element={<ProjectsForm />} />
          <Route path="projects/edit/:id" element={<ProjectsForm />} />
          <Route path="communication" element={<Communication />} />

          {/* Routes PO */}
          <Route path="purchase-orders" element={<PurchaseOrdersList />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/edit/:id" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id/generate-excel" element={<GeneratePDFPage />} />
          <Route path="purchase-orders/:id/generate-pdf" element={<GeneratePDFPage />} />

          {/* Produits */}
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductsForm />} />
          <Route path="products/edit/:id" element={<ProductsForm />} />

          {/* Devis */}
          <Route path="devis" element={<DevisList />} />
          <Route path="devis/new" element={<DevisForm />} />
          <Route path="devis/edit/:id" element={<DevisForm />} />
          <Route path="devis/import" element={<DevisImportForm />} />

          {/* Frais de transport */}
          <Route path="shipping" element={<ShippingDashboard />} />
          <Route path="shipping/calculate/:id" element={<ShippingCalculate />} />
          <Route path="shipping/calculate" element={<ShippingCalculate />} />

          {/* Product Shipping */}
          <Route path="product-shipping/calculate/:id" element={<ProductShippingCalculate />} />
          <Route path="product-shipping/calculate" element={<ProductShippingCalculate />} />

          {/* Tasks */}
          <Route path="tasks" element={<TasksPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

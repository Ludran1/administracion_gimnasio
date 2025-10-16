
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GymLayout } from "./components/GymLayout";
import Dashboard from "./pages/Dashboard";
import Ejercicios from "./pages/Ejercicios";
import WhatsApp from "./pages/WhatsApp";
import ChatBot from "./pages/ChatBot";
import Clientes from "./pages/Clientes";
import Asistencia from "./pages/Asistencia";
import Calendario from "./pages/Calendario";
import Configuracion from "./pages/Configuracion";
import Membresias from "./pages/Membresias";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Kiosko from "./pages/Kiosko";
import NotFound from "./pages/NotFound";
import { useState, useEffect, createContext, useContext } from "react";

// Crear contexto de autenticación
interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Componente de protección de rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  // Para simplificar, asumimos autenticado durante desarrollo
  // En una implementación real, esto verificaría el estado de autenticación
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    true // Cambiado a true para desarrollo - permite acceso directo a la configuración
  );

  const login = () => {
    localStorage.setItem("fitgym-auth", "true");
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("fitgym-auth");
    setIsAuthenticated(false);
  };

  // Verificar token en el almacenamiento local al cargar
  useEffect(() => {
    const token = localStorage.getItem("fitgym-auth");
    setIsAuthenticated(token === "true");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rutas Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/kiosko" element={<Kiosko />} />
              
              {/* Rutas Protegidas */}
              <Route element={
                <ProtectedRoute>
                  <GymLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/asistencia" element={<Asistencia />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/membresias" element={<Membresias />} />
                <Route path="/ejercicios" element={<Ejercicios />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/chatbot" element={<ChatBot />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

export default App;

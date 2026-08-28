import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../content/AuthContext';
import { PrivateRoute } from './PrivateRoute';

import Home from '../pages/Home/Home';
import Relatorio from '../pages/Relatorio/Relatorio';
import Login from '../pages/Login/Login';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Acessível a qualquer usuário autenticado */}
          <Route
            path="/agendamentos"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />

          {/* Exclusiva do ADM */}
          <Route
            path="/agendamentos/relatorio"
            element={
              <PrivateRoute requireGilog>
                <Relatorio />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
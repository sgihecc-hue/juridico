import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Processos from './pages/Processos';
import ProcessoDetalhe from './pages/ProcessoDetalhe';
import Clientes from './pages/Clientes';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Agenda from './pages/Agenda';
import Financeiro from './pages/Financeiro';
import Tarefas from './pages/Tarefas';
import Documentos from './pages/Documentos';
import Usuarios from './pages/Usuarios';
import Atendimentos from './pages/Atendimentos';
import Indicadores from './pages/Indicadores';
import Publicacoes from './pages/Publicacoes';
import Pecas from './pages/Pecas';
import Relatorios from './pages/Relatorios';
import AdminPanel from './pages/AdminPanel';
import CalculoPrazos from './pages/CalculoPrazos';
import Perfil from './pages/Perfil';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/processos" element={<Processos />} />
        <Route path="/processos/:id" element={<ProcessoDetalhe />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/tarefas" element={<Tarefas />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/atendimentos" element={<Atendimentos />} />
        <Route path="/indicadores" element={<Indicadores />} />
        <Route path="/publicacoes" element={<Publicacoes />} />
        <Route path="/pecas" element={<Pecas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/prazos" element={<CalculoPrazos />} />
        <Route path="/usuarios" element={<PrivateRoute roles={['admin', 'super_admin']}><Usuarios /></PrivateRoute>} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/admin" element={<PrivateRoute roles={['super_admin']}><AdminPanel /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

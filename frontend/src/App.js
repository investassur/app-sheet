import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import Dashboard from './pages/Dashboard';
import Prospects from './pages/Prospects';
import ProspectDetail from './pages/ProspectDetail';
import Contrats from './pages/Contrats';
import ContratDetail from './pages/ContratDetail';
import Workflows from './pages/Workflows';
import ScenariosEmailing from './pages/ScenariosEmailing';
import SegmentsIA from './pages/SegmentsIA';
import Rapports from './pages/Rapports';
import Administration from './pages/Administration';
import Campagnes from './pages/Campagnes';
import Login from './pages/Login';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="prospects" element={<Prospects />} />
          <Route path="prospects/new" element={<div style={{padding:40}}><h2>Créer un nouveau prospect (à implémenter)</h2></div>} />
          <Route path="prospects/:id" element={<ProspectDetail />} />
          <Route path="contrats" element={<Contrats />} />
          <Route path="contrats/:id" element={<ContratDetail />} />
          <Route path="rapports" element={<Rapports />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="scenarios-emailing" element={<ScenariosEmailing />} />
          <Route path="segments-ia" element={<SegmentsIA />} />
          <Route path="campagnes" element={<Campagnes />} />
          <Route path="administration" element={<Administration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

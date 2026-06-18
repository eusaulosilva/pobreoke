import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Display from "./views/Display";
import Admin from "./views/Admin";
import Login from "./views/Login";
import Pedido from "./views/Pedido";
import DisplayQR from './views/DisplayQR';
import UsuariosAdmin from "./views/UsuariosAdmin";
import ProtectedRoute from "./components/ProtectedRoute"; // <- Importação do Guarda
import './index.css';

function App() {
  return (
    <Routes>
      {/* A tela inicial passa a ser o Login do DJ */}
      <Route path="/" element={<Login />} />

      {/* Rotas para os Convidados: abertas ao público */}
      <Route path="/sala" element={<Pedido />} />
      <Route path="/sala/:roomId" element={<Pedido />} />

      {/* Rotas para a TV: abertas ao público para ler a fila */}
      <Route path="/display" element={<Display />} />
      <Route path="/display/:roomId" element={<Display />} />
      <Route path="/display/qr/:roomId" element={<DisplayQR />} />

      {/* Rotas para o Admin (Apenas permitidos entram) */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />

      <Route path="/admin/:roomId" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />

      {/* Rota Suprema: Apenas Admins com a flag isAdmin: true entram */}
      <Route path="/admin/usuarios" element={
        <ProtectedRoute requerAdmin={true}>
          <UsuariosAdmin />
        </ProtectedRoute>
      } />

      {/* Redirecionamentos de segurança */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
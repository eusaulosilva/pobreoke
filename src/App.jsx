import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./views/Home";
import Display from "./views/Display";
import Admin from "./views/Admin";
import Login from "./views/Login";
import Pedido from "./views/Pedido";
import DisplayQR from './views/DisplayQR';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Rotas para os Convidados: aceita aceder com ou sem código */}
      <Route path="/sala" element={<Pedido />} />
      <Route path="/sala/:roomId" element={<Pedido />} />

      {/* Rotas para a TV: aceita aceder com ou sem código */}
      <Route path="/display" element={<Display />} />
      <Route path="/display/:roomId" element={<Display />} />
      <Route path="/display/qr/:roomId" element={<DisplayQR />} />

      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./views/Home"; // Importe a Home
import Display from "./views/Display";
import Admin from "./views/Admin";
import Login from "./views/Login";
import Pedido from "./views/Pedido";

function App() {
  return (
    <Routes>
      {/* Tela inicial com os 3 botões da sua imagem */}
      <Route path="/" element={<Home />} />

      {/* Outras rotas separadas */}
      <Route path="/pedir" element={<Pedido />} />
      <Route path="/display" element={<Display />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
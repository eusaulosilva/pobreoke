import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./views/Home";
import Display from "./views/Display";
import Admin from "./views/Admin";
import Login from "./views/Login";
import Pedido from "./views/Pedido";
import './index.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Rotas para os Convidados: aceita aceder com ou sem código */}
      <Route path="/pedir" element={<Pedido />} />
      <Route path="/pedir/:roomId" element={<Pedido />} />

      {/* Rotas para a TV: aceita aceder com ou sem código */}
      <Route path="/display" element={<Display />} />
      <Route path="/display/:roomId" element={<Display />} />

      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
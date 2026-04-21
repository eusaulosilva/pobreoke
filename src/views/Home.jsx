import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css"; // Crie este arquivo para o estilo dos cards

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <header className="home-header">
                <h1 className="status-neon-cyan">POBREOKÊ</h1>

            </header>

            <div className="menu-grid">
                {/* CARD DISPLAY */}
                <div className="menu-card" onClick={() => navigate("/display")}>
                    <div className="card-icon">🖥️</div>
                    <div className="card-content">
                        <h3>Display</h3>
                        <p>Tela para TV ou projetor com letras e player</p>
                    </div>
                    <span className="arrow">→</span>
                </div>

                {/* CARD OPERADOR */}
                <div className="menu-card" onClick={() => navigate("/admin")}>
                    <div className="card-icon">🎛️</div>
                    <div className="card-content">
                        <h3>Operador / DJ</h3>
                        <p>Controlar fila, play e ajustar letras</p>
                    </div>
                    <span className="arrow">→</span>
                </div>

                {/* CARD CONVIDADO */}
                <div className="menu-card" onClick={() => navigate("/pedir")}>
                    <div className="card-icon">📱</div>
                    <div className="card-content">
                        <h3>Convidado</h3>
                        <p>Buscar músicas e entrar na fila pelo celular</p>
                    </div>
                    <span className="arrow">→</span>
                </div>
            </div>
        </div>
    );
}
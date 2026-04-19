import React from "react";

export default function ListaFila({ fila, chamarParaPalco, removerDaFila }) {
    return (
        <div className="lista-container">
            <h2 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "15px", textAlign: "left" }}>
                Próximos na Fila
            </h2>
            {fila
                .filter(item => item.status === "aguardando" || item.status === "iniciado")
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((item, index) => (
                    <div key={item.id} className="queue-item" style={{ borderColor: item.status === "iniciado" ? "var(--neon-pink)" : "var(--neon-cyan)" }}>
                        <div className="queue-info">
                            <h4>{index + 1}. {item.nome} {item.status === "iniciado" && "🎤"}</h4>
                            <p>{item.musica}</p>
                        </div>
                
                    </div>
                ))}
        </div>
    );
}
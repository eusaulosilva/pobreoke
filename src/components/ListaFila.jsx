import React from "react";

export default function ListaFila({ fila }) {
    return (
        <div className="lista-container">
            <h2 className="lista-titulo">
                Próximos na Fila
            </h2>

            {fila.map((item, index) => (
                <div
                    key={item.id}
                    className={`queue-item ${item.status === "iniciado" ? "cantando-agora" : "na-espera"}`}
                >
                    <div className="queue-info">
                        <h4>{index + 1}. {item.nome} {item.status === "iniciado" && "🎤"}</h4>
                        <p>{item.musica}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import "./Display.css";

export default function Display() {
    const [videoId, setVideoId] = useState(null);
    const [noPalco, setNoPalco] = useState({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });

    useEffect(() => {
        onValue(ref(db, "configuracao"), (snapshot) => {
            const data = snapshot.val();
            setVideoId(data?.videoAtual || null);
        });

        onValue(ref(db, "fila"), (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            const cantando = lista.find(item => item.status === "iniciado");
            if (cantando) setNoPalco(cantando);
        });
    }, []);

    if (videoId) {
        return (
            <div className="video-full-screen-container">
                <iframe
                    // Substitua o src do iframe por este formato:
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${window.location.origin}`}
                    title="Karaoke Player" frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
                <div className="video-overlay-footer">
                    <span className="badge-ao-vivo">AO VIVO</span>
                    <span className="info-text">{noPalco.nome} • {noPalco.musica}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="display-container container-fluid d-flex flex-column align-items-center justify-content-center">
            <h1 className="display-brand neon-text-cyan mb-5">POBREOKÊ</h1>
            <div className="display-now text-center shadow-lg">
                <span className="display-label">AGORA NO PALCO 🎤</span>
                <h1 className="display-singer">{noPalco.nome}</h1>
                <p className="display-song">{noPalco.musica}</p>
            </div>
        </div>
    );
}
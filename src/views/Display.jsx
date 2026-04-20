import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useParams } from "react-router-dom";
import "./Display.css";

export default function Display() {
    const { roomId } = useParams();
    const [videoId, setVideoId] = useState(null);
    const [noPalco, setNoPalco] = useState({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
    
    const [roomExists, setRoomExists] = useState(true); // NOVO ESTADO

    useEffect(() => {
        if (!roomId) return;

        const roomRef = ref(db, `salas/${roomId.toUpperCase()}`);
        const unsub = onValue(roomRef, (snapshot) => {
            setRoomExists(snapshot.exists());
        });

        return () => unsub();
    }, [roomId]);

    if (!roomExists && roomId) {
        return (
            <div className="display-container bg-black text-center">
                <h1 className="text-danger fw-bold">SALA INVÁLIDA</h1>
                <p className="text-white">A conexão com o DJ foi perdida ou o código expirou.</p>
            </div>
        );
    }

    useEffect(() => {
        if (!roomId) return;

        // 1. Ouve o vídeo atual da sala específica do DJ
        const configRef = ref(db, `salas/${roomId}/configuracao`);
        const unsubConfig = onValue(configRef, (snapshot) => {
            const data = snapshot.val();
            setVideoId(data?.videoAtual || null);
        });

        // 2. Ouve a fila da sala para o rodapé do vídeo
        const filaRef = ref(db, `salas/${roomId}/fila`);
        const unsubFila = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            const cantando = lista.find(item => item.status === "iniciado");

            if (cantando) {
                setNoPalco(cantando);
            } else {
                setNoPalco({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
            }
        });

        return () => {
            unsubConfig();
            unsubFila();
        };
    }, [roomId]);

    // Caso o link não tenha o código da sala
    if (!roomId) {
        return (
            <div className="display-container d-flex flex-column align-items-center justify-content-center bg-black">
                <h1 className="text-danger fw-bold">TV DESCONECTADA</h1>
                <p className="text-white">O DJ precisa de clicar em "ABRIR TV" no painel.</p>
            </div>
        );
    }

    // Se houver um vídeo a passar na TV
    if (videoId) {
        return (
            <div className="video-full-screen-container">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0&vq=hd1080&origin=${window.location.origin}`}
                    title="Pobreoke Player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>

                <div className="video-overlay-footer">
                    <div className="d-flex align-items-center gap-3">
                        <span className="badge-ao-vivo">NO PALCO 🎤</span>
                        <span className="info-text">{noPalco.nome} - {noPalco.musica}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Ecrã de espera (Sem vídeo) - Usando apenas as tuas classes do CSS
    return (
        <div className="display-container container-fluid d-flex flex-column align-items-center justify-content-center">
            <h1 className="display-brand mb-5">
                POBREOKÊ
            </h1>

            <div className="display-now text-center p-5 shadow-lg">
                <span className="text-uppercase fw-bold letter-spacing-3 text-pink">A SEGUIR</span>
                <h1 className="display-singer">{noPalco.nome}</h1>
                <p className="display-song">{noPalco.musica}</p>
            </div>
        </div>
    );
}
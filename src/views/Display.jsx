import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import "./Display.css";

export default function Display() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [videoId, setVideoId] = useState(null);
    const [noPalco, setNoPalco] = useState({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
    const [roomExists, setRoomExists] = useState(null); // Iniciamos como null para saber que ainda está validando
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!roomId) {
            setRoomExists(false);
            setCarregando(false);
            return;
        }

        const roomRef = ref(db, `salas/${roomId.toUpperCase()}`);

        // Verifica a existência da sala uma única vez no início e depois monitora
        const unsub = onValue(roomRef, (snapshot) => {
            const exists = snapshot.exists();
            setRoomExists(exists);
            setCarregando(false); // Para de carregar assim que recebe a primeira resposta do Firebase
        });

        return () => unsub();
    }, [roomId]);

    useEffect(() => {
        if (!roomId || !roomExists) return;

        const configRef = ref(db, `salas/${roomId}/configuracao`);
        const unsubConfig = onValue(configRef, (snapshot) => {
            const data = snapshot.val();
            setVideoId(data?.videoAtual || null);
        });

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
    }, [roomId, roomExists]);

    // 1. TELA DE CARREGAMENTO (Evita mostrar o fundo antigo ao dar F5)
    if (carregando) {
        return <div className="display-status-wrapper loading-bg"></div>;
    }

    // 2. TELA DE ERRO / SALA APAGADA (Com botão de volta)
    if (!roomExists) {
        return (
            <div className="display-status-wrapper error-bg">
                <h1 className="status-neon-cyan ">POBREOKÊ</h1>
                <div className="status-card-glass">
                    <h4 className="text-neon-pink mb-3">📺 Sinal Perdido</h4>
                    <p className="mb-4">
                        A cantoria acabou ou a sala foi fechada pelo DJ.<br />
                        Aguardando nova conexão...
                    </p>
                    <button className="btn-status-action" onClick={() => navigate("/")}>
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            </div >
        );
    }

    // 3. VÍDEO TOCANDO
    if (videoId) {
        return (
            <div className="video-full-screen-container">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0&vq=hd1080&origin=${window.location.origin}`}
                    title="Pobreoke Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>

                <div className="overlay-footer">
                    <span className="badge-ao-vivo fw-bold ">NO PALCO 🎤</span>
                    <span className="info-text fw-bold">
                        {noPalco.nome} — <span style={{ color: 'var(--neon-pink)' }}>{noPalco.musica}</span>
                    </span>
                </div>
            </div>
        );
    }

    // 4. STANDBY
    return (
        <div className="display-container container-fluid">
            <h1 className="display-brand">POBREOKÊ</h1>
            <div className="display-now shadow-lg">
                <span className="display-label">A SEGUIR</span>
                <h1 className="display-singer text-truncate px-2">{noPalco.nome}</h1>
                <p className="display-song text-truncate px-3">{noPalco.musica}</p>
            </div>
            <div className="opacity-50 text-center">
                <p className="letter-spacing-2 fw-bold">AGUARDANDO COMANDO DO DJ</p>
            </div>
            <div className="container-sala mt-4">
                <p className="m-0">SALA: {roomId.toUpperCase()}</p>
            </div>
        </div>
    );
}
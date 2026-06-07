import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import { useQueue } from "../hooks/useQueue";
import "./Display.css";

export default function Display() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const salaIdFormatado = roomId ? roomId.toUpperCase() : null;

    const { fila } = useQueue(salaIdFormatado);

    const [videoId, setVideoId] = useState(null);
    const [noPalco, setNoPalco] = useState({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
    const [roomExists, setRoomExists] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (!salaIdFormatado) {
            setRoomExists(false);
            setCarregando(false);
            return;
        }

        const roomRef = ref(db, `salas/${salaIdFormatado}`);
        const unsub = onValue(roomRef, (snapshot) => {
            setRoomExists(snapshot.exists());
            setCarregando(false);
        });

        return () => unsub();
    }, [salaIdFormatado]);

    useEffect(() => {
        if (!salaIdFormatado || !roomExists) return;

        const configRef = ref(db, `salas/${salaIdFormatado}/configuracao`);
        const unsubConfig = onValue(configRef, (snapshot) => {
            const data = snapshot.val();
            setVideoId(data?.videoAtual || null);
        });

        return () => unsubConfig();
    }, [salaIdFormatado, roomExists]);

    useEffect(() => {
        if (fila && fila.length > 0) {
            const cantando = fila.find(item => item.status === "iniciado");
            if (cantando) {
                setNoPalco(cantando);
            } else {
                setNoPalco({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
            }
        } else {
            setNoPalco({ nome: "AGUARDANDO...", musica: "ESCOLHA UMA MÚSICA" });
        }
    }, [fila]);

    if (carregando) {
        return <div className="display-status-wrapper loading-bg"></div>;
    }

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

    if (videoId) {
        return (
            <div className="video-full-screen-container">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0&vq=hd1080&origin=${window.location.origin}`}
                    title="Pobreoke Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        );
    }

    return (
        <div className="display-container container-fluid">
            <h1 className="status-neon-cyan">POBREOKÊ</h1>
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
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Formulario from "../components/Formulario";
import ListaFila from "../components/ListaFila";
import StatusFila from "../components/StatusFila";
import "./Pedido.css";

export default function Pedido() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [fila, setFila] = useState([]);
    const [nome, setNome] = useState("");
    const [musica, setMusica] = useState("");
    const [uid, setUid] = useState("");

    // Estados para controle de sala e interface
    const [noPalco, setNoPalco] = useState(null);
    const [inputCodigo, setInputCodigo] = useState("");
    const [roomExists, setRoomExists] = useState(true);

    useEffect(() => {
        if (!roomId) return;

        const salaIdFormatado = roomId.toUpperCase();
        const roomRef = ref(db, `salas/${salaIdFormatado}`);

        // Validação se a sala existe em tempo real
        const unsubRoom = onValue(roomRef, (snapshot) => {
            setRoomExists(snapshot.exists());
        });

        // Gestão de UID do utilizador
        let savedUid = localStorage.getItem("pobreoke_uid");
        if (!savedUid) {
            savedUid = "V-" + Math.random().toString(36).substr(2, 5).toUpperCase();
            localStorage.setItem("pobreoke_uid", savedUid);
        }
        setUid(savedUid);

        // Monitorização da fila
        const filaRef = ref(db, `salas/${salaIdFormatado}/fila`);
        const unsubscribe = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];

            setFila(lista);

            // Identificar quem está no palco
            const cantando = lista.find(item => item.status === "iniciado");
            if (cantando) {
                setNoPalco({ nome: cantando.nome, musica: cantando.musica });
            } else {
                setNoPalco({ nome: "Livre", musica: "Aguardando próximo cantor..." });
            }
        }, (error) => {
            console.error("Erro ao ler Firebase:", error);
            setNoPalco({ nome: "Erro", musica: "Sala não encontrada" });
        });

        return () => {
            unsubRoom();
            unsubscribe();
        };

    }, [roomId]);

    // Tela exibida caso a sala seja excluída ou o código seja inválido
    if (!roomExists && roomId) {
        return (
            <div className="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-black text-center p-4">
                <h1 style={{ color: 'var(--neon-pink)', fontWeight: '900' }}>SALA ENCERRADA</h1>
                <p className="text-white mt-3">Esta sala não existe ou foi finalizada pelo DJ.</p>
                <button className="btn-photo-purple-search mt-4 px-5" onClick={() => navigate("/pedir")}>
                    SAIR DA SALA
                </button>
            </div>
        );
    }

    const handleAcederSala = (e) => {
        e.preventDefault();
        if (inputCodigo.trim()) {
            navigate(`/pedir/${inputCodigo.trim().toUpperCase()}`);
        }
    };

    // Tela inicial para inserir o código da sala
    if (!roomId) {
        return (
            <div className="container-fluid container min-vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#020617' }}>
                <div className="admin-glass-panel p-5 welcome-card text-center shadow-lg" style={{ maxWidth: '400px', border: '1px solid #1e293b' }}>
                    <h2 style={{ color: 'var(--neon-pink)', fontWeight: '900' }} className="mb-4">POBREOKÊ</h2>
                    <p className="text-white small mb-4">Insere o código da sala:</p>
                    <form onSubmit={handleAcederSala}>
                        <input
                            type="text"
                            className="photo-style-input text-center mb-3 fs-4 fw-bold"
                            placeholder="CÓDIGO"
                            value={inputCodigo}
                            onChange={(e) => setInputCodigo(e.target.value)}
                            style={{ letterSpacing: '5px', textTransform: 'uppercase' }}
                            maxLength={6}
                        />
                        <button className="btn-photo-purple-search w-100 py-3 fw-bold">ENTRAR 🎤</button>
                    </form>
                </div>
            </div>
        );
    }

    const bloqueado = fila.some(item => item.uid === uid && (item.status === "aguardando" || item.status === "iniciado"));
    const posicaoNaFila = fila.filter(item => item.status === "aguardando").findIndex(item => item.uid === uid) + 1;

    const adicionarAFila = (e) => {
        e.preventDefault();
        if (bloqueado) return alert("Já estás na fila!");
        push(ref(db, `salas/${roomId.toUpperCase()}/fila`), {
            uid, nome, musica, status: "aguardando", timestamp: Date.now()
        });
        setMusica("");
    };

    return (
        <div className="container-fluid container py-4 d-flex justify-content-center">
            <div className="app-main-container">
                {noPalco ? (
                    <Header noPalco={noPalco} />
                ) : (
                    <div className="text-center text-white py-3">A carregar palco...</div>
                )}
                <Formulario
                    nome={nome}
                    setNome={setNome}
                    musica={musica}
                    setMusica={setMusica}
                    adicionarAFila={adicionarAFila}
                    bloqueado={bloqueado}
                />

                {posicaoNaFila > 0 && <StatusFila posicao={posicaoNaFila} />}



                <div className="mt-4">
                    <ListaFila fila={fila} />
                </div>
            </div>
        </div>
    );
}
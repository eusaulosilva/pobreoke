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
    const [noPalco, setNoPalco] = useState({ nome: "Aguardando...", musica: "..." });

    // Estado para o código que o utilizador vai digitar
    const [inputCodigo, setInputCodigo] = useState("");

    useEffect(() => {
        if (!roomId) return;

        let savedUid = localStorage.getItem("pobreoke_uid");
        if (!savedUid) {
            savedUid = "V-" + Math.random().toString(36).substr(2, 5).toUpperCase();
            localStorage.setItem("pobreoke_uid", savedUid);
        }
        setUid(savedUid);

        const filaRef = ref(db, `salas/${roomId.toUpperCase()}/fila`);
        return onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setFila(lista);
        });
    }, [roomId]);

    useEffect(() => {
        const cantando = fila.find(item => item.status === "iniciado");
        setNoPalco(cantando ?
            { nome: cantando.nome, musica: cantando.musica } :
            { nome: "Aguardando...", musica: "A festa vai começar!" }
        );
    }, [fila]);

    const handleAcederSala = (e) => {
        e.preventDefault();
        if (inputCodigo.trim()) {
            navigate(`/pedir/${inputCodigo.trim().toUpperCase()}`);
        }
    };

    // --- ECRÃ DE ENTRADA MANUAL (Quando não há roomId na URL) ---
    if (!roomId) {
        return (
            <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#020617' }}>
                <div className="admin-glass-panel p-5 text-center shadow-lg" style={{ maxWidth: '400px', border: '1px solid #1e293b' }}>
                    <h2 style={{ color: 'var(--neon-pink)', fontWeight: '900' }} className="mb-4">POBREOKÊ</h2>
                    <p className=" small mb-4">Insere o código da sala para pedires a tua música:</p>

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
                        <button className="btn-photo-purple-search w-100 py-3 fw-bold">
                            ENTRAR NA SALA 🎤
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO NORMAL DA FILA ---
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
        <div className="container-fluid py-4 d-flex justify-content-center">
            <div className="app-main-container">
                <Header noPalco={noPalco} />
                <Formulario nome={nome} setNome={setNome} musica={musica} setMusica={setMusica} adicionarAFila={adicionarAFila} bloqueado={bloqueado} />
                {posicaoNaFila > 0 && <StatusFila posicao={posicaoNaFila} />}
                <div className="mt-4">
                    <ListaFila fila={fila} />
                </div>
            </div>
        </div>
    );
}
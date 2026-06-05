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

    const [noPalco, setNoPalco] = useState(null);
    const [inputCodigo, setInputCodigo] = useState("");
    const [roomExists, setRoomExists] = useState(true);

    const [modalConfig, setModalConfig] = useState({ visivel: false, titulo: "", texto: "" });

    const exibirModal = (titulo, texto) => {
        setModalConfig({ visivel: true, titulo, texto });
    };

    const fecharModal = () => {
        setModalConfig({ visivel: false, titulo: "", texto: "" });
    };

    useEffect(() => {
        if (!roomId) return;

        const salaIdFormatado = roomId.toUpperCase();
        const roomRef = ref(db, `salas/${salaIdFormatado}`);

        const unsubRoom = onValue(roomRef, (snapshot) => {
            setRoomExists(snapshot.exists());
        });

        let savedUid = localStorage.getItem("pobreoke_uid");
        if (!savedUid) {
            savedUid = "V-" + Math.random().toString(36).substr(2, 5).toUpperCase();
            localStorage.setItem("pobreoke_uid", savedUid);
        }
        setUid(savedUid);

        const avisoVisto = sessionStorage.getItem("aviso_evidencias_visto");
        if (!avisoVisto) {
            exibirModal("🎶 Dica Especial", "Não peça Evidências, pois ela será a música de encerramento do nosso karaokê!");
            sessionStorage.setItem("aviso_evidencias_visto", "true");
        }

        const filaRef = ref(db, `salas/${salaIdFormatado}/fila`);
        const unsubscribe = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            let lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];

            // Ordena a lista geral imediatamente para refletir os arrastos do DJ e quem está no palco
            lista = lista.sort((a, b) => {
                if (a.status === "iniciado") return -1;
                if (b.status === "iniciado") return 1;
                return a.timestamp - b.timestamp;
            });

            setFila(lista);

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

    if (!roomExists && roomId) {
        return (
            <div className="status-screen-container px-3">
                <h1 className="status-neon-red ">SALA ENCERRADA</h1>
                <div className="status-card">
                    <p>Esta sala não existe ou foi finalizada pelo DJ. Que tal começar uma nova?</p>
                    <button
                        className="btn-status-action"
                        onClick={() => navigate("/sala")}
                    >
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            </div>
        );
    }

    const handleAcederSala = (e) => {
        e.preventDefault();
        if (inputCodigo.trim()) {
            navigate(`/sala/${inputCodigo.trim().toUpperCase()}`);
        }
    };

    if (!roomId) {
        return (
            <div className="status-screen-container px-3">
                <h1 className="status-neon-cyan">POBREOKÊ</h1>
                <div className="status-card">
                    <p>Digite o código da sala para entrar na cantoria:</p>
                    <form onSubmit={handleAcederSala}>
                        <input
                            type="text"
                            className="room-code-input"
                            placeholder="000000"
                            value={inputCodigo}
                            onChange={(e) => setInputCodigo(e.target.value.toUpperCase())}
                            maxLength={6}
                            autoFocus
                        />
                        <button className="btn-status-action">ENTRAR NA SALA 🎤</button>
                    </form>

                    <div className="back-container">
                        <button className="btn-back-home" onClick={() => navigate("/")}>
                            <span className="arrow">←</span> VOLTAR AO INÍCIO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const bloqueado = fila.some(item => item.uid === uid && (item.status === "aguardando" || item.status === "iniciado"));

    // Calcula a posição do usuário na fila
    const posicaoNaFila = fila.filter(item => item.status === "aguardando" || item.status === "iniciado").findIndex(item => item.uid === uid) + 1;

    const adicionarAFila = (e) => {
        e.preventDefault();

        if (bloqueado) {
            alert("Já estás na fila de espera! Canta a tua música antes de pedir outra.");
            return;
        }

        const termoBusca = musica.toLowerCase();
        const musicaLimpa = termoBusca.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (musicaLimpa.includes("evidencia") || termoBusca.includes("chitao")) {
            exibirModal("Música Bloqueada 🚫", "Não podes pedir Evidências, pois ela será a música de encerramento do karaokê!");
            setMusica("");
            return;
        }

        push(ref(db, `salas/${roomId.toUpperCase()}/fila`), {
            uid,
            nome,
            musica,
            status: "aguardando",
            timestamp: Date.now()
        });

        setMusica("");
    };

    return (
        <div className="pedido-bg-black position-relative min-vh-100">

            {modalConfig.visivel && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center modal-overlay-custom"
                    onClick={fecharModal}
                    style={{ zIndex: 9999 }}
                >
                    <div
                        className="p-4 text-center d-flex flex-column align-items-center modal-content-custom"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="fw-bold mb-3 modal-title-custom">{modalConfig.titulo}</h4>
                        <p className="text-white mb-4 modal-text-custom">{modalConfig.texto}</p>
                        <button
                            className="w-100 py-3 fw-bold border-0 modal-btn-custom"
                            onClick={fecharModal}
                        >
                            OK, ENTENDI
                        </button>
                    </div>
                </div>
            )}

            {/* ADICIONADO: pt-5 e mt-4 para criar espaço no topo; px-3 para desgrudar das laterais */}
            <div className="container-fluid container pt-5 pb-4 mt-4 px-3 d-flex justify-content-center">
                <div className="app-main-container w-100">
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
        </div>
    );
}
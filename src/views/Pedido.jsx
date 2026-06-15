import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Formulario from "../components/Formulario";
import ListaFila from "../components/ListaFila";
import StatusFila from "../components/StatusFila";
import { useQueue } from "../hooks/useQueue";
import { useSalaId, secureStorage, validators } from "../utils";
import { FIREBASE_PATHS, QUEUE_STATUS } from "../constants";
import "./Pedido.css";

export default function Pedido() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const salaIdFormatado = useSalaId(roomId);
    const { fila, adicionarAFila: adicionarItemNaFila } = useQueue(salaIdFormatado);

    const [nome, setNome] = useState("");
    const [musica, setMusica] = useState("");
    const [uid, setUid] = useState("");

    const [noPalco, setNoPalco] = useState(null);
    const [inputCodigo, setInputCodigo] = useState("");
    const [roomExists, setRoomExists] = useState(true);
    const [filaFechada, setFilaFechada] = useState(false);

    const [latSala, setLatSala] = useState(null);
    const [lngSala, setLngSala] = useState(null);

    const [modalConfig, setModalConfig] = useState({ visivel: false, titulo: "", texto: "" });

    const exibirModal = (titulo, texto) => {
        setModalConfig({ visivel: true, titulo, texto });
    };

    const fecharModal = () => {
        setModalConfig({ visivel: false, titulo: "", texto: "" });
    };

    useEffect(() => {
        if (!salaIdFormatado) return;

        const roomRef = ref(db, FIREBASE_PATHS.sala(salaIdFormatado));
        const unsubRoom = onValue(roomRef, (snapshot) => {
            const exists = snapshot.exists();
            setRoomExists(exists);
            if (exists) {
                const data = snapshot.val();
                setFilaFechada(data?.configuracao?.filaFechada || false);
                setLatSala(data?.configuracao?.latSala || null);
                setLngSala(data?.configuracao?.lngSala || null);
            }
        });

        let savedUid = secureStorage.get("uid");
        if (!savedUid) {
            savedUid = "V-" + crypto.randomUUID().split('-')[0].substring(0, 5).toUpperCase();
            secureStorage.set("uid", savedUid);
        }
        setUid(savedUid);

        return () => unsubRoom();

    }, [salaIdFormatado]);

    useEffect(() => {
        if (fila && fila.length > 0) {
            const cantando = fila.find(item => item.status === QUEUE_STATUS.INICIADO);
            if (cantando) {
                setNoPalco({ nome: cantando.nome, musica: cantando.musica });
            } else {
                setNoPalco({ nome: "Livre", musica: "Aguardando próximo cantor..." });
            }
        } else {
            setNoPalco({ nome: "Livre", musica: "Aguardando próximo cantor..." });
        }
    }, [fila]);

    if (!roomExists && salaIdFormatado) {
        return (
            <div className="status-screen-container px-3">
                <h1 className="status-neon-red ">SALA ENCERRADA</h1>
                <div className="status-card">
                    <p>Esta sala não existe ou foi finalizada pelo DJ. Que tal começar uma nova?</p>
                    <button className="btn-status-action" onClick={() => navigate("/sala")}>
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            </div>
        );
    }

    const handleAcederSala = (e) => {
        e.preventDefault();
        if (validators.validarCodigo(inputCodigo)) {
            navigate(`/sala/${inputCodigo.trim().toUpperCase()}`);
        } else {
            exibirModal("Erro de Código", "O código da sala deve ter entre 3 e 6 caracteres.");
        }
    };

    if (!salaIdFormatado) {
        return (
            <div className="status-screen-container px-3">
                <h1 className="status-neon-cyan">POBREOKÊ</h1>
                <div className="status-card">
                    <p>Digita o código da sala para entrar na cantoria:</p>
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

    const bloqueado = fila.some(item => item.uid === uid && (item.status === QUEUE_STATUS.AGUARDANDO || item.status === QUEUE_STATUS.INICIADO));
    const posicaoNaFila = fila.filter(item => item.status === QUEUE_STATUS.AGUARDANDO || item.status === QUEUE_STATUS.INICIADO).findIndex(item => item.uid === uid) + 1;

    const adicionarAFila = async (e) => {
        e.preventDefault();

        if (!validators.validarNome(nome) || !validators.validarMusica(musica)) {
            exibirModal("Aviso", "Por favor, preenche o teu nome e a música antes de pedir.");
            return;
        }

        if (filaFechada) {
            exibirModal("Fila Fechada", "A fila de pedidos está fechada no momento pelo DJ!");
            return;
        }

        if (bloqueado) {
            exibirModal("Ação bloqueada", "Já estás na fila de espera! Canta a tua música antes de pedir outra.");
            return;
        }

        const { success } = await adicionarItemNaFila({
            uid,
            nome: nome.trim(),
            musica: musica.trim(),
            status: QUEUE_STATUS.AGUARDANDO
        });

        if (success) {
            setMusica("");
        } else {
            exibirModal("Erro", "Falha ao enviar pedido. Tenta novamente.");
        }
    };

    return (
        <div className="pedido-bg-black position-relative min-vh-100">

            {modalConfig.visivel && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center modal-overlay-custom" onClick={fecharModal}>
                    <div className="p-4 text-center d-flex flex-column align-items-center modal-content-custom" onClick={(e) => e.stopPropagation()}>
                        <h4 className="fw-bold mb-3 modal-title-custom">{modalConfig.titulo}</h4>
                        <p className="text-white mb-4 modal-text-custom">{modalConfig.texto}</p>
                        <button className="w-100 py-3 fw-bold border-0 modal-btn-custom" onClick={fecharModal}>
                            OK, ENTENDI
                        </button>
                    </div>
                </div>
            )}

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
                        filaFechada={filaFechada}
                        latSala={latSala}
                        lngSala={lngSala}
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
import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, remove, set, get } from "firebase/database";
import axios from "axios";
import "./Admin.css";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
// Adicionado o ícone Shuffle aqui nas importações
import { Play, SkipForward, Power, LogOut, QrCode, Search, Square, Monitor, Link, List, Shuffle } from 'lucide-react';
import ItemFila from "../components/ItemFIla";

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_KEY;

export default function Admin() {
    const [fila, setFila] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [artista, setArtista] = useState("");
    const [musica, setMusica] = useState("");
    const [videos, setVideos] = useState([]);
    const [user, setUser] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState("fila");
    const [modalAberto, setModalAberto] = useState(false);

    // Gestão de Múltiplas Salas
    const [roomCode, setRoomCode] = useState(null);
    const [userRooms, setUserRooms] = useState([]);
    const [customCode, setCustomCode] = useState("");

    const [qrValue, setQrValue] = useState("");

    const qrRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/login", { replace: true });
            } else {
                setUser(currentUser);
                const adminRef = ref(db, `admins/${currentUser.uid}`);
                onValue(adminRef, (snapshot) => {
                    const data = snapshot.val();
                    if (snapshot.exists()) {
                        if (data.salas) {
                            setUserRooms(Object.keys(data.salas));
                        } else if (data.activeRoom) {
                            // Migração de dados antigos
                            const oldRoom = data.activeRoom;
                            update(ref(db, `admins/${currentUser.uid}`), {
                                salas: { [oldRoom]: true },
                                activeRoom: null
                            });
                            setUserRooms([oldRoom]);
                        } else {
                            setUserRooms([]);
                        }
                    } else {
                        setUserRooms([]);
                    }
                    setCarregando(false);
                });
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (!roomCode) return;
        if (roomCode) {
            setQrValue(`${window.location.origin}/sala/${roomCode}`);
        }
        const salaRef = ref(db, `salas/${roomCode}/fila`);
        return onValue(salaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setFila(lista.filter(i => i.status === "aguardando" || i.status === "iniciado").sort((a, b) => a.timestamp - b.timestamp));
            setHistorico(lista.filter(i => i.status === "finalizado" || i.status === "cancelado").sort((a, b) => b.timestamp - a.timestamp));
        });
    }, [roomCode]);

    const criarSala = async (codigoFornecido) => {
        if (userRooms.length >= 3) {
            alert("Atenção: Atingiste o limite máximo de 3 salas ativas!");
            return;
        }

        let codigoFinal = codigoFornecido.trim().toUpperCase();

        // Se vazio, gera até 6 caracteres aleatórios
        if (!codigoFinal) {
            codigoFinal = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        if (codigoFinal.length > 6) {
            alert("O código da sala deve ter no máximo 6 caracteres.");
            return;
        }

        // Verifica se a sala já existe
        const salaCheck = await get(ref(db, `salas/${codigoFinal}`));
        if (salaCheck.exists()) {
            alert("Este código de sala já está em uso! Tente outro nome.");
            return;
        }

        update(ref(db, `admins/${user.uid}/salas`), { [codigoFinal]: true });
        set(ref(db, `salas/${codigoFinal}/configuracao`), { adminId: user.uid, criadoEm: Date.now() });
        setRoomCode(codigoFinal);
        setCustomCode("");
    };

    const deslogar = () => signOut(auth).then(() => navigate("/login"));

    const atualizarStatus = (id, novoStatus) => {
        if (!roomCode) return;
        update(ref(db, `salas/${roomCode}/fila/${id}`), { status: novoStatus });
    };

    const darPlayNoDisplay = (videoId) => {
        if (!roomCode) return;
        update(ref(db, `salas/${roomCode}/configuracao`), {
            videoAtual: videoId,
            timestamp: Date.now()
        }).catch(err => console.error("Erro na TV:", err));
    };

    const realizarBusca = async (termoDeBusca) => {
        if (!termoDeBusca.trim()) return;
        try {
            const res = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: "snippet",
                    q: `${termoDeBusca} karaoke`,
                    type: "video",
                    videoEmbeddable: "true",
                    maxResults: 10,
                    key: YOUTUBE_API_KEY,
                },
            });
            setVideos(res.data.items);
        } catch (err) { console.error("Erro ao procurar:", err); }
    };

    const pesquisarYoutube = (e) => {
        if (e) e.preventDefault();
        realizarBusca(`${artista} ${musica}`);
    };

    const chamarProximo = (itemClicado) => {
        const cantandoAgora = fila.find(item => item.status === "iniciado");
        if (cantandoAgora) atualizarStatus(cantandoAgora.id, "finalizado");
        atualizarStatus(itemClicado.id, "iniciado");
        setArtista("");
        setMusica(itemClicado.musica);
        realizarBusca(`${itemClicado.nome} ${itemClicado.musica}`);
    };

    const encerrarNoite = () => {
        if (!roomCode) return;
        if (window.confirm(`ENCERRAR NOITE? A sala ${roomCode} será apagada.`)) {
            remove(ref(db, `salas/${roomCode}`));
            remove(ref(db, `admins/${user.uid}/salas/${roomCode}`));
            setRoomCode(null);
            setVideos([]);
        }
    };

    const downloadQRCode = () => {
        const canvas = qrRef.current.querySelector("canvas");
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `pobreoke-sala-${roomCode}.png`;
        link.click();
    };

    const copiarLink = () => {
        navigator.clipboard.writeText(qrValue);
        alert("Link copiado com sucesso!");
    };

    const removerEChamarProximo = (idRemovido) => {
        atualizarStatus(idRemovido, "finalizado");
        if (roomCode) {
            update(ref(db, `salas/${roomCode}/configuracao`), { videoAtual: null });
        }
        const proximo = fila.find(item => item.id !== idRemovido && item.status === "aguardando");
        if (proximo) {
            chamarProximo(proximo);
        } else {
            setArtista("");
            setMusica("");
            setVideos([]);
        }
    };

    if (carregando) return <div className="text-white text-center mt-5">A preparar os teus discos...</div>;

    // =========================================================
    // TELA DE GERENCIAMENTO DE SALAS
    // =========================================================
    if (!roomCode) {
        return (
            <div className="admin-welcome-screen position-relative">

                {/* BOTÃO DE SAIR NO CANTO SUPERIOR DIREITO */}
                <button className="btn-logout-top-right" onClick={deslogar} title="Sair da Conta">
                    <LogOut size={18} /> SAIR
                </button>

                <div className="salas-container w-100">
                    <div className="text-center mb-5">
                        <h2 className="welcome-title mb-2">
                            GERENCIAR <span className="text-neon-pink">SALAS</span>
                        </h2>
                        <p className="welcome-subtitle">Podes ter até 3 salas ativas a funcionar em simultâneo.</p>
                    </div>

                    <div className="salas-grid mb-4">
                        {/* Renderiza as salas ativas (1 a 3) */}
                        {userRooms.map(sala => (
                            <div key={sala} className="admin-glass-panel sala-card" onClick={() => setRoomCode(sala)}>
                                <span className="label-header text-neon-cyan mb-2">SALA ATIVA</span>
                                <h3 className="sala-codigo">{sala}</h3>
                                <button className="btn-photo-purple-search w-100 mt-auto">ENTRAR NA SALA</button>
                            </div>
                        ))}

                        {/* Renderiza os slots vazios (até completar 3) */}
                        {userRooms.length < 3 && [...Array(3 - userRooms.length)].map((_, i) => (
                            <div key={`empty-${i}`} className="admin-glass-panel sala-card sala-empty d-flex justify-content-center align-items-center">
                                <span className="label-header mb-2 opacity-50">ESPAÇO DISPONÍVEL</span>
                                <span className="opacity-25 mt-2">Vazio</span>
                            </div>
                        ))}
                    </div>

                    {/* SEÇÃO DE CRIAR SALA (EMBAIXO DOS CARDS) */}
                    {userRooms.length < 3 && (
                        <div className="admin-glass-panel p-4 text-center create-room-section mx-auto" style={{ maxWidth: '600px' }}>
                            <span className="label-header text-neon-pink mb-3 d-block">CRIAR NOVA SALA</span>
                            <div className="d-flex flex-column flex-md-row gap-3 justify-content-center align-items-center">
                                <input
                                    type="text"
                                    placeholder="Código Personalizado (opcional)"
                                    maxLength={6}
                                    value={customCode}
                                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                    className="photo-style-input text-center flex-grow-1"
                                />
                                <div className="d-flex gap-2 w-100 w-md-auto">
                                    <button className="btn-photo-purple-search flex-grow-1 px-4" onClick={() => criarSala(customCode)}>
                                        CRIAR
                                    </button>
                                    <button className="btn-reset-data-pourple flex-grow-1 px-4 d-flex justify-content-center align-items-center gap-2" onClick={() => criarSala("")} title="Gerar Aleatório">
                                        <Shuffle size={16} /> ALEATÓRIO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const linkPedidos = `${window.location.origin}/sala/${roomCode}`;
    const linkDisplay = `${window.location.origin}/display/${roomCode}`;
    const linkQR = `${window.location.origin}/display/qr/${roomCode}`;

    // =========================================================
    // TELA ORIGINAL DO DASHBOARD DA FILA
    // =========================================================
    return (
        <div className="admin-page-container">
            <div className="container-fluid d-flex flex-column h-100">
                <header className="admin-header">
                    <div className="header-title-zone">
                        <h2 className="room-title">
                            SALA: <span className="neon-text-cyan">{roomCode}</span>
                        </h2>
                    </div>

                    <div className="header-actions-zone">
                        <button className="btn-action-cyan" onClick={() => setRoomCode(null)}>
                            <List size={14} /> SALAS
                        </button>
                        <button className="btn-action-cyan" onClick={() => window.open(linkPedidos, '_blank')}>
                            <Link size={14} /> PEDIDOS
                        </button>
                        <button className="btn-action-pink" onClick={() => window.open(linkDisplay, '_blank')}>
                            <Monitor size={14} /> TV
                        </button>
                        <button className="btn-action-cyan" onClick={() => window.open(linkQR, '_blank')}>
                            <QrCode size={14} /> QR TV
                        </button>
                        <button className="btn-action-cyan" onClick={() => setModalAberto(true)}>
                            <QrCode size={16} /> QR
                        </button>
                        <button className="btn-action-red" onClick={deslogar}>
                            <LogOut size={16} /> SAIR
                        </button>
                    </div>
                </header>

                {modalAberto && (
                    <div className="modal-overlay" onClick={() => setModalAberto(false)}>
                        <div className="modal-content-neon" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setModalAberto(false)}>&times;</button>
                            <h3 className="text-white fw-bold mb-4">Acesso à Sala</h3>

                            <div className="qr-section" ref={qrRef}>
                                <div className="qr-wrapper bg-white p-3 rounded-4 mb-4 d-inline-block">
                                    <QRCodeCanvas value={linkPedidos} size={200} level={"H"} />
                                </div>

                                <div className="copy-link-container mb-4">
                                    <input
                                        type="text"
                                        className="photo-style-input text-center"
                                        value={linkPedidos}
                                        readOnly
                                    />
                                    <button className="btn-copy-neon" onClick={copiarLink}>
                                        COPIAR LINK
                                    </button>
                                </div>

                                <button className="btn-photo-purple-search w-100 py-3 mt-2" onClick={downloadQRCode}>
                                    BAIXAR QR HD
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="row g-4 flex-grow-1 admin-main-row">
                    <div className="col-lg-6 col-12 d-flex flex-column">
                        <div className="admin-glass-panel">
                            <div className="panel-header d-flex justify-content-between align-items-center">
                                <div>
                                    <span className={`label-header cursor-pointer ${abaAtiva === 'fila' ? 'text-white' : 'opacity-50'}`} onClick={() => setAbaAtiva('fila')}>FILA</span>
                                    <span className="text-white mx-3 opacity-50">|</span>
                                    <span className={`label-header cursor-pointer ${abaAtiva === 'historico' ? 'text-white' : 'opacity-50'}`} onClick={() => setAbaAtiva('historico')}>HISTÓRICO</span>
                                </div>
                                <button className="btn-reset-data-pourple d-flex align-items-center gap-2" onClick={encerrarNoite}><Power size={16} /> Encerrar</button>
                            </div>
                            <div className="panel-body-scroll">
                                {abaAtiva === 'fila' ? (
                                    fila.length === 0 ? <p className="text-white text-center mt-4">Fila vazia.</p> :
                                        fila.map((item, idx) => (
                                            <ItemFila
                                                key={item.id}
                                                item={item}
                                                index={idx}
                                                chamarParaPalco={chamarProximo}
                                                removerDaFila={removerEChamarProximo}
                                            />
                                        ))
                                ) : (
                                    historico.map(item => (
                                        <div key={item.id} className="admin-neon-card mb-3 opacity-50">
                                            <div className="card-content">
                                                <h4 className="singer-title">{item.nome}</h4>
                                                <p className="song-subtitle">{item.musica}</p>
                                            </div>
                                            <span className="text-white small fw-bold">FINALIZADO</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6 col-12 d-flex flex-column">
                        <div className="admin-glass-panel bg-dark-panel">
                            <div className="panel-header d-flex justify-content-between align-items-center">
                                <span className="label-header text-purple">BUSCAR KARAOKÊ</span>
                                <button className="btn-reset-data-red d-flex align-items-center gap-2" onClick={() => update(ref(db, `salas/${roomCode}/configuracao`), { videoAtual: null })}><Square size={14} /> PARAR TV</button>
                            </div>
                            <div className="panel-body-scroll">
                                <form onSubmit={pesquisarYoutube} className="mb-4">
                                    <input className="photo-style-input mb-3" placeholder="Artista" value={artista} onChange={(e) => setArtista(e.target.value)} />
                                    <input className="photo-style-input mb-3" placeholder="Música" value={musica} onChange={(e) => setMusica(e.target.value)} />
                                    <button className="btn-photo-purple-search w-100 d-flex align-items-center justify-content-center gap-2"><Search size={18} /> BUSCAR</button>
                                </form>
                                {videos.map(v => (
                                    <div key={v.id.videoId} className="yt-video-row" onClick={() => darPlayNoDisplay(v.id.videoId)}>
                                        <img src={v.snippet.thumbnails.default.url} alt="thumb" />
                                        <div className="ms-3">
                                            <p className="yt-video-title m-0">{v.snippet.title}</p>
                                            <small className="text-info small">ENVIAR À TV</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
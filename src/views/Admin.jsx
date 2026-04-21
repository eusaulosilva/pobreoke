import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, remove, set } from "firebase/database";
import axios from "axios";
import "./Admin.css";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import { Play, SkipForward, Power, LogOut, QrCode, Search, Square, Monitor, Link } from 'lucide-react';
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
    const [roomCode, setRoomCode] = useState(null);
    const [qrValue, setQrValue] = useState("");
    const [fgColor, setFgColor] = useState("#000000"); // Cor do QR
    const [bgColor, setBgColor] = useState("#ffffff"); // Cor do fundo/moldura
    const [logoUrl, setLogoUrl] = useState(""); // URL de uma imagem/logo central

    const qrRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/login");
            } else {
                setUser(currentUser);
                const adminRef = ref(db, `admins/${currentUser.uid}`);
                onValue(adminRef, (snapshot) => {
                    const data = snapshot.val();
                    if (snapshot.exists() && typeof data === 'object') {
                        setRoomCode(data.activeRoom || null);
                    } else {
                        setRoomCode(null);
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
            setQrValue(`${window.location.origin}/pedir/${roomCode}`);
        }
        const salaRef = ref(db, `salas/${roomCode}/fila`);
        return onValue(salaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setFila(lista.filter(i => i.status === "aguardando" || i.status === "iniciado").sort((a, b) => a.timestamp - b.timestamp));
            setHistorico(lista.filter(i => i.status === "finalizado" || i.status === "cancelado").sort((a, b) => b.timestamp - a.timestamp));
        });
    }, [roomCode]);

    const criarNovaSala = () => {
        const novoCodigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        update(ref(db, `admins/${user.uid}`), { activeRoom: novoCodigo });
        set(ref(db, `salas/${novoCodigo}/configuracao`), { adminId: user.uid, criadoEm: Date.now() });
        setRoomCode(novoCodigo);
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
            update(ref(db, `admins/${user.uid}`), { activeRoom: null });
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

    if (carregando) return <div className="text-white text-center mt-5">A preparar os teus discos...</div>;
    if (!roomCode) {
        return (
            <div className="admin-welcome-screen">
                <div className="admin-glass-panel welcome-card text-center shadow-lg">
                    <h2 className="welcome-title mb-4">
                        BEM-VINDO AO <span className="text-neon-pink">POBREOKÊ</span>
                    </h2>
                    <p className="welcome-subtitle mb-5">Olá, DJ! Cria a tua sala única agora mesmo.</p>

                    <button className="btn-photo-purple-search w-100 py-3 mb-3 d-flex align-items-center justify-content-center gap-2" onClick={criarNovaSala}>
                        🚀 CRIAR SALA DE KARAOKÊ
                    </button>

                    <button className="btn-reset-data-red w-100 py-2 mt-2" onClick={deslogar}>
                        SAIR DA CONTA
                    </button>
                </div>
            </div>
        );
    }
    const copiarLink = () => {
        navigator.clipboard.writeText(qrValue);
        alert("Link copiado com sucesso!");
    };
    const removerEChamarProximo = (idRemovido) => {
        // 1. Finaliza a música que o admin clicou para remover
        atualizarStatus(idRemovido, "finalizado");

        // 2. Para a TV imediatamente limpando o vídeo atual
        if (roomCode) {
            update(ref(db, `salas/${roomCode}/configuracao`), { videoAtual: null });
        }

        // 3. Busca quem é o próximo da fila (que não seja o que acabou de ser removido)
        const proximo = fila.find(item => item.id !== idRemovido && item.status === "aguardando");

        // 4. Se existir uma próxima pessoa, chama-a automaticamente
        if (proximo) {
            chamarProximo(proximo);
        } else {
            // Se não houver ninguém na fila, limpa também os campos de pesquisa
            setArtista("");
            setMusica("");
            setVideos([]);
        }
    };


    const linkPedidos = `${window.location.origin}/pedir/${roomCode}`;
    const linkDisplay = `${window.location.origin}/display/${roomCode}`;

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
                        <button className="btn-action-cyan" onClick={() => window.open(linkPedidos, '_blank')}>
                            <Link size={14} /> PEDIDOS
                        </button>
                        <button className="btn-action-pink" onClick={() => window.open(linkDisplay, '_blank')}>
                            <Monitor size={14} /> TV
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
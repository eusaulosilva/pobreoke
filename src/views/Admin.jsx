import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, remove, set } from "firebase/database";
import axios from "axios";
import "./Admin.css";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";

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

    const qrRef = useRef();
    const navigate = useNavigate();

    // 1. Qualquer pessoa logada agora é bem-vinda como DJ!
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/login");
            } else {
                setUser(currentUser);
                // Verifica se o DJ já tem uma sala aberta
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
        // Cria o perfil se não existir, ou atualiza a sala ativa
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
        if (window.confirm("ENCERRAR NOITE? A sala " + roomCode + " será apagada e o código invalidado.")) {
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

    // Ecrã inicial para qualquer pessoa que acabe de fazer login
    if (!roomCode) {
        return (
            <div className="admin-page-container d-flex justify-content-center align-items-center">
                <div className="admin-glass-panel p-5 text-center" style={{ maxWidth: '500px' }}>
                    <h2 className="text-white mb-4 fw-bold">BEM-VINDO AO <span style={{ color: 'var(--neon-pink)' }}>POBREOKÊ</span></h2>
                    <p className="text-muted mb-5">Olá, DJ! Cria a tua sala única agora mesmo e começa a receber os pedidos da tua festa.</p>
                    <button className="btn-photo-purple-search w-100 py-3 mb-3 d-flex align-items-center justify-content-center gap-2" onClick={criarNovaSala}>
                        🚀 CRIAR SALA DE KARAOKÊ
                    </button>
                    <button className="btn-reset-data w-100" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={deslogar}>SAIR DA CONTA</button>
                </div>
            </div>
        );
    }

    const linkPedidos = `${window.location.origin}/pedir/${roomCode}`;
    const linkDisplay = `${window.location.origin}/display/${roomCode}`;

    return (
        <div className="admin-page-container">
            <div className="container-fluid h-100 d-flex flex-column">

                {/* BARRA SUPERIOR (HEADER) */}
                <div className="d-flex justify-content-between align-items-start mb-5">
                    <div>
                        <h2 className="text-white mb-3" style={{ fontWeight: '900', letterSpacing: '1px' }}>
                            SALA ATIVA: <span style={{ color: 'var(--neon-cyan)' }}>{roomCode}</span>
                        </h2>

                        <div className="d-flex gap-3">
                            <button className="btn-reset-data d-flex align-items-center gap-2" onClick={() => window.open(linkPedidos, '_blank')} style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}>
                                🔗 LINK DE PEDIDOS
                            </button>
                            <button className="btn-reset-data d-flex align-items-center gap-2" onClick={() => window.open(linkDisplay, '_blank')} style={{ borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}>
                                📺 ABRIR NA TV
                            </button>
                        </div>
                    </div>

                    <div className="d-flex gap-3 align-items-start">
                        <button className="btn-reset-data d-flex align-items-center gap-2" onClick={() => setModalAberto(true)}>📷 QR CODE</button>
                        <button className="btn-reset-data d-flex align-items-center gap-2" onClick={deslogar} style={{ borderColor: '#ef4444', color: '#ef4444' }}>🚪 SAIR</button>
                    </div>
                </div>

                {/* MODAL DO QR CODE */}
                {modalAberto && (
                    <div className="modal-overlay" onClick={() => setModalAberto(false)}>
                        <div className="modal-content-neon" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setModalAberto(false)}>&times;</button>
                            <h3 className="text-white fw-bold mb-4">Acesso à Sala</h3>
                            <div className="qr-section mb-4" ref={qrRef}>
                                <div className="qr-wrapper bg-white p-3 rounded-4 mb-3">
                                    <QRCodeCanvas value={linkPedidos} size={180} level={"H"} />
                                </div>
                                <button className="btn-photo-purple-search w-100 py-3 d-flex align-items-center justify-content-center gap-2" onClick={downloadQRCode}>
                                    ⬇️ BAIXAR QR CODE HD
                                </button>
                            </div>
                            <div className="links-section text-start">
                                <div className="mb-3">
                                    <label className="text-muted small text-uppercase fw-bold mb-2 d-block">Link dos Convidados</label>
                                    <div className="d-flex gap-2 align-items-center">
                                        <input className="photo-style-input m-0" value={linkPedidos} readOnly style={{ background: 'rgba(255,255,255,0.05)' }} />
                                        <button className="btn-reset-data py-2" onClick={() => navigator.clipboard.writeText(linkPedidos)}>Copiar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* COLUNAS */}
                <div className="row g-5 h-100 flex-grow-1 overflow-hidden">
                    <div className="col-lg-6 col-12 h-100">
                        <div className="admin-glass-panel h-100">
                            <div className="panel-header d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="label-header" style={{ cursor: 'pointer', opacity: abaAtiva === 'fila' ? 1 : 0.4 }} onClick={() => setAbaAtiva('fila')}>FILA</span>
                                    <span className="text-white mx-3 opacity-50">|</span>
                                    <span className="label-header" style={{ cursor: 'pointer', opacity: abaAtiva === 'historico' ? 1 : 0.4 }} onClick={() => setAbaAtiva('historico')}>HISTÓRICO</span>
                                </div>
                                <button className="btn-reset-data d-flex align-items-center gap-2" onClick={encerrarNoite}>🧹 ENCERRAR NOITE</button>
                            </div>
                            <div className="panel-body-scroll">
                                {abaAtiva === 'fila' ? (
                                    fila.length === 0 ? <p className="text-muted text-center mt-4">Fila vazia.</p> :
                                        fila.map((item, idx) => (
                                            <div key={item.id} className={`admin-neon-card mb-3 ${item.status === 'iniciado' ? 'active' : ''}`}>
                                                <div className="card-content">
                                                    <h4 className="singer-title">{idx + 1}. {item.nome}</h4>
                                                    <p className="song-subtitle">{item.musica}</p>
                                                </div>
                                                <div className="admin-controls-btns">
                                                    <button className="btn-play-neon" onClick={() => chamarProximo(item)}>JOGAR</button>
                                                    <button className="btn-x-neon" onClick={() => atualizarStatus(item.id, 'finalizado')}>X</button>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    historico.length === 0 ? <p className="text-muted text-center mt-4">Sem histórico ainda.</p> :
                                        historico.map(item => (
                                            <div key={item.id} className="admin-neon-card mb-3" style={{ opacity: 0.6 }}>
                                                <div className="card-content">
                                                    <h4 className="singer-title">{item.nome}</h4>
                                                    <p className="song-subtitle">{item.musica}</p>
                                                </div>
                                                <div className="admin-controls-btns"><span style={{ color: '#888', fontWeight: 'bold', fontSize: '0.8rem' }}>FINALIZADO</span></div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6 col-12 h-100">
                        <div className="admin-glass-panel h-100 bg-dark-panel">
                            <div className="panel-header d-flex justify-content-between align-items-center">
                                <span className="label-header text-purple">BUSCAR KARAOKÊ</span>
                                <button className="btn-reset-data d-flex align-items-center gap-2" onClick={() => update(ref(db, `salas/${roomCode}/configuracao`), { videoAtual: null })}>🛑 PARAR TV</button>
                            </div>
                            <div className="panel-body-scroll p-4">
                                <form onSubmit={pesquisarYoutube} className="mb-4">
                                    <input className="photo-style-input mb-3" placeholder="Artista" value={artista} onChange={(e) => setArtista(e.target.value)} />
                                    <input className="photo-style-input mb-3" placeholder="Música" value={musica} onChange={(e) => setMusica(e.target.value)} />
                                    <button className="btn-photo-purple-search w-100 d-flex align-items-center justify-content-center gap-2">🔍 BUSCAR KARAOKÊ</button>
                                </form>
                                <div className="youtube-results-list">
                                    {videos.map(v => (
                                        <div key={v.id.videoId} className="yt-video-row cursor-pointer" onClick={() => darPlayNoDisplay(v.id.videoId)}>
                                            <img src={v.snippet.thumbnails.default.url} alt="thumb" />
                                            <div className="ms-3">
                                                <p className="yt-video-title m-0">{v.snippet.title}</p>
                                                <small className="text-info small">CLIQUE PARA ENVIAR À TV</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
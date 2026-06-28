import React, { useReducer, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, remove, set, get } from "firebase/database";
import axios from "axios";
import "./Admin.css";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import { Power, LogOut, QrCode, Search, Square, Monitor, Link, List, Shuffle, Lock, Unlock, Users } from 'lucide-react';
import ItemFila from "../components/ItemFila";
import { useQueue } from "../hooks/useQueue";
import { QUEUE_STATUS, FIREBASE_PATHS } from "../constants";
import { useSalaId, validators } from "../utils";

const rawKeys = import.meta.env.VITE_YOUTUBE_KEYS || import.meta.env.VITE_YOUTUBE_KEY || "";
const YOUTUBE_API_KEYS = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

const initialState = {
    artista: "", musica: "", videos: [], abaAtiva: "fila",
    modalAberto: false, userRooms: [], customCode: "",
    dragIndex: null, filaFechada: false, carregando: true,
    alertaConfig: { visivel: false, texto: "" },
    linkCopiado: false, isAdmin: false
};

function adminReducer(state, action) {
    switch (action.type) {
        case 'SET_BUSCA': return { ...state, artista: action.artista ?? state.artista, musica: action.musica ?? state.musica };
        case 'SET_VIDEOS': return { ...state, videos: action.videos };
        case 'SET_UI': return { ...state, ...action.payload };
        case 'SET_ROOMS': return { ...state, userRooms: action.payload, carregando: false };
        case 'RESET_BUSCA': return { ...state, artista: "", musica: "", videos: [] };
        case 'SHOW_ALERT': return { ...state, alertaConfig: { visivel: true, texto: action.texto } };
        case 'HIDE_ALERT': return { ...state, alertaConfig: { visivel: false, texto: "" } };
        default: return state;
    }
}

export default function Admin() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const roomCode = useSalaId(roomId);
    const qrRef = useRef();
    const currentKeyIndex = useRef(0);

    const [state, dispatch] = useReducer(adminReducer, initialState);
    const { fila, historico, atualizarStatus, atualizarTimestamp } = useQueue(roomCode);

    useEffect(() => {
        if (!roomCode) return;
        const configRef = ref(db, FIREBASE_PATHS.filaFechada(roomCode));
        const unsubscribe = onValue(configRef, (snapshot) => {
            dispatch({ type: 'SET_UI', payload: { filaFechada: snapshot.val() || false } });
        });
        return () => unsubscribe();
    }, [roomCode]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/login", { replace: true });
                return;
            }

            const userNodeRef = ref(db, `usuarios/${currentUser.uid}`);
            get(userNodeRef).then((snap) => {
                if (snap.exists()) {
                    dispatch({ type: 'SET_UI', payload: { isAdmin: snap.val().isAdmin === true } });
                }
            });

            const adminRef = ref(db, FIREBASE_PATHS.adminUser(currentUser.uid));
            onValue(adminRef, (snapshot) => {
                const data = snapshot.val();
                if (snapshot.exists()) {
                    if (data.salas) {
                        dispatch({ type: 'SET_ROOMS', payload: Object.keys(data.salas) });
                    } else if (data.activeRoom) {
                        const oldRoom = data.activeRoom;
                        update(ref(db, FIREBASE_PATHS.adminUser(currentUser.uid)), { salas: { [oldRoom]: true }, activeRoom: null });
                        dispatch({ type: 'SET_ROOMS', payload: [oldRoom] });
                    } else {
                        dispatch({ type: 'SET_ROOMS', payload: [] });
                    }
                } else {
                    dispatch({ type: 'SET_ROOMS', payload: [] });
                }
            });
        });
        return () => unsubscribe();
    }, [navigate]);

    const criarSala = useCallback(async (codigoFornecido) => {
        if (state.userRooms.length >= 3) {
            dispatch({ type: 'SHOW_ALERT', texto: "Atenção: Atingiste o limite máximo de 3 salas ativas!" });
            return;
        }

        let codigoFinal = codigoFornecido.trim().toUpperCase();
        if (!codigoFinal) codigoFinal = Math.random().toString(36).substring(2, 8).toUpperCase();

        if (!validators.validarCodigo(codigoFinal)) {
            dispatch({ type: 'SHOW_ALERT', texto: "O código da sala deve ter entre 3 e 6 caracteres." });
            return;
        }

        try {
            const salaCheck = await get(ref(db, FIREBASE_PATHS.sala(codigoFinal)));
            if (salaCheck.exists()) {
                dispatch({ type: 'SHOW_ALERT', texto: "Este código de sala já está em uso! Tente outro nome." });
                return;
            }

            const uid = auth.currentUser.uid;
            await update(ref(db, FIREBASE_PATHS.adminSalas(uid)), { [codigoFinal]: true });
            await set(ref(db, FIREBASE_PATHS.configuracao(codigoFinal)), { adminId: uid, criadoEm: Date.now(), filaFechada: false });

            navigate(`/admin/${codigoFinal}`);
            dispatch({ type: 'SET_UI', payload: { customCode: "" } });
        } catch (err) {
            dispatch({ type: 'SHOW_ALERT', texto: "Erro ao comunicar com o servidor." });
        }
    }, [state.userRooms, navigate]);

    const deslogar = () => signOut(auth).then(() => navigate("/login"));

    const alternarFila = useCallback(() => {
        if (!roomCode) return;
        update(ref(db, FIREBASE_PATHS.configuracao(roomCode)), { filaFechada: !state.filaFechada })
            .catch(err => console.error("Erro ao alternar status:", err));
    }, [roomCode, state.filaFechada]);

    const realizarBusca = useCallback(async (termoDeBusca) => {
        if (!validators.validarMusica(termoDeBusca)) return;

        if (YOUTUBE_API_KEYS.length === 0) {
            dispatch({ type: 'SHOW_ALERT', texto: "Nenhuma chave de API configurada!" });
            return;
        }

        while (currentKeyIndex.current < YOUTUBE_API_KEYS.length) {
            const keyToUse = YOUTUBE_API_KEYS[currentKeyIndex.current];

            try {
                const res = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                    params: {
                        part: "snippet", q: `${termoDeBusca} karaoke`, type: "video",
                        videoEmbeddable: "true", maxResults: 10, key: keyToUse,
                    },
                });
                dispatch({ type: 'SET_VIDEOS', videos: res.data.items });
                return;

            } catch (error) {
                if (error.config && error.config.url) {
                    error.config.url = "https://www.youtube.com/watch?v=yTBic2OL-9o";
                }

                if (error.response && error.response.status === 429) {
                    console.warn(`⏳ Chave ${currentKeyIndex.current + 1} esgotada. A tentar a próxima chave...`);
                    currentKeyIndex.current++;

                    if (currentKeyIndex.current >= YOUTUBE_API_KEYS.length) {
                        dispatch({ type: 'SHOW_ALERT', texto: "⚠️ LIMITE MÁXIMO ATINGIDO: Todas as chaves da API esgotaram a cota diária!" });
                        break;
                    }
                } else {
                    console.error("Erro na busca:", error.message);
                    dispatch({ type: 'SHOW_ALERT', texto: "Erro ao procurar música no YouTube." });
                    break;
                }
            }
        }
    }, []);

    const pesquisarYoutube = (e) => {
        if (e) e.preventDefault();
        realizarBusca(`${state.artista} ${state.musica}`);
    };

    const chamarProximo = useCallback((itemClicado) => {
        const cantandoAgora = fila.find(item => item.status === QUEUE_STATUS.INICIADO);
        if (cantandoAgora) atualizarStatus(cantandoAgora.id, QUEUE_STATUS.FINALIZADO);
        atualizarStatus(itemClicado.id, QUEUE_STATUS.INICIADO);

        dispatch({ type: 'SET_BUSCA', artista: "", musica: itemClicado.musica });
        realizarBusca(`${itemClicado.musica}`);
    }, [fila, atualizarStatus, realizarBusca]);

    const removerItemDaFila = useCallback((idRemovido) => {
        const itemSendoRemovido = fila.find(item => item.id === idRemovido);
        atualizarStatus(idRemovido, QUEUE_STATUS.FINALIZADO);

        if (itemSendoRemovido?.status === QUEUE_STATUS.INICIADO && roomCode) {
            update(ref(db, FIREBASE_PATHS.configuracao(roomCode)), { videoAtual: null });
            dispatch({ type: 'RESET_BUSCA' });
        }
    }, [fila, atualizarStatus, roomCode]);

    const verificarSeRecorrente = useCallback((uidAtual) => {
        if (!uidAtual) return false;
        const naFila = fila.filter(p => p.uid === uidAtual).length;
        const noHistorico = historico.filter(p => p.uid === uidAtual).length;
        return (naFila + noHistorico) > 1;
    }, [fila, historico]);

    const encerrarNoite = async () => {
        if (!roomCode) return;
        if (window.confirm(`ENCERRAR NOITE? A sala ${roomCode} será apagada.`)) {
            try {
                await remove(ref(db, FIREBASE_PATHS.sala(roomCode)));
                await remove(ref(db, `admins/${auth.currentUser?.uid}/salas/${roomCode}`));

                navigate('/admin');
                dispatch({ type: 'RESET_BUSCA' });
            } catch (error) {
                console.error("Erro ao encerrar a noite:", error);
                dispatch({ type: 'SHOW_ALERT', texto: "Ocorreu um erro ao tentar apagar a sala. Tente novamente." });
            }
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
        const linkPedidos = `${window.location.origin}/sala/${roomCode}`;
        navigator.clipboard.writeText(linkPedidos);

        dispatch({ type: 'SET_UI', payload: { linkCopiado: true } });

        setTimeout(() => {
            dispatch({ type: 'SET_UI', payload: { linkCopiado: false } });
        }, 3000);
    };

    const darPlayNoDisplay = (videoId) => {
        if (!roomCode) return;
        update(ref(db, FIREBASE_PATHS.configuracao(roomCode)), {
            videoAtual: videoId,
            timestamp: Date.now()
        }).catch(err => console.error("Erro na TV:", err));
    };

    const aoSoltarCard = async (e, dropIndex) => {
        e.preventDefault();
        if (state.dragIndex === null || state.dragIndex === dropIndex) return;

        if (fila[state.dragIndex].status === QUEUE_STATUS.INICIADO || fila[dropIndex].status === QUEUE_STATUS.INICIADO) {
            dispatch({ type: 'SET_UI', payload: { dragIndex: null } });
            return;
        }

        const novaFila = [...fila];
        const itemArrastado = novaFila.splice(state.dragIndex, 1)[0];
        novaFila.splice(dropIndex, 0, itemArrastado);

        let novoTimestamp;
        const itemAnterior = novaFila[dropIndex - 1];
        const itemPosterior = novaFila[dropIndex + 1];

        if (!itemAnterior || itemAnterior.status === QUEUE_STATUS.INICIADO) {
            if (itemPosterior) {
                novoTimestamp = itemPosterior.timestamp - 1000;
            } else {
                novoTimestamp = Date.now();
            }
        } else if (!itemPosterior) {
            novoTimestamp = itemAnterior.timestamp + 1000;
        } else {
            novoTimestamp = (itemAnterior.timestamp + itemPosterior.timestamp) / 2;
        }

        dispatch({ type: 'SET_UI', payload: { dragIndex: null } });

        try {
            await atualizarTimestamp(itemArrastado.id, novoTimestamp);
        } catch (error) {
            console.error("Erro ao reordenar:", error);
            dispatch({ type: 'SHOW_ALERT', texto: "Erro ao reordenar a fila." });
        }
    };

    if (state.carregando) return <div className="text-white text-center mt-5">A preparar os teus discos...</div>;

    const linkPedidos = `${window.location.origin}/sala/${roomCode}`;
    const linkDisplay = `${window.location.origin}/display/${roomCode}`;
    const linkQR = `${window.location.origin}/display/qr/${roomCode}`;

    return (
        <div className="admin-page-container">

            {state.alertaConfig.visivel && (
                <div className="modal-overlay" onClick={() => dispatch({ type: 'HIDE_ALERT' })}>
                    <div className="modal-content-neon text-center p-4" onClick={e => e.stopPropagation()}>
                        <h4 className="text-white mb-3">Aviso</h4>
                        <p className="text-white mb-4">{state.alertaConfig.texto}</p>
                        <button className="btn-photo-purple-search w-100" onClick={() => dispatch({ type: 'HIDE_ALERT' })}>OK</button>
                    </div>
                </div>
            )}

            {state.modalAberto && (
                <div className="modal-overlay" onClick={() => dispatch({ type: 'SET_UI', payload: { modalAberto: false } })}>
                    <div className="modal-content-neon" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => dispatch({ type: 'SET_UI', payload: { modalAberto: false } })}>&times;</button>
                        <h3 className="text-white fw-bold mb-4">Acesso à Sala</h3>
                        <div className="qr-section" ref={qrRef}>
                            <div className="qr-wrapper bg-white p-3 rounded-4 mb-4 d-inline-block">
                                <QRCodeCanvas value={linkPedidos} size={200} level={"H"} />
                            </div>
                            <div className="copy-link-container mb-4 text-center">
                                <input type="text" className="photo-style-input text-center" value={linkPedidos} readOnly />
                                <button className="btn-copy-neon w-100" onClick={copiarLink}>COPIAR LINK</button>
                                {state.linkCopiado && (
                                    <p className="text-success fw-bold mt-2 mb-0" style={{ fontSize: '0.9rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                                        ✓ Link copiado com sucesso!
                                    </p>
                                )}
                            </div>
                            <button className="btn-photo-purple-search w-100 py-3 mt-2" onClick={downloadQRCode}>BAIXAR QR HD</button>
                        </div>
                    </div>
                </div>
            )}

            {!roomCode ? (
                <div className="admin-welcome-screen position-relative">

                    <div className="top-right-actions">
                        {state.isAdmin && (
                            <button className="btn-manage-top" onClick={() => navigate('/admin/usuarios')} title="Gerenciar Acessos">
                                <Users size={18} /> <span>ACESSOS</span>
                            </button>
                        )}
                        <button className="btn-logout-top" onClick={deslogar} title="Sair">
                            <LogOut size={18} /> <span>SAIR</span>
                        </button>
                    </div>

                    <div className="salas-container w-100">
                        <div className="text-center mb-5">
                            <h2 className="welcome-title mb-2">GERENCIAR <span className="text-neon-pink">SALAS</span></h2>
                        </div>
                        <div className="salas-grid mb-4">
                            {state.userRooms.map(sala => (
                                <div key={sala} className="admin-glass-panel sala-card" onClick={() => navigate(`/admin/${sala}`)}>
                                    <span className="label-header text-neon-cyan mb-2">SALA ATIVA</span>
                                    <h3 className="sala-codigo">{sala}</h3>
                                    <button className="btn-photo-purple-search w-100 mt-auto">ENTRAR</button>
                                </div>
                            ))}
                            {state.userRooms.length < 3 && [...Array(3 - state.userRooms.length)].map((_, i) => (
                                <div key={`empty-${i}`} className="admin-glass-panel sala-card sala-empty d-flex justify-content-center align-items-center">
                                    <span className="label-header mb-2 opacity-50">ESPAÇO DISPONÍVEL</span>
                                    <span className="opacity-25 mt-2">Vazio</span>
                                </div>
                            ))}
                        </div>
                        {state.userRooms.length < 3 && (
                            <div className="admin-glass-panel p-4 text-center create-room-section mx-auto">
                                <span className="label-header text-neon-pink mb-3 d-block">CRIAR NOVA SALA</span>
                                <div className="d-flex flex-column flex-md-row gap-3">
                                    <input type="text" placeholder="Código Personalizado" maxLength={6} value={state.customCode} onChange={(e) => dispatch({ type: 'SET_UI', payload: { customCode: e.target.value.toUpperCase() } })} className="photo-style-input text-center flex-grow-1" />
                                    <button className="btn-photo-purple-search px-4" onClick={() => criarSala(state.customCode)}>CRIAR</button>
                                    <button className="btn-reset-data-pourple flex-grow-1 px-4 d-flex justify-content-center align-items-center gap-2" onClick={() => criarSala("")} title="Gerar Aleatório">
                                        <Shuffle size={16} /> ALEATÓRIO
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="container-fluid d-flex flex-column h-100">
                    <header className="admin-header">
                        <div className="header-title-zone"><h2 className="room-title">SALA: <span className="neon-text-cyan">{roomCode}</span></h2></div>
                        <div className="header-actions-zone">
                            {state.isAdmin && (
                                <button className="btn-action-cyan" onClick={() => navigate('/admin/usuarios')}><Users size={14} /> ACESSOS</button>
                            )}
                            <button className="btn-action-cyan" onClick={() => navigate('/admin')}><List size={14} /> SALAS</button>
                            <button className="btn-action-cyan" onClick={() => window.open(linkPedidos, '_blank')}><Link size={14} /> PEDIDOS</button>
                            <button className="btn-action-pink" onClick={() => window.open(linkDisplay, '_blank')}><Monitor size={14} /> TV</button>
                            <button className="btn-action-cyan" onClick={() => window.open(linkQR, '_blank')}><QrCode size={14} /> QR TV</button>
                            <button className="btn-action-cyan" onClick={() => dispatch({ type: 'SET_UI', payload: { modalAberto: true } })}><QrCode size={16} /> QR</button>
                            <button className="btn-action-red" onClick={deslogar}><LogOut size={16} /> SAIR</button>
                        </div>
                    </header>

                    <div className="row g-4 flex-grow-1 admin-main-row">
                        <div className="col-lg-6 col-12 d-flex flex-column">
                            <div className="admin-glass-panel">
                                <div className="panel-header d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className={`label-header cursor-pointer ${state.abaAtiva === 'fila' ? 'text-white' : 'opacity-50'}`} onClick={() => dispatch({ type: 'SET_UI', payload: { abaAtiva: 'fila' } })}>FILA</span>
                                        <span className="text-white mx-3 opacity-50">|</span>
                                        <span className={`label-header cursor-pointer ${state.abaAtiva === 'historico' ? 'text-white' : 'opacity-50'}`} onClick={() => dispatch({ type: 'SET_UI', payload: { abaAtiva: 'historico' } })}>HISTÓRICO</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className={`btn-action-${state.filaFechada ? 'cyan' : 'pink'} d-flex align-items-center gap-2`} onClick={alternarFila}>
                                            {state.filaFechada ? <Unlock size={14} /> : <Lock size={14} />} {state.filaFechada ? "ABRIR FILA" : "FECHAR FILA"}
                                        </button>
                                        <button className="btn-reset-data-pourple d-flex align-items-center gap-2" onClick={encerrarNoite}><Power size={16} /> Encerrar</button>
                                    </div>
                                </div>
                                <div className="panel-body-scroll">
                                    {state.abaAtiva === 'fila' ? (
                                        fila.length === 0 ? <p className="text-white text-center mt-4">Fila vazia.</p> :
                                            fila.map((item, idx) => {
                                                const isRecorrente = verificarSeRecorrente(item.uid);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`draggable-queue-item ${item.status === QUEUE_STATUS.INICIADO ? 'cantando' : ''} ${state.dragIndex === idx ? 'arrastando' : ''}`}
                                                        draggable={item.status !== QUEUE_STATUS.INICIADO}
                                                        onDragStart={(e) => {
                                                            if (item.status === QUEUE_STATUS.INICIADO) {
                                                                e.preventDefault();
                                                                return;
                                                            }
                                                            dispatch({ type: 'SET_UI', payload: { dragIndex: idx } });
                                                        }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => aoSoltarCard(e, idx)}
                                                        onDragEnd={() => dispatch({ type: 'SET_UI', payload: { dragIndex: null } })}
                                                    >
                                                        <ItemFila
                                                            item={item}
                                                            index={idx}
                                                            chamarParaPalco={chamarProximo}
                                                            removerDaFila={removerItemDaFila}
                                                            isRecorrente={isRecorrente}
                                                        />
                                                    </div>
                                                );
                                            })
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
                                    <button className="btn-reset-data-red d-flex align-items-center gap-2" onClick={() => update(ref(db, FIREBASE_PATHS.configuracao(roomCode)), { videoAtual: null })}><Square size={14} /> PARAR TV</button>
                                </div>
                                <div className="panel-body-scroll">
                                    <form onSubmit={pesquisarYoutube} className="mb-4">
                                        <input className="photo-style-input mb-3" placeholder="Artista" value={state.artista} onChange={(e) => dispatch({ type: 'SET_BUSCA', artista: e.target.value })} />
                                        <input className="photo-style-input mb-3" placeholder="Música" value={state.musica} onChange={(e) => dispatch({ type: 'SET_BUSCA', musica: e.target.value })} />
                                        <button className="btn-photo-purple-search w-100 d-flex align-items-center justify-content-center gap-2"><Search size={18} /> BUSCAR</button>
                                    </form>
                                    {state.videos.map(v => (
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
            )}
        </div>
    );
}
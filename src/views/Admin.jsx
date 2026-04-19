import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, remove } from "firebase/database";
import axios from "axios";
import "./Admin.css";
import { useNavigate } from "react-router-dom";
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_KEY;
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
export default function Admin() {
    const [fila, setFila] = useState([]);
    const [artista, setArtista] = useState("");
    const [musica, setMusica] = useState("");
    const [videos, setVideos] = useState([]);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/login");
            } else {
                // Verifica no banco se o UID de quem logou está na lista de admins
                const adminRef = ref(db, `admins/${currentUser.uid}`);

                onValue(adminRef, (snapshot) => {
                    if (snapshot.exists() && snapshot.val() === true) {
                        // É admin!
                        setUser(currentUser);
                        setCarregando(false);
                    } else {
                        // Não é admin
                        alert("Acesso negado: Você não é um administrador.");
                        auth.signOut();
                        navigate("/login");
                    }
                });
            }
        });
        return () => unsubscribe();
    }, [navigate]);
    useEffect(() => {
        const filaRef = ref(db, "fila");
        return onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setFila(lista);
        });
    }, []);

    const pesquisarYoutube = async (e) => {
        if (e) e.preventDefault();
        if (!artista && !musica) return;
        try {
            const res = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: "snippet",
                    q: `${artista} ${musica} karaoke`,
                    type: "video",
                    videoEmbeddable: "true", // <--- ADICIONE ESTA LINHA
                    maxResults: 10,
                    key: YOUTUBE_API_KEY,
                },
            });
            setVideos(res.data.items);
        } catch (err) { console.error(err); }
    };

    const darPlayNoDisplay = (videoId) => {
        update(ref(db, "configuracao"), {
            videoAtual: videoId,
            timestamp: Date.now()
        }).then(() => {
            console.log("Comando enviado: ", videoId);
        }).catch(err => {
            console.error("Erro ao enviar: ", err);
        });
    };
    // Admin.jsx

    const chamarProximo = (item) => {
        const atual = fila.find(i => i.status === "iniciado");
        if (atual) update(ref(db, `fila/${atual.id}`), { status: "finalizado" });
        update(ref(db, `fila/${item.id}`), { status: "iniciado" });
        setArtista("");
        setMusica(item.musica);
    };
    const resetarFilaSemApagar = () => {
        if (!window.confirm("Deseja cancelar todas as músicas da fila?")) return;

        // Criamos um objeto de atualização
        const updates = {};

        // Filtramos apenas quem ainda está na fila (aguardando ou iniciado)
        fila.forEach((item) => {
            if (item.status === "aguardando" || item.status === "iniciado") {
                updates[`/fila/${item.id}/status`] = "cancelado";
            }
        });

        // Se houver itens para atualizar, enviamos ao Firebase
        if (Object.keys(updates).length > 0) {
            update(ref(db), updates)
                .then(() => console.log("Fila cancelada com sucesso!"))
                .catch((err) => console.error("Erro ao resetar fila:", err));
        }

        // Também aproveitamos para limpar a TV
        update(ref(db, "configuracao"), { videoAtual: null });
    };

    return (
        <div className="admin-page-container">
            <div className="container-fluid h-100">
                <div className="row g-5 h-100">
                    {/* FILA */}
                    <div className="col-lg-6 col-12 h-100">
                        <div className="admin-glass-panel h-100">
                            <div className="panel-header d-flex justify-content-between align-items-center">
                                <span className="label-header">PRÓXIMOS NA FILA</span>
                                <button className="btn-reset-data" onClick={resetarFilaSemApagar}>RESETAR FILA</button>
                            </div>
                            <div className="panel-body-scroll">
                                {fila.filter(i => i.status === "aguardando" || i.status === "iniciado")
                                    .sort((a, b) => a.timestamp - b.timestamp).map((item, idx) => (
                                        <div key={item.id} className={`admin-neon-card mb-3 ${item.status === 'iniciado' ? 'active' : ''}`}>
                                            <div className="card-content">
                                                <h4 className="singer-title">{idx + 1}. {item.nome}</h4>
                                                <p className="song-subtitle">{item.musica}</p>
                                            </div>
                                            <div className="admin-controls-btns">
                                                <button className="btn-play-neon" onClick={() => chamarProximo(item)}>JOGAR</button>
                                                <button className="btn-x-neon" onClick={() => update(ref(db, `fila/${item.id}`), { status: 'finalizado' })}>X</button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                    {/* BUSCA */}
                    <div className="col-lg-6 col-12 h-100">
                        <div className="admin-glass-panel h-100 bg-dark-panel">
                            <div className="panel-header d-flex justify-content-between">
                                <span className="label-header text-purple">BUSCAR KARAOKÊ</span>
                                <button className="btn-reset-data" onClick={() => update(ref(db, "configuracao"), { videoAtual: null })}>PARAR TV</button>
                            </div>
                            <div className="panel-body-scroll p-4">
                                <form onSubmit={pesquisarYoutube} className="mb-4">
                                    <input className="photo-style-input mb-3" placeholder="Artista" value={artista} onChange={(e) => setArtista(e.target.value)} />
                                    <input className="photo-style-input mb-3" placeholder="Música" value={musica} onChange={(e) => setMusica(e.target.value)} />
                                    <button className="btn-photo-purple-search w-100">🔍 BUSCAR KARAOKÊ</button>
                                </form>
                                <div className="youtube-results-list">
                                    {videos.map(v => (
                                        <div key={v.id.videoId} className="yt-video-row" onClick={() => darPlayNoDisplay(v.id.videoId)} style={{ cursor: 'pointer' }}>
                                            <img src={v.snippet.thumbnails.default.url} alt="thumb" />
                                            <div className="ms-3">
                                                <p className="yt-video-title m-0">{v.snippet.title}</p>
                                                <small style={{ color: 'var(--neon-cyan)', fontSize: '0.6rem' }}>CLIQUE PARA ENVIAR À TV</small>
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
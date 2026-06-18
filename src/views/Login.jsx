import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const [carregando, setCarregando] = useState(true);

    // Novo estado para controlar o modal personalizado
    const [modalConfig, setModalConfig] = useState({ visivel: false, titulo: "", texto: "" });

    const exibirModal = (titulo, texto) => {
        setModalConfig({ visivel: true, titulo, texto });
    };

    const fecharModal = () => {
        setModalConfig({ visivel: false, titulo: "", texto: "" });
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = ref(db, `usuarios/${user.uid}`);
                const snapshot = await get(userRef);

                // VALIDAÇÃO DIRETA PELO BANCO DE DADOS PARA TODOS OS UTILIZADORES
                if (snapshot.exists()) {
                    const userData = snapshot.val();

                    if (userData.permitido) {
                        navigate("/admin");
                    } else {
                        await signOut(auth);
                        exibirModal("Acesso Restrito", "O teu utilizador não tem permissão para aceder ao painel.");
                        setCarregando(false);
                    }
                } else {
                    // Se for o primeiro login, cria o registo totalmente bloqueado e sem privilégios
                    await set(userRef, {
                        nome: user.displayName || "Sem Nome",
                        email: user.email,
                        permitido: false,
                        isAdmin: false
                    });

                    await signOut(auth);
                    exibirModal("Conta Registada", "Conta registada com sucesso! Aguarda a aprovação do administrador para poderes entrar.");
                    setCarregando(false);
                }
            } else {
                setCarregando(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const logarComGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao iniciar sessão:", error);
            exibirModal("Erro de Conexão", "Falha na ligação com o Google. Verifica a tua internet ou desativa os bloqueadores de anúncios.");
        }
    };

    if (carregando) {
        return <div className="login-page loading-bg"></div>;
    }

    return (
        <div className="login-page position-relative">

            {/* NOVO MODAL IDÊNTICO AO PEDIDO E USUARIOSADMIN */}
            {modalConfig.visivel && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center modal-overlay-custom" style={{ zIndex: 9999 }} onClick={fecharModal}>
                    <div className="p-4 text-center d-flex flex-column align-items-center modal-content-custom" onClick={(e) => e.stopPropagation()}>
                        <h4 className="fw-bold mb-3 modal-title-custom">{modalConfig.titulo}</h4>
                        <p className="text-white mb-4 modal-text-custom">{modalConfig.texto}</p>
                        <button className="w-100 py-3 fw-bold border-0 modal-btn-custom" onClick={fecharModal}>
                            OK, ENTENDI
                        </button>
                    </div>
                </div>
            )}

            <div className="login-card shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="login-header">
                    <h1 className="neon-text-cyan">POBREOKÊ</h1>
                    <p>PAINEL DE CONTROLE</p>
                </div>

                <div className="login-body">
                    <div className="icon-lock">🔐</div>
                    <h3>Acesso Restrito</h3>
                    <p className="text-muted">Apenas administradores autorizados podem gerenciar a fila e a TV.</p>
                </div>

                <button className="btn-login-google" onClick={logarComGoogle}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" />
                    ENTRAR COM GOOGLE
                </button>

                <div className="guest-container">
                    <div className="divider">
                        <span>ou</span>
                    </div>
                    <button className="btn-guest-room" onClick={() => navigate("/sala")}>
                        🎤 VAI APENAS CANTAR? ACESSAR SALA
                    </button>
                </div>

                <div className="login-footer">
                    <small>© 2026 Pobreokê System</small>
                </div>
            </div>
        </div>
    );
}
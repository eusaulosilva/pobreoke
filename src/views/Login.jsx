import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const [carregando, setCarregando] = useState(true);

    // 1. Redirecionamento Automático: Espera o Firebase responder
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                navigate("/admin"); 
            } else {
                setCarregando(false); // Só mostra a tela de login se NÃO tiver usuário
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // 2. Atalho de Teclado: Pressionar a tecla "Esc" volta para a Home (/)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                navigate("/");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    // 3. Clique no Fundo: Clicar fora do card de login volta para a Home (/)
    const handleBackgroundClick = (e) => {
        if (e.target.classList.contains("login-page")) {
            navigate("/");
        }
    };

    const logarComGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // O próprio onAuthStateChanged vai detectar e jogar pro /admin
        } catch (error) {
            console.error("Erro ao logar:", error);
        }
    };

    // 4. Tela preta de carregamento para evitar o "flash" do card
    if (carregando) {
        return <div className="login-page loading-bg"></div>;
    }

    return (
        <div className="login-page" onClick={handleBackgroundClick}>
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

                <div className="back-container">
                    <button className="btn-back-home" onClick={() => navigate("/")}>
                        <span className="arrow">←</span> VOLTAR AO INÍCIO
                    </button>
                </div>

                <div className="login-footer">
                    <small>© 2026 Pobreokê System</small>
                </div>
            </div>
        </div>
    );
}
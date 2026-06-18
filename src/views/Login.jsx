import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = ref(db, `usuarios/${user.uid}`);
                const snapshot = await get(userRef);

                // VALIDAÇÃO DIRETA PELO BANCO DE DADOS PARA TODOS OS USUÁRIOS
                if (snapshot.exists()) {
                    const userData = snapshot.val();

                    if (userData.permitido) {
                        navigate("/admin");
                    } else {
                        await signOut(auth);
                        alert("Acesso restrito! O seu usuário não tem permissão para acessar o painel.");
                        setCarregando(false);
                    }
                } else {
                    // Se for o primeiro login, cria o registro totalmente bloqueado e sem privilégios
                    await set(userRef, {
                        nome: user.displayName || "Sem Nome",
                        email: user.email,
                        permitido: false,
                        isAdmin: false
                    });

                    await signOut(auth);
                    alert("Conta registrada com sucesso! Aguarde a aprovação do administrador para poder entrar.");
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
            console.error("Erro ao logar:", error);
            alert("Falha na conexão com o Google. Verifique a sua internet ou desative os bloqueadores de anúncios.");
        }
    };

    if (carregando) {
        return <div className="login-page loading-bg"></div>;
    }

    return (
        <div className="login-page" >
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
import React from "react";
import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();

    const logarComGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // Após o login, manda para o admin. 
            // A proteção no Admin.jsx decidirá se ele pode entrar ou não.
            navigate("/admin");
        } catch (error) {
            console.error("Erro ao logar:", error);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card shadow-lg">
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

                <div className="login-footer">
                    <small>© 2026 Pobreokê System</small>
                </div>
            </div>
        </div>
    );
}
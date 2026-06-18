import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";

export default function ProtectedRoute({ children, requerAdmin = false }) {
    const [estado, setEstado] = useState({ carregando: true, autorizado: false });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Se não estiver logado, não tem acesso
            if (!user) {
                setEstado({ carregando: false, autorizado: false });
                return;
            }

            // Vai à base de dados verificar os privilégios exatos
            const userRef = ref(db, `usuarios/${user.uid}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.val();
                let temPermissao = false;

                // Se a rota exigir ser "Super Admin", verifica a flag isAdmin
                if (requerAdmin) {
                    temPermissao = userData.isAdmin === true;
                } else {
                    // Se for apenas o painel normal do DJ, verifica se está permitido
                    temPermissao = userData.permitido === true;
                }

                setEstado({ carregando: false, autorizado: temPermissao });
            } else {
                setEstado({ carregando: false, autorizado: false });
            }
        });

        return () => unsubscribe();
    }, [requerAdmin]);

    // Enquanto verifica na base de dados, mostra um ecrã escuro
    if (estado.carregando) {
        return (
            <div style={{
                minHeight: "100vh",
                width: "100%",
                background: "#020617",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#22d3ee",
                fontFamily: "sans-serif",
                fontWeight: "bold",
                letterSpacing: "1px"
            }}>
                A VERIFICAR CREDENCIAIS...
            </div>
        );
    }

    // Se o Firebase disser que não tem permissão, recusa a entrada e manda para o início
    if (!estado.autorizado) {
        return <Navigate to="/" replace />;
    }

    // Se chegou aqui, é porque tem permissão! Renderiza a página pedida.
    return children;
}
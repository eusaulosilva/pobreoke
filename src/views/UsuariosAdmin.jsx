import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./UsuariosAdmin.css";

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Referência à lista de utilizadores no Firebase
        const usuariosRef = ref(db, "usuarios");

        const unsubscribe = onValue(usuariosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const listaUsuarios = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setUsuarios(listaUsuarios);
            } else {
                setUsuarios([]);
            }
            setCarregando(false);
        });

        return () => unsubscribe();
    }, []);

    const alternarAcesso = async (id, statusAtual) => {
        try {
            const usuarioRef = ref(db, `usuarios/${id}`);
            // Inverte o estado de acesso no banco de dados (true passa a false, e vice-versa)
            await update(usuarioRef, { permitido: !statusAtual });
        } catch (error) {
            console.error("Erro ao atualizar o acesso do utilizador:", error);
            alert("Ocorreu um erro ao atualizar o acesso. Verifica as tuas permissões.");
        }
    };

    if (carregando) {
        return <div className="admin-users-page loading-bg">A carregar utilizadores...</div>;
    }

    return (
        <div className="admin-users-page">
            <div className="admin-users-container">
                <header className="admin-users-header">
                    <button className="btn-back" onClick={() => navigate("/admin")}>
                        ← Voltar ao Painel
                    </button>
                    <h1 className="neon-text-cyan">Controlo de Acessos</h1>
                    <p>Gerir quem tem autorização para utilizar os recursos do painel</p>
                </header>

                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>E-mail</th>
                                <th>Status</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.nome || "Sem nome"}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`status-badge ${user.permitido ? "allowed" : "blocked"}`}>
                                            {user.permitido ? "Permitido" : "Bloqueado"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className={`btn-toggle-access ${user.permitido ? "btn-block" : "btn-allow"}`}
                                            onClick={() => alternarAcesso(user.id, user.permitido)}
                                        >
                                            {user.permitido ? "Revogar Acesso" : "Permitir Acesso"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="no-users">Nenhum utilizador encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
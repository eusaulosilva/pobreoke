import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./UsuariosAdmin.css";

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);

    // Estado do modal atualizado para suportar ações de confirmação
    const [modalConfig, setModalConfig] = useState({ visivel: false, titulo: "", texto: "", onConfirm: null });
    const navigate = useNavigate();

    const exibirModal = (titulo, texto, onConfirm = null) => {
        setModalConfig({ visivel: true, titulo, texto, onConfirm });
    };

    const fecharModal = () => {
        setModalConfig({ visivel: false, titulo: "", texto: "", onConfirm: null });
    };

    useEffect(() => {
        const usuariosRef = ref(db, "usuarios");
        const unsubscribe = onValue(usuariosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                let listaUsuarios = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));

                // Ordenar: Usuários com isAdmin === true ficam no topo
                listaUsuarios.sort((a, b) => {
                    if (a.isAdmin && !b.isAdmin) return -1;
                    if (!a.isAdmin && b.isAdmin) return 1;
                    return 0;
                });

                setUsuarios(listaUsuarios);
            } else {
                setUsuarios([]);
            }
            setCarregando(false);
        });

        return () => unsubscribe();
    }, []);

    const alternarAcesso = (id, statusAtual) => {
        const acao = statusAtual ? "revogar" : "permitir";

        // Exibe o modal de confirmação antes de executar
        exibirModal(
            "Confirmar Ação",
            `Tens a certeza que pretendes ${acao} o acesso deste utilizador?`,
            async () => {
                // Fecha o modal de confirmação imediatamente
                fecharModal();

                try {
                    const usuarioRef = ref(db, `usuarios/${id}`);
                    await update(usuarioRef, { permitido: !statusAtual });

                    // Exibe o modal de sucesso (sem a função onConfirm)
                    setTimeout(() => {
                        exibirModal("Sucesso", `Acesso ${!statusAtual ? 'concedido' : 'revogado'} com sucesso!`);
                    }, 300); // Pequeno atraso para suavizar a transição dos modais
                } catch (error) {
                    console.error("Erro ao atualizar o acesso:", error);
                    setTimeout(() => {
                        exibirModal("Erro", "Erro ao atualizar. Verifica as tuas permissões.");
                    }, 300);
                }
            }
        );
    };

    if (carregando) {
        return <div className="admin-users-page loading-bg">A carregar utilizadores...</div>;
    }

    return (
        <div className="admin-users-page position-relative">

            {/* MODAL COM SUPORTE A CONFIRMAÇÃO */}
            {modalConfig.visivel && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center modal-overlay-custom" style={{ zIndex: 9999 }} onClick={fecharModal}>
                    <div className="p-4 text-center d-flex flex-column align-items-center modal-content-custom" onClick={(e) => e.stopPropagation()}>
                        <h4 className="fw-bold mb-3 modal-title-custom">{modalConfig.titulo}</h4>
                        <p className="text-white mb-4 modal-text-custom">{modalConfig.texto}</p>

                        {/* Se onConfirm existir, exibe botões de Cancelar/Confirmar. Se não, exibe apenas OK */}
                        {modalConfig.onConfirm ? (
                            <div className="d-flex gap-3 w-100">
                                <button
                                    className="w-50 py-2 fw-bold border-0 btn-toggle-access btn-block m-0"
                                    onClick={fecharModal}
                                >
                                    CANCELAR
                                </button>
                                <button
                                    className="w-50 py-2 fw-bold border-0 btn-toggle-access btn-allow m-0"
                                    onClick={modalConfig.onConfirm}
                                >
                                    CONFIRMAR
                                </button>
                            </div>
                        ) : (
                            <button className="w-100 py-3 fw-bold border-0 modal-btn-custom" onClick={fecharModal}>
                                OK, ENTENDI
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="admin-users-container">
                <header className="admin-users-header">
                    <button className="btn-back" onClick={() => navigate("/admin")}>← Voltar ao Painel</button>
                    <h1 className="neon-text-cyan">Controle de Acessos</h1>
                    <p>Gerir autorizações de utilizadores</p>
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
                                        <span className={`status-badge ${user.isAdmin ? "admin-status" : (user.permitido ? "allowed" : "blocked")}`}>
                                            {user.isAdmin ? "Administrador" : (user.permitido ? "Permitido" : "Bloqueado")}
                                        </span>
                                    </td>
                                    <td>
                                        {!user.isAdmin && (
                                            <button
                                                className={`btn-toggle-access ${user.permitido ? "btn-block" : "btn-allow"}`}
                                                onClick={() => alternarAcesso(user.id, user.permitido)}
                                            >
                                                {user.permitido ? "Revogar Acesso" : "Permitir Acesso"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
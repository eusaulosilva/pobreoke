import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, remove, update } from 'firebase/database';
import { ArrowLeft, Lock, MoreVertical, Shield, ShieldOff, Trash2, UserX, UserCheck } from 'lucide-react';
import './UsuariosAdmin.css';

export default function UsuariosAdmin() {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [dropdownAberto, setDropdownAberto] = useState(null);
    const [currentUserUid, setCurrentUserUid] = useState(null);
    const [modalConfig, setModalConfig] = useState({ visivel: false, titulo: "", texto: "", onConfirm: null });

    const exibirModal = (titulo, texto, onConfirm = null) => {
        setModalConfig({ visivel: true, titulo, texto, onConfirm });
    };

    const fecharModal = () => {
        setModalConfig({ visivel: false, titulo: "", texto: "", onConfirm: null });
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserUid(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fecharDropdown = (e) => {
            if (!e.target.closest('.dropdown-container')) {
                setDropdownAberto(null);
            }
        };
        document.addEventListener('click', fecharDropdown);
        return () => document.removeEventListener('click', fecharDropdown);
    }, []);

    useEffect(() => {
        const usuariosRef = ref(db, 'usuarios');
        const unsubscribe = onValue(usuariosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const listaUsuarios = Object.keys(data).map(uid => ({
                    uid,
                    ...data[uid]
                }));

                const uidAtual = auth.currentUser?.uid;
                listaUsuarios.sort((a, b) => {
                    if (a.uid === uidAtual) return -1;
                    if (b.uid === uidAtual) return 1;
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

    const alternarAcesso = async (uid, email, statusAtual) => {
        const acao = statusAtual ? "REVOGAR" : "PERMITIR";
        exibirModal(
            "Confirmar Ação",
            `Tem a certeza que deseja ${acao} o acesso de ${email}?`,
            async () => {
                fecharModal();
                try {
                    await update(ref(db, `usuarios/${uid}`), { permitido: !statusAtual });
                    setTimeout(() => exibirModal("Sucesso", "Acesso atualizado com sucesso!"), 300);
                } catch (error) {
                    console.error("Erro ao alternar acesso:", error);
                    setTimeout(() => exibirModal("Erro", "Ocorreu um erro ao atualizar o acesso."), 300);
                }
            }
        );
    };

    const apagarConta = async (uid, email) => {
        exibirModal(
            "Apagar Conta",
            `Tem a certeza que deseja APAGAR a conta de ${email}?`,
            async () => {
                fecharModal();
                try {
                    await remove(ref(db, `usuarios/${uid}`));
                    setDropdownAberto(null);
                    setTimeout(() => exibirModal("Sucesso", "Conta apagada com sucesso!"), 300);
                } catch (error) {
                    console.error("Erro ao apagar utilizador:", error);
                    setTimeout(() => exibirModal("Erro", "Ocorreu um erro ao tentar apagar a conta."), 300);
                }
            }
        );
    };

    const tornarAdmin = async (uid, email) => {
        exibirModal(
            "Tornar Administrador",
            `Deseja promover ${email} a Administrador? Esta ação concederá privilégios totais.`,
            async () => {
                fecharModal();
                try {
                    await update(ref(db, `usuarios/${uid}`), { isAdmin: true });
                    setDropdownAberto(null);
                    setTimeout(() => exibirModal("Sucesso", "Utilizador promovido a administrador!"), 300);
                } catch (error) {
                    console.error("Erro ao promover a admin:", error);
                    setTimeout(() => exibirModal("Erro", "Ocorreu um erro ao promover o utilizador."), 300);
                }
            }
        );
    };

    const removerAdmin = async (uid, email) => {
        exibirModal(
            "Remover Administrador",
            `Deseja REMOVER os privilégios de Administrador de ${email}? Ele passará a ser um utilizador comum.`,
            async () => {
                fecharModal();
                try {
                    await update(ref(db, `usuarios/${uid}`), { isAdmin: false });
                    setDropdownAberto(null);
                    setTimeout(() => exibirModal("Sucesso", "Privilégios removidos com sucesso!"), 300);
                } catch (error) {
                    console.error("Erro ao remover admin:", error);
                    setTimeout(() => exibirModal("Erro", "Ocorreu um erro ao despromover o utilizador."), 300);
                }
            }
        );
    };

    return (
        <div className="usuarios-admin-container">

            {modalConfig.visivel && (
                <div className="modal-overlay-custom" onClick={fecharModal}>
                    <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
                        <h4 className="modal-title-custom">{modalConfig.titulo}</h4>
                        <p className="modal-text-custom">{modalConfig.texto}</p>

                        {modalConfig.onConfirm ? (
                            <div className="modal-buttons-row">
                                <button className="btn-modal-half btn-block" onClick={fecharModal}>CANCELAR</button>
                                <button className="btn-modal-half btn-allow" onClick={modalConfig.onConfirm}>CONFIRMAR</button>
                            </div>
                        ) : (
                            <button className="btn-modal-full" onClick={fecharModal}>OK, ENTENDI</button>
                        )}
                    </div>
                </div>
            )}

            <div className="background-glow"></div>

            <div className="header-actions">
                <button className="btn-voltar" onClick={() => navigate('/admin')}>
                    <ArrowLeft size={16} /> Voltar ao Painel
                </button>
            </div>

            <div className="page-header">
                <h2 className="title-neon-blue">Controle de Acessos</h2>
                <p className="subtitle-gray">Gerir autorizações e permissões do sistema</p>
            </div>

            <div className="table-wrapper">
                {carregando ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>A carregar dados...</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="usuarios-table">
                            <thead>
                                <tr>
                                    <th>NOME</th>
                                    <th>E-MAIL</th>
                                    <th>STATUS</th>
                                    <th className="align-center">AÇÃO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(user => (
                                    <tr key={user.uid} className={user.isAdmin ? 'row-admin' : 'row-normal'}>
                                        <td data-label="NOME" className="fw-bold">
                                            {user.nome || 'N/A'}
                                        </td>
                                        <td data-label="E-MAIL">{user.email}</td>
                                        <td data-label="STATUS">
                                            {user.isAdmin ? (
                                                <span className="badge-admin">
                                                    <Lock size={12} className="icon-spacing" /> ADMINISTRADOR
                                                </span>
                                            ) : (
                                                <span className={`badge-status ${user.permitido ? 'badge-permitido' : 'badge-bloqueado'}`}>
                                                    {user.permitido ? 'PERMITIDO' : 'BLOQUEADO'}
                                                </span>
                                            )}
                                        </td>
                                        <td data-label="AÇÃO" className="action-cell">
                                            {user.uid === currentUserUid ? (
                                                <span className="admin-lock-icon" title="A tua conta está protegida">
                                                    <Lock size={20} /> <span className="badge-voce">TU</span>
                                                </span>
                                            ) : (
                                                <div className="action-buttons-group">
                                                    <button
                                                        className={`btn-toggle-access ${user.permitido ? "btn-block" : "btn-allow"}`}
                                                        onClick={() => alternarAcesso(user.uid, user.email, user.permitido)}
                                                    >
                                                        {user.permitido ? <UserX size={16} /> : <UserCheck size={16} />}
                                                        <span>{user.permitido ? "Revogar" : "Permitir"}</span>
                                                    </button>

                                                    <div className="dropdown-container">
                                                        <button
                                                            className={`btn-options ${dropdownAberto === user.uid ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDropdownAberto(dropdownAberto === user.uid ? null : user.uid);
                                                            }}
                                                        >
                                                            <MoreVertical size={20} />
                                                        </button>

                                                        {dropdownAberto === user.uid && (
                                                            <div className="dropdown-menu">
                                                                {user.isAdmin ? (
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => removerAdmin(user.uid, user.email)}
                                                                    >
                                                                        <ShieldOff size={16} /> Remover Admin
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => tornarAdmin(user.uid, user.email)}
                                                                    >
                                                                        <Shield size={16} /> Tornar Admin
                                                                    </button>
                                                                )}
                                                                <div className="dropdown-divider"></div>
                                                                <button
                                                                    className="dropdown-item item-danger"
                                                                    onClick={() => apagarConta(user.uid, user.email)}
                                                                >
                                                                    <Trash2 size={16} /> Apagar Conta
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
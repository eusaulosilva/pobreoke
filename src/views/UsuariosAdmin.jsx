import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';
import { ArrowLeft, Lock } from 'lucide-react'; // Importamos o ícone Lock
import './UsuariosAdmin.css';

export default function UsuariosAdmin() {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const usuariosRef = ref(db, 'usuarios');
        const unsubscribe = onValue(usuariosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const listaUsuarios = Object.keys(data).map(uid => ({
                    uid,
                    ...data[uid]
                }));

                // Ordenação: Administradores no topo
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

    const revogarAcesso = async (uid, email) => {
        if (window.confirm(`Tem a certeza que deseja revogar o acesso de ${email}?`)) {
            try {
                await remove(ref(db, `usuarios/${uid}`));
            } catch (error) {
                console.error("Erro ao remover utilizador:", error);
                alert("Ocorreu um erro ao tentar revogar o acesso.");
            }
        }
    };

    return (
        <div className="usuarios-admin-container">
            <div className="header-actions">
                <button className="btn-voltar" onClick={() => navigate('/admin')}>
                    <ArrowLeft size={16} /> Voltar ao Painel
                </button>
            </div>

            <div className="text-center mb-5 mt-3">
                <h2 className="title-neon-blue">Controle de Acessos</h2>
                <p className="subtitle-gray">Gerir autorizações de utilizadores</p>
            </div>

            <div className="table-wrapper">
                {carregando ? (
                    <div className="text-center text-white p-5">A carregar dados...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="usuarios-table">
                            <thead>
                                <tr>
                                    <th>NOME</th>
                                    <th>E-MAIL</th>
                                    <th>STATUS</th>
                                    <th>AÇÃO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(user => (
                                    <tr key={user.uid} className={user.isAdmin ? 'row-admin' : ''}>
                                        <td data-label="NOME">{user.nome || 'N/A'}</td>
                                        <td data-label="E-MAIL">{user.email}</td>
                                        <td data-label="STATUS">
                                            {user.isAdmin ? (
                                                <span className="badge-admin">
                                                    <Lock size={12} style={{ marginRight: '5px' }} />
                                                    ADMINISTRADOR
                                                </span>
                                            ) : (
                                                <span className="badge-permitido">PERMITIDO</span>
                                            )}
                                        </td>
                                        <td data-label="AÇÃO">
                                            {user.isAdmin ? (
                                                <span className="admin-bloqueado">
                                                    <Lock size={14} /> Bloqueado
                                                </span>
                                            ) : (
                                                <button
                                                    className="btn-revogar"
                                                    onClick={() => revogarAcesso(user.uid, user.email)}
                                                >
                                                    Revogar Acesso
                                                </button>
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
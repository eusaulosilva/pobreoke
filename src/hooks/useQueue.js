import { useState, useEffect } from 'react';
import { ref, onValue, remove, update, push } from 'firebase/database';
import { db } from '../firebase';

export function useQueue(roomId) {
    const [fila, setFila] = useState([]);
    const [historico, setHistorico] = useState([]);

    // Escuta a fila da sala específica em tempo real
    useEffect(() => {
        if (!roomId) {
            setFila([]);
            setHistorico([]);
            return;
        }

        const filaRef = ref(db, `salas/${roomId}/fila`);
        const unsubscribe = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const listaGeral = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                // Fila ativa (aguardando ou iniciado) ordenada
                const filaAtiva = listaGeral
                    .filter(i => i.status === "aguardando" || i.status === "iniciado")
                    .sort((a, b) => {
                        if (a.status === "iniciado") return -1;
                        if (b.status === "iniciado") return 1;
                        return a.timestamp - b.timestamp;
                    });

                // Histórico (finalizado ou cancelado) ordenado do mais recente para o mais antigo
                const listaHistorico = listaGeral
                    .filter(i => i.status === "finalizado" || i.status === "cancelado")
                    .sort((a, b) => b.timestamp - a.timestamp);

                setFila(filaAtiva);
                setHistorico(listaHistorico);
            } else {
                setFila([]);
                setHistorico([]);
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    // Adiciona um novo pedido à fila
    const adicionarAFila = async (novoItem) => {
        if (!roomId) return;
        try {
            const filaRef = ref(db, `salas/${roomId}/fila`);
            await push(filaRef, {
                ...novoItem,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error("Erro ao adicionar à fila:", error);
        }
    };

    // Remove um pedido específico da sala
    const removerDaFila = async (idPedido) => {
        if (!roomId) return;
        try {
            const pedidoRef = ref(db, `salas/${roomId}/fila/${idPedido}`);
            await remove(pedidoRef);
        } catch (error) {
            console.error("Erro ao remover da fila:", error);
        }
    };

    // Atualiza o status de um pedido (ex: aguardando -> iniciado -> finalizado)
    const atualizarStatus = async (idPedido, novoStatus) => {
        if (!roomId) return;
        try {
            const pedidoRef = ref(db, `salas/${roomId}/fila/${idPedido}`);
            await update(pedidoRef, { status: novoStatus });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    // Atualiza o timestamp para reordenação via Drag and Drop
    const atualizarTimestamp = async (idPedido, novoTimestamp) => {
        if (!roomId) return;
        try {
            const pedidoRef = ref(db, `salas/${roomId}/fila/${idPedido}`);
            await update(pedidoRef, { timestamp: novoTimestamp });
        } catch (error) {
            console.error("Erro ao atualizar timestamp:", error);
        }
    };

    return {
        fila,
        historico,
        adicionarAFila,
        removerDaFila,
        atualizarStatus,
        atualizarTimestamp
    };
}
import { useState, useEffect } from 'react';
import { ref, onValue, remove, update, push } from 'firebase/database';
import { db } from '../firebase';
import { QUEUE_STATUS, FIREBASE_PATHS } from '../constants';

export function useQueue(roomId) {
    const [fila, setFila] = useState([]);
    const [historico, setHistorico] = useState([]);

    useEffect(() => {
        if (!roomId) {
            setFila([]);
            setHistorico([]);
            return;
        }

        const filaRef = ref(db, FIREBASE_PATHS.fila(roomId));
        const unsubscribe = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const listaGeral = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                const filaAtiva = listaGeral
                    .filter(i => i.status === QUEUE_STATUS.AGUARDANDO || i.status === QUEUE_STATUS.INICIADO)
                    .sort((a, b) => {
                        if (a.status === QUEUE_STATUS.INICIADO) return -1;
                        if (b.status === QUEUE_STATUS.INICIADO) return 1;
                        return a.timestamp - b.timestamp;
                    });

                const listaHistorico = listaGeral
                    .filter(i => i.status === QUEUE_STATUS.FINALIZADO || i.status === QUEUE_STATUS.CANCELADO)
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

    const adicionarAFila = async (novoItem) => {
        if (!roomId) return { success: false, error: "Sala não definida" };
        try {
            const filaRef = ref(db, FIREBASE_PATHS.fila(roomId));
            await push(filaRef, {
                ...novoItem,
                timestamp: Date.now()
            });
            return { success: true };
        } catch (error) {
            console.error("Erro ao adicionar à fila:", error);
            return { success: false, error };
        }
    };

    const removerDaFila = async (idPedido) => {
        if (!roomId) return { success: false, error: "Sala não definida" };
        try {
            const pedidoRef = ref(db, FIREBASE_PATHS.filaItem(roomId, idPedido));
            await remove(pedidoRef);
            return { success: true };
        } catch (error) {
            console.error("Erro ao remover da fila:", error);
            return { success: false, error };
        }
    };

    const atualizarStatus = async (idPedido, novoStatus) => {
        if (!roomId) return { success: false, error: "Sala não definida" };
        try {
            const pedidoRef = ref(db, FIREBASE_PATHS.filaItem(roomId, idPedido));
            await update(pedidoRef, { status: novoStatus });
            return { success: true };
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            return { success: false, error };
        }
    };

    const atualizarTimestamp = async (idPedido, novoTimestamp) => {
        if (!roomId) return { success: false, error: "Sala não definida" };
        try {
            const pedidoRef = ref(db, FIREBASE_PATHS.filaItem(roomId, idPedido));
            await update(pedidoRef, { timestamp: novoTimestamp });
            return { success: true };
        } catch (error) {
            console.error("Erro ao atualizar timestamp:", error);
            return { success: false, error };
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
import { useState, useEffect } from 'react';
import { ref, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase'; // Ajuste o caminho conforme o seu projeto

export function useQueue() {
    const [fila, setFila] = useState([]);

    // Escuta a fila em tempo real
    useEffect(() => {
        const filaRef = ref(db, 'fila');
        const unsubscribe = onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Converte o objeto do Firebase para um array e ordena pelo timestamp
                const filaArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => a.timestamp - b.timestamp);

                setFila(filaArray);
            } else {
                setFila([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Remove um pedido específico
    const removerDaFila = async (idPedido) => {
        try {
            const pedidoRef = ref(db, `fila/${idPedido}`);
            await remove(pedidoRef);
        } catch (error) {
            console.error("Erro ao remover da fila:", error);
        }
    };

    // Move a posição trocando o timestamp com o item vizinho
    const moverPosicao = async (indexAtual, direcao) => {
        try {
            const itemAtual = fila[indexAtual];
            let itemDestino;

            if (direcao === 'cima' && indexAtual > 0) {
                itemDestino = fila[indexAtual - 1];
            } else if (direcao === 'baixo' && indexAtual < fila.length - 1) {
                itemDestino = fila[indexAtual + 1];
            }

            if (!itemDestino) return;

            const atualRef = ref(db, `fila/${itemAtual.id}`);
            const destinoRef = ref(db, `fila/${itemDestino.id}`);

            // Inverte os timestamps para trocar a ordem
            await update(atualRef, { timestamp: itemDestino.timestamp });
            await update(destinoRef, { timestamp: itemAtual.timestamp });
        } catch (error) {
            console.error("Erro ao mover posição:", error);
        }
    };

    return { fila, removerDaFila, moverPosicao };
}
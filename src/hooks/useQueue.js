import { useState, useEffect } from 'react';
import { ref, onValue, push, remove, update } from 'firebase/database';
import { db } from '../firebase';

export function useQueue() {
    const [fila, setFila] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const filaRef = ref(db, 'fila');
        return onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data
                ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
                : [];
            // Ordena por ordem de chegada
            setFila(lista.sort((a, b) => a.timestamp - b.timestamp));
            setLoading(false);
        });
    }, []);

    const adicionarPedido = (dados) => push(ref(db, 'fila'), {
        ...dados,
        status: 'aguardando',
        timestamp: Date.now()
    });

    const removerPedido = (id) => remove(ref(db, `fila/${id}`));

    const atualizarStatus = (id, status) => update(ref(db, `fila/${id}`), { status });

    return { fila, loading, adicionarPedido, removerPedido, atualizarStatus };
}
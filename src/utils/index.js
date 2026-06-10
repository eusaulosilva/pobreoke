import { useMemo } from 'react';

export const validators = {
    validarNome: (nome) => nome && nome.trim().length > 1,
    validarMusica: (musica) => musica && musica.trim().length > 1,
    validarCodigo: (codigo) => codigo && codigo.trim().length >= 3 && codigo.trim().length <= 6
};

const NAMESPACE = "pobreoke_";
export const secureStorage = {
    get: (key) => localStorage.getItem(`${NAMESPACE}${key}`),
    set: (key, value) => localStorage.setItem(`${NAMESPACE}${key}`, value),
    remove: (key) => localStorage.removeItem(`${NAMESPACE}${key}`)
};

export const useSalaId = (roomId) => {
    return useMemo(() => {
        return roomId ? roomId.trim().toUpperCase() : null;
    }, [roomId]);
};
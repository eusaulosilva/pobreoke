/** @type {Object<string, string>} */
export const QUEUE_STATUS = {
    AGUARDANDO: "aguardando",
    INICIADO: "iniciado",
    FINALIZADO: "finalizado",
    CANCELADO: "cancelado"
};

/** @type {Object<string, function|string>} */
export const FIREBASE_PATHS = {
    sala: (roomId) => `salas/${roomId}`,
    configuracao: (roomId) => `salas/${roomId}/configuracao`,
    filaFechada: (roomId) => `salas/${roomId}/configuracao/filaFechada`,
    fila: (roomId) => `salas/${roomId}/fila`,
    filaItem: (roomId, itemId) => `salas/${roomId}/fila/${itemId}`,
    adminUser: (uid) => `admins/${uid}`,
    adminSalas: (uid) => `admins/${uid}/salas`
};
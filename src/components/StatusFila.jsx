import React from 'react';
import './StatusFila.css';

const StatusFila = ({ posicao }) => {
    if (!posicao || posicao <= 0) return null;

    return (
        <div className="status-fila-root">
            <div className="status-indicator">
                <span className="dot-blink"></span>
                <span className="label">Sua posição na fila</span>
            </div>
            <div className="posicao-valor">
                {posicao}º
            </div>
        </div>
    );
};

export default StatusFila;
import React from 'react';
import { Play, X } from 'lucide-react';
import './ItemFila.css';

export default function ItemFila({ item, index, chamarParaPalco, removerDaFila, isRecorrente }) {
    const isCurrentlyPlaying = item.status === "iniciado";

    return (
        <div className={`admin-neon-card ${isCurrentlyPlaying ? 'active' : ''} ${isRecorrente ? 'is-recorrente' : ''}`}>
            <div className="card-content">
                <div className="name-wrapper">
                    <span className={`index ${isRecorrente ? 'texto-amarelo' : ''}`}>#{index + 1}</span>
                    <h4 className="singer-title">
                        {item.nome} {isCurrentlyPlaying && "🎤"}
                    </h4>
                </div>
                <p className="song-subtitle">{item.musica}</p>
            </div>

            <div className="admin-controls-btns">
                <button
                    className={`btn-play-neon ${isRecorrente ? 'botao-amarelo' : ''}`}
                    onClick={() => chamarParaPalco(item)}
                    disabled={isCurrentlyPlaying} /* BLOQUEIA O BOTÃO QUANDO ESTIVER CANTANDO */
                >
                    <Play size={14} fill="currentColor" /> PLAY
                </button>
                <button className="btn-x-neon" onClick={() => removerDaFila(item.id)}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
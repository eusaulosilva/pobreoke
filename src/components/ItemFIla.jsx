export default function ItemFila({ item, index, chamarParaPalco, removerDaFila }) {
    const isCurrentlyPlaying = item.status === "iniciado";

    return (
        <div
            className={`queue-item ${isCurrentlyPlaying ? 'playing' : ''}`}
            style={{ borderColor: isCurrentlyPlaying ? "var(--neon-pink)" : "var(--neon-cyan)" }}
        >
            <div className="queue-info">
                <div className="name-wrapper">
                    <span className="index">#{index + 1}</span>
                    <h4 className="singer-name">
                        {item.nome} {isCurrentlyPlaying && <span className="mic-icon">🎤</span>}
                    </h4>
                </div>
                <p className="song-name">{item.musica}</p>
            </div>

            <div className="admin-controls">
                <button className="btn-play" onClick={() => chamarParaPalco(item)}>PLAY</button>
                <button className="btn-remove" onClick={() => removerDaFila(item.id)}>X</button>
            </div>
        </div>
    );
}
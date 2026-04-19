// src/components/Header.jsx
export default function Header({ noPalco }) {
    return (
        <div className="now-playing">
            <span className="label">No Palco Agora 🎤</span>
            <div className="info-wrapper">
                <h1 className="singer-now">{noPalco.nome}</h1>
                <p className="song-now">{noPalco.musica}</p>
            </div>
        </div>
    );
}
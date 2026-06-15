import React, { useState, useEffect } from "react";

export default function Formulario({
    nome, setNome, musica, setMusica, adicionarAFila,
    bloqueado, filaFechada, latSala, lngSala
}) {
    const [statusLocalizacao, setStatusLocalizacao] = useState("verificando");
    const [erroGeo, setErroGeo] = useState("");

    const RAIO_MAXIMO_METROS = 250;

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const rad = Math.PI / 180;
        const dLat = (lat2 - lat1) * rad;
        const dLon = (lon2 - lon1) * rad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!latSala || !lngSala) {
            setStatusLocalizacao("verificando");
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const distancia = calcularDistancia(latitude, longitude, latSala, lngSala);

                    if (distancia <= RAIO_MAXIMO_METROS) {
                        setStatusLocalizacao("permitido");
                        setErroGeo("");
                    } else {
                        setStatusLocalizacao("bloqueado");
                        setErroGeo(`Você está muito longe (${Math.round(distancia)}m da sala). Vá até o local.`);
                    }
                },
                (error) => {
                    setStatusLocalizacao("bloqueado");
                    setErroGeo("Permita o acesso à localização para pedir música.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            setStatusLocalizacao("bloqueado");
            setErroGeo("Geolocalização não suportada no seu dispositivo.");
        }
    }, [latSala, lngSala]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (statusLocalizacao === "permitido") {
            adicionarAFila(e);
        }
    };

    return (
        <div className="card shadow-lg">
            <h2>Quero Cantar</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Seu Nome</label>
                    <input
                        type="text"
                        placeholder="Ex: Saulo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        disabled={bloqueado || filaFechada || statusLocalizacao !== "permitido"}
                    />
                </div>
                <div className="input-group">
                    <label>Música / Artista</label>
                    <input
                        type="text"
                        placeholder="Ex: Evidências - Chitãozinho"
                        value={musica}
                        onChange={(e) => setMusica(e.target.value)}
                        required
                        disabled={bloqueado || filaFechada || statusLocalizacao !== "permitido"}
                    />
                </div>

                {erroGeo && <div style={{ color: "#ff4d4d", marginBottom: "10px", fontWeight: "bold" }}>{erroGeo}</div>}

                <button
                    type="submit"
                    className="btn-add w-100"
                    disabled={bloqueado || filaFechada || statusLocalizacao !== "permitido"}
                >
                    {statusLocalizacao === "verificando"
                        ? "OBTENDO LOCALIZAÇÃO..."
                        : filaFechada
                            ? "FILA FECHADA PELO DJ"
                            : bloqueado
                                ? "VOCÊ JÁ ESTÁ NA FILA"
                                : statusLocalizacao === "bloqueado"
                                    ? "BLOQUEADO PELO GPS"
                                    : "ENTRAR NA FILA"
                    }
                </button>
            </form>
        </div>
    );
}
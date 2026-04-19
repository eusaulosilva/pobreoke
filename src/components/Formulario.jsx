export default function Formulario({ nome, setNome, musica, setMusica, adicionarAFila, bloqueado }) {
    return (
        <div className="card shadow-lg">
            <h2>Quero Cantar</h2>
            <form onSubmit={adicionarAFila}>
                <div className="input-group">
                    <label>Seu Nome</label>
                    <input
                        type="text"
                        placeholder="Ex: Saulo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        disabled={bloqueado}
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
                        disabled={bloqueado}
                    />
                </div>
                <button
                    type="submit"
                    className="btn-add w-100"
                    disabled={bloqueado}
                    style={{ opacity: bloqueado ? 0.5 : 1 }}
                >
                    {bloqueado ? "VOCÊ JÁ ESTÁ NA FILA" : "ENTRAR NA FILA"}
                </button>
            </form>
        </div>
    );
}
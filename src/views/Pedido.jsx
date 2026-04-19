import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";
import Header from "../components/Header";
import Formulario from "../components/Formulario";
import ListaFila from "../components/ListaFila";
import "./Pedido.css";

export default function Pedido() {
    const [fila, setFila] = useState([]);
    const [nome, setNome] = useState("");
    const [musica, setMusica] = useState("");
    const [uid, setUid] = useState("");
    const [noPalco, setNoPalco] = useState({ nome: "Aguardando...", musica: "..." });

    useEffect(() => {
        // Identificação única do aparelho
        let savedUid = localStorage.getItem("pobreoke_uid");
        if (!savedUid) {
            savedUid = "V-" + Math.random().toString(36).substr(2, 5).toUpperCase();
            localStorage.setItem("pobreoke_uid", savedUid);
        }
        setUid(savedUid);

        // Lendo a fila global
        const filaRef = ref(db, "fila");
        return onValue(filaRef, (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
            setFila(lista);
        });
    }, []);

    useEffect(() => {
        const cantando = fila.find(item => item.status === "iniciado");
        setNoPalco(cantando ?
            { nome: cantando.nome, musica: cantando.musica } :
            { nome: "Aguardando...", musica: "Escolha uma música" }
        );
    }, [fila]);

    const bloqueado = fila.some(
        (item) => item.uid === uid && (item.status === "aguardando" || item.status === "iniciado")
    );

    const adicionarAFila = (e) => {
        e.preventDefault();
        if (bloqueado) return alert("Você já está na fila!");

        push(ref(db, "fila"), {
            uid,
            nome,
            musica,
            status: "aguardando",
            timestamp: Date.now()
        });
        setMusica("");
    };

    return (
        <div className="container-fluid py-4 d-flex justify-content-center">
            <div className="app-main-container">
                <Header noPalco={noPalco} />
                <Formulario
                    nome={nome} setNome={setNome}
                    musica={musica} setMusica={setMusica}
                    adicionarAFila={adicionarAFila}
                    bloqueado={bloqueado}
                />
                <div className="mt-4">
                    <ListaFila fila={fila} />
                </div>
            </div>
        </div>
    );
}
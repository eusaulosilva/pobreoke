import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import "./DisplayQR.css"; 

export default function DisplayQR() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomExists, setRoomExists] = useState(null);
    const [carregando, setCarregando] = useState(true);

    const linkPedido = `${window.location.origin}/sala/${roomId?.toUpperCase()}`;

    useEffect(() => {
        if (!roomId) {
            setRoomExists(false);
            setCarregando(false);
            return;
        }

        const roomRef = ref(db, `salas/${roomId.toUpperCase()}`);

        const unsub = onValue(roomRef, (snapshot) => {
            setRoomExists(snapshot.exists());
            setCarregando(false);
        });

        return () => unsub();
    }, [roomId]);

    if (carregando) {
        return <div className="display-qr-wrapper loading-bg"></div>;
    }

    if (!roomExists) {
        return (
            <div className="display-qr-wrapper">
                <h1 className="status-neon-cyan">POBREOKÊ</h1>
                <div className="qr-glass-card">
                    <h4 className="text-neon-pink mb-3">📺 Sala Não Encontrada</h4>
                    <p className="mb-4 text-white">
                        A cantoria acabou ou esta sala não existe.<br />
                        Verifique o código e tente novamente.
                    </p>
                    <button className="btn-status-action" onClick={() => navigate("/")}>
                        VOLTAR AO INÍCIO
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="display-qr-wrapper">
            
            
            <div className="qr-glass-card shadow-lg">
                <h1  className="qr-title ">ESCANEIE PARA CANTAR</h1>
                
                <div className="qr-code-container">
                    <QRCodeSVG 
                        value={linkPedido} 
                        size={280} 
                        bgColor={"#ffffff"} 
                        fgColor={"#020617"} 
                        level={"H"} 
                        includeMargin={false}
                    />
                </div>
                
                <p className="qr-footer-text">
                    Aponte a câmera do celular para pedir sua <span>música!</span>
                </p>
            </div>

            
        </div>
    );
}
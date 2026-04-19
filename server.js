const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Permite que o frontend acesse essa API
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
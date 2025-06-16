const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const ARQUIVO_JSON = path.join(__dirname, 'dados', 'consumo.json');

// Endpoint para obter dados de consumo dentro da tabela
app.get('/consumo', (req, res) => {
    fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler dados.' });
        try {
            const json = JSON.parse(data || '[]');
            res.json(json);
        } catch (e) {
            res.status(500).json({ error: 'Erro ao processar JSON.' });
        }
    });
});

// Endpoint para adicionar novo consumo a tabela
app.post('/adicionar-consumo', (req, res) => {
    fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
        const lista = err ? [] : JSON.parse(data || '[]');
        const novoItem = req.body;
        novoItem.id = Date.now();
        lista.push(novoItem);

        fs.writeFile(ARQUIVO_JSON, JSON.stringify(lista, null, 2), err => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        });
    });
});

// Endpoint para excluir quando adicionar item errado
app.delete('/consumo/:id', (req, res) => {
    fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false });

        let lista = JSON.parse(data || '[]');
        const novaLista = lista.filter(item => item.id != req.params.id);

        fs.writeFile(ARQUIVO_JSON, JSON.stringify(novaLista, null, 2), err => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

const USUARIOS_JSON = path.join(__dirname, 'dados', 'usuarios.json');

app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  fs.readFile(USUARIOS_JSON, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao acessar base de usuários.' });
    
    const usuarios = JSON.parse(data || '[]');
    const encontrado = usuarios.find(u => u.usuario === usuario && u.senha === senha);

    if (encontrado) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
  });
});

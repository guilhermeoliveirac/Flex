// server.js

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Session middleware
app.use(session({
  secret: 'sua_chave_secreta_aqui',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 3600000 } // 1 hora
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Autenticação: força login para páginas e APIs
app.use((req, res, next) => {
  // Permitir acesso ao login e recursos públicos
  const publicPaths = ['/login', '/login.html', '/usuarios.json', '/style.css', '/script.js', '/registro.html', '/valores.html', '/index.html'];
  if (publicPaths.includes(req.path) || req.path.startsWith('/consumo') && req.method === 'GET' && req.session.authenticated) {
    return next();
  }
  // Endpoints restritos
  if (req.session.authenticated) {
    return next();
  }
  // Se não autenticado, redireciona para login
  if (req.accepts('html')) {
    return res.redirect('/login.html');
  } else {
    return res.status(401).json({ success: false, message: 'Não autenticado.' });
  }
});

// Servir arquivos estáticos após middleware de autenticação
app.use(express.static(path.join(__dirname, 'public')));

const ARQUIVO_JSON = path.join(__dirname, 'dados', 'consumo.json');
const USUARIOS_JSON = path.join(__dirname, 'dados', 'usuarios.json');

// Login
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  fs.readFile(USUARIOS_JSON, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao acessar usuários.' });
    const usuarios = JSON.parse(data || '[]');
    const encontrado = usuarios.find(u => u.usuario === usuario && u.senha === senha);
    if (encontrado) {
      req.session.authenticated = true;
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
  });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Obter consumos
app.get('/consumo', (req, res) => {
  fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao ler dados.' });
    try {
      const lista = JSON.parse(data || '[]');
      res.json(lista);
    } catch {
      res.status(500).json({ error: 'JSON inválido.' });
    }
  });
});

// Adicionar consumo
app.post('/adicionar-consumo', (req, res) => {
  fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
    const lista = err ? [] : JSON.parse(data || '[]');
    const novo = req.body;
    novo.id = Date.now();
    lista.push(novo);
    fs.writeFile(ARQUIVO_JSON, JSON.stringify(lista, null, 2), err => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
  });
});

// Excluir consumo
app.delete('/consumo/:id', (req, res) => {
  fs.readFile(ARQUIVO_JSON, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ success: false });
    const lista = JSON.parse(data || '[]');
    const nova = lista.filter(i => i.id != req.params.id);
    fs.writeFile(ARQUIVO_JSON, JSON.stringify(nova, null, 2), err => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
  });
});

// Inicia servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

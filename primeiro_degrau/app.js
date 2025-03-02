// Importar dependências
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Configuração básica
const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua-chave-secreta'; // Use uma chave secreta segura em produção

// Middleware
app.use(bodyParser.json());

// Simulação de base de dados para produtos
let produtos = [
  { id: 1, nome: 'Produto A', preco: 100.0, qtdEstoque: 10, estaDisponivel: true },
  { id: 2, nome: 'Produto B', preco: 200.0, qtdEstoque: 0, estaDisponivel: false },
  { id: 3, nome: 'Produto C', preco: 150.0, qtdEstoque: 5, estaDisponivel: true }
];

// Simulação de armazenamento de tokens inválidos
const invalidatedTokens = new Set();

// Middleware para autenticação
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ mensagem: 'Token não fornecido.' });

  if (invalidatedTokens.has(token)) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido.' });
    req.user = user;
    next();
  });
}

// Endpoint para gerar token
app.post('/login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ mensagem: 'Nome de usuário é obrigatório.' });
  }
  
  // Token expira em 1 hora
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Endpoint para deslogar (invalidar token)
app.post('/logout', autenticarToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  invalidatedTokens.add(token);
  res.json({ mensagem: 'Logout realizado com sucesso.' });
});

// Endpoint para obter produtos (com suporte a query param "id")
app.get('/produtos', autenticarToken, (req, res) => {
  const { id } = req.query;

  if (id) {
    const produto = produtos.find(p => p.id === parseInt(id));
    if (!produto) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }
    return res.json(produto);
  }

  res.json(produtos);
});

// Endpoint para adicionar um novo produto
app.post('/produtos', autenticarToken, (req, res) => {
  const { nome, preco, qtdEstoque, estaDisponivel } = req.body;

  if (preco < 0) {
    return res.status(400).json({ mensagem: 'O preço não pode ser menor que zero.' });
  }

  if (produtos.some(produto => produto.nome === nome)) {
    return res.status(400).json({ mensagem: 'Já existe um produto com este nome.' });
  }

  const novoProduto = {
    id: produtos.length ? produtos[produtos.length - 1].id + 1 : 1,
    nome,
    preco,
    qtdEstoque,
    estaDisponivel
  };

  produtos.push(novoProduto);
  res.status(201).json(novoProduto);
});

// Endpoint para atualizar um produto
app.put('/produtos/:id', autenticarToken, (req, res) => {
  const { id } = req.params;
  const { nome, preco, qtdEstoque, estaDisponivel } = req.body;

  const produtoIndex = produtos.findIndex(produto => produto.id === parseInt(id));

  if (produtoIndex === -1) {
    return res.status(404).json({ mensagem: 'Produto não encontrado.' });
  }

  if (preco < 0) {
    return res.status(400).json({ mensagem: 'O preço não pode ser menor que zero.' });
  }

  if (nome && produtos.some(produto => produto.nome === nome && produto.id !== parseInt(id))) {
    return res.status(400).json({ mensagem: 'Já existe um produto com este nome.' });
  }

  produtos[produtoIndex] = {
    ...produtos[produtoIndex],
    nome: nome || produtos[produtoIndex].nome,
    preco: preco !== undefined ? preco : produtos[produtoIndex].preco,
    qtdEstoque: qtdEstoque !== undefined ? qtdEstoque : produtos[produtoIndex].qtdEstoque,
    estaDisponivel: estaDisponivel !== undefined ? estaDisponivel : produtos[produtoIndex].estaDisponivel
  };

  res.json(produtos[produtoIndex]);
});

// Endpoint para excluir um produto
app.delete('/produtos/:id', autenticarToken, (req, res) => {
  const { id } = req.params;
  const produtoIndex = produtos.findIndex(produto => produto.id === parseInt(id));

  if (produtoIndex === -1) {
    return res.status(404).json({ mensagem: 'Produto não encontrado.' });
  }

  produtos.splice(produtoIndex, 1);
  res.json({ mensagem: 'Produto excluído com sucesso.' });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

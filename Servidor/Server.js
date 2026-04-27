const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use(cors());

let db;
const DB_NAME = './topfrango.db';
const BACKUP_DIR = path.join(__dirname, 'backups');

// ==========================================
//    FUNÇÕES DE BACKUP (LÓGICA)
// ==========================================

const realizarBackup = () => {
    const agora = new Date();
    const dataFmt = agora.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const nomeArquivo = `backup-topfrango-${dataFmt}.sqlite`;
    const destino = path.join(BACKUP_DIR, nomeArquivo);

    fs.copyFile(DB_NAME, destino, (err) => {
        if (err) {
            console.error("❌ Erro ao criar backup:", err);
        } else {
            console.log(`💾 Backup realizado com sucesso: ${nomeArquivo}`);
            limparBackupsAntigos();
        }
    });
};

const limparBackupsAntigos = () => {
    fs.readdir(BACKUP_DIR, (err, arquivos) => {
        if (err) return;
        if (arquivos.length > 7) {
            const arquivosOrdenados = arquivos.sort();
            fs.unlink(path.join(BACKUP_DIR, arquivosOrdenados[0]), (err) => {
                if (!err) console.log("🗑️ Backup antigo removido para otimizar espaço.");
            });
        }
    });
};

// ==========================================
//    INICIALIZAÇÃO DO BANCO (NORMALIZADO)
// ==========================================

(async () => {
    db = await open({
        filename: DB_NAME,
        driver: sqlite3.Database
    });

    // Ativa o suporte a Chaves Estrangeiras (FK) no SQLite (Boas Práticas)
    await db.exec('PRAGMA foreign_keys = ON;');

    await db.exec(`
        -- 1. Tabela de Usuários
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            login TEXT UNIQUE,
            senha TEXT,
            nivel TEXT
        );

        -- 2. Tabela de Clientes (2FN: Entidade Separada)
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT
        );

        -- 3. Tabela de Produtos
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            qtd REAL DEFAULT 0,
            vCompra REAL NOT NULL,
            vVenda REAL NOT NULL,
            vKG REAL,
            unidade TEXT NOT NULL
        );

        -- 4. Tabela de Vendas (FKs aplicadas corretamente)
        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            usuario_id INTEGER,
            total REAL NOT NULL,
            pagamento TEXT,
            status TEXT,
            data TEXT,
            data_pagamento TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

        -- 5. Tabela de Itens da Venda (1FN: Sem listas em campos)
        CREATE TABLE IF NOT EXISTS itens_venda (
            venda_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade REAL NOT NULL,
            preco_unitario REAL NOT NULL, -- 3FN: Mantém o valor histórico
            subtotal REAL NOT NULL,
            PRIMARY KEY (venda_id, produto_id),
            FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        );

        -- 6. Tabela de Sangrias (Vinculada ao Usuário)
        CREATE TABLE IF NOT EXISTS sangrias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            valor REAL NOT NULL,
            motivo TEXT NOT NULL,
            data TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

        -- 7. Tabela de Batimentos (Vinculada ao Usuário)
        CREATE TABLE IF NOT EXISTS batimentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            data TEXT,
            turno TEXT,
            valor_sistema REAL,
            valor_fisico REAL,
            pix REAL,
            cartao REAL,
            diferenca REAL,
            status TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );
    `);

    const qtdUsuarios = await db.get('SELECT COUNT(*) as count FROM usuarios');
    if (qtdUsuarios.count === 0) {
        console.log("⚠️ Nenhum usuário encontrado. Criando Administrador padrão...");
        await db.run(
            "INSERT INTO usuarios (nome, login, senha, nivel) VALUES ('Administrador', 'admin', 'admin123', 'admin')"
        );
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR);
    }

    console.log("✅ Banco de Dados Normalizado Pronto.");
    console.log("🔄 Executando backup de segurança de inicialização...");
    realizarBackup();
})();

cron.schedule('0 15 * * *', () => {
    console.log("⏰ Horário agendado (15:00). Iniciando backup diário...");
    realizarBackup();
});

// ==========================================
//             ROTAS DO SISTEMA
// ==========================================

app.get('/api/backup/download', (req, res) => {
    res.download(DB_NAME, 'backup-manual-topfrango.sqlite');
});

// ================= Vendas (REFORMULADO) =================
app.post('/api/vendas', async (req, res) => {
    // FRONT-END AGORA PRECISA MANDAR: cliente_nome, usuario_id e um ARRAY de itens
    const { cliente_nome, usuario_id, total, pagamento, status, data, itensArray } = req.body;
    
    const data_pedido = data || new Date().toLocaleString('pt-BR'); 
    const data_pag = status === 'Pago' ? data_pedido : null; 

    try {
        await db.run('BEGIN TRANSACTION'); // Garante que tudo salva ou nada salva

        // 🌟 NOVIDADE (2FN): Auto-cadastro do Cliente
        let idDoCliente = null;
        if (cliente_nome && cliente_nome.trim() !== '') {
            const resultCliente = await db.run('INSERT INTO clientes (nome) VALUES (?)', [cliente_nome]);
            idDoCliente = resultCliente.lastID; 
        }

        // 1. Insere a venda com a referência do cliente correto
        const resultVenda = await db.run(
            'INSERT INTO vendas (cliente_id, usuario_id, total, pagamento, status, data, data_pagamento) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [idDoCliente, usuario_id || 1, total, pagamento, status, data_pedido, data_pag]
        );
        const vendaId = resultVenda.lastID;

        // 2. Insere os itens um por um (1FN Aplicada)
        if (itensArray && itensArray.length > 0) {
            for (let item of itensArray) {
                await db.run(
                    'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
                );
                // Já dá baixa no estoque aqui mesmo!
                await db.run('UPDATE produtos SET qtd = qtd - ? WHERE id = ?', [item.quantidade, item.produto_id]);
            }
        }

        await db.run('COMMIT');
        res.status(201).json({ message: "Venda salva com sucesso no modelo normalizado!" });
    } catch (e) { 
        await db.run('ROLLBACK');
        console.error("Erro na venda:", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// Busca as vendas e junta com os itens (JOIN)
app.get('/api/vendas', async (req, res) => {
    try {
        const vendas = await db.all(`
            SELECT v.*, c.nome as nome_cliente, u.nome as nome_vendedor 
            FROM vendas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            ORDER BY v.id DESC
        `);

        // Busca os itens de cada venda para remontar o objeto para o React
        for (let venda of vendas) {
            const itens = await db.all(`
                SELECT iv.*, p.nome as produto_nome 
                FROM itens_venda iv
                JOIN produtos p ON iv.produto_id = p.id
                WHERE iv.venda_id = ?
            `, [venda.id]);
            venda.itens = itens;
        }

        res.json(vendas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/vendas/:id', async (req, res) => {
    // ... (A lógica de atualizar status para Pago continua a mesma)
    const { status, pagamento } = req.body;
    const { id } = req.params;
    try {
        if (status === 'Pago') {
            const momentoPagamento = new Date().toLocaleString('pt-BR');
            await db.run('UPDATE vendas SET status = ?, pagamento = ?, data_pagamento = ? WHERE id = ?', [status, pagamento, momentoPagamento, id]);
        } else {
            await db.run('UPDATE vendas SET status = ?, pagamento = ?, data_pagamento = NULL WHERE id = ?', [status, pagamento, id]);
        }
        res.json({ message: "Pedido atualizado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// A rota de remover item ficou BEM mais simples com banco normalizado!
app.delete('/api/vendas/:venda_id/remover-item/:produto_id', async (req, res) => {
    const { venda_id, produto_id } = req.params; 
    try {
        // 1. Pega a quantidade do item para devolver ao estoque
        const item = await db.get('SELECT quantidade, subtotal FROM itens_venda WHERE venda_id = ? AND produto_id = ?', [venda_id, produto_id]);
        if(!item) return res.status(404).json({ error: "Item não encontrado." });

        // 2. Remove o item e atualiza estoque e total da venda
        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM itens_venda WHERE venda_id = ? AND produto_id = ?', [venda_id, produto_id]);
        await db.run('UPDATE produtos SET qtd = qtd + ? WHERE id = ?', [item.quantidade, produto_id]);
        await db.run('UPDATE vendas SET total = total - ? WHERE id = ?', [item.subtotal, venda_id]);
        
        // Se a venda ficou sem itens, apaga a venda inteira
        const itensRestantes = await db.get('SELECT COUNT(*) as count FROM itens_venda WHERE venda_id = ?', [venda_id]);
        if(itensRestantes.count === 0) {
            await db.run('DELETE FROM vendas WHERE id = ?', [venda_id]);
        }

        await db.run('COMMIT');
        res.json({ message: "Item removido e recalculado perfeitamente!" });
    } catch (e) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

// ================= Clientes (NOVO - 2FN) =================
app.get('/api/clientes', async (req, res) => {
    const clientes = await db.all('SELECT * FROM clientes ORDER BY nome ASC');
    res.json(clientes);
});

app.post('/api/clientes', async (req, res) => {
    const { nome, telefone } = req.body;
    try {
        await db.run('INSERT INTO clientes (nome, telefone) VALUES (?, ?)', [nome, telefone]);
        res.status(201).json({ message: "Cliente cadastrado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// ================= Produtos =================
app.get('/api/produtos', async (req, res) => {
    const produtos = await db.all('SELECT * FROM produtos ORDER BY nome ASC');
    res.json(produtos);
});

app.post('/api/produtos', async (req, res) => {
    const { nome, qtd, vCompra, vVenda, vKG, unidade } = req.body;
    try {
        await db.run(
            'INSERT INTO produtos (nome, qtd, vCompra, vVenda, vKG, unidade) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, qtd, vCompra, vVenda, vKG, unidade]
        );
        res.status(201).json({ message: "Produto cadastrado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
    const { nome, qtd, vCompra, vVenda, vKG, unidade } = req.body;
    try {
        await db.run(
            'UPDATE produtos SET nome = ?, qtd = ?, vCompra = ?, vVenda = ?, vKG = ?, unidade = ? WHERE id = ?',
            [nome, qtd, vCompra, vVenda, vKG, unidade, req.params.id]
        );
        res.json({ message: "Produto atualizado com sucesso!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
    await db.run('DELETE FROM produtos WHERE id = ?', req.params.id);
    res.json({ message: "Produto removido!" });
});

// ================= Sangrias e Batimentos (AGORA PEDEM usuario_id) =================
// Resumido para caber perfeitamente no padrão, mas mantendo a lógica de FK
app.post('/api/sangrias', async (req, res) => {
    const { usuario_id, valor, motivo, data } = req.body;
    const data_sangria = data || new Date().toLocaleString('pt-BR');
    try {
        await db.run('INSERT INTO sangrias (usuario_id, valor, motivo, data) VALUES (?, ?, ?, ?)', [usuario_id || 1, valor, motivo, data_sangria]);
        res.status(201).json({ message: "Sangria salva!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/batimentos', async (req, res) => {
    const { usuario_id, data, turno, valor_sistema, valor_fisico, pix, cartao, diferenca, status } = req.body;
    try {
        await db.run(
            'INSERT INTO batimentos (usuario_id, data, turno, valor_sistema, valor_fisico, pix, cartao, diferenca, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [usuario_id || 1, data, turno, valor_sistema, valor_fisico, pix, cartao, diferenca, status]
        );
        res.status(201).json({ message: "Batimento salvo!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= ROTAS DE USUÁRIOS =================
app.get('/api/usuarios', async (req, res) => {
    const usuarios = await db.all('SELECT id, nome, login, nivel FROM usuarios ORDER BY nome ASC');
    res.json(usuarios);
});

app.listen(5000, () => console.log("🚀 Servidor TopFrango Normalizado rodando na porta 5000"));
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

(async () => {
    db = await open({
        filename: DB_NAME,
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            login TEXT UNIQUE,
            senha TEXT,
            nivel TEXT
        );

        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT
        );

        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            qtd REAL DEFAULT 0,
            vCompra REAL NOT NULL,
            vVenda REAL NOT NULL,
            vKG REAL,
            unidade TEXT NOT NULL
        );

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

        CREATE TABLE IF NOT EXISTS itens_venda (
            venda_id INTEGER NOT NULL,
            produto_id INTEGER NOT NULL,
            quantidade REAL NOT NULL,
            preco_unitario REAL NOT NULL,
            subtotal REAL NOT NULL,
            PRIMARY KEY (venda_id, produto_id),
            FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        );

        CREATE TABLE IF NOT EXISTS sangrias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            valor REAL NOT NULL,
            motivo TEXT NOT NULL,
            data TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

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

        CREATE TABLE IF NOT EXISTS aberturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            valor REAL NOT NULL,
            data TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );
    `);

    // ==============================================================
    // ATUALIZAÇÃO AUTOMÁTICA DA TABELA DE VENDAS
    // ==============================================================
    const colunasVendas = await db.all("PRAGMA table_info(vendas)");
    const nomesColunasVendas = colunasVendas.map(c => c.name);

    if (!nomesColunasVendas.includes('endereco')) {
        await db.exec("ALTER TABLE vendas ADD COLUMN endereco TEXT;");
    }
    if (!nomesColunasVendas.includes('telefone_entrega')) {
        await db.exec("ALTER TABLE vendas ADD COLUMN telefone_entrega TEXT;");
    }
    if (!nomesColunasVendas.includes('lat')) {
        await db.exec("ALTER TABLE vendas ADD COLUMN lat REAL;");
    }
    if (!nomesColunasVendas.includes('lng')) {
        await db.exec("ALTER TABLE vendas ADD COLUMN lng REAL;");
    }
    // ==============================================================

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
    realizarBackup();
})();

cron.schedule('0 15 * * *', () => {
    realizarBackup();
});

app.get('/api/backup/download', (req, res) => {
    res.download(DB_NAME, 'backup-manual-topfrango.sqlite');
});

// ==========================================
// ROTAS DE ABERTURA DE CAIXA
// ==========================================

app.get('/api/aberturas', async (req, res) => {
    try {
        const aberturas = await db.all('SELECT * FROM aberturas ORDER BY id DESC');
        res.json(aberturas);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/aberturas', async (req, res) => {
    const { usuario_id, valor, data } = req.body;
    const data_abertura = data || new Date().toLocaleString('pt-BR');
    
    try {
        await db.run('INSERT INTO aberturas (usuario_id, valor, data) VALUES (?, ?, ?)', [usuario_id || 1, valor, data_abertura]);
        res.status(201).json({ message: "Abertura salva com sucesso!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// ROTA CORRIGIDA: SALVAR VENDA COM CLIENTE_ID E TELEFONE
// ==========================================
app.post('/api/vendas', async (req, res) => {
    // Agora capturamos o cliente_id e a variável telefone também!
    const { cliente_id, cliente_nome, cliente_telefone, telefone, usuario_id, total, pagamento, status, data, itensArray } = req.body;
    
    const data_pedido = data || new Date().toLocaleString('pt-BR'); 
    const data_pag = status === 'Pago' ? data_pedido : null; 

    try {
        await db.run('BEGIN TRANSACTION');

        let idDoCliente = cliente_id || null;
        let telefoneFinal = cliente_telefone || telefone || null;

        // Se o front enviou nome/telefone soltos, mas não enviou o ID, criamos um cliente novo
        if (!idDoCliente && ((cliente_nome && cliente_nome.trim() !== '') || (telefoneFinal && telefoneFinal.trim() !== ''))) {
            const nomeParaSalvar = cliente_nome || 'Cliente Fiado';
            
            const resultCliente = await db.run(
                'INSERT INTO clientes (nome, telefone) VALUES (?, ?)', 
                [nomeParaSalvar, telefoneFinal]
            );
            idDoCliente = resultCliente.lastID; 
        }

        // Salvamos também o "telefone_entrega" para garantir que o número fique preso no pedido
        const resultVenda = await db.run(
            'INSERT INTO vendas (cliente_id, usuario_id, total, pagamento, status, data, data_pagamento, telefone_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [idDoCliente, usuario_id || 1, total, pagamento, status, data_pedido, data_pag, telefoneFinal]
        );
        const vendaId = resultVenda.lastID;

        if (itensArray && itensArray.length > 0) {
            for (let item of itensArray) {
                await db.run(
                    'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
                );
                await db.run('UPDATE produtos SET qtd = qtd - ? WHERE id = ?', [item.quantidade, item.produto_id]);
            }
        }

        await db.run('COMMIT');
        res.status(201).json({ message: "Venda salva com sucesso!" });
    } catch (e) { 
        await db.run('ROLLBACK');
        res.status(500).json({ error: e.message }); 
    }
});

// BUSCAR VENDAS (Já estava certo, mas agora tem dados pra puxar)
app.get('/api/vendas', async (req, res) => {
    try {
        const vendas = await db.all(`
            SELECT v.*, c.nome as nome_cliente, COALESCE(v.telefone_entrega, c.telefone) as telefone, u.nome as nome_vendedor 
            FROM vendas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            ORDER BY v.id DESC
        `);

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
    const { status, pagamento, endereco, telefone, lat, lng } = req.body;
    const { id } = req.params;
    try {
        const atual = await db.get('SELECT * FROM vendas WHERE id = ?', [id]);
        if (!atual) return res.status(404).json({ error: "Pedido não encontrado" });

        const novoEndereco = endereco !== undefined ? endereco : atual.endereco;
        const novoTelefone = telefone !== undefined ? telefone : atual.telefone_entrega;
        const novaLat = lat !== undefined ? lat : atual.lat;
        const novaLng = lng !== undefined ? lng : atual.lng;

        if (status === 'Pago') {
            const momentoPagamento = new Date().toLocaleString('pt-BR');
            await db.run(
                'UPDATE vendas SET status = ?, pagamento = ?, data_pagamento = ?, endereco = ?, telefone_entrega = ?, lat = ?, lng = ? WHERE id = ?', 
                [status, pagamento, momentoPagamento, novoEndereco, novoTelefone, novaLat, novaLng, id]
            );
        } else {
            await db.run(
                'UPDATE vendas SET status = ?, pagamento = ?, endereco = ?, telefone_entrega = ?, lat = ?, lng = ? WHERE id = ?', 
                [status, pagamento, novoEndereco, novoTelefone, novaLat, novaLng, id]
            );
        }
        res.json({ message: "Pedido atualizado com sucesso!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/vendas/:id/rota', async (req, res) => {
    const { endereco, telefone, lat, lng } = req.body;
    const { id } = req.params;
    try {
        await db.run(
            'UPDATE vendas SET endereco = ?, telefone_entrega = ?, lat = ?, lng = ? WHERE id = ?', 
            [endereco, telefone, lat, lng, id]
        );
        res.json({ message: "Rota salva provisoriamente!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/vendas/:venda_id/remover-item/:produto_id', async (req, res) => {
    const { venda_id, produto_id } = req.params; 
    try {
        const item = await db.get('SELECT quantidade, subtotal FROM itens_venda WHERE venda_id = ? AND produto_id = ?', [venda_id, produto_id]);
        if(!item) return res.status(404).json({ error: "Item não encontrado." });

        await db.run('BEGIN TRANSACTION');
        await db.run('DELETE FROM itens_venda WHERE venda_id = ? AND produto_id = ?', [venda_id, produto_id]);
        await db.run('UPDATE produtos SET qtd = qtd + ? WHERE id = ?', [item.quantidade, produto_id]);
        await db.run('UPDATE vendas SET total = total - ? WHERE id = ?', [item.subtotal, venda_id]);
        
        const itensRestantes = await db.get('SELECT COUNT(*) as count FROM itens_venda WHERE venda_id = ?', [venda_id]);
        if(itensRestantes.count === 0) {
            await db.run('DELETE FROM vendas WHERE id = ?', [venda_id]);
        }

        await db.run('COMMIT');
        res.json({ message: "Item removido e recalculado!" });
    } catch (e) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

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
        res.json({ message: "Produto atualizado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        await db.run('PRAGMA foreign_keys = OFF'); 
        await db.run('DELETE FROM produtos WHERE id = ?', req.params.id);
        await db.run('PRAGMA foreign_keys = ON'); 
        res.json({ message: "Produto removido com sucesso!" });
    } catch (e) {
        await db.run('PRAGMA foreign_keys = ON'); 
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sangrias', async (req, res) => {
    try {
        const sangrias = await db.all('SELECT * FROM sangrias ORDER BY id DESC');
        res.json(sangrias);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sangrias', async (req, res) => {
    const { usuario_id, valor, motivo, data } = req.body;
    const data_sangria = data || new Date().toLocaleString('pt-BR');
    const motivo_seguro = motivo || "Retirada de Caixa"; 

    try {
        await db.run('INSERT INTO sangrias (usuario_id, valor, motivo, data) VALUES (?, ?, ?, ?)', [usuario_id || 1, valor, motivo_seguro, data_sangria]);
        res.status(201).json({ message: "Sangria salva!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/batimentos', async (req, res) => {
    try {
        const batimentos = await db.all('SELECT * FROM batimentos ORDER BY id DESC');
        res.json(batimentos);
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

app.get('/api/usuarios', async (req, res) => {
    const usuarios = await db.all('SELECT id, nome, login, nivel FROM usuarios ORDER BY nome ASC');
    res.json(usuarios);
});

app.post('/api/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const user = await db.get('SELECT id, nome, nivel FROM usuarios WHERE login = ? AND senha = ?', [usuario, senha]);
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { novoNome, novoLogin, novaSenha, novoNivel, loginGerente, senhaGerente } = req.body;
    try {
        const admin = await db.get('SELECT id FROM usuarios WHERE login = ? AND senha = ? AND nivel = ?', [loginGerente, senhaGerente, 'admin']);
        if (!admin) {
            return res.status(403).json({ error: 'Autorização de gerente inválida ou sem permissão.' });
        }

        const existe = await db.get('SELECT id FROM usuarios WHERE login = ?', [novoLogin]);
        if (existe) {
            return res.status(400).json({ error: 'Este login já está em uso.' });
        }

        await db.run('INSERT INTO usuarios (nome, login, senha, nivel) VALUES (?, ?, ?, ?)', [novoNome, novoLogin, novaSenha, novoNivel]);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}); 

app.put('/api/usuarios/:id', async (req, res) => {
    const { novoNome, novoLogin, novaSenha, novoNivel, loginGerente, senhaGerente } = req.body;
    try {
        const admin = await db.get('SELECT id FROM usuarios WHERE login = ? AND senha = ? AND nivel = ?', [loginGerente, senhaGerente, 'admin']);
        if (!admin) {
            return res.status(403).json({ error: 'Autorização de gerente inválida ou sem permissão.' });
        }

        if (novaSenha && novaSenha.trim() !== '') {
            await db.run('UPDATE usuarios SET nome = ?, login = ?, senha = ?, nivel = ? WHERE id = ?', 
                [novoNome, novoLogin, novaSenha, novoNivel, req.params.id]);
        } else {
            await db.run('UPDATE usuarios SET nome = ?, login = ?, nivel = ? WHERE id = ?', 
                [novoNome, novoLogin, novoNivel, req.params.id]);
        }
        
        res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    const { loginGerente, senhaGerente } = req.body;
    try {
        const admin = await db.get('SELECT id FROM usuarios WHERE login = ? AND senha = ? AND nivel = ?', [loginGerente, senhaGerente, 'admin']);
        if (!admin) {
            return res.status(403).json({ error: 'Autorização de gerente inválida para exclusão.' });
        }

        const qtdAdmins = await db.get("SELECT COUNT(*) as count FROM usuarios WHERE nivel = 'admin'");
        const usuarioAlvo = await db.get("SELECT nivel FROM usuarios WHERE id = ?", [req.params.id]);
        
        if (usuarioAlvo.nivel === 'admin' && qtdAdmins.count <= 1) {
            return res.status(400).json({ error: 'Você não pode excluir o único administrador do sistema!' });
        }

        await db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        res.json({ message: 'Usuário removido com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(5000, () => console.log("🚀 Servidor TopFrango Normalizado rodando na porta 5000"));
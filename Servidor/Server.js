const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ==========================================
// 1. INICIALIZAÇÃO DO SENTRY (DEVE VIR ANTES DO EXPRESS)
// ==========================================
const instrumentPath = path.join(process.cwd(), 'instrument.js');
if (fs.existsSync(instrumentPath)) {
    require(instrumentPath);
}
const Sentry = require("@sentry/node"); // Sentry carregado antes!

// ==========================================
// 2. IMPORTAÇÕES RESTANTES
// ==========================================
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use(cors());

let db;

// Garante que o banco seja criado na pasta real do Windows onde o .exe está sendo executado
const DB_NAME = path.join(process.cwd(), 'topfrango.db');

const obterCaminhoDrive = () => {
    const letras = ['G', 'H', 'I', 'D', 'E', 'F'];
    for (let letra of letras) {
        const caminhoBase = `${letra}:/Meu Drive`;
        if (fs.existsSync(caminhoBase)) {
            return `${caminhoBase}/Backups_TopFrango`;
        }
    }
    // Plano B: se o Google Drive não estiver rodando no PC, salva na mesma pasta do .exe
   return path.join(process.cwd(), 'Backups_Emergencia');
};

const BACKUP_DIR = obterCaminhoDrive();

const realizarBackup = () => {
    // Garante que a pasta de backup exista
    if (!fs.existsSync(BACKUP_DIR)) {
        try {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        } catch (err) {
            console.error("❌ Erro ao criar a pasta de backup:", err);
            return;
        }
    }

    const agora = new Date();
    const dataFmt = agora.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const nomeArquivo = `backup-topfrango-${dataFmt}.sqlite`;
    const destino = path.join(BACKUP_DIR, nomeArquivo);

    fs.copyFile(DB_NAME, destino, (err) => {
        if (err) {
            console.error("❌ Erro ao criar backup:", err);
            Sentry.captureException(err); // Avisa se der erro
        } else {
            console.log(`💾 Backup salvo com sucesso: ${destino}`);
            limparBackupsAntigos();
        }
    });
};

const limparBackupsAntigos = () => {
    fs.readdir(BACKUP_DIR, (err, arquivos) => {
        if (err) return;
        
        // Filtra só os arquivos de backup para não apagar nada errado
        const backups = arquivos.filter(f => f.startsWith('backup-topfrango'));
        
        // Mantém apenas os 10 últimos backups
        if (backups.length > 10) {
            const arquivosOrdenados = backups.sort(); 
            const quantosApagar = backups.length - 10;
            
            for (let i = 0; i < quantosApagar; i++) {
                fs.unlink(path.join(BACKUP_DIR, arquivosOrdenados[i]), (err) => {
                    if (!err) console.log(`🗑️ Backup antigo removido para otimizar espaço: ${arquivosOrdenados[i]}`);
                });
            }
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
            dinheiro REAL DEFAULT 0,
            pix REAL DEFAULT 0,
            cartao REAL DEFAULT 0,
            fiado REAL DEFAULT 0,
            status TEXT,
            data TEXT,
            data_pagamento TEXT,
            endereco TEXT,
            telefone_entrega TEXT,
            lat REAL,
            lng REAL,
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

    const colunasVendas = await db.all("PRAGMA table_info(vendas)");
    const nomesColunasVendas = colunasVendas.map(c => c.name);

    if (!nomesColunasVendas.includes('endereco')) await db.exec("ALTER TABLE vendas ADD COLUMN endereco TEXT;");
    if (!nomesColunasVendas.includes('telefone_entrega')) await db.exec("ALTER TABLE vendas ADD COLUMN telefone_entrega TEXT;");
    if (!nomesColunasVendas.includes('lat')) await db.exec("ALTER TABLE vendas ADD COLUMN lat REAL;");
    if (!nomesColunasVendas.includes('lng')) await db.exec("ALTER TABLE vendas ADD COLUMN lng REAL;");
    
    if (!nomesColunasVendas.includes('dinheiro')) await db.exec("ALTER TABLE vendas ADD COLUMN dinheiro REAL DEFAULT 0;");
    if (!nomesColunasVendas.includes('pix')) await db.exec("ALTER TABLE vendas ADD COLUMN pix REAL DEFAULT 0;");
    if (!nomesColunasVendas.includes('cartao')) await db.exec("ALTER TABLE vendas ADD COLUMN cartao REAL DEFAULT 0;");
    
    // Atualizações para gestão de Fiado e Taxa de Cartão
    if (!nomesColunasVendas.includes('fiado')) await db.exec("ALTER TABLE vendas ADD COLUMN fiado REAL DEFAULT 0;");
    if (!nomesColunasVendas.includes('taxa_cartao')) await db.exec("ALTER TABLE vendas ADD COLUMN taxa_cartao REAL DEFAULT 0;");
    
    // Novas colunas para suportar Modalidade e Parcelas do Cartão
    if (!nomesColunasVendas.includes('modalidade_cartao')) await db.exec("ALTER TABLE vendas ADD COLUMN modalidade_cartao TEXT;");
    if (!nomesColunasVendas.includes('parcelas_cartao')) await db.exec("ALTER TABLE vendas ADD COLUMN parcelas_cartao INTEGER;");

    // --- VERIFICAÇÃO PARA ATUALIZAR A TABELA DE PRODUTOS COM O LOTE ---
    const colunasProdutos = await db.all("PRAGMA table_info(produtos)");
    const nomesColunasProdutos = colunasProdutos.map(c => c.name);
    if (!nomesColunasProdutos.includes('isLote')) {
        await db.exec("ALTER TABLE produtos ADD COLUMN isLote INTEGER DEFAULT 0;");
    }

    const qtdUsuarios = await db.get('SELECT COUNT(*) as count FROM usuarios');
    if (qtdUsuarios.count === 0) {
        console.log("⚠️ Nenhum usuário encontrado. Criando Administrador padrão...");
        await db.run(
            "INSERT INTO usuarios (nome, login, senha, nivel) VALUES ('Administrador', 'admin', 'admin123', 'admin')"
        );
    }

    console.log("✅ Banco de Dados Normalizado Pronto.");
    
    // Faz um backup imediato assim que o servidor liga
    realizarBackup();
})();

// ==========================================
// MUDANÇA NO AGENDAMENTO: A CADA 1 HORA
// ==========================================
cron.schedule('0 * * * *', () => {
    console.log("⏰ Realizando backup agendado (A cada 1 hora)...");
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
// ROTAS DE VENDAS
// ==========================================
app.post('/api/vendas', async (req, res) => {
    const { cliente_id, cliente_nome, cliente_telefone, telefone, usuario_id, total, pagamento, dinheiro, pix, cartao, taxa_cartao, fiado, status, data, itensArray, modalidade_cartao, parcelas_cartao } = req.body;
    
    const data_pedido = data || new Date().toLocaleString('pt-BR'); 
    const data_pag = status === 'Pago' ? data_pedido : null; 

    // Pega os valores passados pelo frontend (se não vier nada, zera)
    const cartaoLiquido = Number(cartao || 0);
    const valorTaxaCartao = Number(taxa_cartao || 0);

    try {
        await db.run('BEGIN TRANSACTION');

        let idDoCliente = cliente_id || null;
        let telefoneFinal = cliente_telefone || telefone || null;

        if (!idDoCliente && ((cliente_nome && cliente_nome.trim() !== '') || (telefoneFinal && telefoneFinal.trim() !== ''))) {
            const nomeParaSalvar = cliente_nome || 'Cliente Fiado';
            
            const resultCliente = await db.run(
                'INSERT INTO clientes (nome, telefone) VALUES (?, ?)', 
                [nomeParaSalvar, telefoneFinal]
            );
            idDoCliente = resultCliente.lastID; 
        }

        // Salvando cartaoLiquido, valorTaxaCartao, modalidade_cartao e parcelas_cartao no banco
        const resultVenda = await db.run(
            'INSERT INTO vendas (cliente_id, usuario_id, total, pagamento, dinheiro, pix, cartao, taxa_cartao, modalidade_cartao, parcelas_cartao, fiado, status, data, data_pagamento, telefone_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [idDoCliente, usuario_id || 1, total, pagamento, dinheiro || 0, pix || 0, cartaoLiquido, valorTaxaCartao, modalidade_cartao || null, parcelas_cartao || null, fiado || 0, status, data_pedido, data_pag, telefoneFinal]
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
        // CORREÇÃO DO ROLLBACK AQUI: Tenta reverter a transação, ignora se não tiver transação aberta.
        try { await db.run('ROLLBACK'); } catch (err) {} 
        console.error("❌ Erro ao salvar venda:", e); // Mostra o erro real no console
        Sentry.captureException(e); // Envia o erro real pro Sentry
        res.status(500).json({ error: e.message }); 
    }
});

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

// ==========================================
// ROTA TDD - SIMULAR DESCONTO
// ==========================================
app.post('/api/vendas/simular-desconto', (req, res) => {
    const { precoVenda, precoCusto, percentualDesconto } = req.body;
    
    if (percentualDesconto < 0) {
        return res.status(400).json({ error: 'Percentual inválido.' });
    }

    const valorDesconto = precoVenda * (percentualDesconto / 100);
    const precoFinal = precoVenda - valorDesconto;

    if (precoFinal < precoCusto) {
        return res.status(400).json({ error: 'Desconto não permitido: O valor final geraria prejuízo.' });
    }

    res.json({ precoFinal: Number(precoFinal.toFixed(2)) });
});

// ==========================================
// ROTA DE ATUALIZAÇÃO (CORRIGIDA - TRAVA MAIS INTELIGENTE)
// ==========================================
app.put('/api/vendas/:id', async (req, res) => {
    const { status, pagamento, dinheiro, pix, cartao, taxa_cartao, endereco, telefone, lat, lng, modalidade_cartao, parcelas_cartao } = req.body;
    const { id } = req.params;
    try {
        const atual = await db.get('SELECT * FROM vendas WHERE id = ?', [id]);
        if (!atual) return res.status(404).json({ error: "Pedido não encontrado" });

        const novoEndereco = endereco !== undefined ? endereco : atual.endereco;
        const novoTelefone = telefone !== undefined ? telefone : atual.telefone_entrega;
        const novaLat = lat !== undefined ? lat : atual.lat;
        const novaLng = lng !== undefined ? lng : atual.lng;

        // Recupera os valores enviados do frontend, ou mantém os atuais
        const novoDinheiro = dinheiro !== undefined ? Number(dinheiro) : Number(atual.dinheiro || 0);
        const novoPix = pix !== undefined ? Number(pix) : Number(atual.pix || 0);
        
        let novoCartao = cartao !== undefined ? Number(cartao) : Number(atual.cartao || 0);
        let novaTaxaCartao = taxa_cartao !== undefined ? Number(taxa_cartao) : Number(atual.taxa_cartao || 0);
        let novaModalidadeCartao = modalidade_cartao !== undefined ? modalidade_cartao : atual.modalidade_cartao;
        let novasParcelasCartao = parcelas_cartao !== undefined ? parcelas_cartao : atual.parcelas_cartao;

        // MATEMÁTICA INFALÍVEL: O fiado restante soma a taxa para saber que o cliente quitou o bruto
        const novoFiado = Math.max(0, Number(atual.total) - (novoDinheiro + novoPix + novoCartao + novaTaxaCartao));

        // NOVA TRAVA DE SEGURANÇA: Respeita os status de entrega!
        let statusFinal = status !== undefined ? status : atual.status;
        
        // Só barra/altera o status se a intenção for realmente finalizar como financeiro
        if (statusFinal === 'Pago' && novoFiado > 0) {
            statusFinal = 'Pendente'; // Tentou botar Pago mas falta dinheiro
        } else if (statusFinal === 'Pendente' && novoFiado <= 0) {
            statusFinal = 'Pago'; // Pagou tudo, então força ser Pago
        }

        // Controle inteligente da data de pagamento
        let novaDataPagamento = atual.data_pagamento;
        if (statusFinal === 'Pago' && !atual.data_pagamento) {
            novaDataPagamento = new Date().toLocaleString('pt-BR'); 
        } else if (statusFinal === 'Pendente') {
            novaDataPagamento = null; 
        }

        // Salva tudo de forma consistente no banco de dados
        await db.run(
            `UPDATE vendas SET 
                status = ?, pagamento = ?, dinheiro = ?, pix = ?, cartao = ?, taxa_cartao = ?, modalidade_cartao = ?, parcelas_cartao = ?, fiado = ?, 
                data_pagamento = ?, endereco = ?, telefone_entrega = ?, lat = ?, lng = ? 
             WHERE id = ?`, 
            [statusFinal, pagamento, novoDinheiro, novoPix, novoCartao, novaTaxaCartao, novaModalidadeCartao, novasParcelasCartao, novoFiado, novaDataPagamento, novoEndereco, novoTelefone, novaLat, novaLng, id]
        );

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
        // CORREÇÃO DO ROLLBACK AQUI TAMBÉM
        try { await db.run('ROLLBACK'); } catch (err) {} 
        Sentry.captureException(e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// ROTAS DE CLIENTES
// ==========================================
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

// ==========================================
// ROTAS DE PRODUTOS
// ==========================================
app.get('/api/produtos', async (req, res) => {
    const produtos = await db.all('SELECT * FROM produtos ORDER BY nome ASC');
    res.json(produtos);
});

app.post('/api/produtos', async (req, res) => {
    const { nome, qtd, vCompra, vVenda, vKG, unidade, isLote } = req.body;
    const loteNum = isLote ? 1 : 0; 

    try {
        // TRAVA DE UNICIDADE (RI-4): Verifica se o nome já existe
        const existe = await db.get('SELECT id FROM produtos WHERE nome = ?', [nome]);
        if (existe) {
            return res.status(400).json({ error: 'Já existe um produto com este nome cadastrado.' });
        }

        await db.run(
            'INSERT INTO produtos (nome, qtd, vCompra, vVenda, vKG, unidade, isLote) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, qtd, vCompra, vVenda, vKG, unidade, loteNum]
        );
        res.status(201).json({ message: "Produto cadastrado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
    const { nome, qtd, vCompra, vVenda, vKG, unidade, isLote } = req.body;
    const loteNum = isLote ? 1 : 0;

    try {
        // TRAVA DE UNICIDADE NA EDIÇÃO: Verifica se OUTRO produto já usa esse nome
        const existe = await db.get('SELECT id FROM produtos WHERE nome = ? AND id != ?', [nome, req.params.id]);
        if (existe) {
            return res.status(400).json({ error: 'Já existe outro produto usando este nome.' });
        }

        await db.run(
            'UPDATE produtos SET nome = ?, qtd = ?, vCompra = ?, vVenda = ?, vKG = ?, unidade = ?, isLote = ? WHERE id = ?',
            [nome, qtd, vCompra, vVenda, vKG, unidade, loteNum, req.params.id]
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

// ==========================================
// ROTAS DE SANGRIAS E BATIMENTOS
// ==========================================
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

// ==========================================
// ROTAS DE USUÁRIOS
// ==========================================
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

app.use(express.static(path.join(process.cwd(), 'build')));

app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'build', 'index.html'));
    }
    next();
});

// ==========================================
// TESTE DE OBSERVABILIDADE - SENTRY
// ==========================================
app.get("/debug-sentry", (req, res) => {
  throw new Error("Falha Proativa: teste de telemetria IFCE!");
});

Sentry.setupExpressErrorHandler(app);

// ==========================================
if (require.main === module) {
    app.listen(5000, () => console.log("🚀 Servidor TopFrango Normalizado rodando na porta 5000"));

    exec('start http://localhost:5000');
}
module.exports = app;
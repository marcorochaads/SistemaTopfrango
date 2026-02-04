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
    // Gera nome com data e hora para evitar conflitos se abrir o sistema várias vezes
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
        // Mantém apenas os últimos 7 arquivos para não lotar o HD
        if (arquivos.length > 7) {
            const arquivosOrdenados = arquivos.sort();
            fs.unlink(path.join(BACKUP_DIR, arquivosOrdenados[0]), (err) => {
                if (!err) console.log("🗑️ Backup antigo removido para otimizar espaço.");
            });
        }
    });
};

// ==========================================
//    INICIALIZAÇÃO DO BANCO E BACKUP INICIAL
// ==========================================

(async () => {
    db = await open({
        filename: DB_NAME,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT,
            total REAL,
            pagamento TEXT,
            status TEXT,
            itens TEXT,
            data TEXT
        );
        CREATE TABLE IF NOT EXISTS sangrias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            valor REAL,
            motivo TEXT,
            data TEXT
        );
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            qtd REAL,
            vCompra REAL,
            vVenda REAL,
            vKG REAL,
            unidade TEXT
        );
    `);

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR);
    }

    console.log("✅ Banco de Dados Pronto.");

    // --- ESTRATÉGIA DE SEGURANÇA 1: BACKUP AO INICIAR ---
    // Como a loja desliga o PC à noite, garantimos o backup assim que o sistema liga de manhã.
    console.log("🔄 Executando backup de segurança de inicialização...");
    realizarBackup();
})();

// --- ESTRATÉGIA DE SEGURANÇA 2: BACKUP ÀS 15:00 ---
// Agenda para rodar todo dia às 3 da tarde, horário que a loja está certamente aberta.
cron.schedule('0 15 * * *', () => {
    console.log("⏰ Horário agendado (15:00). Iniciando backup diário...");
    realizarBackup();
});

// ==========================================
//             ROTAS DO SISTEMA
// ==========================================

// Rota para download manual
app.get('/api/backup/download', (req, res) => {
    res.download(DB_NAME, 'backup-manual-topfrango.sqlite');
});

// Vendas
app.post('/api/vendas', async (req, res) => {
    const { cliente, total, pagamento, status, itens } = req.body;
    const data = new Date().toLocaleString('pt-BR');
    try {
        await db.run(
            'INSERT INTO vendas (cliente, total, pagamento, status, itens, data) VALUES (?, ?, ?, ?, ?, ?)', 
            [cliente, total, pagamento, status, itens, data]
        );
        res.status(201).json({ message: "Venda salva!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendas', async (req, res) => {
    const vendas = await db.all('SELECT * FROM vendas ORDER BY id DESC');
    res.json(vendas);
});

app.put('/api/vendas/:id', async (req, res) => {
    const { status, pagamento } = req.body;
    const { id } = req.params;
    try {
        await db.run('UPDATE vendas SET status = ?, pagamento = ? WHERE id = ?', [status, pagamento, id]);
        res.json({ message: "Pedido atualizado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Produtos
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

app.put('/api/produtos/:id/baixa', async (req, res) => {
    const { quantidade } = req.body;
    const { id } = req.params;
    try {
        const resultado = await db.run(
            'UPDATE produtos SET qtd = qtd - ? WHERE id = ? AND qtd >= ?', 
            [quantidade, id, quantidade]
        );
        if (resultado.changes === 0) return res.status(400).json({ error: "Estoque insuficiente!" });
        res.json({ message: "Estoque atualizado!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
    await db.run('DELETE FROM produtos WHERE id = ?', req.params.id);
    res.json({ message: "Produto removido!" });
});

// Sangrias
app.post('/api/sangrias', async (req, res) => {
    const { valor, motivo } = req.body;
    const data = new Date().toLocaleString('pt-BR');
    try {
        await db.run('INSERT INTO sangrias (valor, motivo, data) VALUES (?, ?, ?)', [valor, motivo, data]);
        res.status(201).json({ message: "Sangria salva!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sangrias', async (req, res) => {
    const sangrias = await db.all('SELECT * FROM sangrias ORDER BY id DESC');
    res.json(sangrias);
});

app.listen(5000, () => console.log("🚀 Servidor TopFrango rodando na porta 5000"));
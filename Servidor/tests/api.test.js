const request = require('supertest');
const app = require('../Server'); // Ajuste o caminho se o seu arquivo de teste estiver em outra pasta

describe("Testes Funcionais - API TopFrango", () => {
    
    // TESTE 1: Verificar a rota de Produtos (Listagem - GET)
    it("Teste 1: Deve retornar status 200 e uma lista ao buscar produtos", async () => {
        const response = await request(app).get('/api/produtos');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 2: Verificar a segurança do Login (Falha Proposital - POST)
    it("Teste 2: Deve bloquear o login e retornar 401 com credenciais inválidas", async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ usuario: 'hacker_invasor', senha: 'senha_errada_123' });
        
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('error');
    });

    // TESTE 3: Verificar a rota de Clientes (Listagem - GET)
    it("Teste 3: Deve retornar status 200 e uma lista ao buscar clientes", async () => {
        const response = await request(app).get('/api/clientes');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 4: Verificar a rota de Histórico de Vendas (Listagem - GET)
    it("Teste 4: Deve retornar status 200 e buscar todas as vendas", async () => {
        const response = await request(app).get('/api/vendas');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 5: Verificar o cadastro de clientes (criação - POST)
    it("Teste 5: Deve cadastrar um novo cliente com dados válidos e retornar status 201", async () => {
        const novoCliente = {
            nome: "Cliente de Teste IFCE",
            telefone: "88999999999"
        };

        const response = await request(app)
            .post('/api/clientes')
            .send(novoCliente);
        
        // Verifica se a API retornou "Criado" (201) e se mandou a mensagem certa
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('message', 'Cliente cadastrado!');
    });

});
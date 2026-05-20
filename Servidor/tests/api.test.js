const request = require('supertest');
const app = require('../Server'); 
describe("Testes Funcionais - API TopFrango", () => {
    
    // TESTE 1: Verificar se a rota de produtos está funcionando
    it("Teste 1: Deve retornar status 200 e uma lista ao buscar produtos", async () => {
        const response = await request(app).get('/api/produtos');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 2: Verificar a segurança do Login
    it("Teste 2: Deve bloquear o login e retornar 401 com credenciais inválidas", async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ usuario: 'hacker_invasor', senha: 'senha_errada_123' });
        
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('error');
    });

    // TESTE 3: Verificar a rota de Clientes
    it("Teste 3: Deve retornar status 200 e uma lista ao buscar clientes", async () => {
        const response = await request(app).get('/api/clientes');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 4: Verificar a rota de Histórico de Vendas
    it("Teste 4: Deve retornar status 200 e buscar todas as vendas", async () => {
        const response = await request(app).get('/api/vendas');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 5: Verificar a rota de Usuários
    it("Teste 5: Deve retornar status 200 e a lista de usuários do sistema", async () => {
        const response = await request(app).get('/api/usuarios');
        
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

});
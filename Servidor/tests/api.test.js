const request = require('supertest');
const app = require('../Server'); // Puxa o servidor para testar

describe("✅ Testes Funcionais - API TopFrango", () => {
    
    // TESTE 1: Verificar se a rota de produtos está funcionando
    it("Teste 1: Deve retornar status 200 e uma lista ao buscar produtos", async () => {
        const response = await request(app).get('/api/produtos');
        
        // Esperamos que o servidor responda com OK (200)
        expect(response.statusCode).toBe(200);
        // Esperamos que o resultado seja um Array (uma lista)
        expect(Array.isArray(response.body)).toBeTruthy();
    });

    // TESTE 2: Verificar a segurança do Login
    it("Teste 2: Deve bloquear o login e retornar 401 com credenciais inválidas", async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ usuario: 'hacker_invasor', senha: 'senha_errada_123' });
        
        // Esperamos que o servidor bloqueie (401 Unauthorized)
        expect(response.statusCode).toBe(401);
        // Esperamos que a API retorne uma mensagem de erro
        expect(response.body).toHaveProperty('error');
    });

});
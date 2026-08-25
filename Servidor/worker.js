const amqp = require('amqplib');


const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const FILA = 'fila_processamento_pesado';

async function iniciarWorker() {
    try {
        console.log("⏳ Aguardando RabbitMQ iniciar...");
        const conexao = await amqp.connect(RABBITMQ_URL);
        const canal = await conexao.createChannel();

        
        await canal.assertQueue(FILA, { durable: true });
        
        
        canal.prefetch(1);

        console.log(`✅ Worker conectado! Aguardando mensagens na fila: ${FILA}`);

        canal.consume(FILA, async (mensagem) => {
            if (mensagem !== null) {
                const dados = JSON.parse(mensagem.content.toString());
                console.log(`\n📥 [Worker] Recebeu tarefa de ${dados.usuario}:`, dados.tarefa);

                // Simula um processamento pesado (10 segundos)
                setTimeout(() => {
                    console.log(`✅ [Worker] Tarefa concluída para o pedido ID: ${dados.id}`);
                    

                    canal.ack(mensagem);
                }, 10000); 
            }
        }, { 
            noAck: false
        });

    } catch (erro) {
        console.error("❌ Erro no Worker:", erro);
        // Tenta reconectar após 5 segundos se o RabbitMQ ainda não estiver pronto
        setTimeout(iniciarWorker, 5000);
    }
}

iniciarWorker();
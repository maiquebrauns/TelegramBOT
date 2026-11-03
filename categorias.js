// ==========================================
// CONFIGURAÇÃO DAS CATEGORIAS DE OFERTAS
// ==========================================
// - id: Identificador único da categoria
// - nome: Nome exibido no Telegram / Logs
// - chatId: ID do grupo/canal do Telegram exclusivo para essa categoria (ex: "-1001234567890").
//           Se deixar vazio ou omitir, usará o canal padrão configurado no seu Cloudflare Worker!
// - ativa: true para rodar, false para pausar
// - url: Link da categoria de ofertas no Mercado Livre
// - palavrasChave: Termos para filtrar no título (deixe [] vazio para aceitar tudo)

module.exports = [
    {
        id: "tech",
        nome: "Tecnologia & Informática",
        chatId: "@promotudobr", // Cole o ID do grupo de Tech aqui (ex: "-1001234567890")
        ativa: true,
        url: "https://www.mercadolivre.com.br/ofertas?category=MLB1000",
        palavrasChave: [
            'notebook', 'smartphone', 'celular', 'tv', 'smart', 'monitor', 'mouse',
            'teclado', 'headset', 'fone', 'ssd', 'placa', 'processador', 'memória',
            'memoria', 'gamer', 'tablet', 'impressora', 'apple', 'samsung', 'xiaomi', 'motorola'
        ]
    },
    {
        id: "games",
        nome: "Games & Consoles",
        chatId: "@promotudogames", // Cole o ID do grupo de Games aqui
        ativa: true,
        url: "https://www.mercadolivre.com.br/ofertas?category=MLB1144",
        palavrasChave: [
            'ps5', 'playstation', 'xbox', 'nintendo', 'switch', 'game', 'jogos',
            'controle', 'dualsense', 'headset', 'gamer', 'cadeira gamer', 'console'
        ]
    },
    {
        id: "casa",
        nome: "Casa & Eletrodomésticos",
        chatId: "@promotudoeletro", // Cole o ID do grupo de Casa aqui
        ativa: true,
        url: "https://www.mercadolivre.com.br/ofertas?category=MLB1574",
        palavrasChave: [
            'airfryer', 'aspirador', 'cafeteira', 'geladeira', 'microondas', 'liquidificador',
            'panela', 'batedeira', 'ventilador', 'ar condicionado', 'robô aspirador', 'purificador'
        ]
    },
    {
        id: "ferramentas",
        nome: "Ferramentas & Construção",
        chatId: "@promotudoferramentas", // Cole o ID do grupo de Ferramentas aqui
        ativa: false,
        url: "https://www.mercadolivre.com.br/ofertas?category=MLB1500",
        palavrasChave: [
            'furadeira', 'parafusadeira', 'serra', 'esmerilhadeira', 'bosch', 'dewalt', 'makita', 'maleta', 'trena'
        ]
    }
];

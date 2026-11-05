// ==========================================
// CONFIGURAÇÃO DAS CATEGORIAS DE OFERTAS
// ==========================================
// - id: Identificador único da categoria
// - nome: Nome exibido no Telegram / Logs
// - chatId: ID do grupo/canal do Telegram exclusivo para essa categoria (ex: "@promotudobr").
// - ativa: true para rodar, false para pausar
// - url: Link do feed de ofertas no Mercado Livre
// - palavrasChave: Termos para filtrar no título (deixe [] vazio para aceitar tudo)

const URL_BASE_OFERTAS = "https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1";

module.exports = [
    {
        id: "tech",
        nome: "Tecnologia & Informática",
        chatId: "@promotudobr",
        ativa: true,
        url: URL_BASE_OFERTAS,
        palavrasChave: [
            'notebook', 'smartphone', 'celular', 'tv', 'smart', 'monitor', 'mouse',
            'teclado', 'headset', 'fone', 'ssd', 'placa', 'processador', 'memória',
            'memoria', 'gamer', 'tablet', 'impressora', 'apple', 'samsung', 'xiaomi', 'motorola'
        ]
    },
    {
        id: "games",
        nome: "Games & Consoles",
        chatId: "@promotudogames",
        ativa: true,
        url: URL_BASE_OFERTAS,
        palavrasChave: [
            'ps5', 'playstation', 'xbox', 'nintendo', 'switch', 'game', 'jogos',
            'controle', 'dualsense', 'headset', 'gamer', 'cadeira gamer', 'console',
            'volante', 'teclado mecanico', 'mouse gamer', 'gamepad', 'joystick'
        ]
    },
    {
        id: "casa",
        nome: "Casa & Eletrodomésticos",
        chatId: "@promotudoeletro",
        ativa: true,
        url: URL_BASE_OFERTAS,
        palavrasChave: [
            'airfryer', 'aspirador', 'cafeteira', 'geladeira', 'microondas', 'liquidificador',
            'panela', 'batedeira', 'ventilador', 'ar condicionado', 'robô aspirador', 'purificador',
            'fritadeira', 'fogao', 'fogão', 'lavadora', 'ferro', 'batedeira', 'sanduicheira'
        ]
    },
    {
        id: "ferramentas",
        nome: "Ferramentas & Construção",
        chatId: "@promotudoferramentas",
        ativa: false,
        url: URL_BASE_OFERTAS,
        palavrasChave: [
            'furadeira', 'parafusadeira', 'serra', 'esmerilhadeira', 'bosch', 'dewalt', 'makita', 'maleta', 'trena'
        ]
    }
];

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// Carrega as categorias configuradas
const LISTA_CATEGORIAS = require('./categorias');

// ==========================================
// CONFIGURAÇÕES DO SISTEMA (COM SUPORTE A VARIÁVEIS DE AMBIENTE)
// ==========================================
const CHAVE_CLOUDFLARE = process.env.CHAVE_CLOUDFLARE || "csad987cqa9dn1mnxcLXdna";
const WORKER_URL = process.env.WORKER_URL || "https://promo-bot.ofertasnomelibr.workers.dev/oferta/salvar";

// Intervalo em milissegundos entre as rondas (Padrão: 60 segundos = 1 minuto)
const INTERVALO_SEGUNDOS = parseInt(process.env.INTERVALO_SEGUNDOS || "60", 10);
const TEMPO_ESPERA = INTERVALO_SEGUNDOS * 1000;

// Modo de envio:
// 'PARALELO': A cada minuto despacha 1 produto de CADA categoria ativa.
// 'ROTATIVO': A cada minuto despacha 1 produto alternando entre as categorias.
const MODO_ENVIO = (process.env.MODO_ENVIO || 'PARALELO').toUpperCase();

// Tokens de Afiliado Mercado Livre (Podem ser configurados no Railway)
const ML_CSRF_TOKEN = process.env.ML_CSRF_TOKEN || "9KceES0A-iy05wsfmy8OM5t5mLkSebkQkGDc";
const ML_COOKIE = process.env.ML_COOKIE || `_csrf=ek7BsldG2OwjP1oFiz1cXK5V; _d2id=43073e7c-2817-4bbe-beb3-856764f63f7a; txid=X5V4QNNttXl9NuNYKRkrcValjzBgiLGN; pwfeid=3a3fb932-6084-40ee-905a-0c046ba5e146; ml-gads-exit-popup-offer-landing="2026-09-03T20:16:50.556Z"; _fbp=fb.2.1789061486822.121317937314242650; _tt_enable_cookie=1; _ttp=01M265ZP96E8J5CFANG4RYWCJM_.tt.2.1789061486886; _pin_unauth=dWlkPU56WXlObUUzTTJFdE56ZzFOeTAwTVdRMkxUaGpZMkl0Wm1NMk9XUmhOemt4TURGbQ; _cq_duid=1.1789061488.C4VLIaZkiv9IB9EG; _cq_suid=1.1789061488.LUe39OzH5zalkosv; navigation_items=MLB5828056312%7C16092026034404%7CMLB50093331%7CMLB45861629-MLB5534497596%7C16092026032453%7CMLB53199454%7CMLB53199452-MLB6688112926%7C13092026185922-MLB4971572045%7C10092026173155%7CMLB76015262%7CMLB76015261-MLB4482736079%7C10092026173148%7CMLB61455819%7CMLB61455817; p_dsid=d615e289-a468-4ad3-8c20-41d104bfaee4-1789587709420; cookiesPreferencesNotLogged=%7B%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; last_query=; _ga=GA1.3.2000446727.1789606172; _hjSessionUser_580848=eyJpZCI6ImU1NjBjMTk4LWY5MzctNTJhZC04YzIwLWE4N2U3MGM2M2NhOSIsImNyZWF0ZWQiOjE3ODk2MDg0Mjc5MjEsImV4aXN0aW5nIjp0cnVlfQ==; ml_selected_locale=pt-BR; QSI_SI_d4ikElJeWDP7fzo_intercept=true; main_domain=MLB-CARS_AND_VANS; main_attributes=BRAND%3A58955%7CMODEL%3A389450%7CVEHICLE_YEAR%3A436690%7CTRIM%3A457685; categories=filter%7C116703%3A800; category=MLB116703; compats-domain-MLB-CARS_AND_VANS=BRAND%3A58955%7CMODEL%3A389450%7CVEHICLE_YEAR%3A436690%7CTRIM%3A457685; c_Z15eD57=1; c_Z2aREDu=1; c_1NFrB4=1; tooltip=true; c_I2q2G=1; x-bf-session-v6=627261dc1188475db9bb4c55c3bbe5dc; ml_gads_exit-popup-offer=2026-10-28T02:56:45.828Z; c_26WzJ4=1; p_edsid=23e6f287-f507-39c1-bf68-10df8b8d52e1-1793199003162; x-meli-session-id=armor.9be12ce1cd0299cafcc720874252066cd56a8e0af0cbee828120f9671ca63107b51f633988dbc6500dafb471dc5be4207416a4faa76c8f27e86388a3de974264b257a0e7bfbe1628d6e471bedde366ce68d2c73f0b20c4c5693d55343acadb3f.54eebf6881a277716f81a5f79ed30048; g_state={"i_l":0,"i_ll":1793199000862,"i_e":{"enable_itp_optimization":24},"i_et":1793199000862}; ftid=FvhrE6a0R6cQl6OkTgWl8sXRZv3GhpYs-1793188526656; ssid=ghy-102810-qkVT8hXYp6s5V3FlbYP4V4DKv7FLn5-__-3696298582-__-1887893409251--RRR_0-RRR_0; orguserid=HHt04TtZ4797Z; orguseridp=3696298582; orgnickp=MB20260916155114341; cookiesPreferencesLoggedFallback=%7B%22userId%22%3A3696298582%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; cp=21645480; _gid=GA1.3.575686881.1793199017; rtid=08548367-be0a-47c8-8263-323aa5417649; sc-menu-hide-new-section_BILLING=BILLING; sc-menu-hide-new-section_PURCHASES=PURCHASES; sc-menu-hide-new-section_SELLER_CENTRAL=SELLER_CENTRAL; _mldataSessionId=6d5ba3aa-31e5-4f74-b9d4-1e3851cb0543; cookiesPreferencesLogged=%7B%22userId%22%3A3696298582%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; isExternalTraffic=true; _gcl_au=1.1.551604280.1788466611.1220465750.1793220668.1793220669.1447374203.1793151359.1793220669; ml_cart-quantity=1; NSESSIONID_ml_addresses-single-line=s%3AGDs1326v4gimnkO0oaGmg_UbvH8ODqsx.BeUb1U6S%2FKVa2oXvKBNS9xlqBcBYur4YcRvmwfvsiKE; _gcl_aw=GCL.1793220857.CjwKCAjwuobXBhBXEiwAYUaIlSaWW2-aZu8CMycNSYmxY8XiaDWmUkHu_kwoWkFF1KFo4ZF2_nU_TRoCKN0QAvD_BwE; _gcl_gs=2.1.k4$i1793220854$u48518074; __rtbh.lid=%7B%22eventType%22%3A%22lid%22%2C%22id%22%3A%22JExWI6mKNcreiF77KMLV%22%2C%22expiryDate%22%3A%222027-10-28T20%3A54%3A16.855Z%22%7D; _uetsid=a19d58d0d27a11f18cb205ab4c82d808; _uetvid=65d9b420a7d411f1b3dd0b76555eda64; _derived_epik=dj0yJnU9MVNRRE5lN0RHbWRlTUhBa01fLXBka1pWVlJwOGRKRUEmbj1SZ0VyRC1wcVhZSHRYVDNfMTBSTlRnJm09MSZ0PUFBQUFBR3JpWVB3JnJtPTEmcnQ9QUFBQUFHcmlZUHcmc3A9Mg; __rtbh.uid=%7B%22eventType%22%3A%22uid%22%2C%22id%22%3A%223696298582%22%2C%22expiryDate%22%3A%222027-10-28T20%3A54%3A51.125Z%22%7D; _cq_session=20.1793220653114.wsMDtKrM1mQ3ilbr.1793220891331; ttcsid_C9SJ5SBC77UADFMAH8T0=1793220653081::MLWgnvV-43j7WTkK00xe.27.1793220891391.1; _cq_s=8ebade1adba3a4a67cb0b5430bc8e613.Vw6lDxBFskyzXums:6+Hb/E6PuqonvXrKhge0PboCiZShUNB4kQPuf4850cR3t1/bXILvEqzMUmDCafaXDptbgSoMzo9Nb872iZop9ZNRA2fjx5d/gEwZMCkVNYKe0ERAWPBJFLc=:7Mxj1eEiwWs60MmtvBS0zA==; ttcsid=1793220650381::NZXRUnzc8LkFVV14rXgW.28.1793220893059.0::1.204475.241006::242669.7.1524.6477::235337.31.5866; ttcsid_CFVSC2JC77U0ARCJTCJ0=1793220650380::y189ber90P0pW731loct.27.1793220893059.1; _hjSessionUser_720738=eyJpZCI6IjUwZjAzZGZlLWNmZGMtNTJiOC04Yjg4LTFhYTAwN2I3YzM4MSIsImNyZWF0ZWQiOjE3OTMyMjE4MzgwNjksImV4aXN0aW5nIjpmYWxzZX0=; _hjSession_720738=eyJpZCI6Ijc4ZTBhZDZkLWFiNmItNDZmMy1hZWIzLTUzMGZkMTU4NzZmYyIsImMiOjE3OTMyMjE4MzgwNzAsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; nsa_rotok=eyJhbGciOiJSUzI1NiIsImtpZCI6IjMiLCJ0eXAiOiJKV1QifQ.eyJpZGVudGlmaWVyIjoiYzJkMDg1MTUtYmYyMi00NDkzLTkxODgtMzhkODdlMDdmNmE0Iiwicm90YXRpb25faWQiOiJhZDY2YjViNy0xMGIyLTQ4MTgtYTJlMy01NTkyMjRkOGI3Y2EiLCJwbGF0Zm9ybSI6Ik1MIiwicm90YXRpb25fZGF0ZSI6MTc5MzIyMjQ0MCwiZXhwIjoxNzk1ODEzODQwLCJqdGkiOiI5ZmQ0YmI1Ny0zMjVlLTRhNGYtOTFiMC1mMGQ4NDk4ZmQ3OTYiLCJpYXQiOjE3OTMyMjE4NDAsInN1YiI6ImMyZDA4NTE1LWJmMjItNDQ5My05MTg4LTM4ZDg3ZTA3ZjZhNCJ9.hxTM_Y68GknDv22giM1-Pdq5n95jVqcQXfdNprVqkNlFNdafxjUIx9pu3sdgxwHkKHAW9XIA3-BXSk_Fmn5cHvbdElg0p4fMgRO1Tm20rcCIvfshGJ5IYNT-4L3CXM4KDPZ6uMZRhtVtsyVMndE_lbsD3Xgsgc6VQXeVD4tkyvRKT6A8I6PPJZzQYBn7mpKP8stHTdhCNdSLkQGCcg1O26I89A3Vh86h87L9xexesffb7txq12eOvDleXbObP1kYFjglnRnJpYHWuZ780UfjG1T6Z1gKMdSek6L75u9eNmLj_ASkaapTWcUsvVkyolPSeJn9KMPZUzOhISpSC2-sdg; hide-cookie-banner=3696298582-COOKIE_PREFERENCES_ALREADY_SET; LAST_SEARCH=bolsa; _snoopy=eyJmaW5nZXJwcmludCI6IjQwYU9SZWdPQlJJOU9MdVhmQkVMRnpZUFhUMkl4Q2xwNHYxU0V5c3dDR0YydG5HdUR5MkRySlpMY0FWNkVraXdqUDRqZlhMUEgydCtqcWUwRzVkLytLZXpsa1ZRN2VPY2xYaDdVd2dEd1Npb3JFblpId25wL3RXNDZrZGNwdldOcnB2YlhTSHhVZE5YRm55eWJFUXR6MlQwTEowOUxhbzh0b3FybExLS3BWSGlEOTFmRXlrPSIsImtleSI6InNWV1hTUEpaMFl4Qk44VmJkVlNYdWRXRlZSQjVVL205V0N1TngrOEZtYy95emptNm9yZzB5WTE5eU90YncxKzJlTFlHakpYdFdUVUJHZHhVN3BMaDh2bnNhRk81REY3eSJ9; _ml_ar-browser-check=954dfc5b-93e8-4fd0-988e-068918eaf11a`;

// ==========================================
// INICIALIZAÇÃO DE CATEGORIAS E MEMÓRIA
// ==========================================
const categoriasAtivas = LISTA_CATEGORIAS.filter(c => c.ativa !== false);

categoriasAtivas.forEach(cat => {
    cat.arquivoMemoria = `./memoria_${cat.id}_produtos.json`;
    cat.arquivoPagina = `./memoria_${cat.id}_pagina.json`;
    cat.produtosEnviados = new Set();
    cat.paginaAtual = cat.url;
    cat.fila = [];

    // Carrega memória de produtos já enviados
    try {
        if (fs.existsSync(cat.arquivoMemoria)) {
            const dados = fs.readFileSync(cat.arquivoMemoria, 'utf8');
            cat.produtosEnviados = new Set(JSON.parse(dados));
        } else if (cat.id === 'tech' && fs.existsSync('./memoria_produtos.json')) {
            const dadosAntigos = fs.readFileSync('./memoria_produtos.json', 'utf8');
            cat.produtosEnviados = new Set(JSON.parse(dadosAntigos));
        }

        if (fs.existsSync(cat.arquivoPagina)) {
            const pUrl = fs.readFileSync(cat.arquivoPagina, 'utf8');
            if (pUrl && pUrl.trim()) cat.paginaAtual = pUrl.trim();
        } else if (cat.id === 'tech' && fs.existsSync('./memoria_pagina.json')) {
            const pUrlAntiga = fs.readFileSync('./memoria_pagina.json', 'utf8');
            if (pUrlAntiga && pUrlAntiga.trim()) cat.paginaAtual = pUrlAntiga.trim();
        }
    } catch (e) {
        console.error(`⚠️ Erro ao restaurar memória da categoria ${cat.nome}:`, e.message);
    }

    console.log(`📂 [${cat.nome}] Memória: ${cat.produtosEnviados.size} produtos | Página: ${cat.paginaAtual}`);
});

function salvarMemoriaCategoria(cat) {
    try {
        fs.writeFileSync(cat.arquivoMemoria, JSON.stringify(Array.from(cat.produtosEnviados), null, 2), 'utf8');
        fs.writeFileSync(cat.arquivoPagina, cat.paginaAtual, 'utf8');
    } catch (erro) {
        console.error(`❌ Erro ao salvar memória da categoria ${cat.nome}:`, erro.message);
    }
}

// Configura navegador otimizado para Docker / Railway e Windows local
async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1366,768'
        ]
    });
}

// Configura cabeçalhos realistas e injeta cookies da conta no navegador
async function configurarPagina(page) {
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    });

    if (ML_COOKIE) {
        try {
            const cookies = ML_COOKIE.split(';').map(c => {
                const parts = c.trim().split('=');
                const name = parts[0];
                const value = parts.slice(1).join('=');
                return { name, value, domain: '.mercadolivre.com.br', path: '/' };
            }).filter(c => c.name && c.value);
            if (cookies.length > 0) {
                await page.setCookie(...cookies);
            }
        } catch (e) { }
    }
}

// ==========================================
// MOTOR DE BUSCA NA PÁGINA DE OFERTAS
// ==========================================
async function recarregarFilaCategoria(cat, page) {
    console.log(`\n🔍 [${cat.nome}] Recarregando fila a partir de: ${cat.paginaAtual}`);
    try {
        await page.goto(cat.paginaAtual, { waitUntil: 'domcontentloaded', timeout: 40000 });
        console.log(`📄 [${cat.nome}] URL carregada: ${page.url()}`);

        try {
            await page.waitForSelector('.promotion-item, .poly-card, .ui-search-layout__item, .poly-component', { timeout: 8000 });
        } catch (e) { }

        // Scroll suave para acionar lazy-loading
        for (let i = 0; i < 5; i++) {
            try {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            } catch (e) { }
            await new Promise(r => setTimeout(r, 1000));
        }

        const dadosPagina = await page.evaluate(() => {
            const itens = Array.from(document.querySelectorAll('.promotion-item, .poly-card, .ui-search-layout__item, .poly-component'));
            const listaProdutos = itens.map(el => {
                let titulo = el.querySelector('.promotion-item__title, .poly-component__title, h2, h3, .ui-search-item__title')?.innerText || "";
                if (!titulo) titulo = el.querySelector('img')?.getAttribute('alt') || "";
                const link = el.querySelector('a')?.href || "";
                return { titulo: titulo.toLowerCase(), link };
            }).filter(item => item.titulo && item.link);

            const btnSeguinte = document.querySelector('li.andes-pagination__button--next a, .andes-pagination__link--next, a[title="Seguinte"]');
            const proximaPagina = btnSeguinte ? btnSeguinte.href : null;

            return { listaProdutos, proximaPagina };
        });

        console.log(`📦 [${cat.nome}] ${dadosPagina.listaProdutos.length} anúncios encontrados na página.`);

        // Filtra por palavras-chave (se configuradas) e elimina os já enviados
        const produtosValidos = dadosPagina.listaProdutos.filter(item => {
            const linkLimpo = item.link.split('?')[0];
            const naoEnviado = !cat.produtosEnviados.has(linkLimpo);

            let combinaFiltro = true;
            if (cat.palavrasChave && cat.palavrasChave.length > 0) {
                combinaFiltro = cat.palavrasChave.some(p => item.titulo.includes(p.toLowerCase()));
            }

            return naoEnviado && combinaFiltro;
        });

        if (produtosValidos.length > 0) {
            cat.fila = produtosValidos;
            console.log(`🎯 [${cat.nome}] Fila abastecida com ${cat.fila.length} ofertas novas!`);
        } else {
            console.log(`⏩ [${cat.nome}] Nenhum produto novo não enviado nesta página.`);
            if (dadosPagina.proximaPagina) {
                console.log(`🔄 [${cat.nome}] Avançando para a próxima página...`);
                cat.paginaAtual = dadosPagina.proximaPagina;
                salvarMemoriaCategoria(cat);
                return recarregarFilaCategoria(cat, page);
            } else {
                console.log(`⚠️ [${cat.nome}] Fim das páginas. Reiniciando do início...`);
                cat.paginaAtual = cat.url;
                salvarMemoriaCategoria(cat);
            }
        }
    } catch (erro) {
        console.error(`❌ [${cat.nome}] Erro ao carregar página de ofertas:`, erro.message);
    }
}

// ==========================================
// PROCESSAR UMA OFERTA INDIVIDUAL
// ==========================================
async function despacharUmaOferta(cat, browser) {
    const page = await browser.newPage();
    await configurarPagina(page);

    try {
        if (!cat.fila || cat.fila.length === 0) {
            await recarregarFilaCategoria(cat, page);
        }

        if (!cat.fila || cat.fila.length === 0) {
            console.log(`⏳ [${cat.nome}] Fila ainda vazia após tentativa de recarga.`);
            return;
        }

        const candidato = cat.fila.shift();
        const linkLimpo = candidato.link.split('?')[0];

        console.log(`\n🎯 [${cat.nome}] Alvo selecionado: ${candidato.titulo}`);
        console.log(`🔗 Extraindo detalhes da página do produto...`);

        await page.goto(linkLimpo, { waitUntil: 'domcontentloaded', timeout: 35000 });

        const dadosProduto = await page.evaluate(() => {
            const titulo = document.querySelector('h1')?.innerText.trim();

            let imagem = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            if (!imagem) {
                const galeria = document.querySelector('.ui-pdp-gallery__figure img, .ui-pdp-gallery img');
                if (galeria) {
                    imagem = galeria.getAttribute('data-zoom') || galeria.getAttribute('data-src') || galeria.getAttribute('src');
                }
            }

            if (imagem && imagem.startsWith('http')) {
                imagem = imagem.replace(/-[a-zA-Z]\.(jpg|jpeg|png|webp)$/i, '-O.$1');
            } else {
                imagem = null;
            }

            let preco_original = null;
            let preco = null;
            let desconto = null;
            const caixaPrincipal = document.querySelector('.ui-pdp-price__main-container') || document;

            const extrairValorCompleto = (el) => {
                if (!el) return null;
                const fracao = el.querySelector('.andes-money-amount__fraction')?.innerText.replace(/\./g, '');
                if (!fracao) return null;
                const centavos = el.querySelector('.andes-money-amount__cents')?.innerText.trim() || '00';
                return parseFloat(`${fracao}.${centavos}`);
            };

            const elPrecoAntigo = caixaPrincipal.querySelector('s.andes-money-amount, .andes-money-amount--previous, s .andes-money-amount') || caixaPrincipal.querySelector('s');
            if (elPrecoAntigo) preco_original = extrairValorCompleto(elPrecoAntigo);

            const todosOsPrecos = Array.from(caixaPrincipal.querySelectorAll('.andes-money-amount'));
            const precosValidos = todosOsPrecos.filter(el => !el.closest('s') && !el.classList.contains('andes-money-amount--previous'));
            if (precosValidos.length > 0) {
                preco = extrairValorCompleto(precosValidos[0]);
            }

            const elDesconto = caixaPrincipal.querySelector('.andes-money-amount__discount');
            if (elDesconto) desconto = elDesconto.innerText.trim();

            return { titulo, preco, preco_original, desconto, link: window.location.href, imagem };
        });

        if (!dadosProduto || !dadosProduto.preco) {
            console.log(`❌ [${cat.nome}] Falha ao extrair preços deste item. Pulando.`);
            cat.produtosEnviados.add(linkLimpo);
            salvarMemoriaCategoria(cat);
            return;
        }

        dadosProduto.link = dadosProduto.link.split('?')[0];
        dadosProduto.categoria = cat.nome;
        dadosProduto.categoria_id = cat.id;
        if (cat.chatId && cat.chatId.trim()) {
            dadosProduto.chat_id = cat.chatId.trim();
        }

        console.log(`📦 Produto: ${dadosProduto.titulo}`);
        console.log(`💵 Preço Atual: R$ ${dadosProduto.preco} | ❌ Antigo: ${dadosProduto.preco_original ? 'R$ ' + dadosProduto.preco_original : 'N/A'} | 🏷️ ${dadosProduto.desconto || 'N/A'}`);

        console.log(`🔗 Gerando link de afiliado...`);
        const linkAfiliado = await gerarLinkAfiliado(dadosProduto.link);
        if (linkAfiliado) {
            console.log(`💰 Link gerado: ${linkAfiliado}`);
            dadosProduto.link = linkAfiliado;
        }

        console.log(`☁️ Enviando para o Cloudflare Worker...`);
        const envio = await enviarParaWorker(dadosProduto);

        if (envio.sucesso) {
            console.log(`✅ [${cat.nome}] Oferta enviada ao Telegram com sucesso!`);
            cat.produtosEnviados.add(linkLimpo);
            salvarMemoriaCategoria(cat);
        } else {
            console.log(`❌ [${cat.nome}] Erro ao enviar para o Worker:`, envio.erro);
        }

    } catch (e) {
        console.error(`❌ [${cat.nome}] Erro ao despachar produto:`, e.message);
    } finally {
        try {
            if (!page.isClosed()) await page.close();
        } catch (e) { }
    }
}

// ==========================================
// COMUNICAÇÃO EXTERNA (AFILIADO & WORKER)
// ==========================================
async function gerarLinkAfiliado(linkOriginal) {
    const urlApi = "https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink";
    const bodyData = { urls: [linkOriginal], tag: "telegramofertas" };

    try {
        const resposta = await fetch(urlApi, {
            method: "POST",
            headers: {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/json",
                "x-csrf-token": ML_CSRF_TOKEN,
                "cookie": ML_COOKIE,
                "Referer": "https://www.mercadolivre.com.br/afiliados/linkbuilder",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify(bodyData)
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            if (dados && dados.urls && dados.urls.length > 0 && dados.urls[0].short_url) {
                return dados.urls[0].short_url;
            }
        }
        return null;
    } catch (erro) {
        console.error("❌ Erro na API de afiliados:", erro.message);
        return null;
    }
}

async function enviarParaWorker(produto) {
    try {
        produto.loja = "Mercado Livre";
        const resposta = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': CHAVE_CLOUDFLARE },
            body: JSON.stringify(produto)
        });

        if (resposta.ok) {
            return { sucesso: true };
        } else {
            const erroTxt = await resposta.text();
            return { sucesso: false, erro: erroTxt };
        }
    } catch (erro) {
        return { sucesso: false, erro: erro.message };
    }
}

// ==========================================
// LOOP DE EXECUÇÃO MULTI-CATEGORIA
// ==========================================
let indiceRotativo = 0;
let executandoCiclo = false;

async function cicloPrincipal() {
    if (executandoCiclo) {
        console.log("⚠️ Ciclo anterior ainda em andamento. Aguardando próximo pulso...");
        return;
    }

    executandoCiclo = true;
    console.log(`\n======================================================`);
    console.log(`⏰ [${new Date().toLocaleTimeString()}] INICIANDO RONDA DE OFERTAS`);
    console.log(`======================================================`);

    let browser;
    try {
        browser = await iniciarNavegador();

        if (MODO_ENVIO === 'ROTATIVO') {
            // Despacha 1 produto da categoria da vez
            const cat = categoriasAtivas[indiceRotativo % categoriasAtivas.length];
            indiceRotativo++;
            console.log(`🎯 Modo Rotativo: Processando categoria da vez: ${cat.nome}`);
            await despacharUmaOferta(cat, browser);
        } else {
            // Modo Paralelo (1 oferta por categoria a cada ciclo)
            console.log(`🚀 Modo Paralelo: Despachando 1 oferta para CADA uma das ${categoriasAtivas.length} categorias ativas...`);
            for (const cat of categoriasAtivas) {
                await despacharUmaOferta(cat, browser);
            }
        }
    } catch (erro) {
        console.error("❌ Erro crítico no ciclo do navegador:", erro.message);
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) { }
        }
        executandoCiclo = false;
        console.log(`💤 Ronda finalizada. Próxima execução em ${INTERVALO_SEGUNDOS} segundos...`);
    }
}

// ==========================================
// INICIALIZAÇÃO DO BOT
// ==========================================
console.log("\n======================================================");
console.log("🚀 BOT DE OFERTAS MERCADO LIVRE 24/7 INICIADO!");
console.log(`📋 Categorias ativas: ${categoriasAtivas.map(c => c.nome).join(', ')}`);
console.log(`⚡ Modo de envio: ${MODO_ENVIO}`);
console.log(`⏱️ Intervalo: ${INTERVALO_SEGUNDOS} segundos`);
console.log("======================================================\n");

// Primeira execução imediata
cicloPrincipal();

// Loop a cada INTERVALO_SEGUNDOS
setInterval(cicloPrincipal, TEMPO_ESPERA);

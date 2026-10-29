const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// ==========================================
// CONFIGURAÇÕES DO SISTEMA
// ==========================================
const CHAVE_CLOUDFLARE = "csad987cqa9dn1mnxcLXdna";
const WORKER_URL = "https://promo-bot.ofertasnomelibr.workers.dev/oferta/salvar";
const URL_BASE_OFERTAS = "https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1";

const PALAVRAS_TECH = [
    'notebook', 'smartphone', 'celular', 'tv', 'smart', 'monitor', 'mouse',
    'teclado', 'headset', 'fone', 'ssd', 'placa', 'processador', 'memória',
    'memoria', 'gamer', 'tablet', 'impressora', 'apple', 'samsung', 'xiaomi', 'motorola'
];

const TEMPO_ESPERA = 1 * 60 * 1000; // 1 minuto
const ARQUIVO_MEMORIA = './memoria_produtos.json';
const ARQUIVO_PAGINA = './memoria_pagina.json';

let produtosEnviados = new Set();
let paginaAtualUrl = URL_BASE_OFERTAS;

function carregarMemoria() {
    try {
        if (fs.existsSync(ARQUIVO_MEMORIA)) {
            const dados = fs.readFileSync(ARQUIVO_MEMORIA, 'utf8');
            produtosEnviados = new Set(JSON.parse(dados));
            console.log(`🧠 Memória restaurada: ${produtosEnviados.size} produtos processados.`);
        }
        if (fs.existsSync(ARQUIVO_PAGINA)) {
            const pUrl = fs.readFileSync(ARQUIVO_PAGINA, 'utf8');
            if (pUrl) paginaAtualUrl = pUrl;
            console.log(`📄 Página retomada: ${paginaAtualUrl}`);
        }
    } catch (erro) {
        console.error("❌ Erro ao ler a memória:", erro.message);
    }
}

function salvarMemoria() {
    try {
        fs.writeFileSync(ARQUIVO_MEMORIA, JSON.stringify(Array.from(produtosEnviados), null, 2), 'utf8');
        fs.writeFileSync(ARQUIVO_PAGINA, paginaAtualUrl, 'utf8');
    } catch (erro) {
        console.error("❌ Erro ao salvar a memória no disco:", erro.message);
    }
}

// ==========================================
// O MOTOR DE CAÇA AUTOMÁTICA (EXATO DO SERVIDOR.JS)
// ==========================================
async function cacaAsOfertas() {
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Iniciando a patrulha de ofertas...`);
    console.log(`🔗 A rastrear a página: ${paginaAtualUrl}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    try {
        await page.goto(paginaAtualUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });

        console.log("📜 Desbravando a página atual...");
        for (let i = 0; i < 6; i++) {
            try {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            } catch (e) { }
            await new Promise(r => setTimeout(r, 1500));
        }

        const dadosPagina = await page.evaluate(() => {
            const itens = Array.from(document.querySelectorAll('.promotion-item, .poly-card, .ui-search-layout__item'));
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

        console.log(`👁️ Encontrados ${dadosPagina.listaProdutos.length} produtos nesta página.`);

        const ofertasTech = dadosPagina.listaProdutos.filter(item => {
            const isTech = PALAVRAS_TECH.some(palavra => item.titulo.includes(palavra));
            const linkLimpo = item.link.split('?')[0];
            const isNovo = !produtosEnviados.has(linkLimpo);
            return isTech && isNovo;
        });

        if (ofertasTech.length === 0) {
            if (dadosPagina.proximaPagina) {
                console.log("🔄 Todos os produtos úteis desta página já foram vistos. A avançar para a próxima página...");
                paginaAtualUrl = dadosPagina.proximaPagina;
                salvarMemoria();
                await browser.close();
                return cacaAsOfertas();
            } else {
                console.log("⚠️ Chegamos ao fim de todas as páginas. A reiniciar do início...");
                paginaAtualUrl = URL_BASE_OFERTAS;
                salvarMemoria();
                await browser.close();
                return;
            }
        }

        const ofertaAlvo = ofertasTech[0];
        const linkLimpo = ofertaAlvo.link.split('?')[0];
        console.log(`🎯 Alvo Travado: ${ofertaAlvo.titulo}`);

        // 🔥 ENTRA NA PÁGINA INDIVIDUAL DO PRODUTO (EXATO COMO O SERVIDOR.JS FAZ)
        console.log("🔗 A entrar na página do produto para extração profunda...");
        await page.goto(linkLimpo, { waitUntil: 'domcontentloaded', timeout: 35000 });

        const dadosProduto = await page.evaluate(() => {
            const titulo = document.querySelector('h1')?.innerText.trim();

            // Procura a imagem principal e ignora placeholders em Base64
            let imagem = null;
            const imagensCandidatas = Array.from(document.querySelectorAll('.ui-pdp-gallery img, img.ui-pdp-image, .ui-pdp-gallery__figure img'));

            for (const img of imagensCandidatas) {
                const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-zoom');
                // Aceita apenas URLs HTTP reais e descarta placeholders data:image
                if (src && src.startsWith('http') && !src.startsWith('data:')) {
                    imagem = src;
                    break;
                }
            }

            // Se a imagem tiver sufixo de miniatura ou zoom intermediário, converte para alta resolução original (-O)
            if (imagem) {
                imagem = imagem.replace(/-[A-Z]\.(jpg|webp|png)$/i, '-O.$1');
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
            console.log("❌ Falha ao extrair os preços. A ignorar este alvo.");
            produtosEnviados.add(linkLimpo);
            salvarMemoria();
            await browser.close();
            return;
        }

        dadosProduto.link = dadosProduto.link.split('?')[0];

        console.log(`📦 Titulo: ${dadosProduto.titulo}`);
        console.log(`💵 Atual: R$ ${dadosProduto.preco} | ❌ Antigo: ${dadosProduto.preco_original ? 'R$ ' + dadosProduto.preco_original : 'N/A'} | 🏷️ ${dadosProduto.desconto || 'N/A'}`);

        console.log("🔗 A gerar link de afiliado...");
        const linkAfiliado = await gerarLinkAfiliado(dadosProduto.link);
        if (linkAfiliado) {
            console.log("💰 Link gerado com sucesso:", linkAfiliado);
            dadosProduto.link = linkAfiliado;
        }

        console.log("☁️ Enviando para a Cloudflare...");
        const envio = await enviarParaWorker(dadosProduto);

        if (envio.sucesso) {
            console.log("✅ Enviado para o Telegram com sucesso!");
            produtosEnviados.add(linkLimpo);
            salvarMemoria();
        } else {
            console.log("❌ Erro ao enviar:", envio.erro);
        }

    } catch (erro) {
        console.error('❌ Erro durante a caçada:', erro.message);
    } finally {
        await browser.close();
        console.log(`💤 Robô a dormir. Próxima ronda em ${TEMPO_ESPERA / 60000} minutos...`);
    }
}

// ==========================================
// FUNÇÕES DE COMUNICAÇÃO
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
                "x-csrf-token": "9KceES0A-iy05wsfmy8OM5t5mLkSebkQkGDc",
                "cookie": `_csrf=ek7BsldG2OwjP1oFiz1cXK5V; _d2id=43073e7c-2817-4bbe-beb3-856764f63f7a; txid=X5V4QNNttXl9NuNYKRkrcValjzBgiLGN; pwfeid=3a3fb932-6084-40ee-905a-0c046ba5e146; ml-gads-exit-popup-offer-landing="2026-09-03T20:16:50.556Z"; _fbp=fb.2.1789061486822.121317937314242650; _tt_enable_cookie=1; _ttp=01M265ZP96E8J5CFANG4RYWCJM_.tt.2.1789061486886; _pin_unauth=dWlkPU56WXlObUUzTTJFdE56ZzFOeTAwTVdRMkxUaGpZMkl0Wm1NMk9XUmhOemt4TURGbQ; _cq_duid=1.1789061488.C4VLIaZkiv9IB9EG; _cq_suid=1.1789061488.LUe39OzH5zalkosv; navigation_items=MLB5828056312%7C16092026034404%7CMLB50093331%7CMLB45861629-MLB5534497596%7C16092026032453%7CMLB53199454%7CMLB53199452-MLB6688112926%7C13092026185922-MLB4971572045%7C10092026173155%7CMLB76015262%7CMLB76015261-MLB4482736079%7C10092026173148%7CMLB61455819%7CMLB61455817; p_dsid=d615e289-a468-4ad3-8c20-41d104bfaee4-1789587709420; cookiesPreferencesNotLogged=%7B%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; last_query=; _ga=GA1.3.2000446727.1789606172; _hjSessionUser_580848=eyJpZCI6ImU1NjBjMTk4LWY5MzctNTJhZC04YzIwLWE4N2U3MGM2M2NhOSIsImNyZWF0ZWQiOjE3ODk2MDg0Mjc5MjEsImV4aXN0aW5nIjp0cnVlfQ==; ml_selected_locale=pt-BR; QSI_SI_d4ikElJeWDP7fzo_intercept=true; main_domain=MLB-CARS_AND_VANS; main_attributes=BRAND%3A58955%7CMODEL%3A389450%7CVEHICLE_YEAR%3A436690%7CTRIM%3A457685; categories=filter%7C116703%3A800; category=MLB116703; compats-domain-MLB-CARS_AND_VANS=BRAND%3A58955%7CMODEL%3A389450%7CVEHICLE_YEAR%3A436690%7CTRIM%3A457685; c_Z15eD57=1; c_Z2aREDu=1; c_1NFrB4=1; tooltip=true; c_I2q2G=1; x-bf-session-v6=627261dc1188475db9bb4c55c3bbe5dc; ml_gads_exit-popup-offer=2026-10-28T02:56:45.828Z; c_26WzJ4=1; p_edsid=23e6f287-f507-39c1-bf68-10df8b8d52e1-1793199003162; x-meli-session-id=armor.9be12ce1cd0299cafcc720874252066cd56a8e0af0cbee828120f9671ca63107b51f633988dbc6500dafb471dc5be4207416a4faa76c8f27e86388a3de974264b257a0e7bfbe1628d6e471bedde366ce68d2c73f0b20c4c5693d55343acadb3f.54eebf6881a277716f81a5f79ed30048; g_state={"i_l":0,"i_ll":1793199000862,"i_e":{"enable_itp_optimization":24},"i_et":1793199000862}; ftid=FvhrE6a0R6cQl6OkTgWl8sXRZv3GhpYs-1793188526656; ssid=ghy-102810-qkVT8hXYp6s5V3FlbYP4V4DKv7FLn5-__-3696298582-__-1887893409251--RRR_0-RRR_0; orguserid=HHt04TtZ4797Z; orguseridp=3696298582; orgnickp=MB20260916155114341; cookiesPreferencesLoggedFallback=%7B%22userId%22%3A3696298582%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; cp=21645480; _gid=GA1.3.575686881.1793199017; rtid=08548367-be0a-47c8-8263-323aa5417649; sc-menu-hide-new-section_BILLING=BILLING; sc-menu-hide-new-section_PURCHASES=PURCHASES; sc-menu-hide-new-section_SELLER_CENTRAL=SELLER_CENTRAL; _mldataSessionId=6d5ba3aa-31e5-4f74-b9d4-1e3851cb0543; cookiesPreferencesLogged=%7B%22userId%22%3A3696298582%2C%22categories%22%3A%7B%22advertising%22%3Atrue%2C%22functionality%22%3Atrue%2C%22performance%22%3Atrue%2C%22traceability%22%3Atrue%7D%7D; isExternalTraffic=true; _gcl_au=1.1.551604280.1788466611.1220465750.1793220668.1793220669.1447374203.1793151359.1793220669; ml_cart-quantity=1; NSESSIONID_ml_addresses-single-line=s%3AGDs1326v4gimnkO0oaGmg_UbvH8ODqsx.BeUb1U6S%2FKVa2oXvKBNS9xlqBcBYur4YcRvmwfvsiKE; _gcl_aw=GCL.1793220857.CjwKCAjwuobXBhBXEiwAYUaIlSaWW2-aZu8CMycNSYmxY8XiaDWmUkHu_kwoWkFF1KFo4ZF2_nU_TRoCKN0QAvD_BwE; _gcl_gs=2.1.k4$i1793220854$u48518074; __rtbh.lid=%7B%22eventType%22%3A%22lid%22%2C%22id%22%3A%22JExWI6mKNcreiF77KMLV%22%2C%22expiryDate%22%3A%222027-10-28T20%3A54%3A16.855Z%22%7D; _uetsid=a19d58d0d27a11f18cb205ab4c82d808; _uetvid=65d9b420a7d411f1b3dd0b76555eda64; _derived_epik=dj0yJnU9MVNRRE5lN0RHbWRlTUhBa01fLXBka1pWVlJwOGRKRUEmbj1SZ0VyRC1wcVhZSHRYVDNfMTBSTlRnJm09MSZ0PUFBQUFBR3JpWVB3JnJtPTEmcnQ9QUFBQUFHcmlZUHcmc3A9Mg; __rtbh.uid=%7B%22eventType%22%3A%22uid%22%2C%22id%22%3A%223696298582%22%2C%22expiryDate%22%3A%222027-10-28T20%3A54%3A51.125Z%22%7D; _cq_session=20.1793220653114.wsMDtKrM1mQ3ilbr.1793220891331; ttcsid_C9SJ5SBC77UADFMAH8T0=1793220653081::MLWgnvV-43j7WTkK00xe.27.1793220891391.1; _cq_s=8ebade1adba3a4a67cb0b5430bc8e613.Vw6lDxBFskyzXums:6+Hb/E6PuqonvXrKhge0PboCiZShUNB4kQPuf4850cR3t1/bXILvEqzMUmDCafaXDptbgSoMzo9Nb872iZop9ZNRA2fjx5d/gEwZMCkVNYKe0ERAWPBJFLc=:7Mxj1eEiwWs60MmtvBS0zA==; ttcsid=1793220650381::NZXRUnzc8LkFVV14rXgW.28.1793220893059.0::1.204475.241006::242669.7.1524.6477::235337.31.5866; ttcsid_CFVSC2JC77U0ARCJTCJ0=1793220650380::y189ber90P0pW731loct.27.1793220893059.1; _hjSessionUser_720738=eyJpZCI6IjUwZjAzZGZlLWNmZGMtNTJiOC04Yjg4LTFhYTAwN2I3YzM4MSIsImNyZWF0ZWQiOjE3OTMyMjE4MzgwNjksImV4aXN0aW5nIjpmYWxzZX0=; _hjSession_720738=eyJpZCI6Ijc4ZTBhZDZkLWFiNmItNDZmMy1hZWIzLTUzMGZkMTU4NzZmYyIsImMiOjE3OTMyMjE4MzgwNzAsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; nsa_rotok=eyJhbGciOiJSUzI1NiIsImtpZCI6IjMiLCJ0eXAiOiJKV1QifQ.eyJpZGVudGlmaWVyIjoiYzJkMDg1MTUtYmYyMi00NDkzLTkxODgtMzhkODdlMDdmNmE0Iiwicm90YXRpb25faWQiOiJhZDY2YjViNy0xMGIyLTQ4MTgtYTJlMy01NTkyMjRkOGI3Y2EiLCJwbGF0Zm9ybSI6Ik1MIiwicm90YXRpb25fZGF0ZSI6MTc5MzIyMjQ0MCwiZXhwIjoxNzk1ODEzODQwLCJqdGkiOiI5ZmQ0YmI1Ny0zMjVlLTRhNGYtOTFiMC1mMGQ4NDk4ZmQ3OTYiLCJpYXQiOjE3OTMyMjE4NDAsInN1YiI6ImMyZDA4NTE1LWJmMjItNDQ5My05MTg4LTM4ZDg3ZTA3ZjZhNCJ9.hxTM_Y68GknDv22giM1-Pdq5n95jVqcQXfdNprVqkNlFNdafxjUIx9pu3sdgxwHkKHAW9XIA3-BXSk_Fmn5cHvbdElg0p4fMgRO1Tm20rcCIvfshGJ5IYNT-4L3CXM4KDPZ6uMZRhtVtsyVMndE_lbsD3Xgsgc6VQXeVD4tkyvRKT6A8I6PPJZzQYBn7mpKP8stHTdhCNdSLkQGCcg1O26I89A3Vh86h87L9xexesffb7txq12eOvDleXbObP1kYFjglnRnJpYHWuZ780UfjG1T6Z1gKMdSek6L75u9eNmLj_ASkaapTWcUsvVkyolPSeJn9KMPZUzOhISpSC2-sdg; hide-cookie-banner=3696298582-COOKIE_PREFERENCES_ALREADY_SET; LAST_SEARCH=bolsa; _snoopy=eyJmaW5nZXJwcmludCI6IjQwYU9SZWdPQlJJOU9MdVhmQkVMRnpZUFhUMkl4Q2xwNHYxU0V5c3dDR0YydG5HdUR5MkRySlpMY0FWNkVraXdqUDRqZlhMUEgydCtqcWUwRzVkLytLZXpsa1ZRN2VPY2xYaDdVd2dEd1Npb3JFblpId25wL3RXNDZrZGNwdldOcnB2YlhTSHhVZE5YRm55eWJFUXR6MlQwTEowOUxhbzh0b3FybExLS3BWSGlEOTFmRXlrPSIsImtleSI6InNWV1hTUEpaMFl4Qk44VmJkVlNYdWRXRlZSQjVVL205V0N1TngrOEZtYy95emptNm9yZzB5WTE5eU90YncxKzJlTFlHakpYdFdUVUJHZHhVN3BMaDh2bnNhRk81REY3eSJ9; _ml_ar-browser-check=954dfc5b-93e8-4fd0-988e-068918eaf11a`,
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
// INICIAR O LOOP INFINITO
// ==========================================
console.log("🚀 SISTEMA AUTÓNOMO DE OFERTAS (PADRÃO SERVIDOR.JS) INICIADO!");
carregarMemoria();
console.log(`⏳ O robô fará uma ronda a cada ${TEMPO_ESPERA / 60000} minutos.`);

cacaAsOfertas();
setInterval(cacaAsOfertas, TEMPO_ESPERA);
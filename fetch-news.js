const fs = require('fs');
const path = require('path');

// Busca notícias recentes sobre a RED Canids via Google News RSS (não exige chave de API).
const QUERY = 'RED Canids';
const FEED_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
const OUTPUT_FILE = path.join(__dirname, 'data', 'news_external.json');
const MAX_ITEMS = 8;

function decodeXmlEntities(str) {
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
    const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!match) return '';
    return decodeXmlEntities(match[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')).trim();
}

async function fetchNews() {
    try {
        console.log('Buscando notícias externas sobre a RED Canids...');

        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`Erro ao buscar feed: ${response.statusText}`);
        const xml = await response.text();

        const items = xml.split('<item>').slice(1).slice(0, MAX_ITEMS).map((block) => {
            const title = extractTag(block, 'title');
            const rawLink = extractTag(block, 'link');
            const pubDate = extractTag(block, 'pubDate');
            const source = extractTag(block, 'source') || 'News';

            return {
                title,
                link: rawLink,
                date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                source
            };
        }).filter((item) => item.title && item.link);

        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2));
        console.log(`Encontradas ${items.length} notícias externas.`);
    } catch (error) {
        console.error('Falha ao buscar notícias externas:', error.message);
        // Não quebra o build; mantém o arquivo existente (ou cria uma lista vazia na primeira execução).
        if (!fs.existsSync(OUTPUT_FILE)) {
            const dir = path.dirname(OUTPUT_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(OUTPUT_FILE, '[]');
        }
        process.exit(0);
    }
}

fetchNews();

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Lê as matérias escritas no painel dos redatores (content/noticias/*.md,
// cada uma com frontmatter + corpo em markdown) e gera:
//   1. Uma página estática noticia-<slug>.html de verdade pra cada uma
//      (com título, meta tags, Open Graph e JSON-LD próprios - assim cada
//      matéria continua indexável pelo Google, igual as escritas à mão).
//   2. data/cms_articles.json, um manifesto com todas as matérias
//      publicadas, que noticias.html usa pra listar "Matérias da Redação".
//   3. Garante que a URL de cada matéria está no sitemap.xml.
//
// Publicar/editar não escreve HTML diretamente: o redator mexe só nos
// arquivos em content/noticias/ pelo painel (/admin), e este script (rodado
// pelo GitHub Actions a cada push nessa pasta) cuida de gerar o resto.

const CONTENT_DIR = path.join(__dirname, 'content', 'noticias');
const SITE_URL = 'https://canalhasnews.com.br';
const MANIFEST_FILE = path.join(__dirname, 'data', 'cms_articles.json');
const SITEMAP_FILE = path.join(__dirname, 'sitemap.xml');

const CATEGORY_TAGS = {
    'League of Legends': 'League of Legends',
    'Brawl Stars': 'Brawl Stars',
    Academy: 'Academy',
    Institucional: 'Institucional',
};

function readMarkdownFiles() {
    if (!fs.existsSync(CONTENT_DIR)) return [];
    return fs
        .readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
            const slug = f.replace(/\.md$/, '');
            const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
            const { data, content } = matter(raw);
            return { slug, ...data, body: content };
        });
}

function normalizeImagePath(img) {
    if (!img) return 'img/redcanalhas-logo.png';
    return img.startsWith('/') ? img.slice(1) : img;
}

function formatDateDisplay(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderArticleHtml(article) {
    const {
        slug, title, excerpt, category, coverImage, date, author,
    } = article;

    const image = normalizeImagePath(coverImage);
    const bodyHtml = marked.parse(article.body || '');
    const dateDisplay = formatDateDisplay(date);
    const dateIso = new Date(date).toISOString();
    const authorName = author || 'Redação Canalhas';
    const tag = CATEGORY_TAGS[category] || category || 'Notícias';
    const pageUrl = `${SITE_URL}/noticia-${slug}.html`;
    const imageUrl = `${SITE_URL}/${image}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | Canalhas News</title>
    <link rel="shortcut icon" href="img/redcanalhas-logo.png" type="image/png">
    <link rel="icon" href="img/redcanalhas-logo.png" type="image/png">
    <meta name="description" content="${escapeHtml(excerpt)}">
    <link rel="canonical" href="${pageUrl}">

    <meta property="og:type" content="article">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(title)} | Canalhas News">
    <meta property="og:description" content="${escapeHtml(excerpt)}">
    <meta property="og:image" content="${imageUrl}">

    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:image" content="${imageUrl}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-shell">
    <aside class="app-sidebar">
        <a href="index.html" class="app-logo">
            <img src="img/redcanalhas-logo.png" alt="Canalhas News Logo">
            <span class="app-logo-text">Canalhas <em>News</em></span>
        </a>

        <nav class="app-nav">
            <div class="app-nav-group">
                <span class="app-nav-label">Matilha</span>
                <a href="index.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg><span>Início</span></a>
                <a href="noticias.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11zM6 8h12v2H6zm0 4h12v2H6z"/></svg><span>Notícias</span></a>
                <a href="index.html#schedule" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg><span>Agenda</span></a>
                <a href="times.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><span>Times</span></a>
                <a href="creators.html" class="app-nav-link"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><span>Creators</span></a>
            </div>
            <div class="app-nav-group">
                <span class="app-nav-label">Mais</span>
                <a href="campeonatos.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M20.2 2H3.8C2.8 2 2 2.8 2 3.8V6c0 3.1 2.3 5.7 5.3 6 1.3 2.3 3.6 3.9 6.2 4v2H9v2h6v-2h-4.5c2.6-.1 4.9-1.7 6.2-4 3-.3 5.3-2.9 5.3-6V3.8c0-1-.8-1.8-1.8-1.8zM4 6V4h3v3.6C5.1 7.2 4 6.2 4 6zm13 1.6V4h3v2c0 1.8-1.1 3.2-3 3.6z"/></svg><span>Campeonatos</span></a>
                <a href="sobre.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg><span>Sobre</span></a>
                <a href="contato.html" class="app-nav-link"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg><span>Contato</span></a>
            </div>
        </nav>

        <div class="app-sidebar-footer">
            <div class="app-social-mini">
                <a href="https://x.com/REDcanalhas_" target="_blank" aria-label="X (Twitter)"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="https://www.instagram.com/redcanalhas_/" target="_blank" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
            </div>
            <p class="app-sidebar-copy">&copy; 2026 Canalhas News<br>Fã Site da RED Canids</p>
        </div>
    </aside>

    <div class="sidebar-scrim"></div>
        <div class="app-content">
            <header class="app-topbar">
                <button class="sidebar-toggle" aria-label="Abrir menu">
                    <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div class="app-search">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" placeholder="Buscar na Matilha...">
                    <kbd>Ctrl K</kbd>
                </div>
                <button class="theme-toggle" aria-label="Alternar tema">
                    <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                </button>
                <div class="auth-widget">
                    <button class="auth-login-btn" type="button">
                        <span class="auth-google-icon"><svg viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg></span>
                        <span>Entrar</span>
                    </button>
                    <div class="auth-user" hidden>
                        <button class="auth-user-btn" type="button">
                            <img class="auth-user-photo" src="" alt="">
                            <span class="auth-user-name"></span>
                        </button>
                        <div class="auth-menu" hidden>
                            <div class="auth-menu-info">
                                <strong class="auth-menu-name"></strong>
                                <span class="auth-menu-email"></span>
                            </div>
                            <a href="#" class="auth-menu-item auth-logout-btn">Sair</a>
                        </div>
                    </div>
                </div>
            </header>
            <main class="app-main narrow">
                <div class="app-layout">
            <article class="full-article">
                <header class="article-header">
                    <h1 class="article-title">${escapeHtml(title)}</h1>
                </header>
                <div class="article-image" style="background-image: url('${image}'); height: 450px; background-size: cover; background-position: center;"></div>
                <div class="article-body">
                    <div class="article-lead reveal">${escapeHtml(excerpt)}</div>
                    ${bodyHtml}
                </div>
                <div class="article-meta">Por <strong>${escapeHtml(authorName)}</strong>${dateDisplay ? ` | ${dateDisplay}` : ''}</div>
                <div class="share-section">
                    <p style="color:var(--text-muted); margin-bottom:1rem; font-weight:700; text-transform:uppercase;">Compartilhe:</p>
                    <button class="share-btn">Twitter / X</button>
                    <button class="share-btn">WhatsApp</button>
                </div>
            </article>
            <section class="comments-section" data-article-id="noticia-${slug}">
                <h2 class="section-title">Comentários</h2>
                <p class="comments-login-prompt">
                    Entre com sua conta Google para comentar nesta matéria.
                    <button class="auth-login-btn" type="button">
                        <span class="auth-google-icon"><svg viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg></span>
                        <span>Entrar com Google</span>
                    </button>
                </p>
                <form class="comment-form" hidden>
                    <textarea placeholder="Deixe seu comentário sobre a matéria..." maxlength="1000" required></textarea>
                    <button type="submit">Comentar</button>
                </form>
                <div class="comments-list"><p class="comments-empty">Carregando comentários...</p></div>
            </section>

                </div>
            </main>
            <footer class="app-footer">
                <div class="footer-grid">
                    <div>
                        <a href="index.html" class="footer-brand-logo">
                            <img src="img/redcanalhas-logo.png" alt="Canalhas News Logo" loading="lazy">
                            <span>Canalhas <em>News</em></span>
                        </a>
                        <p>O seu portal de notícias não-oficial sobre a RED Canids Kalunga.</p>
                        <div class="social-links">
                            <a href="https://x.com/REDcanalhas_" target="_blank" aria-label="X (Twitter)"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                            <a href="https://www.instagram.com/redcanalhas_/" target="_blank" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>
                        </div>
                    </div>
                    <div class="footer-col">
                        <h4>Navegação</h4>
                        <ul>
                            <li><a href="noticias.html">Notícias</a></li>
                            <li><a href="times.html">Times</a></li>
                            <li><a href="campeonatos.html">Campeonatos</a></li>
                            <li><a href="creators.html">Creators</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    &copy; 2026 Canalhas News - Fã Site da Red Canids Kalunga
                </div>
            </footer>
        </div>
    </div>

    <button class="back-to-top" aria-label="Voltar ao topo">
        <svg viewBox="0 0 24 24"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
    </button>

    <script src="js/main.js" defer></script>
    <script src="js/auth.js" type="module"></script>

    <!-- JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": ${JSON.stringify(title)},
      "image": [${JSON.stringify(imageUrl)}],
      "datePublished": ${JSON.stringify(dateIso)},
      "author": [{
          "@type": "Organization",
          "name": ${JSON.stringify(authorName)}
      }],
      "publisher": {
        "@type": "Organization",
        "name": "Canalhas News",
        "logo": { "@type": "ImageObject", "url": "${SITE_URL}/img/redcanalhas-logo.png" }
      }
    }
    </script>
</body>
</html>
`;
}

function updateSitemap(articles) {
    let xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
    const closeTag = '</urlset>';
    let added = 0;

    articles.forEach(({ slug }) => {
        const loc = `${SITE_URL}/noticia-${slug}.html`;
        if (xml.includes(`<loc>${loc}</loc>`)) return;
        const entry = `    <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
        xml = xml.replace(closeTag, `${entry}${closeTag}`);
        added += 1;
    });

    if (added > 0) fs.writeFileSync(SITEMAP_FILE, xml);
    return added;
}

function main() {
    const articles = readMarkdownFiles();
    if (!articles.length) {
        console.log('Nenhuma matéria em content/noticias/ ainda.');
        return;
    }

    let generated = 0;
    const manifest = [];

    articles.forEach((article) => {
        if (!article.title || !article.date) {
            console.warn(`Ignorando ${article.slug}: falta título ou data.`);
            return;
        }

        const html = renderArticleHtml(article);
        const outFile = path.join(__dirname, `noticia-${article.slug}.html`);
        const existing = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : null;
        if (existing !== html) {
            fs.writeFileSync(outFile, html);
            generated += 1;
        }

        manifest.push({
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt || '',
            category: article.category || 'Notícias',
            coverImage: normalizeImagePath(article.coverImage),
            date: new Date(article.date).toISOString(),
            author: article.author || 'Redação Canalhas',
            url: `noticia-${article.slug}.html`,
        });
    });

    manifest.sort((a, b) => new Date(b.date) - new Date(a.date));

    const dir = path.dirname(MANIFEST_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    const sitemapAdded = updateSitemap(manifest);

    console.log(`Geradas/atualizadas ${generated} página(s) de matéria. Manifesto com ${manifest.length} matéria(s). ${sitemapAdded} URL(s) nova(s) no sitemap.`);
}

main();

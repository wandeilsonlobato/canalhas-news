document.addEventListener('DOMContentLoaded', async () => {
    const featureSlot = document.getElementById('news-feature-slot');
    const listSlot = document.getElementById('news-list-slot');
    if (!featureSlot && !listSlot) return;

    async function fetchJson(url) {
        try {
            const res = await fetch(url);
            return res.ok ? await res.json() : [];
        } catch {
            return [];
        }
    }

    const [manual, cms] = await Promise.all([
        fetchJson('data/manual_articles.json'),
        fetchJson('data/cms_articles.json'),
    ]);

    // A matéria mais recente entre as escritas à mão e as publicadas pelo
    // painel do redator vira o destaque automaticamente - sempre por data,
    // não importa a origem.
    const all = [...manual, ...cms].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!all.length) return;

    const [featured, ...rest] = all;

    if (featureSlot && featured) {
        featureSlot.innerHTML = `
            <article class="news-card feature reveal visible">
                <div class="image-wrapper">
                    <span class="news-tag">${featured.category}</span>
                    <div class="news-image" style="background-image: url('${featured.coverImage}');"></div>
                </div>
                <div class="news-content">
                    <h3 class="news-title"><a href="${featured.url}" class="card-link">${featured.title}</a></h3>
                    <p class="news-excerpt">${featured.excerpt}</p>
                    <span class="read-more">Ler matéria &rarr;</span>
                </div>
            </article>
        `;
    }

    if (listSlot) {
        const limit = parseInt(listSlot.dataset.limit, 10) || Infinity;
        listSlot.innerHTML = rest.slice(0, limit).map((article) => `
            <article class="news-card compact reveal visible">
                <div class="image-wrapper"><div class="news-image" style="background-image: url('${article.coverImage}');"></div></div>
                <div class="news-content"><span class="compact-tag">${article.category}</span><h3 class="news-title"><a href="${article.url}" class="card-link">${article.title}</a></h3></div>
            </article>
        `).join('');
    }
});

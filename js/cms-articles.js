document.addEventListener('DOMContentLoaded', function () {
    const section = document.getElementById('cms-articles-section');
    const grid = document.getElementById('cms-articles-grid');
    if (!section || !grid) return;

    const limit = parseInt(section.dataset.limit, 10) || Infinity;

    fetch('data/cms_articles.json')
        .then((response) => (response.ok ? response.json() : []))
        .then((data) => {
            if (!Array.isArray(data) || !data.length) return;

            data.slice(0, limit).forEach((article) => {
                const html = `
                    <article class="news-card compact reveal visible">
                        <div class="image-wrapper"><div class="news-image" style="background-image: url('${article.coverImage}');"></div></div>
                        <div class="news-content"><span class="compact-tag">${article.category}</span><h3 class="news-title"><a href="${article.url}" class="card-link">${article.title}</a></h3></div>
                    </article>
                `;
                grid.insertAdjacentHTML('beforeend', html);
            });

            section.hidden = false;
        })
        .catch(() => {});
});

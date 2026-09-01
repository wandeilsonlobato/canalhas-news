document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.schedule-tabs button');
    const scheduleList = document.querySelector('.schedule-list');
    const loadingMsg = document.getElementById('loading-schedule');
    if (!scheduleList) return;

    // --- CONFIGURAÇÃO AUTOMÁTICA DE LOGOS (GITHUB) ---
    // Cole aqui o link da pasta do GitHub que você achou, mas modificado para o jsDelivr.
    // Padrão: https://cdn.jsdelivr.net/gh/USUARIO/REPOSITORIO@main/PASTA/
    const GITHUB_LOGOS_URL = 'https://cdn.jsdelivr.net/gh/flori-sch/League-of-Legends-Team-Logos@main/CBLOL/';

    const localTeamLogos = {
        'LOUD': 'img/loud-logo.png',
        'paiN Gaming': 'img/pain-logo.png',
        'Vivo Keyd Stars': 'img/keyd-stars-logo.png',
        'Leviatan': 'img/leviatan-logo.png',
        'FURIA': 'img/furia-esports-logo.png',
        'Fluxo': 'img/fluxo-logo.png',
        'LOS': 'img/los-logo.png',
        'Los Grandes': 'img/los-logo.png'
    };

    function getAutoLogo(teamName) {
        if (localTeamLogos[teamName]) return localTeamLogos[teamName];
        return `${GITHUB_LOGOS_URL}${encodeURIComponent(teamName)}.png`;
    }

    // AGENDA MANUAL (Fallback de última instância, caso data/matches.json falhe)
    // Atualize a data conforme os confrontos dos playoffs do Split 2 forem definidos.
    const LOCAL_SCHEDULE = [
        {
            game: 'lol',
            league: 'CBLOL 2026 - Split 2 (Playoffs)',
            date: '2026-09-05T19:00:00',
            opponent: 'A Definir'
        }
    ];

    async function fetchMatches() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('data/matches.json', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Arquivo automático não encontrado ou erro de rede');
            const autoMatches = await response.json();
            renderMatches(autoMatches && autoMatches.length ? autoMatches : LOCAL_SCHEDULE);
        } catch (error) {
            console.warn('Usando agenda manual (Fallback). Motivo:', error.message);
            renderMatches(LOCAL_SCHEDULE);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data a confirmar';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month} - ${hours}:${minutes}`;
    }

    function renderMatches(matches) {
        if (loadingMsg) loadingMsg.style.display = 'none';

        scheduleList.querySelectorAll('.schedule-item').forEach((el) => el.remove());

        if (!matches || matches.length === 0) {
            scheduleList.insertAdjacentHTML('beforeend', '<p class="schedule-empty">Nenhum jogo agendado nos próximos dias.</p>');
            return;
        }

        const fragment = document.createDocumentFragment();

        matches.forEach((match) => {
            const gameCategory = match.game || 'outros';
            const leagueName = match.league || 'Campeonato';
            const matchDate = formatDate(match.date);
            const opponentName = match.opponent || 'A Definir';

            const opponentLogo = (opponentName === 'A Definir') ? null : (match.logo || getAutoLogo(opponentName));
            const redLogo = 'img/redcanalhas-logo.png';

            const opponentImgHtml = opponentLogo
                ? `<img src="${opponentLogo}" alt="${opponentName}" loading="lazy" onerror="this.onerror=null;this.src='img/redcanalhas-logo.png'">`
                : '';

            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.setAttribute('data-category', gameCategory);

            const activeTab = document.querySelector('.schedule-tabs button.active');
            const currentFilter = activeTab ? activeTab.getAttribute('data-filter') : 'all';
            if (currentFilter !== 'all' && currentFilter !== gameCategory) {
                div.style.display = 'none';
            }

            div.innerHTML = `
                    <div class="team">
                        <img src="${redLogo}" alt="RED Canids" loading="lazy" onerror="this.src='img/redcanalhas-logo.png'">
                        <span>RED</span>
                    </div>
                    <div class="match-info">
                        <div>${matchDate}</div>
                        <strong>VS</strong>
                        <div class="match-league">${leagueName}</div>
                    </div>
                    <div class="team">
                        <span>${opponentName}</span>
                        ${opponentImgHtml}
                    </div>
            `;
            fragment.appendChild(div);
        });

        scheduleList.appendChild(fragment);
    }

    fetchMatches();

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.getAttribute('data-filter');
            document.querySelectorAll('.schedule-item').forEach((item) => {
                const category = item.getAttribute('data-category');
                item.style.display = (filter === 'all' || filter === category) ? 'flex' : 'none';
            });
        });
    });
});

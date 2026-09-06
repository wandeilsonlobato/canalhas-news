document.addEventListener('DOMContentLoaded', async () => {
    const teamASelect = document.getElementById('teamA-select');
    const teamBSelect = document.getElementById('teamB-select');
    const teamsResult = document.getElementById('teams-result');

    const playerASelect = document.getElementById('playerA-select');
    const playerBSelect = document.getElementById('playerB-select');
    const playersResult = document.getElementById('players-result');

    if (!teamASelect) return;

    // Mesmo truque da tier list: as fotos/logos da API da Riot vem enormes
    // pra um avatar pequeno, passa pelo wsrv.nl pra baixar ja no tamanho
    // certo e bem mais leve.
    function optimizedImg(url, size = 120) {
        if (!url || !/^https?:\/\//.test(url)) return url;
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&q=80&output=webp`;
    }

    async function fetchJson(url, fallback) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('falhou');
            return await res.json();
        } catch {
            return fallback;
        }
    }

    const standings = await fetchJson('data/standings.json', []);
    const cblolStandings = standings.find((s) => /^cblol/i.test(s.league || ''));
    const teams = cblolStandings ? cblolStandings.teams : [];

    const matches = await fetchJson('data/cblol_matches.json', []);
    const players = await fetchJson('data/cblol_players.json', []);

    function fillSelect(select, options, labelFn) {
        select.innerHTML = options.map((opt, i) => `<option value="${i}">${labelFn(opt)}</option>`).join('');
    }

    fillSelect(teamASelect, teams, (t) => t.name);
    fillSelect(teamBSelect, teams, (t) => t.name);
    if (teams.length > 1) teamBSelect.selectedIndex = 1;

    fillSelect(playerASelect, players, (p) => `${p.name} (${p.team})`);
    fillSelect(playerBSelect, players, (p) => `${p.name} (${p.team})`);
    if (players.length > 1) playerBSelect.selectedIndex = 1;

    function headToHead(nameA, nameB) {
        const relevant = matches.filter((m) => {
            const names = [m.teamA.name, m.teamB.name];
            return m.state === 'completed' && names.includes(nameA) && names.includes(nameB);
        });

        let winsA = 0;
        let winsB = 0;
        relevant.forEach((m) => {
            if (m.result?.winner === nameA) winsA += 1;
            else if (m.result?.winner === nameB) winsB += 1;
        });

        return { matches: relevant, winsA, winsB };
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function renderTeams() {
        const teamA = teams[teamASelect.value];
        const teamB = teams[teamBSelect.value];
        if (!teamA || !teamB) return;

        if (teamA.name === teamB.name) {
            teamsResult.innerHTML = '<p class="compare-note">Escolha dois times diferentes pra comparar.</p>';
            return;
        }

        const h2h = headToHead(teamA.name, teamB.name);

        const totalGames = h2h.winsA + h2h.winsB;
        const pctA = totalGames ? Math.round((h2h.winsA / totalGames) * 100) : 50;

        const matchListHtml = h2h.matches.length
            ? h2h.matches.map((m) => `
                <div class="h2h-match">
                    <span class="h2h-date">${formatDate(m.date)}</span>
                    <span class="h2h-teams">${m.teamA.code} <strong>${m.result.teamAWins}-${m.result.teamBWins}</strong> ${m.teamB.code}</span>
                    <span class="h2h-block">${m.block || ''}</span>
                </div>
            `).join('')
            : '<p class="compare-note">Esses dois times ainda não se enfrentaram no histórico do CBLOL.</p>';

        teamsResult.innerHTML = `
            <div class="compare-cards">
                <div class="compare-card">
                    <img src="${optimizedImg(teamA.logo) || 'img/redcanalhas-logo.png'}" alt="${teamA.name}" loading="lazy">
                    <h3>${teamA.name}</h3>
                    <span class="compare-tag-pos">${teamA.position}º na classificação</span>
                    <span class="compare-tag-record">${teamA.wins}V - ${teamA.losses}D</span>
                </div>
                <div class="compare-vs-big">VS</div>
                <div class="compare-card">
                    <img src="${optimizedImg(teamB.logo) || 'img/redcanalhas-logo.png'}" alt="${teamB.name}" loading="lazy">
                    <h3>${teamB.name}</h3>
                    <span class="compare-tag-pos">${teamB.position}º na classificação</span>
                    <span class="compare-tag-record">${teamB.wins}V - ${teamB.losses}D</span>
                </div>
            </div>

            <h4 class="compare-section-title">Confronto direto (histórico completo do CBLOL)</h4>
            <div class="h2h-summary">
                <span class="h2h-score">${h2h.winsA}</span>
                <div class="h2h-bar"><div class="h2h-bar-fill" style="width:${pctA}%"></div></div>
                <span class="h2h-score">${h2h.winsB}</span>
            </div>
            <div class="h2h-list">${matchListHtml}</div>
        `;
    }

    function renderPlayers() {
        const playerA = players[playerASelect.value];
        const playerB = players[playerBSelect.value];
        if (!playerA || !playerB) return;

        if (playerA.id === playerB.id) {
            playersResult.innerHTML = '<p class="compare-note">Escolha dois jogadores diferentes pra comparar.</p>';
            return;
        }

        let contextHtml;
        if (playerA.team === playerB.team) {
            contextHtml = `<p class="compare-note">${playerA.name} e ${playerB.name} são companheiros de time na ${playerA.team}.</p>`;
        } else {
            const h2h = headToHead(playerA.team, playerB.team);
            const totalGames = h2h.winsA + h2h.winsB;
            contextHtml = totalGames
                ? `<p class="compare-note">Times dos dois já se enfrentaram no histórico do CBLOL: <strong>${playerA.team} ${h2h.winsA} x ${h2h.winsB} ${playerB.team}</strong>.</p>`
                : `<p class="compare-note">${playerA.team} e ${playerB.team} ainda não se enfrentaram no histórico do CBLOL.</p>`;
        }

        playersResult.innerHTML = `
            <div class="compare-cards">
                <div class="compare-card">
                    <img src="${optimizedImg(playerA.image) || 'img/redcanalhas-logo.png'}" alt="${playerA.name}" loading="lazy">
                    <h3>${playerA.name}</h3>
                    <span class="compare-tag-pos">${(playerA.role || '').toUpperCase()}</span>
                    <span class="compare-tag-record">${playerA.team}</span>
                </div>
                <div class="compare-vs-big">VS</div>
                <div class="compare-card">
                    <img src="${optimizedImg(playerB.image) || 'img/redcanalhas-logo.png'}" alt="${playerB.name}" loading="lazy">
                    <h3>${playerB.name}</h3>
                    <span class="compare-tag-pos">${(playerB.role || '').toUpperCase()}</span>
                    <span class="compare-tag-record">${playerB.team}</span>
                </div>
            </div>
            ${contextHtml}
        `;
    }

    teamASelect.addEventListener('change', renderTeams);
    teamBSelect.addEventListener('change', renderTeams);
    playerASelect.addEventListener('change', renderPlayers);
    playerBSelect.addEventListener('change', renderPlayers);

    if (teams.length) renderTeams();
    if (players.length) renderPlayers();

    const tabs = document.querySelectorAll('.compare-tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.compare-board').forEach((board) => {
                board.hidden = board.dataset.board !== tab.dataset.tab;
            });
        });
    });
});

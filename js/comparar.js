document.addEventListener('DOMContentLoaded', async () => {
    const teamASelect = document.getElementById('teamA-select');
    const teamBSelect = document.getElementById('teamB-select');
    const teamsResult = document.getElementById('teams-result');

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

    function fillSelect(select, options, labelFn) {
        select.innerHTML = options.map((opt, i) => `<option value="${i}">${labelFn(opt)}</option>`).join('');
    }

    fillSelect(teamASelect, teams, (t) => t.name);
    fillSelect(teamBSelect, teams, (t) => t.name);
    if (teams.length > 1) teamBSelect.selectedIndex = 1;

    function seriesFormat(gamesPlayed) {
        if (gamesPlayed <= 1) return 'bo1';
        if (gamesPlayed <= 3) return 'bo3';
        return 'bo5';
    }

    function headToHead(nameA, nameB) {
        const relevant = matches.filter((m) => {
            const names = [m.teamA.name, m.teamB.name];
            return m.state === 'completed' && names.includes(nameA) && names.includes(nameB);
        });

        let winsA = 0;
        let winsB = 0;
        let gamesWonA = 0;
        let gamesWonB = 0;
        const byFormat = {
            bo1: { a: 0, b: 0 },
            bo3: { a: 0, b: 0 },
            bo5: { a: 0, b: 0 },
        };

        relevant.forEach((m) => {
            const aIsTeamA = m.teamA.name === nameA;
            const gamesA = aIsTeamA ? m.result.teamAWins : m.result.teamBWins;
            const gamesB = aIsTeamA ? m.result.teamBWins : m.result.teamAWins;
            gamesWonA += gamesA;
            gamesWonB += gamesB;

            const format = seriesFormat(gamesA + gamesB);
            const won = m.result?.winner === nameA;
            if (won) { winsA += 1; byFormat[format].a += 1; }
            else { winsB += 1; byFormat[format].b += 1; }
        });

        return {
            matches: relevant, winsA, winsB, gamesWonA, gamesWonB, byFormat,
        };
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

        const totalGamesPlayed = h2h.gamesWonA + h2h.gamesWonB;
        const pctA = totalGamesPlayed ? Math.round((h2h.gamesWonA / totalGamesPlayed) * 100) : 50;

        const logoByName = { [teamA.name]: teamA.logo, [teamB.name]: teamB.logo };
        const fallbackLogo = 'img/redcanalhas-logo.png';

        const matchListHtml = h2h.matches.length
            ? h2h.matches.map((m) => {
                const aWon = m.result?.winner === m.teamA.name;
                const logoA = optimizedImg(logoByName[m.teamA.name], 40) || fallbackLogo;
                const logoB = optimizedImg(logoByName[m.teamB.name], 40) || fallbackLogo;
                return `
                <div class="h2h-match">
                    <span class="h2h-date">${formatDate(m.date)}</span>
                    <span class="h2h-teams">
                        <img class="h2h-logo" src="${logoA}" alt="${m.teamA.name}" loading="lazy">
                        <span class="${aWon ? 'h2h-winner' : 'h2h-loser'}">${m.teamA.code}</span>
                        <strong>${m.result.teamAWins}-${m.result.teamBWins}</strong>
                        <span class="${aWon ? 'h2h-loser' : 'h2h-winner'}">${m.teamB.code}</span>
                        <img class="h2h-logo" src="${logoB}" alt="${m.teamB.name}" loading="lazy">
                    </span>
                    <span class="h2h-block">${m.block || ''}</span>
                </div>
            `;
            }).join('')
            : '<p class="compare-note">Esses dois times ainda não se enfrentaram no histórico do CBLOL.</p>';

        const breakdownRow = (label, key) => {
            const { a, b } = h2h.byFormat[key];
            const total = a + b;
            const pctA = total ? (a / total) * 100 : 50;
            const pctB = 100 - pctA;
            return `
            <div class="h2h-breakdown-row">
                <span class="h2h-breakdown-value${a > b ? ' is-leading' : ''}">${a}</span>
                <div class="h2h-breakdown-mid">
                    <span class="h2h-breakdown-label">${label}</span>
                    <div class="h2h-breakdown-bar">
                        <div class="h2h-breakdown-fill h2h-bar-a" style="width:${pctA}%"></div>
                        <div class="h2h-breakdown-fill h2h-bar-b" style="width:${pctB}%"></div>
                    </div>
                </div>
                <span class="h2h-breakdown-value${b > a ? ' is-leading' : ''}">${b}</span>
            </div>
        `;
        };

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
                <span class="h2h-score${h2h.gamesWonA > h2h.gamesWonB ? ' is-leading' : ''}">${h2h.gamesWonA}</span>
                <div class="h2h-summary-mid">
                    <span class="h2h-summary-label">Jogos ganhos</span>
                    <div class="h2h-bar">
                        <div class="h2h-bar-fill h2h-bar-a" style="width:${pctA}%"></div>
                        <div class="h2h-bar-fill h2h-bar-b" style="width:${100 - pctA}%"></div>
                    </div>
                </div>
                <span class="h2h-score${h2h.gamesWonB > h2h.gamesWonA ? ' is-leading' : ''}">${h2h.gamesWonB}</span>
            </div>

            <div class="h2h-breakdown">
                ${breakdownRow('BO1', 'bo1')}
                ${breakdownRow('BO3', 'bo3')}
                ${breakdownRow('BO5', 'bo5')}
            </div>

            <h4 class="compare-section-title">Jogos entre os dois</h4>
            <div class="h2h-list">${matchListHtml}</div>
        `;
    }

    teamASelect.addEventListener('change', renderTeams);
    teamBSelect.addEventListener('change', renderTeams);

    if (teams.length) renderTeams();
});

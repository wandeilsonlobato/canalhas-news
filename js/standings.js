document.addEventListener('DOMContentLoaded', function () {
    const lolBody = document.getElementById('lol-standings-body');
    const academyBody = document.getElementById('academy-standings-body');
    if (!lolBody && !academyBody) return;

    function ordinal(n) {
        return `${n}º`;
    }

    function buildRows(teams) {
        return teams.map((team) => {
            const isRed = (team.code || '').toUpperCase() === 'RED';
            const logo = team.logo || 'img/redcanalhas-logo.png';
            return `
                <tr${isRed ? ' class="highlight-row"' : ''}>
                    <td class="rank">${ordinal(team.position)}</td>
                    <td><div class="team-cell"><img src="${logo}" class="team-logo-mini" loading="lazy" onerror="this.onerror=null;this.src='img/redcanalhas-logo.png'"> ${team.name}</div></td>
                    <td>${team.wins}V - ${team.losses}D na fase regular</td>
                </tr>
            `;
        }).join('');
    }

    function splitLabelFromSlug(slug) {
        const match = /split_(\d+)/.exec(slug || '');
        return match ? `Split ${match[1]}` : '';
    }

    function renderLeague(entry, tbody, nameEl, metaEl, namePrefix) {
        if (!entry || !entry.teams || !entry.teams.length || !tbody) return;

        tbody.innerHTML = buildRows(entry.teams);

        const red = entry.teams.find((t) => (t.code || '').toUpperCase() === 'RED');
        const splitLabel = splitLabelFromSlug(entry.tournamentSlug);

        if (nameEl && splitLabel) nameEl.textContent = `${namePrefix} 2026 - ${splitLabel}`;
        if (metaEl && red) {
            metaEl.textContent = `${ordinal(red.position)} lugar na fase regular (${red.wins}-${red.losses})`;
        }

        // Se o card já estiver aberto (acordeão), recalcula a altura pra
        // não cortar as linhas novas que acabaram de entrar na tabela.
        const details = tbody.closest('.champ-details');
        if (details && details.style.maxHeight) {
            details.style.maxHeight = `${details.scrollHeight}px`;
        }
    }

    fetch('data/standings.json')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
            if (!Array.isArray(data) || !data.length) return;

            const lolEntry = data.find((d) => /^cblol/i.test(d.league || ''));
            const academyEntry = data.find((d) => /desafiante/i.test(d.league || ''));

            renderLeague(
                lolEntry, lolBody,
                document.getElementById('lol-champ-name'),
                document.getElementById('lol-champ-meta'),
                'CBLOL',
            );
            renderLeague(
                academyEntry, academyBody,
                document.getElementById('academy-champ-name'),
                document.getElementById('academy-champ-meta'),
                'Circuito Desafiante',
            );
        })
        .catch((err) => {
            console.warn('Não foi possível carregar a classificação ao vivo. Mantendo dados manuais.', err.message);
        });
});

const fs = require('fs');
const path = require('path');

// Busca dados de LoL (CBLOL e ligas relacionadas) na API não-oficial que
// alimenta o lolesports.com. Mescla os resultados com o que o fetch-data.js
// (PandaScore) já escreveu em data/matches.json e data/results.json,
// substituindo apenas as entradas da categoria "lol" por dados mais precisos.

const API_KEY = process.env.LOLESPORTS_KEY;
const BASE_URL = 'https://esports-api.lolesports.com/persisted/gw';
// A API da Riot já usou "RED Canids", "RED Canids Kalunga" e agora usa
// só "RED Kalunga" - casa qualquer uma dessas variações, e também usa o
// código do time ("RED") como reforço caso o nome mude de novo no futuro.
const TEAM_MATCH = /red\s*canids|red\s*kalunga/i;
const REGION_HINT = /brazil|brasil|cblol|desafiante/i;

const MATCHES_FILE = path.join(__dirname, 'data', 'matches.json');
const RESULTS_FILE = path.join(__dirname, 'data', 'results.json');

async function api(endpoint, params) {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set('hl', 'pt-BR');
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
    if (!res.ok) throw new Error(`${endpoint} -> ${res.status} ${res.statusText}`);
    return res.json();
}

function readJsonSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return [];
    }
}

function teamInMatch(match) {
    return (match.teams || []).find((t) => {
        const code = (t.code || '').toUpperCase();
        return TEAM_MATCH.test(t.name || '') || code === 'RED';
    });
}

function opponentOf(match, redTeam) {
    return (match.teams || []).find((t) => t !== redTeam);
}

async function main() {
    if (!API_KEY) {
        console.log('LOLESPORTS_KEY não configurada, pulando busca de dados de LoL Esports.');
        process.exit(0);
    }

    try {
        console.log('Buscando ligas de LoL Esports...');
        const leaguesRes = await api('getLeagues');
        const leagues = leaguesRes?.data?.leagues || [];

        const brazilLeagues = leagues.filter(
            (l) => REGION_HINT.test(l.name || '') || REGION_HINT.test(l.region || '')
        );

        if (brazilLeagues.length === 0) {
            console.log('Nenhuma liga brasileira encontrada (CBLOL). Mantendo dados existentes.');
            process.exit(0);
        }

        console.log('Ligas encontradas:', brazilLeagues.map((l) => l.name).join(', '));

        const upcoming = [];
        const finished = [];

        for (const league of brazilLeagues) {
            let scheduleRes;
            try {
                scheduleRes = await api('getSchedule', { leagueId: league.id });
            } catch (err) {
                console.warn(`Falha ao buscar agenda de ${league.name}:`, err.message);
                continue;
            }

            const events = scheduleRes?.data?.schedule?.events || [];

            events.forEach((event) => {
                const match = event.match;
                if (!match) return;

                const redTeam = teamInMatch(match);
                if (!redTeam) return;

                const opponent = opponentOf(match, redTeam);
                const opponentName = opponent?.name || 'A Definir';

                const base = {
                    game: 'lol',
                    league: league.name + (event.blockName ? ` - ${event.blockName}` : ''),
                    date: event.startTime,
                    opponent: opponentName,
                    logo: opponent?.image || null,
                };

                if (event.state === 'completed') {
                    const redResult = redTeam.result;
                    const oppResult = opponent?.result;
                    let result = null;
                    if (redResult && oppResult) {
                        result = redResult.outcome === 'win'
                            ? `V ${redResult.gameWins}-${oppResult.gameWins}`
                            : `D ${redResult.gameWins}-${oppResult.gameWins}`;
                    }
                    finished.push({ ...base, result });
                } else {
                    upcoming.push(base);
                }
            });
        }

        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        finished.sort((a, b) => new Date(b.date) - new Date(a.date));

        const existingMatches = readJsonSafe(MATCHES_FILE).filter((m) => m.game !== 'lol');
        const existingResults = readJsonSafe(RESULTS_FILE).filter((m) => m.game !== 'lol');

        const dir = path.dirname(MATCHES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(MATCHES_FILE, JSON.stringify([...existingMatches, ...upcoming], null, 2));
        fs.writeFileSync(RESULTS_FILE, JSON.stringify([...existingResults, ...finished.slice(0, 10)], null, 2));

        console.log(`LoL Esports: ${upcoming.length} partida(s) futura(s), ${finished.length} finalizada(s) encontrada(s) para a RED Canids.`);
    } catch (error) {
        console.error('Falha ao buscar dados do LoL Esports:', error.message);
        // Não quebra o build; mantém os dados que já existiam.
        process.exit(0);
    }
}

main();

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

// Jogadores que a API da Riot ainda lista no elenco, mas que não devem
// aparecer na tier list (saíram do time, são registros antigos etc.).
const EXCLUDED_PLAYERS = new Set([
    'mago', 'supercleber', 'zay', 'qats', 'buero', 'smooth',
    'nukenin', 'nanashi', 'frosty', 'jmz', 'keine', 'curty', 'prodelta',
    'luukz',
]);

const MATCHES_FILE = path.join(__dirname, 'data', 'matches.json');
const RESULTS_FILE = path.join(__dirname, 'data', 'results.json');
const STANDINGS_FILE = path.join(__dirname, 'data', 'standings.json');
const CBLOL_PLAYERS_FILE = path.join(__dirname, 'data', 'cblol_players.json');

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

// A API da Riot devolve os logos em http:// - o site é servido em https://,
// então force https aqui pra evitar bloqueio de conteúdo misto no navegador.
function toHttps(url) {
    return url ? url.replace(/^http:/, 'https:') : url;
}

// Busca a classificação (fase de pontos corridos) do torneio atualmente em
// andamento de uma liga. Retorna null se a liga não tiver uma fase com
// tabela de classificação no momento (ex: só bracket eliminatório).
async function fetchStandings(league) {
    let tournamentsRes;
    try {
        tournamentsRes = await api('getTournamentsForLeague', { leagueId: league.id });
    } catch (err) {
        console.warn(`Falha ao buscar torneios de ${league.name}:`, err.message);
        return null;
    }

    const tournaments = tournamentsRes?.data?.leagues?.[0]?.tournaments || [];
    if (!tournaments.length) return null;

    const now = new Date();
    const current = tournaments.find((t) => now >= new Date(t.startDate) && now <= new Date(t.endDate))
        || tournaments[0];

    let standingsRes;
    try {
        standingsRes = await api('getStandings', { tournamentId: current.id });
    } catch (err) {
        console.warn(`Falha ao buscar classificação de ${league.name}:`, err.message);
        return null;
    }

    const stages = standingsRes?.data?.standings?.[0]?.stages || [];
    let rankings = [];
    for (const stage of stages) {
        for (const section of stage.sections || []) {
            if (section.rankings && section.rankings.length) {
                rankings = section.rankings;
                break;
            }
        }
        if (rankings.length) break;
    }
    if (!rankings.length) return null;

    const teams = rankings
        .map((r) => {
            const t = r.teams?.[0];
            if (!t) return null;
            return {
                id: t.id,
                position: r.ordinal,
                name: t.name,
                code: t.code,
                logo: toHttps(t.image) || null,
                wins: t.record?.wins ?? 0,
                losses: t.record?.losses ?? 0,
            };
        })
        .filter(Boolean);

    return { league: league.name, tournamentSlug: current.slug, teams };
}

// Busca o elenco (nome, foto, função) de cada time listado na classificação
// do CBLOL, pra alimentar a tier list de jogadores do site.
async function fetchCblolPlayers(cblolStandings) {
    const players = [];

    for (const team of cblolStandings.teams) {
        if (!team.id) continue;
        let teamRes;
        try {
            teamRes = await api('getTeams', { id: team.id });
        } catch (err) {
            console.warn(`Falha ao buscar elenco de ${team.name}:`, err.message);
            continue;
        }

        const teamData = teamRes?.data?.teams?.[0];
        (teamData?.players || []).forEach((p) => {
            if (EXCLUDED_PLAYERS.has((p.summonerName || '').toLowerCase())) return;
            players.push({
                id: p.id,
                name: p.summonerName,
                role: p.role,
                image: toHttps(p.image) || null,
                team: team.name,
                teamLogo: team.logo,
            });
        });
    }

    return players;
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
                    logo: toHttps(opponent?.image) || null,
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

        const standings = [];
        for (const league of brazilLeagues) {
            const result = await fetchStandings(league);
            if (result) standings.push(result);
        }

        let cblolPlayers = [];
        const cblolStandings = standings.find((s) => /^cblol/i.test(s.league || ''));
        if (cblolStandings) {
            cblolPlayers = await fetchCblolPlayers(cblolStandings);
        }

        const existingMatches = readJsonSafe(MATCHES_FILE).filter((m) => m.game !== 'lol');
        const existingResults = readJsonSafe(RESULTS_FILE).filter((m) => m.game !== 'lol');

        const dir = path.dirname(MATCHES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(MATCHES_FILE, JSON.stringify([...existingMatches, ...upcoming], null, 2));
        fs.writeFileSync(RESULTS_FILE, JSON.stringify([...existingResults, ...finished.slice(0, 10)], null, 2));
        fs.writeFileSync(STANDINGS_FILE, JSON.stringify(standings, null, 2));
        fs.writeFileSync(CBLOL_PLAYERS_FILE, JSON.stringify(cblolPlayers, null, 2));

        console.log(`LoL Esports: ${upcoming.length} partida(s) futura(s), ${finished.length} finalizada(s), classificação de ${standings.length} liga(s), ${cblolPlayers.length} jogador(es) do CBLOL encontrado(s).`);
    } catch (error) {
        console.error('Falha ao buscar dados do LoL Esports:', error.message);
        // Não quebra o build; mantém os dados que já existiam.
        process.exit(0);
    }
}

main();

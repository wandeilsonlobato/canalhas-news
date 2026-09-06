// Script de DIAGNOSTICO (nao faz parte da automacao normal do site) -
// serve so pra confirmar se a chave da PandaScore da acesso a dado
// detalhado de partida (KDA, CS, ouro por jogador) pra CBLOL, antes de
// eu construir uma tela de comparacao em cima disso.
//
// Depois de rodar e conferir o resultado, pode apagar este arquivo.

const API_KEY = process.env.PANDASCORE_KEY;
const TEAM_ID = 161; // RED Canids - ID confirmado na PandaScore (o antigo, 1266, estava errado)

async function main() {
    if (!API_KEY) {
        console.log('PANDASCORE_KEY nao configurada.');
        return;
    }

    console.log('\n--- Buscando as ultimas partidas finalizadas da RED (todos os jogos) ---');
    const pastUrl = `https://api.pandascore.co/matches/past?filter[opponent_id]=${TEAM_ID}&sort=-begin_at&page[size]=10&token=${API_KEY}`;
    const pastRes = await fetch(pastUrl);
    if (!pastRes.ok) {
        console.log('Falha ao buscar partida:', pastRes.status, await pastRes.text());
        return;
    }
    const matches = await pastRes.json();
    console.log(`Encontradas ${matches.length} partida(s) no total (todos os jogos).`);
    matches.forEach((m) => console.log(' -', m.videogame?.slug, '|', m.name, '| id:', m.id));

    const match = matches.find((m) => m.videogame?.slug === 'league-of-legends');
    if (!match) {
        console.log('Nenhuma partida de League of Legends encontrada nessas 10.');
        return;
    }

    console.log('\nUsando esta partida de LoL:', match.name, '| id:', match.id, '| games:', (match.games || []).map((g) => g.id));

    if (!match.games || !match.games.length) {
        console.log('A partida nao tem sub-jogos listados.');
        return;
    }

    const gameId = match.games[0].id;
    console.log('\n--- Buscando detalhes do game', gameId, '---');
    const gameUrl = `https://api.pandascore.co/lol/games/${gameId}?token=${API_KEY}`;
    const gameRes = await fetch(gameUrl);
    console.log('Status:', gameRes.status);
    const gameData = await gameRes.json();
    console.log(JSON.stringify(gameData, null, 2).slice(0, 3000));

    console.log('\n--- Testando players/stats do game (se existir) ---');
    const playersUrl = `https://api.pandascore.co/lol/games/${gameId}/players/stats?token=${API_KEY}`;
    const playersRes = await fetch(playersUrl);
    console.log('Status players/stats:', playersRes.status);
    const playersText = await playersRes.text();
    console.log(playersText.slice(0, 3000));
}

main().catch((err) => console.error('Erro:', err.message));

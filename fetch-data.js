const fs = require('fs');
const path = require('path');

// Configurações
const API_KEY = process.env.PANDASCORE_KEY; // A chave virá do GitHub Secrets
const TEAM_ID = 1266; // ID da RED Canids (Confirme se é este mesmo)
const OUTPUT_FILE = path.join(__dirname, 'data', 'matches.json');
const OUTPUT_FILE_RESULTS = path.join(__dirname, 'data', 'results.json');

// Mapeamento de Slugs da PandaScore para nossas categorias.
// CS2 e Valorant foram descontinuados pela organização em 2026; a PandaScore
// não cobre Brawl Stars, então a agenda dessa modalidade segue manual por ora.
const GAME_MAP = {
    'league-of-legends': 'lol'
};

async function fetchMatches() {
    if (!API_KEY) {
        console.error('ERRO: Chave da API não encontrada.');
        process.exit(1);
    }

    try {
        console.log('Buscando dados da PandaScore...');
        
        // 1. Busca partidas futuras (Upcoming)
        const upcomingUrl = `https://api.pandascore.co/matches/upcoming?filter[opponent_id]=${TEAM_ID}&sort=begin_at&token=${API_KEY}`;
        
        // 2. Busca partidas passadas (Past) - Últimos 10 jogos
        const pastUrl = `https://api.pandascore.co/matches/past?filter[opponent_id]=${TEAM_ID}&sort=-begin_at&page[size]=10&token=${API_KEY}`;
        
        const [upcomingRes, pastRes] = await Promise.all([
            fetch(upcomingUrl),
            fetch(pastUrl)
        ]);

        if (!upcomingRes.ok) throw new Error(`Erro API Upcoming: ${upcomingRes.statusText}`);
        if (!pastRes.ok) throw new Error(`Erro API Past: ${pastRes.statusText}`);
        
        const upcomingMatches = await upcomingRes.json();
        const pastMatches = await pastRes.json();
        
        // Função auxiliar para simplificar os dados
        const simplify = (match) => {
            // Encontra o oponente (quem NÃO é a RED Canids)
            const opponent = match.opponents.find(op => op.opponent.id !== TEAM_ID)?.opponent;
            
            // Define a categoria do jogo (LoL, CS2, etc)
            const gameSlug = match.videogame.slug;
            const gameCategory = GAME_MAP[gameSlug] || 'outros';

            // Calcula o resultado se a partida já acabou
            let scoreResult = null;
            if (match.status === 'finished' && match.results && match.results.length > 0) {
                const redResult = match.results.find(r => r.team_id === TEAM_ID);
                const oppResult = match.results.find(r => r.team_id !== TEAM_ID);
                
                if (redResult && oppResult) {
                    const redScore = redResult.score;
                    const oppScore = oppResult.score;
                    scoreResult = redScore > oppScore ? `V ${redScore}-${oppScore}` : `D ${redScore}-${oppScore}`;
                }
            }

            return {
                game: gameCategory,
                league: match.league.name + (match.serie ? ` - ${match.serie.full_name}` : ''),
                date: match.begin_at,
                opponent: opponent ? opponent.name : 'A Definir',
                logo: opponent ? opponent.image_url : null,
                result: scoreResult
            };
        };

        const simplifiedUpcoming = upcomingMatches.map(simplify);
        const simplifiedPast = pastMatches.map(simplify);

        console.log(`Encontradas ${simplifiedUpcoming.length} partidas futuras e ${simplifiedPast.length} resultados passados.`);

        // Garante que a pasta 'data' existe
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        // Salva os arquivos JSON
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(simplifiedUpcoming, null, 2));
        fs.writeFileSync(OUTPUT_FILE_RESULTS, JSON.stringify(simplifiedPast, null, 2));
        
        console.log('Arquivos de dados atualizados com sucesso!');

    } catch (error) {
        console.error('Falha ao buscar dados:', error);
        // Não quebra o build, apenas avisa
        process.exit(0);
    }
}

fetchMatches();
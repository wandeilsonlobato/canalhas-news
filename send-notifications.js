const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

// Compara a agenda/resultados de ANTES desta execução (o que já estava
// commitado no Git) com o que fetch-lolesports.js acabou de escrever, e
// dispara uma notificação push pra cada:
//   - partida nova que entrou na agenda (adversário revelado)
//   - resultado novo que saiu (vitória ou derrota)
//
// Não quebra o workflow se a notificação falhar - agenda/resultado já
// foram salvos por fetch-lolesports.js de qualquer forma.

const MATCHES_FILE = path.join(__dirname, 'data', 'matches.json');
const RESULTS_FILE = path.join(__dirname, 'data', 'results.json');

function readJsonSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return [];
    }
}

function readOldJsonFromGit(relativePath) {
    try {
        const raw = execSync(`git show HEAD:${relativePath}`, { encoding: 'utf8' });
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function matchKey(m) {
    return `${m.date}|${m.opponent}`;
}

function diffNew(oldList, newList) {
    const oldKeys = new Set(oldList.map(matchKey));
    return newList.filter((m) => !oldKeys.has(matchKey(m)));
}

function formatMatchDate(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
        + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function buildNotifications(oldMatches, newMatches, oldResults, newResults) {
    const notifications = [];

    diffNew(oldMatches, newMatches).forEach((m) => {
        notifications.push({
            title: 'Jogo confirmado! 🐺',
            body: `RED Canids x ${m.opponent} - ${formatMatchDate(m.date)} (${m.league})`,
        });
    });

    diffNew(oldResults, newResults).forEach((m) => {
        const won = (m.result || '').startsWith('V');
        notifications.push({
            title: won ? 'RED venceu! 🔴' : 'Fim de jogo',
            body: `${won ? 'Vitória' : 'Derrota'} contra ${m.opponent} (${m.result || ''}) - ${m.league}`,
        });
    });

    return notifications;
}

async function sendToAllTokens(app, notifications) {
    if (!notifications.length) {
        console.log('Nenhuma novidade de agenda/resultado - nenhuma notificação a enviar.');
        return;
    }

    const db = admin.firestore(app);
    const snap = await db.collection('pushTokens').get();
    const tokens = snap.docs.map((d) => d.id);

    if (!tokens.length) {
        console.log(`${notifications.length} notificação(ões) pra enviar, mas ninguém está inscrito ainda.`);
        return;
    }

    const messaging = admin.messaging(app);

    for (const notification of notifications) {
        console.log(`Enviando: "${notification.title}" - "${notification.body}" pra ${tokens.length} inscrito(s)...`);

        const res = await messaging.sendEachForMulticast({
            tokens,
            notification,
            data: { url: 'https://canalhasnews.com.br/index.html#schedule' },
            webpush: { fcmOptions: { link: 'https://canalhasnews.com.br/index.html#schedule' } },
        });

        console.log(`  -> ${res.successCount} enviada(s), ${res.failureCount} falha(s).`);

        const invalidTokens = [];
        res.responses.forEach((r, i) => {
            if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code)) {
                invalidTokens.push(tokens[i]);
            }
        });

        if (invalidTokens.length) {
            const batch = db.batch();
            invalidTokens.forEach((t) => batch.delete(db.collection('pushTokens').doc(t)));
            await batch.commit();
            console.log(`  -> Removidos ${invalidTokens.length} token(s) inválido(s)/expirado(s).`);
        }
    }
}

async function main() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        console.log('FIREBASE_SERVICE_ACCOUNT não configurada, pulando envio de notificações.');
        return;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    // Confirma que a credencial funciona e mostra quantos inscritos existem,
    // mesmo em execuções sem nenhuma novidade de agenda/resultado - assim dá
    // pra saber que a configuração está certa sem esperar um jogo de verdade.
    try {
        const snap = await admin.firestore(app).collection('pushTokens').count().get();
        console.log(`Autenticado no Firebase com sucesso. ${snap.data().count} inscrito(s) registrado(s) no momento.`);
    } catch (error) {
        console.error('Falha ao autenticar no Firebase:', error.message);
        return;
    }

    const oldMatches = readOldJsonFromGit('data/matches.json');
    const newMatches = readJsonSafe(MATCHES_FILE);
    const oldResults = readOldJsonFromGit('data/results.json');
    const newResults = readJsonSafe(RESULTS_FILE);

    const notifications = buildNotifications(oldMatches, newMatches, oldResults, newResults);

    if (!notifications.length) {
        console.log('Nenhuma novidade de agenda/resultado nesta execução.');
        return;
    }

    try {
        await sendToAllTokens(app, notifications);
    } catch (error) {
        console.error('Falha ao enviar notificações push:', error.message);
    }
}

main();

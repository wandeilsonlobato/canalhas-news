import { firebaseConfig, VAPID_KEY } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getMessaging, getToken, deleteToken, isSupported,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';
import {
    getFirestore, doc, setDoc, deleteDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const isConfigured = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('COLE_AQUI')
    && !!VAPID_KEY && !VAPID_KEY.startsWith('COLE_AQUI');

const STORAGE_KEY = 'canalhas_push_token';

function getButton() {
    return document.querySelector('.push-toggle-btn');
}

function setButtonState(active) {
    const btn = getButton();
    if (!btn) return;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.title = active
        ? 'Notificações ativadas - clique pra desativar'
        : 'Ativar notificações de jogos da RED';
}

async function main() {
    const btn = getButton();
    if (!btn) return;

    if (!isConfigured || !('serviceWorker' in navigator) || !('Notification' in window)) {
        btn.hidden = true;
        return;
    }

    const supported = await isSupported().catch(() => false);
    if (!supported) {
        btn.hidden = true;
        return;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const db = getFirestore(app);

    setButtonState(Notification.permission === 'granted' && !!localStorage.getItem(STORAGE_KEY));

    btn.addEventListener('click', async () => {
        const alreadyOn = !!localStorage.getItem(STORAGE_KEY);

        if (alreadyOn) {
            const token = localStorage.getItem(STORAGE_KEY);
            try {
                await deleteDoc(doc(db, 'pushTokens', token));
                await deleteToken(messaging);
            } catch (err) {
                console.warn('[Push] Falha ao cancelar inscrição:', err.message);
            }
            localStorage.removeItem(STORAGE_KEY);
            setButtonState(false);
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
            if (!token) return;

            await setDoc(doc(db, 'pushTokens', token), {
                token,
                createdAt: serverTimestamp(),
                userAgent: navigator.userAgent,
            });

            localStorage.setItem(STORAGE_KEY, token);
            setButtonState(true);
        } catch (err) {
            console.error('[Push] Falha ao ativar notificações:', err.message);
            alert('Não foi possível ativar as notificações agora. Tente de novo mais tarde.');
        }
    });
}

document.addEventListener('DOMContentLoaded', main);

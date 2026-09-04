// Service worker das notificações push (Firebase Cloud Messaging).
// Precisa ficar na raiz do site pra poder receber notificações mesmo
// com a aba fechada. A config aqui é a mesma (pública) de
// js/firebase-config.js - um service worker clássico não consegue
// importar módulos ES normalmente, então duplicamos os valores.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCl2QVPCwLb81KHGvtHchtjmc6fWz1bO2c',
    authDomain: 'canalhasnews.firebaseapp.com',
    projectId: 'canalhasnews',
    storageBucket: 'canalhasnews.firebasestorage.app',
    messagingSenderId: '321981307265',
    appId: '1:321981307265:web:c55fb5442dfc4e10157080',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Canalhas News';
    const body = (payload.notification && payload.notification.body) || '';
    const url = (payload.data && payload.data.url) || '/';

    self.registration.showNotification(title, {
        body,
        icon: '/img/redcanalhas-logo.png',
        badge: '/img/redcanalhas-logo.png',
        data: { url },
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(clients.openWindow(url));
});

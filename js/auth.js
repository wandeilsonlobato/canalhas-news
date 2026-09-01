import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getFirestore, doc, getDoc, setDoc, deleteDoc, getDocs, collection, query,
    where, orderBy, onSnapshot, addDoc, serverTimestamp, limit,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const isConfigured = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('COLE_AQUI');

if (!isConfigured) {
    console.warn('[Canalhas Auth] Firebase ainda não foi configurado (js/firebase-config.js). Login, favoritos e comentários ficam desativados até isso ser preenchido.');
}

const app = isConfigured ? initializeApp(firebaseConfig) : null;
const auth = isConfigured ? getAuth(app) : null;
const db = isConfigured ? getFirestore(app) : null;
const provider = isConfigured ? new GoogleAuthProvider() : null;

let currentUser = null;
let favoriteIds = new Set();

function isAdmin(user) {
    return !!user && !!user.email && ADMIN_EMAILS.includes(user.email);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function login() {
    if (!isConfigured) {
        alert('O login com Google ainda não foi configurado neste site.');
        return;
    }
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
            console.error('[Canalhas Auth] Falha no login:', err);
            alert('Não foi possível entrar com o Google. Tente novamente.');
        }
    }
}

async function logout() {
    if (!isConfigured) return;
    await signOut(auth);
}

async function ensureUserDoc(user) {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        const data = {
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            theme: localStorage.getItem('theme') || 'dark',
            newsletterOptIn: false,
            createdAt: serverTimestamp(),
        };
        await setDoc(ref, data);
        return data;
    }
    return snap.data();
}

/* ---------- Widget de login no topbar ---------- */

function renderAuthWidget(user) {
    document.querySelectorAll('.auth-widget').forEach((widget) => {
        const loginBtn = widget.querySelector('.auth-login-btn');
        const userBox = widget.querySelector('.auth-user');
        if (!loginBtn || !userBox) return;

        if (user) {
            loginBtn.hidden = true;
            userBox.hidden = false;
            const photo = userBox.querySelector('.auth-user-photo');
            const name = userBox.querySelector('.auth-user-name');
            const menuName = userBox.querySelector('.auth-menu-name');
            const menuEmail = userBox.querySelector('.auth-menu-email');
            if (photo) photo.src = user.photoURL || '';
            if (name) name.textContent = (user.displayName || 'Torcedor').split(' ')[0];
            if (menuName) menuName.textContent = user.displayName || '';
            if (menuEmail) menuEmail.textContent = user.email || '';
        } else {
            loginBtn.hidden = false;
            userBox.hidden = true;
            const menu = userBox.querySelector('.auth-menu');
            if (menu) menu.hidden = true;
        }
    });
}

function initAuthWidgetEvents() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.auth-login-btn')) {
            login();
            return;
        }
        const userBtn = e.target.closest('.auth-user-btn');
        if (userBtn) {
            const menu = userBtn.closest('.auth-user')?.querySelector('.auth-menu');
            if (menu) menu.hidden = !menu.hidden;
            return;
        }
        if (e.target.closest('.auth-logout-btn')) {
            e.preventDefault();
            logout();
            return;
        }
        if (!e.target.closest('.auth-user')) {
            document.querySelectorAll('.auth-menu').forEach((m) => { m.hidden = true; });
        }
    });
}

/* ---------- Favoritos ---------- */

async function loadFavorites(uid) {
    favoriteIds = new Set();
    const snap = await getDocs(collection(db, 'users', uid, 'favorites'));
    snap.forEach((d) => favoriteIds.add(d.id));
    renderFavoriteButtons();
}

function renderFavoriteButtons() {
    document.querySelectorAll('[data-fav-id]').forEach((btn) => {
        btn.classList.toggle('is-favorited', favoriteIds.has(btn.dataset.favId));
    });
}

async function toggleFavorite(btn) {
    if (!isConfigured) { login(); return; }
    if (!currentUser) { login(); return; }
    const id = btn.dataset.favId;
    const ref = doc(db, 'users', currentUser.uid, 'favorites', id);
    if (favoriteIds.has(id)) {
        favoriteIds.delete(id);
        btn.classList.remove('is-favorited');
        await deleteDoc(ref);
    } else {
        favoriteIds.add(id);
        btn.classList.add('is-favorited');
        await setDoc(ref, {
            type: btn.dataset.favType || 'item',
            title: btn.dataset.favTitle || '',
            addedAt: serverTimestamp(),
        });
    }
}

function initFavoriteButtons() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-fav-id]');
        if (!btn) return;
        e.preventDefault();
        toggleFavorite(btn);
    });
}

/* ---------- Preferência de tema sincronizada ---------- */

function applyRemoteTheme(theme) {
    if (!theme || localStorage.getItem('theme') === theme) return;
    localStorage.setItem('theme', theme);
    const isLight = theme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
    if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';
}

window.addEventListener('canalhas:theme-change', async (e) => {
    if (!isConfigured || !currentUser) return;
    try {
        await setDoc(doc(db, 'users', currentUser.uid), { theme: e.detail.theme }, { merge: true });
    } catch (err) {
        console.error('[Canalhas Auth] Falha ao salvar tema:', err);
    }
});

/* ---------- Comentários ---------- */

function updateCommentsAuthUI() {
    document.querySelectorAll('[data-article-id]').forEach((section) => {
        const form = section.querySelector('.comment-form');
        const prompt = section.querySelector('.comments-login-prompt');
        if (form) form.hidden = !currentUser;
        if (prompt) prompt.hidden = !!currentUser;
    });
}

function renderComment(docSnap) {
    const c = docSnap.data();
    const canDelete = currentUser && (currentUser.uid === c.uid || isAdmin(currentUser));
    const when = c.createdAt?.toDate
        ? c.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'agora';

    const el = document.createElement('div');
    el.className = 'comment-item';
    el.innerHTML = `
        <img class="comment-avatar" src="${escapeHtml(c.photoURL || '')}" alt="" loading="lazy">
        <div class="comment-body">
            <div class="comment-meta"><strong>${escapeHtml(c.name || 'Torcedor')}</strong><span>${when}</span></div>
            <p class="comment-text"></p>
        </div>
        ${canDelete ? `<button class="comment-delete" type="button" data-comment-id="${docSnap.id}" aria-label="Apagar comentário"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7"/></svg></button>` : ''}
    `;
    el.querySelector('.comment-text').textContent = c.text || '';
    return el;
}

function initComments() {
    const section = document.querySelector('[data-article-id]');
    if (!section) return;

    if (!isConfigured) {
        const list = section.querySelector('.comments-list');
        if (list) list.innerHTML = '<p class="comments-empty">Comentários indisponíveis no momento.</p>';
        return;
    }

    const articleId = section.dataset.articleId;
    const list = section.querySelector('.comments-list');
    const form = section.querySelector('.comment-form');
    const textarea = form?.querySelector('textarea');

    const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId),
        orderBy('createdAt', 'desc'),
        limit(200),
    );

    onSnapshot(q, (snap) => {
        if (!list) return;
        if (snap.empty) {
            list.innerHTML = '<p class="comments-empty">Seja o primeiro a comentar nesta matéria.</p>';
            return;
        }
        list.innerHTML = '';
        snap.forEach((docSnap) => list.appendChild(renderComment(docSnap)));
    }, (err) => {
        console.error('[Canalhas Auth] Falha ao carregar comentários:', err);
        if (list) list.innerHTML = '<p class="comments-empty">Não foi possível carregar os comentários agora.</p>';
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser || !textarea || !textarea.value.trim()) return;
            const text = textarea.value.trim().slice(0, 1000);
            const submitBtn = form.querySelector('button[type="submit"]');
            textarea.value = '';
            if (submitBtn) submitBtn.disabled = true;
            try {
                await addDoc(collection(db, 'comments'), {
                    articleId,
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Torcedor',
                    photoURL: currentUser.photoURL || '',
                    text,
                    createdAt: serverTimestamp(),
                });
            } catch (err) {
                console.error('[Canalhas Auth] Falha ao publicar comentário:', err);
                alert('Não foi possível publicar seu comentário. Tente novamente.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    list?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.comment-delete');
        if (!btn) return;
        if (!confirm('Apagar este comentário?')) return;
        try {
            await deleteDoc(doc(db, 'comments', btn.dataset.commentId));
        } catch (err) {
            console.error('[Canalhas Auth] Falha ao apagar comentário:', err);
        }
    });

    updateCommentsAuthUI();
}

/* ---------- Boot ---------- */

if (isConfigured) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        renderAuthWidget(user);
        updateCommentsAuthUI();
        if (user) {
            try {
                const data = await ensureUserDoc(user);
                if (data?.theme) applyRemoteTheme(data.theme);
                await loadFavorites(user.uid);
            } catch (err) {
                console.error('[Canalhas Auth] Falha ao carregar dados do usuário:', err);
            }
        } else {
            favoriteIds = new Set();
            renderFavoriteButtons();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthWidgetEvents();
    initFavoriteButtons();
    initComments();
});

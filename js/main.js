(function () {
    'use strict';

    function initSidebar() {
        const toggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.app-sidebar');
        const scrim = document.querySelector('.sidebar-scrim');
        if (!toggle || !sidebar) return;

        const isMobile = () => window.innerWidth <= 960;

        toggle.addEventListener('click', () => {
            if (isMobile()) {
                document.body.classList.toggle('nav-open');
            } else {
                document.body.classList.toggle('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
            }
        });

        if (scrim) {
            scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
        }

        sidebar.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                if (isMobile()) document.body.classList.remove('nav-open');
            });
        });

        if (!isMobile() && localStorage.getItem('sidebarCollapsed') === '1') {
            document.body.classList.add('sidebar-collapsed');
        }
    }

    function initThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        const body = document.body;
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (!toggle) return;

        const applyTheme = (isLight) => {
            body.classList.toggle('light-mode', isLight);
            if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
            if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';
        };

        applyTheme(localStorage.getItem('theme') === 'light');

        toggle.addEventListener('click', () => {
            const isLight = !body.classList.contains('light-mode');
            applyTheme(isLight);
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }

    function initActiveNav() {
        const currentPage = location.pathname.split('/').pop() || 'index.html';
        const currentHash = location.hash;

        document.querySelectorAll('.app-nav-link[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http')) return;

            const [hrefPath, hrefHash] = href.split('#');
            const linkPage = hrefPath.split('/').pop() || 'index.html';
            const linkHash = hrefHash ? `#${hrefHash}` : '';

            // Um link com #hash só ativa quando o hash da URL bate exatamente.
            // Um link sem hash só ativa quando a URL também não tem hash
            // (evita "Início" e "Agenda" ficarem ativos ao mesmo tempo).
            const isMatch = linkPage === currentPage && linkHash === currentHash;

            if (isMatch) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    function initScrollReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!items.length) return;

        if (!('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        items.forEach((el, i) => {
            el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
            observer.observe(el);
        });
    }

    function initNewsletterForms() {
        document.querySelectorAll('.newsletter-form').forEach((form) => {
            const button = form.querySelector('button');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const original = button.textContent;
                button.textContent = 'Inscrito!';
                button.disabled = true;
                form.reset();
                setTimeout(() => {
                    button.textContent = original;
                    button.disabled = false;
                }, 2500);
            });
        });
    }

    function initBackToTop() {
        const btn = document.querySelector('.back-to-top');
        if (!btn) return;
        const onScroll = () => btn.classList.toggle('visible', window.scrollY > 500);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSidebar();
        initThemeToggle();
        initActiveNav();
        initScrollReveal();
        initNewsletterForms();
        initBackToTop();
    });
})();

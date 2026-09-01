(function () {
    'use strict';

    function initMobileMenu() {
        const btn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('nav');
        if (!btn || !nav) return;

        btn.setAttribute('aria-expanded', 'false');

        btn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('active');
            btn.classList.toggle('active', isOpen);
            btn.setAttribute('aria-expanded', String(isOpen));
            document.body.classList.toggle('nav-open', isOpen);
        });

        nav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
            });
        });
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

        document.querySelectorAll('nav a[href], .nav-item[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http')) return;

            const linkPage = href.split('#')[0].split('/').pop() || 'index.html';
            if (linkPage === currentPage) {
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

    function initHeaderShrink() {
        const header = document.querySelector('header');
        if (!header) return;
        const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function initNewsletterForm() {
        const form = document.querySelector('.newsletter-form');
        if (!form) return;
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
        initMobileMenu();
        initThemeToggle();
        initActiveNav();
        initScrollReveal();
        initHeaderShrink();
        initNewsletterForm();
        initBackToTop();
    });
})();

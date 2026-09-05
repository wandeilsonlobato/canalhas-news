document.addEventListener('DOMContentLoaded', () => {
    // A aba de times usa tier de verdade (S melhor, D pior). A de jogadores
    // usa rotulos de rota, já que faz mais sentido separar por função.
    const TIER_SETS = {
        players: ['TOP', 'JG', 'MID', 'ADC', 'SUP'],
        teams: ['S', 'A', 'B', 'C', 'D'],
    };
    const TIER_COLOR_PALETTE = ['#e30613', '#ff8a3d', '#ffd23d', '#7ed957', '#4d9de0'];

    // Usado só se data/cblol_players.json não carregar por algum motivo.
    const FALLBACK_PLAYERS = [
        { id: 'zynts', name: 'Zynts', img: 'img/zynts.jpg' },
        { id: 'stepz', name: 'Stepz', img: 'img/stepz.jpg' },
        { id: 'fuuu', name: 'Fuuu', img: 'img/fuuu.jpg' },
        { id: 'morttheus', name: 'Morttheus', img: 'img/morttheus.jpg' },
        { id: 'manel', name: 'Manel', img: 'img/manel.jpg' },
        { id: 'tockers', name: 'Tockers', img: 'img/tockers.jpg' },
        { id: 'mohtep', name: 'Mohtep', img: 'img/mohtep.jpg' },
        { id: 'jubileu', name: 'Jubileu', img: 'img/jubileu.jpg' },
        { id: 'cauebr', name: 'CaueBR', img: 'img/cauebr.jpg' },
        { id: 'peri', name: 'Peri', img: 'img/peri.jpg' },
        { id: 'alchemicalx', name: 'AlchemicalX', img: 'img/alchemicalx.jpg' },
    ];

    const FALLBACK_TEAMS = [
        { id: 'loud', name: 'LOUD', img: 'img/loud-logo.png' },
        { id: 'los', name: 'LOS', img: 'img/los-logo.png' },
        { id: 'vks', name: 'Vivo Keyd Stars', img: 'img/keyd-stars-logo.png' },
        { id: 'furia', name: 'FURIA', img: 'img/furia-esports-logo.png' },
        { id: 'red', name: 'RED Kalunga', img: 'img/redcanalhas-logo.png' },
        { id: 'pain', name: 'paiN Gaming', img: 'img/pain-logo.png' },
        { id: 'fluxo', name: 'Fluxo W7M', img: 'img/fluxo-logo.png' },
        { id: 'leviatan', name: 'LEVIATÁN', img: 'img/leviatan-logo.png' },
        { id: 'kabum', name: 'KaBuM! Esports', img: 'img/kabum-esports-logo.png' },
    ];

    function slugify(name) {
        return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    }

    async function loadTeams() {
        try {
            const res = await fetch('data/standings.json');
            if (!res.ok) throw new Error('sem standings');
            const leagues = await res.json();
            const cblolOnly = leagues.filter((league) => /^cblol/i.test(league.league || ''));
            const seen = new Map();
            cblolOnly.forEach((league) => {
                (league.teams || []).forEach((team) => {
                    const id = slugify(team.name);
                    if (!seen.has(id)) {
                        seen.set(id, { id, name: team.name, img: team.logo || 'img/redcanalhas-logo.png' });
                    }
                });
            });
            const teams = Array.from(seen.values());
            return teams.length ? teams : FALLBACK_TEAMS;
        } catch {
            return FALLBACK_TEAMS;
        }
    }

    async function loadPlayers() {
        try {
            const res = await fetch('data/cblol_players.json');
            if (!res.ok) throw new Error('sem elenco do CBLOL');
            const players = await res.json();
            if (!players.length) throw new Error('elenco vazio');
            return players.map((p) => ({
                id: p.id,
                name: p.name,
                title: `${p.name} - ${p.team}`,
                img: p.image || 'img/redcanalhas-logo.png',
            }));
        } catch {
            return FALLBACK_PLAYERS;
        }
    }

    function storageKey(boardId) {
        return `canalhas_tierlist_${boardId}`;
    }

    function loadState(boardId) {
        try {
            return JSON.parse(localStorage.getItem(storageKey(boardId)));
        } catch {
            return null;
        }
    }

    function saveState(boardEl) {
        const boardId = boardEl.dataset.board;
        const tiers = {};
        boardEl.querySelectorAll('.tier-row').forEach((row) => {
            const key = row.dataset.tier;
            tiers[key] = Array.from(row.querySelector('.tier-items').children).map((c) => c.dataset.id);
        });
        const labels = {};
        boardEl.querySelectorAll('.tier-row').forEach((row) => {
            labels[row.dataset.tier] = row.querySelector('.tier-label').textContent.trim();
        });
        localStorage.setItem(storageKey(boardId), JSON.stringify({ tiers, labels }));
    }

    function buildChip(item) {
        const chip = document.createElement('div');
        chip.className = 'tier-chip';
        chip.dataset.id = item.id;
        if (item.title) chip.title = item.title;
        chip.innerHTML = `<img src="${item.img}" alt="${item.name}" loading="lazy" onerror="this.style.opacity='0'"><span>${item.name}</span>`;
        return chip;
    }

    function renderBoard(boardEl, items) {
        const boardId = boardEl.dataset.board;
        const saved = loadState(boardId);
        const placed = new Set();

        boardEl.innerHTML = '';

        const tiers = TIER_SETS[boardId] || TIER_SETS.teams;
        tiers.forEach((tier, i) => {
            const row = document.createElement('div');
            row.className = 'tier-row';
            row.dataset.tier = tier;
            row.style.setProperty('--tier-color', TIER_COLOR_PALETTE[i % TIER_COLOR_PALETTE.length]);

            const label = document.createElement('div');
            label.className = 'tier-label';
            label.contentEditable = 'true';
            label.spellcheck = false;
            label.textContent = (saved && saved.labels && saved.labels[tier]) || tier;
            label.addEventListener('blur', () => saveState(boardEl));
            label.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); label.blur(); }
            });

            const itemsEl = document.createElement('div');
            itemsEl.className = 'tier-items';

            row.appendChild(label);
            row.appendChild(itemsEl);
            boardEl.appendChild(row);
        });

        const poolLabel = boardId === 'teams' ? 'Times' : 'Jogadores';
        const pool = document.createElement('div');
        pool.className = 'tier-row tier-pool-row';
        pool.dataset.tier = '_pool';
        pool.innerHTML = `<div class="tier-label tier-pool-label">${poolLabel}</div>`;
        const poolItems = document.createElement('div');
        poolItems.className = 'tier-items';
        pool.appendChild(poolItems);
        boardEl.appendChild(pool);

        // Coloca cada item salvo na sua tier; o resto vai pro "não classificados".
        if (saved && saved.tiers) {
            tiers.forEach((tier) => {
                const row = boardEl.querySelector(`.tier-row[data-tier="${tier}"] .tier-items`);
                (saved.tiers[tier] || []).forEach((id) => {
                    const item = items.find((it) => it.id === id);
                    if (item && !placed.has(id)) {
                        row.appendChild(buildChip(item));
                        placed.add(id);
                    }
                });
            });
        }

        items.forEach((item) => {
            if (!placed.has(item.id)) {
                poolItems.appendChild(buildChip(item));
            }
        });
    }

    function initDrag(boardEl) {
        let offsetX = 0;
        let offsetY = 0;
        let originParent = null;
        let originNext = null;

        boardEl.addEventListener('pointerdown', (e) => {
            const chip = e.target.closest('.tier-chip');
            if (!chip) return;

            originParent = chip.parentElement;
            originNext = chip.nextElementSibling;

            const rect = chip.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            chip.style.width = `${rect.width}px`;
            document.body.appendChild(chip);
            chip.style.position = 'fixed';
            chip.style.left = `${rect.left}px`;
            chip.style.top = `${rect.top}px`;
            chip.style.zIndex = '999';
            chip.classList.add('dragging');

            // Uma vez reparentado pro <body>, o chip sai da árvore do
            // boardEl - então os listeners de move/up precisam ficar no
            // próprio chip (pointer capture garante que ele continua
            // recebendo os eventos mesmo fora da posição original).
            chip.setPointerCapture(e.pointerId);

            const onMove = (moveEvent) => {
                chip.style.left = `${moveEvent.clientX - offsetX}px`;
                chip.style.top = `${moveEvent.clientY - offsetY}px`;
            };

            const onEnd = (endEvent) => {
                chip.removeEventListener('pointermove', onMove);
                chip.removeEventListener('pointerup', onEnd);
                chip.removeEventListener('pointercancel', onEnd);

                chip.style.pointerEvents = 'none';
                const target = document.elementFromPoint(endEvent.clientX, endEvent.clientY);
                chip.style.pointerEvents = '';

                const dropZone = target && target.closest('.tier-items');
                chip.classList.remove('dragging');
                chip.style.position = '';
                chip.style.left = '';
                chip.style.top = '';
                chip.style.width = '';
                chip.style.zIndex = '';

                if (dropZone && boardEl.contains(dropZone)) {
                    dropZone.appendChild(chip);
                } else if (originParent) {
                    originParent.insertBefore(chip, originNext);
                }

                saveState(boardEl);
            };

            chip.addEventListener('pointermove', onMove);
            chip.addEventListener('pointerup', onEnd);
            chip.addEventListener('pointercancel', onEnd);
        });
    }

    function initResetButtons() {
        document.querySelectorAll('.tier-reset-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const boardEl = document.querySelector(`.tier-board[data-board="${btn.dataset.board}"]`);
                if (!boardEl || !confirm('Resetar essa tier list? Isso apaga só a sua organização salva neste navegador.')) return;
                localStorage.removeItem(storageKey(btn.dataset.board));
                boardEl.dispatchEvent(new CustomEvent('tierlist:rerender'));
            });
        });
    }

    async function boot() {
        const playersBoard = document.querySelector('.tier-board[data-board="players"]');
        const teamsBoard = document.querySelector('.tier-board[data-board="teams"]');

        if (playersBoard) {
            const players = await loadPlayers();
            renderBoard(playersBoard, players);
            initDrag(playersBoard);
            playersBoard.addEventListener('tierlist:rerender', () => renderBoard(playersBoard, players));
        }

        if (teamsBoard) {
            const teams = await loadTeams();
            renderBoard(teamsBoard, teams);
            initDrag(teamsBoard);
            teamsBoard.addEventListener('tierlist:rerender', () => renderBoard(teamsBoard, teams));
        }

        initResetButtons();

        const tabs = document.querySelectorAll('.tier-tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tier-board-wrap').forEach((wrap) => {
                    const board = wrap.querySelector('.tier-board');
                    wrap.hidden = board.dataset.board !== tab.dataset.tab;
                });
            });
        });
    }

    boot();
});

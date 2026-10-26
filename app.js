// ==========================================================
// CCAO CAMPAÑA JOHANNA CARRILLO - INTERACTIVE APP ENGINE
// ==========================================================

const TOTAL_SLIDES = 26;
let currentSlide = 1;
let overviewOpen = false;
let lastShownSlide = null;

// Slide categories mapping for sub-navbar
const slideCategories = [
    { name: 'Portada & Visión', range: [1, 4] },
    { name: 'Radiografía Territorial', range: [5, 7] },
    { name: 'Histórico Electoral', range: [8, 13] },
    { name: 'Alianzas & Encuesta', range: [14, 18] },
    { name: 'Diagnóstico & Movimientos', range: [19, 21] },
    { name: 'Estructura & Estrategia', range: [22, 26] }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Read initial slide from URL hash if provided (#slide-5 or #5)
    const hashMatch = window.location.hash.match(/\d+/);
    if (hashMatch) {
        const slideNum = parseInt(hashMatch[0], 10);
        if (slideNum >= 1 && slideNum <= TOTAL_SLIDES) {
            currentSlide = slideNum;
        }
    }
    window.addEventListener('hashchange', () => {
        const hMatch = window.location.hash.match(/\d+/);
        if (hMatch) {
            const num = parseInt(hMatch[0], 10);
            if (num >= 1 && num <= TOTAL_SLIDES && num !== currentSlide) {
                goToSlide(num, false);
            }
        }
    });

    initDeck();
    initKeyboard();
    initTouchSwipe();
    initTableFilters();
    initLightbox();
    initBottomDock();
    initFullscreenTracking();
    updateUI(false);
});

function initDeck() {
    try { localStorage.removeItem('ccao_deck_custom_html'); } catch (e) {}

    // Generate overview cards dynamically
    const overviewContainer = document.getElementById('overviewGrid');
    if (overviewContainer) {
        overviewContainer.innerHTML = '';
        for (let i = 1; i <= TOTAL_SLIDES; i++) {
            const slideEl = document.getElementById(`slide-${i}`);
            let title = `Diapositiva ${i}`;
            if (slideEl) {
                const titleEl = slideEl.querySelector('.slide-title, .cover-main-title');
                if (titleEl) {
                    title = titleEl.innerText.replace(/\n/g, ' ').trim();
                }
            }

            const card = document.createElement('div');
            card.className = `overview-card-item ${i === currentSlide ? 'active' : ''}`;
            card.id = `overview-card-${i}`;
            card.innerHTML = `
                <div class="overview-card-num">#${i.toString().padStart(2, '0')}</div>
                <div class="overview-card-title">${title}</div>
            `;
            card.onclick = () => {
                goToSlide(i);
                toggleOverview(false);
            };
            overviewContainer.appendChild(card);
        }
    }
}

function updateUI(updateHash = true) {
    // Hide all slides, show current
    const slideDirection = (lastShownSlide !== null && currentSlide < lastShownSlide) ? 'prev' : 'next';
    const slideChanged = lastShownSlide !== currentSlide;
    for (let i = 1; i <= TOTAL_SLIDES; i++) {
        const slide = document.getElementById(`slide-${i}`);
        if (slide) {
            slide.style.display = (i === currentSlide) ? 'flex' : 'none';
        }
        const oCard = document.getElementById(`overview-card-${i}`);
        if (oCard) {
            oCard.classList.toggle('active', i === currentSlide);
        }
    }

    if (slideChanged) {
        const shown = document.getElementById(`slide-${currentSlide}`);
        if (shown) playSlideAnimations(shown, slideDirection);
        const badge = document.getElementById('slideCounterBadge');
        if (badge) {
            badge.classList.remove('bump');
            void badge.offsetWidth;
            badge.classList.add('bump');
        }
        lastShownSlide = currentSlide;
    }

    // Toggle dynamic body background for dark/magenta slides
    const activeSlide = document.getElementById(`slide-${currentSlide}`);
    if (activeSlide && activeSlide.classList.contains('theme-slide-magenta')) {
        document.body.classList.add('theme-magenta-active');
    } else {
        document.body.classList.remove('theme-magenta-active');
    }

    // Update Counter badge
    const counterBadge = document.getElementById('slideCounterBadge');
    if (counterBadge) {
        counterBadge.innerText = `${currentSlide} / ${TOTAL_SLIDES}`;
    }

    // Update progress bar
    const progressFill = document.getElementById('navProgressFill');
    if (progressFill) {
        const pct = (currentSlide / TOTAL_SLIDES) * 100;
        progressFill.style.width = `${pct}%`;
    }

    // Update button states
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    if (prevBtn) prevBtn.disabled = (currentSlide === 1);
    if (nextBtn) nextBtn.disabled = (currentSlide === TOTAL_SLIDES);

    // Update category active tab
    const tabs = document.querySelectorAll('.section-tab-item');
    slideCategories.forEach((cat, idx) => {
        const [start, end] = cat.range;
        if (currentSlide >= start && currentSlide <= end) {
            tabs.forEach(t => t.classList.remove('active'));
            if (tabs[idx]) tabs[idx].classList.add('active');
        }
    });

    // Update URL hash
    if (updateHash && window.location.hash !== `#slide-${currentSlide}`) {
        history.replaceState(null, '', `#slide-${currentSlide}`);
    }

    // Scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

}

// ==========================================================
// SLIDE ANIMATION ENGINE (transiciones, entrada escalonada, contadores)
// ==========================================================
const REVEAL_SELECTORS = [
    '.slide-header',
    '.cover-content-col > *', '.cover-visual-col',
    '.bio-card-sidebar', '.bio-item-box',
    '.family-thumb-card', '.leader-card-item', '.legacy-note',
    '.goal-highlight-card', '.specific-goal-item', '.goal-hero-visual',
    '.kpi-card', '.demographic-split-bar', '.map-embed-card', '.map-presentation-card',
    '.perception-col', '.movement-item-card', '.heart-pillar-card',
    '.triple-chart-box', '.table-filter-bar', '.table-container-scrollable',
    '.closing-stage > *'
].join(', ');

function playSlideAnimations(slide, direction) {
    // 1. Directional slide transition
    slide.classList.remove('anim-next', 'anim-prev');
    slide.querySelectorAll('.reveal, .grow').forEach(el => el.classList.remove('reveal', 'grow'));
    void slide.offsetWidth;
    slide.classList.add(direction === 'prev' ? 'anim-prev' : 'anim-next');

    // 2. Staggered reveal of the slide's elements
    let items = Array.from(slide.querySelectorAll(REVEAL_SELECTORS));
    if (items.length < 2) {
        items = Array.from(slide.querySelectorAll('.slide-inner > *'));
    }
    items.forEach((el, i) => {
        el.style.setProperty('--i', i);
        el.classList.add('reveal');
    });

    // 3. Progress / percentage bars fill in
    slide.querySelectorAll('.bar-fill, .split-segment').forEach((el, i) => {
        el.style.setProperty('--i', i);
        el.classList.add('grow');
    });

    // 4. Number count-up
    animateCounters(slide);
}

function formatThousands(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function animateCounters(slide) {
    slide.querySelectorAll('.kpi-value').forEach(el => {
        if (el._counting) return;
        const original = el.textContent.trim();
        if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(original)) return;
        const target = parseInt(original.replace(/[.,]/g, ''), 10);
        if (!target || target < 20) return;
        el._counting = true;
        const duration = 1500;
        const delay = 350;
        let start = null;
        el.textContent = '0';
        function tick(ts) {
            if (start === null) start = ts + delay;
            const t = Math.min(1, Math.max(0, (ts - start) / duration));
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = formatThousands(Math.round(target * eased));
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = original;
                el._counting = false;
            }
        }
        requestAnimationFrame(tick);
    });
}

function nextSlide() {
    if (currentSlide < TOTAL_SLIDES) {
        currentSlide++;
        updateUI();
    }
}

function prevSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateUI();
    }
}

function goToSlide(n, updateHash = true) {
    if (n >= 1 && n <= TOTAL_SLIDES) {
        currentSlide = n;
        updateUI(updateHash);
        if (typeof window.showControlDock === 'function') {
            window.showControlDock(2500);
        }
    }
}

function goToCategory(categoryIndex) {
    if (slideCategories[categoryIndex]) {
        goToSlide(slideCategories[categoryIndex].range[0]);
    }
}

// Fullscreen Toggle
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Overview Modal Toggle
function toggleOverview(forceState) {
    const modal = document.getElementById('overviewModal');
    if (!modal) return;
    overviewOpen = (forceState !== undefined) ? forceState : !overviewOpen;
    if (overviewOpen) {
        modal.classList.add('open');
    } else {
        modal.classList.remove('open');
    }
}

// Keyboard controls
function initKeyboard() {
    window.addEventListener('keydown', (e) => {
        // If an input is focused or user is typing in editable text, don't hijack keys
        if (
            document.activeElement &&
            (document.activeElement.tagName === 'INPUT' ||
             document.activeElement.tagName === 'TEXTAREA' ||
             document.activeElement.isContentEditable)
        ) {
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'Home') {
            e.preventDefault();
            goToSlide(1);
        } else if (e.key === 'End') {
            e.preventDefault();
            goToSlide(TOTAL_SLIDES);
        } else if (e.key === 'Escape') {
            toggleOverview(false);
            closeLightbox();
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        } else if (e.key === 'o' || e.key === 'O') {
            // Only toggle overview if lightbox is closed
            const lb = document.getElementById('lightboxModal');
            if (!lb || !lb.classList.contains('open')) {
                toggleOverview();
            }
        } else if (e.key === '+' || e.key === '=') {
            // Zoom in when lightbox is open
            const lb = document.getElementById('lightboxModal');
            if (lb && lb.classList.contains('open')) {
                e.preventDefault();
                zoomIn();
            }
        } else if (e.key === '-') {
            // Zoom out when lightbox is open
            const lb = document.getElementById('lightboxModal');
            if (lb && lb.classList.contains('open')) {
                e.preventDefault();
                zoomOut();
            }
        } else if (e.key === '0') {
            // Reset zoom when lightbox is open
            const lb = document.getElementById('lightboxModal');
            if (lb && lb.classList.contains('open')) {
                e.preventDefault();
                resetZoom();
            }
        }
    });
}

// Touch swipe support for mobile
function initTouchSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    window.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) {
            nextSlide();
        } else if (touchEndX > touchStartX + threshold) {
            prevSlide();
        }
    }
}

// Interactive filter and search for Slide 7 Electoral Table
function initTableFilters() {
    const searchInput = document.getElementById('stationSearchInput');
    const filterButtons = document.querySelectorAll('.filter-pill');

    if (searchInput) {
        searchInput.addEventListener('input', applyTableFilters);
    }

    if (filterButtons) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyTableFilters();
            });
        });
    }
}

function applyTableFilters() {
    const searchVal = (document.getElementById('stationSearchInput')?.value || '').toLowerCase().trim();
    const activeFilter = document.querySelector('.filter-pill.active')?.getAttribute('data-filter') || 'all';
    const rows = document.querySelectorAll('#pollingTableBody tr');

    let visibleCount = 0;
    let visibleWomen = 0;
    let visibleMen = 0;
    let visibleTotal = 0;
    let visibleTables = 0;

    rows.forEach(row => {
        const name = row.getAttribute('data-name')?.toLowerCase() || '';
        const zone = row.getAttribute('data-zone') || '';

        const matchesSearch = name.includes(searchVal);
        const matchesZone = (activeFilter === 'all') || (activeFilter === zone);

        if (matchesSearch && matchesZone) {
            row.style.display = '';
            visibleCount++;
            visibleWomen += parseInt(row.getAttribute('data-women') || '0', 10);
            visibleMen += parseInt(row.getAttribute('data-men') || '0', 10);
            visibleTotal += parseInt(row.getAttribute('data-total') || '0', 10);
            visibleTables += parseInt(row.getAttribute('data-tables') || '0', 10);
        } else {
            row.style.display = 'none';
        }
    });

    // Update footers
    const footTotal = document.getElementById('footTotalVotes');
    const footWomen = document.getElementById('footTotalWomen');
    const footMen = document.getElementById('footTotalMen');
    const footTables = document.getElementById('footTotalTables');

    if (footTotal) footTotal.innerText = visibleTotal.toLocaleString('es-CO');
    if (footWomen) footWomen.innerText = visibleWomen.toLocaleString('es-CO');
    if (footMen) footMen.innerText = visibleMen.toLocaleString('es-CO');
    if (footTables) footTables.innerText = visibleTables.toLocaleString('es-CO');
}

// ==========================================================
// ADVANCED PAN & DEEP ZOOM LIGHTBOX ENGINE
// ==========================================================
let currentZoom = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;

function initLightbox() {
    const modal = document.getElementById('lightboxModal');
    const viewport = document.getElementById('lightboxViewport');
    if (!modal || !viewport) return;

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        currentZoom = Math.min(5.0, Math.max(0.4, currentZoom + delta));
        updateZoomTransform();
    }, { passive: false });

    // Drag / Pan with mouse
    viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.lightbox-top-toolbar')) return;
        isDragging = true;
        startDragX = e.clientX - panX;
        startDragY = e.clientY - panY;
        viewport.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startDragX;
        panY = e.clientY - startDragY;
        updateZoomTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            viewport.classList.remove('is-dragging');
        }
    });

    // Double click to toggle 2x zoom
    viewport.addEventListener('dblclick', (e) => {
        if (e.target.closest('.lightbox-top-toolbar')) return;
        if (currentZoom > 1.0) {
            resetZoom();
        } else {
            currentZoom = 2.2;
            panX = 0;
            panY = 0;
            updateZoomTransform();
        }
    });

    // Touch support for dragging/panning
    let touchStartX = 0;
    let touchStartY = 0;
    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            touchStartX = e.touches[0].clientX - panX;
            touchStartY = e.touches[0].clientY - panY;
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            panX = e.touches[0].clientX - touchStartX;
            panY = e.touches[0].clientY - touchStartY;
            updateZoomTransform();
        }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function updateZoomTransform() {
    const wrapper = document.getElementById('lightboxImgWrapper');
    const badge = document.getElementById('lightboxZoomBadge');
    if (wrapper) {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    }
    if (badge) {
        badge.innerText = `${Math.round(currentZoom * 100)}%`;
    }
}

function zoomIn() {
    currentZoom = Math.min(5.0, currentZoom + 0.3);
    updateZoomTransform();
}

function zoomOut() {
    currentZoom = Math.max(0.4, currentZoom - 0.3);
    updateZoomTransform();
}

function resetZoom() {
    currentZoom = 1.0;
    panX = 0;
    panY = 0;
    updateZoomTransform();
}

function openLightbox(imgSrc, title) {
    const modal = document.getElementById('lightboxModal');
    const imgEl = document.getElementById('lightboxImg');
    const titleEl = document.getElementById('lightboxTitleText');
    if (modal && imgEl) {
        imgEl.src = imgSrc;
        imgEl.alt = title || 'Diagrama';
        if (titleEl) {
            titleEl.innerText = title || 'Visualizador en Alta Resolución';
        }
        resetZoom();
        modal.classList.add('open');
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightboxModal');
    if (modal) {
        modal.classList.remove('open');
        resetZoom();
    }
}

// ==========================================================
// BOTTOM CONTROL DOCK AUTO-HIDE & INTERACTION ENGINE
// ==========================================================
function initBottomDock() {
    const dock = document.getElementById('bottomControlDock') || document.querySelector('.bottom-control-dock');
    if (!dock) return;

    let dockHideTimer = null;
    let isHoveringDock = false;

    function showDock(timeout = 3500) {
        dock.classList.remove('dock-hidden');
        clearTimeout(dockHideTimer);
        if (timeout > 0 && !isHoveringDock) {
            dockHideTimer = setTimeout(() => {
                if (!isHoveringDock) {
                    dock.classList.add('dock-hidden');
                }
            }, timeout);
        }
    }

    function hideDockNow() {
        if (!isHoveringDock) {
            dock.classList.add('dock-hidden');
        }
    }

    // Keep visible while hovering over the dock
    dock.addEventListener('mouseenter', () => {
        isHoveringDock = true;
        clearTimeout(dockHideTimer);
        dock.classList.remove('dock-hidden');
    });

    dock.addEventListener('mouseleave', () => {
        isHoveringDock = false;
        clearTimeout(dockHideTimer);
        dockHideTimer = setTimeout(hideDockNow, 1600);
    });

    // Detect mouse near bottom of viewport (within 110px)
    window.addEventListener('mousemove', (e) => {
        const distFromBottom = window.innerHeight - e.clientY;
        if (distFromBottom <= 110) {
            showDock(3500);
        } else if (!isHoveringDock && !dock.classList.contains('dock-hidden')) {
            // When cursor moves away, auto-hide faster
            clearTimeout(dockHideTimer);
            dockHideTimer = setTimeout(hideDockNow, 1200);
        }
    });

    // Touch support: tap/touch anywhere reveals the dock
    window.addEventListener('touchstart', (e) => {
        if (dock.contains(e.target)) {
            clearTimeout(dockHideTimer);
            dock.classList.remove('dock-hidden');
        } else {
            showDock(3500);
        }
    }, { passive: true });

    // Initial reveal on page load for 3 seconds, then auto-hide
    showDock(3000);

    // Expose showDock globally for slide changes
    window.showControlDock = showDock;
}

// ==========================================================
// FULLSCREEN TRACKING
// ==========================================================
function initFullscreenTracking() {
    function onFsChange() {
        const isFs = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        document.body.classList.toggle('fullscreen-mode', isFs);
        document.documentElement.classList.toggle('fullscreen-mode', isFs);
        if (typeof window.showControlDock === 'function') {
            window.showControlDock(3000);
        }
    }

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);

    // Initial check
    onFsChange();
}






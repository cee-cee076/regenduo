/* =========================================================
   REGENDUO — interactions & motion
   ========================================================= */
(function () {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Theme toggle ---------- */
    const toggle = document.querySelector('.toggle');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        if (toggle) {
            toggle.setAttribute('aria-pressed', String(theme === 'dark'));
            toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }
    applyTheme(root.getAttribute('data-theme') || 'light');

    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            try { localStorage.setItem('mode', next); } catch (e) {}
        });
    }

    // Follow the OS setting until the visitor picks a theme themselves
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (e) => {
        let saved = null;
        try { saved = localStorage.getItem('mode'); } catch (err) {}
        if (!saved) applyTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener ? mq.addEventListener('change', onSystemChange) : mq.addListener(onSystemChange);

    /* ---------- Mobile menu ---------- */
    const menuBtn = document.querySelector('.menu-btn');
    const navlinks = document.querySelector('.navlinks');

    function setMenu(open) {
        if (!menuBtn || !navlinks) return;
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        navlinks.classList.toggle('open', open);
    }
    if (menuBtn) {
        menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
        navlinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
        window.addEventListener('resize', () => { if (window.innerWidth > 860) setMenu(false); });
    }

    /* ---------- Scroll: navbar shadow, progress bar, back-to-top ---------- */
    const navbar = document.querySelector('.navbar');
    const progress = document.querySelector('.progress');
    const toTop = document.querySelector('.to-top');
    let ticking = false;

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (navbar) navbar.classList.toggle('scrolled', y > 10);
        if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        if (toTop) toTop.classList.toggle('show', y > 600);
        ticking = false;
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    /* ---------- Reveal on scroll ---------- */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add('visible'));
    }

    /* ---------- Active nav link ---------- */
    const links = document.querySelectorAll('.navlinks a[href^="#"]');
    const sections = [...links].map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (sections.length && 'IntersectionObserver' in window) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sections.forEach((s) => spy.observe(s));
    }

    /* ---------- Number counters ---------- */
    const counters = document.querySelectorAll('.counter');
    function runCounter(el) {
        const target = +el.dataset.target;
        if (reduceMotion) { el.textContent = target; return; }
        const start = performance.now();
        const dur = 1400;
        const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
        const cio = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
        }, { threshold: 0.6 });
        counters.forEach((c) => cio.observe(c));
    } else {
        counters.forEach((c) => (c.textContent = c.dataset.target));
    }

    /* ---------- Button ripple ---------- */
    if (!reduceMotion) {
        document.querySelectorAll('.btn').forEach((btn) => {
            btn.addEventListener('pointerdown', (e) => {
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const r = document.createElement('span');
                r.className = 'ripple';
                r.style.width = r.style.height = size + 'px';
                r.style.left = e.clientX - rect.left - size / 2 + 'px';
                r.style.top = e.clientY - rect.top - size / 2 + 'px';
                btn.appendChild(r);
                r.addEventListener('animationend', () => r.remove());
            });
        });
    }

    /* ---------- Appointment form ---------- */
    const form = document.querySelector('.appointment-form');
    const success = document.querySelector('.form-success');
    if (form && success) {
        const date = form.querySelector('#date');
        if (date) {
            const t = new Date();
            t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
            date.min = t.toISOString().split('T')[0];
        }

        const messages = {
            valueMissing: 'This field is required.',
            patternMismatch: 'Please enter a valid phone number.',
            rangeUnderflow: 'Please choose today or a future date.',
        };

        function check(input) {
            const field = input.closest('.field');
            const error = field && field.querySelector('.error');
            const v = input.validity;
            let msg = '';
            if (!v.valid) {
                msg = v.valueMissing ? messages.valueMissing
                    : v.patternMismatch ? messages.patternMismatch
                    : v.rangeUnderflow ? messages.rangeUnderflow
                    : input.validationMessage;
            }
            if (field) {
                field.classList.remove('invalid');
                if (msg) { void field.offsetWidth; field.classList.add('invalid'); }
            }
            if (error) error.textContent = msg;
            return !msg;
        }

        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach((i) => i.addEventListener('blur', () => { if (i.value) check(i); }));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let ok = true;
            let first = null;
            inputs.forEach((i) => { if (!check(i)) { ok = false; first = first || i; } });
            if (!ok) { first.focus(); return; }

            // NOTE: no backend is connected yet — hook a form service / API up here.
            const name = form.fname.value.trim();
            const when = new Date(form.date.value + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
            success.querySelector('.success-text').textContent =
                `Thanks, ${name}! We'll call ${form.phone.value.trim()} to confirm your ${form.service.value.toLowerCase()} visit on ${when}.`;
            form.hidden = true;
            success.classList.add('show');
        });

        success.querySelector('[data-reset]').addEventListener('click', () => {
            form.reset();
            form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid'));
            form.querySelectorAll('.error').forEach((er) => (er.textContent = ''));
            success.classList.remove('show');
            form.hidden = false;
            form.fname.focus();
        });
    }

    /* ---------- Footer year ---------- */
    document.querySelectorAll('.year').forEach((y) => (y.textContent = new Date().getFullYear()));
})();

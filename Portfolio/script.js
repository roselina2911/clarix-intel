/* ============================================
   CLARIX.INTEL — Portfolio JS
   Nav · Mobile menu · Scroll reveal · Form · Active link
   ============================================ */

(function () {
    'use strict';

    /* ----------------------
       NAV — scroll shadow + active link
       ---------------------- */
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav-links a[data-page]');
    const mobileLinks = document.querySelectorAll('.mobile-menu a[data-page]');

    const setScrolled = () => {
        if (!nav) return;
        nav.classList.toggle('scrolled', window.scrollY > 20);
    };

    window.addEventListener('scroll', setScrolled, { passive: true });
    setScrolled();

    // Mark active link based on current page
    const currentPage = document.body.dataset.page;
    [...navLinks, ...mobileLinks].forEach(link => {
        if (link.dataset.page === currentPage) link.classList.add('active');
    });

    /* ----------------------
       MOBILE MENU
       ---------------------- */
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.mobile-menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const open = menu.classList.toggle('open');
            toggle.classList.toggle('open', open);
            document.body.style.overflow = open ? 'hidden' : '';
        });

        menu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                menu.classList.remove('open');
                toggle.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    /* ----------------------
       SCROLL REVEAL
       ---------------------- */
    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window && revealEls.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach(el => io.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('in-view'));
    }

    /* ----------------------
       CONTACT FORM
       ---------------------- */
    const form = document.getElementById('contact-form');

    if (form) {
        const successBox = document.getElementById('form-success');

        const validate = (field) => {
            const group = field.closest('.form-group');
            const value = field.value.trim();
            const isRequired = field.hasAttribute('required');
            let valid = true;

            if (isRequired && !value) valid = false;
            if (field.type === 'email' && value) {
                valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            }

            group.classList.toggle('error', !valid);
            return valid;
        };

        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('blur', () => validate(field));
            field.addEventListener('input', () => {
                if (field.closest('.form-group').classList.contains('error')) {
                    validate(field);
                }
            });
        });

        // Rate limit: max 1 submission per 20 seconds per browser
        const RATE_LIMIT_MS = 20 * 1000;
        // Form-load time for minimum-fill-time check (bots submit instantly)
        const formLoadedAt = Date.now();
        const MIN_FILL_MS = 3000;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
            let allValid = true;
            fields.forEach(f => {
                if (!validate(f)) allValid = false;
            });

            if (!allValid) {
                const firstError = form.querySelector('.form-group.error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // Minimum fill time — real humans take at least a few seconds
            if (Date.now() - formLoadedAt < MIN_FILL_MS) {
                // Silently fail (bot-like behaviour); no alert so humans who retry aren't confused
                return;
            }

            // Client-side rate limit
            const lastSubmit = parseInt(localStorage.getItem('clarix_last_submit') || '0', 10);
            const since = Date.now() - lastSubmit;
            if (since < RATE_LIMIT_MS) {
                const wait = Math.ceil((RATE_LIMIT_MS - since) / 1000);
                alert(`Please wait ${wait} more second${wait === 1 ? '' : 's'} before sending another message.`);
                return;
            }

            // hCaptcha check — the widget inserts a textarea with name="h-captcha-response" once solved
            const captchaField = form.querySelector('textarea[name="h-captcha-response"], input[name="h-captcha-response"]');
            if (captchaField && !captchaField.value) {
                alert('Please complete the captcha challenge before sending.');
                const captchaEl = form.querySelector('.form-captcha');
                if (captchaEl) captchaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const submitBtn = form.querySelector('[type="submit"]');
            const origText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Sending…';
            submitBtn.disabled = true;

            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('clarix_last_submit', Date.now().toString());
                    form.reset();
                    form.style.display = 'none';
                    if (successBox) {
                        successBox.classList.add('show');
                        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    setTimeout(() => {
                        form.style.display = '';
                        submitBtn.innerHTML = origText;
                        submitBtn.disabled = false;
                        if (successBox) successBox.classList.remove('show');
                    }, 8000);
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (err) {
                submitBtn.innerHTML = origText;
                submitBtn.disabled = false;
                alert("We couldn't send your message right now. Please email clarix.intel@gmail.com directly, or try again in a moment.");
            }
        });
    }

    /* ----------------------
       DEFER: count-up stat animation (hero stats)
       ---------------------- */
    const countEls = document.querySelectorAll('[data-count]');
    if (countEls.length && 'IntersectionObserver' in window) {
        const countIO = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseFloat(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                const duration = 1400;
                const start = performance.now();

                const tick = (now) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const value = target * eased;
                    el.textContent = (target % 1 === 0 ? Math.round(value) : value.toFixed(1)) + suffix;
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
                countIO.unobserve(el);
            });
        }, { threshold: 0.4 });

        countEls.forEach(el => countIO.observe(el));
    }
})();

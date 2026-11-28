/* ==========================================================================
   Tarnished Relics Vault — скрипты интерфейса (vanilla JS)
   Корзина и кабинет вынесены в js/shop.js
   ========================================================================== */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Тема: светлая / тёмная ---------------------------------------------- */
  function initTheme() {
    const toggle = $('[data-theme-toggle]');
    if (!toggle) return;
    const root = document.documentElement;
    const label = () => {
      const dark = root.dataset.theme === 'dark';
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
    };
    label();
    toggle.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.classList.add('theme-transition');
      root.dataset.theme = next;
      try { localStorage.setItem('trv.theme', next); } catch { /* хранилище недоступно */ }
      label();
      setTimeout(() => root.classList.remove('theme-transition'), 500);
    });
  }

  /* Мобильное меню ------------------------------------------------------- */
  function initNav() {
    const toggle = $('[data-nav-toggle]');
    const nav = $('#site-nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('site-nav--open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* Плавное появление карточек при прокрутке ---------------------------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Задержка «волной» среди соседей одного родителя
    const counters = new Map();
    items.forEach((el) => {
      const n = counters.get(el.parentElement) || 0;
      el.style.setProperty('--i', Math.min(n, 5));
      counters.set(el.parentElement, n + 1);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => observer.observe(el));
  }

  /* Градиент за курсором и лёгкий наклон карточек ----------------------- */
  function initPointerEffects() {
    if (!finePointer) return;
    $$('[data-spotlight]').forEach((el) => {
      const tilt = el.hasAttribute('data-tilt') && !reduceMotion;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        if (tilt) {
          const rx = (y / r.height - 0.5) * -5;
          const ry = (x / r.width - 0.5) * 5;
          el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        }
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* Счётчики в блоке статистики ----------------------------------------- */
  function initCounters() {
    const items = $$('[data-count]');
    if (!items.length) return;

    const run = (el) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { items.forEach(run); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    items.forEach((el) => observer.observe(el));
  }

  /* Искры в главном баннере --------------------------------------------- */
  function initEmbers() {
    if (reduceMotion) return;
    $$('[data-embers]').forEach((box) => {
      const count = Number(box.dataset.embers) || 28;
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        const spark = document.createElement('span');
        const size = 2 + Math.random() * 3;
        spark.className = 'embers__spark';
        spark.style.cssText =
          `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
          `animation-duration:${10 + Math.random() * 12}s;animation-delay:${Math.random() * 12}s;` +
          `--drift:${-60 + Math.random() * 120}px`;
        fragment.append(spark);
      }
      box.append(fragment);
    });
  }

  /* Кнопка «Наверх» ------------------------------------------------------ */
  function initBackToTop() {
    const button = $('[data-back-to-top]');
    if (!button) return;
    const update = () => button.classList.toggle('back-to-top--visible', window.scrollY > 400);
    update();
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  /* Если фото не загрузилось — скрываем «битую» картинку, остаётся фон ---- */
  function initImageFallback() {
    $$('img').forEach((img) => {
      const mark = () => img.classList.add('is-broken');
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) mark();
      img.addEventListener('error', mark);
    });
  }

  /* Каталог: фильтры и сортировка --------------------------------------- */
  function initCatalog() {
    const root = $('[data-catalog]');
    if (!root) return;
    const grid = $('[data-catalog-grid]', root);
    const cards = $$('[data-product-card]', grid);
    const count = $('[data-catalog-count]', root);
    const empty = $('[data-catalog-empty]', root);
    const field = (name) => $(`[name="${name}"]`, root);

    const plural = (n) => {
      const m10 = n % 10;
      const m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'реликвия';
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'реликвии';
      return 'реликвий';
    };

    const apply = () => {
      const filters = { scale: field('scale').value, material: field('material').value, availability: field('availability').value };
      const dir = field('sort').value === 'desc' ? -1 : 1;
      const visible = cards.filter((card) => Object.entries(filters).every(([key, value]) => value === 'all' || card.dataset[key] === value));

      cards.forEach((card) => { card.hidden = !visible.includes(card); });
      visible.sort((a, b) => (a.dataset.price - b.dataset.price) * dir).forEach((card) => grid.append(card));
      count.textContent = `${visible.length} ${plural(visible.length)}`;
      empty.hidden = visible.length > 0;
    };

    $$('select', root).forEach((select) => select.addEventListener('change', apply));
    apply();
  }

  /* Страница товара: галерея и LED-подсветка ---------------------------- */
  function initGallery() {
    const gallery = $('[data-gallery]');
    if (!gallery) return;
    const main = $('[data-gallery-main]', gallery);
    const thumbs = $$('[data-gallery-thumb]', gallery);

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => {
      main.classList.remove('is-broken');
      main.src = thumb.dataset.src;
      const thumbImg = thumb.querySelector('img');
      if (thumbImg) main.alt = thumbImg.alt;
      thumbs.forEach((t) => t.classList.toggle('gallery__thumb--active', t === thumb));
    }));

    const led = $('[data-led-toggle]');
    if (led) {
      led.addEventListener('click', () => {
        const on = led.getAttribute('aria-pressed') !== 'true';
        led.setAttribute('aria-pressed', String(on));
        led.classList.toggle('led-toggle--on', on);
        $('[data-led-state]', led).textContent = on ? 'ON' : 'OFF';
        gallery.classList.toggle('gallery--led', on);
      });
    }
  }

  /* Страница товара: сравнение масштаба --------------------------------- */
  function initCompare() {
    const root = $('[data-compare]');
    if (!root) return;
    const human = Number(root.dataset.human) || 180;
    const select = $('[data-compare-select]', root);
    const figure = $('[data-compare-figure]', root);
    const img = $('[data-compare-img]', root);
    const caption = $('[data-compare-caption]', root);

    const update = () => {
      const option = select.selectedOptions[0];
      figure.style.height = `${(Number(option.dataset.h) / human) * 100}%`;
      img.classList.remove('is-broken');
      img.src = option.dataset.img;
      caption.textContent = `${option.dataset.name} · ${option.dataset.h} см`;
    };
    select.addEventListener('change', update);
  }

  /* FAQ: открыт только один ответ --------------------------------------- */
  function initFaq() {
    $$('.faq').forEach((faq) => {
      const items = $$('.faq__item', faq);
      items.forEach((item) => item.addEventListener('toggle', () => {
        if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
      }));
    });
  }

  /* Форма обратной связи: проверка полей -------------------------------- */
  function initContactForm() {
    const form = $('[data-contact-form]');
    if (!form) return;
    const success = $('[data-form-success]');
    const rules = {
      name: (v) => (v ? '' : 'Обязательное поле'),
      email: (v) => (!v ? 'Обязательное поле' : /^\S+@\S+\.\S+$/.test(v) ? '' : 'Неверный email'),
      message: (v) => (v ? '' : 'Обязательное поле'),
    };

    const check = (name) => {
      const input = form.elements[name];
      const error = rules[name](input.value.trim());
      input.classList.toggle('form__input--error', Boolean(error));
      input.setAttribute('aria-invalid', String(Boolean(error)));
      $(`[data-error-for="${name}"]`, form).textContent = error;
      return !error;
    };

    Object.keys(rules).forEach((name) => form.elements[name].addEventListener('input', () => check(name)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valid = Object.keys(rules).map(check).every(Boolean);
      if (!valid) return;
      form.reset();
      success.hidden = false;
      success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initReveal();
    initPointerEffects();
    initCounters();
    initEmbers();
    initBackToTop();
    initImageFallback();
    initCatalog();
    initGallery();
    initCompare();
    initFaq();
    initContactForm();
  });
})();

/* ==========================================================================
   Tarnished Relics Vault — корзина, оформление заказа и кабинет
   Данные хранятся в localStorage браузера (демо без сервера).
   ========================================================================== */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const KEY = { cart: 'trv.cart', orders: 'trv.orders', user: 'trv.user', payment: 'trv.payment' };
  const DEPOSIT_RATE = 0.25;
  const STEP_MS = 120000; // демо: статус заказа меняется раз в 2 минуты
  const STEPS = ['Заказ принят', 'Ручная роспись', 'Отправлен', 'Доставлен'];
  const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

  const read = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* хранилище недоступно */ } };
  const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let cart = read(KEY.cart, []);
  let payment = read(KEY.payment, 'full');
  let orders = read(KEY.orders, []);
  let user = read(KEY.user, null);

  const totals = () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { total, due: payment === 'deposit' ? Math.round(total * DEPOSIT_RATE) : total };
  };

  /* Корзина --------------------------------------------------------------- */
  const dialog = $('[data-cart]');

  function renderPaymentToggles() {
    $$('[data-payment]').forEach((button) => {
      const active = button.dataset.payment === payment;
      button.classList.toggle('pay-toggle__option--active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    $$('[data-cart-count]').forEach((badge) => { badge.textContent = count; badge.hidden = count === 0; });
    renderPaymentToggles();
    if (!dialog) return;

    const list = $('[data-cart-list]', dialog);
    $('[data-cart-empty]', dialog).hidden = cart.length > 0;
    $('[data-cart-footer]', dialog).hidden = cart.length === 0;

    list.innerHTML = cart.map((item) => `
      <li class="cart__item">
        <div class="cart__thumb"><img class="cart__img" src="${esc(item.image)}" alt="" width="80" height="96"></div>
        <div class="cart__info">
          <div class="cart__row">
            <span class="cart__name">${esc(item.name)}</span>
            <button class="cart__remove" type="button" data-cart-remove="${esc(item.id)}" aria-label="Удалить">×</button>
          </div>
          <span class="cart__meta">${esc(item.scale)} · ${esc(item.material)}</span>
          <div class="cart__bottom">
            <div class="cart__qty">
              <button class="cart__qty-btn" type="button" data-cart-dec="${esc(item.id)}" aria-label="Уменьшить">−</button>
              <span class="cart__qty-value">${item.qty}</span>
              <button class="cart__qty-btn" type="button" data-cart-inc="${esc(item.id)}" aria-label="Увеличить">+</button>
            </div>
            <span class="cart__price">${money.format(item.price * item.qty)}</span>
          </div>
        </div>
      </li>`).join('');

    list.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.classList.add('is-broken')));
    const { total, due } = totals();
    $('[data-cart-total]', dialog).textContent = money.format(total);
    $('[data-cart-due]', dialog).textContent = money.format(due);
  }

  function persistCart() {
    write(KEY.cart, cart);
    renderCart();
    if (document.body.dataset.page === 'cabinet') renderCheckout();
  }

  const setQty = (id, qty) => {
    cart = qty <= 0 ? cart.filter((item) => item.id !== id) : cart.map((item) => (item.id === id ? { ...item, qty } : item));
    persistCart();
  };

  function addToCart(data) {
    const existing = cart.find((item) => item.id === data.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: data.id, name: data.name, price: Number(data.price), image: data.image, scale: data.scale, material: data.material, qty: 1 });
    persistCart();
    openCart();
  }

  function openCart() { if (dialog && !dialog.open) dialog.showModal(); }
  function closeCart() { if (dialog && dialog.open) dialog.close(); }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-to-cart]');
    if (add) { addToCart(add.dataset); return; }
    if (e.target.closest('[data-cart-open]')) { openCart(); return; }
    if (e.target.closest('[data-cart-close]') || e.target === dialog) { closeCart(); return; }

    const inc = e.target.closest('[data-cart-inc]');
    const dec = e.target.closest('[data-cart-dec]');
    const remove = e.target.closest('[data-cart-remove]');
    if (inc) setQty(inc.dataset.cartInc, (cart.find((i) => i.id === inc.dataset.cartInc)?.qty || 0) + 1);
    if (dec) setQty(dec.dataset.cartDec, (cart.find((i) => i.id === dec.dataset.cartDec)?.qty || 0) - 1);
    if (remove) setQty(remove.dataset.cartRemove, 0);

    const pay = e.target.closest('[data-payment]');
    if (pay) {
      payment = pay.dataset.payment;
      write(KEY.payment, payment);
      renderCart();
      if (document.body.dataset.page === 'cabinet') renderCheckout();
    }
  });

  /* Кабинет --------------------------------------------------------------- */
  const orderStep = (order) => Math.min(STEPS.length - 1, Math.floor((Date.now() - order.createdAt) / STEP_MS));

  const timelineHtml = (order) => {
    const step = orderStep(order);
    const check = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    return `<ol class="timeline">${STEPS.map((label, i) => `
      <li class="timeline__step${i <= step ? ' timeline__step--done' : ''}${i === step ? ' timeline__step--current' : ''}">
        <span class="timeline__marker"><span>${i <= step ? check : i + 1}</span></span>
        <span class="timeline__label">${label}</span>
      </li>`).join('')}</ol>`;
  };

  const orderHtml = (order, withHead = true) => `
    <article class="order">
      ${withHead ? `<div class="order__head"><span class="order__id">${esc(order.id)}</span><span class="order__date">${new Date(order.createdAt).toLocaleDateString('ru-RU')}</span></div>
      <p class="order__items">${order.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(' · ')}</p>` : ''}
      ${timelineHtml(order)}
      <p class="order__total"><span>${order.payment === 'deposit' ? 'Внесён депозит 25%' : 'Оплачено полностью'}</span><span>${money.format(order.due)}</span></p>
    </article>`;

  function renderUser() {
    const guest = $('[data-auth-guest]');
    const signed = $('[data-auth-user]');
    if (!guest || !signed) return;
    guest.hidden = Boolean(user);
    signed.hidden = !user;
    if (user) $('[data-user-email]', signed).textContent = user;
  }

  function renderCheckout() {
    const section = $('[data-checkout]');
    if (!section) return;
    const filled = cart.length > 0;
    $('[data-checkout-form]', section).hidden = !filled;
    $('[data-checkout-empty]', section).hidden = filled;
    if (!filled) return;
    const { total, due } = totals();
    $('[data-checkout-summary]', section).innerHTML = `
      ${cart.map((i) => `<p class="cabinet__summary-line"><span>${esc(i.name)} × ${i.qty}</span><span>${money.format(i.price * i.qty)}</span></p>`).join('')}
      <p class="cabinet__summary-line"><span>Итого</span><span>${money.format(total)}</span></p>
      <p class="cabinet__summary-line cabinet__summary-line--due"><span>К оплате сейчас${payment === 'deposit' ? ' (депозит 25%)' : ''}</span><span>${money.format(due)}</span></p>`;
  }

  function renderOrders() {
    const box = $('[data-orders]');
    if (!box) return;
    $('[data-orders-empty]').hidden = orders.length > 0;
    box.innerHTML = orders.map((order) => orderHtml(order)).join('');
  }

  function initCabinet() {
    renderUser();
    renderCheckout();
    renderOrders();
    setInterval(renderOrders, 30000);

    /* Вход и выход */
    const login = $('[data-login-form]');
    login?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = login.elements.email;
      const pass = login.elements.password;
      const emailOk = /^\S+@\S+\.\S+$/.test(email.value.trim());
      email.classList.toggle('form__input--error', !emailOk);
      pass.classList.toggle('form__input--error', !pass.value);
      $('[data-error-for="login-email"]').textContent = emailOk ? '' : 'Неверный email';
      $('[data-error-for="login-password"]').textContent = pass.value ? '' : 'Обязательное поле';
      if (!emailOk || !pass.value) return;
      user = email.value.trim().toLowerCase();
      write(KEY.user, user);
      login.reset();
      renderUser();
    });
    $('[data-logout]')?.addEventListener('click', () => { user = null; write(KEY.user, user); renderUser(); });

    /* Оформление заказа */
    const form = $('[data-checkout-form]');
    const required = ['name', 'email', 'phone', 'city', 'address'];
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      required.forEach((name) => {
        const input = form.elements[name];
        const value = input.value.trim();
        const error = !value ? 'Обязательное поле' : name === 'email' && !/^\S+@\S+\.\S+$/.test(value) ? 'Неверный email' : '';
        input.classList.toggle('form__input--error', Boolean(error));
        $(`[data-error-for="${name}"]`, form).textContent = error;
        if (error) valid = false;
      });
      if (!valid || !cart.length) return;

      const { total, due } = totals();
      const order = {
        id: `TRV-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: Date.now(),
        items: cart.map(({ name, qty }) => ({ name, qty })),
        total, due, payment,
        customer: Object.fromEntries(new FormData(form).entries()),
      };
      orders = [order, ...orders];
      write(KEY.orders, orders);
      if (!user) { user = form.elements.email.value.trim().toLowerCase(); write(KEY.user, user); }
      cart = [];
      form.reset();
      persistCart();
      renderUser();
      renderOrders();
      const success = $('[data-order-success]');
      $('[data-order-number]', success).textContent = order.id;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* Отслеживание заказа */
    const track = $('[data-track-form]');
    track?.addEventListener('submit', (e) => {
      e.preventDefault();
      const number = track.elements.number.value.trim().toUpperCase();
      const result = $('[data-track-result]');
      const found = orders.find((order) => order.id === number);
      result.innerHTML = found ? orderHtml(found, false) : '<p class="panel__text">Заказ не найден.</p>';
    });
  }

  renderCart();
  if (document.body.dataset.page === 'cabinet') initCabinet();
})();

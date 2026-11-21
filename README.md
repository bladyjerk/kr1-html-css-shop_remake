# Tarnished Relics Vault — интернет-магазин статуй Elden Ring

Учебный frontend-проект: многостраничный сайт на чистых HTML, CSS (БЭМ) и vanilla JS.
Структура и подход повторяют проект [modforge](https://github.com/bladyjerk/modforge).

## Структура проекта

- `index.html` — главная («Главная», бывшее «Хранилище»): баннер с искрами, преимущества, статистика, избранные реликвии, масштабы, материалы, предзаказ, студии, призыв к действию;
- `catalog.html` — каталог с фильтрами (масштаб, материал, наличие) и сортировкой по цене;
- `product-<id>.html` — 6 страниц товаров: галерея, LED-подсветка, характеристики, сравнение масштаба;
- `about.html` — «О нас»: история, цифры, процесс создания;
- `contacts.html` — контакты, форма с валидацией, FAQ-аккордеон;
- `cabinet.html` — «Кабинет»: вход, оформление заказа, список заказов, отслеживание по номеру;
- `css/style.css` — основные стили (БЭМ, CSS-переменные, Flexbox, Grid, медиазапросы);
- `css/features.css` — анимации и эффекты (появление карточек, градиент при наведении, искры);
- `js/main.js` — интерфейс: меню, анимации, каталог, галерея, формы;
- `js/shop.js` — корзина, заказы и кабинет (данные в `localStorage`);
- `images/` — логотип, баннер и фото фигурок (`images/figures/<id>-1..4.jpg`);
- `sitemap.xml`, `.gitignore`.

## Фотографии фигурок

В исходном проекте фото хранились как ссылки (`*.asset.json`), поэтому сами файлы нужно
положить в `images/figures/` под именами `malenia-1.jpg … messmer-4.jpg` (по 4 фото на фигурку:
malenia, radahn, godfrey, mohg, maliketh, messmer). Пока файлов нет, карточки показывают тёмный фон.

## БЭМ

Блоки: `site-header`, `site-nav`, `logo`, `hero`, `section`, `feature`, `stat`, `material`,
`scale-card`, `step`, `product-card`, `filters`, `gallery`, `specs`, `compare`, `cart`, `form`,
`faq`, `timeline`, `order`, `site-footer`, `back-to-top` и др.
Примеры: `.product-card__price`, `.site-nav__link`, `.pay-toggle__option--active`, `.btn--outline`.
Для JS используются `data-*` атрибуты, а не классы.

## Запуск

Откройте `index.html` в браузере или запустите `python3 -m http.server`.

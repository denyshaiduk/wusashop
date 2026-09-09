/* ============================================================
   WUSAshop -- app.js
   Animations, interactivity, spark canvas
   ============================================================ */

'use strict';

/* ---- DOM refs -------------------------------------------- */
const siteHeader     = document.getElementById('site-header');
const menuToggle     = document.querySelector('[data-menu-toggle]');
const mobileMenu     = document.querySelector('[data-mobile-menu]');
const mobileMenuPanel = mobileMenu ? mobileMenu.querySelector('.mobile-menu__panel') : null;
const menuCloseEls   = document.querySelectorAll('[data-menu-close]');
const searchModal    = document.querySelector('[data-search-modal]');
const quickModal     = document.querySelector('[data-quick-order-modal]');
const cartModal      = document.querySelector('[data-cart-modal]');
const checkoutModal  = document.querySelector('[data-checkout-modal]');
const openSearchBtns = document.querySelectorAll('[data-open-search]');
const openCartBtns   = document.querySelectorAll('[data-open-cart]');
const closeModalEls  = document.querySelectorAll('[data-close-modal]');
const cartCountNodes = document.querySelectorAll('[data-cart-count]');
const productsGrid   = document.querySelector('[data-products-grid]');
const sparksCanvas   = document.getElementById('sparksCanvas');
const customForm     = document.querySelector('.custom-form');
const quickForm      = document.querySelector('.quick-form');
const checkoutForm   = document.querySelector('[data-checkout-form]');
const aosElements    = document.querySelectorAll('[data-aos]');
const searchInput    = document.querySelector('[data-search-input]');
const searchResults  = document.querySelector('[data-search-results]');
const catalogFilters = document.querySelector('[data-catalog-filters]');
const catalogCount   = document.querySelector('[data-catalog-count]');
const categoryGrid   = document.querySelector('[data-category-grid]');

/* ---- State ----------------------------------------------- */
let cartCount  = 0;
let bodyLocked = false;
let menuFocusReturn = null;
let productsById = {};
let selectedCity  = null; // { ref, name }
let staticMode = false;
let catalogProducts = [];
let activeCategory = 'all';
const apiBaseUrl = String(window.WUSA_API_URL || '').replace(/\/$/, '');
var CART_KEY = 'wusa_cart';
var FAVORITES_KEY = 'wusa_favorites';
var CHECKOUT_DRAFT_KEY = 'wusa_checkout_draft';

function apiUrl(path) {
  return apiBaseUrl + path;
}

function productImageUrl(image) {
  if (!image || /^(https?:)?\/\//i.test(image)) return image;
  return apiBaseUrl ? apiBaseUrl + '/' + image.replace(/^\//, '') : image;
}

function readStorage(key, fallback) {
  try {
    var value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch { return fallback; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ---- Lock / unlock scroll -------------------------------- */
function lockBody()   { if (!bodyLocked) { document.body.style.overflow = 'hidden'; bodyLocked = true; } }
function unlockBody() { document.body.style.overflow = ''; bodyLocked = false; }

/* ---- Cart count sync ------------------------------------- */
function setCartCount(n) {
  cartCount = Math.max(0, n);
  cartCountNodes.forEach(function(el) { el.textContent = cartCount; });
}

/* ---- Sticky header --------------------------------------- */
if (siteHeader) {
  var onScroll = function() { siteHeader.classList.toggle('scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---- Mobile menu ----------------------------------------- */
function openMenu() {
  if (!mobileMenu) return;
  menuFocusReturn = document.activeElement;
  mobileMenu.classList.add('is-open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Закрити меню');
  }
  lockBody();
  setTimeout(function() {
    var firstFocus = mobileMenu.querySelector('.mobile-menu__close, a, button');
    if (firstFocus) firstFocus.focus();
  }, 80);
}

function closeMenu(opts) {
  if (!mobileMenu) return;
  var restoreFocus = !(opts && opts.restoreFocus === false);
  mobileMenu.classList.remove('is-open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Відкрити меню');
  }
  unlockBody();
  if (restoreFocus && menuFocusReturn && typeof menuFocusReturn.focus === 'function') {
    menuFocusReturn.focus();
  }
  menuFocusReturn = null;
}

if (menuToggle) {
  menuToggle.addEventListener('click', function() {
    mobileMenu && mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
}

menuCloseEls.forEach(function(el) { el.addEventListener('click', closeMenu); });

/* Escape key closes everything */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeMenu();
    closeModal(searchModal);
    closeModal(quickModal);
    closeModal(cartModal);
    closeModal(checkoutModal);
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Tab' || !mobileMenu || !mobileMenu.classList.contains('is-open') || !mobileMenuPanel) return;
  var focusable = mobileMenuPanel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

window.addEventListener('resize', function() {
  if (window.innerWidth > 960 && mobileMenu && mobileMenu.classList.contains('is-open')) {
    closeMenu({ restoreFocus: false });
  }
}, { passive: true });

/* ---- Modals ---------------------------------------------- */
function openModal(modal) {
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lockBody();
  var input = modal.querySelector('input');
  if (input) setTimeout(function() { input.focus(); }, 80);
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  unlockBody();
}

openSearchBtns.forEach(function(btn) {
  btn.addEventListener('click', function() { openModal(searchModal); });
});

closeModalEls.forEach(function(el) {
  el.addEventListener('click', function(e) {
    var modal = e.currentTarget.closest('.modal');
    if (modal) closeModal(modal);
  });
});

document.querySelectorAll('.modal__overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function() { closeModal(overlay.closest('.modal')); });
});

document.querySelectorAll('[data-open-quick-order]').forEach(function(btn) {
  btn.addEventListener('click', function() { openModal(quickModal); });
});

/* ---- Cart & Checkout modals opening -------------------- */
openCartBtns.forEach(function(btn) {
  btn.addEventListener('click', function(e) { e.preventDefault(); openModal(cartModal); });
});
document.addEventListener('click', function(e) {
  var openCheckoutBtn = e.target.closest('[data-open-checkout]');
  if (!openCheckoutBtn) return;
  closeModal(cartModal);
  if (checkoutForm) {
    checkoutForm.hidden = false;
    pendingOrderId = null;
    restoreCheckoutDraft();
    if (typeof applyDeliveryMethod === 'function') {
      var selectedDelivery = checkoutForm.querySelector('input[name=deliveryMethod]:checked');
      applyDeliveryMethod(selectedDelivery ? selectedDelivery.value : 'np');
    }
    var reqPanel = checkoutModal.querySelector('[data-checkout-requisites]');
    if (reqPanel) reqPanel.hidden = true;
    var receiptFormEl = checkoutModal.querySelector('[data-receipt-form]');
    if (receiptFormEl) { receiptFormEl.hidden = false; receiptFormEl.reset(); }
    var receiptDoneEl = checkoutModal.querySelector('[data-receipt-done]');
    if (receiptDoneEl) receiptDoneEl.hidden = true;
  }
  openModal(checkoutModal);
});

/* ---- Products catalog (loaded from API) ------------------ */
var STATUS_LABELS = { in_stock: 'У наявності', on_order: 'Під замовлення', out_of_stock: 'Немає в наявності' };
var STATUS_CLASS  = { in_stock: 'status--in', on_order: 'status--order', out_of_stock: 'status--out' };

function formatPrice(n) { return Number(n).toLocaleString('uk-UA') + ' грн'; }

function catalogStateHTML(title, subtitle) {
  return (
    '<div class="products-loading">' +
      '<span class="products-loading__icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><path d="M12 2.5c1.2 3.1-3 4.3-3 8.3a3 3 0 0 0 6 0c0-1.6-1-2.3-1-3.8 2.1 1.1 3.5 3.6 3.5 6.3a5.5 5.5 0 1 1-11 0c0-4.3 3.4-6.6 5.5-10.8z"/></svg>' +
      '</span>' +
      '<p class="products-loading__title">' + escapeHtml(title) + '</p>' +
      (subtitle ? '<p class="products-loading__text">' + escapeHtml(subtitle) + '</p>' : '') +
    '</div>'
  );
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function productCardHTML(p, i) {
  var badge = '';
  if (p.isHit) badge = '<span class="badge badge--hit">Хіт</span>';
  else if (p.oldPrice) badge = '<span class="badge badge--sale">Знижка</span>';
  var oldPriceHtml = p.oldPrice ? '<del class="product-card__old-price">' + formatPrice(p.oldPrice) + '</del>' : '';
  var images = (Array.isArray(p.images) && p.images.length) ? p.images : [p.image];
  images = images.filter(Boolean);
  if (!images.length) images = ['assets/images/hero-workshop.png'];
  var galleryNav = images.length > 1 ? (
    '<button type="button" class="product-card__nav product-card__nav--prev" data-gallery-prev aria-label="Попереднє фото">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="14" height="14" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
    '</button>' +
    '<button type="button" class="product-card__nav product-card__nav--next" data-gallery-next aria-label="Наступне фото">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="14" height="14" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
    '</button>' +
    '<div class="product-card__dots" data-gallery-dots>' +
      images.map(function(_, idx) { return '<span class="' + (idx === 0 ? 'is-active' : '') + '" data-gallery-dot="' + idx + '"></span>'; }).join('') +
    '</div>'
  ) : '';
  return (
    '<article class="product-card" data-product-id="' + p.id + '">' +
      '<div class="product-card__badges">' + badge + '</div>' +
      '<button class="fav-btn' + (getFavorites().includes(p.id) ? ' is-active' : '') + '" type="button" aria-label="' + (getFavorites().includes(p.id) ? 'Видалити з обраного' : 'Додати в обране') + '" data-favorite>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
      '</button>' +
      '<div class="product-card__img-wrap" data-gallery data-images=\'' + JSON.stringify(images.map(productImageUrl)).replace(/'/g, '&#39;') + '\' data-index="0">' +
        '<img src="' + productImageUrl(images[0]) + '" alt="' + escapeHtml(p.name) + '" data-gallery-img loading="lazy">' +
        galleryNav +
      '</div>' +
      '<div class="product-card__body">' +
        '<span class="product-card__cat">' + escapeHtml(p.category || '') + '</span>' +
        '<h3 class="product-card__name"><a href="#custom-order">' + escapeHtml(p.name) + '</a></h3>' +
        '<p class="product-card__desc">' + escapeHtml(p.description || '') + '</p>' +
        '<div class="product-card__meta">' +
          '<span class="product-card__craft">Ручна робота</span>' +
          '<span class="product-card__time">' + escapeHtml(p.craftTime || '') + '</span>' +
        '</div>' +
        '<div class="product-card__footer">' +
          '<div class="product-card__price-block">' +
            '<strong class="product-card__price">' + formatPrice(p.price) + '</strong>' +
            oldPriceHtml +
            '<span class="product-card__status ' + (STATUS_CLASS[p.status] || '') + '">' + (STATUS_LABELS[p.status] || '') + '</span>' +
          '</div>' +
          '<div class="product-card__btns">' +
            '<a class="btn btn--sm btn--outline" href="#custom-order">Уточнити деталі</a>' +
            '<button class="btn btn--sm btn--gold" type="button" data-add-cart aria-label="Додати до кошика">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>'
  );
}

function renderCategoryGrid() {
  if (!categoryGrid) return;
  var categories = Array.from(new Set(catalogProducts.map(function(product) {
    return product.category.trim();
  }).filter(Boolean))).sort();
  categoryGrid.innerHTML = categories.map(function(category) {
    var products = catalogProducts.filter(function(product) { return product.category === category; });
    var feature = products[0];
    var image = productImageUrl(feature.image) || 'assets/images/hero-workshop.png';
    var productCount = products.length + (products.length === 1 ? ' виріб' : ' виробів');
    return (
      '<a class="cat-full-card cat-full-card--photo" href="#catalog" data-category-link="' + escapeHtml(category) + '">' +
        '<img class="cat-full-card__photo" src="' + image + '" alt="' + escapeHtml(category) + '" loading="lazy">' +
        '<span class="cat-full-card__shade"></span>' +
        '<span class="cat-full-card__content">' +
          '<span class="cat-full-card__title">' + escapeHtml(category) + '</span>' +
          '<span class="cat-full-card__count">' + productCount + '</span>' +
        '</span>' +
      '</a>'
    );
  }).join('');
}

function renderCatalog() {
  var categories = Array.from(new Set(catalogProducts.map(function(product) { return product.category.trim(); }).filter(Boolean))).sort();
  if (activeCategory !== 'all' && !categories.includes(activeCategory)) activeCategory = 'all';
  var visibleProducts = activeCategory === 'all'
    ? catalogProducts
    : catalogProducts.filter(function(product) { return product.category === activeCategory; });

  if (catalogFilters) {
    catalogFilters.innerHTML = ['all'].concat(categories).map(function(category) {
      var label = category === 'all' ? 'Усі вироби' : category;
      return '<button type="button" class="catalog-filter' + (activeCategory === category ? ' is-active' : '') + '" data-catalog-category="' + escapeHtml(category) + '">' + escapeHtml(label) + '</button>';
    }).join('');
  }
  if (catalogCount) {
    catalogCount.textContent = catalogProducts.length
      ? 'Знайдено: ' + visibleProducts.length + ' з ' + catalogProducts.length
      : 'Каталог оновлюється';
  }
  productsGrid.innerHTML = visibleProducts.length
    ? visibleProducts.map(productCardHTML).join('')
    : catalogProducts.length
      ? catalogStateHTML('У цій категорії поки немає виробів', 'Оберіть іншу категорію або перегляньте весь каталог')
      : catalogStateHTML('Товари ще не додані', 'Каталог наповнюється — зазирніть трохи згодом');
}

function renderSearchResults(query) {
  if (!searchResults) return;
  var term = String(query || '').trim().toLocaleLowerCase('uk-UA');
  if (!term) {
    searchResults.innerHTML = '';
    return;
  }
  var matches = Object.keys(productsById).map(function(id) { return productsById[id]; }).filter(function(product) {
    return [product.name, product.category, product.description].join(' ').toLocaleLowerCase('uk-UA').includes(term);
  }).slice(0, 6);
  searchResults.innerHTML = matches.length ? matches.map(function(product) {
    return '<button class="search-result" type="button" data-search-product="' + product.id + '">' +
      '<span class="search-result__name">' + escapeHtml(product.name) + '</span>' +
      '<span class="search-result__meta">' + escapeHtml(product.category || 'Виріб ручної роботи') + ' · ' + formatPrice(product.price) + '</span>' +
    '</button>';
  }).join('') : '<p class="search-results__empty">Нічого не знайдено. Спробуйте іншу назву.</p>';
}

function loadProducts() {
  if (!productsGrid) return;
  fetch(apiUrl('/api/products'))
    .then(function(res) { if (!res.ok) throw new Error('API unavailable'); return res.json(); })
    .catch(function() {
      staticMode = true;
      return fetch('assets/data/products.json').then(function(res) {
        if (!res.ok) throw new Error('Static catalog unavailable');
        return res.json();
      });
    })
    .then(function(products) {
      productsById = {};
      products.forEach(function(p) { productsById[p.id] = p; });
      catalogProducts = products;
      renderCategoryGrid();
      renderCatalog();
      renderCartModal();
      if (searchInput) renderSearchResults(searchInput.value);
    })
    .catch(function() {
      productsGrid.innerHTML = catalogStateHTML('Не вдалося завантажити товари', 'Оновіть сторінку або спробуйте пізніше');
    });
}
loadProducts();

if (catalogFilters) {
  catalogFilters.addEventListener('click', function(e) {
    var filter = e.target.closest('[data-catalog-category]');
    if (!filter) return;
    activeCategory = filter.dataset.catalogCategory;
    renderCatalog();
  });
}

if (categoryGrid) {
  categoryGrid.addEventListener('click', function(e) {
    var link = e.target.closest('[data-category-link]');
    if (!link) return;
    e.preventDefault();
    activeCategory = link.dataset.categoryLink;
    renderCatalog();
    var catalog = document.getElementById('catalog');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (searchInput) {
  searchInput.addEventListener('input', function() { renderSearchResults(searchInput.value); });
}

if (searchResults) {
  searchResults.addEventListener('click', function(e) {
    var result = e.target.closest('[data-search-product]');
    if (!result) return;
    var card = document.querySelector('[data-product-id="' + result.dataset.searchProduct + '"]');
    closeModal(searchModal);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ---- Cart (localStorage) ---------------------------------- */

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  var count = cart.reduce(function(sum, it) { return sum + it.qty; }, 0);
  setCartCount(count);
  renderCartModal();
}
function addToCart(id) {
  var cart = getCart();
  var existing = cart.find(function(it) { return it.id === id; });
  if (existing) existing.qty += 1;
  else cart.push({ id: id, qty: 1 });
  saveCart(cart);
}
function updateCartQty(id, qty) {
  var cart = getCart();
  var item = cart.find(function(it) { return it.id === id; });
  if (!item) return;
  item.qty = Math.max(1, Math.min(50, qty));
  saveCart(cart);
}
function removeFromCart(id) {
  saveCart(getCart().filter(function(it) { return it.id !== id; }));
}
function cartTotal(cart) {
  return cart.reduce(function(sum, it) {
    var p = productsById[it.id];
    return sum + (p ? p.price * it.qty : 0);
  }, 0);
}

function renderCartModal() {
  var itemsEl = cartModal && cartModal.querySelector('[data-cart-items]');
  var summaryEl = cartModal && cartModal.querySelector('[data-cart-summary]');
  var totalEl = cartModal && cartModal.querySelector('[data-cart-total]');
  var checkoutTotalEl = checkoutModal && checkoutModal.querySelector('[data-checkout-total]');
  if (!itemsEl) return;
  var cart = getCart();
  if (!cart.length) {
    itemsEl.innerHTML = '<p class="cart-empty">Ваш кошик порожній</p>';
    if (summaryEl) summaryEl.hidden = true;
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatPrice(0);
    return;
  }
  itemsEl.innerHTML = cart.map(function(it) {
    var p = productsById[it.id];
    if (!p) return '';
    return (
      '<div class="cart-item" data-cart-item="' + it.id + '">' +
        '<img class="cart-item__img" src="' + (productImageUrl(p.image) || 'assets/images/hero-workshop.png') + '" alt="' + escapeHtml(p.name) + '">' +
        '<div class="cart-item__body">' +
          '<span class="cart-item__name">' + escapeHtml(p.name) + '</span>' +
          '<span class="cart-item__unit-price">' + formatPrice(p.price) + ' за шт.</span>' +
          '<span class="cart-item__price">' + formatPrice(p.price * it.qty) + '</span>' +
        '</div>' +
        '<div class="cart-item__controls">' +
          '<div class="cart-item__qty" aria-label="Кількість товару">' +
            '<button type="button" data-qty-minus aria-label="Зменшити кількість">−</button>' +
            '<span aria-live="polite">' + it.qty + '</span>' +
            '<button type="button" data-qty-plus aria-label="Збільшити кількість">+</button>' +
          '</div>' +
          '<button type="button" class="cart-item__remove" data-cart-remove aria-label="Видалити ' + escapeHtml(p.name) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
  var total = cartTotal(cart);
  if (summaryEl) summaryEl.hidden = false;
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (checkoutTotalEl) checkoutTotalEl.textContent = formatPrice(total);
}

document.addEventListener('click', function(e) {
  var addBtn = e.target.closest('[data-add-cart]');
  if (addBtn) {
    e.preventDefault();
    var card = addBtn.closest('[data-product-id]');
    if (card) {
      addToCart(Number(card.dataset.productId));
      addBtn.style.transform = 'scale(1.2)';
      setTimeout(function() { addBtn.style.transform = ''; }, 300);
      cartCountNodes.forEach(function(el) {
        el.style.transition = 'transform .25s ease';
        el.style.transform  = 'scale(1.45)';
        setTimeout(function() { el.style.transform = ''; }, 300);
      });
    }
    return;
  }
  var favBtn = e.target.closest('[data-favorite]');
  if (favBtn) {
    var active = favBtn.classList.toggle('is-active');
    favBtn.setAttribute('aria-label', active ? 'Видалити з обраного' : 'Додати в обране');
    var card = favBtn.closest('[data-product-id]');
    if (card) {
      var productId = Number(card.dataset.productId);
      var favorites = getFavorites().filter(function(id) { return id !== productId; });
      if (active) favorites.push(productId);
      writeStorage(FAVORITES_KEY, favorites);
    }
    return;
  }
  var galleryNavBtn = e.target.closest('[data-gallery-prev],[data-gallery-next]');
  var galleryDot = e.target.closest('[data-gallery-dot]');
  if (galleryNavBtn || galleryDot) {
    e.preventDefault();
    var wrap = e.target.closest('[data-gallery]');
    if (wrap) setGalleryIndex(wrap, galleryDot, galleryNavBtn && galleryNavBtn.matches('[data-gallery-next]'));
    return;
  }
  var qtyMinus = e.target.closest('[data-qty-minus]');
  var qtyPlus  = e.target.closest('[data-qty-plus]');
  var removeBtn = e.target.closest('[data-cart-remove]');
  var itemEl = e.target.closest('[data-cart-item]');
  if (itemEl) {
    var id = Number(itemEl.dataset.cartItem);
    var current = getCart().find(function(it) { return it.id === id; });
    if (qtyMinus && current) updateCartQty(id, current.qty - 1);
    else if (qtyPlus && current) updateCartQty(id, current.qty + 1);
    else if (removeBtn) removeFromCart(id);
  }
});

saveCart(getCart());

function getFavorites() {
  return readStorage(FAVORITES_KEY, []).map(Number).filter(Number.isFinite);
}

function setGalleryIndex(wrap, dotEl, goNext) {
  var images;
  try { images = JSON.parse(wrap.dataset.images || '[]'); } catch { images = []; }
  if (!images.length) return;
  var current = Number(wrap.dataset.index || 0);
  var next;
  if (dotEl) next = Number(dotEl.dataset.galleryDot);
  else next = goNext ? (current + 1) % images.length : (current - 1 + images.length) % images.length;
  wrap.dataset.index = next;
  var img = wrap.querySelector('[data-gallery-img]');
  if (img) img.src = images[next];
  wrap.querySelectorAll('[data-gallery-dot]').forEach(function(dot) {
    dot.classList.toggle('is-active', Number(dot.dataset.galleryDot) === next);
  });
}

/* ---- Checkout: Nova Poshta city/warehouse ----------------- */
var cityInput      = checkoutForm && checkoutForm.querySelector('[data-city-input]');
var citySuggestEl  = checkoutForm && checkoutForm.querySelector('[data-city-suggest]');
var warehouseSelect = checkoutForm && checkoutForm.querySelector('[data-warehouse-select]');
var cityStatusEl = checkoutForm && checkoutForm.querySelector('[data-city-status]');
var cityDebounce;
var citySearchVersion = 0;

function saveCheckoutDraft() {
  if (!checkoutForm) return;
  var formData = new FormData(checkoutForm);
  writeStorage(CHECKOUT_DRAFT_KEY, {
    customerName: formData.get('customerName') || '',
    customerPhone: formData.get('customerPhone') || '',
    deliveryMethod: formData.get('deliveryMethod') || 'np',
    city: cityInput ? cityInput.value : '',
    warehouse: warehouseSelect ? warehouseSelect.value : '',
    paymentMethod: formData.get('paymentMethod') || 'prepay',
    selectedCity: selectedCity,
  });
}

function restoreCheckoutDraft() {
  if (!checkoutForm) return;
  var draft = readStorage(CHECKOUT_DRAFT_KEY, {});
  checkoutForm.querySelector('[name=customerName]').value = draft.customerName || '';
  checkoutForm.querySelector('[name=customerPhone]').value = draft.customerPhone || '';
  var delivery = checkoutForm.querySelector('[name=deliveryMethod][value="' + (draft.deliveryMethod || 'np') + '"]');
  var payment = checkoutForm.querySelector('[name=paymentMethod][value="' + (draft.paymentMethod || 'prepay') + '"]');
  if (delivery) delivery.checked = true;
  if (payment) payment.checked = true;
  selectedCity = draft.selectedCity && draft.selectedCity.ref && draft.selectedCity.name ? draft.selectedCity : null;
  if (cityInput) cityInput.value = selectedCity ? selectedCity.name : (draft.city || '');
  if (selectedCity && warehouseSelect) {
    warehouseSelect.innerHTML = '<option value="">Завантаження відділень...</option>';
    fetch(apiUrl('/api/novaposhta/warehouses?cityRef=' + encodeURIComponent(selectedCity.ref)))
      .then(function(res) { if (!res.ok) throw new Error('Warehouse search failed'); return res.json(); })
      .then(function(list) {
        warehouseSelect.innerHTML = '<option value="">Оберіть відділення</option>' + list.map(function(warehouse) {
          return '<option value="' + escapeHtml(warehouse.name) + '">' + escapeHtml(warehouse.name) + '</option>';
        }).join('');
        warehouseSelect.disabled = false;
        warehouseSelect.required = true;
        warehouseSelect.value = draft.warehouse || '';
      })
      .catch(function() { resetWarehouse('Не вдалося відновити відділення'); });
  }
}

function setCityStatus(message, state) {
  if (!cityStatusEl) return;
  cityStatusEl.textContent = message;
  cityStatusEl.dataset.state = state || '';
}

function resetWarehouse(message) {
  if (!warehouseSelect) return;
  warehouseSelect.disabled = true;
  warehouseSelect.required = false;
  warehouseSelect.innerHTML = '<option value="">' + message + '</option>';
}

if (cityInput) {
  cityInput.addEventListener('input', function() {
    selectedCity = null;
    cityInput.setAttribute('aria-expanded', 'false');
    resetWarehouse('Спочатку виберіть місто');
    clearTimeout(cityDebounce);
    var q = cityInput.value.trim();
    var searchVersion = ++citySearchVersion;
    if (q.length < 2) {
      citySuggestEl.hidden = true;
      setCityStatus('Введіть щонайменше 2 символи', '');
      return;
    }
    setCityStatus('Шукаємо місто...', 'loading');
    cityDebounce = setTimeout(function() {
      fetch(apiUrl('/api/novaposhta/cities?q=' + encodeURIComponent(q)))
        .then(function(res) { if (!res.ok) throw new Error('City search failed'); return res.json(); })
        .then(function(cities) {
          if (searchVersion !== citySearchVersion) return;
          if (!Array.isArray(cities) || !cities.length) {
            citySuggestEl.hidden = true;
            setCityStatus('Місто не знайдено. Уточніть назву.', 'error');
            return;
          }
          citySuggestEl.innerHTML = cities.map(function(c) {
            return '<button type="button" role="option" data-city-ref="' + c.ref + '" data-city-name="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + (c.area ? ', ' + escapeHtml(c.area) : '') + '</button>';
          }).join('');
          citySuggestEl.hidden = false;
          cityInput.setAttribute('aria-expanded', 'true');
          setCityStatus('Оберіть місто зі списку', '');
        })
        .catch(function() {
          if (searchVersion !== citySearchVersion) return;
          citySuggestEl.hidden = true;
          cityInput.setAttribute('aria-expanded', 'false');
          setCityStatus('Не вдалося завантажити список міст. Спробуйте ще раз.', 'error');
        });
    }, 350);
  });

  citySuggestEl.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-city-ref]');
    if (!btn) return;
    selectedCity = { ref: btn.dataset.cityRef, name: btn.dataset.cityName };
    cityInput.value = btn.dataset.cityName;
    citySuggestEl.hidden = true;
    cityInput.setAttribute('aria-expanded', 'false');
    resetWarehouse('Завантаження відділень...');
    setCityStatus('Місто вибрано', 'success');
    saveCheckoutDraft();
    fetch(apiUrl('/api/novaposhta/warehouses?cityRef=' + encodeURIComponent(selectedCity.ref)))
      .then(function(res) { if (!res.ok) throw new Error('Warehouse search failed'); return res.json(); })
      .then(function(list) {
        if (!Array.isArray(list) || !list.length) {
          resetWarehouse('Відділень не знайдено');
          return;
        }
        warehouseSelect.innerHTML = '<option value="">Оберіть відділення</option>' + list.map(function(w) {
          return '<option value="' + escapeHtml(w.name) + '">' + escapeHtml(w.name) + '</option>';
        }).join('');
        warehouseSelect.disabled = false;
        warehouseSelect.required = true;
      })
      .catch(function() { resetWarehouse('Не вдалося завантажити відділення'); });
  });

  document.addEventListener('click', function(e) {
    if (!citySuggestEl.hidden && !e.target.closest('[data-city-input]') && !e.target.closest('[data-city-suggest]')) {
      citySuggestEl.hidden = true;
    }
  });
}

/* ---- Checkout: спосіб отримання (Нова пошта / самовивіз) --- */
var PICKUP_CITY = 'Одеса';
var PICKUP_WAREHOUSE = 'Самовивіз: Староконний ринок';
var npFieldsEls = checkoutForm ? checkoutForm.querySelectorAll('[data-np-fields]') : [];
var pickupInfoEl = checkoutForm && checkoutForm.querySelector('[data-pickup-info]');
var deliveryRadios = checkoutForm ? checkoutForm.querySelectorAll('input[name=deliveryMethod]') : [];

function applyDeliveryMethod(method) {
  var isPickup = method === 'pickup';
  npFieldsEls.forEach(function(el) { el.hidden = isPickup; });
  if (pickupInfoEl) pickupInfoEl.hidden = !isPickup;
  if (cityInput) cityInput.required = !isPickup;
  if (isPickup) {
    selectedCity = null;
    if (citySuggestEl) citySuggestEl.hidden = true;
    if (cityInput) cityInput.setAttribute('aria-expanded', 'false');
    resetWarehouse('Самовивіз вибрано');
  } else {
    resetWarehouse('Спочатку виберіть місто');
    setCityStatus('Оберіть місто зі списку', '');
  }
}

deliveryRadios.forEach(function(radio) {
  radio.addEventListener('change', function() { applyDeliveryMethod(radio.value); saveCheckoutDraft(); });
});

if (checkoutForm) {
  checkoutForm.addEventListener('input', saveCheckoutDraft);
  checkoutForm.addEventListener('change', saveCheckoutDraft);
}

/* ---- Checkout: payment requisites ------------------------- */
var paymentRequisites = null;
var pendingOrderId = null;
fetch(apiUrl('/api/payment-requisites'))
  .then(function(res) { return res.ok ? res.json() : null; })
  .then(function(data) {
    if (!data) return;
    paymentRequisites = data;
    var prepayLabel = document.querySelector('[data-prepay-label]');
    if (prepayLabel) prepayLabel.textContent = 'Передоплата (' + data.prepaymentPercent + '%) переказом на картку';
  })
  .catch(function() {});

function showRequisites(order) {
  if (!checkoutModal || !paymentRequisites) return;
  pendingOrderId = order.id;
  var amount = order.paymentMethod === 'prepay' ? order.prepayAmount : order.total;
  checkoutModal.querySelector('[data-req-order-id]').textContent = order.id;
  checkoutModal.querySelector('[data-req-amount]').textContent = formatPrice(amount);
  checkoutModal.querySelector('[data-req-receiver]').textContent = paymentRequisites.receiverName;
  checkoutModal.querySelector('[data-req-iban]').textContent = paymentRequisites.iban;
  checkoutModal.querySelector('[data-req-taxid]').textContent = paymentRequisites.taxId;
  checkoutModal.querySelector('[data-req-bank]').textContent = paymentRequisites.bankName;
  checkoutModal.querySelector('[data-req-mfo]').textContent = paymentRequisites.bankMfo;
  checkoutModal.querySelector('[data-req-bank-edrpou]').textContent = paymentRequisites.bankEdrpou;
  checkoutForm.hidden = true;
  checkoutModal.querySelector('[data-receipt-form]').hidden = false;
  checkoutModal.querySelector('[data-receipt-done]').hidden = true;
  checkoutModal.querySelector('[data-checkout-requisites]').hidden = false;
}

var receiptForm = document.querySelector('[data-receipt-form]');
if (receiptForm) {
  receiptForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var errorEl = receiptForm.querySelector('[data-receipt-error]');
    errorEl.hidden = true;
    var fileInput = receiptForm.querySelector('[data-receipt-input]');
    if (!pendingOrderId || !fileInput.files.length) {
      errorEl.textContent = 'Прикріпіть скріншот або фото чека';
      errorEl.hidden = false;
      return;
    }
    var submitBtn = receiptForm.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Надсилання...';

    var fd = new FormData();
    fd.append('receipt', fileInput.files[0]);

    fetch(apiUrl('/api/orders/' + pendingOrderId + '/confirm-payment'), { method: 'POST', body: fd })
      .then(function(res) { return res.json().then(function(body) { if (!res.ok) throw new Error(body.error); return body; }); })
      .then(function() {
        receiptForm.hidden = true;
        checkoutModal.querySelector('[data-receipt-done]').hidden = false;
      })
      .catch(function(err) {
        errorEl.textContent = err.message || 'Не вдалося надіслати чек. Спробуйте ще раз.';
        errorEl.hidden = false;
      })
      .finally(function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Я оплатив, надіслати підтвердження';
      });
  });
}

document.addEventListener('click', function(e) {
  var copyBtn = e.target.closest('[data-copy-iban]');
  if (!copyBtn || !paymentRequisites) return;
  navigator.clipboard.writeText(paymentRequisites.iban).then(function() {
    var original = copyBtn.textContent;
    copyBtn.textContent = 'Скопійовано!';
    copyBtn.classList.add('is-copied');
    setTimeout(function() { copyBtn.textContent = original; copyBtn.classList.remove('is-copied'); }, 2000);
  }).catch(function() {});
});

/* ---- Checkout: submit order -------------------------------- */
if (checkoutForm) {
  checkoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var errorEl = checkoutForm.querySelector('[data-checkout-error]');
    errorEl.hidden = true;
    var cart = getCart();
    if (!cart.length) { errorEl.textContent = 'Кошик порожній'; errorEl.hidden = false; return; }

    var fd = new FormData(checkoutForm);
    var isPickup = fd.get('deliveryMethod') === 'pickup';
    var phone = String(fd.get('customerPhone') || '').replace(/[^\d+]/g, '');
    if (/^0\d{9}$/.test(phone)) phone = '+38' + phone;
    if (/^380\d{9}$/.test(phone)) phone = '+' + phone;
    var payload = {
      customerName: fd.get('customerName') || '',
      customerPhone: phone,
      city: isPickup ? PICKUP_CITY : (selectedCity ? selectedCity.name : fd.get('city')),
      warehouse: isPickup ? PICKUP_WAREHOUSE : (fd.get('warehouse') || ''),
      paymentMethod: fd.get('paymentMethod'),
      items: cart,
    };
    if (!/^\+380\d{9}$/.test(payload.customerPhone)) {
      errorEl.textContent = 'Вкажіть номер у форматі +380 XX XXX XX XX';
      errorEl.hidden = false;
      return;
    }
    if (!isPickup && !selectedCity) {
      errorEl.textContent = 'Оберіть місто зі списку Нової пошти';
      errorEl.hidden = false;
      cityInput.focus();
      return;
    }
    if (!isPickup && !payload.warehouse) {
      errorEl.textContent = 'Оберіть відділення Нової пошти';
      errorEl.hidden = false;
      return;
    }
    if (staticMode) {
      errorEl.textContent = 'Онлайн-оформлення доступне в основній версії магазину. Для замовлення скористайтеся контактами нижче на сторінці.';
      errorEl.hidden = false;
      return;
    }
    if (!paymentRequisites) {
      errorEl.textContent = 'Оплата переказом тимчасово недоступна, спробуйте ще раз пізніше';
      errorEl.hidden = false;
      return;
    }

    var submitBtn = checkoutForm.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Обробка...';

    fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function(res) { return res.json().then(function(body) { if (!res.ok) throw new Error(body.error); return body; }); })
      .then(function(order) {
        saveCart([]);
        localStorage.removeItem(CHECKOUT_DRAFT_KEY);
        submitBtn.textContent = 'Підтвердити замовлення';
        submitBtn.disabled = false;
        showRequisites(order);
      })
      .catch(function(err) {
        errorEl.textContent = err.message || 'Сталася помилка. Спробуйте ще раз.';
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Підтвердити замовлення';
      });
  });
}

/* ---- Forms ----------------------------------------------- */
function wireForm(form, successText) {
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('[type=submit]');
    if (!btn) return;
    var orig = btn.textContent;
    btn.textContent = 'Надсилаємо...';
    btn.disabled = true;
    setTimeout(function() {
      btn.textContent = successText;
      btn.style.background   = '#2d6a40';
      btn.style.borderColor  = '#2d6a40';
      btn.style.color        = '#c8f0d0';
      form.reset();
      setTimeout(function() {
        btn.textContent = orig;
        btn.style.background = btn.style.borderColor = btn.style.color = '';
        btn.disabled = false;
      }, 4000);
    }, 1200);
  });
}

wireForm(customForm, 'Заявку надіслано!');
wireForm(quickForm,  'Передзвонимо!');

/* ---- Scroll animations (AOS via IntersectionObserver) ---- */
var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced) {
  aosElements.forEach(function(el) { el.classList.add('aos-animate'); });
} else {
  var aosObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var el    = entry.target;
      var delay = parseInt(el.dataset.aosDelay || '0', 10);
      setTimeout(function() { el.classList.add('aos-animate'); }, delay);
      aosObserver.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  aosElements.forEach(function(el) { aosObserver.observe(el); });
}

/* ---- Nav active highlight -------------------------------- */
(function() {
  var sections = document.querySelectorAll('section[id]');
  var navLinks  = document.querySelectorAll('.desktop-nav a');
  if (!navLinks.length || !sections.length) return;

  var navObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var id = entry.target.id;
      navLinks.forEach(function(a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    });
  }, { threshold: 0.35 });

  sections.forEach(function(s) { navObs.observe(s); });
}());

/* ---- Spark particles (Hero canvas) ----------------------- */
(function() {
  if (!sparksCanvas) return;

  var ctx = sparksCanvas.getContext('2d');
  var W = 0, H = 0, animId = null;
  var COLORS = ['#f0c060','#e8a020','#c8930a','#ff8020','#ffd060'];
  var COUNT = window.matchMedia('(max-width: 700px)').matches || navigator.hardwareConcurrency <= 4 ? 20 : 40;
  var particles = [];

  function Spark(initial) {
    this.reset(initial);
  }
  Spark.prototype.reset = function(initial) {
    this.x   = Math.random() * W;
    this.y   = initial ? Math.random() * H : H + 10;
    this.vx  = (Math.random() - 0.5) * 0.8;
    this.vy  = -(Math.random() * 1.2 + 0.4);
    this.alpha = Math.random() * 0.6 + 0.3;
    this.size  = Math.random() * 2.4 + 0.4;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.decay = Math.random() * 0.007 + 0.003;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = Math.random() * 0.04 + 0.01;
  };
  Spark.prototype.update = function() {
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.3;
    this.y += this.vy;
    this.alpha -= this.decay;
  };
  Spark.prototype.draw = function() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI * 2);
    ctx.fillStyle  = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.restore();
  };

  function resize() {
    W = sparksCanvas.width  = sparksCanvas.offsetWidth  || window.innerWidth;
    H = sparksCanvas.height = sparksCanvas.offsetHeight || window.innerHeight;
  }

  function init() {
    particles = [];
    for (var i = 0; i < COUNT; i++) particles.push(new Spark(true));
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      if (particles[i].alpha <= 0 || particles[i].y < -20) particles[i] = new Spark(false);
      else particles[i].draw();
    }
    animId = requestAnimationFrame(tick);
  }

  function start() { resize(); init(); if (!animId) tick(); }
  function stop()  { if (animId) { cancelAnimationFrame(animId); animId = null; } }

  /* Only run when hero is visible */
  var heroEl = sparksCanvas.closest ? sparksCanvas.closest('.hero') : sparksCanvas.parentElement;
  if (heroEl) {
    new IntersectionObserver(function(entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0.05 }).observe(heroEl);
  } else {
    start();
  }

  var rtimer;
  window.addEventListener('resize', function() {
    clearTimeout(rtimer);
    rtimer = setTimeout(function() { stop(); start(); }, 200);
  }, { passive: true });

  if (prefersReduced) { stop(); sparksCanvas.style.display = 'none'; }
}());

/* ---- Smooth scroll for anchor links --------------------- */
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    var href = a.getAttribute('href');
    if (href === '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    var offset = (siteHeader ? siteHeader.offsetHeight : 72) + 16;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    closeMenu();
  });
});

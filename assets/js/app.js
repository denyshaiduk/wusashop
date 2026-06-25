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
const openSearchBtns = document.querySelectorAll('[data-open-search]');
const closeModalEls  = document.querySelectorAll('[data-close-modal]');
const cartCountNodes = document.querySelectorAll('[data-cart-count]');
const addCartBtns    = document.querySelectorAll('[data-add-cart]');
const favBtns        = document.querySelectorAll('[data-favorite]');
const sparksCanvas   = document.getElementById('sparksCanvas');
const customForm     = document.querySelector('.custom-form');
const quickForm      = document.querySelector('.quick-form');
const aosElements    = document.querySelectorAll('[data-aos]');

/* ---- State ----------------------------------------------- */
let cartCount  = 0;
let bodyLocked = false;
let menuFocusReturn = null;

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
  if (e.key === 'Escape') { closeMenu(); closeModal(searchModal); closeModal(quickModal); }
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

/* ---- Cart ------------------------------------------------ */
addCartBtns.forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    setCartCount(cartCount + 1);
    btn.style.transform = 'scale(1.2)';
    setTimeout(function() { btn.style.transform = ''; }, 300);
    cartCountNodes.forEach(function(el) {
      el.style.transition = 'transform .25s ease';
      el.style.transform  = 'scale(1.45)';
      setTimeout(function() { el.style.transform = ''; }, 300);
    });
  });
});

/* ---- Favorites ------------------------------------------- */
favBtns.forEach(function(btn) {
  btn.addEventListener('click', function() {
    var active = btn.classList.toggle('is-active');
    btn.setAttribute('aria-label', active ? 'Видалити з обраного' : 'Додати в обране');
  });
});

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
  var COUNT   = 55;
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

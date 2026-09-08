'use strict';

const loginScreen   = document.getElementById('loginScreen');
const adminApp       = document.getElementById('adminApp');
const loginForm      = document.getElementById('loginForm');
const loginError     = document.getElementById('loginError');
const logoutBtn      = document.getElementById('logoutBtn');

const productsTableBody = document.querySelector('#productsTable tbody');
const ordersTableBody   = document.querySelector('#ordersTable tbody');

const productModal      = document.getElementById('productModal');
const productForm       = document.getElementById('productForm');
const productFormError  = document.getElementById('productFormError');
const newProductBtn      = document.getElementById('newProductBtn');
const cancelProductBtn   = document.getElementById('cancelProductBtn');

const STATUS_LABELS = { in_stock: 'У наявності', on_order: 'Під замовлення', out_of_stock: 'Немає в наявності' };
const STATUS_CLASS  = { in_stock: 'status-pill--in', on_order: 'status-pill--order', out_of_stock: 'status-pill--out' };

async function api(path, opts) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Помилка ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function showLogin() {
  loginScreen.hidden = false;
  adminApp.hidden = true;
}
function showApp() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
  loadProducts();
  loadOrders();
}

/* ---- Auth ---- */
(async function checkSession() {
  try {
    await api('/api/admin/session');
    showApp();
  } catch {
    showLogin();
  }
}());

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const password = document.getElementById('loginPassword').value;
  try {
    await api('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    loginForm.reset();
    showApp();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  showLogin();
});

/* ---- Tabs ---- */
document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
  });
});

/* ---- Products ---- */
async function loadProducts() {
  let products;
  try {
    products = await api('/api/admin/products');
  } catch (err) {
    productsTableBody.innerHTML = `<tr><td class="table-message" colspan="6">Не вдалося завантажити товари. Оновіть сторінку.</td></tr>`;
    return;
  }
  productsTableBody.innerHTML = '';
  if (!products.length) {
    productsTableBody.innerHTML = `<tr><td class="table-message" colspan="6">Каталог порожній. Додайте перший товар.</td></tr>`;
    return;
  }
  products.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.image ? `<img class="thumb" src="/${p.image}" alt="">` : ''}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td>${p.price.toLocaleString('uk-UA')} грн</td>
      <td><span class="status-pill ${STATUS_CLASS[p.status] || ''}">${STATUS_LABELS[p.status] || p.status}</span></td>
      <td class="row-actions">
        <button class="btn btn--sm btn--ghost" data-edit="${p.id}">Редагувати</button>
        <button class="btn btn--sm btn--danger" data-delete="${p.id}">Видалити</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });

  productsTableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openProductModal(products.find((p) => p.id === Number(btn.dataset.edit))));
  });
  productsTableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.delete)));
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openProductModal(product) {
  productFormError.hidden = true;
  productForm.reset();
  document.getElementById('currentImagePreview').innerHTML = '';
  if (product) {
    document.getElementById('productModalTitle').textContent = 'Редагувати товар';
    document.getElementById('productId').value = product.id;
    document.getElementById('fName').value = product.name;
    document.getElementById('fCategory').value = product.category || '';
    document.getElementById('fDescription').value = product.description || '';
    document.getElementById('fPrice').value = product.price;
    document.getElementById('fOldPrice').value = product.oldPrice || '';
    document.getElementById('fStatus').value = product.status;
    document.getElementById('fCraftTime').value = product.craftTime || '';
    document.getElementById('fSortOrder').value = product.sortOrder || 0;
    document.getElementById('fIsHit').checked = product.isHit;
    if (product.image) {
      document.getElementById('currentImagePreview').innerHTML = `<img src="/${product.image}" alt="">`;
    }
  } else {
    document.getElementById('productModalTitle').textContent = 'Новий товар';
    document.getElementById('productId').value = '';
  }
  productModal.hidden = false;
}

function closeProductModal() { productModal.hidden = true; }

newProductBtn.addEventListener('click', () => openProductModal(null));
cancelProductBtn.addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => { if (e.target === productModal) closeProductModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !productModal.hidden) closeProductModal(); });

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  productFormError.hidden = true;
  const id = document.getElementById('productId').value;
  const fd = new FormData();
  fd.append('name', document.getElementById('fName').value.trim());
  fd.append('category', document.getElementById('fCategory').value.trim());
  fd.append('description', document.getElementById('fDescription').value.trim());
  fd.append('price', document.getElementById('fPrice').value);
  fd.append('oldPrice', document.getElementById('fOldPrice').value);
  fd.append('status', document.getElementById('fStatus').value);
  fd.append('craftTime', document.getElementById('fCraftTime').value.trim());
  fd.append('sortOrder', document.getElementById('fSortOrder').value);
  fd.append('isHit', document.getElementById('fIsHit').checked ? '1' : '0');
  const file = document.getElementById('fImage').files[0];
  if (file) fd.append('image', file);

  try {
    await api(id ? `/api/admin/products/${id}` : '/api/admin/products', {
      method: id ? 'PUT' : 'POST',
      body: fd,
    });
    closeProductModal();
    loadProducts();
  } catch (err) {
    productFormError.textContent = err.message;
    productFormError.hidden = false;
  }
});

async function deleteProduct(id) {
  if (!confirm('Видалити цей товар?')) return;
  await api(`/api/admin/products/${id}`, { method: 'DELETE' });
  loadProducts();
}

/* ---- Orders ---- */
const ORDER_STATUS_LABELS = { new: 'Нове', processing: 'В обробці', shipped: 'Відправлено', done: 'Виконано', cancelled: 'Скасовано' };
const PAYMENT_STATUS_LABELS = { pending: 'Очікує', paid: 'Оплачено', failed: 'Помилка' };
const PAYMENT_METHOD_LABELS = { prepay: 'Передоплата', full: 'Повна оплата', cod: 'При отриманні', liqpay: 'LiqPay' };

async function loadOrders() {
  let orders;
  try {
    orders = await api('/api/admin/orders');
  } catch (err) {
    ordersTableBody.innerHTML = `<tr><td class="table-message" colspan="8">Не вдалося завантажити замовлення. Оновіть сторінку.</td></tr>`;
    return;
  }
  ordersTableBody.innerHTML = '';
  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td class="table-message" colspan="8">Замовлень поки немає.</td></tr>`;
    return;
  }
  orders.forEach((o) => {
    const tr = document.createElement('tr');
    const paymentAmountNote = o.paymentMethod === 'prepay' ? ` (${o.prepayAmount.toLocaleString('uk-UA')} грн)` : '';
    tr.innerHTML = `
      <td>№${o.id}</td>
      <td>${escapeHtml(o.customerName)}</td>
      <td>${escapeHtml(o.customerPhone)}</td>
      <td>${escapeHtml(o.city)}${o.warehouse ? ', ' + escapeHtml(o.warehouse) : ''}</td>
      <td>${o.total.toLocaleString('uk-UA')} грн</td>
      <td>
        ${PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod}${paymentAmountNote}<br>
        <select data-payment-status="${o.id}">
          ${Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => `<option value="${v}" ${v === o.paymentStatus ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        ${o.hasReceipt ? `<br><a href="/api/admin/orders/${o.id}/receipt" target="_blank" rel="noopener">Переглянути чек</a>` : '<br><span class="no-receipt">Чек не надано</span>'}
      </td>
      <td>
        <select data-order-status="${o.id}">
          ${Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => `<option value="${v}" ${v === o.orderStatus ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(o.createdAt).toLocaleString('uk-UA')}</td>
    `;
    ordersTableBody.appendChild(tr);
  });

  ordersTableBody.querySelectorAll('[data-order-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await api(`/api/admin/orders/${sel.dataset.orderStatus}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: sel.value }),
      });
    });
  });
  ordersTableBody.querySelectorAll('[data-payment-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await api(`/api/admin/orders/${sel.dataset.paymentStatus}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: sel.value }),
      });
    });
  });
}

// public/script.js
// Shared frontend utilities & logic for Duka Audit System

// ────────────────────────────────────────────────
//  Utility Functions
// ────────────────────────────────────────────────

/**
 * Format Kenyan Shilling (KSh) with commas
 * @param {number} amount
 * @returns {string}
 */
function formatKsh(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'KSh 0';
  return 'KSh ' + amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Show temporary notification message
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showNotification(message, type = 'info') {
  const container = document.createElement('div');
  container.className = `notification ${type}`;
  container.textContent = message;

  document.body.appendChild(container);

  setTimeout(() => {
    container.classList.add('fade-out');
    setTimeout(() => container.remove(), 500);
  }, 3500);
}

/**
 * Fetch wrapper with basic error handling
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>}
 */
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('API error:', err);
    showNotification(`Error: ${err.message}`, 'error');
    throw err;
  }
}

// ────────────────────────────────────────────────
//  Shared functions used by both pages
// ────────────────────────────────────────────────

/**
 * Load all categories into a <select> element
 * @param {HTMLSelectElement} selectElement
 */
async function loadCategoriesIntoSelect(selectElement) {
  if (!selectElement) return;

  try {
    const categories = await apiFetch('/api/categories');
    selectElement.innerHTML = '<option value="">Select category...</option>';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      selectElement.appendChild(option);
    });
  } catch (err) {
    // error already shown by apiFetch
  }
}

/**
 * Load subcategories based on selected category
 * @param {HTMLSelectElement} categorySelect
 * @param {HTMLSelectElement} subcategorySelect
 */
async function loadSubcategories(categorySelect, subcategorySelect) {
  if (!categorySelect || !subcategorySelect) return;

  const catId = categorySelect.value;
  subcategorySelect.innerHTML = '<option value="">Select subcategory...</option>';
  subcategorySelect.disabled = !catId;

  if (!catId) return;

  try {
    const subs = await apiFetch(`/api/subcategories?category_id=${catId}`);
    subs.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub.id;
      option.textContent = sub.name;
      subcategorySelect.appendChild(option);
    });
  } catch {}
}

// ────────────────────────────────────────────────
//  Dashboard / index.html specific helpers
// ────────────────────────────────────────────────

async function refreshItemsTable() {
  const tbody = document.querySelector('#items-table tbody');
  if (!tbody) return;

  try {
    const items = await apiFetch('/api/items');
    tbody.innerHTML = '';

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.category_name}</td>
        <td>${item.subcategory_name}</td>
        <td>${item.name}</td>
        <td>${item.total_units}</td>
        <td style="color:${item.health_color}">${item.health_status} (${item.health_percentage}%)</td>
        <td>${formatKsh(item.total_units * item.unit_price)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {}
}

// ────────────────────────────────────────────────
//  Audit page specific helpers
// ────────────────────────────────────────────────

let currentStockItems = [];

async function refreshStockTable() {
  const tbody = document.querySelector('#stock-table tbody');
  if (!tbody) return;

  try {
    currentStockItems = await apiFetch('/api/items');
    tbody.innerHTML = '';

    currentStockItems.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.category_name}</td>
        <td>${item.subcategory_name}</td>
        <td>${item.name}</td>
        <td>${item.total_units}</td>
        <td style="color:${item.health_color}">${item.health_status} (${item.health_percentage}%)</td>
        <td>${formatKsh(item.unit_price)}</td>
        <td><button class="btn small" onclick="openSellModal(${item.id})">Sell</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch {}
}

function openSellModal(itemId) {
  const item = currentStockItems.find(i => i.id === itemId);
  if (!item) {
    showNotification('Item not found', 'error');
    return;
  }

  const modal = document.getElementById('sell-modal');
  if (!modal) return;

  document.getElementById('sell-item-id').value = item.id;
  document.getElementById('sell-item-name').value = `${item.category_name} → ${item.subcategory_name} → ${item.name}`;
  document.getElementById('sell-type').value = 'unit';
  document.getElementById('sell-quantity').value = 1;
  document.getElementById('sell-price').value = item.unit_price.toFixed(2);

  modal.style.display = 'flex';
}

function closeSellModal() {
  const modal = document.getElementById('sell-modal');
  if (modal) modal.style.display = 'none';
}

// ────────────────────────────────────────────────
//  Global init (runs on every page load)
// ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeSellModal();
    }
  });

  // Add global notification styles if not already in CSS
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        animation: slideIn 0.4s ease-out;
      }
      .notification.success { background: #38a169; }
      .notification.error   { background: #e53e3e; }
      .notification.info    { background: #3182ce; }
      .notification.fade-out { opacity: 0; transform: translateY(-20px); transition: all 0.5s; }
      @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
    `;
    document.head.appendChild(style);
  }
});

async function loadSubcategories(categorySelect, subcategorySelect) {
  if (!categorySelect || !subcategorySelect) return;

  const catId = categorySelect.value;
  subcategorySelect.innerHTML = '<option value="">Loading...</option>';
  subcategorySelect.disabled = true;

  if (!catId) {
    subcategorySelect.innerHTML = '<option value="">Select category first</option>';
    return;
  }

  try {
    const subs = await apiFetch(`/api/subcategories?category_id=${catId}`);
    
    subcategorySelect.innerHTML = '<option value="">Select subcategory...</option>';
    
    if (subs.length === 0) {
      subcategorySelect.innerHTML += '<option value="" disabled>No subcategories yet for this category</option>';
      showNotification(`No subcategories found for category ID ${catId}. Add some via POST /api/subcategories`, 'info');
    } else {
      subs.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.name;
        subcategorySelect.appendChild(opt);
      });
    }
  } catch (err) {
    subcategorySelect.innerHTML = '<option value="">Error loading subcategories</option>';
    showNotification('Failed to load subcategories – check console', 'error');
  } finally {
    subcategorySelect.disabled = false;
  }
}

// Export utilities so pages can use them
window.formatKsh = formatKsh;
window.showNotification = showNotification;
window.apiFetch = apiFetch;
window.loadCategoriesIntoSelect = loadCategoriesIntoSelect;
window.loadSubcategories = loadSubcategories;
window.refreshItemsTable = refreshItemsTable;
window.refreshStockTable = refreshStockTable;
window.openSellModal = openSellModal;
window.closeSellModal = closeSellModal;
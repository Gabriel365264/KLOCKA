```javascript
// =============================================================================
// KLOCKA - Digitale Eieruhr für Bistro
// Basierend auf Power App Design
// =============================================================================

// --- Konfiguration & Konstanten -------------------------------------------

const DEFAULT_PRODUCTS = [
  { name: "Veggie Dog", hours: 0, minutes: 20, active: true },
  { name: "Plant Dog", hours: 0, minutes: 20, active: true },
  { name: "Geflügel Dog", hours: 0, minutes: 50, active: true },
  { name: "Plant Nuggets", hours: 0, minutes: 30, active: true },
  { name: "Köttbullar", hours: 0, minutes: 40, active: true },
  { name: "Zimtschnecken", hours: 2, minutes: 0, active: true },
  { name: "Muffin Schoko", hours: 12, minutes: 0, active: true },
  { name: "Muffin Blaubeer", hours: 12, minutes: 0, active: true }
];

const TRANSLATIONS = {
  de: {
    appTitle: "Klocka",
    addProduct: "Produkt hinzufügen",
    productName: "Produkt",
    hours: "Std.",
    minutes: "Min.",
    active: "Aktiv",
    setTime: "Zeit einstellen",
    start: "Start",
    stop: "Stop",
    whenReady: "Wenn du fertig bist, klicke hier",
    instructionTime: "Hier kannst du die Haltezeiten einstellen.",
    instructionNew: "Neue Produkte kannst die in die freien Felder eintragen, bitte bestätige dann mit dem grünen",
    noActiveProducts: "Keine aktiven Produkte. Bitte unter 'Zeit einstellen' konfigurieren.",
    confirmMark: "✓"
  },
  en: {
    appTitle: "Klocka",
    addProduct: "Add Product",
    productName: "Product",
    hours: "Hrs.",
    minutes: "Min.",
    active: "Active",
    setTime: "Set Time",
    start: "Start",
    stop: "Stop",
    whenReady: "When you're ready, click here",
    instructionTime: "Here you can set the holding times.",
    instructionNew: "You can enter new products in the free fields, please confirm with the green",
    noActiveProducts: "No active products. Please configure under 'Set Time'.",
    confirmMark: "✓"
  }
};

// --- Globale Variablen ---------------------------------------------------

let products = [];
let nextId = 1;
let timers = {};
let currentLanguage = 'de';

const STORAGE_KEYS = {
  products: 'klockaProducts',
  timers: 'klockaTimers',
  language: 'klockaLanguage'
};

// --- Initialisierung -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadLanguage();
  loadProducts();
  loadTimers();
  renderConfigView();
  renderTimerView();
  setupEventHandlers();
  startTimerLoop();
  updateLanguage();
});

// --- Sprach-Verwaltung ---------------------------------------------------

function loadLanguage() {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  currentLanguage = saved || 'de';
}

function saveLanguage() {
  localStorage.setItem(STORAGE_KEYS.language, currentLanguage);
}

function toggleLanguage() {
  currentLanguage = currentLanguage === 'de' ? 'en' : 'de';
  saveLanguage();
  updateLanguage();
  renderConfigView();
  renderTimerView();
}

function t(key) {
  return TRANSLATIONS[currentLanguage][key] || key;
}

function updateLanguage() {
  const langBtn = document.getElementById('btnLanguage');
  if (langBtn) {
    langBtn.textContent = currentLanguage === 'de' ? '🇬🇧 EN' : '🇩🇪 DE';
  }
  
  document.querySelector('.app-title').textContent = t('appTitle');
  
  const toConfigBtn = document.getElementById('btnToConfig');
  if (toConfigBtn) {
    toConfigBtn.innerHTML = `${t('setTime')} <span class="icon-clock">⏱</span>`;
  }
}

// --- Daten laden/speichern -----------------------------------------------

function loadProducts() {
  const stored = localStorage.getItem(STORAGE_KEYS.products);
  if (stored) {
    try {
      products = JSON.parse(stored);
      if (!Array.isArray(products)) products = [];
    } catch (e) {
      products = [];
    }
  } else {
    products = DEFAULT_PRODUCTS.map((p, index) => ({
      id: index + 1,
      ...p
    }));
  }
  nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function loadTimers() {
  const stored = localStorage.getItem(STORAGE_KEYS.timers);
  if (stored) {
    try {
      const savedTimers = JSON.parse(stored);
      const now = Date.now();
      
      for (const [idStr, timer] of Object.entries(savedTimers)) {
        if (timer.running && timer.endTimeMs) {
          timer.remainingMs = Math.max(0, timer.endTimeMs - now);
          if (timer.remainingMs <= 0) {
            timer.running = false;
            timer.endTimeMs = null;
          }
        }
        timers[idStr] = timer;
      }
    } catch (e) {
      timers = {};
    }
  }
}

function saveTimers() {
  localStorage.setItem(STORAGE_KEYS.timers, JSON.stringify(timers));
}

// --- Views umschalten ----------------------------------------------------

function showConfigView() {
  document.getElementById('configView').classList.remove('hidden');
  document.getElementById('timerView').classList.add('hidden');
  document.getElementById('btnToConfig').classList.add('hidden');
  document.getElementById('btnLanguage').classList.remove('hidden');
  document.getElementById('btnFullscreen').classList.add('hidden');
}

function showTimerView() {
  document.getElementById('configView').classList.add('hidden');
  document.getElementById('timerView').classList.remove('hidden');
  document.getElementById('btnToConfig').classList.remove('hidden');
  document.getElementById('btnLanguage').classList.remove('hidden');
  document.getElementById('btnFullscreen').classList.remove('hidden');
  renderTimerView();
}

// --- Event Handler -------------------------------------------------------

function setupEventHandlers() {
  document.getElementById('btnAddProduct').addEventListener('click', addProduct);
  document.getElementById('btnToTimer').addEventListener('click', showTimerView);
  document.getElementById('btnToConfig').addEventListener('click', showConfigView);
  document.getElementById('btnLanguage').addEventListener('click', toggleLanguage);
  document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Fullscreen failed:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// --- Produkte verwalten --------------------------------------------------

function addProduct() {
  products.push({
    id: nextId++,
    name: '',
    hours: 0,
    minutes: 0,
    active: true
  });
  saveProducts();
  renderConfigView();
}

function updateProduct(id, changes) {
  products = products.map(p => p.id === id ? { ...p, ...changes } : p);
  saveProducts();
  
  if (changes.hours !== undefined || changes.minutes !== undefined) {
    const product = products.find(p => p.id === id);
    if (product && timers[id]) {
      const newTotalMs = productTotalMs(product);
      timers[id].totalMs = newTotalMs;
      if (!timers[id].running) {
        timers[id].remainingMs = newTotalMs;
      }
      saveTimers();
    }
  }
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  delete timers[id];
  saveProducts();
  saveTimers();
  renderConfigView();
  renderTimerView();
}

function renderConfigView() {
  const tbody = document.getElementById('productConfigBody');
  tbody.innerHTML = '';

  products.forEach(p => {
    const tr = document.createElement('tr');

    // Checkbox
    const tdActive = document.createElement('td');
    tdActive.className = 'td-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'product-checkbox';
    cb.checked = !!p.active;
    cb.addEventListener('change', e => updateProduct(p.id, { active: e.target.checked }));
    tdActive.appendChild(cb);

    // Name
    const tdName = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'product-input';
    nameInput.value = p.name;
    nameInput.placeholder = t('productName');
    nameInput.addEventListener('change', e => updateProduct(p.id, { name: e.target.value }));
    tdName.appendChild(nameInput);

    // Delete
    const tdDelete = document.createElement('td');
    tdDelete.className = 'td-delete';
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '⊗';
    delBtn.title = 'Löschen';
    delBtn.addEventListener('click', () => deleteProduct(p.id));
    tdDelete.appendChild(delBtn);

    // Hours
    const tdHours = document.createElement('td');
    tdHours.className = 'td-time';
    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.className = 'time-input';
    hoursInput.min = 0;
    hoursInput.max = 99;
    hoursInput.value = p.hours ?? 0;
    hoursInput.addEventListener('change', e => {
      const val = clampInt(e.target.value, 0, 99);
      e.target.value = val;
      updateProduct(p.id, { hours: val });
    });
    tdHours.appendChild(hoursInput);

    // Separator
    const tdSep = document.createElement('td');
    tdSep.className = 'td-separator';
    tdSep.textContent = ':';

    // Minutes
    const tdMinutes = document.createElement('td');
    tdMinutes.className = 'td-time';
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.className = 'time-input';
    minInput.min = 0;
    minInput.max = 59;
    minInput.value = p.minutes ?? 0;
    minInput.addEventListener('change', e => {
      const val = clampInt(e.target.value, 0, 59);
      e.target.value = val;
      updateProduct(p.id, { minutes: val });
    });
    tdMinutes.appendChild(minInput);

    tr.appendChild(tdActive);
    tr.appendChild(tdName);
    tr.appendChild(tdDelete);
    tr.appendChild(tdHours);
    tr.appendChild(tdSep);
    tr.appendChild(tdMinutes);
    tbody.appendChild(tr);
  });

  // Buttons aktualisieren
  document.getElementById('btnAddProduct').textContent = t('addProduct');
  document.getElementById('btnToTimer').textContent = t('whenReady');
  
  const instructionText = document.querySelector('.config-right p:first-child');
  if (instructionText) {
    instructionText.textContent = t('instructionTime');
  }
  
  const instructionNew = document.querySelector('.config-right p:nth-child(2)');
  if (instructionNew) {
    instructionNew.innerHTML = `${t('instructionNew')} <span class="confirm-icon">${t('confirmMark')}</span>`;
  }
}

// --- Timer-Ansicht -------------------------------------------------------

function renderTimerView() {
  const list = document.getElementById('timerList');
  list.innerHTML = '';

  const activeProducts = products.filter(p => p.active && p.name.trim() !== '');

  if (activeProducts.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-products-message';
    msg.textContent = t('noActiveProducts');
    list.appendChild(msg);
    return;
  }

  activeProducts.forEach(p => {
    const totalMs = productTotalMs(p);

    if (!timers[p.id]) {
      timers[p.id] = {
        totalMs,
        remainingMs: totalMs,
        running: false,
        endTimeMs: null
      };
    } else {
      timers[p.id].totalMs = totalMs;
    }

    const timer = timers[p.id];
    const row = document.createElement('div');
    row.className = 'timer-row';
    row.dataset.id = p.id;

    // Name + Progress Bar Container
    const leftContainer = document.createElement('div');
    leftContainer.className = 'timer-left';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'timer-name';
    nameDiv.textContent = p.name;

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressWrapper.appendChild(progressBar);

    leftContainer.appendChild(nameDiv);
    leftContainer.appendChild(progressWrapper);

    // Time Display
    const timeDiv = document.createElement('div');
    timeDiv.className = 'timer-time';
    timeDiv.textContent = formatDuration(timer.remainingMs);

    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'timer-buttons';

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-start';
    startBtn.textContent = t('start');
    startBtn.addEventListener('click', () => handleStart(p.id));

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn-stop';
    stopBtn.textContent = t('stop');
    stopBtn.addEventListener('click', () => handleStop(p.id));

    btnContainer.appendChild(startBtn);
    btnContainer.appendChild(stopBtn);

    row.appendChild(leftContainer);
    row.appendChild(timeDiv);
    row.appendChild(btnContainer);

    list.appendChild(row);

    row._timeDiv = timeDiv;
    row._progressBar = progressBar;
    row._nameDiv = nameDiv;

    updateTimerRowUI(p.id);
  });
}

function handleStart(id) {
  const timer = timers[id];
  if (!timer) return;

  timer.remainingMs = timer.totalMs;
  timer.running = true;
  timer.endTimeMs = Date.now() + timer.remainingMs;

  saveTimers();
  updateTimerRowUI(id);
}

function handleStop(id) {
  const timer = timers[id];
  if (!timer) return;

  timer.running = false;
  timer.remainingMs = timer.totalMs;
  timer.endTimeMs = null;

  saveTimers();
  updateTimerRowUI(id);
}

function startTimerLoop() {
  setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const [idStr, timer] of Object.entries(timers)) {
      const id = Number(idStr);
      if (!timer.running) continue;

      timer.remainingMs = Math.max(0, timer.endTimeMs - now);
      
      if (timer.remainingMs <= 0) {
        timer.running = false;
        timer.endTimeMs = null;
        changed = true;
      }

      updateTimerRowUI(id);
    }

    if (changed) {
      saveTimers();
    }
  }, 100);
}

function updateTimerRowUI(id) {
  const row = document.querySelector(`.timer-row[data-id="${id}"]`);
  const timer = timers[id];
  if (!row || !timer) return;

  const timeDiv = row._timeDiv;
  const progressBar = row._progressBar;
  const nameDiv = row._nameDiv;

  timeDiv.textContent = formatDuration(timer.remainingMs);

  const total = timer.totalMs || 1;
  const ratio = timer.remainingMs / total;
  const percent = Math.max(0, Math.min(100, ratio * 100));
  progressBar.style.width = `${percent}%`;

  const expired = timer.remainingMs <= 0;

  row.classList.remove('timer-running', 'timer-expired');
  progressBar.classList.remove('progress-expired');
  nameDiv.classList.remove('name-expired');

  if (expired) {
    row.classList.add('timer-expired');
    progressBar.classList.add('progress-expired');
    nameDiv.classList.add('name-expired');
  } else if (timer.running) {
    row.classList.add('timer-running');
  }
}

// --- Hilfsfunktionen -----------------------------------------------------

function productTotalMs(p) {
  const h = Number(p.hours) || 0;
  const m = Number(p.minutes) || 0;
  return (h * 60 + m) * 60 * 1000;
}

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function clampInt(value, min, max) {
  let v = parseInt(value, 10);
  if (isNaN(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}
```

// --- Datenmodell ---------------------------------------------------------

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

let products = [];
let nextId = 1;

// Timer-Zustand pro Produkt-ID
// { [id]: { totalMs, remainingMs, running, endTimeMs } }
let timers = {};

const STORAGE_KEY = "klockaProducts";

// --- Initialisierung -----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderConfigView();
  renderTimerView();
  setupEventHandlers();
  startTimerLoop();
});

function loadProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    products = JSON.parse(stored);
    if (!Array.isArray(products)) products = [];
  } else {
    products = DEFAULT_PRODUCTS.map((p, index) => ({
      id: index + 1,
      ...p
    }));
  }
  // nextId bestimmen
  nextId = products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// --- Views umschalten ----------------------------------------------------

function showConfigView() {
  document.getElementById("configView").classList.remove("hidden");
  document.getElementById("timerView").classList.add("hidden");
  document.getElementById("btnToConfig").classList.add("hidden");
}

function showTimerView() {
  document.getElementById("configView").classList.add("hidden");
  document.getElementById("timerView").classList.remove("hidden");
  document.getElementById("btnToConfig").classList.remove("hidden");
}

// --- Event Handler Setup -------------------------------------------------

function setupEventHandlers() {
  document
    .getElementById("btnAddProduct")
    .addEventListener("click", () => addProduct());

  document
    .getElementById("btnToTimer")
    .addEventListener("click", () => showTimerView());

  document
    .getElementById("btnToConfig")
    .addEventListener("click", () => showConfigView());
}

// --- Produkte bearbeiten (Config View) -----------------------------------

function addProduct() {
  products.push({
    id: nextId++,
    name: "",
    hours: 0,
    minutes: 0,
    active: true
  });
  saveProducts();
  renderConfigView();
  renderTimerView();
}

function updateProduct(id, changes) {
  products = products.map((p) => (p.id === id ? { ...p, ...changes } : p));
  saveProducts();
  renderConfigView();
  renderTimerView();
}

function deleteProduct(id) {
  products = products.filter((p) => p.id !== id);
  saveProducts();
  renderConfigView();
  renderTimerView();
}

function renderConfigView() {
  const tbody = document.getElementById("productConfigBody");
  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;

    // Aktiv
    const tdActive = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!p.active;
    cb.addEventListener("change", (e) =>
      updateProduct(p.id, { active: e.target.checked })
    );
    tdActive.appendChild(cb);

    // Name
    const tdName = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = p.name;
    nameInput.placeholder = "Produktname";
    nameInput.addEventListener("change", (e) =>
      updateProduct(p.id, { name: e.target.value })
    );
    tdName.appendChild(nameInput);

    // Löschen-Button
    const tdDelete = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Produkt entfernen";
    delBtn.addEventListener("click", () => deleteProduct(p.id));
    tdDelete.appendChild(delBtn);

    // Stunden
    const tdHours = document.createElement("td");
    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.min = 0;
    hoursInput.value = p.hours ?? 0;
    hoursInput.addEventListener("change", (e) =>
      updateProduct(p.id, { hours: clampInt(e.target.value, 0, 99) })
    );
    tdHours.appendChild(hoursInput);

    // Minuten
    const tdMinutes = document.createElement("td");
    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = 0;
    minInput.max = 59;
    minInput.value = p.minutes ?? 0;
    minInput.addEventListener("change", (e) =>
      updateProduct(p.id, { minutes: clampInt(e.target.value, 0, 59) })
    );
    tdMinutes.appendChild(minInput);

    tr.appendChild(tdActive);
    tr.appendChild(tdName);
    tr.appendChild(tdDelete);
    tr.appendChild(tdHours);
    tr.appendChild(tdMinutes);
    tbody.appendChild(tr);
  });
}

// --- Timer-Ansicht -------------------------------------------------------

function renderTimerView() {
  const list = document.getElementById("timerList");
  list.innerHTML = "";

  const activeProducts = products.filter((p) => p.active && p.name.trim() !== "");

  if (activeProducts.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = "Keine aktiven Produkte. Bitte unter \"Zeit einstellen\" konfigurieren.";
    list.appendChild(msg);
    return;
  }

  activeProducts.forEach((p) => {
    const row = document.createElement("div");
    row.className = "timer-row";
    row.dataset.id = p.id;

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
      if (!timers[p.id].running && timers[p.id].remainingMs > totalMs) {
        timers[p.id].remainingMs = totalMs;
      }
    }

    const timerState = timers[p.id];

    // Name
    const nameDiv = document.createElement("div");
    nameDiv.className = "timer-name";
    const nameLabel = document.createElement("span");
    nameLabel.textContent = p.name;
    if (timerState.running && timerState.remainingMs > 0) {
      nameLabel.classList.add("timer-name--running");
    }
    nameDiv.appendChild(nameLabel);

    // Zeit
    const timeDiv = document.createElement("div");
    timeDiv.className = "timer-time";
    timeDiv.textContent = formatDuration(timerState.remainingMs);

    // Progress
    const progressWrapper = document.createElement("div");
    progressWrapper.className = "progress-wrapper";
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressWrapper.appendChild(progressBar);

    // Buttons
    const btnContainerStart = document.createElement("div");
    const startBtn = document.createElement("button");
    startBtn.className = "btn btn-small btn-primary";
    startBtn.textContent = "Start";
    btnContainerStart.appendChild(startBtn);

    const btnContainerStop = document.createElement("div");
    const stopBtn = document.createElement("button");
    stopBtn.className = "btn btn-small btn-danger";
    stopBtn.textContent = "Stop";
    btnContainerStop.appendChild(stopBtn);

    row.appendChild(nameDiv);
    row.appendChild(progressWrapper);
    row.appendChild(timeDiv);
    row.appendChild(btnContainerStart);
    row.appendChild(btnContainerStop);

    list.appendChild(row);

    // Referenzen im DOM speichern
    row._timeDiv = timeDiv;
    row._progressBar = progressBar;
    row._nameLabel = nameLabel;

    // Click-Handler
    startBtn.addEventListener("click", () => handleStart(p.id));
    stopBtn.addEventListener("click", () => handleStop(p.id));

    // Initial UI
    updateTimerRowUI(p.id);
  });
}

function handleStart(id) {
  const timer = timers[id];
  if (!timer) return;

  // Start immer von voller Zeit
  timer.remainingMs = timer.totalMs;
  timer.running = true;
  timer.endTimeMs = Date.now() + timer.remainingMs;

  updateTimerRowUI(id);
}

function handleStop(id) {
  const timer = timers[id];
  if (!timer) return;

  timer.running = false;
  timer.remainingMs = timer.totalMs;
  timer.endTimeMs = null;

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
      }
      updateTimerRowUI(id);
      changed = true;
    }

    // Optional: falls man später was persistieren will
    if (changed) {
      //
    }
  }, 500);
}

function updateTimerRowUI(id) {
  const row = document.querySelector(`.timer-row[data-id="${id}"]`);
  const timer = timers[id];
  if (!row || !timer) return;

  const timeDiv = row._timeDiv;
  const progressBar = row._progressBar;
  const nameLabel = row._nameLabel;

  timeDiv.textContent = formatDuration(timer.remainingMs);

  const total = timer.totalMs || 1;
  const ratio = timer.remainingMs / total;
  const percent = Math.max(0, Math.min(100, ratio * 100));
  progressBar.style.width = `${percent}%`;

  const expired = timer.remainingMs <= 0;

  if (expired) {
    progressBar.classList.add("expired");
  } else {
    progressBar.classList.remove("expired");
  }

  if (timer.running && !expired) {
    nameLabel.classList.add("timer-name--running");
  } else {
    nameLabel.classList.remove("timer-name--running");
  }
}

// --- Hilfsfunktionen -----------------------------------------------------

function productTotalMs(p) {
  const h = Number(p.hours) || 0;
  const m = Number(p.minutes) || 0;
  return (h * 60 + m) * 60 * 1000;
}

function formatDuration(ms) {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function clampInt(value, min, max) {
  let v = parseInt(value, 10);
  if (isNaN(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

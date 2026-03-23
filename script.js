const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const PRIZE_COUNT = 10;

const board = document.getElementById('luckyBoard');
const scratchedCountEl = document.getElementById('scratchedCount');
const prizesFoundEl = document.getElementById('prizesFound');
const prizeModal = document.getElementById('prizeModal');
const revealedPrizeEl = document.getElementById('revealedPrize');
const winnerNameInput = document.getElementById('winnerNameInput');
const winnersModal = document.getElementById('winnersModal');
const winnersListEl = document.getElementById('winnersList');
const managePrizesModal = document.getElementById('managePrizesModal');
const managePrizesListEl = document.getElementById('managePrizesList');
const newPrizeInput = document.getElementById('newPrizeInput');

const dialogModal = document.getElementById('dialogModal');
const dialogTitle = document.getElementById('dialogTitle');
const dialogMessage = document.getElementById('dialogMessage');
const dialogCancelBtn = document.getElementById('dialogCancelBtn');
const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');

let state = {
  scratchedIndices: new Set(),
  prizes: {}, // index -> prizeName
  foundPrizeCount: 0,
  winners: [] // Array of { index, name, prize }
};

let currentClaimingPrize = null;
let currentClaimingPrizeIndex = null;

// Prize pool
let prizeList = [
  "ประชาชนชาวปด"
];

function loadCustomPrizes() {
  const savedPrizes = localStorage.getItem('custom_prize_list');
  if (savedPrizes) {
    prizeList = JSON.parse(savedPrizes);
  }
}

function saveCustomPrizes() {
  localStorage.setItem('custom_prize_list', JSON.stringify(prizeList));
}

function init() {
  loadCustomPrizes();
  loadState();
  generateBoard();
  updateStats();

  document.getElementById('resetBtn').onclick = resetBoard;

  // Mouse interaction for "scratching"
  let isDragging = false;
  board.onmousedown = () => isDragging = true;
  window.onmouseup = () => isDragging = false;

  board.onmouseleave = () => isDragging = false;
}

function generateBoard() {
  board.innerHTML = '';

  // If prizes not yet generated for this new board
  if (Object.keys(state.prizes).length === 0) {
    const indices = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
    // Shuffle a copy of prizeList to ensure unique distribution
    const shuffledPrizes = [...prizeList].sort(() => Math.random() - 0.5);

    for (let i = 0; i < PRIZE_COUNT; i++) {
      const randomIndex = Math.floor(Math.random() * indices.length);
      const cellIndex = indices.splice(randomIndex, 1)[0];
      // Use modulo to cycle through prizes if prizeList.length < PRIZE_COUNT
      // This ensures each prize is used at least once before duplicates occur
      state.prizes[cellIndex] = shuffledPrizes[i % shuffledPrizes.length] || "ประชาชนชาวปด";
    }
    saveState();
  }

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (state.prizes[i]) cell.classList.add('has-prize');
    if (state.scratchedIndices.has(i)) cell.classList.add('scratched');

    // Jigsaw piece
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const piece = document.createElement('div');
    piece.className = 'jigsaw-piece';
    piece.style.backgroundPosition = `-${col * 100}% -${row * 100}%`;
    cell.appendChild(piece);

    // Cell number
    const numberLabel = document.createElement('div');
    numberLabel.className = 'cell-number';
    numberLabel.innerText = i + 1;
    cell.appendChild(numberLabel);

    // Prize icon
    if (state.prizes[i]) {
      const hint = document.createElement('div');
      hint.className = 'prize-hint';
      hint.innerText = '🎁';
      cell.appendChild(hint);
    }

    // Scratch events
    cell.onmouseenter = () => {
      if (window.isActionPressed || state.scratchedIndices.has(i)) return;
      // We'll use a simpler trigger: mouseenter while mouse is down
    };

    // Using mouseover for scratching feel
    cell.onmouseover = (e) => {
      if (e.buttons === 1 || e.buttons === 3) { // Mouse down
        scratchCell(cell, i);
      }
    };

    cell.onclick = () => {
      if (state.scratchedIndices.has(i) && state.prizes[i]) {
        showPrize(state.prizes[i], i);
      } else {
        scratchCell(cell, i);
      }
    };

    fragment.appendChild(cell);
  }

  board.appendChild(fragment);
}

function scratchCell(cell, index) {
  if (state.scratchedIndices.has(index)) return;

  state.scratchedIndices.add(index);
  cell.classList.add('scratched');

  playScratchSound();
  createDustParticles(cell);

  if (state.prizes[index]) {
    state.foundPrizeCount++;
    showPrize(state.prizes[index], index);
  }

  updateStats();
  saveState();
}

// Audio Context for synthetic scratch sound
let audioCtx;

function playScratchSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const bufferSize = audioCtx.sampleRate * 0.15; // 150ms length
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Generate white noise with exponential envelope
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  // Lowpass filter to simulate paper scratch
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.4;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

function createDustParticles(cell) {
  const rect = cell.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'dust-particle';

    // Randomize angle and distance for explosion effect
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 40 + 20;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);

    // Vary size and shade of gray
    const size = Math.random() * 4 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = Math.random() > 0.5 ? '#888' : '#555';

    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;

    document.body.appendChild(particle);

    setTimeout(() => particle.remove(), 600);
  }
}

function showPrize(prize, index) {
  currentClaimingPrize = prize;
  currentClaimingPrizeIndex = index;
  revealedPrizeEl.innerText = prize;

  const claimBtn = document.getElementById('claimPrizeBtn');
  const existingWinner = state.winners.find(w => w.index === index);

  if (existingWinner) {
    winnerNameInput.value = existingWinner.name;
    winnerNameInput.disabled = true;
    claimBtn.innerText = 'Close';
    claimBtn.onclick = closeModal;
  } else {
    winnerNameInput.value = '';
    winnerNameInput.disabled = false;
    claimBtn.innerText = 'Claim Prize';
    claimBtn.onclick = claimPrize;
  }

  prizeModal.classList.remove('hidden');
  if (!existingWinner) {
    winnerNameInput.focus();
  }
}

function closeModal() {
  prizeModal.classList.add('hidden');
}

function claimPrize() {
  const name = winnerNameInput.value.trim() || 'Anonymous';
  if (currentClaimingPrize && currentClaimingPrizeIndex !== null) {
    state.winners.push({
      index: currentClaimingPrizeIndex,
      name: name,
      prize: currentClaimingPrize
    });
    saveState();
    updateWinnersList();
  }
  closeModal();
}

function openWinnersModal() {
  updateWinnersList();
  winnersModal.classList.remove('hidden');
}

function closeWinnersModal() {
  winnersModal.classList.add('hidden');
}

function openManagePrizesModal() {
  renderManagePrizes();
  managePrizesModal.classList.remove('hidden');
}

function closeManagePrizesModal() {
  managePrizesModal.classList.add('hidden');
}

function renderManagePrizes() {
  managePrizesListEl.innerHTML = '';
  prizeList.forEach((prize, idx) => {
    const item = document.createElement('div');
    item.className = 'winner-item prize-manage-item';
    item.innerHTML = `
      <span>${Math.min(prizeList.length, 10) >= 1 ? prize : ''}</span>
    `;
    // We add the text manually to prevent XSS if necessary, but innerHTML is okay here
    item.innerHTML = `
      <span>${prize}</span>
      <button class="delete-btn" onclick="removePrize(${idx})">✕</button>
    `;
    managePrizesListEl.appendChild(item);
  });

  const addBtn = document.getElementById('addPrizeBtn');
  if (prizeList.length >= 10) {
    addBtn.disabled = true;
    newPrizeInput.disabled = true;
    newPrizeInput.placeholder = "Maximum 10 prizes reached";
  } else {
    addBtn.disabled = false;
    newPrizeInput.disabled = false;
    newPrizeInput.placeholder = "New prize name...";
  }
}

function addNewPrize() {
  const name = newPrizeInput.value.trim();
  if (name && prizeList.length < 10) {
    prizeList.push(name);
    saveCustomPrizes();
    newPrizeInput.value = '';
    renderManagePrizes();
  }
}

function showDialog(title, message, isConfirm, onConfirm) {
  dialogTitle.innerText = title;
  dialogMessage.innerText = message;

  if (isConfirm) {
    dialogCancelBtn.hidden = false;
    dialogCancelBtn.onclick = () => {
      dialogModal.classList.add('hidden');
    };
    dialogConfirmBtn.innerText = 'Confirm';
  } else {
    dialogCancelBtn.hidden = true;
    dialogConfirmBtn.innerText = 'OK';
  }

  dialogConfirmBtn.onclick = () => {
    dialogModal.classList.add('hidden');
    if (onConfirm) onConfirm();
  };

  dialogModal.classList.remove('hidden');
}

function removePrize(idx) {
  if (prizeList.length <= 1) {
    showDialog("⚠️ Warning", "Must have at least one prize in the list.", false);
    return;
  }
  prizeList.splice(idx, 1);
  saveCustomPrizes();
  renderManagePrizes();
}

function updateWinnersList() {
  winnersListEl.innerHTML = '';
  if (state.winners.length === 0) {
    winnersListEl.innerHTML = '<p style="opacity: 0.6;">No winners yet.</p>';
    return;
  }
  state.winners.forEach((winner) => {
    const item = document.createElement('div');
    item.className = 'winner-item';
    item.innerHTML = `<strong>${winner.name}</strong> won <span>${winner.prize}</span>`;
    winnersListEl.appendChild(item);
  });
}

function updateStats() {
  scratchedCountEl.innerText = state.scratchedIndices.size.toLocaleString();
  prizesFoundEl.innerText = `${state.foundPrizeCount}/${PRIZE_COUNT}`;
}

function saveState() {
  const data = {
    scratchedIndices: Array.from(state.scratchedIndices),
    prizes: state.prizes,
    foundPrizeCount: state.foundPrizeCount,
    winners: state.winners || []
  };
  localStorage.setItem('lucky_board_state', JSON.stringify(data));
}

function loadState() {
  const saved = localStorage.getItem('lucky_board_state');
  if (saved) {
    const data = JSON.parse(saved);
    state.scratchedIndices = new Set(data.scratchedIndices || []);
    state.prizes = data.prizes || {};
    state.foundPrizeCount = data.foundPrizeCount || 0;
    state.winners = data.winners || [];
  }
}

function resetBoard() {
  showDialog("🔄 Reset Board", "Reset the entire board? All progress will be lost.", true, () => {
    localStorage.removeItem('lucky_board_state');
    state = {
      scratchedIndices: new Set(),
      prizes: {},
      foundPrizeCount: 0,
      winners: []
    };
    init();
  });
}

window.onload = init;

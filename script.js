// Global variables
let timers = [];
let timerUpdateInterval = null;

const timerNameInput = document.getElementById("timer-name");
const targetInput = document.getElementById("target-datetime");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const timersContainer = document.getElementById("timers-container");
const alertBox = document.getElementById("alert-box");
const alertText = document.getElementById("alert-text");
const alertIcon = document.getElementById("alert-icon");
const alertClose = document.getElementById("alert-close");
const themeButtons = document.querySelectorAll(".theme-btn");

// Set minimum datetime to current time
const now = new Date();
const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);
targetInput.min = minDateTime;

// Event listeners
startBtn.addEventListener("click", addTimer);
resetBtn.addEventListener("click", clearAllTimers);
alertClose.addEventListener("click", hideAlert);

// Theme switching
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute("data-theme", theme);
    themeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    localStorage.setItem("theme", theme);
  });
});

// Load saved theme
const savedTheme = localStorage.getItem("theme") || "default";
document.documentElement.setAttribute("data-theme", savedTheme);
document.querySelector(`[data-theme="${savedTheme}"]`).classList.add("active");

// Shows an alert message

function showAlert(message, type = "warning") {
  alertText.textContent = message;
  alertBox.className = "alert-box show";

  if (type === "error") {
    alertBox.classList.add("error");
    alertIcon.textContent = "❌";
  } else {
    alertBox.classList.remove("error");
    alertIcon.textContent = "⚠️";
  }

  setTimeout(hideAlert, 5000);
}

// Hides the alert box

function hideAlert() {
  alertBox.classList.remove("show");
}

// Creates a party popper sound using Web Audio API

function playPopperSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Pop sound
  const popOscillator = audioContext.createOscillator();
  const popGain = audioContext.createGain();

  popOscillator.connect(popGain);
  popGain.connect(audioContext.destination);

  popOscillator.frequency.value = 800;
  popGain.gain.value = 0.3;

  popOscillator.start(audioContext.currentTime);
  popGain.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.1
  );
  popOscillator.stop(audioContext.currentTime + 0.1);

  // Celebration chimes
  [600, 800, 1000, 1200].forEach((freq, i) => {
    setTimeout(() => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = freq;
      gain.gain.value = 0.2;

      osc.start(audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );
      osc.stop(audioContext.currentTime + 0.3);
    }, i * 100);
  });
}

// Adds a new timer
function addTimer() {
  const selectedDateTime = targetInput.value;
  const timerName = timerNameInput.value.trim() || `Timer ${timers.length + 1}`;

  if (!selectedDateTime) {
    showAlert("Please select a date and time!", "error");
    return;
  }

  const targetDateTime = new Date(selectedDateTime).getTime();
  const currentTime = new Date().getTime();

  if (targetDateTime <= currentTime) {
    showAlert("Please select a future date and time!", "error");
    return;
  }

  hideAlert();

  const timer = {
    id: Date.now(),
    name: timerName,
    targetDateTime: targetDateTime,
    targetDateString: new Date(targetDateTime).toLocaleString(),
    completed: false,
  };

  timers.push(timer);

  // Clear inputs
  timerNameInput.value = "";
  targetInput.value = "";

  // Suggest next date
  //   const suggestedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const suggestedDate = new Date();
  console.log(suggestedDate, "suggestedDate 1");
  const suggestedDateTime = new Date(
    suggestedDate.getTime() - suggestedDate.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
  console.log(suggestedDateTime, "suggestedDateTime 1");

  targetInput.value = suggestedDateTime;

  renderTimers();
  startTimerUpdates();
}

// Deletes a specific timer
function deleteTimer(id) {
  timers = timers.filter((t) => t.id !== id);
  renderTimers();

  if (timers.length === 0) {
    stopTimerUpdates();
  }
}

// Clears all timers
function clearAllTimers() {
  if (timers.length === 0) return;

  if (confirm("Are you sure you want to clear all countdowns?")) {
    timers = [];
    renderTimers();
    stopTimerUpdates();
  }
}

// Renders all timers
function renderTimers() {
  if (timers.length === 0) {
    timersContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⏱️</div>
                        <div>No active countdowns.<br>Create your first timer above!</div>
                    </div>
                `;
    return;
  }

  timersContainer.innerHTML = timers
    .map((timer) => {
      const timeRemaining = timer.targetDateTime - new Date().getTime();

      if (timeRemaining <= 0 && !timer.completed) {
        timer.completed = true;
        playPopperSound();
        createConfetti();
        return `
                        <div class="timer-card celebration" data-id="${timer.id}">
                            <div class="timer-header">
                                <div class="timer-name">${timer.name}</div>
                                <button class="delete-timer" onclick="deleteTimer(${timer.id})">×</button>
                            </div>
                            <div class="message">🎉 Complete! 🎉</div>
                            <div class="timer-target">Finished at: ${timer.targetDateString}</div>
                        </div>
                    `;
      }

      if (timeRemaining <= 0) {
        return `
                        <div class="timer-card" data-id="${timer.id}">
                            <div class="timer-header">
                                <div class="timer-name">${timer.name}</div>
                                <button class="delete-timer" onclick="deleteTimer(${timer.id})">×</button>
                            </div>
                            <div class="message">🎉 Complete! 🎉</div>
                            <div class="timer-target">Finished at: ${timer.targetDateString}</div>
                        </div>
                    `;
      }

      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

      return `
                    <div class="timer-card" data-id="${timer.id}">
                        <div class="timer-header">
                            <div class="timer-name">${timer.name}</div>
                            <button class="delete-timer" onclick="deleteTimer(${
                              timer.id
                            })">×</button>
                        </div>
                        <div class="time-grid">
                            <div class="time-unit">
                                <span class="time-value">${String(
                                  days
                                ).padStart(2, "0")}</span>
                                <span class="time-label">Days</span>
                            </div>
                            <div class="time-unit">
                                <span class="time-value">${String(
                                  hours
                                ).padStart(2, "0")}</span>
                                <span class="time-label">Hours</span>
                            </div>
                            <div class="time-unit">
                                <span class="time-value">${String(
                                  minutes
                                ).padStart(2, "0")}</span>
                                <span class="time-label">Mins</span>
                            </div>
                            <div class="time-unit">
                                <span class="time-value">${String(
                                  seconds
                                ).padStart(2, "0")}</span>
                                <span class="time-label">Secs</span>
                            </div>
                        </div>
                        <div class="timer-target">Target: ${
                          timer.targetDateString
                        }</div>
                    </div>
                `;
    })
    .join("");
}

// Starts the interval for updating timers
function startTimerUpdates() {
  if (!timerUpdateInterval) {
    timerUpdateInterval = setInterval(renderTimers, 1000);
  }
}

// Stops the timer update interval
function stopTimerUpdates() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
}

// Creates confetti animation effect
function createConfetti() {
  const colors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
  ];
  const confettiCount = 50;

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + "s";
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// Initialize with a suggested date
// const suggestedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const suggestedDate = new Date();
console.log(suggestedDate, "suggestedDate");
const suggestedDateTime = new Date(
  suggestedDate.getTime() - suggestedDate.getTimezoneOffset() * 60000
)
  .toISOString()
  .slice(0, 16);
console.log(suggestedDateTime, "suggestedDateTime");
targetInput.value = suggestedDateTime;

// Confirmation Modal Logic
const modalOverlay = document.getElementById("modal-overlay");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

// Show modal when clicking "Clear All"
function clearAllTimers() {
  if (timers.length === 0) return;
  modalOverlay.classList.add("show"); // show the modal overlay
}

// Cancel button → close modal
modalCancel.addEventListener("click", () => {
  modalOverlay.classList.remove("show");
});

// Confirm button → clear timers
modalConfirm.addEventListener("click", () => {
  timers = [];
  renderTimers();
  stopTimerUpdates();
  modalOverlay.classList.remove("show");
});

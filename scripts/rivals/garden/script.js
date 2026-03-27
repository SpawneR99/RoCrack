// Script list data
const scripts = [
  { name: 'Mozil Hub', downloads: '3.4M' },
  { name: 'Forge Hub', downloads: '1.4M' },
  { name: 'Nicuse', downloads: '1.4M' },
  { name: 'Overflow', downloads: '1.6M' },
  { name: 'Soluna', downloads: '1.4M' },
  { name: 'Oblivion V1', downloads: '1.6M' },
  { name: 'Bean Hub', downloads: '1.4M' },
  { name: 'Mango Hub', downloads: '1.2M' },
  { name: 'Stingray', downloads: '1.2M' },
  { name: 'PEELY HUB', downloads: '1.2M' },
  { name: 'XIBA HUB', downloads: '1.2M' },
  { name: 'Soggyware', downloads: '1.1M' },
  { name: 'BT Project', downloads: '1.1M' },
  { name: 'Project M', downloads: '1.1M' },
  { name: 'Sub Hub v3', downloads: '1.1M' },
  { name: 'BANANA S', downloads: '1.1M' },
  { name: 'CHIBB HUB', downloads: '1.0M' },
  { name: 'PS99', downloads: '999.8k' },
  { name: 'SystemB', downloads: '980.1k' },
  { name: 'Versus', downloads: '970.1k' },
  { name: 'UC Hub', downloads: '968.2k' },
];

// Initialize Lucide icons
lucide.createIcons();

// DOM Elements
const currentDateEl = document.getElementById('currentDate');
const onlineUsersEl = document.getElementById('onlineUsers');
const robloxIdInput = document.getElementById('robloxId');
const searchButton = document.getElementById('searchButton');
const userFoundEl = document.getElementById('userFound');
const installCheckbox = document.getElementById('install');
const scriptSelect = document.getElementById('scriptSelect');
const continueButton = document.getElementById('continueButton');
const loadingOverlay = document.getElementById('loadingOverlay');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const loadingMessage = document.getElementById('loadingMessage');
const selectedIdEl = document.getElementById('selectedId');
const connectedUserEl = document.getElementById('connectedUser');
const generatedKeyEl = document.getElementById('generatedKey');
const timeLeftEl = document.getElementById('timeLeft');

// Step containers
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

// Initialize current date
const currentDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
currentDateEl.textContent = currentDate;

// Initialize online users count
let onlineUsers = 850;
updateOnlineUsers();

// Update online users randomly
setInterval(updateOnlineUsers, 3000);

function updateOnlineUsers() {
  const change = Math.floor(Math.random() * 20) - 10;
  onlineUsers = Math.min(Math.max(onlineUsers + change, 800), 900);
  onlineUsersEl.textContent = onlineUsers;
}

// Populate script select
scripts.forEach(script => {
  const option = document.createElement('option');
  option.value = script.name;
  option.textContent = `${script.name} - ${script.downloads} downloads`;
  scriptSelect.appendChild(option);
});

// Input validation
robloxIdInput.addEventListener('input', () => {
  searchButton.disabled = !robloxIdInput.value;
});

// Common search handler function
const handleSearch = async () => {
  const robloxId = robloxIdInput.value;
  if (!robloxId) return;

  showLoading('Searching for user...');
  await simulateProgress(5000);
  hideLoading();

  userFoundEl.classList.remove('hidden');
  setTimeout(() => {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    selectedIdEl.textContent = robloxId;
  }, 1000);
};

// Add both click and touchstart listeners
searchButton.addEventListener('click', handleSearch);
searchButton.addEventListener('touchstart', (e) => {
  e.preventDefault(); // prevent duplicate firing
  handleSearch();
}, { passive: false });


// Install checkbox
installCheckbox.addEventListener('change', () => {
  scriptSelect.disabled = !installCheckbox.checked;
  updateContinueButton();
});

// Script selection
scriptSelect.addEventListener('change', updateContinueButton);

function updateContinueButton() {
  continueButton.disabled = !installCheckbox.checked || !scriptSelect.value;
}

// Continue button
continueButton.addEventListener('click', async () => {
  showLoading('Processing your request...');
  await simulateProgress(5000);
  hideLoading();

  step2.classList.add('hidden');
  step3.classList.remove('hidden');
  
  connectedUserEl.textContent = robloxIdInput.value;
  generatedKeyEl.textContent = 'KEY_1a13dd88f189ace4f2e568**********';
  
  startTimer();
});

// Loading animation
function showLoading(message) {
  loadingMessage.textContent = message;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

async function simulateProgress(duration) {
  const startTime = Date.now();
  
  return new Promise(resolve => {
    function updateProgress() {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${Math.floor(progress)}%`;
      
      if (progress < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(updateProgress);
  });
}

// Timer
function startTimer() {
  let minutes = 1;
  let seconds = 25;
  
  function updateTimer() {
    timeLeftEl.textContent = `${minutes}Minutes ${seconds}Seconds`;
    
    if (seconds > 0) {
      seconds--;
    } else if (minutes > 0) {
      minutes--;
      seconds = 59;
    }
    
    if (minutes >= 0) {
      setTimeout(updateTimer, 1000);
    }
  }
  
  updateTimer();
}
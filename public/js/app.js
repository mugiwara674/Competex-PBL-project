// CompeteX - Main Application Client (SPA)
// Complete Role-Based Access Control, Real-time Leaderboards, Team Join Codes, and Rubric Scoring

// Global Application State
const state = {
  currentUser: null,
  allUsers: [],
  competitions: [],
  teams: [],
  submissions: [],
  evaluations: [],
  announcements: [],
  certificates: [],
  tickets: [],
  sponsors: [],
  schedules: [],
  activeCategoryFilter: 'ALL',
  activeStatusFilter: 'ALL',
  searchQuery: '',
  activeView: 'competitions',
  selectedJudgeSubmissionId: null,
  timelineState: {
    activeCompFilter: 'ALL',
    intervalId: null
  },
  helpdeskState: {
    activeStatusFilter: 'ALL',
    activeCategoryFilter: 'ALL'
  },
  showcaseState: {
    activeCompFilter: 'ALL',
    activeDomainFilter: 'ALL',
    activeSortFilter: 'VOTES',
    selectedSubId: null
  },
  codingState: {
    problems: [],
    activeProblemId: 'prob-1',
    selectedLanguage: 'javascript',
    activeTestCaseIndex: 0,
    lastRunResult: null,
    codeCache: {}
  },
  quizState: {
    questions: [],
    currentIndex: 0,
    timerSeconds: 20,
    timerInterval: null,
    answers: [],
    currentScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    isAnswered: false,
    audioCtx: null,
    inProgress: false
  }
};

// ==========================================
// API HELPER WRAPPER
// ==========================================
async function apiGet(endpoint) {
  try {
    const res = await fetch(`/api${endpoint}`);
    return await res.json();
  } catch (err) {
    console.error(`API GET ${endpoint} error:`, err);
    showToast('Failed to connect to server', 'error');
    return { success: false };
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`API POST ${endpoint} error:`, err);
    showToast('Server communication failure', 'error');
    return { success: false };
  }
}

async function apiPut(endpoint, body) {
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`API PUT ${endpoint} error:`, err);
    showToast('Server communication failure', 'error');
    return { success: false };
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-indigo-600 text-white',
    warning: 'bg-amber-600 text-white'
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-bell'
  };

  toast.className = `${bgColors[type] || bgColors.info} px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs md:text-sm font-semibold pointer-events-auto toast-slide-in`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || 'fa-info'} text-base"></i>
    <span class="flex-grow">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white ml-2 text-xs">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

// ==========================================
// APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadInitialData();
  setupRoleSwitcherMenu();
});

async function loadInitialData() {
  // Fetch users & set current user session
  const userRes = await apiGet('/auth/users');
  if (userRes.success) {
    state.allUsers = userRes.users;
    
    // Check localStorage for saved user session
    const savedUserJson = localStorage.getItem('competex_auth_user');
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson);
        const matched = state.allUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase());
        state.currentUser = matched || parsed;
      } catch (e) {
        state.currentUser = state.allUsers[0];
      }
    } else {
      const savedUserRole = localStorage.getItem('competex_user_role') || 'STUDENT';
      const foundUser = state.allUsers.find(u => u.role === savedUserRole) || state.allUsers[0];
      state.currentUser = foundUser;
    }
  }

  // Fetch Core Entities
  await refreshData();

  // Initial Render
  updateUserInterfaceForRole();
  renderCompetitions();
  populateDropdowns();
}

async function refreshData() {
  const [compRes, teamRes, subRes, evalRes, annRes, certRes, tktRes, spRes, schRes] = await Promise.all([
    apiGet('/competitions'),
    apiGet('/teams'),
    apiGet('/submissions'),
    apiGet('/evaluations'),
    apiGet('/announcements'),
    apiGet('/certificates'),
    apiGet('/tickets'),
    apiGet('/sponsors'),
    apiGet('/schedule')
  ]);

  if (compRes.success) state.competitions = compRes.competitions;
  if (teamRes.success) state.teams = teamRes.teams;
  if (subRes.success) state.submissions = subRes.submissions;
  if (evalRes.success) state.evaluations = evalRes.evaluations;
  if (annRes.success) state.announcements = annRes.announcements;
  if (certRes.success) state.certificates = certRes.certificates;
  if (tktRes && tktRes.success) state.tickets = tktRes.tickets || [];
  if (spRes && spRes.success) state.sponsors = spRes.sponsors || [];
  if (schRes && schRes.success) state.schedules = schRes.schedules || [];
}

// ==========================================
// ROLE SWITCHING & PERMISSIONS
// ==========================================
function setupRoleSwitcherMenu() {
  const btn = document.getElementById('roleDropdownBtn');
  const menu = document.getElementById('roleDropdownMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });

  const demoSwitchBtn = document.getElementById('btnQuickDemoSwitch');
  if (demoSwitchBtn) {
    demoSwitchBtn.addEventListener('click', () => {
      // Cycle through roles: STUDENT -> ORGANIZER -> JUDGE -> ADMIN
      const roles = ['STUDENT', 'ORGANIZER', 'JUDGE', 'ADMIN'];
      const nextIdx = (roles.indexOf(state.currentUser.role) + 1) % roles.length;
      switchRole(roles[nextIdx]);
    });
  }
}

function switchRole(targetRole) {
  const user = state.allUsers.find(u => u.role === targetRole);
  if (!user) return;

  state.currentUser = user;
  localStorage.setItem('competex_user_role', targetRole);

  const menu = document.getElementById('roleDropdownMenu');
  if (menu) menu.classList.add('hidden');

  updateUserInterfaceForRole();
  showToast(`Switched active profile to ${user.name} (${targetRole})`, 'info');

  // If switched to judge, auto navigate to judging pad
  if (targetRole === 'JUDGE') {
    navigateTo('judging');
  } else if (targetRole === 'ADMIN') {
    navigateTo('admin');
  } else {
    // Re-render current view with new role context
    renderCurrentView();
  }
}

function updateUserInterfaceForRole() {
  const user = state.currentUser;
  
  const loggedInActions = document.getElementById('authLoggedInActions');
  const loggedOutActions = document.getElementById('authLoggedOutActions');
  const roleSwitcher = document.getElementById('roleSwitcherContainer');

  if (user) {
    if (loggedInActions) loggedInActions.classList.remove('hidden');
    if (loggedOutActions) loggedOutActions.classList.add('hidden');
    if (roleSwitcher) roleSwitcher.classList.remove('hidden');

    document.getElementById('activeRoleBadge').textContent = user.role;
    document.getElementById('roleLabel').textContent = user.role.charAt(0) + user.role.slice(1).toLowerCase();
    document.getElementById('userDisplayName').textContent = user.name;
    document.getElementById('userAvatarImg').src = user.avatar;

    // Role Banner Context
    document.getElementById('welcomeUserGreeting').textContent = `Welcome back, ${user.name}!`;
    document.getElementById('roleBadgePill').textContent = `${user.role} PORTAL`;
    document.getElementById('roleSubtitle').textContent = `${user.college} • ${user.department}`;

    // Role Icons & Colors
    const iconBox = document.getElementById('roleIconBox');
    const icons = {
      STUDENT: '<i class="fa-solid fa-user-graduate"></i>',
      ORGANIZER: '<i class="fa-solid fa-chalkboard-user"></i>',
      JUDGE: '<i class="fa-solid fa-gavel"></i>',
      ADMIN: '<i class="fa-solid fa-shield-halved"></i>'
    };
    iconBox.innerHTML = icons[user.role] || icons.STUDENT;

    // Role Navigation Links visibility
    const btnCreateComp = document.getElementById('btnCreateCompetition');
    const btnCreateNotice = document.getElementById('btnCreateNotice');

    if (user.role === 'ORGANIZER' || user.role === 'ADMIN') {
      if (btnCreateComp) {
        btnCreateComp.classList.remove('hidden');
        btnCreateComp.classList.add('sm:flex');
      }
      if (btnCreateNotice) btnCreateNotice.classList.remove('hidden');
    } else {
      if (btnCreateComp) {
        btnCreateComp.classList.add('hidden');
        btnCreateComp.classList.remove('sm:flex');
      }
      if (btnCreateNotice) btnCreateNotice.classList.add('hidden');
    }
  } else {
    if (loggedInActions) {
      loggedInActions.classList.add('hidden');
      loggedInActions.classList.remove('flex');
    }
    if (loggedOutActions) {
      loggedOutActions.classList.remove('hidden');
      loggedOutActions.classList.add('flex');
    }
    if (roleSwitcher) roleSwitcher.classList.add('hidden');

    document.getElementById('activeRoleBadge').textContent = 'GUEST';
    document.getElementById('welcomeUserGreeting').textContent = 'Welcome to CompeteX!';
    document.getElementById('roleBadgePill').textContent = 'CAMPUS HUB';
    document.getElementById('roleSubtitle').textContent = 'Sign in or create an account to form teams, submit projects, and view live standings.';
  }

  // Quick Action Buttons in Banner
  const qaContainer = document.getElementById('roleQuickActions');
  if (!user) {
    if (qaContainer) {
      qaContainer.innerHTML = `
        <button onclick="openAuthModal('login')" class="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
          <i class="fa-solid fa-right-to-bracket text-xs"></i> Sign In to Portal
        </button>
        <button onclick="openAuthModal('register')" class="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
          <i class="fa-solid fa-user-plus text-xs"></i> Register Account
        </button>
      `;
    }
    return;
  }

  if (user.role === 'STUDENT') {
    qaContainer.innerHTML = `
      <button onclick="openJoinTeamModal()" class="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-key"></i> Join Team with Code
      </button>
      <button onclick="openCreateTeamModal()" class="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-user-plus"></i> Create Squad
      </button>
      <button onclick="navigateTo('submissions')" class="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-cloud-arrow-up"></i> Submit Deliverable
      </button>
    `;
  } else if (user.role === 'ORGANIZER') {
    qaContainer.innerHTML = `
      <button onclick="openCreateCompetitionModal()" class="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i> Host Competition
      </button>
      <button onclick="openCreateNoticeModal()" class="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-bullhorn"></i> Broadcast Alert
      </button>
      <button onclick="navigateTo('teams')" class="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-users"></i> Review Teams
      </button>
    `;
  } else if (user.role === 'JUDGE') {
    qaContainer.innerHTML = `
      <button onclick="navigateTo('judging')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 animate-pulse">
        <i class="fa-solid fa-gavel"></i> Open Scoring Pad
      </button>
      <button onclick="navigateTo('leaderboard')" class="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-ranking-star"></i> View Live Standings
      </button>
    `;
  } else if (user.role === 'ADMIN') {
    qaContainer.innerHTML = `
      <button onclick="navigateTo('admin')" class="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-chart-line"></i> Analytics Console
      </button>
      <button onclick="openCreateCompetitionModal()" class="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i> Add Event
      </button>
      <button onclick="resetPlatformDatabase()" class="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition flex items-center gap-1.5">
        <i class="fa-solid fa-arrows-rotate"></i> Reset DB
      </button>
    `;
  }
}

// ==========================================
// NAVIGATION SYSTEM
// ==========================================
function navigateTo(viewId) {
  state.activeView = viewId;

  // Toggle View Containers
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const activePanel = document.getElementById(`view-${viewId}`);
  if (activePanel) {
    activePanel.classList.remove('hidden');
  }

  // Update Nav Links Active Style
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.nav === viewId) {
      link.classList.add('active');
    }
  });

  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentView() {
  switch (state.activeView) {
    case 'competitions':
      renderCompetitions();
      break;
    case 'teams':
      renderTeams();
      break;
    case 'submissions':
      renderSubmissions();
      break;
    case 'judging':
      renderJudgingPad();
      break;
    case 'leaderboard':
      renderLeaderboardView();
      break;
    case 'certificates':
      renderCertificatesView();
      break;
    case 'announcements':
      renderAnnouncements();
      break;
    case 'admin':
      renderAdminDashboard();
      break;
    case 'coding':
      renderCodingSandbox();
      break;
    case 'quiz':
      renderQuizArena();
      break;
    case 'timeline':
      renderTimelineView();
      break;
    case 'helpdesk':
      renderHelpdeskView();
      break;
    case 'showcase':
      renderShowcaseView();
      break;
    case 'sponsors':
      renderSponsorsView();
      break;
  }
}

// ==========================================
// COMPETITIONS CATALOG & FILTERING
// ==========================================
function setupEventListeners() {
  const searchInput = document.getElementById('competitionSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderCompetitions();
    });
  }
}

function filterByCategory(category) {
  state.activeCategoryFilter = category;
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderCompetitions();
}

function filterByStatus(status) {
  state.activeStatusFilter = status;
  document.querySelectorAll('.status-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderCompetitions();
}

function resetFilters() {
  state.activeCategoryFilter = 'ALL';
  state.activeStatusFilter = 'ALL';
  state.searchQuery = '';
  const searchInput = document.getElementById('competitionSearchInput');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-pill').forEach(btn => btn.classList.toggle('active', btn.dataset.category === 'ALL'));
  document.querySelectorAll('.status-chip').forEach(btn => btn.classList.toggle('active', btn.dataset.status === 'ALL'));
  renderCompetitions();
}

function renderCompetitions() {
  const grid = document.getElementById('competitionsGrid');
  const emptyState = document.getElementById('competitionsEmptyState');
  if (!grid) return;

  let filtered = [...state.competitions];

  if (state.activeCategoryFilter !== 'ALL') {
    filtered = filtered.filter(c => c.category === state.activeCategoryFilter);
  }

  if (state.activeStatusFilter !== 'ALL') {
    filtered = filtered.filter(c => c.status === state.activeStatusFilter);
  }

  if (state.searchQuery) {
    filtered = filtered.filter(c => 
      c.title.toLowerCase().includes(state.searchQuery) ||
      c.tagline.toLowerCase().includes(state.searchQuery) ||
      c.category.toLowerCase().includes(state.searchQuery)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = filtered.map(comp => {
    // Category Badge Details
    const catColors = {
      HACKATHON: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      CODING: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      EXPO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      QUIZ: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      PAPER: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };

    const statusBadges = {
      ONGOING: '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-circle-dot mr-1 animate-pulse"></i> Ongoing</span>',
      UPCOMING: '<span class="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-clock mr-1"></i> Upcoming</span>',
      JUDGING: '<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-gavel mr-1"></i> In Judging</span>',
      COMPLETED: '<span class="bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i> Completed</span>'
    };

    const teamCount = state.teams.filter(t => t.competitionId === comp.id).length;
    const isUserRegistered = state.teams.some(t => t.competitionId === comp.id && t.members.some(m => m.userId === state.currentUser?.id));

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-brand-500/10 hover:border-slate-600 transition duration-300 flex flex-col group">
        <!-- Banner Image -->
        <div class="relative h-44 overflow-hidden bg-slate-900">
          <img src="${comp.bannerUrl}" alt="${comp.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>
          
          <div class="absolute top-3 left-3 flex items-center gap-2">
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${catColors[comp.category] || 'bg-slate-800 text-slate-300'}">
              ${comp.category}
            </span>
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-md">
              ${comp.type}
            </span>
          </div>

          <div class="absolute top-3 right-3">
            ${statusBadges[comp.status] || ''}
          </div>

          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
            <span class="text-amber-300 font-bold flex items-center gap-1 drop-shadow">
              <i class="fa-solid fa-trophy text-amber-400"></i> ${comp.prizePool}
            </span>
            <span class="text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700 text-[11px]">
              <i class="fa-solid fa-users text-teal-400 mr-1"></i> ${comp.format === 'INDIVIDUAL' ? 'Solo' : `${comp.minTeamSize}-${comp.maxTeamSize} Members`}
            </span>
          </div>
        </div>

        <!-- Body Content -->
        <div class="p-5 flex-grow flex flex-col justify-between space-y-4">
          <div>
            <h3 class="text-base font-bold text-white group-hover:text-brand-300 transition line-clamp-1">${comp.title}</h3>
            <p class="text-xs text-slate-400 mt-1 line-clamp-2">${comp.tagline}</p>
          </div>

          <!-- Metadata Tags -->
          <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span class="block text-slate-500 text-[10px]">Registered Teams</span>
              <strong class="text-slate-200 font-semibold">${teamCount} Squads</strong>
            </div>
            <div>
              <span class="block text-slate-500 text-[10px]">Rounds / Phases</span>
              <strong class="text-slate-200 font-semibold">${comp.rounds ? comp.rounds.length : 1} Stages</strong>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
            <button onclick="openCompetitionDetails('${comp.id}')" class="flex-grow py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-circle-info text-brand-400"></i> Details & Rules
            </button>
            
            ${comp.id === 'cmp-2' ? `
              <button onclick="navigateTo('coding')" class="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition flex items-center gap-1.5">
                <i class="fa-solid fa-code"></i> Code Sandbox
              </button>
            ` : ''}

            ${comp.id === 'cmp-4' ? `
              <button onclick="navigateTo('quiz')" class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition flex items-center gap-1.5">
                <i class="fa-solid fa-bolt"></i> Live Quiz
              </button>
            ` : ''}

            ${isUserRegistered ? `
              <span class="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1">
                <i class="fa-solid fa-check"></i> Registered
              </span>
            ` : `
              <button onclick="quickRegisterForComp('${comp.id}')" class="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-1.5">
                <i class="fa-solid fa-plus"></i> Register
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// COMPETITION DETAIL MODAL
// ==========================================
function openCompetitionDetails(compId) {
  const comp = state.competitions.find(c => c.id === compId);
  if (!comp) return;

  const teams = state.teams.filter(t => t.competitionId === comp.id);
  const submissions = state.submissions.filter(s => s.competitionId === comp.id);
  const announcements = state.announcements.filter(a => a.competitionId === comp.id);

  const container = document.getElementById('compDetailContent');
  container.innerHTML = `
    <!-- Modal Hero Banner -->
    <div class="relative h-56 bg-slate-900 rounded-t-3xl overflow-hidden">
      <img src="${comp.bannerUrl}" alt="${comp.title}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-black/50"></div>
      
      <div class="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-600 text-white uppercase tracking-wider">${comp.category}</span>
          <h2 class="text-2xl font-extrabold text-white mt-1.5">${comp.title}</h2>
          <p class="text-xs text-slate-300 mt-1 max-w-xl">${comp.tagline}</p>
        </div>
        <div class="flex items-center gap-3">
          ${comp.id === 'cmp-2' ? `
            <button onclick="closeModal('modalCompetitionDetail'); navigateTo('coding');" class="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-500/25">
              <i class="fa-solid fa-code"></i> Launch Sandbox
            </button>
          ` : ''}
          ${comp.id === 'cmp-4' ? `
            <button onclick="closeModal('modalCompetitionDetail'); navigateTo('quiz');" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-500/25">
              <i class="fa-solid fa-bolt"></i> Play Live Quiz
            </button>
          ` : ''}
          <div class="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-right">
            <span class="text-[10px] text-slate-400 block">Prize Pool</span>
            <strong class="text-amber-400 text-sm">${comp.prizePool}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Navigation Tabs -->
    <div class="border-b border-slate-700 bg-slate-900/60 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
      <button onclick="switchCompTab('overview')" class="comp-tab active py-3 border-b-2 border-brand-500 text-white" data-tab="overview">Overview & Rules</button>
      <button onclick="switchCompTab('rounds')" class="comp-tab py-3 text-slate-400 hover:text-white" data-tab="rounds">Rounds & Deadlines (${comp.rounds ? comp.rounds.length : 1})</button>
      <button onclick="switchCompTab('rubrics')" class="comp-tab py-3 text-slate-400 hover:text-white" data-tab="rubrics">Judging Rubric (${comp.rubrics ? comp.rubrics.length : 0})</button>
      <button onclick="switchCompTab('teams')" class="comp-tab py-3 text-slate-400 hover:text-white" data-tab="teams">Registered Squads (${teams.length})</button>
      <button onclick="switchCompTab('announcements')" class="comp-tab py-3 text-slate-400 hover:text-white" data-tab="announcements">Notices (${announcements.length})</button>
    </div>

    <!-- Tab Contents -->
    <div class="p-6 space-y-6">
      
      <!-- TAB 1: OVERVIEW -->
      <div id="compTab-overview" class="comp-tab-content space-y-4">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description & Vision</h4>
          <p class="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line">${comp.description || comp.tagline}</p>
        </div>

        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Competition Guidelines & Rules</h4>
          <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed">
            ${comp.rules}
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span class="text-slate-500 text-[10px] block">Location / Mode</span>
            <strong class="text-slate-200">${comp.location}</strong>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span class="text-slate-500 text-[10px] block">Entry Fee</span>
            <strong class="text-slate-200">${comp.entryFee}</strong>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span class="text-slate-500 text-[10px] block">Format</span>
            <strong class="text-slate-200">${comp.format === 'INDIVIDUAL' ? 'Solo' : `Team (${comp.minTeamSize}-${comp.maxTeamSize})`}</strong>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span class="text-slate-500 text-[10px] block">Organizer Lead</span>
            <strong class="text-slate-200">${comp.organizerName}</strong>
          </div>
        </div>
      </div>

      <!-- TAB 2: ROUNDS -->
      <div id="compTab-rounds" class="comp-tab-content hidden space-y-3">
        ${comp.rounds ? comp.rounds.map(r => `
          <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold">${r.roundNumber}</span>
                <h4 class="text-sm font-bold text-white">${r.title}</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">${r.status}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">${r.description}</p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] text-slate-500 block">Submission Deadline</span>
              <strong class="text-xs text-amber-300 font-mono">${new Date(r.deadline).toLocaleDateString()} ${new Date(r.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
          </div>
        `).join('') : '<p class="text-xs text-slate-400">No round specifications defined yet.</p>'}
      </div>

      <!-- TAB 3: RUBRICS -->
      <div id="compTab-rubrics" class="comp-tab-content hidden space-y-3">
        <p class="text-xs text-slate-400">Judges evaluate projects against these transparent rubric weights:</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${comp.rubrics ? comp.rubrics.map(rub => `
            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-700">
              <div class="flex items-center justify-between">
                <strong class="text-xs font-bold text-white">${rub.name}</strong>
                <span class="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">${rub.weight}% Weight (Max ${rub.maxScore} pts)</span>
              </div>
              <p class="text-xs text-slate-400 mt-1.5">${rub.desc}</p>
            </div>
          `).join('') : '<p class="text-xs text-slate-400">Rubric criteria pending publication.</p>'}
        </div>
      </div>

      <!-- TAB 4: TEAMS -->
      <div id="compTab-teams" class="comp-tab-content hidden space-y-3">
        ${teams.length > 0 ? `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${teams.map(t => `
              <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h5 class="text-xs font-bold text-white">${t.teamName}</h5>
                  <span class="text-[11px] text-slate-400">Leader: ${t.leaderName} • ${t.members.length} members</span>
                </div>
                <span class="text-[10px] font-mono bg-slate-800 text-teal-300 px-2 py-1 rounded border border-slate-700">${t.joinCode}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-center py-8 text-slate-500">
            <i class="fa-solid fa-users text-3xl mb-2"></i>
            <p class="text-xs">No squads registered yet. Be the first team to register!</p>
          </div>
        `}
      </div>

      <!-- TAB 5: ANNOUNCEMENTS -->
      <div id="compTab-announcements" class="comp-tab-content hidden space-y-3">
        ${announcements.length > 0 ? announcements.map(a => `
          <div class="p-4 rounded-xl bg-slate-900/80 border ${a.priority === 'HIGH' ? 'border-pink-500/40 bg-pink-950/10' : 'border-slate-700'}">
            <div class="flex items-center justify-between mb-1">
              <strong class="text-xs font-bold text-white">${a.title}</strong>
              <span class="text-[10px] ${a.priority === 'HIGH' ? 'text-pink-400 font-bold' : 'text-slate-400'}">${new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="text-xs text-slate-300 mt-1">${a.content}</p>
            <span class="block text-[10px] text-slate-500 mt-2">— ${a.author}</span>
          </div>
        `).join('') : '<p class="text-xs text-slate-400">No announcements yet for this competition.</p>'}
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <div class="p-6 bg-slate-900/80 border-t border-slate-700 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
      <button onclick="closeModal('modalCompetitionDetail')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
        Close
      </button>
      <div class="flex items-center gap-2">
        <button onclick="openCreateTeamForComp('${comp.id}')" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition flex items-center gap-1.5">
          <i class="fa-solid fa-user-plus"></i> Form Squad for Event
        </button>
        <button onclick="openSubmitForComp('${comp.id}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-1.5">
          <i class="fa-solid fa-upload"></i> Submit Project
        </button>
      </div>
    </div>
  `;

  document.getElementById('modalCompetitionDetail').classList.remove('hidden');
}

function switchCompTab(tabName) {
  document.querySelectorAll('.comp-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
    b.classList.toggle('text-white', b.dataset.tab === tabName);
    b.classList.toggle('border-b-2', b.dataset.tab === tabName);
    b.classList.toggle('border-brand-500', b.dataset.tab === tabName);
    b.classList.toggle('text-slate-400', b.dataset.tab !== tabName);
  });

  document.querySelectorAll('.comp-tab-content').forEach(c => {
    c.classList.add('hidden');
  });

  const activeContent = document.getElementById(`compTab-${tabName}`);
  if (activeContent) activeContent.classList.remove('hidden');
}

function quickRegisterForComp(compId) {
  openCreateTeamForComp(compId);
}

function openCreateTeamForComp(compId) {
  closeModal('modalCompetitionDetail');
  openCreateTeamModal();
  const select = document.getElementById('createTeamCompSelect');
  if (select) select.value = compId;
}

function openSubmitForComp(compId) {
  closeModal('modalCompetitionDetail');
  openSubmitModal();
  const select = document.getElementById('subCompSelect');
  if (select) {
    select.value = compId;
    updateSubTeamSelect(compId);
  }
}

// ==========================================
// TEAMS & SQUADS MANAGEMENT
// ==========================================
function renderTeams() {
  const container = document.getElementById('teamsContainer');
  if (!container) return;

  if (state.teams.length === 0) {
    container.innerHTML = `
      <div class="col-span-3 text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
        <i class="fa-solid fa-users text-4xl text-slate-600 mb-3"></i>
        <h3 class="text-base font-semibold text-slate-300">No teams created yet</h3>
        <p class="text-xs text-slate-500 mt-1">Form a squad or join one using an invite code.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.teams.map(team => {
    const comp = state.competitions.find(c => c.id === team.competitionId);
    const isMember = team.members.some(m => m.userId === state.currentUser?.id);

    return `
      <div class="bg-slate-800/80 border ${isMember ? 'border-brand-500/50 bg-slate-800/95 shadow-brand-500/10' : 'border-slate-700/60'} rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase">${comp ? comp.category : 'COMPETITION'}</span>
              <h3 class="text-base font-bold text-white mt-1">${team.teamName}</h3>
              <p class="text-xs text-slate-400">${comp ? comp.title : 'General Event'}</p>
            </div>
            
            <!-- Copyable Join Code -->
            <button onclick="copyJoinCode('${team.joinCode}')" title="Click to copy join code" class="bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 text-teal-300 font-mono text-xs font-bold transition flex items-center gap-1.5">
              <span>${team.joinCode}</span>
              <i class="fa-regular fa-copy text-slate-400"></i>
            </button>
          </div>

          <!-- Members Roster -->
          <div class="mt-4 space-y-2">
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500">Squad Members (${team.members.length})</span>
            <div class="space-y-1.5">
              ${team.members.map(m => `
                <div class="flex items-center justify-between text-xs bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span class="text-slate-200 font-medium flex items-center gap-2">
                    <i class="fa-solid fa-user text-slate-400 text-[10px]"></i> ${m.name}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">${m.dept}</span>
                    ${m.role === 'LEADER' ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">LEADER</span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
          <span class="text-slate-500 text-[11px]">Formed on ${new Date(team.createdAt).toLocaleDateString()}</span>
          ${isMember ? `
            <span class="text-brand-400 font-semibold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Your Squad</span>
          ` : `
            <button onclick="quickJoinTeamDirect('${team.joinCode}')" class="text-teal-400 hover:text-teal-300 font-medium text-xs">Join Squad →</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function copyJoinCode(code) {
  navigator.clipboard.writeText(code);
  showToast(`Team Join Code [${code}] copied to clipboard!`, 'success');
}

function quickJoinTeamDirect(code) {
  openJoinTeamModal();
  document.getElementById('joinTeamCode').value = code;
}

async function handleCreateTeam(e) {
  e.preventDefault();
  const compId = document.getElementById('createTeamCompSelect').value;
  const teamName = document.getElementById('createTeamName').value.trim();

  if (!teamName) {
    showToast('Please enter a team name', 'warning');
    return;
  }

  const res = await apiPost('/teams', {
    competitionId: compId,
    teamName,
    leaderId: state.currentUser.id,
    leaderName: state.currentUser.name,
    leaderDept: state.currentUser.department
  });

  if (res.success) {
    showToast(`Team "${teamName}" created! Join Code: ${res.team.joinCode}`, 'success');
    closeModal('modalCreateTeam');
    document.getElementById('createTeamName').value = '';
    await refreshData();
    renderTeams();
    populateDropdowns();
  } else {
    showToast(res.error || 'Failed to create team', 'error');
  }
}

async function handleJoinTeam(e) {
  e.preventDefault();
  const code = document.getElementById('joinTeamCode').value.trim().toUpperCase();

  if (!code) {
    showToast('Please enter a join code', 'warning');
    return;
  }

  const res = await apiPost('/teams/join', {
    joinCode: code,
    userId: state.currentUser.id,
    userName: state.currentUser.name,
    userDept: state.currentUser.department
  });

  if (res.success) {
    showToast(res.message || 'Joined squad successfully!', 'success');
    closeModal('modalJoinTeam');
    document.getElementById('joinTeamCode').value = '';
    await refreshData();
    renderTeams();
  } else {
    showToast(res.error || 'Failed to join squad', 'error');
  }
}

// ==========================================
// PROJECT SUBMISSIONS
// ==========================================
function renderSubmissions() {
  const container = document.getElementById('submissionsContainer');
  if (!container) return;

  if (state.submissions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-800">
        <i class="fa-solid fa-file-code text-4xl text-slate-600 mb-3"></i>
        <h3 class="text-base font-semibold text-slate-300">No project submissions yet</h3>
        <p class="text-xs text-slate-500 mt-1">Submit your code repositories and demo deliverables.</p>
        <button onclick="openSubmitModal()" class="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition">Submit Project</button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.submissions.map(sub => {
    const comp = state.competitions.find(c => c.id === sub.competitionId);
    const team = state.teams.find(t => t.id === sub.teamId);
    const evaluations = state.evaluations.filter(e => e.submissionId === sub.id);

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase">${comp ? comp.category : 'EVENT'}</span>
              <span class="text-xs font-semibold text-teal-400"><i class="fa-solid fa-users mr-1"></i> ${team ? team.teamName : 'Unknown Squad'}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === 'EVALUATED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                ${sub.status === 'EVALUATED' ? '<i class="fa-solid fa-check-double mr-1"></i> Graded' : '<i class="fa-solid fa-hourglass-half mr-1"></i> In Review'}
              </span>
            </div>
            <h3 class="text-lg font-bold text-white mt-1">${sub.projectTitle}</h3>
            <p class="text-xs text-slate-400 mt-1">${sub.abstract}</p>
          </div>

          <!-- Evaluation Score Pill -->
          <div class="shrink-0 flex items-center gap-3">
            ${evaluations.length > 0 ? `
              <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 text-right">
                <span class="text-[10px] text-slate-400 block">Jury Score</span>
                <strong class="text-lg text-amber-400 font-extrabold">${evaluations[0].totalScore} <span class="text-xs text-slate-500">/ 100</span></strong>
              </div>
            ` : `
              <div class="bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-400">
                Awaiting Score
              </div>
            `}
          </div>
        </div>

        <!-- Links & Tech Stack -->
        <div class="flex flex-wrap items-center gap-3 pt-2 text-xs">
          ${sub.repoUrl ? `
            <a href="${sub.repoUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5">
              <i class="fa-brands fa-github text-slate-300"></i> Repository
            </a>
          ` : ''}
          ${sub.demoUrl ? `
            <a href="${sub.demoUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition flex items-center gap-1.5">
              <i class="fa-solid fa-arrow-up-right-from-square text-brand-400"></i> Live Demo
            </a>
          ` : ''}
          ${sub.slidesUrl ? `
            <a href="${sub.slidesUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5">
              <i class="fa-solid fa-file-powerpoint text-amber-400"></i> Presentation Deck
            </a>
          ` : ''}

          <!-- Tech Tags -->
          <div class="flex flex-wrap gap-1 ml-auto">
            ${sub.techStack ? sub.techStack.map(t => `<span class="bg-slate-900 text-slate-400 px-2 py-0.5 rounded text-[10px] border border-slate-800">${t}</span>`).join('') : ''}
          </div>
        </div>

        <!-- Feedback notes if evaluated -->
        ${evaluations.length > 0 && evaluations[0].publicFeedback ? `
          <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span class="text-[10px] font-bold text-amber-400 block mb-0.5"><i class="fa-solid fa-comment-dots mr-1"></i> Jury Feedback (${evaluations[0].judgeName})</span>
            ${evaluations[0].publicFeedback}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function handleSubmitProject(e) {
  e.preventDefault();
  const compId = document.getElementById('subCompSelect').value;
  const teamId = document.getElementById('subTeamSelect').value;
  const projectTitle = document.getElementById('subTitle').value.trim();
  const abstract = document.getElementById('subAbstract').value.trim();
  const repoUrl = document.getElementById('subRepoUrl').value.trim();
  const demoUrl = document.getElementById('subDemoUrl').value.trim();
  const slidesUrl = document.getElementById('subSlidesUrl').value.trim();
  const videoUrl = document.getElementById('subVideoUrl').value.trim();
  const techStack = document.getElementById('subTechStack').value.split(',').map(s => s.trim()).filter(Boolean);

  if (!projectTitle || !abstract) {
    showToast('Project title and abstract are required', 'warning');
    return;
  }

  const res = await apiPost('/submissions', {
    competitionId: compId,
    teamId,
    projectTitle,
    abstract,
    repoUrl,
    demoUrl,
    slidesUrl,
    videoUrl,
    techStack
  });

  if (res.success) {
    showToast('Project deliverable submitted successfully!', 'success');
    closeModal('modalSubmit');
    await refreshData();
    renderSubmissions();
    if (state.activeView === 'submissions') renderSubmissions();
  } else {
    showToast(res.error || 'Submission failed', 'error');
  }
}

// ==========================================
// JUDGE SCORING PAD & RUBRIC SLIDERS
// ==========================================
function renderJudgingPad() {
  const queueList = document.getElementById('judgeQueueList');
  const padName = document.getElementById('judgePadName');
  const queueCount = document.getElementById('judgeQueueCount');
  if (!queueList) return;

  padName.textContent = `${state.currentUser.name} (${state.currentUser.role})`;
  queueCount.textContent = `${state.submissions.length} Submissions`;

  if (state.submissions.length === 0) {
    queueList.innerHTML = '<p class="text-xs text-slate-500 py-4 text-center">No submissions available to evaluate.</p>';
    return;
  }

  queueList.innerHTML = state.submissions.map(sub => {
    const team = state.teams.find(t => t.id === sub.teamId);
    const comp = state.competitions.find(c => c.id === sub.competitionId);
    const isEvaluated = state.evaluations.some(e => e.submissionId === sub.id && e.judgeId === state.currentUser.id);
    const isSelected = state.selectedJudgeSubmissionId === sub.id;

    return `
      <div onclick="selectJudgeSubmission('${sub.id}')" class="p-3 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-brand-600/20 border-brand-500 text-white' : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/50 text-slate-300'}">
        <div class="flex items-center justify-between">
          <strong class="text-xs font-bold line-clamp-1">${team ? team.teamName : 'Squad'}</strong>
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${isEvaluated ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
            ${isEvaluated ? 'Graded' : 'Pending'}
          </span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1 line-clamp-1">${sub.projectTitle}</p>
        <span class="text-[10px] text-slate-500 block mt-1">${comp ? comp.category : ''}</span>
      </div>
    `;
  }).join('');

  if (state.selectedJudgeSubmissionId) {
    renderActiveJudgeWorkspace(state.selectedJudgeSubmissionId);
  } else if (state.submissions.length > 0) {
    selectJudgeSubmission(state.submissions[0].id);
  }
}

function selectJudgeSubmission(subId) {
  state.selectedJudgeSubmissionId = subId;
  renderJudgingPad();
}

function renderActiveJudgeWorkspace(subId) {
  const pad = document.getElementById('judgeActivePad');
  if (!pad) return;

  const sub = state.submissions.find(s => s.id === subId);
  if (!sub) return;

  const comp = state.competitions.find(c => c.id === sub.competitionId);
  const team = state.teams.find(t => t.id === sub.teamId);
  const existingEval = state.evaluations.find(e => e.submissionId === sub.id && e.judgeId === state.currentUser.id);

  const rubrics = comp && comp.rubrics && comp.rubrics.length > 0 ? comp.rubrics : [
    { id: 'rub-gen-1', name: 'Technical Execution', maxScore: 40, weight: 40, desc: 'Architecture & code quality' },
    { id: 'rub-gen-2', name: 'Innovation', maxScore: 30, weight: 30, desc: 'Originality of concept' },
    { id: 'rub-gen-3', name: 'Presentation & UI', maxScore: 30, weight: 30, desc: 'Demonstration polish' }
  ];

  pad.innerHTML = `
    <div class="space-y-6">
      <!-- Submission Header -->
      <div class="pb-4 border-b border-slate-700">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-teal-400"><i class="fa-solid fa-users mr-1"></i> Team: ${team ? team.teamName : 'Unknown'}</span>
          <span class="text-xs text-slate-400">${comp ? comp.title : ''}</span>
        </div>
        <h3 class="text-xl font-bold text-white mt-1">${sub.projectTitle}</h3>
        <p class="text-xs text-slate-300 mt-2 leading-relaxed">${sub.abstract}</p>
        
        <!-- Action links for evaluation -->
        <div class="flex flex-wrap gap-2 mt-3 text-xs">
          ${sub.repoUrl ? `<a href="${sub.repoUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"><i class="fa-brands fa-github"></i> Inspect Repo</a>` : ''}
          ${sub.demoUrl ? `<a href="${sub.demoUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 flex items-center gap-1.5"><i class="fa-solid fa-arrow-up-right-from-square"></i> Test Live App</a>` : ''}
          ${sub.slidesUrl ? `<a href="${sub.slidesUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-file-powerpoint text-amber-400"></i> Review Deck</a>` : ''}
        </div>
      </div>

      <!-- Rubric Criteria Scoring Form -->
      <form id="formJudgeScoring" onsubmit="handleJudgeSubmit(event, '${sub.id}', '${comp ? comp.id : ''}', '${team ? team.id : ''}')" class="space-y-5">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Scoring Rubrics Matrix</h4>
          <div class="text-xs font-bold text-slate-300 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
            Total Calculated Score: <span id="totalLiveScore" class="text-amber-400 text-sm ml-1">0</span> / 100
          </div>
        </div>

        <div class="space-y-4">
          ${rubrics.map(rub => {
            const initialScore = (existingEval && existingEval.scores && existingEval.scores[rub.id]) ? existingEval.scores[rub.id] : Math.round(rub.maxScore * 0.8);
            return `
              <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                <div class="flex items-center justify-between">
                  <div>
                    <strong class="text-xs font-bold text-white">${rub.name}</strong>
                    <span class="text-[10px] text-slate-400 block">${rub.desc}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-bold text-brand-400" id="val-${rub.id}">${initialScore}</span>
                    <span class="text-[10px] text-slate-500">/ ${rub.maxScore} pts</span>
                  </div>
                </div>

                <input type="range" min="0" max="${rub.maxScore}" value="${initialScore}" 
                  class="w-full rubric-slider" data-rubric="${rub.id}" 
                  oninput="updateRubricValue('${rub.id}', this.value)">
              </div>
            `;
          }).join('')}
        </div>

        <!-- Feedback notes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Public Constructive Feedback (Visible to Team)</label>
            <textarea id="judgePublicFeedback" rows="2" placeholder="Great technical demo, clean architecture..." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">${existingEval ? (existingEval.publicFeedback || '') : ''}</textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Private Jury Remarks (Organizer Eyes Only)</label>
            <textarea id="judgePrivateFeedback" rows="2" placeholder="Potential candidate for 1st place in AI track..." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">${existingEval ? (existingEval.privateFeedback || '') : ''}</textarea>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2">
            <i class="fa-solid fa-lock"></i> Submit & Lock Evaluation Score
          </button>
        </div>
      </form>
    </div>
  `;

  calculateLiveTotal();
}

function updateRubricValue(rubricId, val) {
  const span = document.getElementById(`val-${rubricId}`);
  if (span) span.textContent = val;
  calculateLiveTotal();
}

function calculateLiveTotal() {
  const sliders = document.querySelectorAll('.rubric-slider');
  let total = 0;
  sliders.forEach(s => {
    total += Number(s.value) || 0;
  });
  const liveTotal = document.getElementById('totalLiveScore');
  if (liveTotal) liveTotal.textContent = total;
}

async function handleJudgeSubmit(e, subId, compId, teamId) {
  e.preventDefault();
  const sliders = document.querySelectorAll('.rubric-slider');
  const scores = {};
  sliders.forEach(s => {
    scores[s.dataset.rubric] = Number(s.value);
  });

  const publicFeedback = document.getElementById('judgePublicFeedback').value.trim();
  const privateFeedback = document.getElementById('judgePrivateFeedback').value.trim();

  const res = await apiPost('/evaluations', {
    competitionId: compId,
    submissionId: subId,
    teamId,
    judgeId: state.currentUser.id,
    judgeName: state.currentUser.name,
    scores,
    publicFeedback,
    privateFeedback
  });

  if (res.success) {
    showToast(`Evaluation recorded! Total score: ${res.evaluation.totalScore} / 100`, 'success');
    await refreshData();
    renderJudgingPad();
  } else {
    showToast(res.error || 'Evaluation submission failed', 'error');
  }
}

// ==========================================
// LIVE LEADERBOARD
// ==========================================
async function renderLeaderboardView() {
  const select = document.getElementById('leaderboardCompSelect');
  if (!select) return;

  if (select.children.length === 0 && state.competitions.length > 0) {
    select.innerHTML = state.competitions.map(c => `
      <option value="${c.id}">${c.title} (${c.category})</option>
    `).join('');
  }

  const selectedCompId = select.value || (state.competitions[0] ? state.competitions[0].id : null);
  if (selectedCompId) {
    await loadLeaderboardForComp(selectedCompId);
  }
}

async function loadLeaderboardForComp(compId) {
  const res = await apiGet(`/leaderboard/${compId}`);
  const podiumContainer = document.getElementById('podiumContainer');
  const tableBody = document.getElementById('leaderboardTableBody');

  if (!res.success || !res.leaderboard || res.leaderboard.length === 0) {
    podiumContainer.innerHTML = '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 text-slate-500">No teams or evaluated scores yet for this competition.</td>
      </tr>
    `;
    return;
  }

  const list = res.leaderboard;

  // Podium for Top 3
  const top3 = list.slice(0, 3);
  const podiumColors = [
    { medal: '🥇 1st Place', border: 'border-yellow-500/50', bg: 'bg-gradient-to-b from-yellow-500/10 to-slate-900', text: 'text-yellow-400' },
    { medal: '🥈 2nd Place', border: 'border-slate-400/50', bg: 'bg-gradient-to-b from-slate-400/10 to-slate-900', text: 'text-slate-300' },
    { medal: '🥉 3rd Place', border: 'border-amber-700/50', bg: 'bg-gradient-to-b from-amber-700/10 to-slate-900', text: 'text-amber-500' }
  ];

  podiumContainer.innerHTML = top3.map((item, idx) => {
    const p = podiumColors[idx];
    return `
      <div class="p-5 rounded-2xl border ${p.border} ${p.bg} shadow-xl text-center space-y-2">
        <span class="text-base font-extrabold ${p.text}">${p.medal}</span>
        <h3 class="text-lg font-bold text-white">${item.teamName}</h3>
        <p class="text-xs text-slate-400">${item.submission ? item.submission.title : 'No submission'}</p>
        <div class="pt-2">
          <span class="text-2xl font-black text-white">${item.totalScore}</span>
          <span class="text-xs text-slate-400">/ 100 pts</span>
        </div>
      </div>
    `;
  }).join('');

  // Table Body
  tableBody.innerHTML = list.map(item => `
    <tr class="hover:bg-slate-700/30 transition">
      <td class="py-3 px-4 font-bold text-slate-200">
        ${item.rank === 1 ? '🥇 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : `#${item.rank}`}
      </td>
      <td class="py-3 px-4">
        <strong class="text-white block">${item.teamName}</strong>
        <span class="text-[11px] text-slate-400">Lead: ${item.leaderName} • ${item.memberCount} members</span>
      </td>
      <td class="py-3 px-4">
        ${item.submission ? `
          <strong class="text-slate-200 block text-xs">${item.submission.title}</strong>
          ${item.submission.demoUrl ? `<a href="${item.submission.demoUrl}" target="_blank" class="text-[11px] text-brand-400 hover:underline">Live Demo</a>` : ''}
        ` : '<span class="text-slate-500 italic">No deliverable submitted</span>'}
      </td>
      <td class="py-3 px-4 text-center">
        <span class="bg-slate-900 px-2 py-0.5 rounded text-xs text-slate-300 border border-slate-700">
          ${item.evaluatedJudgesCount} Jury reviews
        </span>
      </td>
      <td class="py-3 px-4 text-right">
        <strong class="text-sm font-extrabold text-amber-400">${item.totalScore}</strong>
        <span class="text-[10px] text-slate-500 block">/ 100</span>
      </td>
      <td class="py-3 px-4 text-center">
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${item.totalScore > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
          ${item.totalScore > 0 ? 'Evaluated' : 'Pending'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================
function renderAnnouncements() {
  const container = document.getElementById('announcementsList');
  if (!container) return;

  if (state.announcements.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 py-8 text-center">No announcements posted yet.</p>';
    return;
  }

  container.innerHTML = state.announcements.map(a => {
    const comp = state.competitions.find(c => c.id === a.competitionId);

    return `
      <div class="p-5 rounded-2xl bg-slate-800/80 border ${a.priority === 'HIGH' ? 'border-pink-500/40 bg-pink-950/10 shadow-lg shadow-pink-500/5' : 'border-slate-700/60'} space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            ${a.priority === 'HIGH' ? '<span class="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Urgent Alert</span>' : ''}
            <h3 class="text-sm font-bold text-white">${a.title}</h3>
          </div>
          <span class="text-xs text-slate-500">${new Date(a.createdAt).toLocaleDateString()}</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">${a.content}</p>
        <div class="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target: <strong class="text-slate-300">${comp ? comp.title : 'Campus Wide'}</strong></span>
          <span>Broadcasted by: <strong class="text-slate-300">${a.author}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

async function handleCreateNotice(e) {
  e.preventDefault();
  const compId = document.getElementById('noticeCompSelect').value;
  const priority = document.getElementById('noticePriority').value;
  const title = document.getElementById('noticeTitle').value.trim();
  const content = document.getElementById('noticeContent').value.trim();

  if (!title || !content) {
    showToast('Title and content are required', 'warning');
    return;
  }

  const res = await apiPost('/announcements', {
    competitionId: compId,
    priority,
    title,
    content,
    author: `${state.currentUser.name} (${state.currentUser.role})`
  });

  if (res.success) {
    showToast('Announcement broadcasted to participants!', 'success');
    closeModal('modalCreateNotice');
    document.getElementById('noticeTitle').value = '';
    document.getElementById('noticeContent').value = '';
    await refreshData();
    renderAnnouncements();
  } else {
    showToast(res.error || 'Failed to post announcement', 'error');
  }
}

// ==========================================
// ADMIN DASHBOARD & ANALYTICS
// ==========================================
async function renderAdminDashboard() {
  const res = await apiGet('/stats');
  if (!res.success) return;

  const s = res.stats;
  const kpis = document.getElementById('adminKpis');
  if (kpis) {
    kpis.innerHTML = `
      <div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
        <span class="text-slate-400 text-xs block">Active Competitions</span>
        <strong class="text-2xl font-black text-white">${s.totalCompetitions}</strong>
        <span class="text-[10px] text-emerald-400 block mt-1"><i class="fa-solid fa-arrow-up"></i> ${s.ongoingCompetitions} Active</span>
      </div>
      <div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
        <span class="text-slate-400 text-xs block">Formed Squads</span>
        <strong class="text-2xl font-black text-white">${s.totalTeams}</strong>
        <span class="text-[10px] text-teal-400 block mt-1"><i class="fa-solid fa-users"></i> Registered</span>
      </div>
      <div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
        <span class="text-slate-400 text-xs block">Submissions</span>
        <strong class="text-2xl font-black text-white">${s.totalSubmissions}</strong>
        <span class="text-[10px] text-blue-400 block mt-1"><i class="fa-solid fa-cloud-arrow-up"></i> Projects</span>
      </div>
      <div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
        <span class="text-slate-400 text-xs block">Jury Evaluations</span>
        <strong class="text-2xl font-black text-white">${s.totalEvaluations}</strong>
        <span class="text-[10px] text-amber-400 block mt-1"><i class="fa-solid fa-gavel"></i> Scores Recorded</span>
      </div>
    `;
  }

  const bars = document.getElementById('categoryBreakdownBars');
  if (bars && s.categoryBreakdown) {
    const cats = [
      { name: 'Hackathons', count: s.categoryBreakdown.HACKATHON || 0, color: 'bg-indigo-500' },
      { name: 'Coding Contests', count: s.categoryBreakdown.CODING || 0, color: 'bg-teal-500' },
      { name: 'Project Expos', count: s.categoryBreakdown.EXPO || 0, color: 'bg-amber-500' },
      { name: 'Quizzes', count: s.categoryBreakdown.QUIZ || 0, color: 'bg-rose-500' },
      { name: 'Paper Presentations', count: s.categoryBreakdown.PAPER || 0, color: 'bg-purple-500' }
    ];

    const maxVal = Math.max(...cats.map(c => c.count), 1);

    bars.innerHTML = cats.map(c => `
      <div class="space-y-1">
        <div class="flex justify-between text-xs">
          <span class="text-slate-300 font-medium">${c.name}</span>
          <span class="text-slate-400 font-bold">${c.count} Events</span>
        </div>
        <div class="w-full bg-slate-900 rounded-full h-2">
          <div class="${c.color} h-2 rounded-full" style="width: ${(c.count / maxVal) * 100}%"></div>
        </div>
      </div>
    `).join('');
  }
}

// ==========================================
// CREATE COMPETITION (ORGANIZER/ADMIN)
// ==========================================
async function handleCreateCompetition(e) {
  e.preventDefault();
  const title = document.getElementById('newCompTitle').value.trim();
  const category = document.getElementById('newCompCategory').value;
  const prizePool = document.getElementById('newCompPrize').value.trim();
  const format = document.getElementById('newCompFormat').value;
  const minTeamSize = document.getElementById('newCompMinTeam').value;
  const maxTeamSize = document.getElementById('newCompMaxTeam').value;
  const tagline = document.getElementById('newCompTagline').value.trim();
  const description = document.getElementById('newCompDesc').value.trim();
  const bannerUrl = document.getElementById('newCompBanner').value.trim();

  if (!title) {
    showToast('Competition title is required', 'warning');
    return;
  }

  const res = await apiPost('/competitions', {
    title,
    category,
    prizePool: prizePool || '$1,000',
    format,
    minTeamSize,
    maxTeamSize,
    tagline,
    description,
    bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
    organizerId: state.currentUser.id,
    organizerName: state.currentUser.name
  });

  if (res.success) {
    showToast(`Competition "${title}" published successfully!`, 'success');
    closeModal('modalCreateCompetition');
    document.getElementById('formCreateCompetition').reset();
    await refreshData();
    renderCompetitions();
    populateDropdowns();
  } else {
    showToast(res.error || 'Failed to create competition', 'error');
  }
}

// ==========================================
// MODAL CONTROLS & HELPERS
// ==========================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function openCreateCompetitionModal() {
  openModal('modalCreateCompetition');
}

function openCreateTeamModal() {
  openModal('modalCreateTeam');
  populateDropdowns();
}

function openJoinTeamModal() {
  openModal('modalJoinTeam');
}

function openSubmitModal() {
  openModal('modalSubmit');
  populateDropdowns();
}

function openCreateNoticeModal() {
  openModal('modalCreateNotice');
  populateDropdowns();
}

function openProfileModal() {
  const u = state.currentUser;
  if (!u) return;

  document.getElementById('profileModalAvatar').src = u.avatar;
  document.getElementById('profileModalName').textContent = u.name;
  document.getElementById('profileModalRole').textContent = u.role;
  document.getElementById('profileModalDept').textContent = u.department;
  document.getElementById('profileModalCollege').textContent = u.college;
  document.getElementById('profileModalEmail').textContent = u.email;
  document.getElementById('profileModalSkills').textContent = u.skills ? u.skills.join(', ') : 'General';

  openModal('modalProfile');
}

function populateDropdowns() {
  // Populate Competition Selectors in Modals
  const selects = ['createTeamCompSelect', 'subCompSelect', 'noticeCompSelect', 'ticketCompetitionId'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = state.competitions.map(c => `
        <option value="${c.id}">${c.title} (${c.category})</option>
      `).join('');
    }
  });

  // Populate Teams in Submission Modal
  if (state.competitions.length > 0) {
    updateSubTeamSelect(state.competitions[0].id);
  }
}

function updateSubTeamSelect(compId) {
  const teamSelect = document.getElementById('subTeamSelect');
  if (!teamSelect) return;

  const relevantTeams = state.teams.filter(t => t.competitionId === compId);
  if (relevantTeams.length === 0) {
    teamSelect.innerHTML = '<option value="">No registered teams for this event</option>';
  } else {
    teamSelect.innerHTML = relevantTeams.map(t => `
      <option value="${t.id}">${t.teamName} (Lead: ${t.leaderName})</option>
    `).join('');
  }
}

async function resetPlatformDatabase() {
  if (confirm('Reset platform data back to original seeded mock data?')) {
    await apiPost('/reset', {});
    await refreshData();
    updateUserInterfaceForRole();
    renderCurrentView();
    closeModal('modalProfile');
    showToast('Platform reset to clean seed state', 'info');
  }
}

// ==========================================
// AUTHENTICATION: LOGIN & REGISTER
// ==========================================
function openAuthModal(tab = 'login') {
  openModal('modalAuth');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('authTabBtn-login');
  const regBtn = document.getElementById('authTabBtn-register');
  const loginSec = document.getElementById('authSection-login');
  const regSec = document.getElementById('authSection-register');

  const activeLogin = 'flex-1 py-2 px-4 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition flex items-center justify-center gap-2';
  const activeRegister = 'flex-1 py-2 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/25 transition flex items-center justify-center gap-2';
  const inactivePill = 'flex-1 py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-semibold text-xs transition flex items-center justify-center gap-2';

  if (tab === 'login') {
    if (loginBtn) loginBtn.className = activeLogin;
    if (regBtn) regBtn.className = inactivePill;
    if (loginSec) loginSec.classList.remove('hidden');
    if (regSec) regSec.classList.add('hidden');
  } else {
    if (regBtn) regBtn.className = activeRegister;
    if (loginBtn) loginBtn.className = inactivePill;
    if (regSec) regSec.classList.remove('hidden');
    if (loginSec) loginSec.classList.add('hidden');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
}

function quickFillLogin(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  // Trigger form submit
  document.getElementById('formLogin').dispatchEvent(new Event('submit'));
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLoginSubmit');

  if (!email || !password) {
    showToast('Please provide your email and password', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Authenticating...';

  const res = await apiPost('/auth/login', { email, password });
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to CompeteX';

  if (res.success && res.user) {
    state.currentUser = res.user;
    localStorage.setItem('competex_auth_user', JSON.stringify(res.user));
    localStorage.setItem('competex_auth_token', res.token);
    localStorage.setItem('competex_user_role', res.user.role);

    closeModal('modalAuth');
    showToast(`Welcome back, ${res.user.name}! (${res.user.role})`, 'success');
    updateUserInterfaceForRole();
    renderCurrentView();
  } else {
    showToast(res.error || 'Invalid email or password', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const role = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;
  const college = document.getElementById('regCollege').value.trim();
  const department = document.getElementById('regDept').value.trim();
  const skills = document.getElementById('regSkills').value.trim();
  const btn = document.getElementById('btnRegisterSubmit');

  if (password !== passwordConfirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Creating account...';

  const res = await apiPost('/auth/register', {
    name,
    email,
    role,
    password,
    college: college || 'Apex Institute of Technology',
    department: department || 'Engineering',
    skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-user-plus mr-1.5"></i> Create Account & Sign In';

  if (res.success && res.user) {
    state.currentUser = res.user;
    localStorage.setItem('competex_auth_user', JSON.stringify(res.user));
    localStorage.setItem('competex_auth_token', res.token);
    localStorage.setItem('competex_user_role', res.user.role);

    // Refresh users list so new account appears everywhere
    const usersRes = await apiGet('/auth/users');
    if (usersRes.success) state.allUsers = usersRes.users;

    closeModal('modalAuth');
    document.getElementById('formRegister').reset();
    showToast(`Account successfully registered in database for ${res.user.name}!`, 'success');
    updateUserInterfaceForRole();
    renderCurrentView();
  } else {
    showToast(res.error || 'Registration failed', 'error');
  }
}

function handleLogout() {
  const userName = state.currentUser ? state.currentUser.name : 'account';
  if (confirm(`Sign out of ${userName}?`)) {
    localStorage.removeItem('competex_auth_user');
    localStorage.removeItem('competex_auth_token');
    
    // Switch to logged out / guest
    state.currentUser = null;
    localStorage.removeItem('competex_user_role');
    
    updateUserInterfaceForRole();
    renderCurrentView();
    showToast('Signed out of CompeteX', 'info');
  }
}

// ==========================================
// CERTIFICATES & MERIT BADGES SYSTEM
// ==========================================
let currentViewingCert = null;

function renderCertificatesView() {
  const listContainer = document.getElementById('userCertificatesList');
  const countFirst = document.getElementById('countFirstPlace');
  const countSecond = document.getElementById('countRunnerUp');
  const countPart = document.getElementById('countParticipation');
  const countLabel = document.getElementById('userCertsCountLabel');
  const issuerBox = document.getElementById('organizerCertIssuerBox');
  const issueSelect = document.getElementById('issueCertCompSelect');

  // Update Global Honor Counts
  const allCerts = state.certificates || [];
  if (countFirst) countFirst.textContent = `${allCerts.filter(c => c.type === 'WINNER_1ST').length} Issued`;
  if (countSecond) countSecond.textContent = `${allCerts.filter(c => c.type === 'WINNER_2ND').length} Issued`;
  if (countPart) countPart.textContent = `${allCerts.filter(c => c.type === 'PARTICIPATION').length} Issued`;

  // Organizer / Admin Issuance Box Toggle
  if (issuerBox) {
    if (state.currentUser && (state.currentUser.role === 'ORGANIZER' || state.currentUser.role === 'ADMIN')) {
      issuerBox.classList.remove('hidden');
      if (issueSelect && issueSelect.children.length === 0) {
        issueSelect.innerHTML = state.competitions.map(c => `
          <option value="${c.id}">${c.title} (${c.category}) - ${c.status}</option>
        `).join('');
      }
    } else {
      issuerBox.classList.add('hidden');
    }
  }

  // Filter Certificates for Current User
  const userCerts = state.currentUser ? allCerts.filter(c => c.userId === state.currentUser.id) : [];

  if (countLabel) {
    countLabel.textContent = state.currentUser 
      ? `Showing ${userCerts.length} certificates for ${state.currentUser.name}`
      : 'Sign in to view your earned credentials';
  }

  if (!listContainer) return;

  if (userCerts.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800/80 p-6 space-y-3">
        <div class="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center text-2xl border border-amber-500/20">
          <i class="fa-solid fa-ribbon"></i>
        </div>
        <h4 class="text-base font-bold text-slate-300">No Certificates Earned Yet</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Participate in campus hackathons, coding contests, or project expos to unlock official verified credentials and merit trophies.
        </p>
        <button onclick="navigateTo('competitions')" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md transition">
          Explore Open Competitions
        </button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = userCerts.map(cert => {
    const isGold = cert.type === 'WINNER_1ST';
    const isSilver = cert.type === 'WINNER_2ND';
    const isBronze = cert.type === 'WINNER_3RD';

    const cardBorder = isGold 
      ? 'border-amber-500/60 bg-gradient-to-r from-amber-950/20 via-slate-800 to-slate-800 shadow-amber-500/10' 
      : isSilver 
      ? 'border-slate-400/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-800' 
      : 'border-slate-700/80 bg-slate-800/80';

    return `
      <div class="p-5 rounded-3xl border ${cardBorder} shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-amber-400/70">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl ${isGold ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-slate-700/40 text-slate-300'} flex items-center justify-center text-2xl shrink-0 shadow-lg">
            ${isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : '📜'}
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isGold ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700 text-slate-300'} uppercase">
                ${cert.badge || 'Official Credential'}
              </span>
              <span class="text-xs font-mono text-teal-400">${cert.certificateNumber}</span>
            </div>
            <h4 class="text-base font-extrabold text-white mt-1">${cert.title}</h4>
            <p class="text-xs text-slate-300 mt-0.5">
              ${cert.competitionTitle} • <strong class="text-white">${cert.teamName || 'Individual'}</strong>
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span>Issued: ${new Date(cert.issuedAt).toLocaleDateString()}</span>
              <span>• Code: <code class="text-amber-300 font-mono">${cert.verificationCode}</code></span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto">
          <button onclick="openCertificateViewer('${cert.id}')" class="flex-grow md:flex-grow-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-award"></i> View & Print
          </button>
          <button onclick="copySpecificCertCode('${cert.verificationCode}')" class="flex-grow md:flex-grow-0 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5">
            <i class="fa-regular fa-copy"></i> Copy Code
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openCertificateViewer(certId) {
  const cert = (state.certificates || []).find(c => c.id === certId);
  if (!cert) return;

  currentViewingCert = cert;

  document.getElementById('certModalInstitute').textContent = cert.issuedBy || 'Apex Institute of Technology';
  document.getElementById('certModalTitle').textContent = cert.title;
  document.getElementById('certModalRecipientName').textContent = cert.userName;

  const rankStr = cert.rank === 1 ? '1st Place Champion' : cert.rank === 2 ? '2nd Place Runner-Up' : cert.rank === 3 ? '3rd Place' : 'Finalist';
  document.getElementById('certModalNarrative').innerHTML = `
    For exemplary achievement and technical execution, securing <strong class="text-amber-300">${rankStr}</strong> 
    ${cert.teamName ? `as a member of squad <strong class="text-white">${cert.teamName}</strong>` : ''} 
    in <strong class="text-indigo-300">${cert.competitionTitle}</strong>.
  `;

  // Skills
  const skillsContainer = document.getElementById('certModalSkillsBadges');
  if (skillsContainer && cert.skills) {
    skillsContainer.innerHTML = cert.skills.map(s => `
      <span class="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">${s}</span>
    `).join('');
  }

  // Signatures
  const sig1 = cert.signatories && cert.signatories[0] ? cert.signatories[0].name : 'Dr. Sarah Jenkins';
  const sig2 = cert.signatories && cert.signatories[1] ? cert.signatories[1].name : 'Prof. H. Sharma';
  document.getElementById('certModalSig1').textContent = sig1;
  document.getElementById('certModalSig2').textContent = sig2;

  // Codes
  document.getElementById('certModalSerial').textContent = cert.certificateNumber;
  document.getElementById('certModalCode').textContent = cert.verificationCode;
  document.getElementById('certModalDate').textContent = new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  openModal('modalCertificateViewer');
}

function copySpecificCertCode(code) {
  navigator.clipboard.writeText(code);
  showToast(`Certificate Code [${code}] copied to clipboard!`, 'success');
}

function copyCertVerifyLink() {
  if (!currentViewingCert) return;
  navigator.clipboard.writeText(currentViewingCert.verificationCode);
  showToast(`Verification Code [${currentViewingCert.verificationCode}] copied!`, 'success');
}

function printCertificate() {
  window.print();
}

function scrollToVerificationBox() {
  const card = document.getElementById('certVerificationCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = document.getElementById('certVerifyInput');
    if (input) input.focus();
  }
}

async function handleVerifyCertificate() {
  const input = document.getElementById('certVerifyInput');
  const resultBox = document.getElementById('verifyResultContainer');
  if (!input || !resultBox) return;

  const code = input.value.trim();
  if (!code) {
    showToast('Please enter a certificate number or verification code', 'warning');
    return;
  }

  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="text-center py-2 text-slate-400">
      <i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Validating certificate cryptographic records...
    </div>
  `;

  const res = await apiGet(`/certificates/verify/${encodeURIComponent(code)}`);

  if (res.success && res.verified && res.certificate) {
    const c = res.certificate;
    resultBox.innerHTML = `
      <div class="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-emerald-400 font-bold flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check text-base"></i> Officially Verified Credential
          </span>
          <span class="text-[10px] text-slate-400 font-mono">${c.certificateNumber}</span>
        </div>
        <div class="text-slate-200">
          <strong class="text-white text-sm block">${c.userName}</strong>
          <span class="text-slate-300 block text-[11px]">${c.title} • ${c.competitionTitle}</span>
          ${c.teamName ? `<span class="text-teal-400 text-[10px] block mt-0.5">Squad: ${c.teamName}</span>` : ''}
        </div>
        <div class="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-slate-400">
          <span>Authority: <strong class="text-slate-300">${c.issuedBy}</strong></span>
          <button onclick="openCertificateViewer('${c.id}')" class="text-amber-400 hover:underline font-bold">Open Full Diploma →</button>
        </div>
      </div>
    `;
    showToast(`Verified! Certificate belongs to ${c.userName}`, 'success');
  } else {
    resultBox.innerHTML = `
      <div class="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
        <i class="fa-solid fa-triangle-exclamation text-base shrink-0"></i>
        <div>
          <strong class="block text-xs">Invalid Certificate Record</strong>
          <span class="text-[10px] text-rose-400">No credential matching code "${code}" exists in the system database.</span>
        </div>
      </div>
    `;
    showToast('Invalid or unrecognized certificate ID', 'error');
  }
}

async function handleGenerateCertificates() {
  const compId = document.getElementById('issueCertCompSelect').value;
  if (!compId) {
    showToast('Please select a competition', 'warning');
    return;
  }

  const comp = (state.competitions || []).find(c => c.id === compId);
  const compTitle = comp ? comp.title : 'Competition';

  const res = await apiPost('/certificates/generate', {
    competitionId: compId,
    issuedBy: 'Apex Institute of Technology & CompeteX Academic Council'
  });

  if (res.success) {
    showToast(res.message || `Certificates generated for ${compTitle}!`, 'success');
    await refreshData();
    renderCertificatesView();
  } else {
    showToast(res.error || 'Failed to issue certificates', 'error');
  }
}

// ==========================================
// 12. CODING SANDBOX MODULE (CodeCraft cmp-2)
// ==========================================
async function renderCodingSandbox() {
  // If problems aren't loaded yet, fetch them
  if (!state.codingState.problems || state.codingState.problems.length === 0) {
    const res = await apiGet('/coding/problems');
    if (res.success && res.problems) {
      state.codingState.problems = res.problems;
    }
  }

  const problems = state.codingState.problems || [];
  if (problems.length === 0) return;

  // Populate Problem Selector Dropdown
  const select = document.getElementById('codingProblemSelect');
  if (select && select.children.length === 0) {
    select.innerHTML = problems.map(p => `
      <option value="${p.id}">${p.code}: ${p.title} (${p.difficulty})</option>
    `).join('');
    select.value = state.codingState.activeProblemId;
  }

  // Active Problem
  let currentProblem = problems.find(p => p.id === state.codingState.activeProblemId) || problems[0];
  state.codingState.activeProblemId = currentProblem.id;

  // Update Left Panel: Title & Metadata
  const titleEl = document.getElementById('codingArenaProblemTitle');
  if (titleEl) titleEl.textContent = `${currentProblem.code}: ${currentProblem.title}`;

  const diffEl = document.getElementById('codingDifficultyBadge');
  if (diffEl) {
    diffEl.textContent = currentProblem.difficulty;
    const diffStyles = {
      Easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      Hard: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    };
    diffEl.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${diffStyles[currentProblem.difficulty] || ''}`;
  }

  const catEl = document.getElementById('codingCategoryBadge');
  if (catEl) catEl.textContent = currentProblem.category;

  const ptsEl = document.getElementById('codingPointsBadge');
  if (ptsEl) ptsEl.innerHTML = `<i class="fa-solid fa-star text-[10px] mr-1"></i> ${currentProblem.points} Points`;

  // Render Description
  const descEl = document.getElementById('codingProblemDesc');
  if (descEl) {
    descEl.innerHTML = currentProblem.description
      .split('\n\n')
      .map(p => `<p>${p.replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 py-0.5 rounded text-amber-300">$1</code>')}</p>`)
      .join('');
  }

  // Render Examples
  const exEl = document.getElementById('codingProblemExamples');
  if (exEl && currentProblem.examples) {
    exEl.innerHTML = currentProblem.examples.map((ex, idx) => `
      <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/60 space-y-1.5">
        <strong class="text-[11px] text-slate-400 block font-semibold">Example ${idx + 1}:</strong>
        <div class="text-[11px] font-mono text-slate-300">
          <span class="text-slate-500">Input:</span> ${ex.input}
        </div>
        <div class="text-[11px] font-mono text-emerald-300">
          <span class="text-slate-500">Output:</span> ${ex.output}
        </div>
        ${ex.explanation ? `<div class="text-[11px] text-slate-400 italic">Explanation: ${ex.explanation}</div>` : ''}
      </div>
    `).join('');
  }

  // Render Constraints
  const consEl = document.getElementById('codingProblemConstraints');
  if (consEl && currentProblem.constraints) {
    consEl.innerHTML = currentProblem.constraints.map(c => `<li>${c}</li>`).join('');
  }

  // Update Code in Editor
  loadCodeIntoEditor(currentProblem, state.codingState.selectedLanguage);

  // Setup interactions once
  setupCodeEditorInteractions();
}

function loadCodeIntoEditor(problem, lang) {
  const cacheKey = `${problem.id}_${lang}`;
  const editor = document.getElementById('codeEditorInput');
  const filenameEl = document.getElementById('codingEditorFilename');

  const fileExtensions = {
    javascript: 'solution.js',
    python: 'solution.py',
    cpp: 'solution.cpp',
    java: 'Solution.java'
  };

  if (filenameEl) filenameEl.textContent = fileExtensions[lang] || 'solution.txt';

  let codeToLoad = state.codingState.codeCache[cacheKey];
  if (!codeToLoad && problem.starterCode && problem.starterCode[lang]) {
    codeToLoad = problem.starterCode[lang];
  } else if (!codeToLoad) {
    codeToLoad = `// Write your ${lang} code here\n`;
  }

  if (editor) {
    editor.value = codeToLoad;
    updateEditorLineNumbers();
  }
}

function handleSelectCodingProblem(probId) {
  saveCurrentCodeToCache();
  state.codingState.activeProblemId = probId;
  const prob = (state.codingState.problems || []).find(p => p.id === probId);
  if (prob) {
    loadCodeIntoEditor(prob, state.codingState.selectedLanguage);
    renderCodingSandbox();
  }
}

function handleSelectCodingLanguage(lang) {
  saveCurrentCodeToCache();
  state.codingState.selectedLanguage = lang;
  const currentProblem = (state.codingState.problems || []).find(p => p.id === state.codingState.activeProblemId);
  if (currentProblem) {
    loadCodeIntoEditor(currentProblem, lang);
  }
}

function handleResetCodingBoilerplate() {
  const currentProblem = (state.codingState.problems || []).find(p => p.id === state.codingState.activeProblemId);
  if (!currentProblem) return;
  const lang = state.codingState.selectedLanguage;
  if (currentProblem.starterCode && currentProblem.starterCode[lang]) {
    const editor = document.getElementById('codeEditorInput');
    if (editor) {
      editor.value = currentProblem.starterCode[lang];
      saveCurrentCodeToCache();
      updateEditorLineNumbers();
      showToast(`Starter template reset for ${lang.toUpperCase()}`, 'info');
    }
  }
}

function saveCurrentCodeToCache() {
  const editor = document.getElementById('codeEditorInput');
  if (editor) {
    const cacheKey = `${state.codingState.activeProblemId}_${state.codingState.selectedLanguage}`;
    state.codingState.codeCache[cacheKey] = editor.value;
  }
}

let codeEditorListenersAttached = false;
function setupCodeEditorInteractions() {
  const editor = document.getElementById('codeEditorInput');
  if (!editor || codeEditorListenersAttached) return;
  codeEditorListenersAttached = true;

  editor.addEventListener('input', () => {
    updateEditorLineNumbers();
    saveCurrentCodeToCache();
  });

  editor.addEventListener('scroll', () => {
    const lineNumbers = document.getElementById('editorLineNumbers');
    if (lineNumbers) {
      lineNumbers.scrollTop = editor.scrollTop;
    }
  });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      updateEditorLineNumbers();
      saveCurrentCodeToCache();
    }
  });
}

function updateEditorLineNumbers() {
  const editor = document.getElementById('codeEditorInput');
  const lineNumbers = document.getElementById('editorLineNumbers');
  const badge = document.getElementById('codingLineCountBadge');
  if (!editor || !lineNumbers) return;

  const lines = editor.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  if (badge) badge.textContent = `Lines: ${lines}`;
}

function toggleCustomInputBox() {
  const wrapper = document.getElementById('customInputWrapper');
  const btn = document.getElementById('toggleCustomInputBtn');
  if (!wrapper) return;
  const isHidden = wrapper.classList.toggle('hidden');
  if (btn) btn.textContent = isHidden ? '+ Use Custom Input' : '- Hide Custom Input';
}

async function handleRunCode(isCustom = false) {
  saveCurrentCodeToCache();
  const editor = document.getElementById('codeEditorInput');
  const code = editor ? editor.value : '';
  const problemId = state.codingState.activeProblemId;
  const language = state.codingState.selectedLanguage;

  if (!code || code.trim() === '') {
    showToast('Please write some code before running tests', 'warning');
    return;
  }

  const runBtn = document.getElementById('btnRunCode');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Running...';
  }

  let customInput = null;
  if (isCustom) {
    const customArea = document.getElementById('customInputArea');
    try {
      customInput = JSON.parse(customArea.value.trim());
    } catch (e) {
      showToast('Invalid custom JSON input. Please format as a valid JSON object.', 'error');
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i> Run Tests';
      }
      return;
    }
  }

  const res = await apiPost('/coding/run', {
    problemId,
    language,
    code,
    customInput
  });

  if (runBtn) {
    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i> Run Tests';
  }

  if (res.success) {
    state.codingState.lastRunResult = res;
    renderExecutionResults(res);
    if (res.status === 'ACCEPTED') {
      showToast(`All ${res.passedCount} test cases passed!`, 'success');
    } else {
      showToast(`${res.passedCount} of ${res.totalCount} tests passed`, 'warning');
    }
  } else {
    showToast(res.error || 'Execution failed', 'error');
  }
}

async function handleSubmitCode() {
  saveCurrentCodeToCache();
  const editor = document.getElementById('codeEditorInput');
  const code = editor ? editor.value : '';
  const problemId = state.codingState.activeProblemId;
  const language = state.codingState.selectedLanguage;
  const user = state.currentUser || state.allUsers[0];

  if (!code || code.trim() === '') {
    showToast('Please write some code before submitting', 'warning');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitCode');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Evaluating...';
  }

  const res = await apiPost('/coding/submit', {
    problemId,
    language,
    code,
    userId: user ? user.id : 'usr-student-1'
  });

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-[10px]"></i> Submit Solution';
  }

  if (res.success) {
    state.codingState.lastRunResult = res;
    renderExecutionResults(res);
    await refreshData();

    if (res.status === 'ACCEPTED') {
      showToast(res.message || '🎉 Perfect! All test cases passed!', 'success');
    } else {
      showToast(res.message || `Solution scored ${res.scoreAwarded}/100`, 'info');
    }
  } else {
    showToast(res.error || 'Submission failed', 'error');
  }
}

function renderExecutionResults(res) {
  const statusBadge = document.getElementById('codingStatusBadge');
  const statRuntime = document.getElementById('statRuntime');
  const statMemory = document.getElementById('statMemory');

  if (statRuntime) statRuntime.textContent = `${res.runtimeMs}ms`;
  if (statMemory) statMemory.textContent = `${Math.round(res.memoryKb / 1024 * 10) / 10} MB`;

  if (statusBadge) {
    statusBadge.classList.remove('hidden');
    const badgeColors = {
      ACCEPTED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      PARTIAL: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      WRONG_ANSWER: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      FAILED: 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
    };
    statusBadge.className = `text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColors[res.status] || ''}`;
    statusBadge.textContent = res.status;
  }

  const tabsContainer = document.getElementById('codingTestCaseTabs');
  if (tabsContainer && res.results) {
    tabsContainer.innerHTML = res.results.map((r, idx) => `
      <button onclick="selectTestCaseTab(${idx})" class="tc-tab px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${idx === state.codingState.activeTestCaseIndex ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}">
        <span class="w-2 h-2 rounded-full ${r.passed ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
        Case ${r.testCaseIndex} ${r.isSample ? '(Sample)' : '(Hidden)'}
      </button>
    `).join('');
  }

  selectTestCaseTab(0);

  const stdoutContainer = document.getElementById('codingStdoutContainer');
  const stdoutText = document.getElementById('codingStdoutText');
  const combinedStdout = (res.results || []).map(r => r.stdout).filter(Boolean).join('\n');
  if (combinedStdout && stdoutContainer && stdoutText) {
    stdoutContainer.classList.remove('hidden');
    stdoutText.textContent = combinedStdout;
  } else if (stdoutContainer) {
    stdoutContainer.classList.add('hidden');
  }
}

function selectTestCaseTab(idx) {
  state.codingState.activeTestCaseIndex = idx;
  const res = state.codingState.lastRunResult;
  if (!res || !res.results || !res.results[idx]) return;

  const tc = res.results[idx];
  const detail = document.getElementById('codingTestCaseDetail');

  document.querySelectorAll('.tc-tab').forEach((tab, i) => {
    if (i === idx) {
      tab.classList.add('bg-slate-800', 'text-white', 'border', 'border-slate-700');
      tab.classList.remove('text-slate-400');
    } else {
      tab.classList.remove('bg-slate-800', 'text-white', 'border', 'border-slate-700');
      tab.classList.add('text-slate-400');
    }
  });

  if (detail) {
    detail.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${tc.passed ? 'text-emerald-400' : 'text-rose-400'}">
            ${tc.passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
          <span class="text-[10px] text-slate-500">|</span>
          <span class="text-[10px] text-slate-400">Runtime: ${tc.runtimeMs}ms</span>
        </div>
        ${tc.isSample ? '<span class="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">Sample Case</span>' : '<span class="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">Hidden Test Suite</span>'}
      </div>

      <div class="space-y-2 pt-1 text-xs">
        <div>
          <span class="text-[10px] text-slate-500 block uppercase font-bold">Input Arguments:</span>
          <div class="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-300 overflow-x-auto">
            ${JSON.stringify(tc.input, null, 2)}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span class="text-[10px] text-slate-500 block uppercase font-bold">Your Output:</span>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800/80 ${tc.passed ? 'text-emerald-400' : 'text-rose-400'} overflow-x-auto">
              ${tc.actual !== null ? JSON.stringify(tc.actual) : (tc.error || 'null')}
            </div>
          </div>

          <div>
            <span class="text-[10px] text-slate-500 block uppercase font-bold">Expected Output:</span>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-emerald-300 overflow-x-auto">
              ${tc.expected !== null ? JSON.stringify(tc.expected) : 'N/A (Custom Test)'}
            </div>
          </div>
        </div>

        ${tc.error ? `
          <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i> ${tc.error}
          </div>
        ` : ''}
      </div>
    `;
  }
}

// ==========================================
// 13. LIVE QUIZ BUZZER MODULE (BrainByte cmp-4)
// ==========================================
// Web Audio Synthesizer for Buzzer Feedback (Zero external sound files)
function playTone(freq, type = 'sine', duration = 0.2, vol = 0.15) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!state.quizState.audioCtx) {
      state.quizState.audioCtx = new AudioContext();
    }
    const ctx = state.quizState.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context safely ignores if uninitialized
  }
}

function playCorrectSound() {
  playTone(587.33, 'triangle', 0.15, 0.2); // D5
  setTimeout(() => playTone(880, 'triangle', 0.25, 0.2), 120); // A5
}

function playWrongSound() {
  playTone(180, 'sawtooth', 0.35, 0.25);
}

function playTickSound() {
  playTone(900, 'sine', 0.04, 0.06);
}

async function renderQuizArena() {
  if (!state.quizState.questions || state.quizState.questions.length === 0) {
    const res = await apiGet('/quiz/questions');
    if (res.success && res.questions) {
      state.quizState.questions = res.questions;
    }
  }

  if (!state.quizState.inProgress) {
    showQuizLobby();
  }
}

function showQuizLobby() {
  clearInterval(state.quizState.timerInterval);
  state.quizState.inProgress = false;
  document.getElementById('quizLobbyScreen')?.classList.remove('hidden');
  document.getElementById('quizArenaScreen')?.classList.add('hidden');
  document.getElementById('quizResultsScreen')?.classList.add('hidden');
}

async function startLiveQuiz() {
  if (!state.quizState.questions || state.quizState.questions.length === 0) {
    const res = await apiGet('/quiz/questions');
    if (res.success && res.questions) {
      state.quizState.questions = res.questions;
    } else {
      showToast('Failed to load quiz questions', 'error');
      return;
    }
  }

  state.quizState.inProgress = true;
  state.quizState.currentIndex = 0;
  state.quizState.answers = [];
  state.quizState.currentScore = 0;
  state.quizState.currentStreak = 0;
  state.quizState.maxStreak = 0;

  document.getElementById('quizLobbyScreen')?.classList.add('hidden');
  document.getElementById('quizArenaScreen')?.classList.remove('hidden');
  document.getElementById('quizResultsScreen')?.classList.add('hidden');

  renderCurrentQuizQuestion();
}

function renderCurrentQuizQuestion() {
  clearInterval(state.quizState.timerInterval);
  state.quizState.isAnswered = false;
  state.quizState.timerSeconds = 20;

  const q = state.quizState.questions[state.quizState.currentIndex];
  if (!q) {
    finishLiveQuiz();
    return;
  }

  const hudProgress = document.getElementById('quizHUDProgress');
  const hudScore = document.getElementById('quizHUDScore');
  const hudStreak = document.getElementById('quizHUDStreak');
  const timerCount = document.getElementById('quizTimerCount');
  const timerGauge = document.getElementById('quizTimerGauge');
  const timerBar = document.getElementById('quizTimerProgress');

  if (hudProgress) hudProgress.textContent = `Question ${state.quizState.currentIndex + 1} / ${state.quizState.questions.length}`;
  if (hudScore) hudScore.textContent = `${state.quizState.currentScore} pts`;
  if (hudStreak) hudStreak.textContent = `Streak: ${state.quizState.currentStreak}x`;
  if (timerCount) timerCount.textContent = '20';

  if (timerGauge) {
    timerGauge.className = 'w-16 h-16 rounded-full border-4 border-emerald-500 bg-slate-900 flex items-center justify-center text-xl font-extrabold text-white shadow-lg transition-colors duration-300';
  }
  if (timerBar) {
    timerBar.style.width = '100%';
    timerBar.className = 'h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 w-full';
  }

  const catEl = document.getElementById('quizQuestionCategory');
  const promptEl = document.getElementById('quizQuestionPrompt');
  if (catEl) catEl.textContent = q.category;
  if (promptEl) promptEl.textContent = q.prompt;

  q.options.forEach((opt, idx) => {
    const btn = document.getElementById(`buzzer-${idx}`);
    const textEl = document.getElementById(`optionText-${idx}`);
    if (textEl) textEl.textContent = opt;
    if (btn) {
      btn.disabled = false;
      btn.className = 'buzzer-btn p-5 rounded-3xl bg-slate-800 hover:bg-slate-750 border-2 border-slate-700/80 hover:border-brand-500 text-left text-white font-semibold text-sm shadow-xl flex items-center gap-3 transition';
    }
  });

  const feedbackBox = document.getElementById('quizFeedbackBox');
  if (feedbackBox) feedbackBox.classList.add('hidden');

  state.quizState.timerInterval = setInterval(() => {
    state.quizState.timerSeconds--;
    const sec = state.quizState.timerSeconds;

    if (timerCount) timerCount.textContent = sec;
    if (timerBar) timerBar.style.width = `${(sec / 20) * 100}%`;

    if (sec <= 5 && sec > 0) {
      playTickSound();
      if (timerGauge) {
        timerGauge.className = 'w-16 h-16 rounded-full border-4 border-rose-500 bg-slate-900 flex items-center justify-center text-xl font-extrabold text-rose-400 shadow-lg timer-pulse-fast';
      }
      if (timerBar) {
        timerBar.className = 'h-full bg-rose-500 transition-all duration-1000 w-full';
      }
    } else if (sec <= 10 && timerGauge) {
      timerGauge.className = 'w-16 h-16 rounded-full border-4 border-amber-500 bg-slate-900 flex items-center justify-center text-xl font-extrabold text-amber-300 shadow-lg';
    }

    if (sec <= 0) {
      clearInterval(state.quizState.timerInterval);
      handleOptionSelect(-1);
    }
  }, 1000);
}

function handleOptionSelect(selectedIdx) {
  if (state.quizState.isAnswered) return;
  state.quizState.isAnswered = true;
  clearInterval(state.quizState.timerInterval);

  const q = state.quizState.questions[state.quizState.currentIndex];
  const timeRemaining = Math.max(0, state.quizState.timerSeconds);

  state.quizState.answers.push({
    questionId: q.id,
    selectedIndex: selectedIdx,
    timeRemainingSec: timeRemaining
  });

  q.options.forEach((_, idx) => {
    const btn = document.getElementById(`buzzer-${idx}`);
    if (btn) btn.disabled = true;
  });

  const knownQuestion = QUIZ_QUESTIONS_CACHE.find(item => item.id === q.id);
  const correctIdx = knownQuestion ? knownQuestion.correctIndex : -1;
  const isCorrect = (selectedIdx >= 0 && selectedIdx === correctIdx);

  const selectedBtn = document.getElementById(`buzzer-${selectedIdx}`);
  const correctBtn = document.getElementById(`buzzer-${correctIdx}`);

  if (isCorrect) {
    playCorrectSound();
    if (selectedBtn) selectedBtn.classList.add('buzzer-correct');
    state.quizState.currentStreak++;
    if (state.quizState.currentStreak > state.quizState.maxStreak) {
      state.quizState.maxStreak = state.quizState.currentStreak;
    }
    const speedBonus = Math.round(timeRemaining * 2.5);
    const streakBonus = state.quizState.currentStreak * 15;
    const pointsGained = 100 + speedBonus + streakBonus;
    state.quizState.currentScore += pointsGained;
    showQuizFeedback(true, pointsGained, knownQuestion ? knownQuestion.explanation : 'Correct buzzer!');
  } else {
    playWrongSound();
    if (selectedBtn) selectedBtn.classList.add('buzzer-wrong');
    if (correctBtn) correctBtn.classList.add('buzzer-correct');
    state.quizState.currentStreak = 0;
    state.quizState.currentScore = Math.max(0, state.quizState.currentScore - 20);
    showQuizFeedback(false, -20, knownQuestion ? knownQuestion.explanation : 'Incorrect option selected.');
  }

  const hudScore = document.getElementById('quizHUDScore');
  const hudStreak = document.getElementById('quizHUDStreak');
  if (hudScore) hudScore.textContent = `${state.quizState.currentScore} pts`;
  if (hudStreak) hudStreak.textContent = `Streak: ${state.quizState.currentStreak}x`;
}

function showQuizFeedback(isCorrect, delta, explanation) {
  const box = document.getElementById('quizFeedbackBox');
  const icon = document.getElementById('feedbackIcon');
  const title = document.getElementById('feedbackTitle');
  const deltaBadge = document.getElementById('feedbackScoreDelta');
  const expText = document.getElementById('feedbackExplanation');
  const btnNext = document.getElementById('btnNextQuizQuestion');

  if (!box) return;
  box.classList.remove('hidden');

  if (isCorrect) {
    box.className = 'p-5 rounded-3xl border border-emerald-500/40 bg-emerald-950/30 shadow-xl space-y-3';
    if (icon) icon.textContent = '⚡';
    if (title) title.textContent = 'Lightning Correct Buzzer!';
    if (deltaBadge) {
      deltaBadge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      deltaBadge.textContent = `+${delta} pts`;
    }
  } else {
    box.className = 'p-5 rounded-3xl border border-rose-500/40 bg-rose-950/30 shadow-xl space-y-3';
    if (icon) icon.textContent = '❌';
    if (title) title.textContent = delta === 0 ? 'Buzzer Timed Out!' : 'Incorrect Buzzer!';
    if (deltaBadge) {
      deltaBadge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40';
      deltaBadge.textContent = `${delta} pts`;
    }
  }

  if (expText) expText.textContent = explanation;

  const isLastQuestion = state.quizState.currentIndex >= state.quizState.questions.length - 1;
  if (btnNext) {
    btnNext.innerHTML = isLastQuestion 
      ? 'View Final Standings <i class="fa-solid fa-flag-checkered text-[10px] ml-1"></i>' 
      : 'Next Question <i class="fa-solid fa-arrow-right text-[10px] ml-1"></i>';
  }
}

function nextQuizQuestion() {
  state.quizState.currentIndex++;
  if (state.quizState.currentIndex < state.quizState.questions.length) {
    renderCurrentQuizQuestion();
  } else {
    finishLiveQuiz();
  }
}

async function finishLiveQuiz() {
  clearInterval(state.quizState.timerInterval);
  const user = state.currentUser || state.allUsers[0];

  const res = await apiPost('/quiz/submit', {
    userId: user ? user.id : 'usr-student-1',
    answers: state.quizState.answers
  });

  document.getElementById('quizArenaScreen')?.classList.add('hidden');
  document.getElementById('quizResultsScreen')?.classList.remove('hidden');

  if (res.success) {
    document.getElementById('resAccuracy').textContent = `${res.accuracyPercentage}%`;
    document.getElementById('resGrossPoints').textContent = `${res.grossScore.toLocaleString()}`;
    document.getElementById('resMaxStreak').textContent = `${res.maxStreak}x`;
    document.getElementById('resLeaderboardRank').textContent = `#${res.rank}`;
    document.getElementById('quizResultsSummaryMsg').textContent = `Ranked #${res.rank} in BrainByte: National Tech & Trivia Quiz with ${res.correctCount}/${res.totalQuestions} correct buzzers!`;

    await refreshData();
    showToast(res.message || '🎉 Quiz Completed and scored to Leaderboard!', 'success');
  } else {
    showToast('Failed to record final quiz results', 'error');
  }
}

function resetQuizToLobby() {
  showQuizLobby();
}

// Client-side cache for instant sound & explanation display
const QUIZ_QUESTIONS_CACHE = [
  { id: 'q-1', correctIndex: 1, explanation: 'Ada Lovelace published the first algorithm for Charles Babbage\'s Analytical Engine in 1843.' },
  { id: 'q-2', correctIndex: 1, explanation: 'Linus Torvalds released Linux version 0.01 on September 17, 1991.' },
  { id: 'q-3', correctIndex: 2, explanation: 'Bitcoin implemented Proof of Work (PoW) based on Hashcash in 2008.' },
  { id: 'q-4', correctIndex: 2, explanation: 'DFS uses a call stack proportional to the maximum height or depth D of the tree, which is O(D).' },
  { id: 'q-5', correctIndex: 1, explanation: 'TCP guarantees reliable, ordered byte delivery with 3-way handshakes and sliding window flow control.' },
  { id: 'q-6', correctIndex: 1, explanation: 'GPT stands for Generative Pre-trained Transformer, introduced in the 2017 Transformer architecture.' },
  { id: 'q-7', correctIndex: 1, explanation: '403 Forbidden indicates the server understood the credentials, but explicitly refuses to authorize access.' },
  { id: 'q-8', correctIndex: 0, explanation: 'Diffie-Hellman key exchange was published in 1976 by Whitfield Diffie and Martin Hellman.' },
  { id: 'q-9', correctIndex: 1, explanation: 'Rear Admiral Grace Hopper\'s team logged a physical moth found in the Harvard Mark II in 1947.' },
  { id: 'q-10', correctIndex: 1, explanation: 'The Dining Philosophers problem illustrates synchronization deadlock and resource contention in concurrent systems.' }
];

// ==========================================
// INSTITUTIONAL ACCREDITATION & CSV EXPORTS
// ==========================================
function exportData(type) {
  const titles = {
    teams: 'Teams & Participants Roster',
    submissions: 'Submissions & Project Artifacts',
    evaluations: 'Consolidated Rubric Evaluations Audit',
    certificates: 'Accredited Digital Certificates',
    leaderboard: 'Final Leaderboards & Podium Standing'
  };
  const title = titles[type] || 'Accreditation Records';
  showToast(`Generating and downloading ${title} CSV...`, 'info');
  window.open(`/api/export/${type}`, '_blank');
}

// ==========================================
// VIEW 11: EVENT TIMELINE & MILESTONES ROADMAP
// ==========================================
function renderTimelineView() {
  // Populate filter dropdown if needed
  const filterSelect = document.getElementById('timelineCompFilter');
  if (filterSelect && filterSelect.options.length <= 1) {
    state.competitions.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.title} (${c.category})`;
      filterSelect.appendChild(opt);
    });
  }

  // Find nearest upcoming deadline across all competition rounds
  let nearestDeadline = null;
  let targetEvent = null;
  let targetRound = null;
  const now = Date.now();

  state.competitions.forEach(comp => {
    (comp.rounds || []).forEach(rnd => {
      const d = new Date(rnd.deadline).getTime();
      if (!isNaN(d) && d > now) {
        if (!nearestDeadline || d < nearestDeadline) {
          nearestDeadline = d;
          targetEvent = comp;
          targetRound = rnd;
        }
      }
    });
  });

  // If none in the future, pick active round or create a dynamic milestone
  if (!targetEvent || !targetRound) {
    const activeComp = state.competitions.find(c => c.status === 'ONGOING') || state.competitions[0];
    if (activeComp && activeComp.rounds && activeComp.rounds.length > 0) {
      targetEvent = activeComp;
      targetRound = activeComp.rounds.find(r => r.status === 'ACTIVE') || activeComp.rounds[0];
      // Default to 15 days ahead for active milestone showcase
      nearestDeadline = now + (15 * 86400000) + (4 * 3600000) + (32 * 60000) + (18 * 1000);
    }
  }

  if (targetEvent && targetRound) {
    const elEvent = document.getElementById('timelineActiveEventTitle');
    const elRound = document.getElementById('timelineActiveRoundTitle');
    const elDesc = document.getElementById('timelineActiveRoundDesc');
    if (elEvent) elEvent.textContent = targetEvent.title;
    if (elRound) elRound.textContent = targetRound.title;
    if (elDesc) elDesc.textContent = targetRound.description || 'Milestone deliverables and review checkpoint';

    startTimelineCountdown(nearestDeadline || (now + 864000000));
  }

  renderTimelineRoadmap();
}

function startTimelineCountdown(targetTimestamp) {
  if (state.timelineState.intervalId) {
    clearInterval(state.timelineState.intervalId);
  }

  function updateClock() {
    const now = Date.now();
    const remaining = Math.max(0, targetTimestamp - now);

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((remaining / (1000 * 60)) % 60);
    const secs = Math.floor((remaining / 1000) % 60);

    const dEl = document.getElementById('cdDays');
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');

    if (dEl) dEl.textContent = String(days).padStart(2, '0');
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
    if (sEl) sEl.textContent = String(secs).padStart(2, '0');
  }

  updateClock();
  state.timelineState.intervalId = setInterval(updateClock, 1000);
}

function filterTimeline(compId) {
  state.timelineState.activeCompFilter = compId;
  renderTimelineRoadmap();
}

function renderTimelineRoadmap() {
  const container = document.getElementById('timelineRoadmapContainer');
  if (!container) return;

  const filter = state.timelineState.activeCompFilter;
  const filteredComps = filter === 'ALL'
    ? state.competitions
    : state.competitions.filter(c => c.id === filter);

  if (filteredComps.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-800/60 rounded-3xl border border-slate-700/60 text-slate-400">
        <i class="fa-solid fa-calendar-xmark text-3xl mb-2 text-slate-500"></i>
        <p class="text-sm font-semibold">No competition stages found for this filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredComps.map(comp => {
    const rounds = comp.rounds || [];
    const categoryColors = {
      HACKATHON: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
      CODING: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      QUIZ: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      EXPO: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      PAPER: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    };
    const catClass = categoryColors[comp.category] || 'bg-slate-700 text-slate-300 border-slate-600';

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-6">
        <!-- Competition Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg text-white font-bold shrink-0">
              ${comp.category === 'HACKATHON' ? '⚡' : comp.category === 'CODING' ? '💻' : comp.category === 'QUIZ' ? '🎯' : comp.category === 'EXPO' ? '🔬' : '📑'}
            </div>
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${catClass}">
                  ${comp.category}
                </span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  ${comp.format} (${comp.minTeamSize === comp.maxTeamSize ? `${comp.minTeamSize}p` : `${comp.minTeamSize}-${comp.maxTeamSize}p`})
                </span>
              </div>
              <h3 class="text-base font-bold text-white">${comp.title}</h3>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-amber-400 font-mono font-semibold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
              <i class="fa-solid fa-trophy mr-1 text-[11px]"></i> ${comp.prizePool}
            </span>
            <button onclick="navigateTo('leaderboard')" class="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5">
              <i class="fa-solid fa-chart-simple text-indigo-400"></i> Standings
            </button>
          </div>
        </div>

        <!-- Sequential Rounds Flow -->
        <div class="grid grid-cols-1 md:grid-cols-${Math.min(rounds.length, 3)} gap-4">
          ${rounds.map((round, idx) => {
            const isCompleted = round.status === 'COMPLETED';
            const isActive = round.status === 'ACTIVE';

            const cardBorder = isCompleted
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : isActive
              ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 to-slate-900'
              : 'border-slate-700/60 bg-slate-900/60 opacity-80';

            const badgeMarkup = isCompleted
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><i class="fa-solid fa-circle-check text-[10px]"></i> Completed</span>`
              : isActive
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Active Stage</span>`
              : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1"><i class="fa-regular fa-clock text-[10px]"></i> Upcoming</span>`;

            let dText = 'TBD';
            try {
              const dt = new Date(round.deadline);
              if (!isNaN(dt.getTime())) {
                dText = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              }
            } catch (e) {}

            return `
              <div class="border rounded-2xl p-4 flex flex-col justify-between space-y-3 relative transition hover:border-cyan-400/50 ${cardBorder}">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-mono font-bold text-slate-400">STAGE 0${idx + 1}</span>
                    ${badgeMarkup}
                  </div>
                  <h4 class="text-sm font-bold text-white">${round.title}</h4>
                  <p class="text-xs text-slate-300 leading-relaxed">${round.description || 'Deliverables submission and evaluation.'}</p>
                </div>

                <div class="pt-3 border-t border-slate-700/60 space-y-2 text-xs">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span class="flex items-center gap-1"><i class="fa-regular fa-calendar-check text-cyan-400"></i> Deadline:</span>
                    <strong class="text-slate-200 font-mono">${dText}</strong>
                  </div>

                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-box-archive text-amber-400"></i> Format:</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">${round.submissionType || 'PROJECT_FILES'}</span>
                  </div>

                  <!-- Contextual Action Button -->
                  <div class="pt-1">
                    ${comp.category === 'CODING'
                      ? `<button onclick="navigateTo('coding')" class="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                           <i class="fa-solid fa-code text-[10px]"></i> Open Code Arena
                         </button>`
                      : comp.category === 'QUIZ'
                      ? `<button onclick="navigateTo('quiz')" class="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                           <i class="fa-solid fa-bolt text-[10px]"></i> Launch Quiz Buzzer
                         </button>`
                      : isActive
                      ? `<button onclick="openCreateSubmissionModal('${comp.id}')" class="w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20">
                           <i class="fa-solid fa-paper-plane text-[10px]"></i> Submit Deliverables
                         </button>`
                      : `<button onclick="navigateTo('helpdesk')" class="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5">
                           <i class="fa-solid fa-headset text-orange-400 text-[10px]"></i> Ask Mentor
                         </button>`
                    }
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// VIEW 12: MENTORSHIP & HELPDESK TICKETS CONTROLLER
// ==========================================
function renderHelpdeskView() {
  const tickets = state.tickets || [];

  // Update KPI counters
  const elTotal = document.getElementById('countTotalTickets');
  const elAns = document.getElementById('countAnsweredTickets');
  const elRes = document.getElementById('countResolvedTickets');

  if (elTotal) elTotal.textContent = `${tickets.length} Tickets`;
  if (elAns) {
    const answeredCount = tickets.filter(t => t.status === 'ANSWERED' || (t.responses && t.responses.length > 0)).length;
    elAns.textContent = `${answeredCount} Answered`;
  }
  if (elRes) {
    const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
    elRes.textContent = `${resolvedCount} Resolved`;
  }

  // Filter tickets
  const statusFilter = state.helpdeskState.activeStatusFilter;
  const categoryFilter = state.helpdeskState.activeCategoryFilter;

  const filteredTickets = tickets.filter(t => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchStatus && matchCat;
  });

  const feedList = document.getElementById('ticketsFeedList');
  if (!feedList) return;

  if (filteredTickets.length === 0) {
    feedList.innerHTML = `
      <div class="p-12 text-center bg-slate-800/60 rounded-3xl border border-slate-700/60 text-slate-400 space-y-3">
        <i class="fa-solid fa-headset text-4xl text-slate-600"></i>
        <h3 class="text-base font-bold text-slate-200">No Support Tickets Found</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto">There are no active inquiries matching this category or status filter. Need help with hardware, algorithms, or competition guidelines?</p>
        <button onclick="openCreateTicketModal()" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20">
          <i class="fa-solid fa-plus"></i> Submit a Ticket
        </button>
      </div>
    `;
    return;
  }

  feedList.innerHTML = filteredTickets.map(ticket => {
    const isResolved = ticket.status === 'RESOLVED';
    const isAnswered = ticket.status === 'ANSWERED';

    const categoryIcons = {
      TECHNICAL: '<i class="fa-solid fa-gear text-cyan-400"></i> Technical & Code',
      HARDWARE: '<i class="fa-solid fa-microchip text-amber-400"></i> Hardware & Sensor Kits',
      MENTORSHIP: '<i class="fa-solid fa-lightbulb text-emerald-400"></i> Architecture & Mentorship',
      RULES: '<i class="fa-solid fa-scroll text-purple-400"></i> Rules & Guidelines'
    };

    const priorityBadges = {
      URGENT: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"><i class="fa-solid fa-fire mr-1"></i> Urgent</span>',
      HIGH: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"><i class="fa-solid fa-triangle-exclamation mr-1"></i> High</span>',
      NORMAL: '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">Normal</span>'
    };

    const statusBadges = {
      OPEN: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"><i class="fa-solid fa-clock-rotate-left"></i> Pending Review</span>',
      ANSWERED: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><i class="fa-solid fa-comments"></i> Mentor Answered</span>',
      RESOLVED: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Resolved</span>'
    };

    const responses = ticket.responses || [];

    let timeFormatted = '';
    try {
      timeFormatted = new Date(ticket.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      timeFormatted = ticket.createdAt;
    }

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-5 shadow-xl space-y-4 transition hover:border-slate-600">
        <!-- Ticket Header Bar -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-700/60">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-bold text-white flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700">
              ${categoryIcons[ticket.category] || ticket.category}
            </span>
            ${priorityBadges[ticket.priority] || priorityBadges.NORMAL}
            ${statusBadges[ticket.status] || statusBadges.OPEN}
          </div>

          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="font-mono text-[11px]">${ticket.id}</span>
            <span>•</span>
            <span>${timeFormatted}</span>
          </div>
        </div>

        <!-- Ticket Body -->
        <div class="space-y-2">
          <h3 class="text-base font-bold text-white">${ticket.subject}</h3>
          <p class="text-xs text-slate-300 leading-relaxed">${ticket.description}</p>
          <div class="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
            <span>Author: <strong class="text-white">${ticket.submittedByName || 'Participant'}</strong></span>
            <span>•</span>
            <span>Squad: <strong class="text-slate-300">${ticket.teamName || 'Solo Squad'}</strong></span>
            <span>•</span>
            <span>Event: <strong class="text-indigo-400">${ticket.competitionTitle || 'Competition'}</strong></span>
          </div>
        </div>

        <!-- Mentorship Thread Responses -->
        ${responses.length > 0 ? `
          <div class="space-y-2.5 pt-3 border-t border-slate-700/60">
            <span class="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <i class="fa-solid fa-comments text-emerald-400"></i> Mentorship Conversation Thread (${responses.length})
            </span>
            <div class="space-y-2">
              ${responses.map(resp => {
                const roleColors = {
                  ORGANIZER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  JUDGE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                  STUDENT: 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                };
                const rClass = roleColors[resp.authorRole] || 'bg-slate-700 text-slate-300';
                let rTime = '';
                try {
                  rTime = new Date(resp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                  rTime = '';
                }

                return `
                  <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 space-y-1 text-xs">
                    <div class="flex items-center justify-between text-[11px]">
                      <div class="flex items-center gap-1.5">
                        <strong class="text-white">${resp.authorName}</strong>
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${rClass}">${resp.authorRole || 'MENTOR'}</span>
                      </div>
                      <span class="text-slate-500 font-mono text-[10px]">${rTime}</span>
                    </div>
                    <p class="text-slate-200 leading-relaxed pt-0.5">${resp.message}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Inline Reply Input & Actions -->
        <div class="pt-3 border-t border-slate-700/60 space-y-3">
          <div class="flex items-center gap-2">
            <input type="text" id="ticketReplyText-${ticket.id}" placeholder="Type mentor guidance, unblocking response, or follow-up..." 
              class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              onkeydown="if(event.key === 'Enter') handleReplyTicket('${ticket.id}')">
            <button onclick="handleReplyTicket('${ticket.id}')" class="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0">
              <i class="fa-solid fa-paper-plane text-[10px]"></i> Send Reply
            </button>
          </div>

          <!-- Status Toggle Action Button -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] text-slate-500">
              ${isResolved ? 'Issue marked as resolved by coordinator.' : 'Open ticket in active review queue.'}
            </span>
            <div>
              ${isResolved ? `
                <button onclick="handleToggleTicketStatus('${ticket.id}', 'OPEN')" class="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5">
                  <i class="fa-solid fa-rotate-left text-[10px]"></i> Reopen Ticket
                </button>
              ` : `
                <button onclick="handleToggleTicketStatus('${ticket.id}', 'RESOLVED')" class="px-3 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition flex items-center gap-1.5">
                  <i class="fa-solid fa-check-double text-[10px]"></i> Mark Issue Resolved
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterTicketsByStatus(status) {
  state.helpdeskState.activeStatusFilter = status;
  document.querySelectorAll('.ticket-status-pill').forEach(btn => {
    const isTarget = btn.dataset.status === status;
    btn.classList.toggle('active', isTarget);
    btn.classList.toggle('bg-slate-700', isTarget);
    btn.classList.toggle('text-white', isTarget);
    btn.classList.toggle('text-slate-400', !isTarget);
  });
  renderHelpdeskView();
}

function filterTicketsByCategory(category) {
  state.helpdeskState.activeCategoryFilter = category;
  renderHelpdeskView();
}

function openCreateTicketModal() {
  const compSelect = document.getElementById('ticketCompetitionId');
  if (compSelect) {
    compSelect.innerHTML = state.competitions.map(c => `
      <option value="${c.id}">${c.title} (${c.category})</option>
    `).join('');
  }

  const form = document.getElementById('formCreateTicket');
  if (form) form.reset();

  openModal('modalCreateTicket');
}

async function handleCreateTicket(event) {
  event.preventDefault();

  const competitionId = document.getElementById('ticketCompetitionId').value;
  const category = document.getElementById('ticketCategory').value;
  const priority = document.getElementById('ticketPriority').value;
  const subject = document.getElementById('ticketSubject').value.trim();
  const description = document.getElementById('ticketDescription').value.trim();

  if (!subject || !description) {
    showToast('Please provide both subject and description', 'warning');
    return;
  }

  const user = state.currentUser || state.allUsers[0];
  const payload = {
    competitionId,
    category,
    priority,
    subject,
    description,
    userId: user ? user.id : 'usr-student-1'
  };

  const btn = document.getElementById('btnSubmitTicket');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }

  const res = await apiPost('/tickets', payload);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Dispatch Ticket';
  }

  if (res.success) {
    closeModal('modalCreateTicket');
    showToast(res.message || 'Helpdesk ticket submitted successfully!', 'success');
    await refreshData();
    renderHelpdeskView();
  } else {
    showToast(res.error || 'Failed to submit ticket', 'error');
  }
}

async function handleReplyTicket(ticketId) {
  const inputEl = document.getElementById(`ticketReplyText-${ticketId}`);
  if (!inputEl) return;

  const message = inputEl.value.trim();
  if (!message) {
    showToast('Please enter a response message', 'warning');
    return;
  }

  const user = state.currentUser || state.allUsers[0];
  const payload = {
    authorId: user ? user.id : 'usr-organizer-1',
    message
  };

  const res = await apiPost(`/tickets/${ticketId}/reply`, payload);
  if (res.success) {
    inputEl.value = '';
    showToast('Response posted to mentorship thread', 'success');
    await refreshData();
    renderHelpdeskView();
  } else {
    showToast(res.error || 'Failed to post reply', 'error');
  }
}

async function handleToggleTicketStatus(ticketId, newStatus) {
  const res = await apiPut(`/tickets/${ticketId}/status`, { status: newStatus });
  if (res.success) {
    showToast(res.message || `Ticket marked as ${newStatus}`, 'success');
    await refreshData();
    renderHelpdeskView();
  } else {
    showToast(res.error || 'Failed to update ticket status', 'error');
  }
}

// ==========================================
// VIEW 13: PUBLIC PROJECT SHOWCASE & COMMUNITY VOTING
// ==========================================
function renderShowcaseView() {
  // Populate Competition filter dropdown if needed
  const filterSelect = document.getElementById('showcaseCompFilter');
  if (filterSelect && filterSelect.options.length <= 1) {
    state.competitions.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.title}`;
      filterSelect.appendChild(opt);
    });
  }

  // Update Metrics
  const submissions = state.submissions || [];
  const elCount = document.getElementById('showcaseCountProjects');
  const elVotes = document.getElementById('showcaseCountVotes');
  const elBounties = document.getElementById('showcaseCountBounties');

  if (elCount) elCount.textContent = `${submissions.length}`;
  if (elVotes) {
    const totalVotes = submissions.reduce((acc, s) => acc + (s.votes ? s.votes.length : 0), 0);
    elVotes.textContent = `${totalVotes}`;
  }
  if (elBounties) {
    const totalBounties = (state.sponsors || []).reduce((acc, sp) => acc + (sp.bounties ? sp.bounties.length : 0), 0);
    elBounties.textContent = `${totalBounties}`;
  }

  // Filter & Sort
  const compFilter = state.showcaseState.activeCompFilter;
  const domainFilter = state.showcaseState.activeDomainFilter;
  const sortFilter = state.showcaseState.activeSortFilter;

  let filtered = submissions.filter(sub => {
    const matchComp = compFilter === 'ALL' || sub.competitionId === compFilter;
    let matchDomain = true;
    if (domainFilter !== 'ALL') {
      const stack = (sub.techStack || []).map(t => t.toLowerCase()).join(' ');
      const text = `${sub.projectTitle} ${sub.abstract || ''} ${stack}`.toLowerCase();
      if (domainFilter === 'AI') {
        matchDomain = text.includes('ai') || text.includes('python') || text.includes('tensorflow') || text.includes('vision') || text.includes('gemini');
      } else if (domainFilter === 'IOT') {
        matchDomain = text.includes('iot') || text.includes('sensor') || text.includes('lora') || text.includes('arduino') || text.includes('hardware');
      } else if (domainFilter === 'WEB') {
        matchDomain = text.includes('react') || text.includes('vue') || text.includes('node') || text.includes('web') || text.includes('cloud');
      } else if (domainFilter === 'ROBOTICS') {
        matchDomain = text.includes('drone') || text.includes('robot') || text.includes('ros') || text.includes('autopilot');
      }
    }
    return matchComp && matchDomain;
  });

  // Sort
  if (sortFilter === 'VOTES') {
    filtered.sort((a, b) => (b.votes ? b.votes.length : 0) - (a.votes ? a.votes.length : 0));
  } else if (sortFilter === 'RECENT') {
    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } else if (sortFilter === 'TITLE') {
    filtered.sort((a, b) => (a.projectTitle || '').localeCompare(b.projectTitle || ''));
  }

  const grid = document.getElementById('showcaseProjectsGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-12 text-center bg-slate-800/60 rounded-3xl border border-slate-700/60 text-slate-400 space-y-2">
        <i class="fa-solid fa-folder-open text-4xl text-slate-600 mb-2"></i>
        <h4 class="text-base font-bold text-slate-200">No Projects Found</h4>
        <p class="text-xs text-slate-400">No project deliverables match the selected domain or competition filters.</p>
      </div>
    `;
    return;
  }

  const currentUserId = state.currentUser ? state.currentUser.id : 'usr-student-1';

  grid.innerHTML = filtered.map(sub => {
    const comp = state.competitions.find(c => c.id === sub.competitionId);
    const team = state.teams.find(t => t.id === sub.teamId);
    const votes = sub.votes || [];
    const voteCount = votes.length;
    const hasVoted = votes.includes(currentUserId);
    const commentsCount = (sub.comments || []).length;
    const coverUrl = sub.coverImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80';
    const bounties = sub.bountyTags || [];

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 hover:border-slate-500/80 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition group">
        <!-- Visual Banner Image with Overlays -->
        <div class="relative h-44 overflow-hidden bg-slate-900">
          <img src="${coverUrl}" alt="${sub.projectTitle}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          
          <!-- Top Badges Overlay -->
          <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-sm">
              ${comp ? comp.title.split(':')[0] : 'Competition'}
            </span>
            ${sub.status === 'EVALUATED' ? `
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm flex items-center gap-1">
                <i class="fa-solid fa-circle-check text-[9px]"></i> Reviewed
              </span>
            ` : ''}
          </div>

          <!-- Bottom Banner Title Overlay -->
          <div class="absolute bottom-3 left-3 right-3">
            <h3 class="text-base font-bold text-white leading-tight drop-shadow-md line-clamp-1">${sub.projectTitle}</h3>
            <span class="text-[11px] text-slate-300 font-medium">${team ? team.teamName : (sub.teamName || 'Solo Squad')}</span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div class="space-y-3">
            <!-- Sponsor Bounty Badges -->
            ${bounties.length > 0 ? `
              <div class="flex flex-wrap gap-1.5">
                ${bounties.map(b => `
                  <span class="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <i class="fa-solid fa-award text-[8px]"></i> ${b}
                  </span>
                `).join('')}
              </div>
            ` : ''}

            <!-- Abstract -->
            <p class="text-xs text-slate-300 leading-relaxed line-clamp-2">
              ${sub.abstract || sub.summary || 'Working project demonstration authoring repository and live prototype.'}
            </p>

            <!-- Tech Stack Pills -->
            <div class="flex flex-wrap gap-1 pt-1">
              ${(sub.techStack || []).slice(0, 4).map(tech => `
                <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                  ${tech}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="pt-3 border-t border-slate-700/60 space-y-3">
            <!-- Links Toolbar -->
            <div class="flex items-center gap-2">
              ${sub.repoUrl ? `
                <a href="${sub.repoUrl}" target="_blank" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5">
                  <i class="fa-brands fa-github text-[11px]"></i> Code
                </a>
              ` : ''}
              ${sub.demoUrl ? `
                <a href="${sub.demoUrl}" target="_blank" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5">
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Live Demo
                </a>
              ` : ''}
              <button onclick="openShowcaseDetailModal('${sub.id}')" class="ml-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1">
                <i class="fa-solid fa-comments text-teal-400 text-[11px]"></i> ${commentsCount}
              </button>
            </div>

            <!-- Upvote Button & Detail Button -->
            <div class="flex items-center gap-2">
              <button onclick="handleVoteShowcase('${sub.id}')" class="flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                hasVoted 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20' 
                  : 'bg-slate-900 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
              }">
                <i class="fa-solid fa-heart ${hasVoted ? 'text-white' : 'text-rose-400'}"></i>
                <span>${hasVoted ? 'Voted' : 'Vote'} (${voteCount})</span>
              </button>

              <button onclick="openShowcaseDetailModal('${sub.id}')" class="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1">
                Details <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterShowcase() {
  const compSelect = document.getElementById('showcaseCompFilter');
  const domainSelect = document.getElementById('showcaseDomainFilter');
  const sortSelect = document.getElementById('showcaseSortFilter');

  if (compSelect) state.showcaseState.activeCompFilter = compSelect.value;
  if (domainSelect) state.showcaseState.activeDomainFilter = domainSelect.value;
  if (sortSelect) state.showcaseState.activeSortFilter = sortSelect.value;

  renderShowcaseView();
}

async function handleVoteShowcase(subId) {
  const user = state.currentUser || state.allUsers[0];
  const res = await apiPost(`/submissions/${subId}/vote`, {
    userId: user ? user.id : 'usr-student-1'
  });

  if (res.success) {
    showToast(res.message, res.hasVoted ? 'success' : 'info');
    await refreshData();
    renderShowcaseView();
    if (state.showcaseState.selectedSubId === subId) {
      openShowcaseDetailModal(subId);
    }
  } else {
    showToast(res.error || 'Failed to update vote', 'error');
  }
}

function openShowcaseDetailModal(subId) {
  state.showcaseState.selectedSubId = subId;
  const sub = (state.submissions || []).find(s => s.id === subId);
  if (!sub) return;

  const comp = state.competitions.find(c => c.id === sub.competitionId);
  const team = state.teams.find(t => t.id === sub.teamId);
  const votes = sub.votes || [];
  const hasVoted = votes.includes(state.currentUser ? state.currentUser.id : 'usr-student-1');
  const comments = sub.comments || [];
  const coverUrl = sub.coverImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80';
  const bounties = sub.bountyTags || [];

  const modalContainer = document.getElementById('showcaseModalContent');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <!-- Top Hero Banner -->
    <div class="relative h-48 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
      <img src="${coverUrl}" alt="${sub.projectTitle}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
      
      <div class="absolute bottom-4 left-4 right-4">
        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm">
          ${comp ? comp.title : 'Competition'}
        </span>
        <h2 class="text-xl md:text-2xl font-black text-white mt-1 drop-shadow-md">${sub.projectTitle}</h2>
        <p class="text-xs text-slate-300">By squad <strong class="text-white">${team ? team.teamName : (sub.teamName || 'Solo Squad')}</strong></p>
      </div>
    </div>

    <!-- Bounty Badges -->
    ${bounties.length > 0 ? `
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-slate-400 font-semibold">Sponsor Bounties Contended:</span>
        ${bounties.map(b => `
          <span class="text-xs px-2.5 py-0.5 rounded-lg font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <i class="fa-solid fa-award text-amber-400"></i> ${b}
          </span>
        `).join('')}
      </div>
    ` : ''}

    <!-- Abstract & Architecture Narrative -->
    <div class="space-y-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Project Overview & Architecture</h4>
      <p class="text-xs md:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        ${sub.abstract || sub.summary || 'Project prototype deliverable with source repository and demonstration videos.'}
      </p>
    </div>

    <!-- Tech Stack Pill Matrix -->
    <div class="space-y-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Integrated Technologies</h4>
      <div class="flex flex-wrap gap-1.5">
        ${(sub.techStack || []).map(tech => `
          <span class="px-2.5 py-1 rounded-xl text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700">
            ${tech}
          </span>
        `).join('')}
      </div>
    </div>

    <!-- Multi-Asset Deliverable Buttons -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
      ${sub.repoUrl ? `
        <a href="${sub.repoUrl}" target="_blank" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center text-xs font-semibold text-white transition flex items-center justify-center gap-1.5">
          <i class="fa-brands fa-github text-emerald-400"></i> GitHub Repo
        </a>
      ` : ''}
      ${sub.demoUrl ? `
        <a href="${sub.demoUrl}" target="_blank" class="p-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-center text-xs font-semibold text-cyan-300 transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Live Demo
        </a>
      ` : ''}
      ${sub.slidesUrl ? `
        <a href="${sub.slidesUrl}" target="_blank" class="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-center text-xs font-semibold text-amber-300 transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-file-powerpoint"></i> Slide Deck
        </a>
      ` : ''}
      ${sub.videoUrl ? `
        <a href="${sub.videoUrl}" target="_blank" class="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-center text-xs font-semibold text-rose-300 transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-circle-play"></i> Video Tour
        </a>
      ` : ''}
    </div>

    <!-- Community Upvoting Bar -->
    <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
      <div>
        <h4 class="text-xs font-bold text-white">Support This Team for People's Choice</h4>
        <p class="text-[11px] text-slate-400">Cast your official community vote to help this project win the Spotlight Trophy.</p>
      </div>

      <button onclick="handleVoteShowcase('${sub.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
        hasVoted
          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
          : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40'
      }">
        <i class="fa-solid fa-heart"></i>
        <span>${hasVoted ? 'Upvoted' : 'Cast Upvote'} (${votes.length})</span>
      </button>
    </div>

    <!-- Community Comments & Peer Feedback Thread -->
    <div class="space-y-3 pt-3 border-t border-slate-800">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i class="fa-solid fa-comments text-teal-400"></i> Peer Feedback & Mentor Discussion (${comments.length})
        </h4>
      </div>

      <!-- Comments Stream -->
      <div class="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        ${comments.length === 0 ? `
          <p class="text-xs text-slate-500 italic py-2">No peer feedback posted yet. Be the first to share constructive feedback!</p>
        ` : comments.map(cmt => `
          <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-2">
                <img src="${cmt.userAvatar || 'https://api.dicebear.com/7.x/initials/svg?seed=Peer'}" class="w-5 h-5 rounded-full object-cover">
                <strong class="text-white">${cmt.userName || 'Peer'}</strong>
              </div>
              <span class="text-slate-500 font-mono text-[10px]">${new Date(cmt.createdAt).toLocaleString()}</span>
            </div>
            <p class="text-slate-300 leading-relaxed pl-7">${cmt.text}</p>
          </div>
        `).join('')}
      </div>

      <!-- Add Comment Form -->
      <div class="flex items-center gap-2 pt-2">
        <input type="text" id="showcaseNewCommentText" placeholder="Write constructive peer feedback, questions, or accolades..." 
          class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
          onkeydown="if(event.key === 'Enter') handleAddShowcaseComment('${sub.id}')">
        <button onclick="handleAddShowcaseComment('${sub.id}')" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-500/20 shrink-0">
          <i class="fa-solid fa-paper-plane text-[10px]"></i> Post
        </button>
      </div>
    </div>
  `;

  openModal('modalShowcaseDetail');
}

async function handleAddShowcaseComment(subId) {
  const inputEl = document.getElementById('showcaseNewCommentText');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) {
    showToast('Please type a feedback comment first', 'warning');
    return;
  }

  const user = state.currentUser || state.allUsers[0];
  const res = await apiPost(`/submissions/${subId}/comment`, {
    userId: user ? user.id : 'usr-student-1',
    text
  });

  if (res.success) {
    inputEl.value = '';
    showToast('Feedback posted to project showcase!', 'success');
    await refreshData();
    renderShowcaseView();
    openShowcaseDetailModal(subId);
  } else {
    showToast(res.error || 'Failed to post feedback', 'error');
  }
}

// ==========================================
// VIEW 14: SPONSOR BOUNTIES & CAMPUS SCHEDULE CONTROLLER
// ==========================================
function renderSponsorsView() {
  const sponsors = state.sponsors || [];
  const schedules = state.schedules || [];

  // Render Sponsor Cards
  const bountiesGrid = document.getElementById('sponsorsBountiesGrid');
  if (bountiesGrid) {
    bountiesGrid.innerHTML = sponsors.map(sp => {
      const tierColors = {
        PLATINUM: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40',
        GOLD: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40',
        SILVER: 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 text-slate-300 border-slate-500/40'
      };
      const tClass = tierColors[sp.tier] || tierColors.SILVER;

      return `
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4 hover:border-slate-500 transition">
          <!-- Header Bar -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md">
                <img src="${sp.logoUrl}" alt="${sp.name}" class="max-h-full max-w-full object-contain">
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-base font-bold text-white">${sp.name}</h4>
                  <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${tClass}">${sp.tier} SPONSOR</span>
                </div>
                <p class="text-xs text-slate-400">${sp.tagline}</p>
              </div>
            </div>

            <a href="${sp.websiteUrl || '#'}" target="_blank" class="text-slate-400 hover:text-white text-xs transition" title="Visit Sponsor Portal">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">${sp.description}</p>

          <!-- Free Perks Box -->
          <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
            <i class="fa-solid fa-gift text-amber-400 mt-0.5"></i>
            <span><strong>Claimable Perks:</strong> ${sp.perks}</span>
          </div>

          <!-- Bounties Track List -->
          <div class="space-y-2 pt-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exclusive Challenge Track:</span>
            ${(sp.bounties || []).map(b => `
              <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-2">
                <div class="flex items-center justify-between">
                  <strong class="text-xs text-amber-300 font-bold">${b.title}</strong>
                  <span class="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    ${b.prize}
                  </span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">${b.criteria}</p>
                <div class="pt-1 flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-mono">Bounty Tag: <strong class="text-indigo-400">${b.tag}</strong></span>
                  <button onclick="navigateTo('submissions')" class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition flex items-center gap-1">
                    Tag in Submission <i class="fa-solid fa-arrow-right text-[9px]"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Campus Schedule Timeline
  const scheduleContainer = document.getElementById('campusScheduleList');
  if (scheduleContainer) {
    scheduleContainer.innerHTML = schedules.map(sch => {
      const isCompleted = sch.status === 'COMPLETED';
      const isActive = sch.status === 'ACTIVE';

      const statusBadge = isCompleted
        ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><i class="fa-solid fa-check"></i> Concluded</span>`
        : isActive
        ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin"></i> HAPPENING NOW</span>`
        : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1"><i class="fa-regular fa-clock"></i> Upcoming</span>`;

      const cardStyle = isActive
        ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-950/30 to-slate-800'
        : 'border-slate-700/60 bg-slate-800/80';

      return `
        <div class="border rounded-2xl p-4 transition hover:border-slate-600 ${cardStyle}">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-700/60">
            <div class="flex items-center gap-2.5">
              <span class="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                ${sch.time}
              </span>
              <span class="text-[11px] text-slate-400 font-medium">${sch.day}</span>
              ${statusBadge}
            </div>

            <div class="flex items-center gap-1.5 text-xs text-slate-300 font-semibold bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
              <i class="fa-solid fa-map-pin text-rose-400 text-[10px]"></i>
              <span>${sch.location}</span>
              <span class="text-[10px] text-slate-500 font-mono font-bold">(${sch.roomCode})</span>
            </div>
          </div>

          <div class="pt-2 space-y-1">
            <h4 class="text-sm font-bold text-white">${sch.title}</h4>
            <p class="text-xs text-slate-300">${sch.description}</p>
            <div class="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Host / Speakers: <strong class="text-slate-200">${sch.host}</strong></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && typeof navigateTo === 'function') {
    setTimeout(() => navigateTo(hash), 150);
  }
});

function toggleNavMore(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('navMoreMenu');
  const chevron = document.getElementById('navMoreChevron');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  if (chevron) {
    chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

function closeNavMore() {
  const menu = document.getElementById('navMoreMenu');
  const chevron = document.getElementById('navMoreChevron');
  if (menu) menu.classList.add('hidden');
  if (chevron) chevron.style.transform = 'rotate(0deg)';
}

function toggleMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const icon = document.getElementById('mobileNavIcon');
  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');
  drawer.classList.toggle('hidden');
  if (icon) {
    icon.className = isHidden ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  }
}

document.addEventListener('click', (e) => {
  const container = document.getElementById('navMoreContainer');
  if (container && !container.contains(e.target)) {
    closeNavMore();
  }
});

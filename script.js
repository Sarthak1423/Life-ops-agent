// State management
let currentUser = null;
let expenses = [];
let habits = [];

// Chart References
let financeChartInstance = null;
let habitChartInstance = null;

const currentDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

document.addEventListener('DOMContentLoaded', () => {
    // Top Date Setup
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').innerText = new Date().toLocaleDateString('en-US', options);

    // Styling defaults for Chart.js
    if(window.Chart) {
        Chart.defaults.color = "#9da8b9";
        Chart.defaults.font.family = "'Outfit', sans-serif";
    }

    // Auth Flow
    const storedUser = localStorage.getItem('ops_currentUser');
    if (storedUser) initSession(storedUser);

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim();
        if(usernameInput) initSession(usernameInput);
    });

    // Navigation setup
    const navItems = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');

    function switchTab(item) {
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.classList.remove('active-view'));
        item.classList.add('active');
        const target = item.getAttribute('data-tab');
        document.getElementById(target).classList.add('active-view');
        pageTitle.innerText = item.querySelector('span').innerText;
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item));
    });

    // A11y Tab Handler
    window.handleTabEnter = function(event, target) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const el = document.querySelector(`li[data-tab="${target}"]`);
            if (el) switchTab(el);
        }
    };

    // Finance Flow
    document.getElementById('finance-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('trans-type').value;
        const amount = parseFloat(document.getElementById('trans-amount').value);
        const desc = document.getElementById('trans-desc').value;

        if(!amount || !desc) return;
        expenses.push({ id: Date.now(), type, amount, desc, date: new Date().toISOString() });
        saveData();
        e.target.reset();
        renderFinance();
        showToast("Transaction Logged Successfully!");
    });

    // Search Interaction
    const searchInput = document.getElementById('global-search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const searchList = document.getElementById('search-results');
        searchList.innerHTML = '';
        
        if(!query) {
            searchList.innerHTML = `<li style="text-align:center;color:var(--text-secondary);padding:1rem;">Type to search habits and finances...</li>`;
            return;
        }

        let found = 0;
        habits.forEach(h => {
            if(h.name.toLowerCase().includes(query)) {
                searchList.innerHTML += `<li><span>Habit: <b>${h.name}</b></span> <i class='bx bx-check-shield text-primary'></i></li>`;
                found++;
            }
        });

        expenses.forEach(ex => {
            if(ex.desc.toLowerCase().includes(query)) {
                searchList.innerHTML += `<li><span>Transaction: <b>${ex.desc}</b></span> <span class="${ex.type==='income'?'text-success':'text-danger'}">₹${ex.amount}</span></li>`;
                found++;
            }
        });

        if(found === 0) {
            searchList.innerHTML = `<li style="text-align:center;color:var(--danger);padding:1rem;">No results found for "${query}"</li>`;
        }
    });

    // Travel Flow
    document.getElementById('travel-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fromRaw = document.getElementById('trip-from').value.trim();
        const toRaw = document.getElementById('trip-to').value.trim();
        const budget = parseInt(document.getElementById('trip-budget').value, 10);
        const resultsContainer = document.getElementById('travel-results');
        
        resultsContainer.innerHTML = `<div style="text-align:center; padding: 3rem;">
            <i class='bx bx-loader-alt bx-spin text-accent' style="font-size: 3rem;"></i>
            <p style="margin-top:15px; color: var(--text-secondary)">AI generating strategic booking options...</p>
        </div>`;

        const noAirportCities = ['shimla', 'manali', 'mussorie', 'ooyty', 'darjeeling'];
        const isHillStation = noAirportCities.some(city => toRaw.toLowerCase().includes(city) || fromRaw.toLowerCase().includes(city));

        setTimeout(() => {
            let flightOrBusHTML = '';
            const mmtUrl = `https://www.makemytrip.com/flights/`;
            const busUrl = `https://www.redbus.in/`;
            const bookingUrl = `https://www.booking.com/searchresults.html?ss=${toRaw}`;

            if(isHillStation) {
                const busCost = Math.floor(budget * 0.25);
                flightOrBusHTML = `
                    <a href="${busUrl}" target="_blank" class="result-link" aria-label="Book Volvo Bus to ${toRaw} on Redbus">
                        <div class="result-item">
                            <div class="result-header">
                                <span class="result-type"><i class='bx bx-bus text-accent'></i> PREMIUM VOLVO BUS</span>
                                <span class="result-price">₹${busCost.toLocaleString()}</span>
                            </div>
                            <h4 style="color:white;">Direct Intercity Sleeper</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary)">Overnight Journey • Recommended for ${toRaw}</p>
                        </div>
                    </a>
                `;
            } else {
                const flightCost = Math.floor(budget * 0.5);
                flightOrBusHTML = `
                    <a href="${mmtUrl}" target="_blank" class="result-link" aria-label="Book Flight to ${toRaw} on MakeMyTrip">
                        <div class="result-item">
                            <div class="result-header">
                                <span class="result-type"><i class='bx bx-plane-alt text-primary'></i> FLIGHT (Direct)</span>
                                <span class="result-price">₹${flightCost.toLocaleString()}</span>
                            </div>
                            <h4 style="color:white;">Indigo / AirIndia Express</h4>
                            <p style="font-size:0.85rem; color:var(--text-secondary)">Multiple timings available</p>
                        </div>
                    </a>
                `;
            }

            const hotelCost = Math.floor(budget * 0.4);
            const hotelHTML = `
                <a href="${bookingUrl}" target="_blank" class="result-link" aria-label="Book accommodations in ${toRaw} on Booking.com">
                    <div class="result-item">
                        <div class="result-header">
                            <span class="result-type"><i class='bx bx-building-house text-accent'></i> ACCOMMODATION</span>
                            <span class="result-price">₹${hotelCost.toLocaleString()}</span>
                        </div>
                        <h4 style="color:white;">Premium Hotel in ${toRaw}</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary)">View high-rated properties on Booking.com</p>
                    </div>
                </a>
            `;

            resultsContainer.innerHTML = flightOrBusHTML + hotelHTML;
            showToast("Travel strategies loaded!");
        }, 1500);
    });
});

// -----------------------------------------
// Auth & Data Management
// -----------------------------------------

function initSession(username) {
    currentUser = username.toLowerCase();
    localStorage.setItem('ops_currentUser', currentUser);
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('login-overlay').setAttribute('aria-hidden', 'true');
    document.getElementById('user-name-display').innerText = username;
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${username}&background=8a2be2&color=fff&bold=true`;
    loadData();
    renderFinance();
    renderHabits();
    showToast(`Welcome back, Commander ${username}!`);
}

window.logoutUser = function() {
    currentUser = null;
    localStorage.removeItem('ops_currentUser');
    expenses = []; habits = [];
    document.getElementById('login-username').value = "";
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('login-overlay').setAttribute('aria-hidden', 'false');
    
    if(financeChartInstance) financeChartInstance.destroy();
    if(habitChartInstance) habitChartInstance.destroy();
}

function loadData() {
    const rawData = localStorage.getItem(`ops_data_${currentUser}`);
    if(rawData) {
        const parsed = JSON.parse(rawData);
        expenses = parsed.expenses || []; habits = parsed.habits || [];
    } else {
        expenses = []; habits = [{ id: Date.now()+1, name: 'Drink 2L Water', days: [false,false,false,false,false,false,false] }];
        saveData();
    }
}

function saveData() {
    if(!currentUser) return;
    localStorage.setItem(`ops_data_${currentUser}`, JSON.stringify({ expenses, habits }));
}

// -----------------------------------------
// CSV Data Export
// -----------------------------------------
window.exportFinanceCSV = function() {
    if (expenses.length === 0) {
        showToast("No data to export!"); return;
    }
    
    let csvContent = "Date,Type,Description,Amount (INR)\n";
    expenses.forEach(function(rowArray) {
        const dateStr = new Date(rowArray.date).toLocaleDateString();
        csvContent += `${dateStr},${rowArray.type},"${rowArray.desc}",${rowArray.amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ops_expenses_${currentUser}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("CSV Downloaded Successfully!");
}

// -----------------------------------------
// UI Modals & Toasts
// -----------------------------------------

window.showToast = function(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class='bx bx-check-circle' style="color:var(--accent); font-size:1.5rem;" aria-hidden="true"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease-out forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

window.openSearchModal = function() {
    const ov = document.getElementById('modal-overlay');
    ov.classList.remove('hidden'); ov.setAttribute('aria-hidden', 'false');
    document.getElementById('search-modal').classList.remove('hidden');
    document.getElementById('global-search-input').focus();
}

window.openHabitModal = function() {
    const ov = document.getElementById('modal-overlay');
    ov.classList.remove('hidden'); ov.setAttribute('aria-hidden', 'false');
    document.getElementById('habit-modal').classList.remove('hidden');
}

window.closeModals = function() {
    const ov = document.getElementById('modal-overlay');
    ov.classList.add('hidden'); ov.setAttribute('aria-hidden', 'true');
    document.getElementById('search-modal').classList.add('hidden');
    document.getElementById('habit-modal').classList.add('hidden');
}

// -----------------------------------------
// Finance Processing & Charting
// -----------------------------------------

function renderFinance() {
    let totalIn = 0; let totalOut = 0;
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    const sorted = [...expenses].sort((a,b) => b.id - a.id);

    sorted.forEach(t => {
        if(t.type === 'income') totalIn += t.amount; else totalOut += t.amount;
        const dateStr = new Date(t.date).toLocaleDateString();
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="trans-info"><span class="trans-title">${t.desc}</span><span class="trans-date">${dateStr}</span></div>
            <div class="trans-amount ${t.type === 'income' ? 'text-success' : 'text-danger'}">
                ${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString()}
            </div>
        `;
        list.appendChild(li);
    });

    document.getElementById('total-income').innerText = `+₹${totalIn.toLocaleString()}`;
    document.getElementById('total-expense').innerText = `-₹${totalOut.toLocaleString()}`;
    document.getElementById('dash-balance').innerText = `₹${(totalIn - totalOut).toLocaleString()}`;

    // Update Finance Chart
    updateFinanceChart(totalIn, totalOut);
}

function updateFinanceChart(income, expense) {
    if(!window.Chart) return;
    const ctx = document.getElementById('financeChart');
    if(!ctx) return;

    if (financeChartInstance) financeChartInstance.destroy();

    // Only render chart if there is data
    if (income === 0 && expense === 0) {
        financeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '70%' }
        });
        return;
    }

    financeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#00fa9a', '#ff0055'],
                borderColor: '#060913',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { color: '#ffffff', boxWidth: 12 } }
            }
        }
    });
}

// -----------------------------------------
// Habit Processing & Charting
// -----------------------------------------

function renderHabits() {
    const tbody = document.getElementById('habit-tbody');
    tbody.innerHTML = '';
    
    let totalChecks = 0; let totalPossible = habits.length * 7;

    // Track for line graph
    let weekCompletionArr = [0, 0, 0, 0, 0, 0, 0];

    habits.forEach((h, hIdx) => {
        const tr = document.createElement('tr');
        let checksHtml = ''; let completedInWeek = 0;

        h.days.forEach((checked, dIdx) => {
            if(checked) { 
                completedInWeek++; 
                totalChecks++; 
                weekCompletionArr[dIdx] += 1;
            }
            checksHtml += `<td><label class="custom-checkbox" aria-label="Toggle ${h.name} for day ${dIdx}"><input type="checkbox" onchange="toggleHabit(${hIdx}, ${dIdx})" ${checked ? 'checked' : ''}><span class="checkmark"></span></label></td>`;
        });

        const progressPercent = Math.round((completedInWeek / 7) * 100) || 0;
        tr.innerHTML = `
            <td class="habit-name">${h.name}</td>
            ${checksHtml}
            <td><div class="progress-bar-container" aria-label="Progress ${progressPercent}%"><div class="progress-bar" style="width: ${progressPercent}%"></div></div></td>
            <td style="text-align:center;"><button class="btn delete-btn" aria-label="Delete ${h.name}" onclick="deleteHabit(${hIdx})" style="padding:0;color:var(--text-secondary); background:transparent;"><i class='bx bx-trash' style="font-size:1.3rem;"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

    const globalScore = totalPossible === 0 ? 0 : Math.round((totalChecks / totalPossible) * 100);
    document.getElementById('dash-habit-score').innerText = `${globalScore}%`;
    renderDashboardPriorities();
    
    // Update Habit Line Chart
    updateHabitChart(weekCompletionArr, habits.length);
}

function updateHabitChart(weekCompletionArr, totalHabits) {
    if(!window.Chart) return;
    const ctx = document.getElementById('habitChart');
    if(!ctx) return;

    if (habitChartInstance) habitChartInstance.destroy();

    // Map raw logic to percentages
    const percentageArr = weekCompletionArr.map(ticks => {
        if(totalHabits === 0) return 0;
        return Math.round((ticks / totalHabits) * 100);
    });

    habitChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Score %',
                data: percentageArr,
                borderColor: '#00ffff',
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#8a2be2',
                pointBorderColor: '#ffffff',
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#00ffff',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 25, callback: function(value) { return value + "%" } } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// -----------------------------------------
// Active Interactive Handlers
// -----------------------------------------

window.syncDashboard = function() {
    const btn = document.querySelector('button[onclick="syncDashboard()"]');
    btn.classList.add('syncing');
    renderDashboardPriorities();
    setTimeout(() => {
        btn.classList.remove('syncing');
        showToast("Priorities Synced!");
    }, 600);
}

function renderDashboardPriorities() {
    const ul = document.getElementById('dash-priorities');
    ul.innerHTML = '';

    if (habits.length === 0) {
        ul.innerHTML = `<li style="color:var(--text-secondary); text-align:center;">No habits tracked.<br>Add some to level up!</li>`;
        return;
    }

    habits.forEach((h, hIdx) => {
        const isCheckedToday = h.days[currentDayIdx];
        const li = document.createElement('li');
        li.innerHTML = `
            <label class="custom-checkbox flex-between" style="width:100%; display:flex; justify-content:flex-start; gap: 15px;">
                <input type="checkbox" aria-label="Prioritize ${h.name}" onchange="toggleHabit(${hIdx}, ${currentDayIdx})" ${isCheckedToday ? 'checked' : ''}>
                <span class="checkmark" style="position:relative; transform:none;"></span>
                <span style="${isCheckedToday ? 'text-decoration: line-through; opacity: 0.5;' : ''} color:white; font-weight:500;">${h.name}</span>
            </label>
        `;
        ul.appendChild(li);
    });
}

window.toggleHabit = function(hIdx, dIdx) { habits[hIdx].days[dIdx] = !habits[hIdx].days[dIdx]; saveData(); renderHabits(); }

window.submitNewHabit = function(name) {
    habits.push({ id: Date.now(), name, days: [false,false,false,false,false,false,false] });
    saveData(); renderHabits(); closeModals(); showToast("Habit added successfully!");
}

window.submitCustomHabit = function() {
    const name = document.getElementById('custom-habit-input').value.trim();
    if(name) { submitNewHabit(name); document.getElementById('custom-habit-input').value = ""; }
}

window.deleteHabit = function(hIdx) {
    if(confirm(`Completely delete "${habits[hIdx].name}" from your records?`)) {
        habits.splice(hIdx, 1); saveData(); renderHabits(); showToast("Habit un-tracked.");
    }
}

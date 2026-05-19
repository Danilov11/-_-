// main.js
// Главный файл - инициализация приложения

// Глобальные переменные
let allPayments = [];
let filteredPayments = [];
let allDocuments = [];
let filteredDocuments = [];
let allDetours = [];
let accountsData = { payments: [], transactions: [] }; // Данные счетов
let mergedData = {}; // Объединённые данные по телефонам
let currentPage = 1;
let currentDocPage = 1;
let currentSort = { field: CONFIG.sortField, direction: CONFIG.sortDirection };
let currentDocSort = { field: 'employee', direction: 'asc' };
let currentEmployeePayments = [];
let currentEmployee = null; // Текущий сотрудник для карточки
let currentMode = null; // 'last-period', 'last-unpaid', null
let allPeriods = [];
let allStatuses = [];
let allPositions = [];
let allRestaurants = [];
let lastPeriod = '';
let currentScreen = 'home'; // 'home', 'payments', 'documents', 'dashboard', 'sos', 'employee'

// Элементы DOM - будем заполнять после загрузки DOM
const elements = {};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем основной контейнер до успешного входа
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.classList.add('hidden');

    // Показываем экран входа (данные грузятся в фоне)
    showLoginScreen();

    // Сначала инициализируем элементы DOM
    initializeDOMElements();

    // Затем настраиваем обработчики событий
    setupEventListeners();

    // Обновление времени последнего обновления
    updateLastUpdateTime();
    
    // Периодическое обновление данных
    setInterval(() => {
        loadData();
    }, CONFIG.refreshInterval);
});

// Инициализация элементов DOM
function initializeDOMElements() {
    // Экраны
    elements.homeScreen = document.getElementById('home-screen');
    elements.paymentsScreen = document.getElementById('payments-screen');
    elements.documentsScreen = document.getElementById('documents-screen');
    elements.dashboardScreen = document.getElementById('dashboard-screen');
    elements.detoursScreen = document.getElementById('detours-screen');
    elements.sosScreen = document.getElementById('sos-screen');
    elements.employeeScreen = document.getElementById('employee-screen');
    
    // Навигация
    elements.navLinks = document.querySelectorAll('.nav-link');
    elements.quickActionBtns = document.querySelectorAll('.quick-action-btn');
    elements.partnerNameBtn = document.querySelector('.brand-partner-name[data-page="home"]');
    
    // Фильтры
    elements.periodYearFilter = document.getElementById('period-year-filter');
    elements.statusFilter = document.getElementById('status-filter');
    elements.searchInput = document.getElementById('search-input');
    elements.resetFiltersBtn = document.getElementById('reset-filters');
    elements.lastPeriodBtn = document.getElementById('last-period');
    elements.lastUnpaidBtn = document.getElementById('last-unpaid');
    
    // Индикатор режима
    elements.modeIndicator = document.getElementById('mode-indicator');
    elements.modeMessage = document.getElementById('mode-message');
    
    // Таблица
    elements.loading = document.getElementById('loading');
    elements.tableContainer = document.getElementById('table-container');
    elements.tableBody = document.getElementById('table-body');
    elements.rowCount = document.getElementById('row-count');
    elements.periodInfo = document.getElementById('period-info');
    elements.errorMessage = document.getElementById('error-message');
    elements.retryBtn = document.getElementById('retry-load');
    
    // Пагинация
    elements.prevPageBtn = document.getElementById('prev-page');
    elements.nextPageBtn = document.getElementById('next-page');
    elements.pageInfo = document.getElementById('page-info');
    
    // Фильтры документов
    elements.docStatusFilter = document.getElementById('doc-status-filter');
    elements.docPositionFilter = document.getElementById('doc-position-filter');
    elements.docRestaurantFilter = document.getElementById('doc-restaurant-filter');
    elements.docProblemsFilter = document.getElementById('doc-problems-filter');
    elements.docSearchInput = document.getElementById('doc-search-input');
    elements.docResetFiltersBtn = document.getElementById('doc-reset-filters');
    
    // Таблица документов
    elements.docLoading = document.getElementById('doc-loading');
    elements.docTableContainer = document.getElementById('doc-table-container');
    elements.docTableBody = document.getElementById('doc-table-body');
    elements.docRowCount = document.getElementById('doc-row-count');
    elements.docErrorMessage = document.getElementById('doc-error-message');
    elements.docRetryBtn = document.getElementById('doc-retry-load');
    
    // Карточка сотрудника
    elements.backButton = document.getElementById('back-button');
    elements.employeeName = document.getElementById('employee-name');
    elements.employeePhone = document.getElementById('employee-phone');
    elements.employeeCitizenship = document.getElementById('employee-citizenship');
    elements.telegramLink = document.getElementById('telegram-link');
    elements.employeeLoading = document.getElementById('employee-loading');
    elements.employeeTableContainer = document.getElementById('employee-table-container');
    elements.employeeTableBody = document.getElementById('employee-table-body');
    elements.employeeError = document.getElementById('employee-error');
    elements.employeeWarning = document.getElementById('employee-warning');
    elements.employeeDocsLoading = document.getElementById('employee-docs-loading');
    elements.employeeDocuments = document.getElementById('employee-documents');
    elements.employeeProblems = document.getElementById('employee-problems');
    elements.employeeRecommendations = document.getElementById('employee-recommendations');
    elements.problemsList = document.getElementById('problems-list');
    elements.recommendationsList = document.getElementById('recommendations-list');
    
    // Статистика
    elements.statProcessedCount = document.getElementById('stat-processed-count');
    elements.statProcessedPercent = document.getElementById('stat-processed-percent');
    
    // Итоги
    elements.totalPayments = document.getElementById('total-payments');
    elements.totalAmount = document.getElementById('total-amount');
    elements.lastPaymentDate = document.getElementById('last-payment-date');
    
    // Общее
    elements.lastUpdate = document.getElementById('last-update');
    elements.exportCsvBtn = document.getElementById('export-csv');
    
    console.log('Инициализировано элементов DOM:', Object.keys(elements).length);
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showScreen(page);
        });
    });
    
    // Модальное окно "Добавить сотрудника"
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    const addEmployeeModal = document.getElementById('add-employee-modal');
    const addEmployeeClose = document.getElementById('add-employee-modal-close');
    const addEmployeeDismiss = document.getElementById('add-employee-modal-dismiss');

    function openAddEmployeeModal() {
        addEmployeeModal.classList.remove('hidden');
        addEmployeeModal.setAttribute('aria-hidden', 'false');
    }
    function closeAddEmployeeModal() {
        addEmployeeModal.classList.add('hidden');
        addEmployeeModal.setAttribute('aria-hidden', 'true');
    }

    if (addEmployeeBtn) addEmployeeBtn.addEventListener('click', openAddEmployeeModal);
    if (addEmployeeClose) addEmployeeClose.addEventListener('click', closeAddEmployeeModal);
    if (addEmployeeDismiss) addEmployeeDismiss.addEventListener('click', closeAddEmployeeModal);
    if (addEmployeeModal) addEmployeeModal.addEventListener('click', (e) => {
        if (e.target === addEmployeeModal) closeAddEmployeeModal();
    });

    // Обработчик для кнопки "Партнер – Франклинс" в навигации
    const partnerNameBtn = document.querySelector('.brand-partner-name[data-page="home"]');
    if (partnerNameBtn) {
        partnerNameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('home');
        });
    }
    
    // Быстрые действия
    elements.quickActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Если это внешняя ссылка (например, Telegram), не перехватываем клик
            if (btn.hasAttribute('href') && btn.getAttribute('href').startsWith('http')) {
                return; // Позволяем браузеру обработать ссылку
            }
            
            e.preventDefault();
            const page = btn.getAttribute('data-page');
            const action = btn.getAttribute('data-action');
            if (page) {
                showScreen(page, action);
            }
        });
    });
    
    // Фильтры выплат (проверяем существование элементов)
    if (elements.periodYearFilter) elements.periodYearFilter.addEventListener('change', applyFilters);
    if (elements.statusFilter) elements.statusFilter.addEventListener('change', applyFilters);
    if (elements.searchInput) elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Фильтры документов
    if (elements.docStatusFilter) elements.docStatusFilter.addEventListener('change', applyDocFilters);
    if (elements.docPositionFilter) elements.docPositionFilter.addEventListener('change', applyDocFilters);
    if (elements.docRestaurantFilter) elements.docRestaurantFilter.addEventListener('change', applyDocFilters);
    if (elements.docProblemsFilter) elements.docProblemsFilter.addEventListener('change', applyDocFilters);
    if (elements.docSearchInput) elements.docSearchInput.addEventListener('input', debounce(applyDocFilters, 300));
    if (elements.docResetFiltersBtn) elements.docResetFiltersBtn.addEventListener('click', resetDocFilters);
    
    if (elements.docRetryBtn) elements.docRetryBtn.addEventListener('click', loadData);
    
    // Кнопки специальных режимов (могут отсутствовать в демо-режиме)
    if (elements.lastPeriodBtn) {
        elements.lastPeriodBtn.addEventListener('click', () => showLastPeriod());
        console.log('Кнопка "Последний период" найдена');
    } else {
        console.log('Кнопка "Последний период" не найдена');
    }
    
    if (elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.addEventListener('click', () => showLastUnpaid());
        console.log('Кнопка "Неоплаченные" найдена');
    } else {
        console.log('Кнопка "Неоплаченные" не найдена');
    }
    
    // Пагинация
    if (elements.prevPageBtn) elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    if (elements.nextPageBtn) elements.nextPageBtn.addEventListener('click', () => changePage(1));
    
    // Кнопки
    if (elements.retryBtn) elements.retryBtn.addEventListener('click', loadData);
    if (elements.backButton) elements.backButton.addEventListener('click', showMainScreen);
    if (elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Объезды: кнопки, фильтр, модальное окно
    const detoursNewBtn = document.getElementById('detours-new-btn');
    if (detoursNewBtn) detoursNewBtn.addEventListener('click', () => openDetourModal());
    const detoursReloadBtn = document.getElementById('detours-reload-btn');
    if (detoursReloadBtn) detoursReloadBtn.addEventListener('click', () => loadData());
    const detoursStatusFilter = document.getElementById('detours-status-filter');
    if (detoursStatusFilter) {
        detoursStatusFilter.addEventListener('change', () => {
            if (typeof renderDetoursTable === 'function') renderDetoursTable();
        });
    }
    const detourModalEl = document.getElementById('detour-modal');
    const detourModalClose = document.getElementById('detour-modal-close');
    const detourModalCancel = document.getElementById('detour-form-cancel');
    if (detourModalClose) detourModalClose.addEventListener('click', () => closeDetourModal());
    if (detourModalCancel) detourModalCancel.addEventListener('click', () => closeDetourModal());
    if (detourModalEl) {
        detourModalEl.addEventListener('click', (e) => {
            if (e.target === detourModalEl) closeDetourModal();
        });
    }
    const detourForm = document.getElementById('detour-form');
    if (detourForm) {
        detourForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusEl = document.getElementById('detour-form-status');
            const sel = document.getElementById('detour-employee-select');
            const idx = sel ? parseInt(sel.value, 10) : NaN;
            if (typeof _detourEmployeeList === 'undefined' || isNaN(idx) || !_detourEmployeeList[idx]) {
                if (statusEl) statusEl.textContent = 'Выберите сотрудника из базы.';
                return;
            }
            const emp = _detourEmployeeList[idx];
            const submitBtn = document.getElementById('detour-form-submit');
            if (statusEl) statusEl.textContent = 'Отправка заявки...';
            if (submitBtn) submitBtn.disabled = true;
            try {
                const payload = {
                    restaurant: document.getElementById('detour-restaurant').value.trim(),
                    director: document.getElementById('detour-director').value.trim(),
                    employeeName: emp.employee,
                    employeePhone: emp.phone,
                    employeeInn: emp.inn,
                    paperReason: document.getElementById('detour-paper-reason').value.trim(),
                    plannedVisitDate: document.getElementById('detour-planned-visit').value
                };
                await createDetourRequestApi(payload);
                if (statusEl) statusEl.textContent = 'Заявка отправлена.';
                closeDetourModal();
                await loadData();
            } catch (err) {
                console.error(err);
                if (statusEl) statusEl.textContent = err.message || 'Ошибка отправки';
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
    const detourEmpSel = document.getElementById('detour-employee-select');
    if (detourEmpSel) {
        detourEmpSel.addEventListener('change', () => {
            const i = parseInt(detourEmpSel.value, 10);
            if (typeof _detourEmployeeList !== 'undefined' && !isNaN(i) && _detourEmployeeList[i] && _detourEmployeeList[i].restaurant) {
                const rIn = document.getElementById('detour-restaurant');
                if (rIn) rIn.value = _detourEmployeeList[i].restaurant;
            }
        });
    }

    const detourPickupModal = document.getElementById('detour-pickup-info-modal');
    const detourPickupClose = document.getElementById('detour-pickup-info-close');
    const detourPickupDismiss = document.getElementById('detour-pickup-info-dismiss');
    if (detourPickupClose) detourPickupClose.addEventListener('click', () => closeDetourPickupInfoModal());
    if (detourPickupDismiss) detourPickupDismiss.addEventListener('click', () => closeDetourPickupInfoModal());
    if (detourPickupModal) {
        detourPickupModal.addEventListener('click', e => {
            if (e.target === detourPickupModal) closeDetourPickupInfoModal();
        });
    }
    
    // Дашборд: обновить данные (только если задан dataApiUrl — серверная сборка)
    const dashboardRefreshBtn = document.getElementById('dashboard-refresh-data');
    if (dashboardRefreshBtn && CONFIG.dataApiUrl) {
        dashboardRefreshBtn.addEventListener('click', async () => {
            const btn = dashboardRefreshBtn;
            const origText = btn.innerHTML;
            if (window.location.protocol === 'file:') {
                alert('Серверная версия должна открываться через сервер.\nЗапустите: npm start\nи откройте в браузере: http://localhost:3000');
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обновление…';
            try {
                const res = await fetch('/api/refresh', { method: 'POST' });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
                await loadData();
                btn.innerHTML = '<i class="fas fa-check"></i> Готово';
                setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 2000);
            } catch (e) {
                console.error('Ошибка обновления данных:', e);
                const isNetworkError = e.message === 'Failed to fetch' || e.name === 'TypeError';
                if (isNetworkError) {
                    alert('Не удалось связаться с сервером. Убедитесь, что приложение открыто по адресу сервера (например http://localhost:3000), а не как файл.');
                }
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка';
                setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 3000);
            }
        });
    }
    
    // Сортировка таблицы
    document.querySelectorAll('#payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortTable(field);
        });
    });
    
    // Сортировка таблицы сотрудника
    document.querySelectorAll('#employee-payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortEmployeeTable(field);
        });
    });
    
    // Сортировка таблицы документов
    document.querySelectorAll('#documents-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortDocumentTable(field);
        });
    });
    
    console.log('Обработчики событий настроены');
}

// Генерация тестовых данных документов (для демонстрации)
function generateTestDocuments() {
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427", citizenship: "Кыргызстан", position: "Кассир", restaurant: "Часовая 11 стр 2" },
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102", citizenship: "Узбекистан", position: "Официант", restaurant: "Ресторан 1" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185", citizenship: "Таджикистан", position: "Повар", restaurant: "Ресторан 2" },
    ];
    
    const testDocs = [];
    
    employees.forEach((emp, index) => {
        const hasAllDocs = index === 0;
        const hasPartial = index === 1;
        
        const collectedStatus = hasAllDocs ? 'Оформлен' : '';
        const inProcessStatus = hasPartial ? 'В обработке' : '';
        const realStatus = collectedStatus || inProcessStatus || '';
        
        testDocs.push({
            id: index + 1,
            collected: collectedStatus,
            inProcess: inProcessStatus,
            project: 'Проект Франклинс',
            city: 'Москва',
            position: emp.position,
            restaurant: emp.restaurant,
            comment: hasPartial ? 'В РКЛ' : '',
            vacation: '',
            passportIssueDate: hasAllDocs ? '01.04.2024' : '',
            birthDate: '16.07.2006',
            passportData: hasAllDocs ? 'PE1336294' : '',
            employee: emp.name,
            phone: normalizePhone(emp.phone),
            citizenship: emp.citizenship,
            documentsLink: hasAllDocs ? 'https://drive.google.com/...' : '',
            problems: index === 2 ? 'Отсутствует патент, Качество скана паспорта низкое' : '',
            registrationEndDate: hasAllDocs ? '15.01.2025' : '',
            patentIssueDate: hasAllDocs ? '10.10.2024' : '',
            contractDate: hasAllDocs ? '10.11.2024' : '',
            contractLink: hasAllDocs ? 'https://drive.google.com/contract...' : '',
            dismissedDate: '',
            documentStatus: hasAllDocs ? 'processed' : (hasPartial ? 'partial' : 'not-processed'),
            realStatus: realStatus
        });
    });
    
    return testDocs;
}

// Генерация тестовых данных (для демонстрации)
function generateTestData() {
    const periods = ['01.12-15.12', '16.11-30.11', '06.11-15.11', '16.10-5.11'];
    const statuses = ['Оплатили', 'оплатили в QUGO', 'Не платим', 'В обработке', 'Ожидает подтверждения'];
    
    const testData = [];
    
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427" },
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185" },
        { name: "Курбонова Гулжахон Абдуразоковна", phone: "79255103455" },
        { name: "Назаров Тухтасин Мухаммади Угли", phone: "79264200393" },
        { name: "Маматова Хуршедахон Исроиловна", phone: "79288542471" },
        { name: "Шерназаров Зариф Акбарали Угли", phone: "79336677836" },
        { name: "Анорбоев Шахзод Тулгин Угли", phone: "79777470317" },
        { name: "Хамракулов Ойбек Хурсанович", phone: "79779593169" },
        { name: "Тожиева Наргиза Аминова", phone: "79856292007" },
        { name: "Мухаммаджонов Акмалджон Аюбович", phone: "79955553419" }
    ];
    
    let id = 1;
    for (const period of periods) {
        for (const employee of employees) {
            const amount = Math.floor(Math.random() * 100000) + 10000;
            const statusIndex = Math.floor(Math.random() * statuses.length);
            const comment = Math.random() > 0.7 ? 'Тестовый комментарий' : '';
            
            testData.push({
                id: id++,
                year: 2025,
                period: period,
                employee: employee.name,
                phone: employee.phone,
                amount: amount,
                status: statuses[statusIndex],
                comment: comment,
                formattedAmount: formatCurrency(amount)
            });
        }
    }
    
    return testData;
}

// Глобальная функция для выхода из режима
window.exitMode = exitMode;

// ========================
// ЛОГИКА ЭКРАНА ВХОДА
// ========================

function showLoginScreen() {
    // Сбрасываем флаги сессии
    sessionStorage.removeItem('platformAccessGranted');
    sessionStorage.removeItem('dashboardAccessGranted');
    sessionStorage.removeItem('employeeMode');

    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('hidden');

    // Грузим данные в фоне, не показывая основной интерфейс
    loadData();

    setupLoginListeners();
}

function setupLoginListeners() {
    // Кнопки выбора роли
    const managerBtn = document.getElementById('role-manager-btn');
    const employeeBtn = document.getElementById('role-employee-btn');
    if (managerBtn) managerBtn.addEventListener('click', () => switchLoginStep('manager'));
    if (employeeBtn) employeeBtn.addEventListener('click', () => switchLoginStep('employee'));

    // Назад
    const backFromManager = document.getElementById('login-back-from-manager');
    const backFromEmployee = document.getElementById('login-back-from-employee');
    if (backFromManager) backFromManager.addEventListener('click', () => switchLoginStep('role'));
    if (backFromEmployee) backFromEmployee.addEventListener('click', () => switchLoginStep('role'));

    // Вход руководителя
    const managerLoginBtn = document.getElementById('manager-login-btn');
    const managerInput = document.getElementById('manager-password-input');
    if (managerLoginBtn) managerLoginBtn.addEventListener('click', handleManagerLogin);
    if (managerInput) managerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleManagerLogin();
    });

    // Вход сотрудника
    const employeeLoginBtn = document.getElementById('employee-login-btn');
    const employeeInput = document.getElementById('employee-phone-input');
    if (employeeLoginBtn) employeeLoginBtn.addEventListener('click', handleEmployeeLogin);
    if (employeeInput) {
        employeeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleEmployeeLogin();
        });
        // Автоформат: добавляем +7 если пусто
        employeeInput.addEventListener('focus', () => {
            if (!employeeInput.value) employeeInput.value = '+7';
        });
    }

    // Кнопка выхода в экране сотрудника
    const logoutBtn = document.getElementById('employee-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleEmployeeLogout);
}

function switchLoginStep(step) {
    document.getElementById('login-step-role').classList.add('hidden');
    document.getElementById('login-step-manager').classList.add('hidden');
    document.getElementById('login-step-employee').classList.add('hidden');

    // Сбрасываем ошибки
    const managerError = document.getElementById('manager-login-error');
    const employeeError = document.getElementById('employee-login-error');
    if (managerError) managerError.classList.add('hidden');
    if (employeeError) employeeError.classList.add('hidden');

    document.getElementById(`login-step-${step}`).classList.remove('hidden');

    // Фокус на поле ввода
    if (step === 'manager') {
        setTimeout(() => {
            const inp = document.getElementById('manager-password-input');
            if (inp) inp.focus();
        }, 50);
    }
    if (step === 'employee') {
        setTimeout(() => {
            const inp = document.getElementById('employee-phone-input');
            if (inp) { inp.focus(); if (!inp.value) inp.value = '+7'; }
        }, 50);
    }
}

function handleManagerLogin() {
    const input = document.getElementById('manager-password-input');
    const error = document.getElementById('manager-login-error');
    const password = input ? input.value : '';

    if (password === CONFIG.platformPassword) {
        sessionStorage.setItem('platformAccessGranted', 'true');
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.classList.add('hidden');
        document.querySelector('.container').classList.remove('hidden');

        // Сбрасываем состояние после возможного режима сотрудника
        document.body.classList.remove('employee-mode');
        const backBtn = document.getElementById('back-button');
        const logoutBtn = document.getElementById('employee-logout-btn');
        if (backBtn) backBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');

        // Переходим на главный экран
        showScreen('home');

        // Если данные уже загружены — перерисовываем, иначе грузим заново
        if (allPayments.length > 0 || allDocuments.length > 0) {
            applyFilters();
            applyDocFilters();
            updateStatistics();
        } else {
            loadData();
        }
    } else {
        if (error) error.classList.remove('hidden');
        if (input) input.select();
    }
}

function handleEmployeeLogin() {
    const input = document.getElementById('employee-phone-input');
    const error = document.getElementById('employee-login-error');
    const loading = document.getElementById('employee-login-loading');
    const rawPhone = input ? input.value.trim() : '';

    if (error) error.classList.add('hidden');

    // Базовая валидация
    const normalized = normalizePhone(rawPhone);
    if (!normalized || normalized.length < 10) {
        if (error) {
            error.textContent = 'Введите корректный номер телефона, начиная с +7';
            error.classList.remove('hidden');
        }
        return;
    }

    // Если данные ещё не загрузились — ждём
    if (allDocuments.length === 0 && allPayments.length === 0) {
        if (loading) loading.classList.remove('hidden');
        const btn = document.getElementById('employee-login-btn');
        if (btn) btn.disabled = true;

        let attempts = 0;
        const wait = setInterval(() => {
            attempts++;
            if (allDocuments.length > 0 || allPayments.length > 0) {
                clearInterval(wait);
                if (loading) loading.classList.add('hidden');
                if (btn) btn.disabled = false;
                doEmployeeLogin(normalized, error);
            } else if (attempts > 30) { // 15 сек
                clearInterval(wait);
                if (loading) loading.classList.add('hidden');
                if (btn) btn.disabled = false;
                if (error) {
                    error.textContent = 'Не удалось загрузить данные. Проверьте соединение и попробуйте снова.';
                    error.classList.remove('hidden');
                }
            }
        }, 500);
        return;
    }

    doEmployeeLogin(normalized, error);
}

function doEmployeeLogin(normalizedPhone, errorEl) {
    // Ищем сотрудника по телефону в документах и выплатах
    const doc = allDocuments.find(d => normalizePhone(d.phone) === normalizedPhone);
    const pays = allPayments.filter(p => normalizePhone(p.phone) === normalizedPhone);
    const pay = pays[0] || null;

    if (!doc && !pay) {
        if (errorEl) {
            errorEl.textContent = 'Сотрудник с таким номером не найден. Проверьте номер.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    // Успешный вход
    sessionStorage.setItem('employeeMode', 'true');
    sessionStorage.setItem('employeePhone', normalizedPhone);

    // Скрываем экран входа, показываем контейнер
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
    document.querySelector('.container').classList.remove('hidden');

    // Включаем режим сотрудника: скрываем главную навигацию
    document.body.classList.add('employee-mode');

    // Показываем кнопку выхода, скрываем кнопку "Назад"
    const backBtn = document.getElementById('back-button');
    const logoutBtn = document.getElementById('employee-logout-btn');
    if (backBtn) backBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');

    // Показываем экран сотрудника
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const empScreen = document.getElementById('employee-screen');
    if (empScreen) empScreen.classList.remove('hidden');
    currentScreen = 'employee';

    // Напрямую заполняем глобальные переменные и вызываем рендер
    const employeeName = (doc && doc.employee) || (pay && pay.employee) || '';
    const employeePhone = (doc && doc.phone) || (pay && pay.phone) || normalizedPhone;
    const employeeInn = (doc && doc.inn) || (pay && pay.inn) || '';

    currentEmployee = {
        employee: employeeName,
        phone: employeePhone,
        inn: employeeInn,
        citizenship: (doc && doc.citizenship) || '',
        payment: pay,
        document: doc || null
    };

    currentEmployeePayments = pays;

    // Если по телефону не нашли в выплатах, пробуем по ИНН
    if (currentEmployeePayments.length === 0 && employeeInn) {
        const normalizedInn = normalizeINN(employeeInn);
        currentEmployeePayments = allPayments.filter(p => normalizeINN(p.inn) === normalizedInn);
    }

    // Заполняем заголовок экрана сотрудника
    if (elements.employeeName) elements.employeeName.textContent = employeeName;
    if (elements.employeePhone) elements.employeePhone.textContent = employeePhone ? '📱 ' + formatPhone(employeePhone) : '';
    if (elements.employeeCitizenship) elements.employeeCitizenship.textContent = currentEmployee.citizenship ? '🌍 ' + currentEmployee.citizenship : '';
    if (elements.telegramLink && employeePhone) {
        elements.telegramLink.href = CONFIG.telegramUrl + '+' + formatPhoneForTelegram(employeePhone);
    }

    // Скрываем предупреждение о несовпадении
    const mismatchWarning = document.getElementById('employee-mismatch-warning');
    if (mismatchWarning) mismatchWarning.classList.add('hidden');

    // Рендерим документы и выплаты
    renderEmployeeDocuments();
    renderEmployeeTable();
}

function handleEmployeeLogout() {
    sessionStorage.removeItem('employeeMode');
    sessionStorage.removeItem('employeePhone');
    document.body.classList.remove('employee-mode');

    // Возвращаем кнопку "Назад"
    const backBtn = document.getElementById('back-button');
    const logoutBtn = document.getElementById('employee-logout-btn');
    if (backBtn) backBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');

    // Скрываем все экраны и показываем главный (он будет под логин-оверлеем)
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.remove('hidden');
    currentScreen = 'home';

    // Скрываем контейнер — покажем снова только после входа
    const container = document.querySelector('.container');
    if (container) container.classList.add('hidden');

    // Показываем экран входа снова
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('hidden');
    switchLoginStep('role');

    // Сбрасываем поля
    const phoneInput = document.getElementById('employee-phone-input');
    if (phoneInput) phoneInput.value = '';
}

// config.js
// Конфигурация приложения

const CONFIG = {
    // Рестораны
    restaurants: [
        {
            id: 'franklins',
            name: 'Франклинс',
            appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyfKGRHbud7H57e_i7m8nm6mAdLo7dVwp4rumUup4tzEx5yPNh0JLQZppsE4JyCkWgd/exec',
            minPaymentYear: 2026
        },
        {
            id: 'chao',
            name: 'Чао Пицца',
            appsScriptUrl: 'https://script.google.com/macros/s/AKfycbynx6_cDkMigEGM0hVfJJkBxSSd78ME5FOEQ8BIBQcgMfNhzanTO52YJSaiYx0lOHtj/exec',
            minPaymentYear: 2026,
            platformPassword: '99',
            dashboardPassword: '1190912'
        }
    ],

    // Текущий ресторан (устанавливается динамически при выборе)
    currentRestaurantId: 'franklins',

    // API (динамически заменяется при выборе ресторана)
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyfKGRHbud7H57e_i7m8nm6mAdLo7dVwp4rumUup4tzEx5yPNh0JLQZppsE4JyCkWgd/exec',

    // UI
    itemsPerPage: 50,
    sortDirection: 'desc',
    sortField: 'period',

    // Обновление данных
    refreshInterval: 5 * 60 * 1000, // 5 минут
    dataUpdateDelay: 2 * 60 * 1000, // 2-3 минуты на обновление из Google

    // Telegram
    telegramUrl: 'https://t.me/',

    // Безопасность
    dashboardPassword: '445566',
    platformPassword: '44',

    // Объезды (доставка бумажных договоров)
    detourStatuses: [
        'Новая',
        'В работе',
        'Договор готовится',
        'Запланировано',
        'Доставлю',
        'Доставлено*',
        'Доставлено',
        'Не доставлю',
        'Отменено'
    ],
    detourOfficeMapsUrl: 'https://yandex.ru/maps/?text=55.725815,37.681204&si=e77a0evg4020jqvmg60xgq0yv4'
};

// Вспомогательная функция: установить ресторан по ID
function setRestaurant(id) {
    const r = CONFIG.restaurants.find(x => x.id === id);
    if (!r) return;

    // Если ресторан меняется — сбрасываем кэш данных предыдущего ресторана
    if (CONFIG.currentRestaurantId !== id) {
        if (typeof dataFetched !== 'undefined')   dataFetched   = false;
        if (typeof allPayments !== 'undefined')   allPayments   = [];
        if (typeof allDocuments !== 'undefined')  allDocuments  = [];
        if (typeof allDetours !== 'undefined')    allDetours    = [];
    }

    CONFIG.currentRestaurantId = id;
    CONFIG.appsScriptUrl = r.appsScriptUrl;
    sessionStorage.setItem('selectedRestaurant', id);

    // Обновляем название в навигации и UI
    const badge = document.getElementById('nav-restaurant-badge');
    if (badge) badge.textContent = r.name;
    const partnerBtn = document.querySelector('.brand-partner-name[data-page="home"]');
    if (partnerBtn) partnerBtn.textContent = 'Партнер – ' + r.name;
    const statName = document.getElementById('stat-restaurant-name');
    if (statName) statName.textContent = r.name;
}

// При загрузке восстанавливаем выбранный ресторан из сессии
function restoreRestaurant() {
    const saved = sessionStorage.getItem('selectedRestaurant');
    if (saved) setRestaurant(saved);
}

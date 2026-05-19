// config.js
// Конфигурация приложения

const CONFIG = {
    // API
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
    platformPassword: '44', // Пароль для входа на платформу

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
    /** Ссылка на офис для самовывоза договора (Яндекс.Карты) */
    detourOfficeMapsUrl: 'https://yandex.ru/maps/?text=55.725815,37.681204&si=e77a0evg4020jqvmg60xgq0yv4'
};

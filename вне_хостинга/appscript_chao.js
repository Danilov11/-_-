// ============================================
// КОД ДЛЯ ТАБЛИЦЫ ПАРТНЁРА ЧАО ПИЦЦА
// Только один лист: 'ЧАО Пицца'
// ============================================

var SPREADSHEET_ID = '1g3YtSWlrxMZe-_aa7_hYhjOMZc6h_yqC9aS2TXSL3lQ';
var PAYMENTS_SHEET_NAME = 'Лист1';
var PAYMENTS_MIN_YEAR = 2024;

// СТРУКТУРА ЛИСТА 'ЧАО Пицца':
// Строка 1: заголовок "Условия 25%" — пропускается автоматически
// Строка 2: заголовки (A=Год, B=Период, C=Должность, D=ФИО, E=Телефон, F=Сумма, G=Статус, H=Комментарий)
// Строка 3+: данные

function doGet(e) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var paymentsSheet = spreadsheet.getSheetByName(PAYMENTS_SHEET_NAME);

    if (!paymentsSheet) {
      return jsonResponse_({
        success: false,
        error: 'Лист "' + PAYMENTS_SHEET_NAME + '" не найден',
        data: [], documents: [], detours: [],
        totalRecords: 0, totalDocuments: 0
      });
    }

    var paymentsValues = paymentsSheet.getDataRange().getValues();

    // Ищем строку с заголовками — ту где есть 'ФИО' или 'Сотрудник'
    var headerRowIndex = 0;
    for (var h = 0; h < Math.min(5, paymentsValues.length); h++) {
      var rowStr = paymentsValues[h].join('|').toLowerCase();
      if (rowStr.indexOf('фио') >= 0 || rowStr.indexOf('сотрудник') >= 0) {
        headerRowIndex = h;
        break;
      }
    }
    var paymentHeaders = paymentsValues[headerRowIndex];
    var dataStartIndex = headerRowIndex + 1;

    var cols = {
      year:     findColumnIndex(paymentHeaders, ['Год', 'год']),
      period:   findColumnIndex(paymentHeaders, ['Период выплаты', 'Период', 'период']),
      position: findColumnIndex(paymentHeaders, ['Должность', 'должность']),
      employee: findColumnIndex(paymentHeaders, ['Сотрудник', 'ФИО', 'Имя', 'сотрудник', 'фио']),
      phone:    findColumnIndex(paymentHeaders, ['Телефон', 'Номер телефона', 'телефон', 'номер']),
      amount:   findColumnIndex(paymentHeaders, ['Сумма из реестра', 'Из реестра', 'Сумма', 'сумма']),
      status:   findColumnIndex(paymentHeaders, ['Статус', 'статус']),
      comment:  findColumnIndex(paymentHeaders, ['Комментарий', 'комментарий']),
      inn:      findColumnIndex(paymentHeaders, ['ИНН', 'инн'])
    };

    // Отладочный режим
    if (e && e.parameter && e.parameter.action === 'debugPayments') {
      return jsonResponse_({
        success: true,
        headerRowIndex: headerRowIndex,
        headers: paymentHeaders,
        columnIndexes: cols,
        firstDataRow: paymentsValues[dataStartIndex] || []
      });
    }

    var paymentsData = [];

    for (var i = dataStartIndex; i < paymentsValues.length; i++) {
      var row = paymentsValues[i];

      // Пропускаем пустые строки
      if (!row[cols.employee] || row[cols.employee] === '') continue;

      var year = getPaymentYear_(row, cols);
      if (!year || year < PAYMENTS_MIN_YEAR) continue;

      var amount = parseSheetNumber_(row[cols.amount]);

      var inn = (cols.inn >= 0 && row[cols.inn]) ? String(row[cols.inn]).trim() : '';
      var position = (cols.position >= 0 && row[cols.position]) ? String(row[cols.position]).trim() : '';

      paymentsData.push({
        id:       i,
        year:     year,
        period:   row[cols.period]   || '',
        employee: row[cols.employee] || '',
        phone:    String(row[cols.phone] || ''),
        amount:   amount,
        status:   row[cols.status]   || '',
        comment:  row[cols.comment]  || '',
        inn:      inn,
        position: position
      });
    }

    return jsonResponse_({
      success: true,
      data: paymentsData,
      documents: [],
      detours: [],
      timestamp: new Date().toISOString(),
      totalRecords: paymentsData.length,
      totalDocuments: 0
    });

  } catch (error) {
    return jsonResponse_({
      success: false,
      error: error.toString(),
      message: 'Ошибка при загрузке данных из Google Таблицы',
      data: [], documents: [], detours: [],
      totalRecords: 0, totalDocuments: 0
    });
  }
}

function doPost(e) {
  return jsonResponse_({ success: false, error: 'not_supported' });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    // Убираем обычные пробелы И неразрывные пробелы (\xa0)
    var header = String(headers[i] || '').toLowerCase().trim().replace(/ /g, '').trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (header === possibleNames[j].toLowerCase().trim()) return i;
    }
  }
  return -1;
}

function parseSheetNumber_(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  var normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  return parseFloat(normalized) || 0;
}

function getPaymentYear_(row, cols) {
  if (cols.year >= 0) {
    var year = parseInt(row[cols.year], 10);
    if (!isNaN(year) && year >= 2000) return year;
  }
  if (cols.period >= 0) {
    var period = String(row[cols.period] || '');
    var match = period.match(/20\d{2}/);
    if (match) return parseInt(match[0], 10);
  }
  return null;
}

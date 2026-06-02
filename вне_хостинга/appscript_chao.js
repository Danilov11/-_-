// ============================================
// КОД ДЛЯ ТАБЛИЦЫ ПАРТНЁРА ЧАО ПИЦЦА
// Выплаты: таблица 1g3YtSWlrxMZe-_aa7_hYhjOMZc6h_yqC9aS2TXSL3lQ, лист 'Лист1'
// Документы: таблица 1YKcsCrlPX5n1X_XGQcGQFSbqT3S0U4-xHxpmGGUvUVw, лист 'Чао Пицца'
// ============================================

var SPREADSHEET_ID          = '1g3YtSWlrxMZe-_aa7_hYhjOMZc6h_yqC9aS2TXSL3lQ';
var PAYMENTS_SHEET_NAME     = 'Лист1';
var PAYMENTS_MIN_YEAR       = 2024;

var DOCUMENTS_SPREADSHEET_ID = '1YKcsCrlPX5n1X_XGQcGQFSbqT3S0U4-xHxpmGGUvUVw';
var DOCUMENTS_SHEET_NAME     = 'Чао Пицца';

// СТРУКТУРА ЛИСТА ВЫПЛАТ:
// Строка 1: заголовок "Условия 25%" — пропускается автоматически
// Строка 2: заголовки (A=Год, B=Период, C=Должность, D=ФИО, E=Телефон, F=Сумма, G=Статус, H=Комментарий)
// Строка 3+: данные

// СТРУКТУРА ЛИСТА ДОКУМЕНТОВ (A–Z):
// A(0)=Статус, B(1)=Проект, C(2)=Город, D(3)=Должность, E(4)=Ресторан,
// F(5)=Комментарий, G(6)=Дата проверки в РКЛ, H(7)=Отпуск, I(8)=ИНН,
// J(9)=Серия патента, K(10)=Номер патента, L(11)=Серия бланка, M(12)=Номер бланка,
// N(13)=Дата выдачи паспорта, O(14)=Дата рождения, P(15)=Паспортные данные,
// Q(16)=ФИО, R(17)=Телефон, S(18)=Гражданство, T(19)=Ссылка на документы,
// U(20)=Проблемы, V(21)=Регистрация дата окончания, W(22)=Патент дата выдачи,
// X(23)=Договор дата, Y(24)=Ссылка на договор, Z(25)=Уволен (дата)

function doGet(e) {
  try {
    // ===================== ВЫПЛАТЫ =====================
    var spreadsheet  = SpreadsheetApp.openById(SPREADSHEET_ID);
    var paymentsSheet = spreadsheet.getSheetByName(PAYMENTS_SHEET_NAME);
    var paymentsData  = [];

    if (paymentsSheet) {
      var paymentsValues = paymentsSheet.getDataRange().getValues();

      // Ищем строку с заголовками — там где есть 'ФИО' или 'Сотрудник'
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

      if (e && e.parameter && e.parameter.action === 'debugPayments') {
        return jsonResponse_({
          success: true,
          headerRowIndex: headerRowIndex,
          headers: paymentHeaders,
          columnIndexes: cols,
          firstDataRow: paymentsValues[dataStartIndex] || []
        });
      }

      for (var i = dataStartIndex; i < paymentsValues.length; i++) {
        var row = paymentsValues[i];
        if (!row[cols.employee] || row[cols.employee] === '') continue;

        var year = getPaymentYear_(row, cols);
        if (!year || year < PAYMENTS_MIN_YEAR) continue;

        var amount   = parseSheetNumber_(row[cols.amount]);
        var inn      = (cols.inn >= 0 && row[cols.inn])      ? String(row[cols.inn]).trim()      : '';
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
    }

    // ===================== ДОКУМЕНТЫ =====================
    var documentsData = [];
    try {
      var docSpreadsheet = SpreadsheetApp.openById(DOCUMENTS_SPREADSHEET_ID);
      var documentsSheet = docSpreadsheet.getSheetByName(DOCUMENTS_SHEET_NAME);

      if (documentsSheet) {
        var documentsValues = documentsSheet.getDataRange().getValues();

        for (var j = 1; j < documentsValues.length; j++) {
          var row     = documentsValues[j];
          var employee = row[16] ? String(row[16]).trim() : '';
          var phone    = row[17] ? String(row[17]).trim() : '';
          var inn      = row[8]  ? String(row[8]).trim()  : '';

          if (!employee && !phone && !inn) continue;

          var colA = row[0] ? String(row[0]).trim() : '';
          var collected = '', inProcess = '';
          if (colA) {
            if (colA.toLowerCase().indexOf('собран') >= 0 && colA.toLowerCase().indexOf('обработке') < 0) {
              collected = colA;
            } else if (colA.toLowerCase().indexOf('обработке') >= 0 || colA.toLowerCase().indexOf('обновлено') >= 0) {
              inProcess = colA;
            } else {
              inProcess = colA;
            }
          }

          documentsData.push({
            id:                  j,
            collected:           collected,
            inProcess:           inProcess,
            project:             row[1]  ? String(row[1]).trim()  : '',
            city:                row[2]  ? String(row[2]).trim()  : '',
            position:            row[3]  ? String(row[3]).trim()  : '',
            restaurant:          row[4]  ? String(row[4]).trim()  : '',
            comment:             row[5]  ? String(row[5]).trim()  : '',
            rklCheckDate:        formatDate_(row[6]),
            vacation:            row[7]  ? String(row[7]).trim()  : '',
            inn:                 inn,
            patentSeries:        row[9]  ? String(row[9]).trim()  : '',
            patentNumber:        row[10] ? String(row[10]).trim() : '',
            patentBlankSeries:   row[11] ? String(row[11]).trim() : '',
            patentBlankNumber:   row[12] ? String(row[12]).trim() : '',
            passportIssueDate:   formatDate_(row[13]),
            birthDate:           formatDate_(row[14]),
            passportData:        row[15] ? String(row[15]).trim() : '',
            employee:            employee,
            phone:               phone,
            citizenship:         row[18] ? String(row[18]).trim() : '',
            documentsLink:       row[19] ? String(row[19]).trim() : '',
            problems:            row[20] ? String(row[20]).trim() : '',
            registrationEndDate: formatDate_(row[21]),
            patentIssueDate:     formatDate_(row[22]),
            contractDate:        formatDate_(row[23]),
            contractLink:        row[24] ? String(row[24]).trim() : '',
            dismissedDate:       formatDate_(row[25])
          });
        }
      }
    } catch (docErr) {
      // Документы недоступны — возвращаем пустой массив, выплаты всё равно отдаём
    }

    return jsonResponse_({
      success:        true,
      data:           paymentsData,
      documents:      documentsData,
      detours:        [],
      timestamp:      new Date().toISOString(),
      totalRecords:   paymentsData.length,
      totalDocuments: documentsData.length
    });

  } catch (error) {
    return jsonResponse_({
      success:  false,
      error:    error.toString(),
      message:  'Ошибка при загрузке данных',
      data: [], documents: [], detours: [],
      totalRecords: 0, totalDocuments: 0
    });
  }
}

function doPost(e) {
  return jsonResponse_({ success: false, error: 'not_supported' });
}

function formatDate_(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (val instanceof Date) {
    var d = ('0' + val.getDate()).slice(-2);
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    return d + '.' + m + '.' + val.getFullYear();
  }
  if (typeof val === 'number') {
    var date = new Date((val - 25569) * 86400 * 1000);
    var d2 = ('0' + date.getDate()).slice(-2);
    var m2 = ('0' + (date.getMonth() + 1)).slice(-2);
    return d2 + '.' + m2 + '.' + date.getFullYear();
  }
  return String(val).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var raw    = String(headers[i] || '');
    var header = raw.replace(/[\xa0]/g, '').toLowerCase().trim();
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
    var match  = period.match(/20\d{2}/);
    if (match) return parseInt(match[0], 10);
  }
  return null;
}

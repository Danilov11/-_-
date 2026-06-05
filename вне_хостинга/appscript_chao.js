// ============================================
// КОД ДЛЯ ТАБЛИЦЫ ПАРТНЁРА ЧАО ПИЦЦА
// Выплаты+Объезды: 13VJ_wOL6tjxsKqFuPx_diZaawSTzJhOnW5JxfaMNn_g, лист 'Выплаты'
// Документы: 1YKcsCrlPX5n1X_XGQcGQFSbqT3S0U4-xHxpmGGUvUVw, лист 'Чао Пицца'
// ============================================

var SPREADSHEET_ID           = '13VJ_wOL6tjxsKqFuPx_diZaawSTzJhOnW5JxfaMNn_g';
var PAYMENTS_SHEET_NAME      = 'Выплаты';
var PAYMENTS_MIN_YEAR        = 2024;
var DETOURS_SHEET_NAME       = 'Объезды';

var DOCUMENTS_SPREADSHEET_ID = '1YKcsCrlPX5n1X_XGQcGQFSbqT3S0U4-xHxpmGGUvUVw';
var DOCUMENTS_SHEET_NAME     = 'Чао Пицца';

var DETOURS_HEADERS = [
  'id', 'createdAt', 'restaurant', 'director', 'employeeName',
  'employeeInn', 'paperReason', 'plannedVisitDate', 'status',
  'adminDeadline', 'adminComment', 'Дата доставки договора', 'updatedAt'
];

function doGet(e) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    // --- Объезды: создание / обновление ---
    if (e && e.parameter && e.parameter.action === 'detourCreate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetD = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var payload = decodePayload_(e.parameter.p);
      var created = appendDetourRow_(sheetD, payload);
      return jsonResponse_({ success: true, detour: created });
    }
    if (e && e.parameter && e.parameter.action === 'detourUpdate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetU = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var upd = decodePayload_(e.parameter.p);
      updateDetourRow_(sheetU, upd);
      return jsonResponse_({ success: true });
    }

    // ===================== ВЫПЛАТЫ =====================
    var paymentsSheet = spreadsheet.getSheetByName(PAYMENTS_SHEET_NAME);
    var paymentsData  = [];

    if (paymentsSheet) {
      var paymentsValues = paymentsSheet.getDataRange().getValues();

      // Ищем строку с заголовками
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
          success: true, headerRowIndex: headerRowIndex,
          headers: paymentHeaders, columnIndexes: cols,
          firstDataRow: paymentsValues[dataStartIndex] || []
        });
      }

      for (var i = dataStartIndex; i < paymentsValues.length; i++) {
        var row = paymentsValues[i];
        if (!row[cols.employee] || row[cols.employee] === '') continue;
        var year = getPaymentYear_(row, cols);
        if (!year || year < PAYMENTS_MIN_YEAR) continue;
        var amount   = parseSheetNumber_(row[cols.amount]);
        var inn      = (cols.inn >= 0 && row[cols.inn])           ? String(row[cols.inn]).trim()      : '';
        var position = (cols.position >= 0 && row[cols.position]) ? String(row[cols.position]).trim() : '';
        paymentsData.push({
          id: i, year: year,
          period:   row[cols.period]   || '',
          employee: row[cols.employee] || '',
          phone:    String(row[cols.phone] || ''),
          amount:   amount,
          status:   row[cols.status]   || '',
          comment:  row[cols.comment]  || '',
          inn: inn, position: position
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
          var row      = documentsValues[j];
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
            id: j, collected: collected, inProcess: inProcess,
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
            employee: employee, phone: phone,
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
      // Документы недоступны — выплаты и объезды всё равно отдаём
    }

    // ===================== ОБЪЕЗДЫ =====================
    ensureDetoursSheet_(spreadsheet);
    var detoursSheet = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
    var detoursData  = readDetoursAsObjects_(detoursSheet);

    return jsonResponse_({
      success: true,
      data: paymentsData, documents: documentsData, detours: detoursData,
      timestamp: new Date().toISOString(),
      totalRecords: paymentsData.length, totalDocuments: documentsData.length
    });

  } catch (error) {
    return jsonResponse_({
      success: false, error: error.toString(),
      message: 'Ошибка при загрузке данных',
      data: [], documents: [], detours: [],
      totalRecords: 0, totalDocuments: 0
    });
  }
}

function doPost(e) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var body = {};
    if (e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var action = body.action, payload = body.payload || {};
    if (action === 'detourCreate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetD = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      var created = appendDetourRow_(sheetD, payload);
      return jsonResponse_({ success: true, detour: created });
    }
    if (action === 'detourUpdate') {
      ensureDetoursSheet_(spreadsheet);
      var sheetU = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
      updateDetourRow_(sheetU, payload);
      return jsonResponse_({ success: true });
    }
    return jsonResponse_({ success: false, error: 'unknown_action' });
  } catch (err) {
    return jsonResponse_({ success: false, error: String(err) });
  }
}

// ===================== ВСПОМОГАТЕЛЬНЫЕ =====================

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function decodePayload_(p) {
  if (!p) throw new Error('empty_payload');
  var s = String(p).trim().replace(/ /g, '+');
  try {
    var bytes = Utilities.base64Decode(s);
    var jsonStr = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    return JSON.parse(jsonStr);
  } catch (e1) {
    return JSON.parse(decodeURIComponent(s));
  }
}

function ensureDetoursSheet_(spreadsheet) {
  var sh = spreadsheet.getSheetByName(DETOURS_SHEET_NAME);
  if (!sh) sh = spreadsheet.insertSheet(DETOURS_SHEET_NAME);
  var width = Math.max(DETOURS_HEADERS.length, sh.getLastColumn() || 0, 1);
  var first = sh.getRange(1, 1, 1, width).getValues()[0];
  var empty = true;
  for (var i = 0; i < first.length; i++) {
    if (String(first[i] || '').trim() !== '') { empty = false; break; }
  }
  if (empty) {
    sh.getRange(1, 1, 1, DETOURS_HEADERS.length).setValues([DETOURS_HEADERS]);
    sh.setFrozenRows(1);
  }
}

function detoursHeadersRow_(sheet) {
  var lc = sheet.getLastColumn(), lr = sheet.getLastRow();
  if (lr < 1 || lc < 1) return DETOURS_HEADERS.slice();
  return sheet.getRange(1, 1, 1, lc).getValues()[0];
}

function detoursHeaderToKey_(cell) {
  var raw = String(cell || '').trim();
  if (!raw) return '';
  var compact = raw.toLowerCase().replace(/\s+/g, '').replace(/ё/g, 'е');
  var map = {
    'id':'id','createdat':'createdAt','restaurant':'restaurant',
    'director':'director','employeename':'employeeName',
    'employeephone':'employeePhone','телефон':'employeePhone',
    'employeeinn':'employeeInn','инн':'employeeInn',
    'contracttype':'contractType','типдоговора':'contractType',
    'paperreason':'paperReason','зачембумага':'paperReason',
    'plannedvisitdate':'plannedVisitDate','визит':'plannedVisitDate',
    'desireddeliverydate':'desiredDeliveryDate',
    'status':'status','статус':'status',
    'admindeadline':'adminDeadline','admincomment':'adminComment',
    'updatedat':'updatedAt',
    'contractdeliverydate':'contractDeliveryDate',
    'датадоставкидоговора':'contractDeliveryDate'
  };
  return map[compact] || '';
}

function detoursColIndexByKey_(sheet, key) {
  var headers = detoursHeadersRow_(sheet);
  for (var i = 0; i < headers.length; i++) {
    if (detoursHeaderToKey_(headers[i]) === key) return i + 1;
  }
  return -1;
}

function formatDetourValueOut_(val, key) {
  if (val === undefined || val === null || val === '') return '';
  if (val instanceof Date) {
    if (key === 'createdAt' || key === 'updatedAt')
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd.MM.yyyy');
  }
  return String(val);
}

function readDetoursAsObjects_(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headerRow = values[0], out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r], obj = {};
    for (var c = 0; c < headerRow.length; c++) {
      var key = detoursHeaderToKey_(headerRow[c]);
      if (!key) continue;
      obj[key] = formatDetourValueOut_(row[c] === undefined || row[c] === null ? '' : row[c], key);
    }
    if (String(obj.id || '').trim() !== '') out.push(obj);
  }
  return out;
}

function nextDetourId_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 'D1';
  var maxNum = 0;
  var ids = sheet.getRange(2, 1, last, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var m = String(ids[i][0] || '').trim().match(/^D(\d+)$/);
    if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
  }
  return 'D' + (maxNum + 1);
}

function detoursAppendCell_(key, id, payload, nowIso) {
  if (!key) return '';
  switch (key) {
    case 'id': return id;
    case 'createdAt': case 'updatedAt': return nowIso;
    case 'restaurant': return String(payload.restaurant || '');
    case 'director':   return String(payload.director || '');
    case 'employeeName': return String(payload.employeeName || '');
    case 'employeeInn':  return String(payload.employeeInn || '');
    case 'paperReason':  return String(payload.paperReason || '');
    case 'plannedVisitDate': return formatDateOrEmpty_(payload.plannedVisitDate);
    case 'status': return 'Новая';
    case 'adminDeadline': case 'adminComment': case 'contractDeliveryDate': return '';
    case 'employeePhone': return String(payload.employeePhone || '');
    case 'contractType':  return String(payload.contractType || '');
    case 'desiredDeliveryDate': return formatDateOrEmpty_(payload.desiredDeliveryDate);
    default: return '';
  }
}

function appendDetourRow_(sheet, payload) {
  var nowIso = new Date().toISOString();
  var id = nextDetourId_(sheet);
  var headers = detoursHeadersRow_(sheet), row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(detoursAppendCell_(detoursHeaderToKey_(headers[i]), id, payload, nowIso));
  }
  sheet.appendRow(row);
  return {
    id: id, createdAt: nowIso,
    restaurant: String(payload.restaurant || ''),
    director: String(payload.director || ''),
    employeeName: String(payload.employeeName || ''),
    employeeInn: String(payload.employeeInn || ''),
    paperReason: String(payload.paperReason || ''),
    plannedVisitDate: formatDateOrEmpty_(payload.plannedVisitDate),
    status: 'Новая', adminDeadline: '', adminComment: '',
    contractDeliveryDate: '', updatedAt: nowIso
  };
}

function formatDateOrEmpty_(v) {
  if (v === undefined || v === null || v === '') return '';
  var s = String(v).trim();
  return s.length >= 10 ? s.substring(0, 10) : s;
}

function updateDetourRow_(sheet, payload) {
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('missing_id');
  var values = sheet.getDataRange().getValues(), rowIndex = -1;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0] || '').trim() === id) { rowIndex = r + 1; break; }
  }
  if (rowIndex < 2) throw new Error('row_not_found');
  var nowIso = new Date().toISOString(), col;
  if (payload.status !== undefined) {
    col = detoursColIndexByKey_(sheet, 'status');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.status));
  }
  if (payload.adminDeadline !== undefined) {
    col = detoursColIndexByKey_(sheet, 'adminDeadline');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.adminDeadline));
  }
  if (payload.adminComment !== undefined) {
    col = detoursColIndexByKey_(sheet, 'adminComment');
    if (col > 0) sheet.getRange(rowIndex, col).setValue(String(payload.adminComment));
  }
  col = detoursColIndexByKey_(sheet, 'updatedAt');
  if (col > 0) sheet.getRange(rowIndex, col).setValue(nowIso);
}

function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i] || '').replace(/[\xa0]/g, '').toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (header === possibleNames[j].toLowerCase().trim()) return i;
    }
  }
  return -1;
}

function parseSheetNumber_(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  var normalized = String(value).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
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

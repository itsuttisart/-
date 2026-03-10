/**
 * Google Apps Script backend for SchoolFlow.
 * Deploy as Web App and set URL in app.js.
 */
const SHEETS = {
  grades: ["studentId", "fullName", "year", "semester", "course", "score", "grade"],
  attendance: ["date", "course", "room", "studentId", "fullName", "status", "remark"],
  behavior: ["date", "studentId", "fullName", "category", "detail", "point"],
  teaching: ["teacherId", "teacherName", "course", "room", "level", "term"],
  students: ["studentId", "prefix", "fullName", "classRoom", "guardian", "phone"],
  staff: ["staffId", "fullName", "position", "department", "phone", "email"],
  checkin: ["date", "staffId", "fullName", "checkIn", "checkOut", "status"],
  settings: ["username", "password", "role", "accessMenus", "status"],
};

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");

  switch (payload.action) {
    case "auth":
      return jsonResponse(auth(payload.username, payload.password));
    case "list":
      return jsonResponse(listRows(payload.sheet));
    case "append":
      return jsonResponse(appendRow(payload.sheet, payload.values));
    default:
      return jsonResponse({ ok: false, message: "Unknown action" });
  }
}

function auth(username, password) {
  const result = listRows("settings");
  if (!result.ok) return result;

  const user = result.rows.find((row) => row.username === username && row.password === password);
  if (!user) return { ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };

  return { ok: true, role: user.role || "user" };
}

function listRows(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName];

  if (!headers) return { ok: false, message: "ไม่พบชีตที่ร้องขอ" };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { ok: true, rows: [] };

  const rows = values.slice(1).map((line) => {
    const obj = {};
    headers.forEach((key, idx) => {
      obj[key] = line[idx] || "";
    });
    return obj;
  });

  return { ok: true, rows };
}

function appendRow(sheetName, values) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName];

  if (!headers) return { ok: false, message: "ไม่พบชีตที่ร้องขอ" };

  const row = headers.map((header) => values[header] || "");
  sheet.appendRow(row);
  return { ok: true };
}

function getOrCreateSheet(sheetName) {
  const headers = SHEETS[sheetName] || [];
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const firstRow = sheet.getRange(1, 1, 1, Math.max(1, headers.length)).getValues()[0];
  const hasHeader = headers.length && headers.every((h, i) => firstRow[i] === h);

  if (!hasHeader && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

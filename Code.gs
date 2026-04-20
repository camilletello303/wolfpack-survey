// ============================================================
// WOLFPACK NJTC — Availability Survey Response Handler
// Google Apps Script Web App
//
// SETUP INSTRUCTIONS:
// 1. Open your "Wolfpack Availability Responses" Google Sheet
// 2. Extensions → Apps Script → paste this entire file
// 3. Click Deploy → New Deployment
// 4. Type: Web App
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Click Deploy → copy the Web App URL
// 8. Paste that URL into your captain dashboard (Calendar Sync tab)
// ============================================================

const SHEET_NAME = 'Responses';
const LOG_SHEET  = 'Log';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── Route by action ──
    if (data.action === 'sendEmails') {
      const results = sendEmails(data.emails || []);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', results }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: save a survey response
    saveResponse(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Send survey emails directly from Apps Script ──────────────
// Called by the captain dashboard. Sends one email per player
// using the Gmail account that owns this Apps Script.
function sendEmails(emails) {
  const results = [];
  emails.forEach(em => {
    try {
      GmailApp.sendEmail(
        em.to,
        em.subject,
        em.body   // plain text fallback
      );
      logEntry(`Email sent to ${em.to}`);
      results.push({ to: em.to, status: 'sent' });
    } catch (err) {
      logEntry(`Email FAILED to ${em.to}: ${err.message}`);
      results.push({ to: em.to, status: 'error', message: err.message });
    }
  });
  return results;
}

function doGet(e) {
  // Set CORS headers by returning with ContentService (handled automatically)
  try {
    const action = e.parameter.action || 'read';

    if (action === 'read') {
      const data = readResponses();
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', data }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'clear') {
      clearResponses();
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: 'Cleared' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Send emails via GET (avoids CORS issues with POST) ──
    // Emails are passed as a JSON-encoded URL parameter
    if (action === 'sendEmails') {
      const emailsJson = e.parameter.emails || '[]';
      const emails = JSON.parse(emailsJson);
      const results = sendEmails(emails);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', results }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Send a single test email ──
    if (action === 'sendTest') {
      const to      = e.parameter.to || '';
      const subject = decodeURIComponent(e.parameter.subject || '');
      const body    = decodeURIComponent(e.parameter.body || '');
      if (!to) throw new Error('Missing "to" parameter');
      GmailApp.sendEmail(to, subject, body);
      logEntry(`Test email sent to ${to}`);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: `Email sent to ${to}` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveResponse(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Ensure Responses sheet exists with headers ──
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Headers added dynamically on first response
  }

  // Get all date keys from this submission
  const availability = data.availability || {};
  const dates = Object.keys(availability).sort();

  // Check if headers exist; if not, write them
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    const headers = ['Player', 'Email', 'League', 'Season', 'Submitted At', 'Notes', ...dates];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Build row — find existing date columns from headers
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dateStartCol = 7; // columns: Player, Email, League, Season, SubmittedAt, Notes, then dates

  // Check if this player already has a row (update if so)
  const allData = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.player && allData[i][2] === data.league) {
      existingRow = i + 1; // 1-indexed
      break;
    }
  }

  // Build the row values
  const rowBase = [
    data.player,
    data.email || '',
    data.league,
    data.season || '',
    data.submittedAt,
    data.notes || ''
  ];

  // Map availability to header columns
  const dateValues = headerRow.slice(6).map(h => {
    if (!h) return '';
    const dateKey = h instanceof Date
      ? Utilities.formatDate(h, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(h).trim();
    if (availability.hasOwnProperty(dateKey)) {
      return availability[dateKey] ? 'YES' : 'NO';
    }
    return '';
  });

  const fullRow = [...rowBase, ...dateValues];

  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, fullRow.length).setValues([fullRow]);
  } else {
    // Append new dates to headers if needed
    dates.forEach(d => {
      if (!headerRow.includes(d)) {
        const nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(d).setFontWeight('bold');
        headerRow.push(d);
      }
    });
    sheet.appendRow(fullRow);
  }

  // ── Color coding ──
  const lastRow = existingRow > 0 ? existingRow : sheet.getLastRow();
  const dateColStart = 7;
  const numDateCols = sheet.getLastColumn() - 6;
  if (numDateCols > 0) {
    const range = sheet.getRange(lastRow, dateColStart, 1, numDateCols);
    const values = range.getValues()[0];
    values.forEach((v, i) => {
      const cell = sheet.getRange(lastRow, dateColStart + i);
      if (v === 'YES') cell.setBackground('#d8f3dc').setFontColor('#1b4332');
      else if (v === 'NO') cell.setBackground('#fee2e2').setFontColor('#7f1d1d');
    });
  }

  logEntry(`Response saved for ${data.player} (${data.league})`);
}

function readResponses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const dateHeaders = headers.slice(6);

  return allData.slice(1).map(row => {
    const availability = {};
    dateHeaders.forEach((h, i) => {
      if (h) {
        const dateKey = h instanceof Date
          ? Utilities.formatDate(h, Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : String(h).trim();
        const val = row[6 + i];
        if (val === 'YES') availability[dateKey] = true;
        else if (val === 'NO') availability[dateKey] = false;
      }
    });
    return {
      player: row[0],
      email: row[1],
      league: row[2],
      season: row[3],
      submittedAt: row[4],
      notes: row[5],
      availability
    };
  });
}

function clearResponses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  logEntry('Responses cleared by captain');
}

function logEntry(msg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName(LOG_SHEET);
    if (!log) log = ss.insertSheet(LOG_SHEET);
    log.appendRow([new Date(), msg]);
  } catch(e) {}
}

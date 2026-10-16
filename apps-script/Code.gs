/**
 * RSVP endpoint for the Kevin & Adamar wedding site.
 * Bound to the "Wedding RSVP, Kevin and Adamar" spreadsheet.
 *
 * Deployed as a Web App:
 *   Execute as:     Me
 *   Who has access: Anyone
 *
 * GET  ?code=ABC123   -> {ok:true, seats:n} | {ok:false}
 * POST {code, note, ceremony, celebration, guests:[{first,last,...}]}
 *
 * The POST is sent as text/plain on purpose. Apps Script does not answer CORS
 * preflight requests, and a JSON content type would trigger one.
 */

var INVITATIONS = 'Invitations';
var REPLIES = 'Replies';
var LOOKUPS = 'Lookups';

function doGet(e) {
  var code = normalise((e && e.parameter && e.parameter.code) || '');
  if (!code) return json({ ok: false, error: 'no code' });

  var seats = seatsFor(code);
  logLookup(code, seats !== null);
  return seats === null ? json({ ok: false }) : json({ ok: true, seats: seats });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad request' });
  }

  var code = normalise(body.code || '');
  var seats = seatsFor(code);
  if (seats === null) return json({ ok: false, error: 'unknown code' });

  var guests = (body.guests || []).slice(0, seats);
  if (!guests.length) return json({ ok: false, error: 'no guests' });

  // One party answers once. A second send replaces the first rather than
  // adding a duplicate set, so the sheet always holds the latest answer.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(REPLIES);
    var rows = sheet.getDataRange().getValues();
    for (var r = rows.length; r >= 2; r--) {
      if (normalise(rows[r - 1][1]) === code) sheet.deleteRow(r);
    }

    var now = new Date();
    var note = String(body.note || '').slice(0, 2000);
    var out = guests.map(function (g, i) {
      return [
        now,
        code,
        String(g.first || '').slice(0, 80),
        String(g.last || '').slice(0, 80),
        g.ceremony === 'yes' ? 'Yes' : 'No',
        g.celebration === 'yes' ? 'Yes' : 'No',
        '',                    // Kind, filled in by hand
        i === 0 ? note : ''    // the note belongs to the party, not each person
      ];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, out.length, 8).setValues(out);
  } finally {
    lock.releaseLock();
  }

  return json({ ok: true });
}

/**
 * Every code entry, so you can tell who has opened their invitation from who
 * has never looked. Failures are logged too: a run of them against one code
 * usually means it was mistyped or misprinted.
 */
function logLookup(code, found) {
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(LOOKUPS);
    if (!sheet) return;
    sheet.appendRow([new Date(), code, found ? 'Yes' : 'No']);
  } catch (err) {
    // Never let the log stop a guest getting their seats.
  }
}

function seatsFor(code) {
  var rows = SpreadsheetApp.getActive().getSheetByName(INVITATIONS).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (normalise(rows[i][0]) === code) {
      var n = Number(rows[i][1]);
      return n > 0 ? n : null;
    }
  }
  return null;
}

function normalise(v) {
  return String(v == null ? '' : v).trim().toUpperCase();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

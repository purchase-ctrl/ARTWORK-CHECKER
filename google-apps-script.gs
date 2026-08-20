/*
 * HOW TO USE THIS FILE
 * 1. Open your Google Sheet.
 * 2. Extensions → Apps Script.
 * 3. Delete anything in the editor and paste this whole file in.
 * 4. Change SECRET below to a password of your own choosing (any random string).
 * 5. If your formulation tab isn't named "Sheet1", change SHEET_NAME below to match.
 * 6. If you're using the ingredient spelling check, add a tab named "Approved Ingredients"
 *    (or change INGREDIENTS_SHEET_NAME below) with one INCI/ingredient name per row in
 *    column A (a header row on row 1 is fine and gets skipped automatically).
 * 7. Click Deploy → New deployment → gear icon → Web app.
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Click Deploy, authorize it when asked, then copy the "Web app URL" it gives you.
 * 8. In Vercel, set:
 *      GOOGLE_SHEET_WEBAPP_URL = the Web app URL you just copied
 *      SHEET_SHARED_SECRET    = the same SECRET you set below
 *
 * Whenever you edit this script, redeploy via:
 *   Deploy → Manage deployments → ✏️ → Version: New version → Deploy
 * (saving alone does not update the live URL).
 *
 * No Google Cloud project, no service account, no key files needed.
 * Only someone who knows SECRET can get data back from this URL.
 */

var SECRET = "CHANGE-THIS-TO-YOUR-OWN-SECRET";
var SHEET_NAME = "Sheet1";
var INGREDIENTS_SHEET_NAME = "Approved Ingredients";

function doGet(e) {
  if (!e || !e.parameter || e.parameter.secret !== SECRET) {
    return jsonOutput({ error: "Unauthorized" });
  }

  var action = e.parameter.action || "lookup";

  if (action === "ingredients") {
    return handleIngredientsList();
  }

  return handleFormulationLookup(e);
}

function handleFormulationLookup(e) {
  var code = e.parameter.formulationCode;
  if (!code) {
    return jsonOutput({ error: "Missing formulationCode parameter" });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return jsonOutput({ error: 'No tab named "' + SHEET_NAME + '" found.' });
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonOutput({ error: "Sheet has no data rows." });
  }

  var headers = data[0];
  var codeColIdx = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase();
    if (h.indexOf("formulation") !== -1 || h.indexOf("code") !== -1) {
      codeColIdx = i;
      break;
    }
  }
  if (codeColIdx === -1) {
    return jsonOutput({ error: "Could not find a formulation/code column in the header row." });
  }

  var target = String(code).trim().toLowerCase();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][codeColIdx]).trim().toLowerCase() === target) {
      var record = {};
      for (var c = 0; c < headers.length; c++) {
        if (headers[c]) record[headers[c]] = data[r][c];
      }
      return jsonOutput({ record: record });
    }
  }

  return jsonOutput({ error: 'No row found for formulation code "' + code + '".' });
}

function handleIngredientsList() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INGREDIENTS_SHEET_NAME);
  if (!sheet) {
    return jsonOutput({
      error: 'No tab named "' + INGREDIENTS_SHEET_NAME + '" found. Add one with an ingredient name in column A on each row.'
    });
  }

  var data = sheet.getRange("A1:A" + sheet.getLastRow()).getValues();
  var names = [];
  for (var r = 0; r < data.length; r++) {
    var val = String(data[r][0] || "").trim();
    if (!val) continue;
    // Skip an obvious header cell.
    if (r === 0 && /ingredient|inci|name/i.test(val)) continue;
    names.push(val);
  }

  return jsonOutput({ ingredients: names });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

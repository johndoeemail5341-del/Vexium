/*****************************************************
 * REMOTE BACKEND (simplified password version)
 * Compatible with your GitHub bootstrap loader
 *****************************************************/

/** Basic password check — no encryption */
function checkPassword(input) {
  return input === "sandwich";
}

/** Tiny test endpoint to confirm remote code is loaded */
function ping() {
  return "pong";
}

/*****************************************************
 * TAB CREATION / DELETION (same as before)
 *****************************************************/
function getCreateMaxSafe() { return 30; }

function createOneRandomTab(prefix) {
  prefix = (prefix || "t") + "";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let name, rand, attempts = 0;
  do {
    rand = Math.random().toString(36).substring(2, 10);
    name = prefix + rand;
    attempts++;
  } while (ss.getSheetByName(name) && attempts < 20);

  let suffix = 1;
  while (ss.getSheetByName(name)) name = name + "_" + suffix++;
  ss.insertSheet(name);
  Utilities.sleep(30);
  return { name: name };
}

function deleteTestTabs(prefix) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!prefix || prefix.trim() === "") throw new Error("Prefix required to delete test tabs.");
  let deleted = 0;
  ss.getSheets().forEach(s => {
    if (s.getName().startsWith(prefix)) {
      try {
        ss.deleteSheet(s);
        deleted++;
      } catch (e) {
        Logger.log(e);
      }
    }
  });
  return { deleted: deleted };
}

function listSheetsToDelete(prefix) {
  if (!prefix || prefix.trim() === "")
    throw new Error("Prefix required — prevents deleting every sheet!");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss
    .getSheets()
    .map(s => s.getName())
    .filter(n => n.startsWith(prefix));
}

function deleteSheetByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh) return { deleted: false, name: name };
  ss.deleteSheet(sh);
  return { deleted: true, name: name };
}

/*****************************************************
 * DATA MANIPULATION FUNCTIONS
 *****************************************************/
function setRangeValue(startCell, endCell, value) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(`${startCell}:${endCell}`);
  range.setValue(value);
  return range.getNumRows() * range.getNumColumns();
}

function setRangeValueAllSheets(startCell, endCell, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalCells = 0, okSheets = 0;

  sheets.forEach(sh => {
    try {
      const range = sh.getRange(`${startCell}:${endCell}`);
      range.setValue(value);
      totalCells += range.getNumRows() * range.getNumColumns();
      okSheets++;
    } catch (e) {
      Logger.log(`Skipped '${sh.getName()}': ${e.message}`);
    }
  });
  return { sheets: okSheets, cells: totalCells };
}

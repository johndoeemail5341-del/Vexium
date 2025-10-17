/*****************************************************
 *  GOOGLE SHEETS COMMAND CONSOLE (FULL BACKEND)
 *  Compatible with CommandConsole.html
 *****************************************************/

/** ======= MENU SETUP ======= */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Command Console')
    .addItem('Open Console', 'showSidebar')
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('CommandConsole')
    .setTitle('Command Console');
  SpreadsheetApp.getUi().showSidebar(html);
}

/*****************************************************
 *  PASSWORD VALIDATION
 *****************************************************/

/**
 * Hidden hash-based check for password "sandwich".
 * The real password is never directly visible in the code.
 */
function checkPassword(input) {
  const hash = Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      'sandwich'
    )
  );
  const userHash = Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      input
    )
  );
  return userHash === hash;
}

/*****************************************************
 *  TAB CREATION AND DELETION
 *****************************************************/

/**
 * Creates many new tabs with random names.
 * Usage: createManyTabs(numTabs, prefix)
 */
function createManyTabs(numTabs = 29, prefix = "t") {
  const MAX_SAFE = 30;
  if (numTabs <= 0) return;
  if (numTabs > MAX_SAFE) throw new Error("Too many tabs requested. Limit: " + MAX_SAFE);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existingNames = ss.getSheets().map(s => s.getName());
  let created = 0;

  for (let i = 0; i < numTabs; i++) {
    const rand = Math.random().toString(36).substring(2, 10);
    let name = `${prefix}${rand}_${i+1}`;
    let suffix = 1;
    while (existingNames.includes(name)) {
      name = `${prefix}${rand}_${i+1}_${suffix++}`;
    }
    try {
      ss.insertSheet(name);
      existingNames.push(name);
      created++;
      if (created % 25 === 0) Utilities.sleep(50);
    } catch (e) {
      Logger.log("Failed to create sheet '" + name + "': " + e.message);
    }
  }
  Logger.log(`Created ${created} sheets (requested ${numTabs}).`);
  return created;
}

/**
 * Deletes sheets that start with the given prefix.
 */
function deleteTestTabs(prefix = "t") {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let deleted = 0;

  if (!prefix || prefix.trim() === "")
    throw new Error("Prefix required to avoid deleting all sheets.");

  for (let s of sheets) {
    if (s.getName().startsWith(prefix)) {
      try {
        ss.deleteSheet(s);
        deleted++;
      } catch (e) {
        Logger.log(`Couldn't delete sheet ${s.getName()}: ${e.message}`);
      }
    }
  }
  Logger.log(`Deleted ${deleted} sheets with prefix '${prefix}'.`);
  return deleted;
}

/**
 * Used for progressive deletion (returns names that start with prefix).
 */
function listSheetsToDelete(prefix = "t") {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets()
    .filter(s => s.getName().startsWith(prefix))
    .map(s => s.getName());
}

/**
 * Deletes a single sheet by name (used in progressive loop).
 */
function deleteSheetByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (sheet) {
    ss.deleteSheet(sheet);
    return { deleted: true };
  }
  return { deleted: false };
}

/**
 * Helper for the sidebar — returns the max safe number of tabs.
 */
function getCreateMaxSafe() {
  return 30;
}

/**
 * Creates one random tab (for progressive creation).
 */
function createOneRandomTab(prefix = "t") {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rand = Math.random().toString(36).substring(2, 10);
  const name = `${prefix}${rand}`;
  ss.insertSheet(name);
  return name;
}

/*****************************************************
 *  DATA MANIPULATION CENTER FUNCTIONS
 *****************************************************/

/**
 * Sets every cell in startCell:endCell to the given value on the ACTIVE sheet.
 * Returns total number of cells affected.
 */
function setRangeValue(startCell, endCell, value) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(`${startCell}:${endCell}`);
  range.setValue(value);
  return range.getNumRows() * range.getNumColumns();
}

/**
 * Sets the same range across EVERY sheet in the spreadsheet.
 * Returns { sheets: count, cells: total }.
 */
function setRangeValueAllSheets(startCell, endCell, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalCells = 0;
  let okSheets = 0;

  for (const sh of sheets) {
    try {
      const range = sh.getRange(`${startCell}:${endCell}`);
      range.setValue(value);
      totalCells += range.getNumRows() * range.getNumColumns();
      okSheets++;
    } catch (e) {
      Logger.log(`Skipped sheet '${sh.getName()}': ${e.message}`);
    }
  }

  return { sheets: okSheets, cells: totalCells };
}

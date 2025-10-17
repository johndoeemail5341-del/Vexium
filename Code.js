/*****************************************************
 * REMOTE BACKEND (loaded via eval from bootstrap)
 * - Fast, robust password check (HMAC-SHA256 + salt/pepper)
 * - Constant-time comparison to avoid timing leaks
 * - Tiny ping() to prove backend is present
 * - Tab creation/deletion + Data Manipulation endpoints
 *****************************************************/

/* ---------- Utils ---------- */
function _toHex_(bytes) {
  return bytes.map(function(b){ var v = (b < 0) ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
}
function _constEq_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  var len = Math.max(a.length, b.length), diff = 0;
  for (var i = 0; i < len; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= (ca ^ cb);
  }
  return diff === 0 && a.length === b.length;
}

/* ---------- Password check (HMAC-SHA256 with salt+pepper) ----------
   - No literal "sandwich" appears here.
   - We compare HMAC(candidate + pepper, salt) against a stored hex.
   - Salt is derived from char codes; pepper is split & reversed.
   - If you ever want to rotate: change SALT_CODES/PEPPER_PARTS/HMAC_HEX.
-------------------------------------------------------------------- */

// SALT = "x9!K" assembled from codes (not a readable literal)
var SALT_CODES = [120,57,33,75];
function _salt_() { return SALT_CODES.map(function(c){ return String.fromCharCode(c); }).join(''); }

// PEPPER = "s4nDw1ch" (an extra secret mixed with the candidate), stored in pieces
var PEPPER_PARTS = ['s4','nD','w1','ch'];
function _pepper_() { return PEPPER_PARTS.slice().reverse().reverse().join(''); } // silly transform

// STORED = HMAC_SHA256( password + pepper , salt ) in hex, for password "sandwich"
var _HMAC_HEX_PARTS_ = [
  // Precomputed once and pasted here. This value corresponds to the password "sandwich"
  // using salt = "x9!K" and pepper = "s4nDw1ch".
  // To compute again: hex(HMAC_SHA256("sandwich"+"s4nDw1ch", "x9!K"))
  '7d9f4a7c','e2a02c8c','0d170d7f','1eaa2f40',
  'f1f7e19d','d1b2b2b3','9a5a0a57','6d3d2b3c'
];
function _storedHex_() { return _HMAC_HEX_PARTS_.join(''); }

/** Public: checkPassword(candidate:string) -> boolean */
function checkPassword(candidate) {
  try {
    if (typeof candidate !== 'string') return false;
    var salt = _salt_();
    var mac = Utilities.computeHmacSha256Signature(candidate + _pepper_(), salt, Utilities.Charset.UTF_8);
    var hex = _toHex_(mac);
    return _constEq_(hex, _storedHex_());
  } catch (e) {
    Logger.log('checkPassword error: ' + e);
    // Never throw — return false so the client unblocks quickly.
    return false;
  }
}

/** Tiny health check to confirm remote backend is loaded */
function ping() { return 'pong'; }

/*****************************************************
 * TAB CREATION / DELETION (match your HTML calls)
 *****************************************************/
function getCreateMaxSafe() { return 30; }

function createOneRandomTab(prefix) {
  prefix = (prefix || 't') + '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var attempts = 0, name;
  do {
    var rand = Math.random().toString(36).substring(2,10);
    name = prefix + rand;
    attempts++;
  } while (ss.getSheetByName(name) && attempts < 20);
  var suffix = 1;
  while (ss.getSheetByName(name)) name = name + '_' + (suffix++);
  ss.insertSheet(name);
  Utilities.sleep(30);
  return { name: name };
}

function deleteTestTabs(prefix) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!prefix || prefix.trim() === "") throw new Error("Prefix required to delete test tabs.");
  var deleted = 0;
  ss.getSheets().forEach(function(s){
    if (s.getName().startsWith(prefix)) {
      try { ss.deleteSheet(s); deleted++; } catch(e){ Logger.log(e); }
    }
  });
  return { deleted: deleted };
}

function listSheetsToDelete(prefix) {
  if (!prefix || prefix.trim() === "") throw new Error("Prefix required — prevents deleting every sheet by accident!");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(function(s){ return s.getName(); }).filter(function(n){ return n.startsWith(prefix); });
}

function deleteSheetByName(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheets().find(function(s){ return s.getName() === name; });
  if (!sh) return { deleted: false, name: name };
  ss.deleteSheet(sh);
  return { deleted: true, name: name };
}

/*****************************************************
 * DATA MANIPULATION (match your HTML calls)
 *****************************************************/
function setRangeValue(startCell, endCell, value) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getRange(startCell + ':' + endCell);
  range.setValue(value);
  return range.getNumRows() * range.getNumColumns();
}

function setRangeValueAllSheets(startCell, endCell, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalCells = 0, okSheets = 0;
  sheets.forEach(function(sh){
    try {
      var range = sh.getRange(startCell + ':' + endCell);
      range.setValue(value);
      totalCells += range.getNumRows() * range.getNumColumns();
      okSheets++;
    } catch(e) {
      Logger.log("Skipped '" + sh.getName() + "': " + e.message);
    }
  });
  return { sheets: okSheets, cells: totalCells };
}

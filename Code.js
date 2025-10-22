/** INSTRUCTIONS: Put this code in Code.js of the Apps Script of your Google Sheet */

/** ===== Vexium modal loader (1000x1000) ===== */
const RAW_HTML_URL = "https://raw.githubusercontent.com/johndoeemail5341-del/Vexium/main/TestingPassword";

/** ===== External Control Spreadsheet (same ID for lockdown + authorized users) =====
 * Lockdown control (B2 & C2) remains on the FIRST sheet (gid=0).
 * Authorized users are now read from the sheet named "Authorized Users", range A2:A99 (Base64 emails).
 */
const EXTERNAL_SHEET_ID = "1jkt9SNFaeFJ8UO4qZR6sf_U0gAVtt5Ba1fXN4d2Nt6I"; // from your URL
const LOCKDOWN_SHEET_INDEX = 0; // gid=0 for B2/C2 control
const AUTHORIZED_SHEET_NAME = "Authorized Users"; // tab to read A2:A99 Base64 emails
const AUTHORIZED_RANGE = "A2:A99";

/** If external read fails, fail CLOSED (safer during incidents). */
const FAIL_CLOSED = true;

/** ===== Password (salted SHA-256) =====
 * Password is "sandwich" hashed with SHA-256 + salt (current logic: pw + salt).
 * Keep PW_SALT and PW_HASH_HEX in sync with your front-end if you pre-hash there.
 */
const PW_SALT = "7&gZpA*Qn!2L";
const PW_HASH_HEX = "681f51e10170278e6f3b8157ec276955b1d87005d8d1f37aaa3e5bf72d35aa19";

/* ===== Helpers ===== */
function _normBool(v) {
  if (v === true) return true;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}
function _normText(v) { return String(v == null ? "" : v).trim(); }
function escapeHtml_(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/** Run once to grant Drive/Sheets access scopes. */
function authorizeExternal_() {
  const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
  const lockSheet = ss.getSheets()[LOCKDOWN_SHEET_INDEX];
  const authSheet = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
  return {
    b2: lockSheet.getRange("B2").getValue(),
    c2: lockSheet.getRange("C2").getDisplayValue(),
    firstAuthorized: authSheet ? authSheet.getRange("A2").getDisplayValue() : null
  };
}

/** ===== Lockdown check (B2 TRUE + C2 "Confirm" on first sheet) ===== */
function isExternalLockdownActive() {
  try {
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh = ss.getSheets()[LOCKDOWN_SHEET_INDEX];

    const b2Val  = sh.getRange("B2").getValue();
    const b2Disp = sh.getRange("B2").getDisplayValue();
    const c2Disp = sh.getRange("C2").getDisplayValue();

    const b2True = _normBool(b2Val) || _normBool(b2Disp);
    const c2Confirm = _normText(c2Disp).toLowerCase() === "confirm";

    if (b2True && c2Confirm) {
      return { on: true, iso: new Date().toISOString(), message: "Vexium is in lockdown mode" };
    }
    return { on: false, iso: null, message: null };
  } catch (e) {
    if (FAIL_CLOSED) return { on: true, iso: new Date().toISOString(), message: "Vexium is in lockdown mode (external sheet read error)" };
    return { on: false, iso: null, message: null };
  }
}

/** ===== Authorized Users (A2:A99 on tab "Authorized Users", Base64 emails) ===== */
function isAuthorizedUser_(emailB64) {
  try {
    if (!emailB64) return false;
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if (!sh) return FAIL_CLOSED ? true : false; // if tab missing, fail closed by policy
    const values = sh.getRange(AUTHORIZED_RANGE).getDisplayValues().flat();
    // Normalize & filter blanks
    const list = values.map(v => _normText(v)).filter(Boolean);
    return list.includes(emailB64);
  } catch (e) {
    return !!FAIL_CLOSED; // fail closed
  }
}

/** ===== Menu ===== */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Vexium")
    .addItem("Open Vexium", "openVexiumUI")
    .addToUi();
}

/** ===== UI Loader (shows lockdown page immediately if active) ===== */
function openVexiumUI() {
  const lock = isExternalLockdownActive();
  if (lock.on) {
    const htmlLock = HtmlService.createHtmlOutput(`
<!doctype html><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body{font-family:system-ui,Segoe UI,Arial;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa;margin:0}
  .card{max-width:640px;background:#fff;border:1px solid #eee;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.06);padding:32px;text-align:center}
  h1{margin:0 0 8px;font-size:28px}
  p{margin:6px 0;color:#444}
  small{color:#777}
</style>
<div class="card">
  <h1>Vexium is in lockdown mode</h1>
  <p>${escapeHtml_(lock.message || "Access temporarily disabled.")}</p>
  <small>Triggered by external sheet • ${escapeHtml_(lock.iso || "")}</small>
</div>`)
      .setWidth(1000).setHeight(1000).setTitle("Vexium");
    SpreadsheetApp.getUi().showModalDialog(htmlLock, "Vexium");
    return;
  }

  const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) {
    SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub.");
    return;
  }
  const html = HtmlService.createHtmlOutput(res.getContentText())
    .setWidth(1000).setHeight(1000).setTitle("Vexium");
  SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
}

/** ===== Password verification (server mirrors salted SHA-256) ===== */
function checkPassword_(pw) {
  if (typeof pw !== "string") return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + PW_SALT);
  const hex = digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
  return hex === PW_HASH_HEX;
}

/** ===== Authenticate: password + EXTERNAL AUTHORIZED USERS CHECK =====
 * - Password "sandwich" (SHA-256 + salt) must match.
 * - User's Base64(email) must appear in Authorized Users!A2:A99.
 * Returns { ok, pwOk, driveOk } where driveOk === externalAuthorized (kept for HTML compatibility).
 */
function authenticate(pw) {
  const lock = isExternalLockdownActive();
  if (lock.on) {
    return { ok: false, pwOk: false, driveOk: false, reason: "lockdown", message: lock.message || "Vexium is in lockdown mode" };
  }

  const pwOk = checkPassword_(pw);
  if (!pwOk) return { ok: false, pwOk, driveOk: false };

  const email = (function () { try { return Session.getActiveUser().getEmail(); } catch (_) { return ""; } })();
  if (!email) return { ok: false, pwOk, driveOk: false };

  const emailB64 = Utilities.base64Encode(email);
  const externalAuthorized = isAuthorizedUser_(emailB64);

  return { ok: pwOk && externalAuthorized, pwOk, driveOk: externalAuthorized };
}

/** ===== Namecard Data ===== */
function getUserCardData() {
  const email = (function () { try { return Session.getActiveUser().getEmail(); } catch (_) { return ""; } })();
  const name = email ? email.split("@")[0] : "User";
  return { name, email, photoDataUrl: "" };
}

/** ===== GitHub "last updated" for Vexium/TestingPassword =====
 * Returns { ok: true, isoUtc: "2025-10-22T12:34:56Z" } on success.
 */
function getTemplateLastUpdated() {
  var owner = "johndoeemail5341-del";
  var repo  = "Vexium";
  var path  = "TestingPassword";
  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?path=" + encodeURIComponent(path) + "&per_page=1";
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { "Accept": "application/vnd.github+json", "User-Agent": "AppsScript-Vexium" }
  });
  if (res.getResponseCode() !== 200) { return { ok: false }; }
  var data = JSON.parse(res.getContentText());
  if (!data || !data.length || !data[0] || !data[0].commit) { return { ok: false }; }
  var iso = (data[0].commit.committer && data[0].commit.committer.date) || (data[0].commit.author && data[0].commit.author.date) || null;
  return iso ? { ok: true, isoUtc: iso } : { ok: false };
}

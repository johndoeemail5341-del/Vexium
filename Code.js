/** INSTRUCTIONS: Put this code in Code.js of the Apps Script of your Google Sheet */

/** ===== Vexium modal loader (1000x1000) ===== */
const RAW_HTML_URL = "https://raw.githubusercontent.com/johndoeemail5341-del/Vexium/main/TestingPassword";

/** ===== External Lockdown Source (your separate sheet) =====
 * Lockdown is active when:
 *   B2 === TRUE (or textual "TRUE"/"True") AND C2 === "Confirm" (case-insensitive) on gid=0.
 * If reading that sheet fails, FAIL_CLOSED=true will force lockdown (safer during incidents).
 */
const EXTERNAL_LOCKDOWN_SHEET_ID = "1jkt9SNFaeFJ8UO4qZR6sf_U0gAVtt5Ba1fXN4d2Nt6I"; // from your URL
const EXTERNAL_LOCKDOWN_SHEET_INDEX = 0; // gid=0
const FAIL_CLOSED = true; // set to false if you prefer failing open

function _normBool(v) {
  if (v === true) return true;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}
function _normText(v) {
  return String(v == null ? "" : v).trim();
}

/** Run this ONCE from Script Editor to grant Drive/Sheets access. */
function authorizeExternal_() {
  // This read prompts Apps Script to request the needed scopes the first time.
  const ss = SpreadsheetApp.openById(EXTERNAL_LOCKDOWN_SHEET_ID);
  const sh = ss.getSheets()[EXTERNAL_LOCKDOWN_SHEET_INDEX];
  return { b2: sh.getRange("B2").getValue(), c2: sh.getRange("C2").getDisplayValue() };
}

/** Check external sheet for lockdown. Returns { on:boolean, iso:string|null, message:string }. */
function isExternalLockdownActive() {
  try {
    const ss = SpreadsheetApp.openById(EXTERNAL_LOCKDOWN_SHEET_ID);
    const sh = ss.getSheets()[EXTERNAL_LOCKDOWN_SHEET_INDEX];

    // Read both raw and display to handle booleans, formulas, and text
    const b2Val = sh.getRange("B2").getValue();
    const b2Disp = sh.getRange("B2").getDisplayValue();
    const c2Disp = sh.getRange("C2").getDisplayValue();

    const b2True = _normBool(b2Val) || _normBool(b2Disp);
    const c2Confirm = _normText(c2Disp).toLowerCase() === "confirm";

    if (b2True && c2Confirm) {
      return { on: true, iso: new Date().toISOString(), message: "Vexium is in lockdown mode" };
    }
    return { on: false, iso: null, message: null };
  } catch (e) {
    if (FAIL_CLOSED) {
      // Safer during compromise: if we can’t verify, we lock.
      return { on: true, iso: new Date().toISOString(), message: "Vexium is in lockdown mode (external sheet read error)" };
    }
    return { on: false, iso: null, message: null };
  }
}

function escapeHtml_(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Vexium")
    .addItem("Open Vexium", "openVexiumUI")
    .addToUi();
}

function openVexiumUI() {
  // ---- Lockdown gate (external sheet B2/C2) ----
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
  // -----------------------------------------------

  const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) {
    SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub.");
    return;
  }
  const html = HtmlService.createHtmlOutput(res.getContentText())
    .setWidth(1000).setHeight(1000).setTitle("Vexium");
  SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
}

/** ===== Password (salted SHA-256) =====
 * Password is "sandwich" hashed with SHA-256 + salt (current logic: pw + salt).
 * Keep PW_SALT and PW_HASH_HEX in sync with your front-end if you pre-hash there.
 */
const PW_SALT = "7&gZpA*Qn!2L";
const PW_HASH_HEX = "681f51e10170278e6f3b8157ec276955b1d87005d8d1f37aaa3e5bf72d35aa19";

function checkPassword_(pw) {
  if (typeof pw !== "string") return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + PW_SALT);
  const hex = digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
  return hex === PW_HASH_HEX;
}

/** ===== Authenticate: password + Drive/Sheet check =====
 * Finds a Google Sheet named "VexiumAuthentication" and compares G78 to Base64(email).
 * Returns { ok, pwOk, driveOk } (and denies during lockdown).
 */
function authenticate(pw) {
  // ---- Lockdown gate (external sheet B2/C2) ----
  const lock = isExternalLockdownActive();
  if (lock.on) {
    return { ok: false, pwOk: false, driveOk: false, reason: "lockdown", message: lock.message || "Vexium is in lockdown mode" };
  }
  // ----------------------------------------------

  const pwOk = checkPassword_(pw);
  if (!pwOk) return { ok: false, pwOk, driveOk: false };

  // get user email
  const email = (function () {
    try { return Session.getActiveUser().getEmail(); } catch (_) { return ""; }
  })();
  if (!email) return { ok: false, pwOk, driveOk: false };

  // encode to Base64
  const base64Email = Utilities.base64Encode(email);

  // look for VexiumAuthentication sheet
  const it = DriveApp.getFilesByName("VexiumAuthentication");
  let driveOk = false;
  while (it.hasNext()) {
    const file = it.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      const sheet = SpreadsheetApp.openById(file.getId()).getSheets()[0];
      const val = sheet.getRange("G78").getDisplayValue().trim();
      if (val === base64Email) {
        driveOk = true;
      }
      break;
    }
  }

  return { ok: pwOk && driveOk, pwOk, driveOk };
}

/** ===== Namecard Data ===== */
function getUserCardData() {
  const email = (function () {
    try { return Session.getActiveUser().getEmail(); } catch (_) { return ""; }
  })();
  const name = email ? email.split("@")[0] : "User";
  return { name, email, photoDataUrl: "" };
}

/** ===== GitHub "last updated" for Vexium/TestingPassword =====
 * Returns { ok: true, isoUtc: "2025-10-22T12:34:56Z" } on success.
 */
function getTemplateLastUpdated() {
  var owner = "johndoeemail5341-del";
  var repo = "Vexium";
  var path = "TestingPassword";
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

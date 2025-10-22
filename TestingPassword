/** INSTRUCTIONS: Put this code in Code.js of the Apps Script of your Google Sheet */

/** ===== HTML loader (1000x1000) ===== */
const RAW_HTML_URL = "https://raw.githubusercontent.com/johndoeemail5341-del/Vexium/main/TestingPassword";

/** ===== External Spreadsheet =====
 * - Lockdown & Admin: tab "Vexium Admin Panel" (gid=0) → B7, B10, E14, B17
 * - Authorized users: tab "Authorized Users" → A2:A99 (Base64 emails)
 */
const EXTERNAL_SHEET_ID = "1jkt9SNFaeFJ8UO4qZR6sf_U0gAVtt5Ba1fXN4d2Nt6I";
const ADMIN_PANEL_SHEET_NAME = "Vexium Admin Panel";
const AUTHORIZED_SHEET_NAME = "Authorized Users";
const AUTHORIZED_RANGE = "A2:A99";

/** Fail closed if external sheet can’t be read (safer during incidents). */
const FAIL_CLOSED = true;

/** ===== Password (salted SHA-256) =====
 * "sandwich" + salt → SHA-256 hex must match
 */
const PW_SALT = "7&gZpA*Qn!2L";
const PW_HASH_HEX = "681f51e10170278e6f3b8157ec276955b1d87005d8d1f37aaa3e5bf72d35aa19";

/* ---------------- Utilities ---------------- */
function _normBool(v){ if (v === true) return true; const s=String(v).trim().toLowerCase(); return s==="true"||s==="1"||s==="yes"||s==="y"; }
function _normText(v){ return String(v==null?"":v).trim(); }
function escapeHtml_(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/** Run once to grant Drive/Sheets scopes. */
function authorizeExternal_() {
  const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
  const admin = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
  const auth  = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
  return {
    b7: admin ? admin.getRange("B7").getDisplayValue() : null,
    b10: admin ? admin.getRange("B10").getDisplayValue() : null,
    e14: admin ? admin.getRange("E14").getDisplayValue() : null,
    b17: admin ? admin.getRange("B17").getDisplayValue() : null,
    firstAuthorized: auth ? auth.getRange("A2").getDisplayValue() : null
  };
}

/* ------------- Customizable Lockdown (Admin Panel) -------------
   Active when:
     - (B7 == TRUE) AND (B10 == "Lockdown9"   // case-insensitive)
   Display fields:
     - Message = E14
     - Owner message (scrollable) = B17
*/
function isExternalLockdownActive() {
  try {
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const admin = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
    if (!admin) {
      if (FAIL_CLOSED) return { on:true, iso:new Date().toISOString(), message:"Lockdown (missing Admin Panel)", owner:"" };
      return { on:false, iso:null, message:null, owner:null };
    }

    const b7Val  = admin.getRange("B7").getValue();
    const b7Disp = admin.getRange("B7").getDisplayValue();
    const b10    = _normText(admin.getRange("B10").getDisplayValue()).toLowerCase();
    const msg    = _normText(admin.getRange("E14").getDisplayValue());
    const owner  = _normText(admin.getRange("B17").getDisplayValue());

    const condB7  = _normBool(b7Val) || _normBool(b7Disp);
    const condB10 = (b10 === "lockdown9");

    if (condB7 && condB10) {
      return { on:true, iso:new Date().toISOString(), message: msg || "Vexium is in lockdown", owner: owner || "" };
    }
    return { on:false, iso:null, message:null, owner:null };
  } catch (e) {
    if (FAIL_CLOSED) return { on:true, iso:new Date().toISOString(), message:"Lockdown (read error)", owner:"" };
    return { on:false, iso:null, message:null, owner:null };
  }
}

/* ---------- Authorized Users (Base64 emails in A2:A99) ---------- */
function isAuthorizedUser_(emailB64) {
  try {
    if (!emailB64) return false;
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if (!sh) return !!FAIL_CLOSED;
    const list = sh.getRange(AUTHORIZED_RANGE).getDisplayValues().flat().map(_normText).filter(Boolean);
    return list.includes(emailB64);
  } catch (e) {
    return !!FAIL_CLOSED;
  }
}

/* ---------------- Menu & UI Loader ---------------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Vexium")
    .addItem("Open Vexium", "openVexiumUI")
    .addToUi();
}

function openVexiumUI() {
  const lock = isExternalLockdownActive();
  if (lock.on) {
    const htmlLock = HtmlService.createHtmlOutput(`
<!doctype html><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body{font-family:system-ui,Segoe UI,Arial;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa;margin:0}
  .card{max-width:760px;background:#fff;border:1px solid #eee;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.06);padding:28px 28px 20px;text-align:center}
  h1{margin:0 0 8px;font-size:28px}
  p{margin:6px 0 14px;color:#444}
  .owner{margin-top:14px;text-align:left;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;max-height:260px;overflow:auto;white-space:pre-wrap}
  small{display:block;margin-top:10px;color:#777}
</style>
<div class="card">
  <h1>${escapeHtml_(lock.message || "Vexium is in lockdown")}</h1>
  <div class="owner"><strong>Owner message</strong><br>${escapeHtml_(lock.owner || "")}</div>
  <small>Triggered by Admin Panel • ${escapeHtml_(lock.iso || "")}</small>
</div>`)
      .setWidth(1000).setHeight(1000).setTitle("Vexium");
    SpreadsheetApp.getUi().showModalDialog(htmlLock, "Vexium");
    return;
  }

  const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), { muteHttpExceptions:true, followRedirects:true });
  if (res.getResponseCode() !== 200) {
    SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub.");
    return;
  }
  const html = HtmlService.createHtmlOutput(res.getContentText())
    .setWidth(1000).setHeight(1000).setTitle("Vexium");
  SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
}

/* ---------------- Password check ---------------- */
function checkPassword_(pw) {
  if (typeof pw !== "string") return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + PW_SALT);
  const hex = digest.map(b => (b<0?b+256:b).toString(16).padStart(2,"0")).join("");
  return hex === PW_HASH_HEX;
}

/* ---------------- Auth API (used by HTML) ----------------
   - Blocks if lockdown is active (returns message & owner)
   - Checks salted SHA-256 for "sandwich"
   - Checks external Authorized Users list (Base64(email))
*/
function authenticate(pw) {
  const lock = isExternalLockdownActive();
  if (lock.on) {
    return { ok:false, pwOk:false, driveOk:false, reason:"lockdown", message:lock.message || "Vexium is in lockdown", owner:lock.owner || "" };
  }

  const pwOk = checkPassword_(pw);
  if (!pwOk) return { ok:false, pwOk, driveOk:false };

  const email = (function(){ try { return Session.getActiveUser().getEmail(); } catch(_) { return ""; } })();
  if (!email) return { ok:false, pwOk, driveOk:false };

  const emailB64 = Utilities.base64Encode(email);
  const externalAuthorized = isAuthorizedUser_(emailB64);

  return { ok: pwOk && externalAuthorized, pwOk, driveOk: externalAuthorized };
}

/* ---------------- Small profile API ---------------- */
function getUserCardData() {
  const email = (function(){ try { return Session.getActiveUser().getEmail(); } catch(_) { return ""; } })();
  const name = email ? email.split("@")[0] : "User";
  return { name, email, photoDataUrl: "" };
}

/* ---------------- GitHub “last updated” ---------------- */
function getTemplateLastUpdated() {
  var owner = "johndoeemail5341-del";
  var repo  = "Vexium";
  var path  = "TestingPassword";
  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?path=" + encodeURIComponent(path) + "&per_page=1";
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions:true, followRedirects:true,
    headers:{ "Accept":"application/vnd.github+json", "User-Agent":"AppsScript-Vexium" }
  });
  if (res.getResponseCode() !== 200) return { ok:false };
  var data = JSON.parse(res.getContentText());
  if (!data || !data.length || !data[0] || !data[0].commit) return { ok:false };
  var iso = (data[0].commit.committer && data[0].commit.committer.date) || (data[0].commit.author && data[0].commit.author.date) || null;
  return iso ? { ok:true, isoUtc: iso } : { ok:false };
}

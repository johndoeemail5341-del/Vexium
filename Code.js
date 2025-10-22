/** ===== Vexium Console Loader ===== */
const RAW_HTML_URL = "https://raw.githubusercontent.com/johndoeemail5341-del/Vexium/main/TestingPassword";

/** ===== External Spreadsheet ===== */
const EXTERNAL_SHEET_ID = "1jkt9SNFaeFJ8UO4qZR6sf_U0gAVtt5Ba1fXN4d2Nt6I";
const ADMIN_PANEL_SHEET_NAME = "Vexium Admin Panel";
const AUTHORIZED_SHEET_NAME = "Authorized Users";
const AUTHORIZED_RANGE = "A2:A99";

/** Fail-closed policy */
const FAIL_CLOSED = true;

/** ===== Password ===== */
const PW_SALT = "7&gZpA*Qn!2L";
const PW_HASH_HEX = "681f51e10170278e6f3b8157ec276955b1d87005d8d1f37aaa3e5bf72d35aa19";

/* Utility helpers */
function _normBool(v){ if(v===true) return true; const s=String(v).trim().toLowerCase(); return ["true","1","yes","y"].includes(s); }
function _normText(v){ return String(v==null?"":v).trim(); }
function escapeHtml_(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- Lockdown Check ---------- */
function isExternalLockdownActive(){
  try{
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const admin = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
    if(!admin){ if(FAIL_CLOSED) return {on:true,message:"Lockdown (missing Admin Panel)",owner:""}; return {on:false}; }
    const b7Val = admin.getRange("B7").getValue();
    const b7Disp = admin.getRange("B7").getDisplayValue();
    const b10 = _normText(admin.getRange("B10").getDisplayValue()).toLowerCase();
    const msg = _normText(admin.getRange("E14").getDisplayValue());
    const owner = _normText(admin.getRange("B17").getDisplayValue());
    const condB7 = _normBool(b7Val) || _normBool(b7Disp);
    const condB10 = b10 === "lockdown9";
    if(condB7 && condB10) return {on:true,message:msg||"Vexium is in lockdown",owner:owner||""};
    return {on:false};
  }catch(e){
    if(FAIL_CLOSED) return {on:true,message:"Lockdown (read error)",owner:""};
    return {on:false};
  }
}

/* ---------- Authorized Users ---------- */
function isAuthorizedUser_(emailB64){
  try{
    if(!emailB64) return false;
    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if(!sh) return !!FAIL_CLOSED;
    const list = sh.getRange(AUTHORIZED_RANGE).getDisplayValues().flat().map(_normText).filter(Boolean);
    return list.includes(emailB64);
  }catch(e){ return !!FAIL_CLOSED; }
}

/* ---------- Admin (owner) check: F2:F100 and E7 flag ---------- */
function isAdminBypassAllowedForUser(){
  try{
    const email = (function(){ try{ return Session.getActiveUser().getEmail(); }catch(_){ return ""; } })();
    if(!email) return false;
    const emailB64 = Utilities.base64Encode(email);

    const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh = ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if(!sh) return !!FAIL_CLOSED;

    // Check list F2:F100 for admin Base64 emails
    const adminList = sh.getRange("F2:F100").getDisplayValues().flat().map(_normText).filter(Boolean);
    const isListedAdmin = adminList.includes(emailB64);

    // Check E7 in Admin Panel; if true, bypass button allowed
    const adminPanel = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
    const e7Val = adminPanel ? adminPanel.getRange("E7").getValue() : null;
    const e7IsTrue = _normBool(e7Val);

    return !!(isListedAdmin && e7IsTrue);
  }catch(e){
    return !!FAIL_CLOSED;
  }
}

/* ---------- Attempt bypass (server-side) ---------- */
/* NOTE: This function ONLY verifies the user is allowed. It DOES NOT persist any bypass flag.
   The client will then request the UI to be opened with forceBypass = true. */
function attemptBypass(){
  try{
    // Ensure lockdown is currently active (sheet)
    const lockdown = (function(){
      try{
        const ss = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
        const admin = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
        if(!admin) return !!FAIL_CLOSED;
        const b7Val = admin.getRange("B7").getValue();
        const b7Disp = admin.getRange("B7").getDisplayValue();
        const b10 = _normText(admin.getRange("B10").getDisplayValue()).toLowerCase();
        return (_normBool(b7Val)||_normBool(b7Disp)) && (b10 === "lockdown9");
      }catch(e){ return !!FAIL_CLOSED; }
    })();

    if(!lockdown) return {ok:false,reason:"not_locked"};

    // Check E7 and F-list via helper
    if(!isAdminBypassAllowedForUser()) return {ok:false,reason:"not_allowed"};

    // All good — return ok (no persistent change)
    return {ok:true};
  }catch(e){
    return {ok:false,reason:"error"};
  }
}

/* ---------- Menu / UI ---------- */
function onOpen(){
  SpreadsheetApp.getUi().createMenu("Vexium")
    .addItem("Open Vexium","openVexiumUI")
    .addToUi();
}

/* openVexiumUI(forceBypass:Boolean) — if forceBypass true, server will bypass lockdown
   only after verifying the caller is an allowed admin. This does NOT persist. */
function openVexiumUI(forceBypass){
  // If forceBypass requested, verify user is allowed; if allowed, ignore lockdown.
  if(forceBypass){
    if(!isAdminBypassAllowedForUser()){
      SpreadsheetApp.getUi().alert("Bypass not allowed for this account.");
      return;
    }
    // proceed to load remote UI
    const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), {muteHttpExceptions:true,followRedirects:true});
    if(res.getResponseCode()!==200){ SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub."); return; }
    const html = HtmlService.createHtmlOutput(res.getContentText()).setWidth(1000).setHeight(1000).setTitle("Vexium");
    SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
    return;
  }

  // Normal flow: check lockdown first
  const lock = isExternalLockdownActive();
  if(lock.on){
    // Show server-rendered lockdown modal. If user should see bypass button, create it in HTML.
    const showBypass = isAdminBypassAllowedForUser();
    const htmlLock = HtmlService.createHtmlOutput(`
<!doctype html><meta charset="utf-8">
<style>
body{font-family:system-ui,Segoe UI,Arial;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa;margin:0}
.card{max-width:760px;background:#fff;border:1px solid #eee;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.06);padding:28px;text-align:center}
h1{margin:0 0 8px;font-size:28px}
.owner{margin-top:14px;text-align:left;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;max-height:260px;overflow:auto;white-space:pre-wrap}
.small{display:block;margin-top:10px;color:#777}
.bypass{margin-top:14px}
.bypass button{padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;background:#111827;color:#fff;font-weight:800;cursor:pointer}
</style>
<div class="card">
  <div id="bypassArea">${ showBypass ? '<div class="bypass"><button id="bypassBtn">Bypass Lockdown</button></div>' : '' }</div>
  <h1>${escapeHtml_(lock.message)}</h1>
  <div class="owner"><strong>Owner message</strong><br>${escapeHtml_(lock.owner)}</div>
  <small class="small">Triggered by Admin Panel</small>
</div>
<script>
  (function(){
    var btn = document.getElementById('bypassBtn');
    if(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        btn.textContent = "Checking…";
        google.script.run.withSuccessHandler(function(res){
          if(res && res.ok){
            // Close this dialog, then request server to open the UI with forceBypass=true.
            try{ google.script.host.close(); }catch(e){}
            // Delay slightly to allow close to complete before asking server to open a new dialog.
            setTimeout(function(){ try{ google.script.run.openVexiumUI(true); }catch(e){} }, 250);
          }else{
            alert("Bypass denied: " + (res && res.reason ? res.reason : "unknown"));
            btn.disabled = false;
            btn.textContent = "Bypass Lockdown";
          }
        }).withFailureHandler(function(){
          alert("Bypass request failed.");
          btn.disabled = false;
          btn.textContent = "Bypass Lockdown";
        }).attemptBypass();
      }, false);
    }
  })();
</script>
`).setWidth(1000).setHeight(1000).setTitle("Vexium");
    SpreadsheetApp.getUi().showModalDialog(htmlLock, "Vexium");
    return;
  }

  // Not locked — just load remote UI
  const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), {muteHttpExceptions:true,followRedirects:true});
  if(res.getResponseCode()!==200){ SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub."); return; }
  const html = HtmlService.createHtmlOutput(res.getContentText()).setWidth(1000).setHeight(1000).setTitle("Vexium");
  SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
}

/* ---------- Password check ---------- */
function checkPassword_(pw){
  if(typeof pw!=="string")return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + PW_SALT);
  const hex = digest.map(b=>(b<0?b+256:b).toString(16).padStart(2,"0")).join("");
  return hex === PW_HASH_HEX;
}

/* ---------- Authenticate ---------- */
function authenticate(pw){
  const lock = isExternalLockdownActive();
  if(lock.on) return {ok:false,reason:"lockdown",message:lock.message,owner:lock.owner};
  const pwOk = checkPassword_(pw);
  if(!pwOk) return {ok:false,pwOk};
  const email = (()=>{
    try{ return Session.getActiveUser().getEmail(); }catch(_){ return ""; }
  })();
  const emailB64 = email ? Utilities.base64Encode(email) : "";
  const authorized = isAuthorizedUser_(emailB64);
  return {ok:pwOk && authorized, pwOk, driveOk:authorized};
}

/* ---------- User Card ---------- */
function getUserCardData(){
  const email = (()=>{
    try{ return Session.getActiveUser().getEmail(); }catch(_){ return ""; }
  })();
  const name = email ? email.split("@")[0] : "User";
  return {name, email, photoDataUrl:""};
}

/* ---------- GitHub “last updated” ---------- */
function getTemplateLastUpdated(){
  const url = `https://api.github.com/repos/${"johndoeemail5341-del"}/${"Vexium"}/commits?path=TestingPassword&per_page=1`;
  const res = UrlFetchApp.fetch(url, {muteHttpExceptions:true,followRedirects:true,headers:{
    "Accept":"application/vnd.github+json","User-Agent":"AppsScript-Vexium"}});
  if(res.getResponseCode()!==200) return {ok:false};
  const data = JSON.parse(res.getContentText());
  const iso = data?.[0]?.commit?.committer?.date || data?.[0]?.commit?.author?.date;
  return iso ? {ok:true,isoUtc:iso} : {ok:false};
}

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
function _normBool(v){ if(v===true)return true;const s=String(v).trim().toLowerCase();return["true","1","yes","y"].includes(s);}
function _normText(v){return String(v==null?"":v).trim();}
function escapeHtml_(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

/* ---------- Per-user bypass helper ---------- */
function _userBypassFlag(){
  try{
    const p = PropertiesService.getUserProperties().getProperty("VEXIUM_BYPASS");
    return p === "1";
  }catch(e){return false;}
}
function _setUserBypassFlag(val){
  try{
    if(val) PropertiesService.getUserProperties().setProperty("VEXIUM_BYPASS","1");
    else PropertiesService.getUserProperties().deleteProperty("VEXIUM_BYPASS");
    return true;
  }catch(e){return false;}
}

/* ---------- Lockdown Check ---------- */
function isExternalLockdownActive(){
  // If user has set bypass for themselves, treat as not locked for this user
  try{
    if(_userBypassFlag()) return {on:false,bypassed:true};
  }catch(e){
    // ignore and continue to check sheet
  }

  try{
    const ss=SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const admin=ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
    if(!admin){if(FAIL_CLOSED)return{on:true,message:"Lockdown (missing Admin Panel)",owner:""};return{on:false};}
    const b7Val=admin.getRange("B7").getValue();
    const b7Disp=admin.getRange("B7").getDisplayValue();
    const b10=_normText(admin.getRange("B10").getDisplayValue()).toLowerCase();
    const msg=_normText(admin.getRange("E14").getDisplayValue());
    const owner=_normText(admin.getRange("B17").getDisplayValue());
    const condB7=_normBool(b7Val)||_normBool(b7Disp);
    const condB10=b10==="lockdown9";
    if(condB7&&condB10)return{on:true,message:msg||"Vexium is in lockdown",owner:owner||""};
    return{on:false};
  }catch(e){
    if(FAIL_CLOSED)return{on:true,message:"Lockdown (read error)",owner:""};
    return{on:false};
  }
}

/* ---------- Authorized Users ---------- */
function isAuthorizedUser_(emailB64){
  try{
    if(!emailB64)return false;
    const ss=SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh=ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if(!sh)return!!FAIL_CLOSED;
    const list=sh.getRange(AUTHORIZED_RANGE).getDisplayValues().flat().map(_normText).filter(Boolean);
    return list.includes(emailB64);
  }catch(e){return!!FAIL_CLOSED;}
}

/* ---------- Owner bypass list (F2:F100) ---------- */
function isOwnerBypassAvailable(){
  try{
    const email = (() => { try { return Session.getActiveUser().getEmail(); } catch(_) { return ""; } })();
    if(!email) return false;
    const emailB64 = Utilities.base64Encode(email);
    const ss=SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    const sh=ss.getSheetByName(AUTHORIZED_SHEET_NAME);
    if(!sh) return !!FAIL_CLOSED;
    const rangeList = sh.getRange("F2:F100").getDisplayValues().flat().map(_normText).filter(Boolean);
    return rangeList.includes(emailB64);
  }catch(e){
    return !!FAIL_CLOSED;
  }
}

/* ---------- Attempt bypass (server-side) ---------- */
function attemptBypass(){
  try{
    // ensure lockdown is currently active (sheet) before allowing bypass
    const lockdown = (function(){
      try{
        const ss=SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
        const admin = ss.getSheetByName(ADMIN_PANEL_SHEET_NAME);
        if(!admin) return !!FAIL_CLOSED;
        const b7Val=admin.getRange("B7").getValue();
        const b7Disp=admin.getRange("B7").getDisplayValue();
        const b10=_normText(admin.getRange("B10").getDisplayValue()).toLowerCase();
        return (_normBool(b7Val)||_normBool(b7Disp)) && (b10==="lockdown9");
      }catch(e){ return !!FAIL_CLOSED; }
    })();

    if(!lockdown) return {ok:false,reason:"not_locked"};

    // check owner list
    if(!isOwnerBypassAvailable()) return {ok:false,reason:"not_owner"};

    // set per-user bypass flag
    const okSet = _setUserBypassFlag(true);
    if(!okSet) return {ok:false,reason:"set_failed"};
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

function openVexiumUI(){
  // Always load the remote HTML so client can render lockdown + admin bypass UI.
  const res=UrlFetchApp.fetch(RAW_HTML_URL+"?v="+Date.now(),{muteHttpExceptions:true,followRedirects:true});
  if(res.getResponseCode()!==200){SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub.");return;}
  const html=HtmlService.createHtmlOutput(res.getContentText()).setWidth(1000).setHeight(1000).setTitle("Vexium");
  SpreadsheetApp.getUi().showModalDialog(html,"Vexium");
}

/* ---------- Password check ---------- */
function checkPassword_(pw){
  if(typeof pw!=="string")return false;
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,pw+PW_SALT);
  const hex=digest.map(b=>(b<0?b+256:b).toString(16).padStart(2,"0")).join("");
  return hex===PW_HASH_HEX;
}

/* ---------- Authenticate ---------- */
function authenticate(pw){
  const lock=isExternalLockdownActive();
  if(lock.on)return{ok:false,reason:"lockdown",message:lock.message,owner:lock.owner};
  const pwOk=checkPassword_(pw);
  if(!pwOk)return{ok:false,pwOk};
  const email=(()=>{try{return Session.getActiveUser().getEmail();}catch(_){return"";}})();
  const emailB64=email?Utilities.base64Encode(email):"";
  const authorized=isAuthorizedUser_(emailB64);
  return{ok:pwOk&&authorized,pwOk,driveOk:authorized};
}

/* ---------- User Card ---------- */
function getUserCardData(){
  const email=(()=>{try{return Session.getActiveUser().getEmail();}catch(_){return"";}})();
  const name=email?email.split("@")[0]:"User";
  return{name,email,photoDataUrl:""};
}

/* ---------- GitHub “last updated” ---------- */
function getTemplateLastUpdated(){
  const url=`https://api.github.com/repos/${"johndoeemail5341-del"}/${"Vexium"}/commits?path=TestingPassword&per_page=1`;
  const res=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:true,headers:{
    "Accept":"application/vnd.github+json","User-Agent":"AppsScript-Vexium"}});
  if(res.getResponseCode()!==200)return{ok:false};
  const data=JSON.parse(res.getContentText());
  const iso=data?.[0]?.commit?.committer?.date||data?.[0]?.commit?.author?.date;
  return iso?{ok:true,isoUtc:iso}:{ok:false};
}

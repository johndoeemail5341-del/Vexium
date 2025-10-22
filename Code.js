/**  INSTRUCTIONS: Put this code in Code.js of the Apps Script of your google sheet */ 






/** ===== Vexium modal loader (1000x1000) ===== */
const RAW_HTML_URL = "https://raw.githubusercontent.com/johndoeemail5341-del/Vexium/main/TestingPassword";


function onOpen() {
 SpreadsheetApp.getUi()
   .createMenu("Vexium")
   .addItem("Open Vexium", "openVexiumUI")
   .addToUi();
}


function openVexiumUI() {
 const res = UrlFetchApp.fetch(RAW_HTML_URL + "?v=" + Date.now(), { muteHttpExceptions: true, followRedirects: true });
 if (res.getResponseCode() !== 200) {
   SpreadsheetApp.getUi().alert("Failed to load Vexium UI from GitHub.");
   return;
 }
 const html = HtmlService.createHtmlOutput(res.getContentText())
   .setWidth(1000).setHeight(1000).setTitle("Vexium");
 SpreadsheetApp.getUi().showModalDialog(html, "Vexium");
}


/** ===== Password (salted SHA-256) ===== */
const PW_SALT = "7&gZpA*Qn!2L";
const PW_HASH_HEX = "681f51e10170278e6f3b8157ec276955b1d87005d8d1f37aaa3e5bf72d35aa19";


function checkPassword_(pw) {
 if (typeof pw !== "string") return false;
 const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + PW_SALT);
 const hex = digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
 return hex === PW_HASH_HEX;
}


/** ===== Authenticate: password + Drive/Sheet check ===== */
function authenticate(pw) {
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
  var repo  = "Vexium";
  var path  = "TestingPassword";

  var url = "https://api.github.com/repos/" + owner + "/" + repo +
            "/commits?path=" + encodeURIComponent(path) + "&per_page=1";

  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "AppsScript-Vexium"
    }
  });

  if (res.getResponseCode() !== 200) {
    return { ok: false };
  }

  var data = JSON.parse(res.getContentText());
  if (!data || !data.length || !data[0] || !data[0].commit) {
    return { ok: false };
  }

  // Prefer committer date (more reliable for merge bots), fallback to author
  var iso = (data[0].commit.committer && data[0].commit.committer.date) ||
            (data[0].commit.author && data[0].commit.author.date) ||
            null;

  return iso ? { ok: true, isoUtc: iso } : { ok: false };
}


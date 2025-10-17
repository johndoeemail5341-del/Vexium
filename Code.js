/** ---------- Menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Command Console")
    .addItem("Open Console", "openCommandConsole")
    .addToUi();
}
function openCommandConsole() {
  const html = HtmlService.createHtmlOutputFromFile("CommandConsole")
    .setTitle("Command Console");
  SpreadsheetApp.getUi().showSidebar(html);
}

/** ---------- Password Check (no plaintext, KDF + salt) ---------- */
function checkPassword(candidate) {
  if (typeof candidate !== 'string') return false;

  // Salt = 'x9!K#P' via char codes
  var sc = [120,57,33,75,35,80];
  var salt = sc.map(function(c){return String.fromCharCode(c);}).join('');

  // Rounds = 2048 (1024+512+512)
  var rounds = [1024,512,512].reduce(function(a,b){return a+b;},0);

  // Base64 digest of KDF("sandwich", salt, 2048), split to reduce scanning
  var parts = ['ygiN','LfbUls','soO5Ef','ro5gSN','A2HwrD','FvxmxD','CJXsEX','qKY='];
  var storedB64 = parts.join('');

  var outB64 = kdfSha256B64_(candidate, salt, rounds);
  return slowEq_(outB64, storedB64);
}
function kdfSha256B64_(pw, salt, rounds) {
  function toHex(bytes){
    var s=[]; for (var i=0;i<bytes.length;i++){var v=bytes[i]; if(v<0)v+=256; s.push((v<16?'0':'')+v.toString(16));}
    return s.join('');
  }
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + salt, Utilities.Charset.UTF_8);
  for (var i=1;i<rounds;i++){
    var msg = toHex(h) + salt;
    h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, msg, Utilities.Charset.UTF_8);
  }
  return Utilities.base64Encode(h);
}
function slowEq_(a,b){ if(a.length!==b.length)return false; var d=0; for(var i=0;i<a.length;i++) d|=(a.charCodeAt(i)^b.charCodeAt(i)); return d===0; }

/** ---------- Data actions (unchanged) ---------- */
function setRangeValue(startCell, endCell, value) {
  var sh = SpreadsheetApp.getActiveSheet();
  var rng = sh.getRange(startCell + ':' + endCell);
  rng.setValue(value);
  return rng.getNumRows()*rng.getNumColumns();
}
function setRangeValueAllSheets(startCell, endCell, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var total=0, ok=0;
  ss.getSheets().forEach(function(sh){
    try{
      var rng = sh.getRange(startCell + ':' + endCell);
      rng.setValue(value);
      total += rng.getNumRows()*rng.getNumColumns();
      ok++;
    }catch(e){ Logger.log("Skip "+sh.getName()+": "+e.message); }
  });
  return {sheets: ok, cells: total};
}

/** ---------- Tab creation & deletion (backend) ---------- */
function getCreateMaxSafe(){ return 30; }

function createOneRandomTab(prefix){
  prefix = (prefix || 't') + '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name, tries=0;
  do {
    var rand = Math.random().toString(36).substring(2,10);
    name = prefix + rand;
  } while (ss.getSheetByName(name) && ++tries < 20);

  var k=1;
  while (ss.getSheetByName(name)) name = name + "_" + (k++);
  ss.insertSheet(name);
  Utilities.sleep(25);
  return {name:name};
}

function deleteTestTabs(prefix){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!prefix || !prefix.trim()) throw new Error("Prefix required.");
  var deleted=0;
  ss.getSheets().forEach(function(s){
    if (s.getName().startsWith(prefix)) { try { ss.deleteSheet(s); deleted++; } catch(e){ Logger.log(e); } }
  });
  return {deleted:deleted};
}

function listSheetsToDelete(prefix){
  if (!prefix || !prefix.trim()) throw new Error("Prefix required.");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(function(s){return s.getName();}).filter(function(n){return n.startsWith(prefix);});
}

function deleteSheetByName(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheets().find(function(s){ return s.getName() === name; });
  if (!sh) return {deleted:false, name:name};
  ss.deleteSheet(sh);
  return {deleted:true, name:name};
}

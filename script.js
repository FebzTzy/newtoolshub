/* ============================================================
   BANNER VIDEO
   ============================================================ */
(function(){
  const v = document.getElementById("bannerVideo");
  const wrap = document.getElementById("bannerWrapper");
  if(!v || !wrap) return;
  v.muted = true;
  v.play().catch(()=>{});
  function playWithSound(){
    v.muted = false;
    v.play().then(()=>wrap.classList.add("playing")).catch(()=>{});
  }
  document.addEventListener("click", function firstClick(){
    playWithSound();
    document.removeEventListener("click", firstClick);
  });
  wrap.addEventListener("click", playWithSound);
  v.addEventListener("ended", ()=>{ v.currentTime = 0; v.play().catch(()=>{}); });
})();

/* ============================================================
   LIVE CLOCK
   ============================================================ */
(function(){
  const elTime = document.getElementById("clockTime");
  const elDay  = document.getElementById("clockDay");
  const elDate = document.getElementById("clockDate");
  const elYear = document.getElementById("clockYear");
  if(!elTime || !elDay || !elDate || !elYear) return;
  const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"];
  const pad = n => String(n).padStart(2,"0");
  function tick(){
    const d = new Date();
    elTime.textContent = pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
    elDay.textContent  = HARI[d.getDay()];
    elDate.textContent = d.getDate()+" "+BULAN[d.getMonth()];
    elYear.textContent = d.getFullYear();
  }
  tick(); setInterval(tick, 1000);
})();

/* ============================================================
   API & CONFIG
   ============================================================ */
const BASE = "https://api.nexray.eu.cc";
const AMPREM_API = "https://anita-studio.netlify.app/.netlify/functions/amprem";

const OWNER_NAME = "FebzTzy";
const OWNER_WA   = "6289679137206";
const WA_MSG_BUG = "Halo owner, saya mau lapor BUG di ToolHub:";
const WA_MSG_BUY = "Halo owner, saya mau BELI COIN ToolHub.";

const AMPREM_OWNER_CODE = "ALIGHT-VIP-5509";
const AMPREM_WA_NUMBER  = OWNER_WA;
const AMPREM_WA_MSG     = "Halo kak, saya ingin beli kode Unlimited Access untuk Alight Motion Premium (ToolHub by "+OWNER_NAME+"). Mohon info harga & cara pembayarannya 🙏";
const AMPREM_TRIAL_LIMIT = 3;
const AMPREM_STORAGE_KEY = "am_trial_state_v1";

const COST_TOOLS   = 1;
const COST_CRACKER = 3;
const COST_WEBTOOL = 1;

/* ============================================================
   COIN SYSTEM — serverless
   ============================================================ */
const API_COIN = "/api/coins";
const USER_KEY = "toolhub_userid_v1";

function getUserId(){
  let id = localStorage.getItem(USER_KEY);
  if(!id){
    id = "u_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}
const USER_ID = getUserId();

let coinCache = 0;
let checkinReadyCache = false;
let lastCheckinCache = 0;

async function coinAPI(action, extra){
  const res = await fetch(API_COIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ userId: USER_ID, action }, extra||{}))
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
  return data;
}

async function refreshCoins(){
  try{
    const d = await coinAPI("get");
    coinCache = d.coins|0;
    checkinReadyCache = !!d.checkinReady;
    lastCheckinCache = d.lastCheckin|0;
    renderCoins();
    renderCheckin();
  }catch(e){
    console.warn("coin refresh gagal:", e.message);
  }
}
function getCoins(){ return coinCache; }
function renderCoins(){
  const el = document.getElementById("coinVal");
  if(el) el.textContent = coinCache;
}

/* ============================================================
   CHECK-IN
   ============================================================ */
const CHECKIN_INTERVAL = 3 * 60 * 60 * 1000;

function fmtLeft(){
  const left = CHECKIN_INTERVAL - (Date.now() - lastCheckinCache);
  if(left <= 0) return "";
  const total = Math.ceil(left/1000);
  const h = Math.floor(total/3600);
  const m = Math.floor((total%3600)/60);
  const s = total%60;
  return (h>0?h+"j ":"")+m+"m "+s+"d";
}
function renderCheckin(){
  const btn = document.getElementById("checkinBtn");
  const txt = document.getElementById("checkinTxt");
  if(!btn || !txt) return;
  if(checkinReadyCache){
    btn.disabled = false; btn.classList.add("ready");
    txt.textContent = "CHECK IN";
  } else {
    btn.disabled = true; btn.classList.remove("ready");
    txt.textContent = fmtLeft() || "3 JAM";
  }
}
setInterval(() => { if(!checkinReadyCache) renderCheckin(); }, 1000);

function openCheckin(){
  const ov = document.getElementById("checkinOverlay");
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  if(!ov) return;
  if(checkinReadyCache){
    big.textContent = "🎁";
    msg.textContent = "Reward siap diklaim: 5 coin!";
    btn.disabled = false; btn.textContent = "Klaim 5 Coin"; btn.onclick = doClaimCheckin;
  } else {
    big.textContent = "⏳";
    msg.textContent = "Sudah check-in. Coba lagi dalam " + (fmtLeft()||"sebentar") + ".";
    btn.disabled = true; btn.textContent = "Belum waktunya";
  }
  ov.classList.add("open");
}
function closeCheckin(){
  document.getElementById("checkinOverlay").classList.remove("open");
}
async function doClaimCheckin(){
  if(!checkinReadyCache) return;
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  btn.disabled = true; btn.textContent = "Mengklaim...";
  try{
    const d = await coinAPI("checkin");
    coinCache = d.coins|0;
    checkinReadyCache = false;
    lastCheckinCache = Date.now();
    renderCoins(); renderCheckin();
    big.textContent = "✅";
    msg.textContent = "+"+(d.reward||5)+" coin masuk! Saldo: "+coinCache;
    btn.textContent = "Berhasil";
  }catch(e){
    big.textContent = "❌"; msg.textContent = e.message; btn.textContent = "Gagal";
  }
}

/* ============================================================
   REDEEM
   ============================================================ */
function openRedeem(){
  document.getElementById("redeemOverlay").classList.add("open");
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  if(input) input.value = "";
  if(res){ res.className = "result"; res.innerHTML = ""; }
}
function closeRedeem(){
  document.getElementById("redeemOverlay").classList.remove("open");
}
async function submitRedeem(){
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  const code = (input.value || "").trim().toUpperCase();
  if(!code){
    res.className = "result show err"; res.innerHTML = "<pre>Masukkan kode dulu.</pre>"; return;
  }
  res.className = "result show"; res.innerHTML = "<pre>Memproses...</pre>";
  try{
    const d = await coinAPI("redeem", { code });
    coinCache = d.coins|0; renderCoins();
    res.className = "result show ok";
    res.innerHTML = "<pre>🎉 Berhasil! +"+(d.reward||0)+" coin masuk.\nSaldo sekarang: "+coinCache+"</pre>";
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>❌ "+escapeHTML(e.message)+"</pre>";
  }
}

/* ============================================================
   TOOLS DATA
   ============================================================ */
let activeTool = null;
let lastResult = null;
let ampremState = null;

const TOOLS = [
{ id:"fake_tools", title:"Fake Tools", desc:"Kumpulan fitur fake: FF, Dana, Jago, ML, Story, GC, Dev.",
  ico:"🎭", acc:"acc-purple", special:"faketools" },
{ id:"iqc_v1", title:"IQC v1", desc:"Generate IQC versi 1 — masukkan teks.",
  ico:"🧪", acc:"acc-green", category:"maker",
  fields:[{key:"text",label:"Teks",type:"textarea",placeholder:"tulis teks di sini"}],
  buildURL: p => BASE+"/maker/iqc?text="+encodeURIComponent(p.text||""),
  filename: () => "iqc_v1_"+Date.now()+".png" },

{ id:"iqc_v2", title:"IQC v2", desc:"IQC v2 — teks, provider, jam, baterai.",
  ico:"🧬", acc:"acc-green", category:"maker",
    fields:[
      {key:"text",label:"Teks",type:"textarea",placeholder:"tulis teks di sini"},
      {key:"provider",label:"Provider",type:"select",options:["Telkomsel","Indosat","XL","Tri","Smartfren","Axis"]},
      {key:"jam",label:"Jam",type:"text",placeholder:"14:30"},
      {key:"baterai",label:"Baterai (%)",type:"number",placeholder:"85"}
    ],
    buildURL: p => BASE+"/maker/v1/iqc?text="+encodeURIComponent(p.text||"")+"&provider="+encodeURIComponent(p.provider||"")+"&jam="+encodeURIComponent(p.jam||"")+"&baterai="+encodeURIComponent(p.baterai||""),
    filename: () => "iqc_v2_"+Date.now()+".png" },
    
  { id:"wink_hdr", title:"Wink HDR", desc:"Enhance foto / video via Wink HDR — masukkan URL.",
    ico:"🪄", acc:"acc-red",
    fields:[
      {key:"url",label:"URL Foto / Video",type:"text",placeholder:"https://files.catbox.moe/xxx.mp4"},
      {key:"type",label:"Tipe",type:"select",options:["image","video"]}
    ],
    buildURL: p => BASE+"/tools/wink?url="+encodeURIComponent(p.url||"")+"&type="+encodeURIComponent(p.type||"image"),
    filename: p => "winkhdr_"+(p.type||"image")+"_"+Date.now()+(p.type==="video"?".mp4":".png") },

  { id:"hdvideo", title:"HD Video V1", desc:"Upgrade resolusi video — hd / full-hd / 2k / 4k.",
    ico:"🎬", acc:"acc-red",
    fields:[
      {key:"url",label:"URL Video",type:"text",placeholder:"https://files.catbox.moe/xxx.mp4"},
      {key:"resolusi",label:"Resolusi",type:"select",options:["hd","full-hd","2k","4k"]}
    ],
    buildURL: p => BASE+"/tools/v1/hdvideo?url="+encodeURIComponent(p.url||"")+"&resolusi="+encodeURIComponent(p.resolusi||"hd"),
    filename: p => "hdvideo_"+(p.resolusi||"hd")+"_"+Date.now()+".mp4" },

  { id:"remini", title:"Remini", desc:"Perjelas & pertegas foto via Remini — masukkan URL.",
    ico:"🖼️", acc:"acc-red",
    fields:[{key:"url",label:"URL Foto",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"}],
    buildURL: p => BASE+"/tools/remini?url="+encodeURIComponent(p.url||""),
    filename: () => "remini_"+Date.now()+".png" },

  { id:"unblur", title:"Unblur Image", desc:"Pertajam / hilangkan blur foto.",
    ico:"🔍", acc:"acc-red",
    fields:[{key:"url",label:"URL Foto",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"}],
    buildURL: p => BASE+"/tools/unblur?url="+encodeURIComponent(p.url||""),
    filename: () => "unblur_"+Date.now()+".png" },

  { id:"nikparse", title:"NIK Parse", desc:"Parse NIK 16 digit — wilayah, tanggal lahir, gender.",
    ico:"🪪", acc:"acc-warn", category:"cracker",
    fields:[{key:"nik",label:"NIK (16 digit)",type:"text",placeholder:"contoh: 3201xxxxxxxxxxxx"}],
    buildURL: p => BASE+"/tools/nikparse?nik="+encodeURIComponent(p.nik||""),
    filename: () => "nikparse_"+Date.now()+".txt" },

  { id:"trackip", title:"Track IP", desc:"Lacak IP dari domain / URL.",
    ico:"🌐", acc:"acc-warn", category:"cracker",
    fields:[{key:"target",label:"Target (domain / URL)",type:"text",placeholder:"google.com"}],
    buildURL: p => BASE+"/tools/trackip?target="+encodeURIComponent(p.target||""),
    filename: () => "trackip_"+Date.now()+".txt" },

  { id:"spamngl", title:"Spam NGL", desc:"Kirim pesan ke link NGL.",
    ico:"💬", acc:"acc-warn", category:"cracker",
    fields:[
      {key:"url",label:"URL NGL",type:"text",placeholder:"https://ngl.link/febztzy"},
      {key:"pesan",label:"Pesan",type:"textarea",placeholder:"tulis pesan di sini"},
      {key:"jumlah",label:"Jumlah",type:"number",placeholder:"6"}
    ],
    buildURL: p => BASE+"/tools/spamngl?url="+encodeURIComponent(p.url||"")+"&pesan="+encodeURIComponent(p.pesan||"")+"&jumlah="+encodeURIComponent(p.jumlah||"1"),
    filename: () => "spamngl_"+Date.now()+".txt" },

  { id:"webtozip", title:"Web to Zip", desc:"Download seluruh halaman web jadi arsip zip.",
    ico:"📦", acc:"acc-green", category:"webtool",
    fields:[{key:"url",label:"URL Website",type:"text",placeholder:"https://febztzy.com"}],
    buildURL: p => BASE+"/tools/webtozip?url="+encodeURIComponent(p.url||""),
    filename: () => "webtozip_"+Date.now()+".zip" },

{ id:"amprem", title:"Create Alight Motion Premium",
  desc:"Aktivasi Alight Motion Premium — kirim magic link, verifikasi, apply.",
  ico:"✨", acc:"acc-red", special:"amprem", category:"amprem" }
];

function costOf(tool){
  if(!tool) return 0;
  if(tool.category === "cracker") return COST_CRACKER;
  if(tool.category === "webtool") return COST_WEBTOOL;
  return COST_TOOLS;
}

/* ============================================================
   RENDER MENU
   ============================================================ */
const toolsToggle = document.getElementById("toolsToggle");
const toolsMenu = document.getElementById("toolsMenu");
const toolsMenuInner = document.getElementById("toolsMenuInner");
const crackerToggle = document.getElementById("crackerToggle");
const crackerMenu = document.getElementById("crackerMenu");
const crackerMenuInner = document.getElementById("crackerMenuInner");
const webtoolToggle = document.getElementById("webtoolToggle");
const webtoolMenu = document.getElementById("webtoolMenu");
const webtoolMenuInner = document.getElementById("webtoolMenuInner");
const makerToggle = document.getElementById("makerToggle");
const makerMenu = document.getElementById("makerMenu");
const makerMenuInner = document.getElementById("makerMenuInner");
const ampremToggle = document.getElementById("ampremToggle");
const ampremMenu = document.getElementById("ampremMenu");
const ampremMenuInner = document.getElementById("ampremMenuInner");

function buildItem(t, menuEl, toggleEl){
  const item = document.createElement("div");
  item.className = "tool-item "+(t.acc||"");
  const cost = costOf(t);
  item.innerHTML = '<div class="ti-ico">'+t.ico+'</div>'+
    '<div class="ti-info"><div class="ti-title">'+t.title+'</div>'+
    '<div class="ti-sub">🪙 '+cost+' coin · by '+OWNER_NAME+'</div></div>'+
    '<div class="ti-arrow">›</div>';
  item.onclick = () => {
    menuEl.classList.remove("open"); toggleEl.classList.remove("open");
    openModal(t.id);
  };
  return item;
}
function closeAllMenus(except){
  if(except!=="tools" && toolsMenu && toolsToggle){ toolsMenu.classList.remove("open"); toolsToggle.classList.remove("open"); }
  if(except!=="cracker" && crackerMenu && crackerToggle){ crackerMenu.classList.remove("open"); crackerToggle.classList.remove("open"); }
  if(except!=="webtool" && webtoolMenu && webtoolToggle){ webtoolMenu.classList.remove("open"); webtoolToggle.classList.remove("open"); }
  if(except!=="maker" && makerMenu && makerToggle){ makerMenu.classList.remove("open"); makerToggle.classList.remove("open"); }
  if(except!=="amprem" && ampremMenu && ampremToggle){ ampremMenu.classList.remove("open"); ampremToggle.classList.remove("open"); }
}
if(toolsMenuInner && toolsMenu && toolsToggle){
  TOOLS.filter(t => t.category !== "cracker" && t.category !== "webtool" && t.category !== "maker" && t.category !== "amprem").forEach(t => {
  toolsMenuInner.appendChild(buildItem(t, toolsMenu, toolsToggle));
});
  toolsToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = toolsMenu.classList.toggle("open");
    toolsToggle.classList.toggle("open", open);
    if(open) closeAllMenus("tools");
  });
}
if(crackerMenuInner && crackerMenu && crackerToggle){
  TOOLS.filter(t => t.category === "cracker").forEach(t => {
    crackerMenuInner.appendChild(buildItem(t, crackerMenu, crackerToggle));
  });
  crackerToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = crackerMenu.classList.toggle("open");
    crackerToggle.classList.toggle("open", open);
    if(open) closeAllMenus("cracker");
  });
}
if(webtoolMenuInner && webtoolMenu && webtoolToggle){
  TOOLS.filter(t => t.category === "webtool").forEach(t => {
    webtoolMenuInner.appendChild(buildItem(t, webtoolMenu, webtoolToggle));
  });
  webtoolToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = webtoolMenu.classList.toggle("open");
    webtoolToggle.classList.toggle("open", open);
    if(open) closeAllMenus("webtool");
  });
}
if(makerMenuInner && makerMenu && makerToggle){
  TOOLS.filter(t => t.category === "maker").forEach(t => {
    makerMenuInner.appendChild(buildItem(t, makerMenu, makerToggle));
  });
  makerToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = makerMenu.classList.toggle("open");
    makerToggle.classList.toggle("open", open);
    if(open) closeAllMenus("maker");
  });
}
if(ampremMenuInner && ampremMenu && ampremToggle){
  TOOLS.filter(t => t.category === "amprem").forEach(t => {
    ampremMenuInner.appendChild(buildItem(t, ampremMenu, ampremToggle));
  });
  ampremToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = ampremMenu.classList.toggle("open");
    ampremToggle.classList.toggle("open", open);
    if(open) closeAllMenus("amprem");
  });
}
document.addEventListener("click", (e) => {
  const insideTools = toolsMenu && toolsToggle && (toolsMenu.contains(e.target) || toolsToggle.contains(e.target));
  const insideCracker = crackerMenu && crackerToggle && (crackerMenu.contains(e.target) || crackerToggle.contains(e.target));
  const insideWeb = webtoolMenu && webtoolToggle && (webtoolMenu.contains(e.target) || webtoolToggle.contains(e.target));
  const insideMaker = makerMenu && makerToggle && (makerMenu.contains(e.target) || makerToggle.contains(e.target));
  const insideAmp = ampremMenu && ampremToggle && (ampremMenu.contains(e.target) || ampremToggle.contains(e.target));
  if(!insideTools && !insideCracker && !insideWeb && !insideMaker && !insideAmp) closeAllMenus();
});

/* ============================================================
   MODAL
   ============================================================ */
function openModal(id){
  activeTool = TOOLS.find(t => t.id === id);
  if(!activeTool) return;
  lastResult = null;
  document.getElementById("mTitle").textContent = activeTool.title;
  document.getElementById("mSub").textContent = activeTool.desc;
  document.getElementById("mResult").className = "result";
  document.getElementById("mResult").innerHTML = "";
  document.getElementById("mLoader").className = "loader";
  document.getElementById("mExec").disabled = false;
  document.getElementById("mDl").style.display = "none";
  document.getElementById("mExtra").style.display = "none";
  document.getElementById("mExtra").innerHTML = "";
  document.getElementById("mExec").style.display = "block";
  const cost = costOf(activeTool);
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 "+cost+" coin / pakai";
if(activeTool.special === "amprem") renderAmpRem();
else if(activeTool.special === "faketools") renderFakeTools();
else renderGeneric();
  document.getElementById("overlay").classList.add("open");
}
function closeModal(){
  document.getElementById("overlay").classList.remove("open");
  activeTool = null; lastResult = null; ampremState = null;
}
function renderGeneric(){
  const wrap = document.getElementById("mFields");
  wrap.innerHTML = "";
  activeTool.fields.forEach(f => {
    const div = document.createElement("div");
    div.className = "field";
    if(f.type === "select"){
      div.innerHTML = '<label>'+f.label+'</label><select data-key="'+f.key+'">'+f.options.map(o=>'<option>'+o+'</option>').join("")+'</select>';
    } else if(f.type === "textarea"){
      div.innerHTML = '<label>'+f.label+'</label><textarea data-key="'+f.key+'" placeholder="'+(f.placeholder||"")+'"></textarea>';
    } else {
      div.innerHTML = '<label>'+f.label+'</label><input type="'+f.type+'" data-key="'+f.key+'" placeholder="'+(f.placeholder||"")+'">';
    }
    wrap.appendChild(div);
  });
}
function collectParams(){
  const params = {};
  document.querySelectorAll("#mFields [data-key]").forEach(el => {
    params[el.dataset.key] = el.value;
  });
  return params;
}
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ============================================================
   EXECUTE — dengan potong coin
   ============================================================ */
async function executeTool(){
  if(!activeTool || activeTool.special) return;
  const params = collectParams();
  const loader = document.getElementById("mLoader");
  const execBtn = document.getElementById("mExec");
  const resEl = document.getElementById("mResult");

  const cost = costOf(activeTool);
  if(getCoins() < cost){
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>🪙 Coin tidak cukup.\nButuh "+cost+" coin, saldo kamu: "+getCoins()+".\nCheck-in / redeem / beli coin ke owner.</pre>";
    return;
  }
  loader.classList.add("show"); execBtn.disabled = true;
  resEl.className = "result"; resEl.innerHTML = "";

  // potong di server
  try{
    const d = await coinAPI("spend", { amount: cost });
    coinCache = d.coins|0;
    renderCoins();
  }catch(e){
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>Gagal potong coin: "+escapeHTML(e.message)+"</pre>";
    loader.classList.remove("show"); execBtn.disabled = false;
    return;
  }

  let success = false;
  try{
    const url = activeTool.buildURL(params);
    const res = await fetch(url);

    if(!res.ok){
      const txt = await res.text().catch(()=> "");
      lastResult = { type:"text", data:"HTTP "+res.status+"\n"+(txt||"(no body)"), filename:"error.txt" };
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>"+escapeHTML(lastResult.data)+"</pre>";
    } else {
      const ct = res.headers.get("content-type") || "";
      if(ct.startsWith("image/")){
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type:"image", data:objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="'+objURL+'" alt="result">';
        success = true;
      } else if(ct.startsWith("video/")){
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type:"image", data:objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<video src="'+objURL+'" controls playsinline></video>';
        success = true;
      } else {
        const raw = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch(e){}
        const imgURL = parsed && (parsed.result || parsed.url || parsed.data || parsed.image || parsed.link);
        if(imgURL && typeof imgURL === "string" && /^https?:\/\//.test(imgURL)){
          const isVid = /\.(mp4|webm|mov)$/i.test(imgURL);
          lastResult = { type:"image", data:imgURL, filename: activeTool.filename(params) };
          resEl.className = "result show ok";
          resEl.innerHTML = isVid ? '<video src="'+imgURL+'" controls playsinline></video>' : '<img src="'+imgURL+'" alt="result">';
          success = true;
        } else {
          const pretty = parsed ? JSON.stringify(parsed, null, 2) : raw;
          const isError = /gagal|error|invalid|not found/i.test(pretty) && !parsed?.result && !parsed?.url;
          lastResult = { type:"text", data:pretty, filename: activeTool.filename(params).replace(/\.(png|mp4|zip)$/,".txt") };
          resEl.className = "result show " + (isError ? "err" : "ok");
          resEl.innerHTML = "<pre>"+escapeHTML(pretty)+"</pre>";
          success = !isError;
        }
      }
    }
  }catch(err){
    lastResult = { type:"text", data:"Gagal:\n"+err.message, filename:"error.txt" };
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>"+escapeHTML(lastResult.data)+"</pre>";
  }finally{
    loader.classList.remove("show"); execBtn.disabled = false;
    if(!success){
      try{
        const d = await coinAPI("refund", { amount: cost });
        coinCache = d.coins|0; renderCoins();
      }catch(e){ console.warn("refund gagal", e); }
      const note = document.createElement("div");
      note.style.marginTop = "10px";
      note.style.color = "#fbbf24";
      note.style.fontSize = ".78rem";
      note.textContent = "🪙 Coin dikembalikan karena gagal.";
      resEl.appendChild(note);
    }
    showDownload();
  }
}
function showDownload(){
  const dl = document.getElementById("mDl");
  if(lastResult) dl.style.display = "block";
}
async function downloadResult(){
  if(!lastResult) return;
  const a = document.createElement("a");
  a.download = lastResult.filename || "result";
  a.rel = "noopener";
  const isVideo = /\.(mp4|webm|mov)$/i.test(lastResult.filename || "");
  const isZip = /\.zip$/i.test(lastResult.filename || "");
  if(lastResult.data.startsWith("blob:")){
    a.href = lastResult.data;
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  try{
    const r = await fetch(lastResult.data);
    const b = await r.blob();
    const fallbackType = isVideo ? "video/mp4" : (isZip ? "application/zip" : "image/png");
    const blob = b.type ? b : new Blob([b], { type: fallbackType });
    const u = URL.createObjectURL(blob);
    a.href = u; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(u), 5000);
  }catch(e){ window.open(lastResult.data, "_blank"); }
}

/* ============================================================
   AMPREM
   ============================================================ */
function loadAmpRemState(){
  try{
    const raw = localStorage.getItem(AMPREM_STORAGE_KEY);
    if(!raw) return { count:0, unlocked:false };
    const s = JSON.parse(raw);
    return { count: Math.max(0, parseInt(s.count)||0), unlocked: !!s.unlocked };
  }catch{ return { count:0, unlocked:false }; }
}
function saveAmpRemState(s){ try{ localStorage.setItem(AMPREM_STORAGE_KEY, JSON.stringify(s)); }catch{} }
function ampremConsumeTrial(){
  const s = loadAmpRemState(); if(s.unlocked) return;
  s.count++; saveAmpRemState(s);
}
function renderAmpRem(){
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  const state = loadAmpRemState();
  ampremState = { email:"", step:1 };
  const left = Math.max(0, AMPREM_TRIAL_LIMIT - state.count);
  const badge = state.unlocked
    ? '<div class="step-badge gold">👑 UNLIMITED — '+OWNER_NAME+'</div>'
    : '<div class="step-badge">⚡ Trial tersisa: '+left+' / '+AMPREM_TRIAL_LIMIT+' — '+OWNER_NAME+'</div>';
  if(costEl) costEl.textContent = "🪙 Free (trial)";
  wrap.innerHTML = badge
    + '<div id="amStep1"><div class="field"><label>Email</label><input type="email" data-key="email" placeholder="Masukkan email Anda"></div></div>'
    + '<div id="amStep2" class="step-hidden"><div class="field"><label>Raw Magic Link</label><input type="text" data-key="rawLink" placeholder="Tempelkan magic link dari email"></div></div>';
  execBtn.style.display = "none";
  extra.style.display = "flex";
  if(!state.unlocked && left <= 0){
    wrap.innerHTML += '<div class="field" id="amCodeField"><label>Kode Akses Owner</label><input type="text" data-key="unlockCode" placeholder="Masukkan kode akses owner"></div>';
    extra.innerHTML = '<button class="btn btn-wa" id="amBtnBuy">🟢 Beli Kode via WhatsApp</button><button class="btn btn-gold" id="amBtnUnlock">🔓 Aktivasi Kode</button>';
    document.getElementById("amBtnBuy").onclick = () => {
      const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
      const url = mobile ? "https://wa.me/"+AMPREM_WA_NUMBER+"?text="+encodeURIComponent(AMPREM_WA_MSG)
                         : "https://web.whatsapp.com/send?phone="+AMPREM_WA_NUMBER+"&text="+encodeURIComponent(AMPREM_WA_MSG);
      window.open(url, "_blank");
    };
    document.getElementById("amBtnUnlock").onclick = () => {
      const code = (document.querySelector('[data-key="unlockCode"]')?.value || "").trim();
      const r = document.getElementById("mResult");
      r.className = "result show";
      if(code === AMPREM_OWNER_CODE){
        const s = loadAmpRemState(); s.unlocked = true; saveAmpRemState(s);
        r.className = "result show ok";
        r.innerHTML = "<pre>🎉 Kode valid! Unlimited access terbuka.\nOwner: "+OWNER_NAME+"\nTutup modal, lalu buka lagi untuk mulai.</pre>";
      } else {
        r.className = "result show err";
        r.innerHTML = "<pre>❌ Kode salah. Hubungi owner "+OWNER_NAME+" via WhatsApp.</pre>";
      }
    };
    return;
  }
  extra.innerHTML = '<button class="btn btn-primary" id="amBtnSend">📧 Kirim Magic Link</button>';
  document.getElementById("amBtnSend").onclick = ampremSendMagicLink;
}
async function ampremRequest(action, data){
  const res = await fetch(AMPREM_API, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ action }, data))
  });
  if(!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}
async function ampremSendMagicLink(){
  const email = (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnSend");
  if(!email){ res.className="result show err"; res.innerHTML="<pre>Masukkan email dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Mengirim magic link...</pre>";
  try{
    const data = await ampremRequest("send-magiclink", { email });
    if(data.success){
      res.className = "result show ok";
      res.innerHTML = "<pre>✅ Magic link dikirim ke "+email+".\nCek inbox/spam, lalu tempelkan raw magic link di kolom bawah.\n\n— "+OWNER_NAME+"</pre>";
      ampremState.email = email;
      document.getElementById("amStep2").classList.remove("step-hidden");
      ampremConsumeTrial();
      const extra = document.getElementById("mExtra");
      extra.innerHTML = '<button class="btn btn-primary" id="amBtnVerify">✅ Verifikasi & Aktivasi</button>';
      document.getElementById("amBtnVerify").onclick = ampremVerify;
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(data.message || "Gagal mengirim magic link.")+"\n— "+OWNER_NAME+"</pre>";
    }
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>Error: "+escapeHTML(e.message)+"\n— "+OWNER_NAME+"</pre>";
  }finally{ btn.disabled = false; loader.classList.remove("show"); }
}
async function ampremVerify(){
  const rawLink = (document.querySelector('[data-key="rawLink"]')?.value || "").trim();
  const email = ampremState?.email || (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnVerify");
  if(!rawLink){ res.className="result show err"; res.innerHTML="<pre>Tempelkan magic link dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Memverifikasi akun...</pre>";
  try{
    const verify = await ampremRequest("verify-account", { email, rawLink });
    if(!verify.success){
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(verify.message || "Verifikasi gagal.")+"\n— "+OWNER_NAME+"</pre>";
      return;
    }
        const idToken = verify.idToken || (verify.profile && verify.profile.idToken);
    if(!idToken){
      res.className = "result show err";
      res.innerHTML = "<pre>❌ idToken tidak ditemukan.\n— "+OWNER_NAME+"</pre>";
      return;
    }
    res.innerHTML = "<pre>✅ Verifikasi berhasil. Menerapkan premium...</pre>";
    const premium = await ampremRequest("apply-premium", { email, idToken });
    if(premium.success){
      res.className = "result show ok";
      res.innerHTML = "<pre>🎉 ALIGHT MOTION PREMIUM ACTIVE\n\nEmail: "+escapeHTML(email)+"\nStatus: PREMIUM SUCCESSFULLY ACTIVATED\n\n— "+OWNER_NAME+"</pre>";
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(premium.message || "Gagal apply premium.")+"\n— "+OWNER_NAME+"</pre>";
    }
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>Error: "+escapeHTML(e.message)+"\n— "+OWNER_NAME+"</pre>";
  }finally{ btn.disabled = false; loader.classList.remove("show"); }
}
/* ============================================================
   FAKE DEV
   ============================================================ */
const FAKEDEV_BG_URL    = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797781960.jpeg";
const FAKEDEV_BADGE_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797710490.png";

const fakeDevState = {
  userImg: null,
  bgImg: null,
  badgeImg: null,
  assetsPromise: null,
};

function fakeDevLoadImg(src, cross){
  return new Promise((resolve, reject) => {
    const im = new Image();
    if(cross) im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("gagal load asset"));
    im.src = src;
  });
}
function fakeDevEnsureAssets(){
  if(fakeDevState.assetsPromise) return fakeDevState.assetsPromise;
  fakeDevState.assetsPromise = Promise.all([
    fakeDevLoadImg(FAKEDEV_BG_URL, true).catch(() => fakeDevLoadImg(FAKEDEV_BG_URL, false)),
    fakeDevLoadImg(FAKEDEV_BADGE_URL, true).catch(() => fakeDevLoadImg(FAKEDEV_BADGE_URL, false))
  ]).then(arr => {
    fakeDevState.bgImg = arr[0];
    fakeDevState.badgeImg = arr[1];
    return true;
  });
  return fakeDevState.assetsPromise;
}

function fakeDevDrawCircularText(ctx, text, cx, cy, radius, badge){
  const fontSize = 72, strokeWidth = 3, arcSpan = Math.PI * 0.7;
  ctx.font = "bold " + fontSize + "px sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textRadius = radius + 75;
  const chars = String(text || "").split("");
  const n = chars.length;
  const inc = n > 1 ? arcSpan / (n - 1) : 0;
  const start = Math.PI / 2 + arcSpan / 2;

  for(let i = 0; i < n; i++){
    const ch = chars[i];
    const angle = start - i * inc;
    const x = cx + Math.cos(angle) * textRadius;
    const y = cy + Math.sin(angle) * textRadius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(ch, 0, 0);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  if(badge){
    const endAngle = start - (n - 1) * inc;
    const badgeAngle = endAngle - inc;
    const badgeSize = Math.round(fontSize * 0.9);
    const bx = cx + Math.cos(badgeAngle) * textRadius;
    const by = cy + Math.sin(badgeAngle) * textRadius;
    try{ ctx.drawImage(badge, bx - badgeSize/2, by - badgeSize/2, badgeSize, badgeSize); }catch(e){}
  }
}

function renderFakeDev(){
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 1 coin / pakai";

  execBtn.style.display = "none";
  extra.style.display = "flex";
  extra.innerHTML = '<button class="btn btn-primary" id="fdGenBtn" type="button">✨ Generate Fake Dev</button>';

  fakeDevState.userImg = null;

  wrap.innerHTML = `
    <div class="field">
      <label>Foto dari Galeri</label>
      <input type="file" id="fdFile" accept="image/*">
      <img class="avatar-preview" id="fdPreview" alt="preview">
    </div>
    <div class="field">
      <label>Teks Melengkung</label>
      <input type="text" id="fdText" placeholder="DEVELOPER" maxlength="20">
    </div>
    <div class="field" style="display:flex;gap:6px;flex-wrap:wrap">
      <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-fd-chip="DEVELOPER">DEVELOPER</button>
      <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-fd-chip="OWNER">OWNER</button>
      <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-fd-chip="ADMIN">ADMIN</button>
      <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-fd-chip="FEBZTZY">FEBZTZY</button>
    </div>
  `;

  const fdFile = document.getElementById("fdFile");
  const fdPreview = document.getElementById("fdPreview");
  const fdText = document.getElementById("fdText");
  const fdGenBtn = document.getElementById("fdGenBtn");

  fdFile.addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!f) return;
    if(!/^image\//i.test(f.type)){
      alert("Pilih foto dari galeri");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const im = new Image();
      im.onload = () => {
        fakeDevState.userImg = im;
        fdPreview.src = ev.target.result;
        fdPreview.classList.add("show");
      };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });

  wrap.querySelectorAll("[data-fd-chip]").forEach(b => {
    b.addEventListener("click", () => {
      fdText.value = b.dataset.fdChip || "";
      fdText.focus();
    });
  });

  fdGenBtn.addEventListener("click", async () => {
    const resEl = document.getElementById("mResult");
    const loader = document.getElementById("mLoader");
    const text = (fdText.value || "").trim().toUpperCase();

    if(!fakeDevState.userImg){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ Pilih foto dari galeri dulu.</pre>";
      return;
    }
    if(!text){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ Isi teks melengkung dulu (contoh: DEVELOPER).</pre>";
      return;
    }

    const cost = 1;
    if(getCoins() < cost){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>🪙 Coin tidak cukup. Butuh 1 coin, saldo kamu: " + getCoins() + ".</pre>";
      return;
    }

    loader.classList.add("show");
    fdGenBtn.disabled = true;

    // potong coin
    try{
      const d = await coinAPI("spend", { amount: cost });
      coinCache = d.coins|0; renderCoins();
    }catch(e){
      loader.classList.remove("show");
      fdGenBtn.disabled = false;
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>Gagal potong coin: " + escapeHTML(e.message) + "</pre>";
      return;
    }

    let success = false;
    try{
      resEl.className = "result show";
      resEl.innerHTML = "<pre>Menyiapkan background & badge...</pre>";
      await fakeDevEnsureAssets();
      if(!fakeDevState.bgImg) throw new Error("Background gagal dimuat — cek koneksi.");

      resEl.innerHTML = "<pre>Menggambar canvas 1080×1080...</pre>";

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const W = 1080, H = 1080;
      canvas.width = W; canvas.height = H;

      ctx.drawImage(fakeDevState.bgImg, 0, 0, W, H);

      const cx = W/2, cy = H/2, radius = 263;
      const side = radius * 2;
      const iw = fakeDevState.userImg.naturalWidth || fakeDevState.userImg.width;
      const ih = fakeDevState.userImg.naturalHeight || fakeDevState.userImg.height;
      const scale = Math.max(side/iw, side/ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = cx - dw/2, dy = cy - dh/2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(fakeDevState.userImg, dx, dy, dw, dh);
      ctx.restore();

      fakeDevDrawCircularText(ctx, text, cx, cy, radius, fakeDevState.badgeImg);

      const dataURL = canvas.toDataURL("image/png");
      lastResult = {
        type: "image",
        data: dataURL,
        filename: "fakedev_" + text.replace(/\s+/g,"-").slice(0,20) + "_" + Date.now() + ".png"
      };
      resEl.className = "result show ok";
      resEl.innerHTML = '<img src="' + dataURL + '" alt="fake dev">';
      success = true;
    }catch(err){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
    }finally{
      loader.classList.remove("show");
      fdGenBtn.disabled = false;
      if(!success){
        try{
          const d = await coinAPI("refund", { amount: cost });
          coinCache = d.coins|0; renderCoins();
        }catch(e){ console.warn("refund gagal", e); }
        const note = document.createElement("div");
        note.style.marginTop = "10px";
        note.style.color = "#fbbf24";
        note.style.fontSize = ".78rem";
        note.textContent = "🪙 Coin dikembalikan karena gagal.";
        resEl.appendChild(note);
      }
      showDownload();
    }
  });
}

function renderFakeGC(){
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 1 coin / pakai";

  execBtn.style.display = "none";
  extra.style.display = "flex";
  extra.innerHTML = '<button class="btn btn-primary" id="fgExec" type="button">✨ Buat Fake GC</button>';

  let selectedAvatar = null;

  wrap.innerHTML = `
    <div class="field">
      <label>Foto Avatar Grup (dari galeri)</label>
      <input type="file" id="fgAvatar" accept="image/*">
      <img class="avatar-preview" id="fgPreview" alt="preview">
    </div>
    <div class="field">
      <label>Nama Grup</label>
      <input type="text" id="fgNama" placeholder="Febz Family" maxlength="30">
    </div>
    <div class="field">
      <label>Jumlah Anggota</label>
      <input type="number" id="fgAnggota" placeholder="20" value="20" min="1" max="9999">
    </div>
  `;

  const fgAvatar  = document.getElementById("fgAvatar");
  const fgPreview = document.getElementById("fgPreview");
  const fgNama    = document.getElementById("fgNama");
  const fgAnggota = document.getElementById("fgAnggota");
  const fgExec    = document.getElementById("fgExec");

  fgAvatar.addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!f) return;
    if(!/^image\//i.test(f.type)){
      alert("Pilih file gambar");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      selectedAvatar = ev.target.result;
      fgPreview.src = ev.target.result;
      fgPreview.classList.add("show");
    };
    reader.readAsDataURL(f);
  });

  fgExec.addEventListener("click", async () => {
    const resEl  = document.getElementById("mResult");
    const loader = document.getElementById("mLoader");

    const nama    = (fgNama.value || "").trim();
    const anggota = (fgAnggota.value || "").trim();

    if(!selectedAvatar){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ Pilih foto avatar dari galeri dulu.</pre>";
      return;
    }
    if(!nama){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ Isi Nama Grup dulu.</pre>";
      return;
    }
    if(!anggota || isNaN(Number(anggota)) || Number(anggota) < 1){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ Isi Jumlah Anggota yang valid (min 1).</pre>";
      return;
    }

    const cost = 1;
    if(getCoins() < cost){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>🪙 Coin tidak cukup. Butuh 1 coin.</pre>";
      return;
    }

    loader.classList.add("show");
    fgExec.disabled = true;
    resEl.className = "result show";
    resEl.innerHTML = "<pre>📤 Mengupload foto ke hosting...</pre>";

    // potong coin
    try{
      const d = await coinAPI("spend", { amount: cost });
      coinCache = d.coins|0; renderCoins();
    }catch(e){
      loader.classList.remove("show");
      fgExec.disabled = false;
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>Gagal potong coin: " + escapeHTML(e.message) + "</pre>";
      return;
    }

    let success = false;
    try{
      const avatarURL = await fakeGCUploadToCatbox(selectedAvatar);
      resEl.innerHTML = "<pre>✅ Foto terupload. Memproses Fake GC...</pre>";

      const url = "https://apiii-xrina.my.id/canvas/fakegc"
        + "?pp="      + encodeURIComponent(avatarURL)
        + "&nama="    + encodeURIComponent(nama)
        + "&anggota=" + encodeURIComponent(anggota);

      const res = await fetch(url);
      if(!res.ok) throw new Error("HTTP " + res.status);

      const blob = await res.blob();
      const objURL = URL.createObjectURL(blob);
      lastResult = {
        type: "image",
        data: objURL,
        filename: "fakegc_" + nama.replace(/\s+/g,"_") + "_" + Date.now() + ".png"
      };
      resEl.className = "result show ok";
      resEl.innerHTML = '<img src="' + objURL + '" alt="fake gc">';
      success = true;

    }catch(err){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
    }finally{
      loader.classList.remove("show");
      fgExec.disabled = false;
      if(!success){
        try{
          const d = await coinAPI("refund", { amount: cost });
          coinCache = d.coins|0; renderCoins();
        }catch(e){ console.warn("refund gagal", e); }
        const note = document.createElement("div");
        note.style.marginTop = "10px";
        note.style.color = "#fbbf24";
        note.style.fontSize = ".78rem";
        note.textContent = "🪙 Coin dikembalikan karena gagal.";
        resEl.appendChild(note);
      }
      showDownload();
    }
  });
}
/* ============================================================
   FAKE FF — 3 mode: Cowo, Cewe, Duo
   ============================================================ */
function renderFakeFF(){
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 1 coin / pakai";

  execBtn.style.display = "none";
  extra.style.display = "flex";
  extra.innerHTML = '<button class="btn btn-primary" id="ffExec" type="button">✨ Buat Fake FF</button>';

  let mode = "cowo"; // cowo | cewe | duo

  wrap.innerHTML = `
    <div class="field">
      <label>Mode</label>
      <select id="ffMode">
        <option value="cowo">Cowo (Fake Lobby FF)</option>
        <option value="cewe">Cewe (Fake FF Cewe)</option>
        <option value="duo">Duo (Fake FF Duo)</option>
      </select>
    </div>
    <div id="ffFields"></div>
  `;

  const modeSel = document.getElementById("ffMode");
  const fieldsEl = document.getElementById("ffFields");

  function renderFields(){
    if(mode === "cowo"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nickname</label>
          <input type="text" id="ffNick" placeholder="PlayerOne" maxlength="20">
        </div>
      `;
    } else if(mode === "cewe"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Username</label>
          <input type="text" id="ffUsn" placeholder="FebzTzy" maxlength="20">
        </div>
      `;
    } else {
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nama 1</label>
          <input type="text" id="ffName1" placeholder="FebzTzy" maxlength="15">
        </div>
        <div class="field">
          <label>Nama 2</label>
          <input type="text" id="ffName2" placeholder="feb" maxlength="15">
        </div>
      `;
    }
  }

  modeSel.addEventListener("change", () => {
    mode = modeSel.value;
    renderFields();
  });
  renderFields();

  document.getElementById("ffExec").addEventListener("click", async () => {
    const resEl = document.getElementById("mResult");
    const loader = document.getElementById("mLoader");

    let url = "";
    let fname = "";

    if(mode === "cowo"){
      const nick = (document.getElementById("ffNick")?.value || "").trim();
      if(!nick){ resEl.className="result show err"; resEl.innerHTML="<pre>⚠️ Isi Nickname dulu.</pre>"; return; }
      url = BASE + "/maker/fakelobyff?nickname=" + encodeURIComponent(nick);
      fname = "fakelobyff_" + nick.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
    } else if(mode === "cewe"){
      const usn = (document.getElementById("ffUsn")?.value || "").trim();
      if(!usn){ resEl.className="result show err"; resEl.innerHTML="<pre>⚠️ Isi Username dulu.</pre>"; return; }
      url = "https://apiii-xrina.my.id/canvas/fakeff2?usn=" + encodeURIComponent(usn);
      fname = "fakeff_cewe_" + usn.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
    } else {
      const n1 = (document.getElementById("ffName1")?.value || "").trim();
      const n2 = (document.getElementById("ffName2")?.value || "").trim();
      if(!n1 || !n2){ resEl.className="result show err"; resEl.innerHTML="<pre>⚠️ Isi kedua nama dulu.</pre>"; return; }
      url = "https://apiii-xrina.my.id/canvas/fakeffduo?name1=" + encodeURIComponent(n1) + "&name2=" + encodeURIComponent(n2);
      fname = "fakeff_duo_" + n1.replace(/\s+/g,"_") + "_" + n2.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
    }

    const cost = 1;
    if(getCoins() < cost){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>🪙 Coin tidak cukup. Butuh 1 coin.</pre>";
      return;
    }

    loader.classList.add("show");
    document.getElementById("ffExec").disabled = true;
    resEl.className = "result show";
    resEl.innerHTML = "<pre>Memproses...</pre>";

    try{
      const d = await coinAPI("spend", { amount: cost });
      coinCache = d.coins|0; renderCoins();
    }catch(e){
      loader.classList.remove("show");
      document.getElementById("ffExec").disabled = false;
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>Gagal potong coin: " + escapeHTML(e.message) + "</pre>";
      return;
    }

    let success = false;
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error("HTTP " + res.status);

      const blob = await res.blob();
      const objURL = URL.createObjectURL(blob);
      lastResult = {
        type: "image",
        data: objURL,
        filename: fname
      };
      resEl.className = "result show ok";
      resEl.innerHTML = '<img src="' + objURL + '" alt="fake ff">';
      success = true;

    }catch(err){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
    }finally{
      loader.classList.remove("show");
      document.getElementById("ffExec").disabled = false;
      if(!success){
        try{
          const d = await coinAPI("refund", { amount: cost });
          coinCache = d.coins|0; renderCoins();
        }catch(e){ console.warn("refund gagal", e); }
        const note = document.createElement("div");
        note.style.marginTop = "10px";
        note.style.color = "#fbbf24";
        note.style.fontSize = ".78rem";
        note.textContent = "🪙 Coin dikembalikan karena gagal.";
        resEl.appendChild(note);
      }
      showDownload();
    }
  });
}

/* --- daftar sub-mode FAKE TOOLS --- */
const FAKETOOLS_MODES = [
  { value:"ff_cowo", label:"Fake Lobby FF — Cowo" },
  { value:"ff_cewe", label:"Fake Lobby FF — Cewe" },
  { value:"ff_duo",  label:"Fake Lobby FF — Duo" },
  { value:"dana",    label:"Fake Dana" },
  { value:"jago",    label:"Fake Bank Jago" },
  { value:"ovo",     label:"Fake OVO" },
  { value:"gopay",   label:"Fake GoPay" },
  { value:"ml",      label:"Fake Mobile Legends" },
  { value:"story",   label:"Fake Story" },
  { value:"gc",      label:"Fake GC" },
  { value:"dev",     label:"Fake Dev" },
  { value:"tele",    label:"Fake Telegram" },
  { value:"call_ios",     label:"Fake Call — iOS" },
  { value:"call_android", label:"Fake Call — Android" },
];

/* ============================================================
   FAKE TOOLS — kumpulan semua fitur fake dalam satu modal
   (semua pakai input URL foto, tidak ada upload galeri)
   ============================================================ */
function renderFakeTools(){
  const wrap   = document.getElementById("mFields");
  const extra  = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 1 coin / pakai";

  execBtn.style.display = "none";
  extra.style.display = "flex";
  extra.innerHTML = '<button class="btn btn-primary" id="ftExec" type="button">✨ Buat</button>';

  let mode = "ff_cowo";

  wrap.innerHTML = `
    <div class="field">
      <label>Pilih Fitur</label>
      <select id="ftMode">
        ${FAKETOOLS_MODES.map(m => `<option value="${m.value}">${m.label}</option>`).join("")}
      </select>
    </div>
    <div id="ftFields"></div>
  `;

  const modeSel  = document.getElementById("ftMode");
  const fieldsEl = document.getElementById("ftFields");
  const ftExec   = document.getElementById("ftExec");

  /* helper input URL foto */
  const urlInput = (id, label) => `
    <div class="field">
      <label>${label || "URL Foto"}</label>
      <input type="text" id="${id}" placeholder="https://files.catbox.moe/xxx.jpg">
    </div>
  `;

  /* ===== RENDER FIELD SESUAI MODE ===== */
  function renderFields(){
    if(mode === "ff_cowo"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nickname</label>
          <input type="text" id="ftNick" placeholder="PlayerOne" maxlength="20">
        </div>`;
    } else if(mode === "ff_cewe"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Username</label>
          <input type="text" id="ftUsn" placeholder="FebzTzy" maxlength="20">
        </div>`;
    } else if(mode === "ff_duo"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nama 1</label>
          <input type="text" id="ftName1" placeholder="FebzTzy" maxlength="15">
        </div>
        <div class="field">
          <label>Nama 2</label>
          <input type="text" id="ftName2" placeholder="feb" maxlength="15">
        </div>`;
    } else if(mode === "dana"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nominal (Rp)</label>
          <input type="number" id="ftNominal" placeholder="1000000">
        </div>`;
    } else if(mode === "jago"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nama Pemilik</label>
          <input type="text" id="ftNama" placeholder="Budi Santoso" maxlength="30">
        </div>
        <div class="field">
          <label>Saldo (Rp)</label>
          <input type="number" id="ftSaldo" placeholder="5000000">
        </div>`;
    } else if(mode === "ovo"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Nominal OVO (Rp)</label>
          <input type="number" id="ftOvoNominal" placeholder="5000" value="5000" min="1">
        </div>`;
    } else if(mode === "gopay"){
      fieldsEl.innerHTML = `
        <div class="field">
          <label>Saldo (Rp)</label>
          <input type="number" id="ftGpSaldo" placeholder="400" value="400" min="0">
        </div>
        <div class="field">
          <label>Koin</label>
          <input type="number" id="ftGpKoin" placeholder="120" value="120" min="0">
        </div>
        <div class="field">
          <label>Terpakai (Rp)</label>
          <input type="number" id="ftGpTerpakai" placeholder="500" value="500" min="0">
        </div>
        <div class="field">
          <label>Bulan</label>
          <input type="text" id="ftGpBulan" placeholder="Juli" value="Juli" maxlength="15">
        </div>`;
    } else if(mode === "ml"){
      fieldsEl.innerHTML = `
        ${urlInput("ftAvatar", "URL Avatar")}
        <div class="field">
          <label>Nickname</label>
          <input type="text" id="ftMlNick" placeholder="MLPlayer" maxlength="20">
        </div>`;
    } else if(mode === "story"){
      fieldsEl.innerHTML = `
        ${urlInput("ftAvatar", "URL Avatar")}
        <div class="field">
          <label>Username</label>
          <input type="text" id="ftStoryUser" placeholder="username_ig" maxlength="20">
        </div>
        <div class="field">
          <label>Caption</label>
          <textarea id="ftCaption" placeholder="tulis caption di sini" maxlength="200"></textarea>
        </div>`;
    } else if(mode === "gc"){
      fieldsEl.innerHTML = `
        ${urlInput("ftGcAvatar", "URL Foto Avatar Grup")}
        <div class="field">
          <label>Nama Grup</label>
          <input type="text" id="ftGcNama" placeholder="Febz Family" maxlength="30">
        </div>
        <div class="field">
          <label>Jumlah Anggota</label>
          <input type="number" id="ftGcAnggota" placeholder="20" value="20" min="1" max="9999">
        </div>`;
    } else if(mode === "dev"){
      fieldsEl.innerHTML = `
        ${urlInput("ftDevAvatar", "URL Foto")}
        <div class="field">
          <label>Teks Melengkung</label>
          <input type="text" id="ftDevText" placeholder="DEVELOPER" maxlength="20" value="DEVELOPER">
        </div>
        <div class="field" style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-ft-chip="DEVELOPER">DEVELOPER</button>
          <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-ft-chip="OWNER">OWNER</button>
          <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-ft-chip="ADMIN">ADMIN</button>
          <button type="button" class="btn btn-ghost" style="flex:0 0 auto;padding:6px 10px;font-size:.72rem" data-ft-chip="FEBZTZY">FEBZTZY</button>
        </div>`;
      fieldsEl.querySelectorAll("[data-ft-chip]").forEach(b => {
        b.addEventListener("click", () => {
          const inp = document.getElementById("ftDevText");
          if(inp) inp.value = b.dataset.ftChip || "";
        });
      });
    } else if(mode === "tele"){
      fieldsEl.innerHTML = `
        ${urlInput("ftTeleAvatar", "URL Foto Avatar")}
        <div class="field">
          <label>Nama</label>
          <input type="text" id="ftTeleNama" placeholder="FebzTzy" maxlength="30">
        </div>
        <div class="field">
          <label>Nomor Telepon</label>
          <input type="text" id="ftTeleNomor" placeholder="0812345678" maxlength="20">
        </div>
        <div class="field">
          <label>Bio</label>
          <input type="text" id="ftTeleBio" placeholder="By FebzTzy" maxlength="70">
        </div>
        <div class="field">
          <label>Username</label>
          <input type="text" id="ftTeleUser" placeholder="police_55" maxlength="32">
        </div>`;
    } else if(mode === "call_ios" || mode === "call_android"){
      fieldsEl.innerHTML = `
        ${urlInput("ftCallAvatar", "URL Foto Avatar")}
        <div class="field">
          <label>Nama Penelepon</label>
          <input type="text" id="ftCallNama" placeholder="FebzTzy" maxlength="30">
        </div>
        <div class="field">
          <label>Durasi</label>
          <input type="text" id="ftCallDurasi" placeholder="01:00:11" value="01:00:11" maxlength="10">
        </div>`;
    }
  }

  modeSel.addEventListener("change", () => {
    mode = modeSel.value;
    renderFields();
  });
  renderFields();

  /* ===== EXECUTE ===== */
  ftExec.addEventListener("click", async () => {
    const resEl = document.getElementById("mResult");
    const loader = document.getElementById("mLoader");

    let url = "";
    let fname = "";

    try{
      /* ---- Cowo ---- */
      if(mode === "ff_cowo"){
        const nick = (document.getElementById("ftNick")?.value || "").trim();
        if(!nick) throw new Error("Isi Nickname dulu.");
        url = BASE + "/maker/fakelobyff?nickname=" + encodeURIComponent(nick);
        fname = "fakelobyff_" + nick.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Cewe ---- */
      else if(mode === "ff_cewe"){
        const usn = (document.getElementById("ftUsn")?.value || "").trim();
        if(!usn) throw new Error("Isi Username dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakeff2?usn=" + encodeURIComponent(usn);
        fname = "fakeff_cewe_" + usn.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Duo ---- */
      else if(mode === "ff_duo"){
        const n1 = (document.getElementById("ftName1")?.value || "").trim();
        const n2 = (document.getElementById("ftName2")?.value || "").trim();
        if(!n1 || !n2) throw new Error("Isi kedua nama dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakeffduo?name1=" + encodeURIComponent(n1) + "&name2=" + encodeURIComponent(n2);
        fname = "fakeff_duo_" + n1.replace(/\s+/g,"_") + "_" + n2.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Dana ---- */
      else if(mode === "dana"){
        const nom = (document.getElementById("ftNominal")?.value || "").trim();
        if(!nom) throw new Error("Isi Nominal dulu.");
        url = BASE + "/maker/fakedana?nominal=" + encodeURIComponent(nom);
        fname = "fakedana_" + nom + "_" + Date.now() + ".png";
      }
      /* ---- Bank Jago ---- */
      else if(mode === "jago"){
        const nama = (document.getElementById("ftNama")?.value || "").trim();
        const saldo = (document.getElementById("ftSaldo")?.value || "").trim();
        if(!nama || !saldo) throw new Error("Isi Nama & Saldo dulu.");
        url = BASE + "/maker/fakebank-jago?nama=" + encodeURIComponent(nama) + "&saldo=" + encodeURIComponent(saldo);
        fname = "fakebankjago_" + nama.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- OVO ---- */
      else if(mode === "ovo"){
        const nominal = (document.getElementById("ftOvoNominal")?.value || "").trim();
        if(!nominal || isNaN(Number(nominal)) || Number(nominal) < 1) throw new Error("Isi Nominal yang valid.");
        url = "https://apiii-xrina.my.id/canvas/fakeovo?nominal=" + encodeURIComponent(nominal);
        fname = "fakeovo_" + nominal + "_" + Date.now() + ".png";
      }
      /* ---- GoPay ---- */
      else if(mode === "gopay"){
        const saldo    = (document.getElementById("ftGpSaldo")?.value || "").trim();
        const koin     = (document.getElementById("ftGpKoin")?.value || "").trim();
        const terpakai = (document.getElementById("ftGpTerpakai")?.value || "").trim();
        const bulan    = (document.getElementById("ftGpBulan")?.value || "").trim();
        if(!saldo || !koin || !terpakai || !bulan) throw new Error("Isi semua kolom GoPay dulu.");
        url = "https://apiii-xrina.my.id/canvas/fakegopay"
          + "?saldo="     + encodeURIComponent(saldo)
          + "&koin="      + encodeURIComponent(koin)
          + "&terpakai="  + encodeURIComponent(terpakai)
          + "&bulan="     + encodeURIComponent(bulan);
        fname = "fakegopay_" + saldo + "_" + Date.now() + ".png";
      }
      /* ---- Mobile Legends ---- */
      else if(mode === "ml"){
        const av = (document.getElementById("ftAvatar")?.value || "").trim();
        const nick = (document.getElementById("ftMlNick")?.value || "").trim();
        if(!av || !nick) throw new Error("Isi URL Avatar & Nickname dulu.");
        url = BASE + "/maker/fakelobyml?avatar=" + encodeURIComponent(av) + "&nickname=" + encodeURIComponent(nick);
        fname = "fakelobyml_" + nick.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Story ---- */
      else if(mode === "story"){
        const av = (document.getElementById("ftAvatar")?.value || "").trim();
        const user = (document.getElementById("ftStoryUser")?.value || "").trim();
        const cap = (document.getElementById("ftCaption")?.value || "").trim();
        if(!av || !user || !cap) throw new Error("Isi semua kolom Story dulu.");
        url = BASE + "/maker/fakestory?avatar=" + encodeURIComponent(av) + "&username=" + encodeURIComponent(user) + "&caption=" + encodeURIComponent(cap);
        fname = "fakestory_" + user.replace(/[^a-z0-9]/gi,"_") + "_" + Date.now() + ".png";
      }
      /* ---- GC ---- */
      else if(mode === "gc"){
        const av = (document.getElementById("ftGcAvatar")?.value || "").trim();
        const nama = (document.getElementById("ftGcNama")?.value || "").trim();
        const anggota = (document.getElementById("ftGcAnggota")?.value || "").trim();
        if(!av) throw new Error("Isi URL Foto Avatar Grup dulu.");
        if(!nama) throw new Error("Isi Nama Grup dulu.");
        if(!anggota || isNaN(Number(anggota)) || Number(anggota) < 1) throw new Error("Isi Jumlah Anggota yang valid.");
        url = "https://apiii-xrina.my.id/canvas/fakegc"
          + "?pp=" + encodeURIComponent(av)
          + "&nama=" + encodeURIComponent(nama)
          + "&anggota=" + encodeURIComponent(anggota);
        fname = "fakegc_" + nama.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Dev (pakai URL langsung ke canvas) ---- */
      else if(mode === "dev"){
        const av = (document.getElementById("ftDevAvatar")?.value || "").trim();
        const text = (document.getElementById("ftDevText")?.value || "").trim().toUpperCase();
        if(!av) throw new Error("Isi URL Foto dulu.");
        if(!text) throw new Error("Isi teks melengkung dulu.");

        // potong coin dulu
        const cost = 1;
        if(getCoins() < cost) throw new Error("Coin tidak cukup.");
        loader.classList.add("show");
        ftExec.disabled = true;

        try{
          const d = await coinAPI("spend", { amount: cost });
          coinCache = d.coins|0; renderCoins();
        }catch(e){
          loader.classList.remove("show");
          ftExec.disabled = false;
          throw e;
        }

        let ok = false;
        try{
          resEl.className = "result show";
          resEl.innerHTML = "<pre>Menyiapkan background & badge...</pre>";

          const BG_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797781960.jpeg";
          const BADGE_URL = "https://raw.githubusercontent.com/kayzzaoshi-code/Uploader/main/file_1772797710490.png";
          const loadImg = (src, cross) => new Promise((resolve, reject) => {
            const im = new Image();
            if(cross) im.crossOrigin = "anonymous";
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error("gagal load asset"));
            im.src = src;
          });
          const [bgImg, badgeImg] = await Promise.all([
            loadImg(BG_URL, true).catch(() => loadImg(BG_URL, false)),
            loadImg(BADGE_URL, true).catch(() => loadImg(BADGE_URL, false))
          ]);
          if(!bgImg) throw new Error("Background gagal dimuat.");

          const userImg = await loadImg(av, true).catch(() => loadImg(av, false));
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const W = 1080, H = 1080;
          canvas.width = W; canvas.height = H;
          ctx.drawImage(bgImg, 0, 0, W, H);

          const cx = W/2, cy = H/2, radius = 263;
          const side = radius * 2;
          const iw = userImg.naturalWidth || userImg.width;
          const ih = userImg.naturalHeight || userImg.height;
          const scale = Math.max(side/iw, side/ih);
          const dw = iw * scale, dh = ih * scale;
          const dx = cx - dw/2, dy = cy - dh/2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(userImg, dx, dy, dw, dh);
          ctx.restore();

          const fontSize = 72, strokeWidth = 3, arcSpan = Math.PI * 0.7;
          ctx.font = "bold " + fontSize + "px sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = "#000000";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const textRadius = radius + 75;
          const chars = text.split("");
          const n = chars.length;
          const inc = n > 1 ? arcSpan / (n - 1) : 0;
          const start = Math.PI / 2 + arcSpan / 2;
          for(let i = 0; i < n; i++){
            const ch = chars[i];
            const angle = start - i * inc;
            const x = cx + Math.cos(angle) * textRadius;
            const y = cy + Math.sin(angle) * textRadius;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle - Math.PI / 2);
            ctx.lineWidth = strokeWidth;
            ctx.strokeText(ch, 0, 0);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
          }
          if(badgeImg){
            const endAngle = start - (n - 1) * inc;
            const badgeAngle = endAngle - inc;
            const badgeSize = Math.round(fontSize * 0.9);
            const bx = cx + Math.cos(badgeAngle) * textRadius;
            const by = cy + Math.sin(badgeAngle) * textRadius;
            try{ ctx.drawImage(badgeImg, bx - badgeSize/2, by - badgeSize/2, badgeSize, badgeSize); }catch(e){}
          }

          const dataURL = canvas.toDataURL("image/png");
          lastResult = { type:"image", data:dataURL, filename:"fakedev_" + text.replace(/\s+/g,"-").slice(0,20) + "_" + Date.now() + ".png" };
          resEl.className = "result show ok";
          resEl.innerHTML = '<img src="' + dataURL + '" alt="fake dev">';
          ok = true;
          showDownload();
        }catch(err){
          resEl.className = "result show err";
          resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
        }finally{
          loader.classList.remove("show");
          ftExec.disabled = false;
          if(!ok){
            try{
              const d = await coinAPI("refund", { amount: cost });
              coinCache = d.coins|0; renderCoins();
            }catch(e){ console.warn("refund gagal", e); }
            const note = document.createElement("div");
            note.style.marginTop = "10px";
            note.style.color = "#fbbf24";
            note.style.fontSize = ".78rem";
            note.textContent = "🪙 Coin dikembalikan karena gagal.";
            resEl.appendChild(note);
          }
        }
        return;
      }
      /* ---- Telegram ---- */
      else if(mode === "tele"){
        const av     = (document.getElementById("ftTeleAvatar")?.value || "").trim();
        const nama   = (document.getElementById("ftTeleNama")?.value || "").trim();
        const nomor  = (document.getElementById("ftTeleNomor")?.value || "").trim();
        const bio    = (document.getElementById("ftTeleBio")?.value || "").trim();
        const user   = (document.getElementById("ftTeleUser")?.value || "").trim();
        if(!av) throw new Error("Isi URL Foto Avatar dulu.");
        if(!nama) throw new Error("Isi Nama dulu.");
        if(!nomor) throw new Error("Isi Nomor Telepon dulu.");
        if(!bio) throw new Error("Isi Bio dulu.");
        if(!user) throw new Error("Isi Username dulu.");
        url = "https://apiii-xrina.my.id/canvas/faketele"
          + "?pp="       + encodeURIComponent(av)
          + "&nama="     + encodeURIComponent(nama)
          + "&nomor="    + encodeURIComponent(nomor)
          + "&bio="      + encodeURIComponent(bio)
          + "&username=" + encodeURIComponent(user);
        fname = "faketele_" + user.replace(/[^a-z0-9]/gi,"_") + "_" + Date.now() + ".png";
      }
      /* ---- Call iOS / Android ---- */
      else if(mode === "call_ios" || mode === "call_android"){
        const av     = (document.getElementById("ftCallAvatar")?.value || "").trim();
        const nama   = (document.getElementById("ftCallNama")?.value || "").trim();
        const durasi = (document.getElementById("ftCallDurasi")?.value || "").trim();
        if(!av) throw new Error("Isi URL Foto Avatar dulu.");
        if(!nama) throw new Error("Isi Nama Penelepon dulu.");
        if(!durasi) throw new Error("Isi Durasi dulu (contoh: 01:00:11).");

        const endpoint = mode === "call_ios"
          ? "https://apiii-xrina.my.id/canvas/call-ios"
          : "https://apiii-xrina.my.id/canvas/call-andro";

        url = endpoint
          + "?pp="     + encodeURIComponent(av)
          + "&nama="   + encodeURIComponent(nama)
          + "&durasi=" + encodeURIComponent(durasi);

        const label = mode === "call_ios" ? "ios" : "andro";
        fname = "fakecall_" + label + "_" + nama.replace(/\s+/g,"_") + "_" + Date.now() + ".png";
      }

      /* ---- semua mode selain DEV: potong coin + fetch ---- */
      const cost = 1;
      if(getCoins() < cost) throw new Error("Coin tidak cukup. Butuh 1 coin.");

      loader.classList.add("show");
      ftExec.disabled = true;

      try{
        const d = await coinAPI("spend", { amount: cost });
        coinCache = d.coins|0; renderCoins();
      }catch(e){
        loader.classList.remove("show");
        ftExec.disabled = false;
        throw e;
      }

      let ok = false;
      try{
        resEl.className = "result show";
        resEl.innerHTML = "<pre>Memproses...</pre>";

        const res = await fetch(url);
        if(!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type:"image", data:objURL, filename:fname };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="' + objURL + '" alt="fake">';
        ok = true;
        showDownload();
      }catch(err){
        resEl.className = "result show err";
        resEl.innerHTML = "<pre>❌ " + escapeHTML(err.message) + "</pre>";
      }finally{
        loader.classList.remove("show");
        ftExec.disabled = false;
        if(!ok){
          try{
            const d = await coinAPI("refund", { amount: cost });
            coinCache = d.coins|0; renderCoins();
          }catch(e){ console.warn("refund gagal", e); }
          const note = document.createElement("div");
          note.style.marginTop = "10px";
          note.style.color = "#fbbf24";
          note.style.fontSize = ".78rem";
          note.textContent = "🪙 Coin dikembalikan karena gagal.";
          resEl.appendChild(note);
        }
      }

    }catch(err){
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>⚠️ " + escapeHTML(err.message) + "</pre>";
    }
  });
}
/* ============================================================
   TOPBAR EVENTS & INIT
   ============================================================ */
function bindTopbar(){
  const ci = document.getElementById("checkinBtn");
  if(ci) ci.onclick = openCheckin;
  const rd = document.getElementById("redeemBtn");
  if(rd) rd.onclick = openRedeem;
  const wa = document.getElementById("waBtn");
  if(wa) wa.onclick = () => {
    const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    const msg = WA_MSG_BUG + "\n\n" + WA_MSG_BUY;
    const url = mobile ? "https://wa.me/"+OWNER_WA+"?text="+encodeURIComponent(msg)
                       : "https://web.whatsapp.com/send?phone="+OWNER_WA+"&text="+encodeURIComponent(msg);
    window.open(url, "_blank");
  };
  const rs = document.getElementById("redeemSubmit");
  if(rs) rs.onclick = submitRedeem;
  const ri = document.getElementById("redeemInput");
  if(ri) ri.addEventListener("keydown", e => { if(e.key === "Enter") submitRedeem(); });
}

bindTopbar();
refreshCoins();
setInterval(refreshCoins, 30000);
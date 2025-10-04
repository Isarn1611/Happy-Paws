// Key used to store pet data in localStorage
const STORAGE_KEY = "happyPaws.pets";

// Shortcuts for DOM selection
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* =========================
   Load demo posts (once)
========================= */
async function loadDemoPosts(){
  // ถ้ามีข้อมูลแล้ว ไม่ต้อง seed
  let current = [];
  try { current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch {}
  if (Array.isArray(current) && current.length) return;

  try {
    const res = await fetch("posts.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("invalid posts.json");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("Loaded demo posts:", data.length);
  } catch(err){
    console.error("loadDemoPosts failed:", err);
  }
}

/* =========================
   Local Storage Helpers
========================= */
function loadPets(){ 
  try { 
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; 
  } catch { 
    return []; 
  } 
}
function savePets(list){ 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); 
}
function escapeHtml(s=""){ 
  return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m])); 
}

/* =========================
   Inline Placeholder Image (SVG)
========================= */
const INLINE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520">
    <rect width="100%" height="100%" fill="#ddd"/>
    <text x="50%" y="50%" font-size="28" text-anchor="middle" fill="#666" dy=".3em">No Image</text>
  </svg>`);

/* =========================
   Animal Type Cards (A11y)
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".animal-card:not(.add-card)");

    const setActive = (selected) => { 
        cards.forEach(c => c.classList.remove("is-active")); 
        selected?.classList.add("is-active"); 
    };
  // Handle card selection (toggle on/off)
    const selectType = (card) => {
        const type = card.dataset.type;
        const alreadyActive = card.classList.contains("is-active");
        if (alreadyActive) {
            cards.forEach(c => c.classList.remove("is-active"));
            window.applyAnimalFilter?.(""); 
        } else {
            setActive(card);
            window.applyAnimalFilter?.(type);
        }
    };
    cards.forEach(card => {
        card.setAttribute("role","button");
        card.setAttribute("tabindex","0");
        card.addEventListener("click", () => selectType(card));
        card.addEventListener("keydown", (e)=>{
        if (e.key==="Enter" || e.key===" ") { e.preventDefault(); selectType(card); }
        });
    });
});

/* =========================
   Feed Logic (Posts + Pagination)
========================= */
const FEED_PAGE_SIZE = 6;
let currentType = "";
let currentRegion = "";
let feedAll = [];
let feedCursor = 0;

function normalizeType(t){
    const s = String(t||"").toLowerCase();
    if (["dog","หมา","สุนัข"].includes(s)) return "Dog";
    if (["cat","แมว"].includes(s)) return "Cat";
    if (["bird","นก"].includes(s)) return "Bird";
    return "Other";
}
function normalizeRegion(r){
    const v = String(r||"").trim();
    const WHITELIST = ["Bangkok","Northern","NorthEast","Central","East","South"];
    return WHITELIST.includes(v) ? v : "Empty";
}

// Load and format pet data from localStorage  (✅ รับ isDemo มาด้วย)
function getData(){
    return loadPets().map(p => ({
        id: p.id,
        name: p.name || "(no name)",
        type: normalizeType(p.type),
        region: normalizeRegion(p.region),
        desc: p.desc || "",
        image: p.image || INLINE_PLACEHOLDER,
        createdAt: p.createdAt || 0,
        isDemo: !!p.isDemo       // <<<<<< สำคัญ
    }));
}
function typeClass(t){
    const x = (t||"").toLowerCase();
    if (x==="dog") return "feed-badge dog";
    if (x==="cat") return "feed-badge cat";
    if (x==="bird") return "feed-badge bird";
    return "feed-badge";
}

// Render a “page” of posts  (✅ ซ่อนปุ่มลบถ้าเป็น demo)
function renderChunk(){
    const wrap = $("#feed-cards");
    const end = Math.min(feedCursor + FEED_PAGE_SIZE, feedAll.length);

    for (let i = feedCursor; i < end; i++){
        const it = feedAll[i];
        const card = document.createElement("article");
        card.className = "feed-card";
        card.innerHTML = `
        <img src="${it.image}" alt="${escapeHtml(it.name)}">
        <div class="body">
            <div style="display:flex; gap:6px; flex-wrap:wrap">
            <span class="${typeClass(it.type)}">${escapeHtml(it.type)}</span>
            <span class="feed-badge region">${escapeHtml(it.region)}</span>
            </div>
            <h3 style="margin:6px 0 0">${escapeHtml(it.name)}</h3>
            <p class="feed-meta">${escapeHtml(it.desc || "")}</p>
            <div style="display:flex; gap:8px; margin-top:6px; justify-content:flex-end">
            ${it.isDemo ? "" : `<button class="ghost danger" data-act="delete" data-id="${it.id}">Delete</button>`}
            </div>
        </div>
        `;
        wrap.appendChild(card);
    }

    feedCursor = end;
    $("#feed-count").textContent = `${feedAll.length} list`;
    $("#feed-empty").textContent = feedAll.length ? "" : "+ Add Post";
    $("#feed-more").style.display = feedCursor < feedAll.length ? "inline-flex" : "none";
}
function clearFeed(){
    $("#feed-cards").innerHTML = "";
    $("#feed-count").textContent = "0 list";
    $("#feed-empty").textContent = "Add Post";
    feedCursor = 0;
}
function renderFeed(list){ 
    feedAll = list.slice(); 
    clearFeed(); 
    renderChunk(); 
}
function applyFilter(){
    let list = getData().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if (currentType)   list = list.filter(x => x.type === currentType);
    if (currentRegion) list = list.filter(x => x.region === currentRegion);
    renderFeed(list);
}
window.applyAnimalFilter = (type)=>{ 
    currentType = type || ""; 
    applyFilter(); 
};

// ========================
// Delete post handler (✅ กันลบ demo)
// ========================
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button.ghost.danger");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const list = loadPets();
    const post = list.find(x => x.id === id);

    if (post?.isDemo) {
        alert("This is a demo post and cannot be deleted.");
        return;
    }

    if (!confirm("Confirm delete this post?")) return;

    const newList = list.filter(x => x.id !== id);
    savePets(newList);
    applyFilter();
});

/* =========================
   Add Post Modal (Popup Form)
========================= */
(()=>{
    const btnOpen  = $("#btnAddPet"),
    modal    = $("#postModal"),
    btnClose = $("#postClose"),
    btnCancel= $("#postCancel"),
    form     = $("#postForm");

    if (!btnOpen || !modal || !form) return;

    const open = ()=>{
            modal.hidden = false;
            requestAnimationFrame(()=> modal.classList.add("is-open"));
            document.body.style.overflow = "hidden";
            setTimeout(()=> form.querySelector("input,select,textarea")?.focus(), 60);
    };
    const close = ()=>{
            modal.classList.remove("is-open");
            const onDone = ()=>{ 
            modal.hidden = true; 
            modal.removeEventListener("transitionend", onDone); 
            };
            modal.addEventListener("transitionend", onDone);
            document.body.style.overflow = "";
            form.reset();
    };

    btnOpen.addEventListener("click", open);
    btnClose.addEventListener("click", close);
    btnCancel.addEventListener("click", close);

    modal.addEventListener("click", (e)=>{ if(e.target===modal) close(); });
    document.addEventListener("keydown", (e)=>{ if(!modal.hidden && e.key==="Escape") close(); });

    // Form submission handler
    form.addEventListener("submit", (e)=>{
        e.preventDefault();
        const fd = new FormData(form);
        const name   = String(fd.get("name")||"").trim();
        const type   = String(fd.get("type")||"").trim();
        const region = String(fd.get("region")||"").trim();
        const desc   = String(fd.get("desc")||"").trim();
        const file   = fd.get("file");

        // Validate all required inputs
        if(!name || !type || !region || !(file instanceof File) || !file.size){
            alert("Please input name/type/region and select an image");
            return;
        }

        // Convert selected image to base64 string
        const reader = new FileReader();
        reader.onload = ()=>{
            const base64 = reader.result;
            const list = loadPets();
            list.unshift({
                id: crypto.randomUUID(),
                name, type, region, desc,
                image: base64,
                createdAt: Date.now()
            });
            savePets(list);
            close();
            applyFilter(); // ✅ รีเฟรช feed ทันทีหลังเพิ่มโพสต์
        };
        reader.onerror = ()=> alert("Can't use this file");
        reader.readAsDataURL(file);
    });

})();

/* =========================
   Boot Initialization
========================= */
document.addEventListener("DOMContentLoaded", async ()=>{
    // seed demo once
    await loadDemoPosts();

    // “Load More” button for pagination
    $("#feed-more")?.addEventListener("click", renderChunk);

    // Region filter dropdown
    const regionSel = $("#regionFilter");
    if (regionSel){
        regionSel.addEventListener("change", ()=>{
        currentRegion = regionSel.value || "";
        applyFilter();
        });
    }

    // First render
    applyFilter();
});

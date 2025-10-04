// Key used to store pet data in localStorage
const STORAGE_KEY = "happyPaws.pets";

// Shortcuts for DOM selection
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* =========================
   Local Storage Helpers
========================= */

// Load the pet list from localStorage (returns [] if nothing or parse fails)
function loadPets(){ 
    try { 
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; 
    } catch { 
        return []; 
    } 
}

// Save a pet list back into localStorage
function savePets(list){ 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); 
}

// Sanitize text to prevent XSS attacks (replace HTML special chars)
function escapeHtml(s=""){ 
    return String(s).replace(/[&<>"']/g, m => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
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
   Animal Type Cards
   - Makes cards accessible (keyboard + screen reader)
   - Calls filter function when a card is selected
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".animal-card:not(.add-card)");

    // Highlight the selected card
    const setActive = (selected) => { 
        cards.forEach(c => c.classList.remove("is-active")); 
        selected?.classList.add("is-active"); 
    };

    // Handle card selection
    const selectType = (card) => { 
        const type = card.dataset.type; 
        setActive(card); 
        window.applyAnimalFilter?.(type); // global filter function
    };

    // Make each card focusable and clickable
    cards.forEach(card => {
        card.setAttribute("role","button");  // for screen readers
        card.setAttribute("tabindex","0");   // allows keyboard focus
        card.addEventListener("click", () => selectType(card));
        card.addEventListener("keydown", (e)=>{
            if (e.key==="Enter" || e.key===" ") { // Enter or Space key
                e.preventDefault();
                selectType(card);
            }
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

// Normalize animal type names
function normalizeType(t){
    const s = String(t||"").toLowerCase();
    if (["dog","หมา","สุนัข"].includes(s)) return "Dog";
    if (["cat","แมว"].includes(s)) return "Cat";
    if (["bird","นก"].includes(s)) return "Bird";
    return "Other";
}

// Normalize region name (only allow whitelist)
function normalizeRegion(r){
    const v = String(r||"").trim();
    const WHITELIST = ["Bangkok","Northern","NorthEast","Central","East","South"];
    return WHITELIST.includes(v) ? v : "Empty";
}

// Load and format pet data from localStorage
function getData(){
    return loadPets().map(p => ({
        id: p.id,
        name: p.name || "(no name)",
        type: normalizeType(p.type),
        region: normalizeRegion(p.region),
        desc: p.desc || "",
        image: p.image || INLINE_PLACEHOLDER,
        createdAt: p.createdAt || 0
    }));
}

// Return badge class based on type
function typeClass(t){
    const x = (t||"").toLowerCase();
    if (x==="dog") return "feed-badge dog";
    if (x==="cat") return "feed-badge cat";
    if (x==="bird") return "feed-badge bird";
    return "feed-badge";
}

// Render a “page” of posts
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
              <button class="ghost danger" data-act="delete" data-id="${it.id}">Delete</button>
            </div>
        </div>
        `;
        wrap.appendChild(card);
    }

    // Update UI info
    feedCursor = end;
    $("#feed-count").textContent = `${feedAll.length} list`;
    $("#feed-empty").textContent = feedAll.length ? "" : "+ Add Post";
    $("#feed-more").style.display = feedCursor < feedAll.length ? "inline-flex" : "none";
}

// Clear all feed content
function clearFeed(){
    $("#feed-cards").innerHTML = "";
    $("#feed-count").textContent = "0 list";
    $("#feed-empty").textContent = "Add Post";
    feedCursor = 0;
}

// Render the full feed (after filtering)
function renderFeed(list){ 
    feedAll = list.slice(); 
    clearFeed(); 
    renderChunk(); 
}

// Filter posts by type and region
function applyFilter(){
    let list = getData().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); // newest first
    if (currentType)   list = list.filter(x => x.type === currentType);
    if (currentRegion) list = list.filter(x => x.region === currentRegion);
    renderFeed(list);
}

// Global function for filtering by animal type (used above)
window.applyAnimalFilter = (type)=>{ 
    currentType = type || ""; 
    applyFilter(); 
};

// Delete post handler
document.addEventListener("click", (e)=>{
    const btn = e.target.closest("button.ghost.danger");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (!confirm("Confirm delete the post")) return;

    const list = loadPets().filter(x => x.id !== id);
    savePets(list);
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

    if (!btnOpen || !modal || !form) return; // safety check

    // Open modal window
    const open = ()=>{
        modal.hidden = false;
        requestAnimationFrame(()=> modal.classList.add("is-open"));
        document.body.style.overflow = "hidden"; // disable scroll
        setTimeout(()=> form.querySelector("input,select,textarea")?.focus(), 60);
    };

    // Close modal window
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

    // Button bindings
    btnOpen.addEventListener("click", open);
    btnClose.addEventListener("click", close);
    btnCancel.addEventListener("click", close);

    // Close modal when clicking outside of content
    modal.addEventListener("click", (e)=>{ if(e.target===modal) close(); });

    // Close modal with Escape key
    document.addEventListener("keydown", (e)=>{ 
        if(!modal.hidden && e.key==="Escape") close(); 
    });

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
            applyFilter();
        };
        reader.onerror = ()=> alert("Can't use this file");
        reader.readAsDataURL(file);
    });
})();

/* =========================
   Boot Initialization
========================= */
document.addEventListener("DOMContentLoaded", ()=>{
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

    // Initial feed render on page load
    applyFilter();
});

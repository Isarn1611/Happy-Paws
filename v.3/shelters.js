/***************
 * shelters.js
 * - Fetch shelters.json
 * - Render cards, search, province filter, load more
 ***************/
const $  = (s, r = document) => r.querySelector(s);                // Query single element
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));  // Query multiple elements
const S_PAGE = 9;                                                   // Page size for "Load more"

let ALL = [];   // Entire dataset from shelters.json (sanitized)
let VIEW = [];  // Filtered/queried subset currently being shown
let cursor = 0; // Current paging cursor within VIEW

/**
 * Escape minimal HTML special chars to avoid injection when building strings.
 * @param {string} [s=""]
 * @returns {string}
 */
function esc(s = ""){ 
  return String(s).replace(/[&<>"']/g, m => ({ 
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;'
  }[m])); 
}

/**
 * Build a shelter card’s HTML string.
 * Note: buttons/links are conditionally shown only if corresponding data exists.
 * @param {Object} x - Shelter record (already sanitized to strings)
 * @returns {string} HTML for one card
 */
function cardHTML(x){
  const siteBtn = x.site 
    ? `<a class="btn small" href="${esc(x.site)}" target="_blank" rel="noopener">Website</a>` 
    : "";
  const fbBtn   = x.facebook 
    ? `<a class="btn small" href="${esc(x.facebook)}" target="_blank" rel="noopener">Facebook</a>` 
    : "";
  const dnBtn   = x.donate 
    ? `<a class="btn small primary" href="${esc(x.donate)}" target="_blank" rel="noopener">Donate</a>` 
    : "";
  const tel     = x.phone 
    ? `<a class="btn small ghost" href="tel:${esc(x.phone)}"><i class="fa-solid fa-phone"></i> phone call</a>` 
    : "";

  return `
  <article class="s-card">
    <!-- Hide the <img> if it fails to load -->
    <img class="s-img" src="${esc(x.image||'')}" alt="${esc(x.name)}" onerror="this.style.display='none'">
    <div class="s-body">
      <div class="s-top">
        <span class="s-chip">${esc(x.province||'-')}</span>
        ${x.area ? `<span class="s-chip soft">${esc(x.area)}</span>` : ""}
      </div>
      <h3 class="s-name">${esc(x.name)}</h3>
      <p class="s-about">${esc(x.about||"")}</p>
      <div class="s-actions">
        ${siteBtn} ${fbBtn} ${dnBtn} ${tel}
      </div>
    </div>
  </article>`;
}

/**
 * Render the next "page" of cards from VIEW into the list container.
 * Updates cursor, count text, and the visibility of the "Load more" button.
 */
function renderChunk(){
  const wrap = $("#shelter-list");
  const end = Math.min(cursor + S_PAGE, VIEW.length);

  for (let i = cursor; i < end; i++){
    wrap.insertAdjacentHTML("beforeend", cardHTML(VIEW[i]));
  }

  cursor = end;
  $("#s-count").textContent = VIEW.length; // total count after filtering
  $("#s-more").style.display = cursor < VIEW.length ? "inline-flex" : "none";
}

/**
 * Clear list UI and reset paging to start.
 */
function clearList(){
  $("#shelter-list").innerHTML = "";
  cursor = 0;
  $("#s-count").textContent = "0";
  $("#s-more").style.display = "none";
}

/**
 * Apply search (q) and province filter, then re-render from the beginning.
 * - Search matches against name/about/area/province (case-insensitive).
 * - Province filter is exact match.
 */
function applyFilter(){
  const q = ($("#q")?.value || "").trim().toLowerCase();
  const prov = $("#province")?.value || "";

  VIEW = ALL.filter(x=>{
    const hitProv = !prov || (x.province === prov);
    if (!q) return hitProv;

    // Concatenate searchable fields and perform substring match
    const hay = `${x.name||""} ${x.about||""} ${x.area||""} ${x.province||""}`.toLowerCase();
    return hitProv && hay.includes(q);
  });

  clearList();
  renderChunk();
}

/**
 * Populate the province <select> from the unique set of provinces in ALL.
 * Sorted with Thai locale for proper ordering.
 */
function initProvinceOptions(){
  const sel = $("#province");
  if (!sel) return;

  const set = new Set(ALL.map(x => x.province).filter(Boolean));
  [...set]
    .sort((a,b) => a.localeCompare(b, 'th'))
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = p;
      sel.appendChild(opt);
    });
}

/**
 * Initial boot:
 * - Fetch shelters.json (no-cache)
 * - Sanitize minimal fields to strings
 * - Initialize province select options
 * - Bind UI events and render first page
 */
async function boot(){
  try{
    const res = await fetch("shelters.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);

    ALL = await res.json();

    // Normalize/sanitize: ensure every field is a string (or empty string)
    ALL = ALL.map(x => ({
      id: String(x.id||""),
      name: String(x.name||""),
      province: String(x.province||""),
      area: String(x.area||""),
      about: String(x.about||""),
      phone: String(x.phone||""),
      site: x.site||"",
      facebook: x.facebook||"",
      donate: x.donate||"",
      image: x.image||""
    }));

    initProvinceOptions();
    applyFilter(); // render with current q/province (likely empty)

    // Wire up UI interactions
    $("#q")?.addEventListener("input",  () => applyFilter());
    $("#province")?.addEventListener("change", () => applyFilter());
    $("#s-more")?.addEventListener("click", renderChunk);

  } catch(e){
    console.error("fetch shelters.json failed", e);
    // Friendly message for users: suggest running with a local server
    $("#shelter-list").innerHTML =
      `<p class="muted">Data loading failed. Please check the shelters.json file and run it via Live Server/HTTP.</p>`;
  }
}

// Start when DOM is ready
document.addEventListener("DOMContentLoaded", boot);

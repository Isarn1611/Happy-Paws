/***********************
 * Contact page scripts
 * - Visitor counter (localStorage)
 * - Accessible Carousel
 * - Contact form: HTML validate + JS sanitize
 ***********************/

/* ===== Visitor Counter ===== */
(function initVisitorCounter(){
    const KEY = "happyPaws.visits";
    let count = 0;
    try {
        count = parseInt(localStorage.getItem(KEY) || "0", 10);
        if (!Number.isFinite(count)) count = 0;
    } catch {}
    count += 1;
    try { localStorage.setItem(KEY, String(count)); } catch {}
    const el = document.getElementById("visitCount");
    if (el) el.textContent = String(count);
})();

/* ===== Utilities ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function sanitizeText(input, maxLen = 2000) {
    const txt = String(input || "")
    .replace(/<[^>]*>/g, "")                 // strip tags
    .replace(/[\u200B-\u200D\uFEFF]/g, "")   // zero-width
    .replace(/\s+/g, " ")                    // collapse spaces
    .trim();
    return txt.slice(0, maxLen);
}
function sanitizeEmail(email) {
    const e = String(email || "").trim();
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e)) return "";
    return e.slice(0, 120);
}

/* ===== Carousel (fixed aspect-ratio, centered) ===== */
(function initCarousel(){
    const root = $("#carousel");
    if (!root) return;
    const viewport = $(".carousel-viewport", root);
    const slides = $$(".slide", viewport);
    const prev = $(".carousel-btn.prev", root);
    const next = $(".carousel-btn.next", root);
    const dots = $$(".dot", root);

    let index = 0;
    let timer = null;

    function setActive(i){
        index = (i + slides.length) % slides.length;
        slides.forEach((s, k)=> s.classList.toggle("is-active", k === index));
        dots.forEach((d, k)=>{
        d.classList.toggle("is-active", k === index);
        d.setAttribute("aria-selected", k === index ? "true" : "false");
        });
    }
    function go(step){ setActive(index + step); }
    function start(){ stop(); timer = setInterval(()=> go(1), 4500); }
    function stop(){ if (timer) clearInterval(timer); timer = null; }

    prev?.addEventListener("click", ()=>{ go(-1); start(); });
    next?.addEventListener("click", ()=>{ go(1); start(); });
    dots.forEach((d,k)=> d.addEventListener("click", ()=>{ setActive(k); start(); }));

    root.addEventListener("keydown", (e)=>{
        if (e.key === "ArrowLeft")  { go(-1); start(); }
        if (e.key === "ArrowRight") { go(1);  start(); }
    });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    setActive(0);
    start();
})();

/* ===== Contact Form ===== */
(function initContactForm(){
    const form = $("#contactForm");
    const status = $("#formStatus");
    if (!form || !status) return;

    function setStatus(msg, ok=false){
        status.textContent = msg;
        status.style.color = ok ? "var(--text)" : "var(--muted)";
    }

    form.addEventListener("submit", (e)=>{
        e.preventDefault();

        // HTML5 validate
        if (!form.checkValidity()){
        setStatus("Please fill in the information completely and correctly.");
        form.reportValidity();
        return;
        }

    // Sanitize
        const fd = new FormData(form);
        const name = sanitizeText(fd.get("name"), 80);
        const email = sanitizeEmail(fd.get("email"));
        const subject = sanitizeText(fd.get("subject"), 100);
        const message = sanitizeText(fd.get("message"), 1500);
        const topic = sanitizeText(fd.get("topic"), 40);
        const consent = !!fd.get("consent");

        if (!name || !email || !subject || !message || !topic || !consent){
        setStatus("The information is incorrect or contains inappropriate characters."); return;
        }

        // Demo only — save locally
        const KEY = "happyPaws.contactMessages";
        let list = [];
        try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
        list.unshift({ id:crypto.randomUUID(), ts:Date.now(), name, email, subject, message, topic });
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}

        setStatus("Message sent successfully (saved on this device for testing)", true);
        form.reset();
    });
})();

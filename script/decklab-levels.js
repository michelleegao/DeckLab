// Aura blobs
const aura = document.getElementById("aura");

const blobs = [
{ w: 600, h: 600, x: 0,  y: 10, c: ["#ff3cac", "#784ba0"], vx: 0.012, vy: 0.008, t: 0 },
{ w: 500, h: 500, x: 60, y: 5,  c: ["#2575fc", "#6a11cb"], vx: -0.01, vy: 0.012, t: 1.5 },
{ w: 450, h: 450, x: 80, y: 50, c: ["#00c6ff", "#0072ff"], vx: 0.009, vy: -0.01, t: 3 },
];

blobs.forEach((b) => {
const el = document.createElement("div");
el.className = "aura-blob";
el.style.cssText = `
    width:${b.w}px;
    height:${b.h}px;
    left:${b.x}%;
    top:${b.y}%;
    background:radial-gradient(circle at 40% 40%,${b.c[0]},${b.c[1]},transparent 70%);
    opacity:0.35;
`;
aura.appendChild(el);
b.el = el;
});

let T = 0;
(function anim() {
T += 0.4;
blobs.forEach((b) => {
    const px = b.x + Math.sin((T + b.t * 40) * b.vx * 0.7) * 8;
    const py = b.y + Math.cos((T + b.t * 30) * b.vy * 0.7) * 7;
    b.el.style.transform = `translate(${px - b.x}%, ${py - b.y}%)`;
});
requestAnimationFrame(anim);
})();

// Load progress from localStorage
function loadProgress() {
try {
    const p = JSON.parse(localStorage.getItem("decklab_progress") || "{}");
    const completed = p.completedLevels || [];
    const stars = p.stars || {};
    const xp = p.totalXP || 0;

    document.getElementById("ps-completed").textContent = completed.length;
    document.getElementById("ps-stars").textContent = Object.values(stars).reduce((a, v) => a + v, 0);
    document.getElementById("ps-xp").textContent = xp;

    const next = completed.length + 1;
    document.getElementById("ps-next").textContent = "LVL " + (next <= 6 ? next : 6);

    // Unlock cards
    for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`card-${i}`);
    if (!card) continue;

    if (completed.includes(i)) {
        card.className = "level-card completed";
        card.href = `decklab-game.html?level=${i}`;
        card.setAttribute("onclick", "");

        // Fill stars
        const s = stars[i] || 0;
        const starWrap = document.querySelectorAll(`#stars-${i} .star`);
        starWrap.forEach((el, si) => {
        if (si < s) el.classList.add("earned");
        });

        const status = card.querySelector(".lc-status");
        if (status) status.textContent = "Completed";

        const fill = card.querySelector(".lc-progress-fill");
        if (fill) fill.style.width = "100%";

        const lbl = card.querySelector(".lc-progress-label");
        if (lbl) lbl.textContent = "3 / 3 objectives";
    } else if (i === next || i === 1) {
        card.className = "level-card active";

        // If card isn't already an anchor, convert it to one
        if (card.tagName !== "A") {
        const a = document.createElement("a");
        a.href = `decklab-game.html?level=${i}`;
        a.className = "level-card active";
        a.innerHTML = card.innerHTML;
        card.parentNode.replaceChild(a, card);
        }
    }
    }
} catch (e) {
    // Fail silently
}
}

loadProgress();
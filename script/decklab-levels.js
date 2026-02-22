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

function loadProgress() {
try {
    const p = JSON.parse(localStorage.getItem("decklab_progress") || "{}");

    // Normalize types (handle ["3"] vs [3])
    const completed = (p.completedLevels || []).map(n => parseInt(n, 10)).filter(Boolean);
    const stars = p.stars || {};
    const xp = p.totalXP || 0;

    document.getElementById("ps-completed").textContent = completed.length;
    document.getElementById("ps-stars").textContent =
    Object.values(stars).reduce((a, v) => a + (parseInt(v, 10) || 0), 0);
    document.getElementById("ps-xp").textContent = xp;

    // Next unlock = highest completed + 1
    const maxDone = completed.length ? Math.max(...completed) : 0;
    const next = Math.min(6, maxDone + 1);
    document.getElementById("ps-next").textContent = "LVL " + next;

    for (let i = 1; i <= 6; i++) {
    let card = document.getElementById(`card-${i}`);
    if (!card) continue;

    const isCompleted = completed.includes(i);
    const isActive = (i === 1) || (i === next) || isCompleted;

    // If it should be clickable, make sure it's an <a>
    if (isActive && card.tagName !== "A") {
        const a = document.createElement("a");
        a.id = card.id; // preserve id so future queries still work
        a.innerHTML = card.innerHTML;
        card.parentNode.replaceChild(a, card);
        card = a;
    }

    if (isCompleted) {
        card.className = "level-card completed";
        card.href = `decklab-game.html?level=${i}`;

        // Fill stars
        const s = parseInt(stars[i], 10) || 0;
        const starEls = document.querySelectorAll(`#stars-${i} .star`);
        starEls.forEach((el, idx) => el.classList.toggle("earned", idx < s));

        const status = card.querySelector(".lc-status");
        if (status) status.textContent = "Completed";

        const fill = card.querySelector(".lc-progress-fill");
        if (fill) fill.style.width = "100%";

        const lbl = card.querySelector(".lc-progress-label");
        if (lbl) lbl.textContent = "3 / 3 objectives";
    } else if (i === next || i === 1) {
        card.className = "level-card active";
        card.href = `decklab-game.html?level=${i}`;
    } else {
        // locked state
        card.className = "level-card locked";
        if (card.tagName === "A") card.removeAttribute("href");
    }
    }
} catch (e) {
    // Fail silently
}
}

loadProgress();
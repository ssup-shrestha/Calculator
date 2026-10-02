const $ = s => document.querySelector(s), disp = $("#disp"), exprEl = $("#expr"), M = Math;
let cur = "0", lv = [], stk = [], fresh = true, has = false, second = false, deg = false, mem = 0, lastOp = null, lastVal = 0, sw;
const isOp = t => typeof t === "string";

/* ---------- keys ---------- */
const t = (k, l, a, al) => [k, l, "s", a, al], d = k => [k, k, "n"];
const SCI = [
    t("(", "("), t(")", ")"), t("mc", "mc"), t("m+", "m+"), t("m-", "m-"), t("mr", "mr"),
    t("2nd", "2<sup>nd</sup>"), t("sq", "x<sup>2</sup>"), t("cu", "x<sup>3</sup>"), t("^", "x<sup>y</sup>"), t("exp", "e<sup>x</sup>"), t("p10", "10<sup>x</sup>", "p2", "2<sup>x</sup>"),
    t("inv", "<sup>1</sup>&frasl;<sub>x</sub>"), t("sqrt", "<sup>2</sup>√x"), t("cbrt", "<sup>3</sup>√x"), t("r", "<sup>y</sup>√x"), t("ln", "ln"), t("log", "log<sub>10</sub>", "log2", "log<sub>2</sub>"),
    t("fact", "x!"), t("sin", "sin", "asin", "sin<sup>−1</sup>"), t("cos", "cos", "acos", "cos<sup>−1</sup>"), t("tan", "tan", "atan", "tan<sup>−1</sup>"), t("e", "<i>e</i>"), t("ee", "EE"),
    t("rand", "Rand"), t("sinh", "sinh", "asinh", "sinh<sup>−1</sup>"), t("cosh", "cosh", "acosh", "cosh<sup>−1</sup>"), t("tanh", "tanh", "atanh", "tanh<sup>−1</sup>"), t("pi", "π"), t("deg", "Rad")
];
const BASIC = [
    ["bs", "⌫", "f w"], ["ac", "AC", "f"], ["neg", "+/−", "f p"], ["pct", "%", "f"], ["/", "÷", "o"],
    d("7"), d("8"), d("9"), ["*", "×", "o"],
    d("4"), d("5"), d("6"), ["-", "−", "o"],
    d("1"), d("2"), d("3"), ["+", "+", "o"],
    ["neg", "+/−", "f w"], ["0", "0", "n z"], d("."), ["=", "=", "o"]
];
const mk = (a, box) => a.forEach(([k, l, c, ak, al]) => {
    const b = document.createElement("button"); b.dataset.k = k; b.innerHTML = l; b.className = c;
    if (ak) { b.dataset.a = ak; b.dataset.l = al }
    $(box).append(b);
});
mk(SCI, "#sci"); mk(BASIC, "#basic");

/* ---------- math ---------- */
const toR = x => deg ? x * M.PI / 180 : x, fromR = x => deg ? x * 180 / M.PI : x;
const gam = n => { if (n < 0 || n % 1 || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++)r *= i; return r };
const U = {
    sq: x => x * x, cu: x => x ** 3, inv: x => 1 / x, sqrt: M.sqrt, cbrt: M.cbrt, ln: M.log, log: M.log10, log2: M.log2,
    fact: gam, exp: M.exp, p10: x => 10 ** x, p2: x => 2 ** x,
    sin: x => M.sin(toR(x)), cos: x => M.cos(toR(x)), tan: x => M.tan(toR(x)),
    asin: x => fromR(M.asin(x)), acos: x => fromR(M.acos(x)), atan: x => fromR(M.atan(x)),
    sinh: M.sinh, cosh: M.cosh, tanh: M.tanh, asinh: M.asinh, acosh: M.acosh, atanh: M.atanh
};
const F = { "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b, "/": (a, b) => b === 0 ? NaN : a / b, "^": (a, b) => M.pow(a, b), r: (a, b) => M.pow(a, 1 / b) };
function ev(a) { // evaluates [n,op,n,op,n...] with precedence
    a = [...a];
    for (const g of [["^", "r"], ["*", "/"], ["+", "-"]])
        for (let i = 1; i < a.length; i += 2)if (g.includes(a[i])) { a.splice(i - 1, 3, F[a[i]](a[i - 1], a[i + 1])); i -= 2 }
    return a[0];
}
const rnd = n => M.abs(n) < 1e-14 ? "0" : String(+n.toPrecision(12));
const setVal = n => { cur = isFinite(n) ? rnd(n) : "Error"; fresh = has = true };
const reset = () => { cur = "0"; lv = []; stk = []; fresh = true; has = false; lastOp = null };

/* ---------- display ---------- */
const SYM = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^", r: "ʸ√" };
function fmt(s) {
    if (s === "Error") return s;
    const [m, e] = s.split("e"), [i, f] = m.split("."), neg = i[0] === "-";
    const g = i.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + g + (f !== undefined ? "." + f : "") + (e !== undefined ? "e" + e : "");
}
const lvStr = a => a.map(x => isOp(x) ? SYM[x] : fmt(rnd(x))).join(" ");
function show() {
    disp.textContent = fmt(cur);
    disp.style.fontSize = "";
    let s = parseFloat(getComputedStyle(disp).fontSize);
    while (disp.scrollWidth > disp.clientWidth && s > 20) { s -= 2; disp.style.fontSize = s + "px" }
    exprEl.textContent = [...stk, lv].map(lvStr).join(" ( ").trim();
    const lbl = cur === "0" ? "AC" : "C";
    document.querySelectorAll('[data-k="ac"]').forEach(b => b.textContent = lbl);
    document.querySelectorAll(".o").forEach(b => b.classList.toggle("active", !has && lv.length > 0 && lv[lv.length - 1] === b.dataset.k));
}

/* ---------- haptics (Android + iOS Safari 17.4+) ---------- */
function haptic(ms) {
    try { if (navigator.vibrate && navigator.vibrate(ms)) return } catch (e) { }
    try {
        if (!sw) {
            sw = document.createElement("label"); sw.setAttribute("aria-hidden", "true");
            sw.style.cssText = "position:absolute;left:-9999px;opacity:0;pointer-events:none";
            const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); sw.append(i); document.body.append(sw)
        }
        sw.click();
    } catch (e) { }
}

/* ---------- input ---------- */
function press(k) {
    haptic(k.length === 1 && "+-*/=^r".includes(k) ? 14 : 8);
    if (cur === "Error") reset();
    const n = parseFloat(cur);
    if (/^\d$/.test(k)) {
        if (fresh || cur === "0") cur = k;
        else if (cur === "-0") cur = "-" + k;
        else if (cur.replace(/[-.e]/g, "").length < 12) cur += k;
        fresh = false; has = true;
    } else if (k === ".") {
        if (fresh) { cur = "0."; fresh = false; has = true }
        else if (!/[.e]/.test(cur)) cur += ".";
    } else if (k === "ee") {
        if (!cur.includes("e")) { cur += "e"; fresh = false; has = true }
    } else if (k === "neg") {
        if (fresh && !has) { cur = "-0"; fresh = false; has = true }
        else cur = cur[0] === "-" ? cur.slice(1) : "-" + cur;
    } else if (k === "bs") {
        if (!fresh) cur = cur.length > 1 && !(cur.length === 2 && cur[0] === "-") ? cur.slice(0, -1) : "0";
    } else if (k === "ac") {
        if (cur !== "0") { cur = "0"; fresh = true; has = false } else reset();
    } else if (k === "pct") {
        const o = lv[lv.length - 1], a = lv[lv.length - 2];
        setVal(isOp(o) && "+-".includes(o) && typeof a === "number" ? a * n / 100 : n / 100);
    } else if ("+-*/^r".includes(k)) {
        if (has || !lv.length) lv.push(n, k); else if (isOp(lv[lv.length - 1])) lv[lv.length - 1] = k;
        fresh = true; has = false; lastOp = null;
    } else if (k === "(") {
        if (has) lv.push(n, "*");
        stk.push(lv); lv = []; cur = "0"; fresh = true; has = false;
    } else if (k === ")") {
        if (stk.length) { const a = [...lv]; if (!a.length || isOp(a[a.length - 1])) a.push(n); const v = ev(a); lv = stk.pop(); setVal(v) }
    } else if (k === "=") {
        if (!lv.length && !stk.length && lastOp) setVal(F[lastOp](n, lastVal));
        else {
            let v = n;
            if (!stk.length && lv.length && isOp(lv[lv.length - 1])) { lastOp = lv[lv.length - 1]; lastVal = n }
            for (; ;) {
                const a = [...lv]; if (!a.length || isOp(a[a.length - 1])) a.push(v);
                v = ev(a); if (!stk.length) break; lv = stk.pop();
            }
            lv = []; setVal(v);
        }
    } else if (k === "mc") mem = 0;
    else if (k === "m+") { mem += n; fresh = true }
    else if (k === "m-") { mem -= n; fresh = true }
    else if (k === "mr") setVal(mem);
    else if (k === "pi") setVal(M.PI);
    else if (k === "e") setVal(M.E);
    else if (k === "rand") setVal(M.random());
    else if (k === "deg") { deg = !deg; $('[data-k="deg"]').textContent = deg ? "Deg" : "Rad" }
    else if (k === "2nd") {
        second = !second;
        document.querySelectorAll("[data-a]").forEach(b => {
            const [kk, ll] = [b.dataset.k, b.innerHTML];
            b.dataset.k = b.dataset.a; b.innerHTML = b.dataset.l; b.dataset.a = kk; b.dataset.l = ll;
        });
        $('[data-k="2nd"]').classList.toggle("on", second);
    } else if (U[k]) setVal(U[k](n));
    show();
}

document.querySelector(".keys").addEventListener("click", e => {
    const b = e.target.closest("button"); if (b) { press(b.dataset.k); b.blur() }
});
document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const m = { Enter: "=", Escape: "ac", Backspace: "bs", "%": "pct", x: "*", X: "*" };
    const k = m[e.key] || e.key;
    if (/^(\d|[.+\-*\/=^()]|ac|bs|pct)$/.test(k)) { e.preventDefault(); press(k) }
});
window.addEventListener("resize", show);
show();
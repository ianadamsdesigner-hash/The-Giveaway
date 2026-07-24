(() => {
  if (document.querySelector("#gw-fonts")) return;
  const l = document.createElement("link");
  l.id = "gw-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(l);
})();

import React, { useState, useRef, useEffect } from "react";



// ── Constants ─────────────────────────────────────────────────────────────────
const SLOT_H     = 80;
const VISIBLE    = 5;  // fewer rows = bigger names
const CROW       = Math.floor(VISIBLE / 2); // 2
const CY         = (SLOT_H * VISIBLE) / 2;  // 280
const CH         = SLOT_H * VISIBLE;         // 560
const easeOut    = t => 1 - Math.pow(1 - t, 4);
const CONTAINER_MAX = 820;  // desktop max width (tumbler)

const DEFAULTS = {
  bgImage:     null,
  bgVideo:     null,
  drawTitle:   "GIVEAWAY DRAW",
  accent:      "#C9A84C",
  fastSpeed:   30,
  textSize:    32,   // point size for entry name text (12-96)
  fastMaxSec:  20,
  slowSec:     4,
  adminPin:    "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const compressImage = (file, maxW = 960) => new Promise(res => {
  const fr = new FileReader();
  fr.onload = e => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxW / img.width);
      const c = Object.assign(document.createElement("canvas"), { width: img.width*s, height: img.height*s });
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = e.target.result;
  };
  fr.readAsDataURL(file);
});

function drawReel(canvas, offset, entries, stopped, accent, textScale = 1, ready = false) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  // Logical (CSS) dimensions — all drawing math uses these; ctx.scale handles the rest
  const W = canvas.width / dpr, H = canvas.height / dpr, n = entries.length;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Dynamic slot height — scales with canvas size, always 7 visible rows
  const slotH = H / VISIBLE;
  const centerY = H / 2;
  const centerRow = CROW;
  ctx.clearRect(0,0,W,H);
  // No full scrim — the top/bottom vignettes below handle readability

  if (!n || ready) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (ready) {
      // List loaded, waiting for draw to start
      ctx.font = "700 18px 'Space Grotesk', sans-serif";
      ctx.fillStyle = accent;
      ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 2;
      ctx.fillText("ENTRIES LOADED", W/2, H/2 - 14);
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillText("READY TO DRAW", W/2, H/2 + 16);
      ctx.shadowOffsetY = 0;
    } else {
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillText("Upload your entries to begin", W/2, H/2);
    }
    ctx.restore();
    return;
  }

  const fi  = Math.floor(offset / slotH);
  const rem = offset % slotH;

  for (let r = -1; r <= VISIBLE + 1; r++) {
    const idx  = ((fi + r) % n + n) % n;
    const y    = r * slotH - rem;
    if (y + slotH < 0 || y > H) continue;

    const rowcenterY = y + slotH / 2;
    const dist  = Math.abs(rowcenterY - centerY);
    const isC   = dist < slotH / 2;

    // No row backgrounds — the floating gold pill below is the only winner indicator,
    // no boxy highlight stripe around it.

    const prox  = Math.max(0, 1 - dist/centerY);
    const alpha = 0.18 + prox * 0.82;
    const scale = 0.66 + prox * 0.34;
    // Base font size scales with canvas width — then multiplied by user's textScale setting
    const baseFs = Math.max(22, Math.min(W * 0.055, 46)) * textScale;
    const fs     = Math.round(baseFs * scale);

    ctx.save();
    ctx.translate(W/2, rowcenterY);
    ctx.scale(scale, scale);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (isC && stopped) {
      ctx.font = `900 ${fs+4}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = accent;
      ctx.shadowColor = accent; ctx.shadowBlur = 28;
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    } else {
      ctx.font = `700 ${fs}px 'Inter', sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      // Sharp dark drop shadow for readability — no blur so text stays crisp
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }
    const name = entries[idx] || "";
    ctx.fillText(name.length > 44 ? name.slice(0,42)+"…" : name, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Glass pill highlight for the center (winner) row — floating, frosted, no hard edges
  const bY = centerY - slotH/2 + 6, bH = slotH - 12;
  const pillPad = 32;
  const pillR = bH / 2;

  // Soft outer glow behind the pill
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = stopped ? 40 : 20;

  // Rounded pill fill (subtle white translucent — glass)
  ctx.beginPath();
  ctx.moveTo(pillPad + pillR, bY);
  ctx.lineTo(W - pillPad - pillR, bY);
  ctx.arc(W - pillPad - pillR, bY + pillR, pillR, -Math.PI/2, Math.PI/2);
  ctx.lineTo(pillPad + pillR, bY + bH);
  ctx.arc(pillPad + pillR, bY + pillR, pillR, Math.PI/2, -Math.PI/2);
  ctx.closePath();

  // Multi-stop translucent fill for the frosted effect
  const pillGrad = ctx.createLinearGradient(0, bY, 0, bY + bH);
  pillGrad.addColorStop(0,   "rgba(255,255,255,0.15)");
  pillGrad.addColorStop(0.5, "rgba(255,255,255,0.08)");
  pillGrad.addColorStop(1,   "rgba(255,255,255,0.15)");
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.restore();

  // Thin gold border on the pill
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pillPad + pillR, bY);
  ctx.lineTo(W - pillPad - pillR, bY);
  ctx.arc(W - pillPad - pillR, bY + pillR, pillR, -Math.PI/2, Math.PI/2);
  ctx.lineTo(pillPad + pillR, bY + bH);
  ctx.arc(pillPad + pillR, bY + pillR, pillR, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.strokeStyle = stopped ? accent : `${accent}bb`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // No vignette — canvas stays fully transparent so the background flows uninterrupted

  ctx.restore();
}

// ── Toggle ────────────────────────────────────────────────────────────────────
const Toggle = ({ val, on, accent }) => (
  <div onClick={() => on(!val)} style={{
    width:48, height:26, borderRadius:13,
    background: val ? accent : "rgba(255,255,255,.13)",
    position:"relative", cursor:"pointer", transition:"background .25s", flexShrink:0,
  }}>
    <div style={{
      position:"absolute", top:3,
      left: val ? "calc(100% - 23px)" : 3,
      width:20, height:20, borderRadius:"50%",
      background:"#fff", transition:"left .25s",
      boxShadow:"0 1px 5px rgba(0,0,0,.45)",
    }}/>
  </div>
);

// ── DRAW PAGE ─────────────────────────────────────────────────────────────────
function DrawPage({ cfg, onAdmin }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const offsetRef    = useRef(0);
  const entriesRef   = useRef([]);
  const rafRef       = useRef(null);

  const [entries,    setEntries]    = useState([]);
  const [spinning,   setSpinning]   = useState(false);
  const [stopped,    setStopped]    = useState(false);
  const [winner,     setWinner]     = useState(null);
  const [fileName,   setFileName]   = useState("");
  const [hasStarted, setHasStarted] = useState(false);  // names hidden until first draw
  const fileLabel = fileName ? fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ') : "";

  const { accent } = cfg;

  const redraw = () => drawReel(canvasRef.current, offsetRef.current, entriesRef.current, stopped, accent, (cfg.textSize || 32)/32, !hasStarted && entriesRef.current.length > 0);

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = Math.min(containerRef.current.clientWidth, CONTAINER_MAX);
      // Fit in viewport: canvas height = 60% of viewport height, capped
      const vh = window.innerHeight;
      const targetH = Math.max(360, Math.min(vh * 0.60, w * 0.85, 620));
      // HiDPI: render at devicePixelRatio for razor-sharp text on Retina
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width  = Math.round(w * dpr);
      canvasRef.current.height = Math.round(targetH * dpr);
      canvasRef.current.style.width  = w + "px";
      canvasRef.current.style.height = targetH + "px";
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  });

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setWinner(null);
    setStopped(false); offsetRef.current = 0;
    const fr = new FileReader();
    fr.onload = ev => {
      const names = ev.target.result.split("\n").map(n=>n.trim()).filter(Boolean);
      entriesRef.current = names; setEntries(names);
      setHasStarted(false);
      drawReel(canvasRef.current, 0, names, false, accent, (cfg.textSize || 32)/32, true);
    };
    fr.readAsText(file);
  };

  const handleSpin = () => {
    if (spinning || !entriesRef.current.length) return;

    // Fisher-Yates shuffle: randomize the display order so the tumbler feels
    // like a hopper (names appear in random order, not sequentially by entry #).
    // Weighted entries are preserved — a name appearing 5x still appears 5x.
    const shuffled = entriesRef.current.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    entriesRef.current = shuffled;

    const n = entriesRef.current.length;
    const wIdx = Math.floor(Math.random() * n);
    const wName = entriesRef.current[wIdx];

    // Use actual canvas slot height so animation math matches what's drawn
    // Use LOGICAL height (canvas.height is physical px on HiDPI screens)
    const dpr = window.devicePixelRatio || 1;
    const dynSlotH = canvasRef.current ? (canvasRef.current.height / dpr) / VISIBLE : SLOT_H;
    const pxSec    = cfg.fastSpeed * dynSlotH;
    const fastSec  = Math.min(n / cfg.fastSpeed, cfg.fastMaxSec);
    const fastDist = pxSec * fastSec;
    const slowMs   = cfg.slowSec * 1000;

    // Velocity-matched slowdown: the ease-out curve's initial velocity is
    // 4*D/slowMs (for power-4 ease-out). Setting D = pxSec*slowSec/4 makes the
    // slowdown START at exactly the fast-phase speed, then decelerate smoothly.
    const targetD = Math.max(pxSec * cfg.slowSec / 4, dynSlotH * 3);
    const desired = fastDist + targetD;
    const base    = ((wIdx - CROW) % n + n) % n;
    let   k       = Math.round((desired / dynSlotH - base) / n);
    let   finOff  = (base + k * n) * dynSlotH;
    while (finOff <= fastDist + dynSlotH) { k += 1; finOff = (base + k * n) * dynSlotH; }

    offsetRef.current = 0;
    setHasStarted(true);
    setSpinning(true); setStopped(false); setWinner(null);

    let t1 = null, t2 = null;
    const p1 = ts => {
      if (!t1) t1 = ts;
      const t = Math.min((ts-t1)/(fastSec*1000),1);
      offsetRef.current = t * fastDist;
      drawReel(canvasRef.current, offsetRef.current, entriesRef.current, false, accent, (cfg.textSize || 32)/32);
      t < 1 ? (rafRef.current = requestAnimationFrame(p1)) : (rafRef.current = requestAnimationFrame(p2));
    };
    const p2 = ts => {
      if (!t2) t2 = ts;
      const t = Math.min((ts-t2)/slowMs, 1);
      offsetRef.current = fastDist + easeOut(t)*(finOff-fastDist);
      drawReel(canvasRef.current, offsetRef.current, entriesRef.current, false, accent, (cfg.textSize || 32)/32);
      if (t < 1) { rafRef.current = requestAnimationFrame(p2); return; }
      offsetRef.current = finOff;
      drawReel(canvasRef.current, finOff, entriesRef.current, true, accent, (cfg.textSize || 32)/32);
      setSpinning(false); setStopped(true); setWinner(wName);
    };
    rafRef.current = requestAnimationFrame(p1);
  };

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  const loaded = entries.length > 0;

  return (
    <div style={{
      minHeight:"100vh",
      background:"#06060e",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"0 24px 20px", fontFamily:"'Space Grotesk', sans-serif", color:"#fff",
      position:"relative", overflow:"hidden",
    }}>
      {/* Background video (preferred) or image */}
      {cfg.bgVideo ? (
        <video
          autoPlay loop muted playsInline
          src={cfg.bgVideo}
          style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", zIndex:0,
            animation:"bgFadeIn .9s ease both",
            filter: spinning ? "blur(6px) brightness(0.75)" : "blur(0px) brightness(1)",
            transform: spinning ? "scale(1.05)" : "scale(1)",
            transition:"filter 1.2s ease, transform 1.2s ease",
          }}
        />
      ) : cfg.bgImage ? (
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`url(${cfg.bgImage})`,
          backgroundSize:"cover", backgroundPosition:"center",
          zIndex:0,
          animation:"bgFadeIn .9s ease both",
          filter: spinning ? "blur(6px) brightness(0.75)" : "blur(0px) brightness(1)",
          transform: spinning ? "scale(1.05)" : "scale(1)",
          transition:"filter 1.2s ease, transform 1.2s ease",
        }}/>
      ) : null}

      {/* Subtle vignette — only darkens edges, keeps bg visible in the center */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
        background: (cfg.bgVideo || cfg.bgImage)
          ? "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 100%)"
          : "radial-gradient(ellipse at 50% 60%, rgba(107,68,0,.55) 0%, rgba(13,8,0,.85) 70%, rgba(0,0,0,.92) 100%)",
      }}/>
      <div style={{ position:"relative", zIndex:1, width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes popIn{0%{transform:scale(.6);opacity:0}72%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes fall{0%{transform:translateY(-8px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(750deg);opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes drumGlow{0%,100%{box-shadow:0 0 30px ${accent}18}50%{box-shadow:0 0 70px ${accent}3a}}
        @keyframes floatGlow{0%,100%{filter:drop-shadow(0 0 30px ${accent}44)}50%{filter:drop-shadow(0 0 60px ${accent}88)}}
        @keyframes bgFadeIn{0%{opacity:0}100%{opacity:1}}
        @keyframes goldBurst{0%{transform:scale(0);opacity:1}100%{transform:scale(45);opacity:0}}
        @keyframes goldRay{0%{transform:rotate(var(--angle)) scaleY(0);opacity:0}30%{opacity:1}100%{transform:rotate(var(--angle)) scaleY(1);opacity:0}}
        @keyframes goldParticle{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}
        @keyframes flashGold{0%,100%{opacity:0}50%{opacity:.7}}
        @keyframes screenShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}50%{transform:translate(2px,-2px)}75%{transform:translate(-2px,-1px)}}
        @keyframes cardPulse{0%,100%{transform:scale(1);box-shadow:0 0 90px ${accent}88,0 30px 70px rgba(0,0,0,.75)}50%{transform:scale(1.015);box-shadow:0 0 130px ${accent}cc,0 30px 90px rgba(0,0,0,.8)}}
        @keyframes slamIn{0%{transform:scale(3) rotate(-8deg);opacity:0;filter:blur(20px)}60%{transform:scale(0.92) rotate(2deg);opacity:1;filter:blur(0px)}80%{transform:scale(1.04) rotate(-1deg)}100%{transform:scale(1) rotate(0deg)}}
        @keyframes nameSlam{0%{transform:scale(4);opacity:0;letter-spacing:.5em;filter:blur(30px)}55%{transform:scale(0.9);opacity:1;letter-spacing:-.02em;filter:blur(0px)}75%{transform:scale(1.05);letter-spacing:0em}100%{transform:scale(1);letter-spacing:-.01em}}
        @keyframes trophyBounce{0%{transform:scale(0) rotate(-180deg);opacity:0}50%{transform:scale(1.2) rotate(10deg);opacity:1}70%{transform:scale(0.95) rotate(-4deg)}100%{transform:scale(1) rotate(0deg)}}
        @keyframes shine{0%{transform:translateX(-100%) skewX(-25deg)}100%{transform:translateX(200%) skewX(-25deg)}}
        @keyframes rayRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ribbonFlutter{0%,100%{transform:rotate(0deg)}50%{transform:rotate(1deg)}}
        @keyframes fadeInUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes numberTick{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes goldFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
        .sp-btn:hover:not(:disabled){filter:brightness(1.12);transform:scale(1.03)}
        .sp-btn:active:not(:disabled){transform:scale(.97)}
        .up-lbl:hover{background:rgba(255,255,255,0.12) !important;border-color:${accent} !important;transform:translateY(-1px)}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${accent};cursor:pointer;box-shadow:0 0 8px ${accent}88}
      `}</style>

      {/* Title row */}
      <div style={{
        width:"100%", maxWidth:CONTAINER_MAX,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"24px 0 14px", position:"relative",
      }}>
        <h2 style={{
          margin:0, fontSize:"clamp(1.1rem,2vw,1.6rem)", fontWeight:700, letterSpacing:".18em",
          background:`linear-gradient(90deg,${accent},${accent}99,${accent})`,
          backgroundSize:"200% 200%", animation:"shimmer 3s ease infinite",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          fontFamily:"'Space Grotesk', sans-serif",
        }}>{cfg.drawTitle}</h2>

        <button onClick={onAdmin} title="Admin Settings" style={{
          background:"none", border:"none", cursor:"pointer",
          color:"rgba(255,255,255,.28)", padding:4, transition:"color .2s",
          position:"absolute", right:0,
        }}
        onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,.6)"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.28)"}
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>


      {/* Free-flowing tumbler */}
      <div ref={containerRef} style={{ width:"100%", maxWidth:CONTAINER_MAX, position:"relative" }}>
        <div style={{
          position:"relative",
          animation: spinning ? "floatGlow 2s ease-in-out infinite" : "none",
        }}>
          <canvas ref={canvasRef} width={480} height={CH} style={{ display:"block", width:"100%", height:"auto" }}/>
          {spinning && (
            <div style={{
              position:"absolute", top:20, right:16,
              background:"rgba(229,57,53,0.85)",
              backdropFilter:"blur(10px)",
              WebkitBackdropFilter:"blur(10px)",
              borderRadius:20, padding:"4px 12px",
              fontSize:".52rem", fontWeight:700, letterSpacing:".18em",
              animation:"pulse .65s infinite",
              border:"1px solid rgba(255,255,255,0.2)",
            }}>● LIVE</div>
          )}
        </div>
      </div>

      {spinning && (
        <p style={{ marginTop:11, fontSize:".58rem", color:`${accent}77`, letterSpacing:".22em", animation:"pulse .95s infinite" }}>
          SCROLLING THROUGH ALL ENTRIES
        </p>
      )}

      {/* Controls */}
      <div style={{ marginTop:16, display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%", maxWidth:CONTAINER_MAX }}>
        <label className="up-lbl" style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          cursor:"pointer", padding:"16px 28px",
          border:`1px solid ${accent}66`, borderRadius:100,
          color:"#fff", fontSize:".78rem", letterSpacing:".14em", fontWeight:600,
          background:"rgba(255,255,255,0.06)",
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          width:"100%", boxSizing:"border-box", transition:"all .2s",
          boxShadow:`0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}>
          {fileLabel ? (fileLabel.length>34 ? fileLabel.slice(0,32)+"…" : fileLabel) : "UPLOAD ENTRIES"}
          <input type="file" accept=".txt" onChange={handleUpload} style={{ display:"none" }}/>
        </label>

        {!loaded && (
          <p style={{ color:"rgba(255,255,255,.18)", fontSize:".58rem", textAlign:"center", letterSpacing:".1em", margin:0 }}>
            One name per line · Duplicate entries supported for weighted draws
          </p>
        )}

        {stopped && winner ? (
          <div style={{ display:"flex", gap:12, width:"100%" }}>
            <button className="sp-btn" onClick={handleSpin} style={{
              flex:1, padding:"20px 0",
              fontSize:"1.05rem", fontFamily:"'Space Grotesk', sans-serif", fontWeight:700, letterSpacing:".24em",
              background:accent, color:"#000",
              border:"none", borderRadius:100, cursor:"pointer",
              boxShadow:`0 8px 40px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
              transition:"all .3s",
            }}>REDRAW</button>
            <button onClick={()=>{
              // Full reset — clear list, back to upload state
              setWinner(null); setStopped(false); setHasStarted(false);
              entriesRef.current = [];
              setEntries([]);
              setFileName("");
              offsetRef.current = 0;
              drawReel(canvasRef.current, 0, [], false, accent, (cfg.textSize || 32)/32, false);
            }} style={{
              flex:1, padding:"20px 0",
              fontSize:"1.05rem", fontFamily:"'Space Grotesk', sans-serif", fontWeight:700, letterSpacing:".24em",
              background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.8)",
              border:"1px solid rgba(255,255,255,0.15)", borderRadius:100, cursor:"pointer",
              backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
              boxShadow:"0 4px 30px rgba(0,0,0,0.3)",
              transition:"all .3s",
            }}>CLOSE</button>
          </div>
        ) : (
                <button className="sp-btn" onClick={handleSpin} disabled={spinning||!loaded} style={{
          padding:"20px 0", width:"100%",
          fontSize:"1.05rem", fontFamily:"'Space Grotesk', sans-serif", fontWeight:700, letterSpacing:".24em",
          background: !loaded ? "rgba(255,255,255,0.04)" : spinning ? "rgba(255,255,255,0.06)"
            : accent,
          color:(!loaded||spinning) ? "rgba(255,255,255,0.35)" : "#000",
          border:(!loaded||spinning) ? "1px solid rgba(255,255,255,0.1)" : "none",
          borderRadius:100, cursor:(!loaded||spinning)?"not-allowed":"pointer",
          backdropFilter:(!loaded||spinning) ? "blur(20px)" : "none",
          WebkitBackdropFilter:(!loaded||spinning) ? "blur(20px)" : "none",
          boxShadow:(!loaded||spinning) ? "0 4px 30px rgba(0,0,0,0.3)" : `0 8px 40px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
          transition:"all .3s",
        }}>
          {spinning ? <span style={{animation:"pulse .8s infinite"}}>DRAWING</span> : "START THE DRAW"}
        </button>
        )}
      </div>


      

      
      </div>
    </div>
  );
}

// ── ADMIN SUB-COMPONENTS (must be at module level to prevent input remounting) ─
const ADMIN_INP = {
  width:"100%", padding:"10px 12px", boxSizing:"border-box",
  background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)",
  borderRadius:5, color:"#fff", fontSize:".85rem",
  fontFamily:"'Inter', sans-serif", fontWeight:400, outline:"none",
};

function AdminSec({ title, accent, children }) {
  return (
    <div style={{ background:"rgba(255,255,255,.04)", borderRadius:10, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden", marginBottom:14 }}>
      <div style={{ padding:"11px 18px", background:"rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.07)", fontSize:".7rem", letterSpacing:".2em", color:accent, fontFamily:"'Space Grotesk', sans-serif", fontWeight:700 }}>{title}</div>
      <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:15 }}>{children}</div>
    </div>
  );
}

function AdminFld({ label, hint, children }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <label style={{ fontSize:".7rem", color:"rgba(255,255,255,.58)", letterSpacing:".06em", fontFamily:"'Inter', sans-serif", fontWeight:700 }}>{label}</label>
        {hint && <span style={{ fontSize:".62rem", color:"rgba(255,255,255,.35)", letterSpacing:".04em" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AdminPtInput({ label, min, max, step = 2, value, onChange, accent }) {
  const clamp = v => Math.max(min, Math.min(max, v));
  const v = clamp(value || min);
  const btnStyle = {
    width: 34, height: 34, borderRadius: 6,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "#fff", fontSize: "1.1rem", fontWeight: 600,
    cursor: "pointer", flexShrink: 0,
    fontFamily: "'Inter', sans-serif",
    transition: "background .15s",
  };
  return (
    <AdminFld label={label} hint={`${min}-${max}pt`}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <button
          onClick={() => onChange(clamp(v - step))}
          disabled={v <= min}
          style={{...btnStyle, opacity: v <= min ? 0.35 : 1, cursor: v <= min ? "not-allowed" : "pointer"}}
        >−</button>
        <div style={{ position:"relative", flex:1 }}>
          <input
            type="number"
            value={v}
            min={min} max={max}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) onChange(clamp(n));
              else if (e.target.value === "") onChange(min);
            }}
            style={{
              ...ADMIN_INP,
              textAlign:"center", paddingRight:32, fontWeight:600, fontSize:".95rem",
            }}
          />
          <span style={{
            position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
            fontSize:".72rem", color:`${accent}aa`, fontWeight:600,
            fontFamily:"'Inter', sans-serif", pointerEvents:"none",
            letterSpacing:".05em",
          }}>pt</span>
        </div>
        <button
          onClick={() => onChange(clamp(v + step))}
          disabled={v >= max}
          style={{...btnStyle, opacity: v >= max ? 0.35 : 1, cursor: v >= max ? "not-allowed" : "pointer"}}
        >+</button>
      </div>
    </AdminFld>
  );
}

function AdminSlider({ label, min, max, unit, value, onChange, accent }) {
  const pct = ((value - min) / (max - min) * 100).toFixed(1);
  return (
    <AdminFld label={label} hint={`${value}${unit}`}>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width:"100%", height:4, borderRadius:2, outline:"none", cursor:"pointer",
          appearance:"none", WebkitAppearance:"none",
          background:`linear-gradient(to right,${accent} 0%,${accent} ${pct}%,rgba(255,255,255,.15) ${pct}%,rgba(255,255,255,.15) 100%)` }}/>
    </AdminFld>
  );
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
function AdminPage({ cfg, onSave, onBack }) {
  const [s, setS]           = useState({...cfg});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setS(p => ({...p, [k]:v}));

  const doSave = async () => { setSaving(true); await onSave(s); setSaving(false); };

  const a = s.accent;

  const PRESETS = [
    {label:"Gold",  col:"#C9A84C"},{label:"Silver", col:"#B0B8C0"},
    {label:"White", col:"#F0F0F0"},{label:"Red",    col:"#C62828"},
    {label:"Blue",  col:"#1A5CB0"},{label:"Teal",   col:"#00796B"},
  ];



  return (
    <div style={{ minHeight:"100vh", background:"#080810", fontFamily:"'Inter', sans-serif", color:"#fff" }}>
      <style>{`
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${a};cursor:pointer;box-shadow:0 0 8px ${a}77}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        @keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${a};cursor:pointer;box-shadow:0 0 8px ${a}77}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      {/* Sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:50, background:"rgba(8,8,16,.96)",
        backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,.07)",
        padding:"17px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <button onClick={onBack} style={{
          background:"none", border:"none", cursor:"pointer",
          color:"rgba(255,255,255,.5)", fontSize:".62rem", letterSpacing:".15em",
          fontFamily:"'Inter', sans-serif", fontWeight:700,
          display:"flex", alignItems:"center", gap:5,
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9 3l-5 4.5L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          CANCEL
        </button>
        <div style={{ fontSize:".6rem", letterSpacing:".28em", color:a, fontFamily:"'Space Grotesk', sans-serif", fontWeight:700 }}>
          ADMIN SETTINGS
        </div>
        <button onClick={doSave} disabled={saving} style={{
          background:a, border:"none", borderRadius:5,
          padding:"8px 20px", cursor:saving?"not-allowed":"pointer",
          fontFamily:"'Space Grotesk', sans-serif", fontWeight:700,
          fontSize:".58rem", letterSpacing:".14em", color:"#000",
          opacity:saving?.65:1,
        }}>{saving?"SAVING…":"SAVE"}</button>
      </div>

      <div style={{ padding:"18px 16px 50px", maxWidth:560, margin:"0 auto" }}>

        {/* DRAW */}
        <AdminSec accent={a} title="DRAW PAGE BACKGROUND">
          <p style={{ margin:"0 0 6px", fontSize:".7rem", color:"rgba(255,255,255,.42)", lineHeight:1.55 }}>
            Image or video shown behind the spinner. Video takes priority if both are set.
          </p>

          <AdminFld label="BACKGROUND IMAGE" hint={s.bgImage ? "Loaded" : "Optional"}>
            <label style={{
              display:"block", cursor:"pointer", borderRadius:8, overflow:"hidden",
              border:`2px dashed ${a}40`, height:130, position:"relative",
              background: s.bgImage ? `url(${s.bgImage}) center/cover` : "rgba(255,255,255,.03)",
            }}>
              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.45)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:7 }}>
                <span style={{ fontSize:".68rem", color:a, letterSpacing:".12em", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                  {s.bgImage ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
                </span>
                <span style={{ fontSize:".58rem", color:"rgba(255,255,255,.45)", letterSpacing:".06em" }}>
                  JPG / PNG · auto-compressed
                </span>
              </div>
              <input type="file" accept="image/*" onChange={async e => {
                const f = e.target.files[0]; if (!f) return;
                const b64 = await compressImage(f, 1600);
                set("bgImage", b64);
              }} style={{ display:"none" }}/>
            </label>
            {s.bgImage && (
              <button onClick={()=>set("bgImage", null)} style={{
                marginTop:8, background:"none", border:"none", cursor:"pointer",
                color:"rgba(255,255,255,.5)", fontSize:".62rem", letterSpacing:".12em",
                fontFamily:"'Inter',sans-serif", padding:"4px 0",
              }}>REMOVE IMAGE</button>
            )}
          </AdminFld>

          <AdminFld label="BACKGROUND VIDEO" hint={s.bgVideo ? "Loaded" : "Optional · keep under 10MB"}>
            <label style={{
              display:"block", cursor:"pointer", borderRadius:8, overflow:"hidden",
              border:`2px dashed ${a}40`, height:130, position:"relative",
              background:"rgba(255,255,255,.03)",
            }}>
              {s.bgVideo && (
                <video src={s.bgVideo} autoPlay loop muted playsInline style={{
                  position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover",
                }}/>
              )}
              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:7 }}>
                <span style={{ fontSize:".68rem", color:a, letterSpacing:".12em", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                  {s.bgVideo ? "CHANGE VIDEO" : "UPLOAD VIDEO"}
                </span>
                <span style={{ fontSize:".58rem", color:"rgba(255,255,255,.45)", letterSpacing:".06em" }}>
                  MP4 / WEBM · loops silently
                </span>
              </div>
              <input type="file" accept="video/*" onChange={e => {
                const f = e.target.files[0]; if (!f) return;
                if (f.size > 25 * 1024 * 1024) {
                  alert("Video is over 25MB — please use a smaller file. Recommended under 10MB.");
                  return;
                }
                const fr = new FileReader();
                fr.onload = ev => set("bgVideo", ev.target.result);
                fr.readAsDataURL(f);
              }} style={{ display:"none" }}/>
            </label>
            {s.bgVideo && (
              <button onClick={()=>set("bgVideo", null)} style={{
                marginTop:8, background:"none", border:"none", cursor:"pointer",
                color:"rgba(255,255,255,.5)", fontSize:".62rem", letterSpacing:".12em",
                fontFamily:"'Inter',sans-serif", padding:"4px 0",
              }}>REMOVE VIDEO</button>
            )}
          </AdminFld>
        </AdminSec>

        <AdminSec accent={a} title="DRAW PAGE">
          <AdminFld label="DRAW PAGE TITLE"><input style={ADMIN_INP} value={s.drawTitle} onChange={e=>set("drawTitle",e.target.value)} placeholder="GIVEAWAY DRAW"/></AdminFld>
          <AdminPtInput label="ENTRY NAME SIZE" min={12} max={96} step={2} value={s.textSize || 32} onChange={v=>set("textSize",v)} accent={a}/>
        </AdminSec>

        {/* ANIMATION */}
        <AdminSec accent={a} title="ANIMATION TIMING">
          <p style={{ margin:"0 0 4px", fontSize:".68rem", color:"rgba(255,255,255,.35)", lineHeight:1.5 }}>
            The draw scrolls through your full list at the selected speed, then dramatically slows to reveal the winner.
          </p>
          <AdminSlider label="SCROLL SPEED" min={1} max={200} unit=" names/sec" value={s.fastSpeed} onChange={v=>set("fastSpeed",v)} accent={a}/>
          <AdminSlider label="MAX SCROLL DURATION" min={3} max={120} unit="s cap" value={s.fastMaxSec} onChange={v=>set("fastMaxSec",v)} accent={a}/>
          <AdminSlider label="SLOWDOWN DURATION" min={1} max={20} unit="s" value={s.slowSec} onChange={v=>set("slowSec",v)} accent={a}/>
        </AdminSec>

        {/* ACCENT COLOR */}
        <AdminSec accent={a} title="ACCENT COLOR">
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:10 }}>
            {PRESETS.map(p => (
              <div key={p.col} onClick={()=>set("accent",p.col)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}>
                <div style={{
                  width:38, height:38, borderRadius:"50%", background:p.col, transition:"all .2s",
                  border: s.accent===p.col ? "3px solid #fff" : "3px solid transparent",
                  boxShadow: s.accent===p.col ? `0 0 12px ${p.col}88` : "none",
                }}/>
                <span style={{ fontSize:".5rem", color:"rgba(255,255,255,.38)", letterSpacing:".06em" }}>{p.label}</span>
              </div>
            ))}
          </div>
          <AdminFld label="CUSTOM HEX COLOR">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input style={{...ADMIN_INP, flex:1}} value={s.accent} onChange={e=>set("accent",e.target.value)} placeholder="#C9A84C"/>
              <div style={{ width:38, height:38, borderRadius:6, background:a, border:"1px solid rgba(255,255,255,.18)", flexShrink:0 }}/>
            </div>
          </AdminFld>
        </AdminSec>

        {/* SECURITY */}
        <AdminSec accent={a} title="ADMIN SECURITY">
          <AdminFld label="ADMIN PIN" hint="Leave blank to disable lock">
            <input style={ADMIN_INP} type="password" value={s.adminPin} onChange={e=>set("adminPin",e.target.value)} placeholder="Set a PIN to protect admin access"/>
          </AdminFld>
          <p style={{ margin:0, fontSize:".62rem", color:"rgba(255,255,255,.28)", lineHeight:1.6 }}>
            When set, your client must enter this PIN via the gear icon on the draw page before accessing these settings.
          </p>
        </AdminSec>

        <button onClick={doSave} disabled={saving} style={{
          width:"100%", padding:"16px",
          background:`linear-gradient(135deg,${a},#c94000)`,
          border:"none", borderRadius:8, cursor:saving?"not-allowed":"pointer",
          fontFamily:"'Space Grotesk', sans-serif", fontWeight:900,
          fontSize:".82rem", letterSpacing:".22em", color:"#000",
          boxShadow:`0 0 28px ${a}44`, opacity:saving?.7:1,
        }}>{saving?"SAVING…":"SAVE ALL SETTINGS"}</button>
      </div>
    </div>
  );
}

// ── PIN SCREEN ────────────────────────────────────────────────────────────────
function PINScreen({ pin, onOk, onCancel, accent }) {
  const [entered, setEntered] = useState("");
  const [error,   setError]   = useState(false);

  const press = d => {
    if (entered.length >= 6) return;
    const next = entered + d;
    setEntered(next); setError(false);
    if (next.length >= pin.length) {
      if (next === pin) { setTimeout(onOk, 160); }
      else { setError(true); setTimeout(()=>{setEntered("");setError(false);},650); }
    }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#08080f",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:30, padding:24, fontFamily:"'Space Grotesk', sans-serif",
    }}>
      <p style={{ fontSize:".6rem", letterSpacing:".4em", color:"rgba(255,255,255,.4)", margin:0 }}>ADMIN ACCESS</p>
      <div style={{ display:"flex", gap:14 }}>
        {Array.from({ length: Math.max(pin.length, 4) }).map((_,i) => (
          <div key={i} style={{
            width:14, height:14, borderRadius:"50%", transition:"all .15s",
            background: i < entered.length ? (error ? "#E53935" : accent) : "rgba(255,255,255,.14)",
          }}/>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,72px)", gap:12 }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
          <button key={i} onClick={()=>{
            if (d==="⌫") { setEntered(e=>e.slice(0,-1)); setError(false); }
            else if (d!=="") press(String(d));
          }} disabled={d===""} style={{
            height:72, borderRadius:12, border:"none",
            background:d===""?"transparent":"rgba(255,255,255,.07)",
            color:"#fff", fontSize:d==="⌫"?"1.2rem":"1.5rem",
            fontFamily:"'Space Grotesk', sans-serif", fontWeight:700,
            cursor:d===""?"default":"pointer", transition:"background .1s",
          }}
          onMouseEnter={e=>d!==""&&(e.currentTarget.style.background="rgba(255,255,255,.13)")}
          onMouseLeave={e=>d!==""&&(e.currentTarget.style.background="rgba(255,255,255,.07)")}
          >{d}</button>
        ))}
      </div>
      <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.28)", fontSize:".58rem", letterSpacing:".15em" }}>CANCEL</button>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

// ── ERROR BOUNDARY — shows crashes on screen instead of blank page ───────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", {
        style: {
          minHeight: "100vh",
          background: "#1a0000",
          color: "#ff6666",
          padding: "40px 20px",
          fontFamily: "monospace",
          fontSize: "14px",
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }
      },
        React.createElement("h1", { style: { color: "#ff9999", fontSize: "18px", marginBottom: "20px" } }, "App crashed"),
        React.createElement("div", { style: { marginBottom: "12px", fontWeight: "bold" } }, "Error message:"),
        React.createElement("div", { style: { marginBottom: "24px", background: "#330000", padding: "12px", borderRadius: "6px" } }, String(this.state.error?.message || this.state.error || "unknown")),
        React.createElement("div", { style: { marginBottom: "12px", fontWeight: "bold" } }, "Component stack:"),
        React.createElement("div", { style: { background: "#330000", padding: "12px", borderRadius: "6px", fontSize: "11px" } }, String(this.state.info?.componentStack || "unavailable")),
        React.createElement("div", { style: { marginTop: "24px", fontWeight: "bold" } }, "JS stack:"),
        React.createElement("div", { style: { background: "#330000", padding: "12px", borderRadius: "6px", fontSize: "11px" } }, String(this.state.error?.stack || "unavailable"))
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [page,    setPage]    = useState("draw");
  const [cfg,     setCfg]     = useState(DEFAULTS);
  const [showPin, setShowPin] = useState(false);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    // Failsafe: no matter what happens, the app becomes ready in 1.5s
    const failsafe = setTimeout(() => setReady(true), 1500);

    (async () => {
      try {
        // Try window.storage first (Claude artifacts), fall back to localStorage (Vercel/browsers)
        if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
          const r = await window.storage.get("raffle-cfg");
          if (r && r.value) setCfg(p => ({...DEFAULTS, ...JSON.parse(r.value)}));
        } else if (typeof window !== "undefined" && window.localStorage) {
          const raw = window.localStorage.getItem("raffle-cfg");
          if (raw) setCfg(p => ({...DEFAULTS, ...JSON.parse(raw)}));
        }
      } catch (e) {
        console.warn("Config load failed, using defaults:", e);
      }
      clearTimeout(failsafe);
      setReady(true);
    })();

    return () => clearTimeout(failsafe);
  }, []);

  const saveAndReturn = async newCfg => {
    setCfg(newCfg);
    try {
      const payload = JSON.stringify(newCfg);
      if (window.storage && typeof window.storage.set === "function") {
        await window.storage.set("raffle-cfg", payload);
      } else if (window.localStorage) {
        window.localStorage.setItem("raffle-cfg", payload);
      }
    } catch (e) {
      console.warn("Config save failed:", e);
    }
    setPage("draw");
  };

  const goAdmin = () => cfg.adminPin ? setShowPin(true) : setPage("admin");

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontSize:"1rem", letterSpacing:".3em", color:"rgba(255,255,255,.6)", fontFamily:"'Space Grotesk', sans-serif" }}>LOADING…</span>
    </div>
  );

  if (showPin) return <PINScreen pin={cfg.adminPin} onOk={()=>{setShowPin(false);setPage("admin");}} onCancel={()=>setShowPin(false)} accent={cfg.accent}/>;
  if (page==="admin") return <AdminPage cfg={cfg} onSave={saveAndReturn} onBack={()=>setPage("draw")}/>;
  return <DrawPage cfg={cfg} onAdmin={goAdmin}/>;
}

export default function App() {
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}

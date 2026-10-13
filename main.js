(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/\\{}[]#$%&*+=";

  /* ------------------------------------------------------------------
     Matrix rain (boot screen only)
     ------------------------------------------------------------------ */
  const rain = (() => {
    const c = $("#rain");
    const ctx = c.getContext("2d");
    let cols = [], size = 16, raf = 0, last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Array.from({ length: Math.ceil(innerWidth / size) }, () => Math.random() * -50);
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return;
      last = t;
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.font = `${size}px "IBM Plex Mono", monospace`;
      cols.forEach((y, i) => {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillStyle = Math.random() > 0.975 ? "#ff3340" : "#3bea6a";
        ctx.fillText(ch, i * size, y * size);
        cols[i] = y * size > innerHeight && Math.random() > 0.975 ? 0 : y + 1;
      });
    }
    return {
      start() {
        if (reduced) return;
        resize();
        addEventListener("resize", resize);
        raf = requestAnimationFrame(frame);
      },
      stop() {
        c.classList.add("is-gone");
        setTimeout(() => {
          cancelAnimationFrame(raf);
          removeEventListener("resize", resize);
          c.remove();
        }, 1300);
      },
    };
  })();

  /* ------------------------------------------------------------------
     Text decrypt effect
     ------------------------------------------------------------------ */
  function scramble(el, duration = 900) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    if (reduced) { el.textContent = final; return; }
    const start = performance.now();
    el.classList.add("is-scrambling");
    (function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const reveal = Math.floor(p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < reveal || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else { el.textContent = final; el.classList.remove("is-scrambling"); }
    })(start);
  }

  /* ------------------------------------------------------------------
     Audio
     ------------------------------------------------------------------ */
  const bgm = $("#bgm");
  const soundBtn = $("#soundToggle");
  bgm.volume = 0;
  let fadeId = 0;

  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeId);
    const from = bgm.volume, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / ms, 1);
      bgm.volume = from + (target - from) * p;
      if (p < 1) fadeId = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }
  function setSound(on) {
    soundBtn.setAttribute("aria-pressed", String(on));
    $(".sound__label", soundBtn).textContent = on ? "sound on" : "sound off";
    if (on) {
      bgm.play().then(() => fadeTo(0.45, 1200)).catch(() => setSound(false));
    } else {
      fadeTo(0, 400, () => bgm.pause());
    }
  }
  soundBtn.addEventListener("click", () => setSound(soundBtn.getAttribute("aria-pressed") !== "true"));

  /* ------------------------------------------------------------------
     Scroll-scrubbed video
     Videos were re-encoded with a keyframe on every frame so seeking is instant.
     ------------------------------------------------------------------ */
  function makeScrubber(video) {
    let target = 0, shown = 0;
    // Pull the whole file into memory when served over http(s) — seeking a blob never stalls on network.
    if (location.protocol.startsWith("http")) {
      const src = $("source", video).src;
      fetch(src).then(r => r.ok ? r.blob() : Promise.reject())
        .then(b => { video.src = URL.createObjectURL(b); video.load(); })
        .catch(() => {});
    }
    return {
      video,
      set(p) { target = Math.max(0, Math.min(1, p)); },
      tick() {
        const d = video.duration;
        if (!d || video.readyState < 1) return;
        shown += (target - shown) * 0.18;
        const t = shown * (d - 0.06);
        if (!video.seeking && Math.abs(video.currentTime - t) > 0.012) video.currentTime = t;
      },
      prime() {
        // iOS/Safari only paint seeks after the element has been played once from a gesture
        const p = video.play();
        if (p) p.then(() => video.pause()).catch(() => {});
      },
    };
  }

  const skull = makeScrubber($("#skullVideo"));
  const hud = makeScrubber($("#hudVideo"));

  /* ------------------------------------------------------------------
     Boot sequence
     ------------------------------------------------------------------ */
  const BOOT = [
    ["[ ok ] mounting /dev/neural", "ok"],
    ["[ ok ] loading agents: coordinator, triage, remediation, post-mortem", "ok"],
    ["[ ok ] handshake mcp://hbx.local  (json-rpc 2.0, streamable http)", "ok"],
    ["[ ok ] vector store online: chromadb · faiss · pgvector", "ok"],
    ["[ ok ] drift monitor armed: cusum control charts", "ok"],
    ["[warn] audio channel idle, awaiting operator", "warn"],
    ["", ""],
    ["> subject: harsh bhati", ""],
    ["> class:   generative ai engineer / agentic ai / ml", ""],
    ["> choose how to enter", ""],
  ];

  function runBoot() {
    const log = $("#bootLog");
    const actions = $("#bootActions");
    const ready = () => {
      actions.classList.add("is-ready");
      $("#enterSound").focus({ preventScroll: true });
    };
    if (reduced) {
      log.innerHTML = BOOT.map(([t, c]) => `<span class="${c}">${t}</span>`).join("\n");
      ready();
      return;
    }
    let i = 0;
    (function next() {
      if (i >= BOOT.length) { ready(); return; }
      const [text, cls] = BOOT[i++];
      const span = document.createElement("span");
      span.className = cls;
      log.appendChild(span);
      let j = 0;
      (function type() {
        span.textContent = text.slice(0, ++j);
        if (j < text.length) setTimeout(type, 8 + Math.random() * 14);
        else { log.appendChild(document.createTextNode("\n")); setTimeout(next, 90 + Math.random() * 140); }
      })();
    })();
  }

  let entered = false;
  function enter(withSound) {
    if (entered) return;
    entered = true;
    skull.prime();
    hud.prime();
    if (withSound) setSound(true);
    $("#boot").classList.add("is-gone");
    rain.stop();
    document.body.classList.remove("is-locked");
    if (lenis) lenis.start();
    if (hasGSAP) ScrollTrigger.refresh();
    setTimeout(() => scramble($(".intro__name"), 1200), 300);
    setTimeout(() => $("#boot").remove(), 900);
  }

  $("#enterSound").addEventListener("click", () => enter(true));
  $("#enterSilent").addEventListener("click", () => enter(false));

  /* ------------------------------------------------------------------
     Smooth scroll + ScrollTrigger
     ------------------------------------------------------------------ */
  let lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  if (hasGSAP && typeof window.Lenis !== "undefined" && !reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // In-page links go through Lenis so they glide instead of jump
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else if (target === 0) scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  function initScroll() {
    if (!hasGSAP) {
      // No animation library: leave everything visible and readable
      $$("[data-scramble]").forEach(el => (el.dataset.final = el.textContent));
      return;
    }

    // Progress bar
    gsap.to("#progressFill", {
      scaleX: 1, ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });

    if (!reduced) {
      gsap.set(".intro__video", { transformPerspective: 1200, scale: 1.08 });

      // Intro: scrub the skull, close the reticle, then dive through into the HUD
      const pct = $("#scanPct");
      ScrollTrigger.create({
        trigger: "#intro", start: "top top", end: "bottom bottom",
        onUpdate: self => {
          const p = self.progress;
          skull.set(p / 0.85);
          pct.textContent = (Math.min(p / 0.85, 1) * 100).toFixed(1).padStart(4, "0") + "%";
        },
      });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: "#intro", start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.to(".intro__hint", { opacity: 0, duration: 0.05 }, 0)
        .fromTo(".reticle", { scale: 1.35, opacity: 0.4 }, { scale: 0.92, opacity: 1, duration: 0.8, ease: "none" }, 0)
        .to(".intro__copy", { y: -40, opacity: 0, duration: 0.15 }, 0.8)
        .to(".intro__readout", { x: 40, opacity: 0, duration: 0.15 }, 0.8)
        .to(".reticle", { scale: 3, opacity: 0, duration: 0.15 }, 0.82)
        .to(".intro__video", { scale: 1.8, opacity: 0, duration: 0.17, ease: "power2.in" }, 0.83);

      // HUD video: white "loading" phase across the content, red alert phase lands on Contact
      const RED_AT = 0.47;
      ScrollTrigger.create({
        trigger: "#hudZone", start: "top top", endTrigger: "#contact", end: "top 60%",
        onUpdate: self => hud.set(self.progress * RED_AT),
      });
      ScrollTrigger.create({
        trigger: "#contact", start: "top 60%", end: "bottom bottom",
        onUpdate: self => hud.set(RED_AT + self.progress * (1 - RED_AT)),
      });

      // Panels fly in from depth, tied to scroll position
      $$(".log__entry, .proj, .who__card, .stack__group, .metric, .channels, .term").forEach(el => {
        gsap.fromTo(el,
          { z: -320, y: 80, opacity: 0, transformPerspective: 1000 },
          {
            z: 0, y: 0, opacity: 1, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", end: "top 62%", scrub: 0.8 },
          });
      });

      // The sphere spins up out of the floor
      gsap.fromTo(".sphere-wrap",
        { rotationX: 70, opacity: 0, transformPerspective: 900 },
        { rotationX: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "#stack", start: "top 85%", end: "top 30%", scrub: 1 } });
    }

    // Headings decrypt as they arrive
    $$(".sec [data-scramble]").forEach(el => {
      el.dataset.final = el.textContent;
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => scramble(el) });
    });

    // Count-up metrics
    $$("[data-count]").forEach(el => {
      const n = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      const o = { v: 0 };
      const paint = () => (el.textContent = pre + Math.round(o.v) + suf);
      if (reduced) { o.v = n; paint(); return; }
      ScrollTrigger.create({
        trigger: el, start: "top 90%", once: true,
        onEnter: () => gsap.to(o, { v: n, duration: 1.4, ease: "power3.out", onUpdate: paint }),
      });
    });

    // Red alert state for the final section
    ScrollTrigger.create({
      trigger: "#contact", start: "top 60%",
      onEnter: () => document.body.classList.add("is-alert"),
      onLeaveBack: () => document.body.classList.remove("is-alert"),
    });

    // Active nav link
    $$(".bar__nav a").forEach(a => {
      const sec = $(a.getAttribute("href"));
      ScrollTrigger.create({
        trigger: sec, start: "top 50%", end: "bottom 50%",
        onToggle: self => a.classList.toggle("is-active", self.isActive),
      });
    });

    // Drive both scrubbers from GSAP's ticker
    gsap.ticker.add(() => { skull.tick(); hud.tick(); });

    // Videos change layout height once metadata lands
    addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------
     3D tilt on panels + mouse parallax on the intro head
     ------------------------------------------------------------------ */
  function initTilt() {
    if (!hasGSAP || reduced || !finePointer) return;
    $$(".tilt").forEach(el => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const k = Math.min(1, 520 / r.width) * 7;
        rx((0.5 - y) * k);
        ry((x - 0.5) * k);
        el.style.setProperty("--mx", x * 100 + "%");
        el.style.setProperty("--my", y * 100 + "%");
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });

    const stage = $(".intro__stage");
    const copy = $(".intro__copy");
    const vRx = gsap.quickTo(".intro__video", "rotationX", { duration: 1.2, ease: "power3.out" });
    const vRy = gsap.quickTo(".intro__video", "rotationY", { duration: 1.2, ease: "power3.out" });
    const cX = gsap.quickTo(copy, "x", { duration: 1.2, ease: "power3.out" });
    stage.addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      vRy(x * 6); vRx(-y * 4); cX(-x * 24);
    });
  }

  /* ------------------------------------------------------------------
     3D skill sphere
     ------------------------------------------------------------------ */
  function initSphere() {
    const root = $("#sphere");
    const CORE = ["MCP", "Claude API", "RAG", "PyTorch", "LangGraph", "Google ADK", "FastMCP", "TypeScript", "Python", "LLMOps"];
    const REST = ["LoRA", "QLoRA", "PEFT", "Embeddings", "Guardrails", "Agno", "fast-agent", "CrewAI", "LangChain",
      "TensorFlow", "Keras", "Transformers", "LSTM", "CNNs", "OpenCV", "MediaPipe", "CUSUM", "MLflow", "LangSmith",
      "ChromaDB", "FAISS", "pgvector", "PostgreSQL", "Supabase", "MongoDB", "BigQuery", "FastAPI", "Deno",
      "Next.js", "React", "Docker", "Cloud Run", "SSE", "WebSockets", "JSON-RPC", "Gemini", "Llama 3.3", "C++"];
    const words = [...CORE, ...REST];
    const N = words.length;

    const pts = words.map((w, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / N);
      const theta = Math.sqrt(N * Math.PI) * phi;
      const el = document.createElement("span");
      el.className = "sphere__tag" + (i < CORE.length ? " is-core" : "");
      el.textContent = w;
      root.appendChild(el);
      return { el, x: Math.cos(theta) * Math.sin(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(phi) };
    });

    let vx = reduced ? 0 : 0.004, vy = reduced ? 0 : 0.006;
    let dragging = false, lx = 0, ly = 0, visible = false, raf = 0;

    function render() {
      const R = root.clientWidth * 0.4;
      const cx = Math.cos(vx), sx = Math.sin(vx), cy = Math.cos(vy), sy = Math.sin(vy);
      for (const p of pts) {
        // rotate around X then Y
        let y = p.y * cx - p.z * sx, z = p.y * sx + p.z * cx;
        let x = p.x * cy + z * sy; z = -p.x * sy + z * cy;
        p.x = x; p.y = y; p.z = z;
        const depth = (z + 1) / 2; // 0 back .. 1 front
        p.el.style.transform = `translate(-50%,-50%) translate3d(${x * R}px,${y * R}px,${z * R}px)`;
        p.el.style.opacity = (0.18 + depth * 0.82).toFixed(2);
        p.el.style.zIndex = Math.round(depth * 100);
      }
    }
    function loop() {
      if (!dragging) {
        // ease back toward the idle spin
        vx += ((reduced ? 0 : 0.004) - vx) * 0.02;
        vy += ((reduced ? 0 : 0.006) - vy) * 0.02;
      }
      render();
      raf = visible ? requestAnimationFrame(loop) : 0;
    }

    root.addEventListener("pointerdown", e => {
      dragging = true; lx = e.clientX; ly = e.clientY;
      root.setPointerCapture(e.pointerId);
    });
    root.addEventListener("pointermove", e => {
      if (!dragging) return;
      vy = (e.clientX - lx) * 0.004;
      vx = -(e.clientY - ly) * 0.004;
      lx = e.clientX; ly = e.clientY;
    });
    const release = () => (dragging = false);
    root.addEventListener("pointerup", release);
    root.addEventListener("pointercancel", release);

    render();
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(root);
  }

  /* ------------------------------------------------------------------
     Interactive terminal
     ------------------------------------------------------------------ */
  function initTerminal() {
    const out = $("#termOut");
    const form = $("#termForm");
    const input = $("#termIn");
    const history = [];
    let hIdx = 0;

    const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    const CMDS = {
      help: () => `<span class="m">available commands</span>
  whoami      who is harsh
  experience  where he has worked
  projects    things he has built
  skills      the short version of the stack
  education   degrees and scores
  contact     how to reach him
  github      open github profile
  linkedin    open linkedin profile
  sound       toggle background audio
  clear       clear the screen`,
      whoami: () => `Harsh Bhati. Generative AI engineer working on agentic AI and machine learning.
AI Engineer at Bull AI (San Francisco, remote). B.Tech at IIT Indore, 2023–2027.`,
      experience: () => `Bull AI ............................ AI Engineer, June 2026 – present
AVAP (Cognileap Eduventures LLP) ... Research Analyst, Gen AI and Blockchain, June – Sept 2026
tochan.ai .......................... ML Engineer Intern, June – Aug 2025
AgriHub, IIT Indore ................ ML Research Intern, May – Nov 2025`,
      projects: () => `operaiq          multi-agent SRE incident response   ${link("https://github.com/HBX814/operaiq", "repo")}
hbx              agentic analytics automation        ${link("https://github.com/HBX814/HBX", "repo")}
drift-detector   LLM observability MCP server        ${link("https://github.com/HBX814/drift-detector", "repo")}
makeup-try-on    BeautyGAN, 2nd of 40+ teams         ${link("https://github.com/HBX814/Virtual-Makeup-Try-on", "repo")}`,
      skills: () => `python  typescript  c++  sql
claude  gpt  gemini  llama 3.3  rag  lora/qlora  embeddings
mcp  fastmcp  google adk  agno  langgraph  crewai
pytorch  tensorflow  transformers  lstm  cnn
postgres  supabase  chromadb  faiss  pgvector  bigquery
fastapi  deno  next.js  react  docker  gcp`,
      education: () => `IIT Indore ............ B.Tech., 2023 – 2027 (expected)
CBSE Class XII (PCM) .. 93.2%, 2022
CBSE Class X .......... 95.8%, 2020`,
      contact: () => `email     <a href="mailto:harshbhati814@gmail.com">harshbhati814@gmail.com</a>
academic  <a href="mailto:mems230005017@iiti.ac.in">mems230005017@iiti.ac.in</a>
phone     <a href="tel:+919351270751">+91 93512 70751</a>`,
      github: () => { window.open("https://github.com/HBX814", "_blank", "noopener"); return "opening github.com/HBX814"; },
      linkedin: () => { window.open("https://linkedin.com/in/harsh-bhati-451a6930a", "_blank", "noopener"); return "opening linkedin.com/in/harsh-bhati-451a6930a"; },
      sound: () => { soundBtn.click(); return "toggled background audio"; },
      ls: () => "experience.log  projects/  stack/  profile.json  resume.pdf",
      sudo: args => args.join(" ").toLowerCase().includes("hire")
        ? `[sudo] access granted. Send the offer to <a href="mailto:harshbhati814@gmail.com">harshbhati814@gmail.com</a>`
        : "guest is not in the sudoers file. Try: sudo hire harsh",
      clear: () => { out.innerHTML = ""; return null; },
    };
    CMDS.cat = args => args[0] === "profile.json" ? CMDS.whoami() : args[0] === "experience.log" ? CMDS.experience() : `cat: ${esc(args[0] || "")}: try "cat experience.log"`;

    function esc(s) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
    function print(html) {
      out.insertAdjacentHTML("beforeend", html + "\n");
      out.scrollTop = out.scrollHeight;
    }

    print(`<span class="m">connected to hbx. type</span> <span class="u">help</span> <span class="m">to list commands.</span>`);

    form.addEventListener("submit", e => {
      e.preventDefault();
      const raw = input.value.trim();
      input.value = "";
      print(`<span class="u">guest@hbx:~$</span> ${esc(raw)}`);
      if (!raw) return;
      history.push(raw);
      hIdx = history.length;
      const [cmd, ...args] = raw.split(/\s+/);
      const fn = CMDS[cmd.toLowerCase()];
      const res = fn ? fn(args) : `command not found: ${esc(cmd)}. Type help for the list.`;
      if (res !== null) print(res);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowUp" && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
      else if (e.key === "ArrowDown") { hIdx = Math.min(hIdx + 1, history.length); input.value = history[hIdx] || ""; e.preventDefault(); }
    });
    $("#term").addEventListener("click", e => { if (e.target.tagName !== "A") input.focus({ preventScroll: true }); });
    // Keep wheel scrolling inside the terminal output from moving the page
    out.setAttribute("data-lenis-prevent", "");
  }

  /* ------------------------------------------------------------------
     Go
     ------------------------------------------------------------------ */
  rain.start();
  runBoot();
  initScroll();
  initTilt();
  initSphere();
  initTerminal();
})();

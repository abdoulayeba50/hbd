(() => {
  "use strict";

  const doc = document;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector) => doc.querySelector(selector);

  const stages = Array.from(doc.querySelectorAll(".stage"));
  const progress = $("#progress");
  const progressFill = $("#progressFill");
  const stepLabel = $("#stepLabel");
  const backBtn = $("#backBtn");
  const musicBtn = $("#musicBtn");
  const sfxBtn = $("#sfxBtn");
  const ambientLayer = $("#ambientLayer");
  const heartsLayer = $("#heartsLayer");
  const dustLayer = $("#dustLayer");
  const envelope = $("#envelope");
  const openBtn = $("#openBtn");
  const ageNumber = $("#ageNumber");
  const toLetterBtn = $("#toLetterBtn");
  const letterBody = $("#letterBody");
  const toMagicBtn = $("#toMagicBtn");
  const magicCard = $("#magicCard");
  const wishBtn = $("#wishBtn");
  const wishMessage = $("#wishMessage");
  const toFinalBtn = $("#toFinalBtn");
  const restartBtn = $("#restartBtn");

  let currentStep = 0;
  let ageAnimated = false;
  let letterPrepared = false;
  let letterRevealed = false;
  let letterTimers = [];
  let wishMade = false;
  let ageAnimatedWasCelebrated = false;

  /* ===== Ambiance légère ===== */
  function buildAmbient() {
    if (reduceMotion) return;

    const heartFragment = doc.createDocumentFragment();
    const dustFragment = doc.createDocumentFragment();
    const heartCount = window.innerWidth < 600 ? 8 : 14;
    const dustCount = window.innerWidth < 600 ? 16 : 28;
    const heartTones = ["rgba(232, 160, 184, 0.55)", "rgba(248, 221, 229, 0.8)", "rgba(217, 180, 119, 0.65)"];
    const dustTones = ["rgba(255, 248, 240, 0.95)", "rgba(217, 180, 119, 0.85)", "rgba(255, 255, 255, 0.9)"];

    for (let i = 0; i < heartCount; i += 1) {
      const heart = doc.createElement("span");
      heart.className = "ambient-heart";
      heart.textContent = i % 3 === 0 ? "♡" : "♥";
      heart.style.setProperty("--left", `${Math.random() * 100}%`);
      heart.style.setProperty("--size", `${10 + Math.random() * 14}px`);
      heart.style.setProperty("--tone", heartTones[i % heartTones.length]);
      heart.style.setProperty("--duration", `${13 + Math.random() * 15}s`);
      heart.style.setProperty("--delay", `${-Math.random() * 22}s`);
      heart.style.setProperty("--drift", `${(Math.random() - 0.5) * 130}px`);
      heartFragment.appendChild(heart);
    }

    for (let i = 0; i < dustCount; i += 1) {
      const speck = doc.createElement("span");
      speck.className = "dust";
      speck.style.setProperty("--left", `${Math.random() * 100}%`);
      speck.style.setProperty("--top", `${Math.random() * 100}%`);
      speck.style.setProperty("--size", `${2 + Math.random() * 3}px`);
      speck.style.setProperty("--tone", dustTones[i % dustTones.length]);
      speck.style.setProperty("--duration", `${3.5 + Math.random() * 5}s`);
      speck.style.setProperty("--delay", `${-Math.random() * 8}s`);
      dustFragment.appendChild(speck);
    }

    heartsLayer.appendChild(heartFragment);
    dustLayer.appendChild(dustFragment);
  }

  function initParallax() {
    if (reduceMotion) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    window.addEventListener("pointermove", (event) => {
      x = (event.clientX / window.innerWidth - 0.5) * 14;
      y = (event.clientY / window.innerHeight - 0.5) * 10;

      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          ambientLayer.style.setProperty("--parallax-x", `${x}px`);
          ambientLayer.style.setProperty("--parallax-y", `${y}px`);
          frame = 0;
        });
      }
    }, { passive: true });
  }

  /* ===== Particules (canvas) ===== */
  const ParticleFX = (() => {
    const canvas = $("#fxCanvas");
    const ctx = canvas && canvas.getContext("2d");
    const palette = ["#F8DDE5", "#D9B477", "#FFFFFF", "#641E38", "#E8A0B6", "#FFF3D6"];
    const particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let lastTime = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function density(count) {
      const screenFactor = width < 600 ? 0.6 : 1;
      const motionFactor = reduceMotion ? 0.3 : 1;
      return Math.max(6, Math.round(count * screenFactor * motionFactor));
    }

    function add(particle) {
      particles.push(particle);
      if (!raf) {
        lastTime = performance.now();
        raf = window.requestAnimationFrame(tick);
      }
    }

    function draw(particle) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / particle.fade));

      if (particle.shape === "confetti") {
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
      } else if (particle.shape === "petal") {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 4;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function tick(now) {
      const delta = Math.min((now - lastTime) / 16.67, 3) || 1;
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += particle.gravity * delta;
        particle.vx *= Math.pow(particle.drag, delta);
        particle.rotation += particle.spin * delta;
        particle.life -= delta;

        draw(particle);

        if (particle.life <= 0 || particle.y > height + 90) {
          particles.splice(i, 1);
        }
      }

      if (particles.length) {
        raf = window.requestAnimationFrame(tick);
      } else {
        raf = 0;
        ctx.clearRect(0, 0, width, height);
      }
    }

    function confetti(count, origin) {
      const total = density(count);
      for (let i = 0; i < total; i += 1) {
        const life = 240 + Math.random() * 150;
        add({
          x: origin === "center" ? width / 2 + (Math.random() - 0.5) * 140 : Math.random() * width,
          y: origin === "center" ? height * 0.52 : -24 - Math.random() * 60,
          vx: (Math.random() - 0.5) * (origin === "center" ? 7 : 3.4),
          vy: origin === "center" ? -4.5 - Math.random() * 3.5 : 0.8 + Math.random() * 2.2,
          gravity: origin === "center" ? 0.16 : 0.035,
          drag: 0.992,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.18,
          size: 6 + Math.random() * 7,
          color: palette[Math.floor(Math.random() * palette.length)],
          shape: "confetti",
          life,
          fade: life
        });
      }
    }

    function petals(count) {
      const total = density(count);
      for (let i = 0; i < total; i += 1) {
        const life = 380 + Math.random() * 180;
        add({
          x: Math.random() * width,
          y: -30 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 1.6,
          vy: 0.65 + Math.random() * 1.15,
          gravity: 0.008,
          drag: 0.999,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.04,
          size: 6 + Math.random() * 8,
          color: i % 3 === 0 ? "#F8DDE5" : "#E8A0B6",
          shape: "petal",
          life,
          fade: life
        });
      }
    }

    function sparkles(count, originY) {
      const total = density(count);
      for (let i = 0; i < total; i += 1) {
        const life = 80 + Math.random() * 90;
        add({
          x: Math.random() * width,
          y: originY === undefined ? Math.random() * height : originY + (Math.random() - 0.5) * 140,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.25 - Math.random() * 0.7,
          gravity: 0,
          drag: 0.99,
          rotation: 0,
          spin: 0,
          size: 2 + Math.random() * 3.5,
          color: i % 2 === 0 ? "#FFFFFF" : "#D9B477",
          shape: "glow",
          life,
          fade: life
        });
      }
    }

    if (!ctx) {
      return { open() {}, celebrate() {}, wish() {} };
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();

    return {
      open() {
        sparkles(20, height * 0.5);
      },
      celebrate() {
        confetti(90, "top");
        petals(26);
        sparkles(28);
      },
      wish() {
        confetti(80, "center");
        sparkles(48, height * 0.6);
        petals(14);
      }
    };
  })();

  /* ===== Audio généré (aucun fichier externe, jamais automatique) ===== */
  const AudioEngine = (() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const chords = [
      [261.63, 329.63, 392.0, 523.25],
      [246.94, 293.66, 369.99, 493.88],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 261.63, 349.23, 440.0]
    ];

    let context = null;
    let master = null;
    let musicTimer = null;
    let musicOn = false;
    let sfxOn = true;
    let chordIndex = 0;
    let audioFailed = false;

    function ensureContext() {
      if (!AudioContextClass || audioFailed) return null;
      if (!context) {
        try {
          context = new AudioContextClass();
          master = context.createGain();
          master.gain.value = 0.2;
          master.connect(context.destination);
        } catch (error) {
          audioFailed = true;
          return null;
        }
      }
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }
      return context;
    }

    function tone(frequency, start, duration, gain, type) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), start + 0.05);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.08);
    }

    function playChord() {
      if (!musicOn || !context) return;
      const chord = chords[chordIndex % chords.length];
      chordIndex += 1;
      const start = context.currentTime + 0.05;
      tone(chord[0] / 2, start, 3.4, 0.045, "sine");
      chord.slice(1).forEach((frequency, index) => {
        tone(frequency, start + 0.15 + index * 0.42, 1.9, 0.032, index % 2 === 0 ? "triangle" : "sine");
      });
      tone(chord[3] * 2, start + 1.75, 1.25, 0.017, "sine");
    }

    return {
      supported() {
        return Boolean(AudioContextClass) && !audioFailed;
      },
      toggleMusic() {
        if (!AudioContextClass) return false;
        if (musicOn) {
          musicOn = false;
          window.clearInterval(musicTimer);
          musicTimer = null;
          return false;
        }
        if (!ensureContext()) return false;
        musicOn = true;
        chordIndex = 0;
        playChord();
        musicTimer = window.setInterval(playChord, 3600);
        return true;
      },
      toggleSfx() {
        sfxOn = !sfxOn;
        if (sfxOn) this.sfx("tap");
        return sfxOn;
      },
      sfx(kind) {
        if (!sfxOn || !AudioContextClass || !ensureContext()) return;
        const start = context.currentTime + 0.02;

        if (kind === "open") {
          [659.25, 783.99, 987.77].forEach((frequency, index) => {
            tone(frequency, start + index * 0.09, 0.6, 0.042, "sine");
          });
        } else if (kind === "wish") {
          [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
            tone(frequency, start + index * 0.075, 0.9, 0.038, "sine");
          });
        } else {
          tone(880, start, 0.16, 0.022, "sine");
        }
      }
    };
  })();

  /* ===== Navigation et étapes ===== */
  function updateUI() {
    const stepNumber = currentStep + 1;
    const total = stages.length;

    stages.forEach((stage, index) => {
      const active = index === currentStep;
      stage.classList.toggle("is-active", active);
      stage.setAttribute("aria-hidden", String(!active));
      stage.inert = !active;
      if (active) stage.scrollTop = 0;
    });

    progressFill.style.width = `${(stepNumber / total) * 100}%`;
    progress.setAttribute("aria-valuenow", String(stepNumber));
    stepLabel.textContent = `${String(stepNumber).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    backBtn.hidden = currentStep === 0;
  }

  function onEnterStep(index) {
    if (index === 1) {
      animateAge();
      if (!ageAnimatedWasCelebrated) {
        ageAnimatedWasCelebrated = true;
        ParticleFX.celebrate();
      }
    }

    if (index === 2) {
      revealLetter();
    }
  }

  function goToStep(index) {
    if (index < 0 || index >= stages.length) return;
    currentStep = index;
    updateUI();
    onEnterStep(index);

    window.setTimeout(() => {
      const target = stages[index].querySelector("[data-autofocus]");
      if (target && !target.disabled && !target.closest("[hidden]")) {
        target.focus({ preventScroll: true });
      }
    }, reduceMotion ? 0 : 450);
  }

  function openGift() {
    const wasOpen = envelope.classList.contains("is-open");
    openBtn.disabled = true;

    window.setTimeout(() => {
      envelope.classList.add("is-open");

      window.setTimeout(() => {
        openBtn.disabled = false;
        goToStep(1);
      }, reduceMotion ? 160 : 1180);

      ParticleFX.open();
      AudioEngine.sfx("open");
    }, wasOpen ? 220 : 0);
  }

  function animateAge() {
    if (ageAnimated) return;
    ageAnimated = true;

    if (reduceMotion) {
      ageNumber.textContent = "22";
      return;
    }

    ageNumber.classList.remove("is-popping");
    void ageNumber.offsetWidth;
    ageNumber.classList.add("is-popping");

    const start = performance.now();
    const duration = 1500;

    function frame(now) {
      const ratio = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      ageNumber.textContent = String(Math.round(eased * 22)).padStart(2, "0");

      if (ratio < 1) {
        window.requestAnimationFrame(frame);
      } else {
        ageNumber.textContent = "22";
      }
    }

    window.requestAnimationFrame(frame);
  }

  /* ===== Lettre révélée mot par mot ===== */
  function prepareLetter() {
    if (letterPrepared) return;
    letterPrepared = true;

    letterBody.querySelectorAll(".letter-line").forEach((line) => {
      const parts = line.textContent.split(/(\s+)/);
      line.textContent = "";

      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          line.appendChild(doc.createTextNode(part));
          return;
        }
        const word = doc.createElement("span");
        word.className = "word";
        word.textContent = part;
        line.appendChild(word);
      });
    });
  }

  function showContinueButton(focus) {
    toMagicBtn.disabled = false;
    toMagicBtn.classList.remove("is-hidden");
    if (focus && currentStep === 2) {
      toMagicBtn.focus({ preventScroll: true });
    }
  }

  function revealLetter() {
    if (letterRevealed) return;
    letterRevealed = true;
    prepareLetter();

    if (reduceMotion) {
      letterBody.classList.add("all-visible");
      showContinueButton(true);
      return;
    }

    const words = Array.from(letterBody.querySelectorAll(".word"));
    words.forEach((word, index) => {
      letterTimers.push(window.setTimeout(() => word.classList.add("is-visible"), 220 + index * 30));
    });
    letterTimers.push(window.setTimeout(() => showContinueButton(true), 220 + words.length * 30 + 350));
  }

  /* ===== Vœu et conclusion ===== */
  function makeWish() {
    ParticleFX.wish();
    AudioEngine.sfx("wish");

    if (!wishMade) {
      wishMade = true;
      magicCard.classList.add("is-wished");
      wishMessage.hidden = false;
      window.requestAnimationFrame(() => wishMessage.classList.add("is-visible"));
      toFinalBtn.disabled = false;
      toFinalBtn.classList.remove("is-hidden");
      wishBtn.querySelector("span").textContent = "Faire un autre vœu";
      return;
    }

    wishMessage.classList.remove("is-visible");
    void wishMessage.offsetWidth;
    wishMessage.classList.add("is-visible");
  }

  function resetExperience() {
    letterTimers.forEach((timer) => window.clearTimeout(timer));
    letterTimers = [];

    ageAnimated = false;
    ageAnimatedWasCelebrated = false;
    ageNumber.textContent = "22";
    ageNumber.classList.remove("is-popping");

    envelope.classList.remove("is-open");
    openBtn.disabled = false;

    letterBody.classList.remove("all-visible");
    letterBody.querySelectorAll(".word").forEach((word) => word.classList.remove("is-visible"));
    letterRevealed = false;
    toMagicBtn.disabled = true;
    toMagicBtn.classList.add("is-hidden");

    wishMade = false;
    magicCard.classList.remove("is-wished");
    wishMessage.hidden = true;
    wishMessage.classList.remove("is-visible");
    toFinalBtn.disabled = true;
    toFinalBtn.classList.add("is-hidden");
    wishBtn.querySelector("span").textContent = "Faire un vœu";

    goToStep(0);
  }

  function setToggle(button, on, offLabel, onLabel) {
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    const label = on ? onLabel : offLabel;
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  /* ===== Événements ===== */
  openBtn.addEventListener("click", openGift);
  toLetterBtn.addEventListener("click", () => goToStep(2));
  toMagicBtn.addEventListener("click", () => goToStep(3));
  wishBtn.addEventListener("click", makeWish);
  toFinalBtn.addEventListener("click", () => goToStep(4));
  backBtn.addEventListener("click", () => goToStep(currentStep - 1));
  restartBtn.addEventListener("click", resetExperience);

  musicBtn.addEventListener("click", () => {
    const on = AudioEngine.toggleMusic();
    if (!AudioEngine.supported()) {
      musicBtn.hidden = true;
      return;
    }
    setToggle(musicBtn, on, "Activer la musique", "Désactiver la musique");
  });

  sfxBtn.addEventListener("click", () => {
    const on = AudioEngine.toggleSfx();
    if (!AudioEngine.supported()) {
      sfxBtn.hidden = true;
      return;
    }
    setToggle(sfxBtn, on, "Activer les effets sonores", "Désactiver les effets sonores");
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && currentStep > 0) {
      goToStep(currentStep - 1);
    }
  });

  /* ===== Initialisation ===== */
  buildAmbient();
  initParallax();
  updateUI();

  if (!AudioEngine.supported()) {
    musicBtn.hidden = true;
    sfxBtn.hidden = true;
  }
})();

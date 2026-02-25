const revealItems = document.querySelectorAll(".reveal");
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicGate = document.getElementById("musicGate");
const musicStartButton = document.getElementById("musicStartButton");
const graduationVideo = document.getElementById("graduationVideo");
const graduationSection = document.querySelector(".graduation-section");
const surpriseOverlay = document.getElementById("surpriseOverlay");
const surpriseClose = document.getElementById("surpriseClose");
const surpriseConfetti = document.getElementById("surpriseConfetti");
const portfolioSpectrum = document.getElementById("portfolioSpectrum");
const portfolioSpectrumCtx = portfolioSpectrum
  ? portfolioSpectrum.getContext("2d")
  : null;
const url = new URL(window.location.href);
const shouldAutoplayFromLanding = url.searchParams.get("autoplay") === "1";
let audioContext = null;
let analyserNode = null;
let sourceNode = null;
let beatFrameId = null;
const beatBuffer = new Uint8Array(128);

const resizePortfolioSpectrum = () => {
  if (!portfolioSpectrum || !portfolioSpectrumCtx) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = portfolioSpectrum.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (portfolioSpectrum.width !== width || portfolioSpectrum.height !== height) {
    portfolioSpectrum.width = width;
    portfolioSpectrum.height = height;
  }
  portfolioSpectrumCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const drawPortfolioSpectrum = (activeAudio = false) => {
  if (!portfolioSpectrum || !portfolioSpectrumCtx) {
    return;
  }

  resizePortfolioSpectrum();

  const width = portfolioSpectrum.clientWidth;
  const height = portfolioSpectrum.clientHeight;
  if (width <= 0 || height <= 0) {
    return;
  }

  const now = performance.now() * 0.001;
  portfolioSpectrumCtx.clearRect(0, 0, width, height);

  const fadeGradient = portfolioSpectrumCtx.createLinearGradient(0, 0, width, 0);
  fadeGradient.addColorStop(0, "rgba(12, 18, 54, 0.14)");
  fadeGradient.addColorStop(0.5, "rgba(12, 18, 54, 0.03)");
  fadeGradient.addColorStop(1, "rgba(12, 18, 54, 0.14)");
  portfolioSpectrumCtx.fillStyle = fadeGradient;
  portfolioSpectrumCtx.fillRect(0, 0, width, height);

  const bars = 52;
  const gap = 4;
  const barWidth = (width - gap * (bars - 1)) / bars;
  const baseY = height * 0.84;

  for (let i = 0; i < bars; i += 1) {
    let intensity;
    if (activeAudio && analyserNode) {
      const bin = Math.floor((i / bars) * beatBuffer.length);
      intensity = beatBuffer[bin] / 255;
    } else {
      intensity = 0.13 + Math.abs(Math.sin(now * 2.25 + i * 0.36)) * 0.2;
    }

    const barHeight = Math.max(6, intensity * (height * 0.72));
    const x = i * (barWidth + gap);
    const y = baseY - barHeight;
    const barGradient = portfolioSpectrumCtx.createLinearGradient(0, y, 0, baseY);
    barGradient.addColorStop(0, "rgba(72, 232, 255, 0.95)");
    barGradient.addColorStop(0.55, "rgba(166, 201, 255, 0.84)");
    barGradient.addColorStop(1, "rgba(255, 77, 216, 0.65)");
    portfolioSpectrumCtx.fillStyle = barGradient;
    portfolioSpectrumCtx.fillRect(x, y, barWidth, barHeight);
  }
};

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const createSurpriseConfetti = () => {
  if (!surpriseConfetti) {
    return;
  }

  surpriseConfetti.innerHTML = "";
  const colors = ["#ff4dd8", "#48e8ff", "#ffd76b", "#77ffb5", "#ff8f8f", "#9ca8ff"];

  for (let i = 0; i < 34; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--left", `${Math.random() * 100}%`);
    piece.style.setProperty("--delay", `${Math.random() * 0.45}s`);
    piece.style.setProperty("--duration", `${1.6 + Math.random() * 1.1}s`);
    piece.style.setProperty("--drift", `${-2.7 + Math.random() * 5.4}rem`);
    piece.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);
    surpriseConfetti.appendChild(piece);
  }
};

const closeSurpriseOverlay = () => {
  if (!surpriseOverlay) {
    return;
  }

  surpriseOverlay.classList.remove("is-visible");
  surpriseOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("surprise-open");

  setTimeout(() => {
    surpriseOverlay.setAttribute("hidden", "");
  }, 380);
};

const openSurpriseOverlay = () => {
  if (!surpriseOverlay) {
    return;
  }

  surpriseOverlay.removeAttribute("hidden");
  surpriseOverlay.setAttribute("aria-hidden", "false");
  createSurpriseConfetti();
  document.body.classList.add("surprise-open");

  requestAnimationFrame(() => {
    surpriseOverlay.classList.add("is-visible");
  });
};

if (surpriseOverlay) {
  setTimeout(() => {
    openSurpriseOverlay();
  }, 220);

  if (surpriseClose) {
    surpriseClose.addEventListener("click", () => {
      closeSurpriseOverlay();
    });
  }

  surpriseOverlay.addEventListener("click", (event) => {
    if (event.target === surpriseOverlay) {
      closeSurpriseOverlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && surpriseOverlay.classList.contains("is-visible")) {
      closeSurpriseOverlay();
    }
  });
}

const syncMusicButton = () => {
  if (!bgMusic || !musicToggle) {
    return;
  }

  const isPlaying = !bgMusic.paused;
  musicToggle.textContent = isPlaying ? "Pause Music" : "Play Music";
};

const stopBeatEffect = () => {
  if (beatFrameId) {
    cancelAnimationFrame(beatFrameId);
    beatFrameId = null;
  }
  document.documentElement.style.setProperty("--beat-strength", "0");
  document.body.classList.remove("music-beat-active");
  drawPortfolioSpectrum(false);
};

const ensureBeatAnalyser = () => {
  if (!bgMusic) {
    return false;
  }

  if (analyserNode) {
    return true;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return false;
  }

  try {
    audioContext = new AudioCtx();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.82;

    sourceNode = audioContext.createMediaElementSource(bgMusic);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);
    return true;
  } catch (error) {
    return false;
  }
};

const startBeatEffect = async () => {
  if (!bgMusic || bgMusic.paused) {
    stopBeatEffect();
    return;
  }

  if (!ensureBeatAnalyser()) {
    return;
  }

  if (audioContext && audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (error) {
      return;
    }
  }

  if (beatFrameId) {
    return;
  }

  document.body.classList.add("music-beat-active");

  const updateBeat = () => {
    if (!analyserNode || !bgMusic || bgMusic.paused) {
      stopBeatEffect();
      return;
    }

    analyserNode.getByteFrequencyData(beatBuffer);
    drawPortfolioSpectrum(true);

    let bass = 0;
    const bassBins = 14;
    for (let i = 0; i < bassBins; i += 1) {
      bass += beatBuffer[i];
    }
    bass /= bassBins * 255;

    const normalized = Math.max(0, Math.min(1, (bass - 0.08) * 2.4));
    document.documentElement.style.setProperty(
      "--beat-strength",
      normalized.toFixed(3)
    );

    beatFrameId = requestAnimationFrame(updateBeat);
  };

  beatFrameId = requestAnimationFrame(updateBeat);
};

window.addEventListener("resize", () => {
  drawPortfolioSpectrum(!bgMusic?.paused);
});

const playMusic = async () => {
  if (!bgMusic) {
    return false;
  }

  try {
    await bgMusic.play();
    localStorage.setItem("hbMusicEnabled", "1");
    sessionStorage.removeItem("hbMusicAutoplay");
    if (shouldAutoplayFromLanding && url.searchParams.has("autoplay")) {
      url.searchParams.delete("autoplay");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (musicGate) {
      musicGate.classList.remove("is-visible");
    }
    syncMusicButton();
    return true;
  } catch (error) {
    if (musicGate) {
      musicGate.classList.add("is-visible");
    }
    syncMusicButton();
    return false;
  }
};

if (musicToggle && bgMusic) {
  musicToggle.addEventListener("click", async () => {
    if (bgMusic.paused) {
      await playMusic();
      return;
    }

    bgMusic.pause();
    localStorage.setItem("hbMusicEnabled", "0");
    syncMusicButton();
  });
}

if (musicStartButton) {
  musicStartButton.addEventListener("click", async () => {
    await playMusic();
  });
}

if (bgMusic) {
  bgMusic.volume = 0.5;
  drawPortfolioSpectrum(false);

  bgMusic.addEventListener("play", () => {
    startBeatEffect();
  });

  bgMusic.addEventListener("pause", () => {
    stopBeatEffect();
  });

  bgMusic.addEventListener("ended", () => {
    stopBeatEffect();
  });

  bgMusic.addEventListener("error", () => {
    if (musicToggle) {
      musicToggle.disabled = true;
      musicToggle.textContent = "Add Happy.mp3";
    }
    if (musicGate) {
      musicGate.classList.remove("is-visible");
    }
  });

  const shouldAutoplay =
    shouldAutoplayFromLanding ||
    sessionStorage.getItem("hbMusicAutoplay") === "1" ||
    localStorage.getItem("hbMusicEnabled") === "1";

  if (shouldAutoplay) {
    playMusic();
  } else {
    syncMusicButton();
    stopBeatEffect();
  }
}

if (graduationVideo) {
  graduationVideo.loop = true;
  graduationVideo.setAttribute("loop", "");
  graduationVideo.muted = true;
  graduationVideo.setAttribute("muted", "");

  const autoplayGraduationVideo = async () => {
    try {
      await graduationVideo.play();
    } catch (error) {}
  };

  graduationVideo.addEventListener("loadeddata", autoplayGraduationVideo);

  if ("IntersectionObserver" in window && graduationSection) {
    const graduationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            autoplayGraduationVideo();
            return;
          }
          graduationVideo.pause();
        });
      },
      { threshold: 0.45 }
    );

    graduationObserver.observe(graduationSection);
  } else {
    autoplayGraduationVideo();
  }
}

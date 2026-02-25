const enterButton = document.getElementById("enterButton");
const landingMusic = document.getElementById("landingMusic");
const landingSpectrum = document.getElementById("landingSpectrum");
const landingStartTip = document.getElementById("landingStartTip");
const spectrumCtx = landingSpectrum ? landingSpectrum.getContext("2d") : null;
let spectrumFrameId = null;
let spectrumAudioContext = null;
let spectrumAnalyser = null;
let spectrumSource = null;
let spectrumData = null;
let landingAudioFinished = false;
let landingStartTipHidden = false;

const hideLandingStartTip = () => {
  if (!landingStartTip || landingStartTipHidden) {
    return;
  }

  landingStartTipHidden = true;
  landingStartTip.classList.add("is-hidden");
};

const setEnterButtonEnabled = (enabled) => {
  if (!enterButton) {
    return;
  }

  enterButton.disabled = !enabled;
  enterButton.setAttribute("aria-disabled", (!enabled).toString());
};

const playLandingMusic = async () => {
  if (!landingMusic) {
    return;
  }

  try {
    await landingMusic.play();
    hideLandingStartTip();
  } catch (error) {
    // Browser may block autoplay until user interaction.
  }
};

const ensureSpectrumAnalyser = () => {
  if (!landingMusic || !spectrumCtx) {
    return false;
  }

  if (spectrumAnalyser) {
    return true;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return false;
  }

  try {
    spectrumAudioContext = new AudioCtx();
    spectrumAnalyser = spectrumAudioContext.createAnalyser();
    spectrumAnalyser.fftSize = 256;
    spectrumAnalyser.smoothingTimeConstant = 0.78;
    spectrumSource = spectrumAudioContext.createMediaElementSource(landingMusic);
    spectrumSource.connect(spectrumAnalyser);
    spectrumAnalyser.connect(spectrumAudioContext.destination);
    spectrumData = new Uint8Array(spectrumAnalyser.frequencyBinCount);
    return true;
  } catch (error) {
    return false;
  }
};

const drawLandingSpectrum = () => {
  if (!spectrumCtx || !landingSpectrum) {
    return;
  }

  const width = landingSpectrum.width;
  const height = landingSpectrum.height;
  const now = performance.now() * 0.001;

  spectrumCtx.clearRect(0, 0, width, height);
  const fadeGradient = spectrumCtx.createLinearGradient(0, 0, width, 0);
  fadeGradient.addColorStop(0, "rgba(15, 22, 66, 0.18)");
  fadeGradient.addColorStop(0.5, "rgba(12, 19, 62, 0.04)");
  fadeGradient.addColorStop(1, "rgba(15, 22, 66, 0.18)");
  spectrumCtx.fillStyle = fadeGradient;
  spectrumCtx.fillRect(0, 0, width, height);

  let activeAudio = false;
  if (spectrumAnalyser && spectrumData) {
    if (spectrumAudioContext && spectrumAudioContext.state === "suspended" && !landingMusic.paused) {
      spectrumAudioContext.resume().catch(() => {});
    }

    if (!landingMusic.paused && spectrumAudioContext && spectrumAudioContext.state === "running") {
      spectrumAnalyser.getByteFrequencyData(spectrumData);
      activeAudio = true;
    }
  }

  const bars = 56;
  const gap = 4;
  const barWidth = (width - gap * (bars - 1)) / bars;
  const baseY = height * 0.84;

  for (let i = 0; i < bars; i += 1) {
    let intensity;
    if (activeAudio) {
      const bin = Math.floor((i / bars) * spectrumData.length);
      intensity = spectrumData[bin] / 255;
    } else {
      intensity = 0.16 + Math.abs(Math.sin(now * 2.4 + i * 0.42)) * 0.28;
    }

    const barHeight = Math.max(7, intensity * (height * 0.74));
    const x = i * (barWidth + gap);
    const y = baseY - barHeight;
    const barGradient = spectrumCtx.createLinearGradient(0, y, 0, baseY);
    barGradient.addColorStop(0, "rgba(72, 232, 255, 0.95)");
    barGradient.addColorStop(0.55, "rgba(154, 198, 255, 0.85)");
    barGradient.addColorStop(1, "rgba(255, 77, 216, 0.7)");
    spectrumCtx.fillStyle = barGradient;
    spectrumCtx.fillRect(x, y, barWidth, barHeight);
  }

  spectrumFrameId = requestAnimationFrame(drawLandingSpectrum);
};

const startLandingSpectrum = () => {
  if (!spectrumCtx || !landingSpectrum) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = landingSpectrum.getBoundingClientRect();
  landingSpectrum.width = Math.max(1, Math.floor(rect.width * dpr));
  landingSpectrum.height = Math.max(1, Math.floor(rect.height * dpr));
  spectrumCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ensureSpectrumAnalyser();

  if (!spectrumFrameId) {
    spectrumFrameId = requestAnimationFrame(drawLandingSpectrum);
  }
};

const primeAudioForAutoplay = async () => {
  const primer = new Audio("Happy.mp3");
  primer.preload = "auto";
  primer.volume = 0;

  try {
    await primer.play();
    primer.pause();
    primer.currentTime = 0;
  } catch (error) {
    // Ignore primer errors; the portfolio page still has manual playback fallback.
  }
};

if (landingMusic) {
  setEnterButtonEnabled(false);
  landingMusic.loop = false;
  landingMusic.volume = 0.55;
  playLandingMusic();
  startLandingSpectrum();

  const unlockAudio = async () => {
    if (landingAudioFinished) {
      return;
    }
    if (!landingMusic.paused) {
      return;
    }
    await playLandingMusic();
    if (spectrumAudioContext && spectrumAudioContext.state === "suspended") {
      spectrumAudioContext.resume().catch(() => {});
    }
  };

  const detachUnlockAudio = () => {
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  landingMusic.addEventListener("ended", () => {
    landingAudioFinished = true;
    setEnterButtonEnabled(true);
    detachUnlockAudio();
    hideLandingStartTip();
  });

  landingMusic.addEventListener("error", () => {
    setEnterButtonEnabled(true);
    detachUnlockAudio();
    hideLandingStartTip();
  });

  landingMusic.addEventListener("play", () => {
    hideLandingStartTip();
  });

  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
} else {
  setEnterButtonEnabled(true);
  hideLandingStartTip();
}

if (enterButton) {
  enterButton.addEventListener("click", async () => {
    if (enterButton.disabled) {
      return;
    }

    if (landingMusic) {
      landingMusic.pause();
      landingMusic.currentTime = 0;
    }
    if (spectrumFrameId) {
      cancelAnimationFrame(spectrumFrameId);
      spectrumFrameId = null;
    }
    sessionStorage.setItem("hbMusicAutoplay", "1");
    localStorage.setItem("hbMusicEnabled", "1");
    await primeAudioForAutoplay();
    window.location.href = "portfolio.html?autoplay=1";
  });
}

window.addEventListener("resize", () => {
  startLandingSpectrum();
});

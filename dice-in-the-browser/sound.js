// bowerbird sound loop in intro

export function loopSound(src = "bowerbirdsound.mp3") {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0.5; 

  const start = () => {
    audio.play().then(
      () => {
        window.removeEventListener("pointerdown", start);
        window.removeEventListener("keydown", start);
      },
      () => {} 
    );
  };
  window.addEventListener("pointerdown", start);
  window.addEventListener("keydown", start);
  start();
  return audio;
}

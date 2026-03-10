// First visit intro: keep overlay while hero video warms up in background.     
const isHomePage = location.pathname === '/' || location.pathname.endsWith('index.html') || location.pathname.endsWith('HYBRID%20GYM/');                        
if (isHomePage) {
  const style = document.createElement('style');
  style.innerHTML = `
    .nav-logo img { opacity: 0; transition: opacity 0.3s ease; }
    .intro-loader { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
    .intro-loader-bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(circle at center, #141414, #000); transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
    .intro-logo-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 40px; }
    .intro-logo { width: min(24vw, 130px); height: auto; filter: drop-shadow(0 0 16px rgba(245,200,0,0.26)) drop-shadow(0 0 30px rgba(245,200,0,0.16)); transform-origin: center center; will-change: transform; transition: opacity 0.3s; animation: logoPulse 2s infinite ease-in-out; }
    @keyframes logoPulse { 0%, 100% { opacity: 0.7; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 25px rgba(245,200,0,0.4)) drop-shadow(0 0 40px rgba(245,200,0,0.2)); } }
    @media(max-width:768px) { .intro-logo { width: min(34vw, 120px); } }
    .intro-progress-track { width: 180px; height: 2px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateY(0); }
    .intro-progress-bar { width: 0%; height: 100%; background: var(--y); box-shadow: 0 0 10px var(--y); transition: width 2.34s cubic-bezier(0.22, 1, 0.36, 1); }
    .intro-hide .intro-progress-track { opacity: 0; transform: translateY(10px); }
    body.intro-active { overflow: hidden !important; }

    #hc > * { opacity: 0; filter: blur(12px); transform: translateY(20px); transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), filter 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform, opacity, filter; }
    body.hero-animate #hc > * { opacity: 1; filter: blur(0); transform: translateY(0); }
    body.hero-animate #hc > *:nth-child(1) { transition-delay: 0.05s; }
    body.hero-animate #hc > *:nth-child(2) { transition-delay: 0.15s; }
    body.hero-animate #hc > *:nth-child(3) { transition-delay: 0.25s; }
    body.hero-animate #hc > *:nth-child(4) { transition-delay: 0.35s; }
    body.hero-animate #hc > *:nth-child(5) { transition-delay: 0.45s; }
  `;
  document.head.appendChild(style);

  const introOverlay = document.createElement('div');
  introOverlay.className = 'intro-loader';
  introOverlay.innerHTML = `
    <div class="intro-loader-bg"></div>
    <div class="intro-logo-wrap">
      <img class="intro-logo" src="media/images/logo.png" alt="Hybrid">
      <div class="intro-progress-track"><div class="intro-progress-bar"></div></div>
    </div>
  `;
  document.body.appendChild(introOverlay);
  document.body.classList.add('intro-active');

  const introLogo = introOverlay.querySelector('.intro-logo');
  const introBar = introOverlay.querySelector('.intro-progress-bar');
  const loaderBg = introOverlay.querySelector('.intro-loader-bg');

  requestAnimationFrame(() => {
    introBar.style.width = '100%';
  });

  setTimeout(() => {
    const tarLogo = document.querySelector('.nav-logo img');
    introOverlay.classList.add('intro-hide');
    introLogo.style.animation = 'none';

    if (tarLogo && introLogo) {
      const tarRect = tarLogo.getBoundingClientRect();
      const srcRect = introLogo.getBoundingClientRect();

      if (tarRect.width === 0) {
        loaderBg.style.opacity = '0';
        introLogo.style.opacity = '0';
        if (tarLogo) tarLogo.style.opacity = '1';
        finishIntroAnim(introOverlay);
        return;
      }

      const scale = tarRect.width / srcRect.width;
      const deltaX = tarRect.left + (tarRect.width / 2) - (srcRect.left + (srcRect.width / 2));
      const deltaY = tarRect.top + (tarRect.height / 2) - (srcRect.top + (srcRect.height / 2));
      
      introLogo.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease 0.2s';
      introLogo.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
      
      setTimeout(() => {
        loaderBg.style.opacity = '0';
        document.body.classList.add('hero-animate');
      }, 50);

      setTimeout(() => {
        introLogo.style.opacity = '0';
        tarLogo.style.opacity = '1'; // Show actual nav logo directly as it lands
        finishIntroAnim(introOverlay);
      }, 650);
    } else {
      loaderBg.style.opacity = '0';
      document.body.classList.add('hero-animate');
      if (tarLogo) tarLogo.style.opacity = '1';
      finishIntroAnim(introOverlay);
    }
  }, 2340);
}

function finishIntroAnim(overlay) {
  setTimeout(() => {
    if(overlay && overlay.parentNode) overlay.remove();
    document.body.classList.remove('intro-active');
  }, 200);
}

addEventListener('pageshow',()=>{
  // No longer using transitionOverlay for initial load, handled above
});

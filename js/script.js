const nav=document.getElementById('nav');
const hvw=document.getElementById('hvw'),hvb=document.getElementById('hvb'),hc=document.getElementById('hc'),hero=document.getElementById('hero');
const heroVideo=document.querySelector('.hero-vid');
const shi=document.querySelector('.shi');
const mob=document.getElementById('mob');
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobileViewport=matchMedia('(max-width: 900px)').matches;
const lowPowerMode=prefersReducedMotion||isMobileViewport;

// Super smooth scroll with rAF — one listener, no jank
let lastScroll=0;
let navCompact=false;
let heroTargetProgress=0;
let heroCurrentProgress=0;
let lastRenderedProgress=-1;
let heroHeight=hero?hero.offsetHeight:1;
let framePending=false;
const NAV_ENTER_SCROLL=96;
const NAV_EXIT_SCROLL=36;
const HERO_SCROLL_RANGE=lowPowerMode?.58:.44;
const HERO_SMOOTHING=lowPowerMode?.18:.14;

const renderHero=(p)=>{
  const yShift=(lowPowerMode?36:72)*p;
  // Reduced scale increment per user request (make it smaller and smoother)
  const bgScale=isMobileViewport? 1 : 1 + (p * 0.035); 
  const contentShift=(lowPowerMode?28:52)*p;
  const contentScale=1-p*(lowPowerMode?.05:.07);
  const contentFade=Math.max(0,1-p*(lowPowerMode?1.75:2.35));
  const curveProgress=Math.pow(p,.85);
  const radius=(lowPowerMode?26:58)*curveProgress;
  const sideInset=(lowPowerMode?2.6:5.8)*curveProgress;
  const topInset=(lowPowerMode?.7:1.5)*curveProgress;
  // Reduce bottom inset slightly on desktop so it doesn't clip the zoomed video too harshly
  const bottomInset=(lowPowerMode?2.8: (isMobileViewport? 6.5 : 4.5))*curveProgress;
  const ambientStrength=Math.max(0,(curveProgress-.08)/.92)*(lowPowerMode?.58:.9);
  
  // Drastically cut down blur intensities and alpha values for MAXIMUM GPU performance and smoothness
  const glowA=.04+curveProgress*.12;
  const glowB=.02+curveProgress*.08;
  const ring=.05+curveProgress*.1;

  hvw.style.transform='translate3d(0,'+yShift.toFixed(2)+'px,0) scale('+bgScale.toFixed(4)+')';
  hvw.style.clipPath='inset('+topInset.toFixed(2)+'% '+sideInset.toFixed(2)+'% '+bottomInset.toFixed(2)+'% '+sideInset.toFixed(2)+'% round '+radius.toFixed(1)+'px)';
  if(hvb){
    hvb.style.borderRadius=radius.toFixed(1)+'px';
    hvb.style.setProperty('--ambient',ambientStrength.toFixed(3));
    // Cap blur to max 24px and decrease minimum to lighten the render thread
    hvb.style.setProperty('--ambient-blur',(8+curveProgress*16).toFixed(1)+'px');
    // Minimal shadow footprints for zero lag
    hvb.style.boxShadow='0 0 0 1px rgba(245,200,0,'+ring.toFixed(3)+'),0 0 '+(12+curveProgress*12).toFixed(1)+'px rgba(245,200,0,'+glowA.toFixed(3)+'),0 0 '+(20+curveProgress*24).toFixed(1)+'px rgba(229,34,34,'+glowB.toFixed(3)+')';
  }
  hc.style.opacity=contentFade.toFixed(3);
  hc.style.transform='translate3d(0,'+(contentShift*-1).toFixed(2)+'px,0) scale('+contentScale.toFixed(4)+')';
  if(shi) shi.style.opacity=Math.max(0,1-p*5).toFixed(3);
};

const tick=()=>{
  framePending=false;

  if(nav){
    // Hysteresis prevents flicker when hovering around the threshold.
    const shouldCompact=navCompact?lastScroll>NAV_EXIT_SCROLL:lastScroll>NAV_ENTER_SCROLL;
    if(shouldCompact!==navCompact){
      navCompact=shouldCompact;
      nav.classList.toggle('scrolled',navCompact);
      mob?.classList.toggle('is-scrolled',navCompact);
    }
  }

  if(hero&&hvw&&hc){
    heroTargetProgress=Math.min(Math.max(lastScroll/(heroHeight*HERO_SCROLL_RANGE),0),1);
    heroCurrentProgress+=(heroTargetProgress-heroCurrentProgress)*HERO_SMOOTHING;

    if(Math.abs(heroTargetProgress-heroCurrentProgress)<0.001){
      heroCurrentProgress=heroTargetProgress;
    }

    if(Math.abs(heroCurrentProgress-lastRenderedProgress)>0.001){
      renderHero(heroCurrentProgress);
      lastRenderedProgress=heroCurrentProgress;
    }

    const heroStillInViewRange=lastScroll<heroHeight*1.3;
    if(heroStillInViewRange&&Math.abs(heroTargetProgress-heroCurrentProgress)>0.001){
      framePending=true;
      requestAnimationFrame(tick);
    }
  }
};

const queueTick=()=>{
  if(!framePending){
    framePending=true;
    requestAnimationFrame(tick);
  }
};

addEventListener('scroll',()=>{
  lastScroll=scrollY;
  queueTick();
},{passive:true});

// Ensure correct nav state on initial load and when viewport changes.
lastScroll=scrollY;
queueTick();
addEventListener('resize',()=>{
  heroHeight=hero?hero.offsetHeight:1;
  lastScroll=scrollY;
  queueTick();
});

// Avoid showing placeholder first-frame art: reveal video only when playable.
if(hvb&&heroVideo){
  const setReady=()=>hvb.classList.add('is-video-ready');
  const setLoading=()=>hvb.classList.remove('is-video-ready');

  setLoading();

  heroVideo.addEventListener('loadedmetadata',()=>{
    try{
      if(heroVideo.currentTime<0.18&&heroVideo.duration>0.3){
        heroVideo.currentTime=0.18;
      }
    }catch{}
  },{once:true});

  heroVideo.addEventListener('canplay',setReady,{once:true});
  heroVideo.addEventListener('playing',setReady,{once:true});
  heroVideo.addEventListener('error',setLoading);

  if(heroVideo.readyState>=3){
    setReady();
  }
}

// Hamburger
const hbg=document.getElementById('hbg');
hbg?.setAttribute('aria-expanded','false');
hbg?.addEventListener('click',()=>{
  mob.classList.toggle('open');
  const isOpen=mob.classList.contains('open');
  hbg.classList.toggle('is-active',isOpen);
  hbg.setAttribute('aria-expanded',String(isOpen));
});
mob?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  mob.classList.remove('open');
  hbg?.classList.remove('is-active');
  hbg?.setAttribute('aria-expanded','false');
}));

// Scroll reveals
if(prefersReducedMotion){
  document.querySelectorAll('.sr, .sr-x').forEach(el=>el.classList.add('v'));
}else{
  const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('v');obs.unobserve(el.target);}}),{threshold:.06,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.sr, .sr-x').forEach(el=>obs.observe(el));
}

// Smooth anchors
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}));

// Full-screen page transition for internal page navigation.
const transitionOverlay=document.createElement('div');
transitionOverlay.className='page-transition';
transitionOverlay.setAttribute('aria-hidden','true');
transitionOverlay.innerHTML='<img class="page-transition-logo" src="media/images/logo.png" alt="">';
document.body.appendChild(transitionOverlay);

const shouldTransition=(href)=>{
  if(!href||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('javascript:')) return false;
  try{
    const targetUrl=new URL(href,location.href);
    if(targetUrl.origin!==location.origin) return false;
    if(targetUrl.pathname===location.pathname&&targetUrl.hash) return false;
    return true;
  }catch{
    return false;
  }
};

const goWithTransition=(href)=>{
  transitionOverlay.classList.add('is-active');
  setTimeout(()=>{location.href=href;},420);
};

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

document.querySelectorAll('a[href]').forEach((a)=>{
  a.addEventListener('click',(e)=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    if(a.target&&a.target!=='_self') return;
    const href=a.getAttribute('href');
    if(!shouldTransition(href)) return;
    e.preventDefault();
    goWithTransition(href);
  });
});

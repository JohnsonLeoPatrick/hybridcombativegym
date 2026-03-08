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
  // If desktop, scale UP slightly, if mobile, maintain current logic
  const bgScale=isMobileViewport? 1 : 1 + (p * 0.08); 
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
  
  // Cut down blur intensities and alpha values significantly to reduce GPU load
  const glowA=.1+curveProgress*.15;
  const glowB=.05+curveProgress*.15;
  const ring=.1+curveProgress*.15;

  hvw.style.transform='translate3d(0,'+yShift.toFixed(2)+'px,0) scale('+bgScale.toFixed(4)+')';
  hvw.style.clipPath='inset('+topInset.toFixed(2)+'% '+sideInset.toFixed(2)+'% '+bottomInset.toFixed(2)+'% '+sideInset.toFixed(2)+'% round '+radius.toFixed(1)+'px)';
  if(hvb){
    hvb.style.borderRadius=radius.toFixed(1)+'px';
    hvb.style.setProperty('--ambient',ambientStrength.toFixed(3));
    // Cap blur to max 32px instead of 70px+
    hvb.style.setProperty('--ambient-blur',(16+curveProgress*16).toFixed(1)+'px');
    // Reduce box-shadow spread and sizes severely
    hvb.style.boxShadow='0 0 0 1px rgba(245,200,0,'+ring.toFixed(3)+'),0 0 '+(16+curveProgress*24).toFixed(1)+'px rgba(245,200,0,'+glowA.toFixed(3)+'),0 0 '+(32+curveProgress*48).toFixed(1)+'px rgba(229,34,34,'+glowB.toFixed(3)+')';
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
  document.querySelectorAll('.sr').forEach(el=>el.classList.add('v'));
}else{
  const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('v');obs.unobserve(el.target);}}),{threshold:.06,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.sr').forEach(el=>obs.observe(el));
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
const INTRO_SEEN_KEY='hybridIntroSeen';
let introLoading=false;
const finishIntro=()=>{
  if(!introLoading) return;
  introLoading=false;
  transitionOverlay.classList.remove('is-active');
  try{sessionStorage.setItem(INTRO_SEEN_KEY,'1');}catch{}
};

try{
  if(!sessionStorage.getItem(INTRO_SEEN_KEY)){
    introLoading=true;
    transitionOverlay.classList.add('is-active');

    const introVideo=document.querySelector('.hero-vid');
    if(introVideo){
      if(introVideo.readyState>=3){
        setTimeout(finishIntro,180);
      }else{
        introVideo.addEventListener('loadeddata',finishIntro,{once:true});
        introVideo.addEventListener('canplay',finishIntro,{once:true});
      }
    }else{
      addEventListener('load',finishIntro,{once:true});
    }

    // Never block too long if network is slow.
    setTimeout(finishIntro,2200);
  }
}catch{}

addEventListener('pageshow',()=>{
  if(!introLoading) transitionOverlay.classList.remove('is-active');
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

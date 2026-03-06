const nav=document.getElementById('nav');
const hvw=document.getElementById('hvw'),hc=document.getElementById('hc'),hero=document.getElementById('hero');
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
const HERO_SCROLL_RANGE=lowPowerMode?.62:.52;
const HERO_SMOOTHING=lowPowerMode?.18:.14;

const renderHero=(p)=>{
  const yShift=(lowPowerMode?24:40)*p;
  const bgScale=1-p*(lowPowerMode?.1:.18);
  const contentShift=(lowPowerMode?22:40)*p;
  const contentScale=1-p*(lowPowerMode?.05:.07);
  const contentFade=Math.max(0,1-p*(lowPowerMode?1.6:2.25));

  hvw.style.transform='translate3d(0,'+yShift.toFixed(2)+'px,0) scale('+bgScale.toFixed(4)+')';
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

// Hamburger
const hbg=document.getElementById('hbg');
let mobileMenuRevealTimer;

const setMenuOpenState=(isOpen)=>{
  if(!mob||!hbg) return;

  clearTimeout(mobileMenuRevealTimer);

  if(isOpen){
    mob.classList.add('open');
    document.body.classList.add('nav-glass-open');
    hbg.classList.add('is-active');
    hbg.setAttribute('aria-expanded','true');

    // Stage 1: build the glass overlay, Stage 2: reveal links.
    requestAnimationFrame(()=>mob.classList.add('glass-on'));
    mobileMenuRevealTimer=setTimeout(()=>mob.classList.add('menu-visible'),170);
    return;
  }

  mob.classList.remove('menu-visible');
  mob.classList.remove('glass-on');
  mob.classList.remove('open');
  document.body.classList.remove('nav-glass-open');
  hbg.classList.remove('is-active');
  hbg.setAttribute('aria-expanded','false');
};

hbg?.setAttribute('aria-expanded','false');
hbg?.addEventListener('click',()=>{
  if(!mob) return;
  setMenuOpenState(!mob.classList.contains('open'));
});

mob?.addEventListener('click',(e)=>{
  if(e.target===mob) setMenuOpenState(false);
});

addEventListener('keydown',(e)=>{
  if(e.key==='Escape'&&mob?.classList.contains('open')) setMenuOpenState(false);
});

mob?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenuOpenState(false)));

addEventListener('resize',()=>{
  if(innerWidth>768&&mob?.classList.contains('open')) setMenuOpenState(false);
});

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
transitionOverlay.innerHTML='<img class="page-transition-logo" src="logo.png" alt="">';
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

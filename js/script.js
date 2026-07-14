const nav=document.getElementById('nav');
const hvw=document.getElementById('hvw'),hvb=document.getElementById('hvb'),hc=document.getElementById('hc'),hero=document.getElementById('hero');
const heroVideo=document.querySelector('.hero-vid');
const shi=document.querySelector('.shi');
const mob=document.getElementById('mob');
const prefersReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobileViewport=matchMedia('(max-width: 900px)').matches;
const lowPowerMode=prefersReducedMotion||isMobileViewport;
const getNativeScrollY=()=>window.scrollY||window.pageYOffset||0;
let smoothScrollController=null;

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
const enableStaticSmoothScroll=false;

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

const initStaticSmoothScroll=()=>{
  if(!enableStaticSmoothScroll) return null;
  if(prefersReducedMotion||isMobileViewport||!document.body) return null;

  const excludedElements=new Set([nav,mob].filter(Boolean));
  const movableElements=Array.from(document.body.children).filter((el)=>{
    if(excludedElements.has(el)) return false;
    if(el.tagName==='SCRIPT') return false;
    if(el.classList.contains('intro-loader')||el.classList.contains('page-transition')||el.id==='lightbox') return false;
    return true;
  });

  if(!movableElements.length) return null;

  const wrapper=document.createElement('div');
  wrapper.setAttribute('data-smooth-scroll','wrapper');

  const content=document.createElement('div');
  content.setAttribute('data-smooth-scroll','content');

  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  movableElements.forEach((el)=>content.appendChild(el));
  document.body.classList.add('has-smooth-scroll');

  let current=getNativeScrollY();
  let target=current;
  let rafId=0;
  let resizeObserver=null;
  const ease=0.085;

  const updateBodyHeight=()=>{
    const height=Math.max(content.scrollHeight, content.getBoundingClientRect().height);
    document.body.style.height=`${Math.ceil(height)}px`;
  };

  const render=()=>{
    rafId=0;
    target=getNativeScrollY();
    current+=(target-current)*ease;

    if(Math.abs(target-current)<0.1){
      current=target;
    }

    content.style.transform=`translate3d(0,${(-current).toFixed(2)}px,0)`;
    lastScroll=current;
    queueTick();

    if(Math.abs(target-current)>0.1){
      requestRender();
    }
  };

  const requestRender=()=>{
    if(!rafId){
      rafId=requestAnimationFrame(render);
    }
  };

  const refresh=()=>{
    updateBodyHeight();
    requestRender();
  };

  const syncToNativeScroll=()=>{
    const nativeScroll=getNativeScrollY();
    current=nativeScroll;
    target=nativeScroll;
    content.style.transform=`translate3d(0,${(-nativeScroll).toFixed(2)}px,0)`;
    lastScroll=nativeScroll;
    queueTick();
  };

  if('ResizeObserver' in window){
    resizeObserver=new ResizeObserver(()=>refresh());
    resizeObserver.observe(content);
  }

  addEventListener('load',refresh,{once:true});
  refresh();

  return {
    enabled:true,
    getCurrentValue:()=>current,
    refresh,
    syncToNativeScroll,
    requestRender,
    scrollToElement:(element)=>{
      if(!element) return;
      const top=Math.max(0,Math.round(getNativeScrollY()+element.getBoundingClientRect().top));
      window.scrollTo({top,behavior:'auto'});
      syncToNativeScroll();
    },
    destroy:()=>{
      if(rafId){
        cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
      document.body.style.height='';
      document.body.classList.remove('has-smooth-scroll');
    }
  };
};

smoothScrollController=initStaticSmoothScroll();

const syncSmoothScrollToHash=()=>{
  if(!smoothScrollController?.enabled||!location.hash) return;
  const target=document.querySelector(location.hash);
  if(!target) return;
  smoothScrollController.scrollToElement(target);
};

addEventListener('scroll',()=>{
  if(smoothScrollController?.enabled){
    smoothScrollController.requestRender();
    return;
  }
  lastScroll=getNativeScrollY();
  queueTick();
},{passive:true});

// Ensure correct nav state on initial load and when viewport changes.
lastScroll=smoothScrollController?.enabled?smoothScrollController.getCurrentValue():getNativeScrollY();
queueTick();
addEventListener('resize',()=>{
  heroHeight=hero?hero.offsetHeight:1;
  if(smoothScrollController?.enabled){
    smoothScrollController.refresh();
    return;
  }
  lastScroll=getNativeScrollY();
  queueTick();
});
addEventListener('pageshow',()=>{
  if(smoothScrollController?.enabled){
    smoothScrollController.refresh();
    syncSmoothScrollToHash();
    return;
  }
  lastScroll=getNativeScrollY();
  queueTick();
});

addEventListener('hashchange',()=>{
  if(smoothScrollController?.enabled){
    syncSmoothScrollToHash();
  }
});

if(smoothScrollController?.enabled&&location.hash){
  requestAnimationFrame(()=>requestAnimationFrame(syncSmoothScrollToHash));
}

// Avoid showing placeholder first-frame art: reveal video only when playable.
if(hvb&&heroVideo){
  const setReady=()=>hvb.classList.add('is-video-ready');
  const setLoading=()=>hvb.classList.remove('is-video-ready');

  setLoading();

  heroVideo.addEventListener('loadedmetadata',()=>{
    try{
      heroVideo.playbackRate = 0.7;
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
  document.querySelectorAll('.gym-box').forEach(el=>el.classList.add('in-view'));
}else{
  const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('v');obs.unobserve(el.target);}}),{threshold:.06,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.sr, .sr-x').forEach(el=>obs.observe(el));
  const boxObs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('in-view');boxObs.unobserve(el.target);}}),{threshold:.1,rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('.gym-box').forEach(el=>boxObs.observe(el));
}

const scrollToTarget=(target)=>{
  if(!target) return false;
  if(smoothScrollController?.enabled){
    smoothScrollController.scrollToElement(target);
    return true;
  }
  target.scrollIntoView({behavior:'smooth'});
  return true;
};

window.hybridScrollTo=(target)=>{
  const element=typeof target==='string'?document.querySelector(target):target;
  return scrollToTarget(element);
};

// Smooth anchors
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const t=document.querySelector(a.getAttribute('href'));
  if(t){
    e.preventDefault();
    scrollToTarget(t);
  }
}));

// Core carousel image lists and initialization
const carouselSources = {
  storyTrack: [
    'media/images/kickbox-bg.jpg',
    'media/images/preview.png',
    'media/images/logo.png',
    'media/images/isn-logo.svg',
    'media/images/word logo.png'
  ],
  rareTrack: [
    'media/images/kickbox-bg.jpg',
    'media/images/preview.png',
    'media/images/logo.png',
    'media/images/isn-logo.svg',
    'media/images/word logo.png'
  ]
};

const ensureSlides = (trackId, sourceArray) => {
  const track = document.getElementById(trackId);
  if(!track || !Array.isArray(sourceArray)) return;

  track.innerHTML = sourceArray.map(src => `
    <div class="story-slide">
      <img src="${src}" alt="Gallery image" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='media/images/kickbox-bg.jpg';" />
    </div>
  `).join('');
};

// ensureSlides('storyTrack', carouselSources.storyTrack);
// ensureSlides('rareTrack', carouselSources.rareTrack);

const initReviewRail = ({railId, prevId, nextId}) => {
  const rail = document.getElementById(railId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if(!rail || !prev || !next) return;

  const getStep = () => {
    const firstCard = rail.querySelector('.review-card');
    if(!firstCard) return 320;
    const styles = getComputedStyle(rail);
    const gap = parseFloat(styles.columnGap || styles.gap || '16');
    return firstCard.getBoundingClientRect().width + gap;
  };

  prev.addEventListener('click', () => {
    rail.scrollBy({left: -getStep(), behavior: 'smooth'});
  });

  next.addEventListener('click', () => {
    rail.scrollBy({left: getStep(), behavior: 'smooth'});
  });
};

initReviewRail({
  railId: 'reviewsRail',
  prevId: 'reviewsPrev',
  nextId: 'reviewsNext'
});

// Carousel helper
const initCarousel = ({trackId, prevId, nextId, dotsId}) => {
  const track = document.getElementById(trackId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  const dotsContainer = document.getElementById(dotsId);
  if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

  const trackWrap = track.parentElement;
  const slides = Array.from(track.querySelectorAll('.story-slide'));
  if (!slides.length || !trackWrap) return;

  let index = 0;

  const setIndex = (newIndex) => {
    index = ((newIndex % slides.length) + slides.length) % slides.length;
    const width = trackWrap.clientWidth;
    track.style.transform = `translateX(-${index * width}px)`;
    dotsContainer.querySelectorAll('.story-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
  };

  const updateLayout = () => {
    const width = trackWrap.clientWidth;
    track.style.width = `${width * slides.length}px`;
    slides.forEach((slide) => {
      slide.style.width = `${width}px`;
    });
    setIndex(index);
  };

  slides.forEach((slide, i) => {
    const img = slide.querySelector('img');
    if (img) {
      img.style.opacity = '0';
      img.addEventListener('load', () => {
        img.style.opacity = '1';
      });
      img.addEventListener('error', () => {
        img.src = 'media/images/kickbox-bg.jpg';
      });
      // If already loaded from cache
      if (img.complete && img.naturalWidth) {
        img.style.opacity = '1';
      }
    }

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'story-dot';
    dot.setAttribute('aria-label', `Go to image ${i + 1}`);
    dot.addEventListener('click', () => setIndex(i));
    dotsContainer.appendChild(dot);
  });

  prevBtn.addEventListener('click', () => setIndex(index - 1));
  nextBtn.addEventListener('click', () => setIndex(index + 1));

  document.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const about = document.getElementById('about');
    const focusedInside = about?.contains(document.activeElement);
    if (!focusedInside && document.activeElement !== document.body) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') setIndex(index - 1);
    if (event.key === 'ArrowRight') setIndex(index + 1);
  });

  window.addEventListener('resize', updateLayout);
  updateLayout();
};

const STACKED_CAROUSEL_TRANSITION_MS=420;

const resetStackedCarouselImage=(img)=>{
  if(!img) return;
  img.classList.remove('active');
  img.style.display='none';
  img.style.transition='none';
  img.style.transform='';
  img.style.opacity='';
  img.style.filter='';
  img.style.zIndex='';
};

const setStackedCarouselImage=(images,activeIndex)=>{
  images.forEach((img,index)=>{
    if(!img) return;
    resetStackedCarouselImage(img);
    if(index===activeIndex){
      img.style.display='';
      img.classList.add('active');
    }
  });
};

const animateStackedCarousel=({images,fromIndex,toIndex,onComplete})=>{
  const currentImage=images[fromIndex];
  const nextImage=images[toIndex];

  if(fromIndex===toIndex||!currentImage||!nextImage){
    setStackedCarouselImage(images,toIndex);
    onComplete?.();
    return null;
  }

  images.forEach((img,index)=>{
    if(!img||index===fromIndex||index===toIndex) return;
    resetStackedCarouselImage(img);
  });

  currentImage.classList.remove('active');
  currentImage.style.display='';
  currentImage.style.transition='none';
  currentImage.style.transform='scale(1)';
  currentImage.style.opacity='1';
  currentImage.style.filter='blur(0)';
  currentImage.style.zIndex='2';

  nextImage.classList.remove('active');
  nextImage.style.display='';
  nextImage.style.transition='none';
  nextImage.style.transform='scale(1.035)';
  nextImage.style.opacity='0';
  nextImage.style.filter='blur(18px)';
  nextImage.style.zIndex='3';

  void currentImage.offsetWidth;
  void nextImage.offsetWidth;

  requestAnimationFrame(()=>{
    const transition=[
      `opacity ${STACKED_CAROUSEL_TRANSITION_MS}ms cubic-bezier(.22,.61,.36,1)`,
      `filter ${STACKED_CAROUSEL_TRANSITION_MS}ms cubic-bezier(.22,.61,.36,1)`,
      `transform ${STACKED_CAROUSEL_TRANSITION_MS}ms cubic-bezier(.22,.61,.36,1)`
    ].join(', ');
    currentImage.style.transition=transition;
    nextImage.style.transition=transition;
    currentImage.style.opacity='0';
    currentImage.style.filter='blur(18px)';
    currentImage.style.transform='scale(1.035)';
    nextImage.style.opacity='1';
    nextImage.style.filter='blur(0)';
    nextImage.style.transform='scale(1)';
  });

  return setTimeout(()=>{
    setStackedCarouselImage(images,toIndex);
    onComplete?.();
  },STACKED_CAROUSEL_TRANSITION_MS);
};

const initStackedCarousel=({images,caption,dots,prevButton,nextButton})=>{
  if(!images.length) return;

  let index=0;
  let isAnimating=false;
  let timerId=null;

  const syncUi=()=>{
    if(caption) caption.textContent=`${index+1} / ${images.length}`;
    dots.forEach((dot,dotIndex)=>dot.classList.toggle('active',dotIndex===index));
  };

  const changeSlide=(nextIndex)=>{
    const normalizedIndex=((nextIndex%images.length)+images.length)%images.length;
    if(isAnimating||normalizedIndex===index) return;

    const previousIndex=index;
    index=normalizedIndex;
    isAnimating=true;

    if(timerId){
      clearTimeout(timerId);
      timerId=null;
    }

    timerId=animateStackedCarousel({
      images,
      fromIndex:previousIndex,
      toIndex:index,
      onComplete:()=>{
        isAnimating=false;
        timerId=null;
      }
    });

    syncUi();
  };

  prevButton?.addEventListener('click',()=>changeSlide(index-1));
  nextButton?.addEventListener('click',()=>changeSlide(index+1));

  dots.forEach((dot,dotIndex)=>{
    dot.addEventListener('click',()=>changeSlide(dotIndex));
  });

  setStackedCarouselImage(images,index);
  syncUi();
};

initStackedCarousel({
  images:[
    document.getElementById('bentonImage1'),
    document.getElementById('bentonImage3'),
    document.getElementById('bentonImage4')
  ].filter(Boolean),
  caption:document.getElementById('bentonCaption'),
  dots:Array.from(document.getElementById('bentonDots')?.querySelectorAll('.benton-dot')||[]),
  prevButton:document.getElementById('bentonPrev'),
  nextButton:document.getElementById('bentonNext')
});

initStackedCarousel({
  images:[
    document.getElementById('arenaImage1'),
    document.getElementById('arenaImage2'),
    document.getElementById('arenaImage3')
  ].filter(Boolean),
  caption:document.getElementById('arenaCaption'),
  dots:Array.from(document.getElementById('arenaDots')?.querySelectorAll('.benton-dot')||[]),
  prevButton:document.getElementById('arenaPrev'),
  nextButton:document.getElementById('arenaNext')
});

// Full-screen page transition for internal page navigation.
const transitionOverlay=document.createElement('div');
transitionOverlay.className='page-transition';
transitionOverlay.setAttribute('aria-hidden','true');
const trImg=document.createElement('img');trImg.className='page-transition-logo';trImg.src='media/images/logo.png';trImg.alt='';transitionOverlay.appendChild(trImg);
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

// Lightbox Logic
const initLightbox = () => {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const triggers = document.querySelectorAll('.lightbox-trigger');

  if (!lightbox || !lightboxImg || !lightboxClose) return;

  const openLightbox = (src, alt) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Image Preview';
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore scrolling
    // Clear src after transition to avoid flicker on next open
    setTimeout(() => {
      if (!lightbox.classList.contains('active')) {
        lightboxImg.src = '';
      }
    }, 300);
  };

  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(trigger.src, trigger.alt);
    });
  });

  lightbox.addEventListener('click', (e) => {
    // Close if clicking the background or the close button
    if (e.target === lightbox || e.target.closest('#lightboxClose')) {
      closeLightbox();
    }
  });

  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
};

// Initialize lightbox
initLightbox();

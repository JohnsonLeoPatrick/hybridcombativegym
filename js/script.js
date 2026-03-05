const nav=document.getElementById('nav');
const hvw=document.getElementById('hvw'),hc=document.getElementById('hc'),hero=document.getElementById('hero');
const shi=document.querySelector('.shi');
const mob=document.getElementById('mob');

// Super smooth scroll with rAF — one listener, no jank
let ticking=false,lastScroll=0;
addEventListener('scroll',()=>{
  lastScroll=scrollY;
  if(!ticking){
    requestAnimationFrame(()=>{
      nav.classList.toggle('scrolled',lastScroll>50);
      if(mob) mob.style.top=lastScroll>50?'62px':'68px';
      if(hero&&hvw&&hc){
        const h=hero.offsetHeight;
        const p=Math.min(Math.max(lastScroll/(h*.6),0),1);
        hvw.style.transform='scale('+(1-p*.18)+') translateZ(0)';
        hvw.style.borderRadius=(p*44)+'px';
        hc.style.opacity=1-p*2.2;
        hc.style.transform='translateY('+(p*-50)+'px) scale('+(1-p*.06)+') translateZ(0)';
        if(shi) shi.style.opacity=1-p*5;
      }
      ticking=false;
    });
    ticking=true;
  }
},{passive:true});

// Hamburger
const hbg=document.getElementById('hbg');
hbg?.addEventListener('click',()=>{
  mob.classList.toggle('open');
  const s=hbg.querySelectorAll('span'),o=mob.classList.contains('open');
  s[0].style.transform=o?'rotate(45deg) translate(4px,4px)':'';
  s[1].style.opacity=o?'0':'1';
  s[2].style.transform=o?'rotate(-45deg) translate(4px,-4px)':'';
});
mob?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  mob.classList.remove('open');
  hbg.querySelectorAll('span').forEach(s=>{s.style.transform='';s.style.opacity='1';});
}));

// Scroll reveals
const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('v');obs.unobserve(el.target);}}),{threshold:.06,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.sr').forEach(el=>obs.observe(el));

// Smooth anchors
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}));

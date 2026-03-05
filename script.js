const nav=document.getElementById('nav');
const hvw=document.getElementById('hvw'),hc=document.getElementById('hc'),hero=document.getElementById('hero');
const shi=document.querySelector('.shi');

// Debounced scroll with rAF — no jank
let ticking=false;
let lastScroll=0;
function onScroll(){
  lastScroll=scrollY;
  if(!ticking){
    requestAnimationFrame(()=>{
      // Nav toggle - simple class, no heavy reflow
      nav.classList.toggle('scrolled',lastScroll>40);
      // Adjust mobile dropdown position
      if(mob) mob.style.top = lastScroll>40 ? '58px' : '64px';
      // Hero parallax
      const h=hero.offsetHeight;
      const p=Math.min(Math.max(lastScroll/(h*.6),0),1);
      hvw.style.transform='scale('+(1-p*.2)+') translateY('+(p*10)+'%) translateZ(0)';
      hvw.style.borderRadius=(p*44)+'px';
      hc.style.opacity=1-p*2.2;
      hc.style.transform='translateY('+(p*-50)+'px) scale('+(1-p*.06)+') translateZ(0)';
      if(shi) shi.style.opacity=1-p*5;
      ticking=false;
    });
    ticking=true;
  }
}
addEventListener('scroll',onScroll,{passive:true});

// Hamburger
const hbg=document.getElementById('hbg'),mob=document.getElementById('mob');
hbg?.addEventListener('click',()=>{mob.classList.toggle('open');const s=hbg.querySelectorAll('span'),o=mob.classList.contains('open');s[0].style.transform=o?'rotate(45deg) translate(4px,4px)':'';s[1].style.opacity=o?'0':'1';s[2].style.transform=o?'rotate(-45deg) translate(4px,-4px)':'';});
mob?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mob.classList.remove('open');hbg.querySelectorAll('span').forEach(s=>{s.style.transform='';s.style.opacity='1';});}));

// Scroll reveals
const obs=new IntersectionObserver(e=>e.forEach(el=>{if(el.isIntersecting){el.target.classList.add('v');obs.unobserve(el.target);}}),{threshold:.06,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.sr').forEach(el=>obs.observe(el));

// Smooth anchors
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}));

// Dark/Light mode toggle
const themeBtn=document.getElementById('themeToggle');
const savedTheme=localStorage.getItem('hybrid-theme');
if(savedTheme) document.documentElement.setAttribute('data-theme',savedTheme);
themeBtn?.addEventListener('click',()=>{
  const current=document.documentElement.getAttribute('data-theme');
  const next=current==='light'?'dark':'light';
  if(next==='dark'){document.documentElement.removeAttribute('data-theme');}
  else{document.documentElement.setAttribute('data-theme','light');}
  localStorage.setItem('hybrid-theme',next);
});
gsap.registerPlugin(ScrollTrigger);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const menuImgs=$$('.menu-card img').map(x=>x.getAttribute('src'));

window.addEventListener('load',()=>{
  const loader=gsap.timeline();
  loader.to('.loader-mark',{clipPath:'inset(0 0% 0 0)',duration:1.15,ease:'power4.inOut'})
    .to('.loader-line span',{width:'100%',duration:1.1,ease:'power2.inOut'},'-=.45')
    .to('.loader-meta,.loader p',{opacity:0,y:8,duration:.35},'-=.25')
    .to('.loader',{yPercent:-100,duration:1.15,ease:'power4.inOut'})
    .from('.nav',{y:-30,opacity:0,duration:.6},'-=.55')
    .from('.hero-clean-content',{opacity:0,y:18,duration:.7},'-=.35');

  // Clean cinematic hero motion — keep the video and slogan as the focus
  gsap.to('.hero-video-main',{scale:1.06,yPercent:3,ease:'none',scrollTrigger:{trigger:'.hero-clean',start:'top top',end:'bottom top',scrub:1.4}});
  gsap.to('.hero-clean-content',{yPercent:-10,ease:'none',scrollTrigger:{trigger:'.hero-clean',start:'top top',end:'bottom top',scrub:1.2}});

  // Smart navbar
  ScrollTrigger.create({start:'top -80',end:99999,onUpdate:self=>$('.nav').classList.toggle('scrolled',self.scroll()>80)});

  // Section reveals
  $$('.reveal-img').forEach(el=>{
    gsap.fromTo(el,{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)',duration:1.35,ease:'power4.out',scrollTrigger:{trigger:el,start:'top 82%'}});
    const img=el.querySelector('img'); if(img) gsap.fromTo(img,{scale:1.22},{scale:1,duration:1.7,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%'}});
  });
  $$('.reveal-photo').forEach(el=>{
    const img=el.querySelector('img');
    gsap.from(el,{clipPath:'inset(0 100% 0 0)',duration:1.3,ease:'power4.out',scrollTrigger:{trigger:el,start:'top 80%'}});
    if(img) gsap.fromTo(img,{scale:1.22},{scale:1,duration:1.7,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 80%'}});
  });
  $$('.story-title,.story-copy,.feature-copy,.gallery-head,.reservation-copy,.visit-copy').forEach(el=>gsap.from(el.children,{y:70,opacity:0,stagger:.08,duration:.95,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 80%'}}));
  $$('.g').forEach((el,i)=>gsap.from(el,{y:110,opacity:0,rotate:i%2?1:-1,duration:1.1,delay:i*.08,ease:'power3.out',scrollTrigger:{trigger:'.gallery-grid',start:'top 78%'}}));

  // Gallery image parallax
  $$('.g img').forEach((img,i)=>gsap.to(img,{yPercent:i===1?-7:7,ease:'none',scrollTrigger:{trigger:img,start:'top bottom',end:'bottom top',scrub:1.4}}));

  // Menu section: vertical page scroll drives a cinematic horizontal rail
  const menuSection=$('.menu-section'), rail=$('.menu-rail'), progress=$('.menu-progress span');
  if(menuSection && rail){
    const setupHorizontalMenu=()=>{
      const distance=Math.max(0, rail.scrollWidth - window.innerWidth);
      gsap.killTweensOf(rail);
      ScrollTrigger.getAll().filter(st=>st.vars && st.vars.id==='axis-menu-horizontal').forEach(st=>st.kill());
      if(distance <= 0){
        gsap.set(rail,{x:0});
        progress.style.width='100%';
        return;
      }
      gsap.set(rail,{x:0});
      gsap.to(rail,{
        x:-distance,
        ease:'none',
        scrollTrigger:{
          id:'axis-menu-horizontal',
          trigger:rail.querySelector('.menu-card'),
          // Don't take over the scroll as soon as the menu section enters.
          // Start only when the first menu page is centered in the viewport,
          // so the full page is visible before the horizontal experience begins.
          start:'center center',
          end:()=>`+=${distance * 1.15}`,
          pin:menuSection,
          scrub:1.1,
          invalidateOnRefresh:true,
          anticipatePin:1,
          onEnter:()=>menuSection.classList.add('is-horizontal'),
          onEnterBack:()=>menuSection.classList.add('is-horizontal'),
          onLeave:()=>menuSection.classList.remove('is-horizontal'),
          onLeaveBack:()=>menuSection.classList.remove('is-horizontal'),
          onUpdate:self=>{progress.style.width=Math.max(8,self.progress*100)+'%'}
        }
      });
    };
    setupHorizontalMenu();
    window.addEventListener('resize',()=>ScrollTrigger.refresh());
  }

  // Menu modal
  const modal=$('.menu-modal'), modalImg=modal.querySelector('img'), counter=modal.querySelector('.modal-nav span'); let current=0;
  function openMenu(i){current=i;modalImg.src=menuImgs[current];counter.textContent=String(current+1).padStart(2,'0')+' / '+String(menuImgs.length).padStart(2,'0');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('menu-open');gsap.fromTo('.modal-image-wrap',{scale:.9,opacity:0,rotateY:6},{scale:1,opacity:1,rotateY:0,duration:.55,ease:'power3.out'})}
  function closeMenu(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('menu-open')}
  $$('.menu-card').forEach((card,i)=>card.addEventListener('click',()=>openMenu(i)));
  $('.modal-close').onclick=closeMenu;modal.addEventListener('click',e=>{if(e.target===modal)closeMenu()});$('.prev').onclick=()=>openMenu((current-1+menuImgs.length)%menuImgs.length);$('.next').onclick=()=>openMenu((current+1)%menuImgs.length);

  // Reservation form UI
  const form=$('#bookingForm'), status=$('.form-status');
  form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);const name=data.get('name');status.textContent=`Thanks ${name || ''}. Your reservation request has been received — AXIS will confirm it shortly.`;gsap.fromTo(status,{opacity:0,y:8},{opacity:1,y:0,duration:.5});form.reset()});

  // Magnetic buttons
  $$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();gsap.to(el,{x:(e.clientX-r.left-r.width/2)*.14,y:(e.clientY-r.top-r.height/2)*.14,duration:.25,ease:'power2.out'})});el.addEventListener('pointerleave',()=>gsap.to(el,{x:0,y:0,duration:.5,ease:'elastic.out(1,.45)'}))});

  // Mobile navigation
  const mobile=$('.mobile-menu');
  const openMobile=()=>{document.body.classList.add('menu-open');mobile.setAttribute('aria-hidden','false');gsap.set(mobile,{visibility:'visible'});gsap.to(mobile,{yPercent:0,duration:.8,ease:'power4.inOut'});gsap.from('.mobile-links a',{y:70,opacity:0,stagger:.08,duration:.6,ease:'power3.out',delay:.25})};
  const closeMobile=()=>{gsap.to(mobile,{yPercent:-100,duration:.7,ease:'power4.inOut',onComplete:()=>{document.body.classList.remove('menu-open');mobile.setAttribute('aria-hidden','true')}})};
  $('.menu-btn').onclick=openMobile;$('.mobile-close').onclick=closeMobile;$$('.mobile-links a').forEach(a=>a.addEventListener('click',closeMobile));

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeMobile()}if(e.key==='ArrowRight'&&modal.classList.contains('open'))openMenu((current+1)%menuImgs.length);if(e.key==='ArrowLeft'&&modal.classList.contains('open'))openMenu((current-1+menuImgs.length)%menuImgs.length)});
});

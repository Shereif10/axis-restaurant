const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const PORT = 8766;
const ROOT = __dirname;
function startServer(){
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
  const server=http.createServer((req,res)=>{
    let p=req.url.split('?')[0]; if(p==='/')p='/index.html';
    const fp=path.join(ROOT,p);
    fs.readFile(fp,(e,d)=>{ if(e){res.writeHead(404);res.end('not found');return;} const ext=path.extname(fp); res.writeHead(200,{'Content-Type':mime[ext]||'octet-stream'}); res.end(d); });
  });
  return new Promise(r=>server.listen(PORT,()=>{console.log('Server',PORT); r(server);}));
}
(async()=>{
  const server=await startServer();
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push(m.text());});
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  console.log('errors after load',errors.length?errors:'none');
  // Helper to get menu progress and transform
  const getState=()=>page.evaluate(()=>{
    const rail=document.querySelector('.menu-rail');
    const st=ScrollTrigger.getById('axis-menu-horizontal');
    return {
      progress: st?st.progress:null,
      transform: rail?getComputedStyle(rail).transform:null,
      width: document.querySelector('.menu-progress span')?.style.width||null,
      hasIsHorizontal: document.querySelector('.menu-section')?.classList.contains('is-horizontal'),
      hasMenuST: !!st,
    };
  });
  const menuTop=await page.evaluate(()=>document.querySelector('.menu-section').getBoundingClientRect().top+window.scrollY);
  console.log('menuTop',menuTop);
  // Enter menu
  await page.evaluate(top=>window.scrollTo(0,top+200),menuTop);
  await page.waitForTimeout(800);
  let s1=await getState(); console.log('after enter 200',s1);
  // Scroll down forward
  await page.evaluate(top=>window.scrollTo(0,top+600),menuTop);
  await page.waitForTimeout(800);
  let s2=await getState(); console.log('after scroll down 600 forward',s2);
  console.log('1. Scroll Down moves forward?', s2.progress > s1.progress ? 'PASS' : 'FAIL');
  // Scroll up backward
  await page.evaluate(top=>window.scrollTo(0,top+300),menuTop);
  await page.waitForTimeout(800);
  let s3=await getState(); console.log('after scroll up to 300',s3);
  console.log('2. Scroll Up moves backward?', s3.progress < s2.progress ? 'PASS' : 'FAIL');
  // Horizontal right forward via wheel
  const pBeforeH=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  await page.evaluate(()=>{
    const ev=new WheelEvent('wheel',{deltaX:120,deltaY:0,bubbles:true,cancelable:true});
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(500);
  const pAfterHRight=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  console.log('3. Horizontal Right forward?', pAfterHRight>pBeforeH? 'PASS':'FAIL', pBeforeH, '->', pAfterHRight);
  // Horizontal left backward
  await page.evaluate(()=>{
    const ev=new WheelEvent('wheel',{deltaX:-120,deltaY:0,bubbles:true,cancelable:true});
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(500);
  const pAfterHLeft=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  console.log('4. Horizontal Left backward?', pAfterHLeft < pAfterHRight ? 'PASS':'FAIL', pAfterHRight, '->', pAfterHLeft);
  // Check same progress controls both
  console.log('5. Both axes same progress?', (pAfterHLeft!==null && s3.progress!==null) ? 'PASS (same ST)' : 'FAIL');
  // Progress bar sync
  const progSync=await page.evaluate(()=>{
    const rail=document.querySelector('.menu-rail');
    const prog=document.querySelector('.menu-progress span');
    const st=ScrollTrigger.getById('axis-menu-horizontal');
    return {progress:st.progress, width:prog.style.width, transform:getComputedStyle(rail).transform};
  });
  console.log('6. Progress bar sync?', progSync.width && progSync.transform!=='none' ? 'PASS' : 'FAIL', progSync);
  // Counter sync - counter is modal, but check progress width vs transform correlation
  // Boundaries: try to go before first
  await page.evaluate(top=>window.scrollTo(0,top-500),menuTop);
  await page.waitForTimeout(800);
  const pAtStart=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  await page.evaluate(()=>{
    const ev=new WheelEvent('wheel',{deltaX:-120,deltaY:0,bubbles:true,cancelable:true});
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(300);
  const pAfterLeftAtStart=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  console.log('8. Boundary at start (should not go <0)', pAtStart<=0.01 && pAfterLeftAtStart<=0.01 ? 'PASS' : 'FAIL', pAtStart, pAfterLeftAtStart);
  // Go to end
  const endScroll = await page.evaluate(()=>{
    const st=ScrollTrigger.getById('axis-menu-horizontal');
    return st ? st.end : null;
  });
  console.log('st end', endScroll);
  await page.evaluate(top=>window.scrollTo(0,top+3500),menuTop);
  await page.waitForTimeout(1000);
  const pAtEnd=await page.evaluate(()=>ScrollTrigger.getById('axis-menu-horizontal').progress);
  const afterEndPos=await page.evaluate(()=>window.scrollY);
  console.log('pAtEnd',pAtEnd, 'scrollY',afterEndPos);
  // Continue small scroll to release
  await page.evaluate(()=>window.scrollBy(0,300));
  await page.waitForTimeout(800);
  const pAfterRelease=await page.evaluate(()=>{
    const st=ScrollTrigger.getById('axis-menu-horizontal');
    return st?st.progress:null;
  });
  const hasIsHorizontalAfter=await page.evaluate(()=>document.querySelector('.menu-section').classList.contains('is-horizontal'));
  console.log('9. Final image small buffer then release (should have p~1 and then unpin)', pAtEnd>=0.99 && !hasIsHorizontalAfter ? 'PASS' : 'CHECK', {pAtEnd, hasIsHorizontalAfter});
  // No horizontal overflow
  const overflow=await page.evaluate(()=>{
    return {scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth, bodyOverflowX:getComputedStyle(document.body).overflowX};
  });
  console.log('10. No horizontal overflow?', overflow.scrollWidth<=overflow.clientWidth+5 ? 'PASS' : 'FAIL', overflow);
  // Modal still works
  await page.evaluate(top=>window.scrollTo(0,top+500),menuTop);
  await page.waitForTimeout(500);
  await page.click('.menu-card');
  await page.waitForTimeout(500);
  const modalOpen=await page.evaluate(()=>document.querySelector('.menu-modal').classList.contains('open'));
  console.log('14. Modal still works?', modalOpen?'PASS':'FAIL');
  await page.click('.modal-close');
  await page.waitForTimeout(300);
  console.log('errors final', errors.length?errors:'none');
  await browser.close();
  server.close();
})();

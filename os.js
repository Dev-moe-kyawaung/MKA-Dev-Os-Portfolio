(function(){
  var menu=document.getElementById('menuBtn');
  var links=document.querySelector('.menu-links');
  if(menu&&links){
    function setOpen(o){links.classList.toggle('open',o);document.body.classList.toggle('nav-open',o);}
    menu.addEventListener('click',function(){setOpen(!links.classList.contains('open'));});
    links.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setOpen(false);});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false);});
  }

  // zoom + reveal
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});
  },{threshold:0.1,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.zoom-in,.rv').forEach(function(el){io.observe(el);});
  document.querySelectorAll('.hero .rv,.hero .zoom-in').forEach(function(el){el.classList.add('in');});

  // counters
  var cio=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target,t=+el.dataset.count,t0=performance.now(),d=1100;
      (function tick(now){var p=Math.min(1,(now-t0)/d);el.textContent=Math.round(t*(1-Math.pow(1-p,3)))+(t>=10?'+':'');if(p<1)requestAnimationFrame(tick);})(t0);
      cio.unobserve(el);
    });
  },{threshold:0.4});
  document.querySelectorAll('[data-count]').forEach(function(el){cio.observe(el);});

  // skill bars
  var bio=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      e.target.querySelectorAll('[data-w]').forEach(function(b){b.style.width=b.dataset.w+'%';});
      bio.unobserve(e.target);
    });
  },{threshold:0.2});
  var sp=document.getElementById('skillsPanel');if(sp)bio.observe(sp);

  // clock in menubar
  var clock=document.getElementById('osClock');
  function tickClock(){
    if(!clock)return;
    var d=new Date();
    clock.textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  tickClock();setInterval(tickClock,30000);

  // i18n
  var lang=localStorage.getItem('os-lang')||'en';
  var dict={
    en:{open:'System online · open to senior roles',tag:'Developer OS — Kotlin, Compose, clean architecture, offline-first modules as windows on a 3D desktop.'},
    my:{open:'စနစ် အွန်လိုင်း · Senior အခန်းကဏ္ဍ ဖွင့်ထားသည်',tag:'Developer OS — Kotlin၊ Compose၊ clean architecture၊ offline-first module များကို 3D desktop တွင် window များအဖြစ်။'}
  };
  function apply(){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var k=el.getAttribute('data-i18n');if(dict[lang]&&dict[lang][k])el.textContent=dict[lang][k];
    });
    var b=document.getElementById('langBtn');if(b)b.textContent=lang==='en'?'MY':'EN';
  }
  apply();
  var lb=document.getElementById('langBtn');
  if(lb)lb.addEventListener('click',function(){lang=lang==='en'?'my':'en';localStorage.setItem('os-lang',lang);apply();});

  // System AI bot
  var kb=[
    {k:['window','os','desktop'],a:'This portfolio is a Developer OS shell — projects open as windows, panels float in 3D depth, and the AI runs as a system process.'},
    {k:['compose','ui'],a:'Jetpack Compose is the primary UI framework — declarative, testable, Material 3.'},
    {k:['architect','clean','module'],a:'Multi-module Gradle, Clean layers, Room offline truth. Each project is a contained process.'},
    {k:['kotlin'],a:'Kotlin + coroutines + Flow. Structured concurrency across feature modules.'},
    {k:['performance'],a:'Launch budgets, frame pacing, R8, Baseline Profiles — measured before optimized.'},
    {k:['help','cmd'],a:'Commands: ask about windows, Compose, architecture, Kotlin, performance, or type /status'}
  ];
  function reply(q){
    var t=q.toLowerCase().trim();
    if(t==='/status'||t==='status') return 'MKA-OS v2026 · processes: portfolio, ai-bot · uptime: stable · locale: '+(lang==='my'?'my':'en');
    for(var i=0;i<kb.length;i++)
      for(var j=0;j<kb[i].k.length;j++)
        if(t.indexOf(kb[i].k[j])!==-1) return kb[i].a;
    return 'System bot online. Ask about Compose, architecture, Kotlin, performance, or type /status';
  }
  var bot=document.getElementById('aiBot'),bd=document.getElementById('aiBd'),fab=document.getElementById('aiFab');
  function openBot(o){
    if(!bot||!fab)return;
    bot.classList.toggle('open',o);
    fab.classList.toggle('hide',o);
  }
  if(fab) fab.addEventListener('click',function(){openBot(true);});
  var cl=document.getElementById('aiClose');
  if(cl) cl.addEventListener('click',function(){openBot(false);});
  function send(){
    if(!bd)return;
    var inp=document.getElementById('aiIn');
    var v=inp&&inp.value.trim();if(!v)return;
    bd.innerHTML+='<div class="bub me">'+v.replace(/</g,'&lt;')+'</div>';
    if(inp)inp.value='';
    setTimeout(function(){
      bd.innerHTML+='<div class="bub sys">[sys] '+reply(v)+'</div>';
      bd.scrollTop=bd.scrollHeight;
    },220);
  }
  var sb=document.getElementById('aiSend');if(sb)sb.addEventListener('click',send);
  var ai=document.getElementById('aiIn');if(ai)ai.addEventListener('keydown',function(e){if(e.key==='Enter')send();});

  var form=document.getElementById('contactForm');
  if(form) form.addEventListener('submit',function(e){e.preventDefault();alert('Demo — moekyawaung@asia.com');form.reset();});
})();

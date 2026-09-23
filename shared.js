/* Shared: glass menu + scroll reveal */
(function(){
  // Build glass menu
  var menu = document.createElement('nav');
  menu.className = 'glass-menu';
  menu.setAttribute('aria-label','Site menüsü');
  var page = document.body.dataset.page || '';
  menu.innerHTML =
    '<button class="glass-menu__btn" aria-label="Menüyü aç" aria-expanded="false">'+
      '<span></span><span></span><span></span>'+
    '</button>'+
    '<div class="glass-menu__panel">'+
      '<a href="index.html" class="'+(page==='home'?'active':'')+'">Ana Sayfa <small>/home</small></a>'+
      '<a href="about.html" class="'+(page==='about'?'active':'')+'">Hakkımda <small>/about</small></a>'+
      '<a href="git.html" class="'+(page==='git'?'active':'')+'">GitHub <small>/git</small></a>'+
      '<a href="docs.html" class="'+(page==='docs'?'active':'')+'">Dökümanlar <small>/docs</small></a>'+
      '<a href="cert.html" class="'+(page==='cert'?'active':'')+'">Sertifikalar <small>/cert</small></a>'+
      '<div class="glass-menu__divider"></div>'+
      '<a href="https://github.com/erkanalperen54-boop" target="_blank" rel="noopener">github.com ↗ <small>profil</small></a>'+
    '</div>';
  document.body.appendChild(menu);

  var btn = menu.querySelector('.glass-menu__btn');
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', function(e){
    if(!menu.contains(e.target)){ menu.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ menu.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  });

  // Scroll reveal
  var els = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          var el = en.target;
          var d = el.dataset.delay || 0;
          setTimeout(function(){ el.classList.add('in'); }, d);
          io.unobserve(el);
        }
      });
    },{threshold:.12});
    els.forEach(function(el){ io.observe(el); });
  } else {
    els.forEach(function(el){ el.classList.add('in'); });
  }
})();

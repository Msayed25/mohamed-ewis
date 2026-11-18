/* Mohamed Ewis portfolio: small, dependency-free enhancements. The page works without this file. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* smooth scrolling (Lenis): each wheel step moves the page a little less than the browser's default and the page
     glides to a stop, so scrolling never feels rushed. Touch screens keep their own native scrolling. */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.07, wheelMultiplier: 0.7, smoothWheel: true });
    var lenisFrame = function (t) { lenis.raf(t); requestAnimationFrame(lenisFrame); };
    requestAnimationFrame(lenisFrame);
  }
  /* current scroll position; with Lenis it comes from Lenis itself, which avoids asking the page (asking can force a layout) */
  var scrollPos = function () { return lenis && !lenis.isStopped ? lenis.scroll : window.scrollY; };
  var holdScroll = function (v) { if (lenis) { if (v) lenis.stop(); else lenis.start(); } };

  /* theme toggle (light first) */
  var tog = $('#tog');
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function label() { if ($('#togl')) $('#togl').textContent = isDark() ? 'Light' : 'Dark'; }
  label();
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#tog, [data-tog]')) return;
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('ewis-theme', root.dataset.theme); } catch (e2) {}
    label();
  });

  /* live local clock */
  function tick() {
    $$('.clock').forEach(function (el) {
      var off = parseFloat(el.dataset.offset || '0');
      var t = new Date(Date.now() + off * 3600e3);
      el.textContent = String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
    });
  }
  tick(); setInterval(tick, 15000);

  /* split headlines into words so they stamp in */
  $$('.words').forEach(function (el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w, i) { return '<span style="--i:' + i + '">' + w + '</span>'; }).join(' ');
  });

  /* featured covers carousel */
  var covers = $('#covers');
  if (covers) {
    var slides = $$('.slide', covers), dots = $$('.dots button', covers), ci = 0, timer;
    var show = function (i) {
      slides[ci].classList.remove('on'); dots[ci].removeAttribute('aria-current');
      ci = i; void slides[ci].offsetWidth;
      slides[ci].classList.add('on'); dots[ci].setAttribute('aria-current', 'true');
    };
    var restart = function () { clearInterval(timer); if (!reduce && slides.length > 1) timer = setInterval(function () { show((ci + 1) % slides.length); }, 4600); };
    dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); restart(); }); });
    covers.addEventListener('mouseenter', function () { clearInterval(timer); });
    covers.addEventListener('mouseleave', restart);
    covers.addEventListener('focusin', function () { clearInterval(timer); });
    restart();
  }

  /* index filters */
  var filters = $('#filters'), rows = $('#rows');
  if (filters && rows) filters.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $$('button', filters).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    var cat = b.dataset.cat;
    $$('.row', rows).forEach(function (r) { r.classList.toggle('out', cat !== 'all' && r.dataset.cat !== cat); });
  });

  /* landing "viewfinder": a film timecode rolls for a moment, then the name slides up and the portrait pulls focus */
  var land = $('.landing');
  if (land) {
    var tc = $('.tc b', land), f = 0;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    if (reduce || !tc) land.classList.add('go');
    else {
      var roll = setInterval(function () {
        f += 2; tc.textContent = '00:00:' + pad(Math.floor(f / 24)) + ':' + pad(f % 24);
        if (f >= 48) { clearInterval(roll); land.classList.add('go'); }
      }, 28);
    }
  }

  /* top bar: slides away while scrolling down, comes back as soon as you scroll up */
  var nv = $('.nv');
  if (nv) {
    var lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, d = y - lastY;
        if (y < 80 || d < -4) nv.classList.remove('away');
        else if (d > 4 && !nv.contains(document.activeElement)) nv.classList.add('away');
        lastY = y; ticking = false;
      });
    }, { passive: true });
  }

  /* top-bar height, used by the pinned landing */
  var topBar = $('.bar');
  var setBarH = function () { root.style.setProperty('--barh', (topBar ? topBar.offsetHeight : 60) + 'px'); };
  setBarH(); window.addEventListener('resize', setBarH, { passive: true });
  /* landing on scroll (client feedback round 2): the stage stays pinned while the full-width name shrinks into the
     top-left corner, the portrait grows on the right, the disciplines fade out and a short line fades in */
  var landing = $('.landing'), stage = landing && $('.stage', landing);
  if (landing && stage && !reduce) {
    landing.classList.add('pinned');
    var lName = $('h1', landing), lPic = $('.vf', landing), lRole = $('.role', landing), lBio = $('.bio', landing), lLow = $('.low', landing);
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
    var easeIO = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    var L = null, landBusy = false;
    var measure = function () {
      var W = stage.clientWidth, H = stage.clientHeight, g = parseFloat(getComputedStyle(landing).paddingLeft) || 0, phone = W < 760 || H > W * 1.15;
      if (!g) { landing.classList.remove('pinned'); g = parseFloat(getComputedStyle(landing).paddingLeft) || 16; landing.classList.add('pinned'); }
      landing.style.setProperty('--gx', g + 'px');
      lName.style.transform = 'none';
      var nw = lName.offsetWidth, nh = lName.offsetHeight, lowH = lLow ? lLow.offsetHeight : 0, lowB = lLow ? parseFloat(getComputedStyle(lLow).bottom) : 24;
      var big = (W - 2 * g) * 0.98 / nw, small = (phone ? Math.min(170, W * 0.45) : Math.min(280, W * 0.2)) / nw;
      var bigH = nh * big, smallH = nh * small, top1 = phone ? 18 : 26;
      /* portrait: small above the disciplines at the start, big on the right at the end */
      var aw = phone ? Math.min(W * 0.42, 220) : Math.min(W * 0.16, 260, (H - bigH - lowH - 120) / 1.25);
      aw = Math.max(aw, phone ? 120 : 140);
      var ay = H - lowB - lowH - 44 - aw * 1.25;
      var top0 = Math.max(phone ? 24 : 30, Math.min(H * 0.12, ay - bigH - 24));
      var bw = phone ? Math.min(W * 0.62, (H * 0.5) / 1.25) : Math.min(W * 0.32, 540, (H - 90) / 1.25);
      var bioTop = phone ? top1 + smallH + 22 : Math.max(top1 + smallH + 40, H * 0.3);
      if (lBio) lBio.style.maxWidth = (phone ? W - 2 * g : Math.min(560, W - bw - 3 * g - 40)) + 'px';
      var bioH = lBio ? lBio.offsetHeight : 0;
      /* on phones the photo takes the room left under the text (never smaller than it started) */
      if (phone) bw = Math.max(aw, Math.min(bw, (H - bioTop - bioH - 28 - 34) / 1.25));
      var by = phone ? Math.max(bioTop + bioH + 28, H - bw * 1.25 - 34) : Math.max(top1 + 10, (H - bw * 1.25) / 2);
      /* the portrait box is laid out once at its final size; scrolling only moves and scales it (transform), so the
         browser never has to redo the page layout while you scroll */
      lPic.style.width = bw.toFixed(1) + 'px'; lPic.style.height = (bw * 1.25).toFixed(1) + 'px';
      lPic.style.left = (W - g - bw).toFixed(1) + 'px'; lPic.style.top = '0px';
      if (lRole) lRole.style.top = '0px';
      if (lBio) lBio.style.top = '0px';
      var stTop = parseFloat(getComputedStyle(stage).top) || 0;
      L = { W: W, H: H, g: g, nh: nh, bioTop: bioTop, big: big, small: small, top0: top0, top1: top1, aw: aw, ay: ay, bw: bw, by: by,
            start: landing.getBoundingClientRect().top + window.scrollY - stTop, run: (landing.offsetHeight - H) * 0.85 };
    };
    var lastP = -1;
    var landFrame = function () {
      landBusy = false; if (!L) { measure(); lastP = -1; }
      var p = easeIO(clamp01((scrollPos() - L.start) / L.run));
      if (p === lastP) return; lastP = p;   /* nothing to change (e.g. scrolling further down the page) */
      var s = lerp(L.big, L.small, p), ny = lerp(L.top0, L.top1, p);
      lName.style.transform = 'translate3d(' + L.g + 'px,' + ny.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      var w = lerp(L.aw, L.bw, p), h = w * 1.25, y = lerp(L.ay, L.by, p);
      lPic.style.transform = 'translate3d(' + (L.bw - w).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + (w / L.bw).toFixed(4) + ')';
      if (lRole) lRole.style.transform = 'translate3d(0,' + (y + h + 8).toFixed(1) + 'px,0)';
      /* the line stays just under the name while the name is still shrinking, and fades in */
      var bv = clamp01((p - 0.55) / 0.35);
      if (lBio) { lBio.style.opacity = bv.toFixed(3); lBio.style.transform = 'translate3d(0,' + (Math.max(L.bioTop, ny + L.nh * s + 18) + (1 - bv) * 20).toFixed(1) + 'px,0)'; }
      if (lLow && landing.classList.contains('ready')) lLow.style.opacity = clamp01(1 - p / 0.25).toFixed(3);
    };
    /* after the opening animation the disciplines follow the scroll directly (no transition delay) */
    setTimeout(function () { landing.classList.add('ready'); lastP = -1; landReq(); }, 2600);
    var landReq = function () { if (!landBusy) { landBusy = true; requestAnimationFrame(landFrame); } };
    window.addEventListener('scroll', landReq, { passive: true });
    window.addEventListener('resize', function () { L = null; landReq(); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { L = null; landReq(); });
    landFrame();
  }
  /* ...and in every other section the title wipes in and the content rises softly as it arrives */
  if (window.IntersectionObserver && !reduce) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('body > section').forEach(function (sec) {
      if (sec.classList.contains('landing')) return;
      Array.prototype.forEach.call(sec.children, function (c, k) {
        if (c.classList.contains('films')) return;   /* the films strip slides sideways instead */
        var h = c.querySelector && c.querySelector('h2'); if (h) { h.classList.add('rise-h'); rio.observe(h); }
        c.classList.add('rise-r'); c.style.transitionDelay = Math.min(k, 4) * 0.08 + 's'; rio.observe(c);
      });
    });
  }

  /* films reel: the Films section holds in place while the films slide sideways as you keep scrolling down */
  var reel = $('#films'), reelTrack = reel && $('.films', reel);
  if (reel && reelTrack && !reduce) {
    var pin = document.createElement('div'); pin.className = 'reel-pin';
    while (reel.firstChild) pin.appendChild(reel.firstChild);
    reel.appendChild(pin); reel.classList.add('reel-on');
    var reelDist = 0, reelX = 0, reelTo = 0, reelRun = false, reelSpan = 1, reelTop = 0;
    var REEL_SLOW = 2;   /* scroll this many pixels down for each pixel the films move sideways */
    var reelSize = function () {
      var pad = parseFloat(getComputedStyle(reel).paddingLeft) || 0;
      reelDist = Math.max(0, reelTrack.scrollWidth - window.innerWidth + pad * 2);
      reel.style.height = (window.innerHeight + reelDist * REEL_SLOW) + 'px'; reelSpan = reelDist * REEL_SLOW;
      reelTop = reel.getBoundingClientRect().top + window.scrollY;
      reelMove();
    };
    /* the films ease towards where the scroll says they should be, so they glide instead of jumping */
    var reelStep = function () {
      reelX += (reelTo - reelX) * 0.1;
      if (Math.abs(reelTo - reelX) < 0.3) reelX = reelTo;
      reelTrack.style.transform = 'translate3d(' + (-reelX).toFixed(1) + 'px,0,0)';
      if (reelX !== reelTo) requestAnimationFrame(reelStep); else reelRun = false;
    };
    var reelMove = function () {
      /* position from remembered numbers, so scrolling never forces the browser to measure the page */
      var top = reelTop - scrollPos(), span = reelSpan;
      reelTo = Math.max(0, Math.min(1, -top / Math.max(1, span))) * reelDist;
      if (top + span + window.innerHeight < 0 || top > window.innerHeight) { reelX = reelTo; reelTrack.style.transform = 'translate3d(' + (-reelX).toFixed(1) + 'px,0,0)'; return; }   /* off screen: no need to animate */
      if (!reelRun) { reelRun = true; requestAnimationFrame(reelStep); }
    };
    window.addEventListener('scroll', reelMove, { passive: true });
    window.addEventListener('resize', reelSize, { passive: true }); window.addEventListener('load', reelSize);
    reelSize();
  }

  /* services: each row comes up from pale as it reaches the middle of the screen */
  var svcRows = $$('.svc-row');
  if (svcRows.length && window.IntersectionObserver && !reduce) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); sio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -35% 0px' });
    svcRows.forEach(function (r) { sio.observe(r); });
  } else svcRows.forEach(function (r) { r.classList.add('in'); });

  /* expertise statement: words darken one by one as it scrolls up the screen */
  var xp = $('.xp-t');
  if (xp) {
    var words = xp.textContent.trim().split(/\s+/); xp.textContent = '';
    words.forEach(function (w, i) { var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w; xp.appendChild(sp); if (i < words.length - 1) xp.appendChild(document.createTextNode(' ')); });
    var ws = $$('.w', xp);
    var litN = -1, xpTop = 0;
    var xpMeasure = function () { xpTop = xp.getBoundingClientRect().top + window.scrollY; };
    var light = function () {
      var vh = window.innerHeight, top = xpTop - scrollPos();
      var p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.9 - top) / (vh * 0.55)));
      var n = Math.round(p * ws.length);
      if (n === litN) return;   /* only touch the words when the count changes */
      ws.forEach(function (w, i) { if ((i < n) !== (i < litN)) w.classList.toggle('on', i < n); });
      litN = n;
    };
    xpMeasure(); light(); window.addEventListener('scroll', light, { passive: true });
    var xpRe = function () { xpMeasure(); litN = -1; light(); };
    window.addEventListener('resize', xpRe, { passive: true }); window.addEventListener('load', xpRe);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(xpRe);
  }

  /* selected work: depth carousel. The project in front is large; the next ones wait behind it, each smaller and paler.
     It goes round endlessly: the front card leaves to the left and comes back in at the end of the line.
     Arrows, dashes, a click on a waiting card, a swipe or the arrow keys bring the next one forward; a click on the
     front card opens it. Card sizes are measured only on resize; changing project only sets transforms. */
  var dc = $('#dc');
  if (dc) {
    var dcStage = $('.dc-stage', dc), dcCards = $$('.dc-card', dc), dcDash = $$('.dc-dash button', dc), dcN = dcCards.length, dcI = 0;
    var dcTxt = $('.dc-txt', dc), dcU = $('.dc-u', dc), dcT = $('.dc-t', dc), dcS = $('.dc-s', dc);
    var DX, DS, DF;
    var dcLook = function (ph) {   /* where each waiting card sits (share of the front card's width), its size and paleness; phones show fewer */
      if (ph) { DX = [0, 0.86, 1.3, 1.56]; DS = [1, 0.74, 0.56, 0.44]; DF = [0, 0.14, 0.34, 0.54]; }
      else { DX = [0, 0.98, 1.58, 1.95, 2.2, 2.38]; DS = [1, 0.82, 0.66, 0.54, 0.45, 0.38]; DF = [0, 0.1, 0.24, 0.38, 0.52, 0.66]; }
    };
    var dcW = 0;
    var dcPose = function (c, d) {   /* d: 0 = front, 1 = first one behind, ... */
      var j = Math.min(d, DX.length - 1);
      c.style.transform = 'translate3d(' + (DX[j] * dcW).toFixed(1) + 'px,' + ((1 - DS[j]) * dcW * 0.2).toFixed(1) + 'px,0) scale(' + DS[j] + ') rotateY(' + (d ? 14 : 7) + 'deg)';
      c.style.setProperty('--fade', DF[j]); c.style.zIndex = 50 - d;
      c.classList.toggle('off', d > DX.length - 1);
    };
    var dcExit = function (c) {   /* just left of the front spot, invisible */
      c.style.transform = 'translate3d(' + (-0.35 * dcW).toFixed(1) + 'px,0,0) scale(1.04) rotateY(7deg)';
      c.style.zIndex = 60; c.classList.add('off');
    };
    var dcJump = function (c, fn) { c.style.transition = 'none'; fn(); void c.offsetWidth; c.style.transition = ''; };
    var dcPlace = function (dir, instant) {
      dcCards.forEach(function (c, k) {
        var nd = ((k - dcI) % dcN + dcN) % dcN, od = c._d;
        clearTimeout(c._t);
        c.classList.toggle('on', nd === 0);
        c.tabIndex = nd === 0 ? 0 : -1; c.setAttribute('aria-hidden', nd === 0 ? 'false' : 'true');
        if (instant || od === undefined || reduce) dcPose(c, nd);
        else if (dir > 0 && nd > od) {   /* was in front: leaves to the left, then reappears at the back */
          dcExit(c);
          c._t = setTimeout(function () { dcJump(c, function () { dcPose(c, nd); c.classList.add('off'); }); dcPose(c, nd); }, 480);
        } else if (dir < 0 && nd < od) {   /* comes round from the back: enters from the left */
          dcJump(c, function () { dcExit(c); }); dcPose(c, nd);
        } else dcPose(c, nd);
        c._d = nd;
      });
    };
    var dcSize = function () {
      var w = dcStage.clientWidth, ph = window.innerWidth < 760;
      dcLook(ph);
      var last = Math.min(DX.length, dcN) - 1, ext = DX[last] + DS[last];
      dcW = Math.min(w / ext, window.innerHeight * (ph ? 0.46 : 0.56) / 1.25);
      dc.style.setProperty('--cw', dcW.toFixed(1) + 'px');
      dcStage.style.height = (dcW * 1.25).toFixed(1) + 'px';
      dcPlace(0, true);
    };
    var dcInfo = function () {
      var c = dcCards[dcI];
      dcU.textContent = c.dataset.sub || ''; dcT.textContent = c.dataset.title || ''; dcS.textContent = c.dataset.sum || '';
      dcDash.forEach(function (b, k) { if (k === dcI) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    };
    var dcTimer = 0;
    var dcGo = function (i, dir) {
      i = (i % dcN + dcN) % dcN; if (i === dcI) return;
      if (!dir) { var f = (i - dcI + dcN) % dcN; dir = f <= dcN / 2 ? 1 : -1; }   /* the short way round */
      dcI = i; dcPlace(dir);
      if (reduce) { dcInfo(); return; }
      dcTxt.classList.add('out'); clearTimeout(dcTimer);
      dcTimer = setTimeout(function () { dcInfo(); dcTxt.classList.remove('out'); }, 200);
    };
    $('.dc-prev', dc).addEventListener('click', function () { dcGo(dcI - 1, -1); });
    $('.dc-next', dc).addEventListener('click', function () { dcGo(dcI + 1, 1); });
    dcDash.forEach(function (b, k) { b.addEventListener('click', function () { dcGo(k); }); });
    /* a click on a waiting card brings it forward instead of opening it; a drag never opens anything */
    var dcDragged = false;
    dcStage.addEventListener('click', function (e) {
      var c = e.target.closest('.dc-card'); if (!c) return;
      if (dcDragged || !c.classList.contains('on')) { e.preventDefault(); e.stopPropagation(); if (!dcDragged) dcGo(dcCards.indexOf(c), 1); }
    });
    /* swipe / drag sideways */
    var dcX0 = null, dcY0 = 0;
    dcStage.addEventListener('pointerdown', function (e) { if (e.button > 0) return; dcX0 = e.clientX; dcY0 = e.clientY; dcDragged = false; });
    window.addEventListener('pointermove', function (e) {
      if (dcX0 === null || dcDragged) return;
      var dx = Math.abs(e.clientX - dcX0);
      if (dx > 12 && dx > Math.abs(e.clientY - dcY0)) { dcDragged = true; dc.classList.add('drag'); }
    }, { passive: true });
    window.addEventListener('pointerup', function (e) {
      if (dcX0 === null) return;
      var dx = e.clientX - dcX0; dcX0 = null; dc.classList.remove('drag');
      if (dcDragged && Math.abs(dx) > 40) { if (dx < 0) dcGo(dcI + 1, 1); else dcGo(dcI - 1, -1); }
      setTimeout(function () { dcDragged = false; }, 0);
    });
    window.addEventListener('pointercancel', function () { dcX0 = null; dcDragged = false; dc.classList.remove('drag'); });
    dc.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); dcGo(dcI + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); dcGo(dcI - 1, -1); }
    });
    dc.classList.add('dc-on'); dcInfo(); dcSize();
    window.addEventListener('resize', dcSize, { passive: true });
  }

  /* services header: starts centred (heading over his line); as it scrolls up, the heading slides to the left and
     the line to the right. Positions are measured once (and on resize); scrolling only sets transforms. */
  var sh = $('.svc-head');
  if (sh && !reduce) {
    var shH = $('.svc-h', sh), shT = $('.svc-txt', sh), shA = null, shP = -1, SH_S = 0.72;
    var shMeasure = function () {
      shH.style.transform = shT.style.transform = ''; sh.style.height = ''; shP = -1; shA = null;
      var on = window.innerWidth > 1100 && shT.offsetHeight > 0;
      sh.classList.toggle('svc-move', on);
      if (!on) return;
      var top = 0, el = sh; while (el) { top += el.offsetTop; el = el.offsetParent; }
      var bh = sh.offsetHeight, cy = bh / 2;
      /* offsets inside the header box (layout values, unaffected by the reveal transforms) */
      var hx = shH.offsetLeft, hy = shH.offsetTop, hw = shH.offsetWidth, hh = shH.offsetHeight;
      var tx = shT.offsetLeft, ty = shT.offsetTop, tw = shT.offsetWidth, th = shT.offsetHeight;
      sh.style.height = bh + 'px';
      shA = { top: top, hx: -hx, hy: cy - hh * SH_S / 2 - hy, tx: sh.clientWidth - tw - tx, ty: cy - th / 2 - ty };
    };
    var shFrame = function () {
      if (!shA) return;
      var vh = window.innerHeight, top = shA.top - scrollPos();
      var p = Math.max(0, Math.min(1, (vh * 0.85 - top) / (vh * 0.8)));
      p = Math.round(p * 1000) / 1000; if (p === shP) return; shP = p;
      /* sideways first, up/down a little later, so the heading and the line never cross */
      var io = function (x) { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
      var ex = io(p / 0.7), ey = io((p - 0.3) / 0.7);
      shH.style.transform = 'translate3d(' + (shA.hx * ex).toFixed(1) + 'px,' + (shA.hy * ey).toFixed(1) + 'px,0) scale(' + (1 + (SH_S - 1) * ex).toFixed(3) + ')';
      shT.style.transform = 'translate3d(' + (shA.tx * ex).toFixed(1) + 'px,' + (shA.ty * ey).toFixed(1) + 'px,0)';
    };
    var shRe = function () { shMeasure(); shFrame(); };
    shRe(); window.addEventListener('scroll', shFrame, { passive: true });
    window.addEventListener('resize', shRe, { passive: true }); window.addEventListener('load', shRe);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(shRe);
  }

  /* links to a section of the home page glide there like the wheel does (instead of jumping) */
  if (lenis) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      var a = e.target.closest('a[href*="#"]'); if (!a || a.closest('#view')) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (u.origin !== location.origin || u.pathname.replace(/index\.html$/, '') !== location.pathname.replace(/index\.html$/, '')) return;
      var id = u.hash.slice(1); if (!id || /^work-/.test(id)) return;
      var t = document.getElementById(id); if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -(topBar ? topBar.offsetHeight : 0), duration: 1.4 });
      try { history.replaceState(null, '', '#' + id); } catch (err) {}
    });
  }

  /* scrollbar: the browser's own bar jumps the page in big steps (it cannot use the smooth scrolling), so on screens
     with a mouse it is replaced by a thin bar that scrolls through the same smooth scrolling as the wheel */
  if (lenis && window.matchMedia('(pointer: fine)').matches) {
    root.classList.add('sbar-on');
    var sb = document.createElement('div'); sb.className = 'sbar'; sb.setAttribute('aria-hidden', 'true'); sb.innerHTML = '<i></i>';
    document.body.appendChild(sb);
    var sbT = sb.firstChild, sbMax = 1, sbTh = 40, sbH = 1, sbHide = 0, sbDrag = null;
    var sbMove = function () { sbT.style.transform = 'translate3d(0,' + ((lenis.scroll / sbMax) * (sbH - sbTh)).toFixed(1) + 'px,0)'; };
    var sbSize = function () {
      var docH = document.documentElement.scrollHeight; sbH = window.innerHeight;
      sbMax = Math.max(1, docH - sbH); sbTh = Math.max(44, sbH * sbH / docH);
      sbT.style.height = sbTh.toFixed(1) + 'px'; sb.hidden = docH <= sbH + 1; sbMove();
    };
    var sbShow = function () {
      sb.classList.add('show'); clearTimeout(sbHide);
      sbHide = setTimeout(function () { if (!sbDrag) sb.classList.remove('show'); }, 1000);
    };
    lenis.on('scroll', function () { sbMove(); sbShow(); });
    var sbTo = function (y) { lenis.scrollTo(Math.max(0, Math.min(sbMax, y))); };
    sbT.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation(); sbT.setPointerCapture(e.pointerId);
      sbDrag = { y: e.clientY, s: lenis.targetScroll }; sb.classList.add('drag', 'show');
    });
    sbT.addEventListener('pointermove', function (e) {
      if (!sbDrag) return;
      sbTo(sbDrag.s + (e.clientY - sbDrag.y) / Math.max(1, sbH - sbTh) * sbMax);
    });
    var sbEnd = function () { if (!sbDrag) return; sbDrag = null; sb.classList.remove('drag'); sbShow(); };
    sbT.addEventListener('pointerup', sbEnd); sbT.addEventListener('pointercancel', sbEnd);
    sb.addEventListener('pointerdown', function (e) {   /* a click on the track goes to that point */
      if (e.target !== sb) return; e.preventDefault();
      sbTo((e.clientY - sbTh / 2) / Math.max(1, sbH - sbTh) * sbMax);
    });
    sbSize(); window.addEventListener('resize', sbSize, { passive: true }); window.addEventListener('load', sbSize);
    if (window.ResizeObserver) new ResizeObserver(sbSize).observe(document.body);
  }

  /* menu: a full-screen film slate that claps shut */
  var slate = $('#slate'), mopen = $('#mopen');
  if (slate && mopen) {
    var setSlate = function (v, viaLink) {
      slate.classList.toggle('open', v); slate.setAttribute('aria-hidden', String(!v));
      mopen.setAttribute('aria-expanded', String(v)); root.style.overflow = v ? 'hidden' : '';
      if (v) { var first = $('ol a', slate); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 450); }
      else if (!viaLink) mopen.focus({ preventScroll: true }); else if (document.activeElement && slate.contains(document.activeElement)) document.activeElement.blur();
    };
    mopen.addEventListener('click', function () { setSlate(true); });
    $$('[data-slate-close]', slate).forEach(function (el) { el.addEventListener('click', function () { setSlate(false, el.tagName === 'A'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && slate.classList.contains('open')) setSlate(false); });
  }

  /* image that follows the cursor over the index (blob reveal) */
  var blob = $('#blob');
  if (blob && rows && window.matchMedia('(hover: hover)').matches) {
    var bx = 0, by = 0, tx = 0, ty = 0, raf = 0, stop = window.innerWidth, img = $('#blobImg'), pl = $('#blobPl');
    var KIND = { film: '▶ Watch', link: '↗ Visit', case: '◼ Case study' };
    var loop = function () {
      bx += (tx - bx) * (reduce ? 1 : 0.18); by += (ty - by) * (reduce ? 1 : 0.18);
      var x = Math.max(12, Math.min(bx, stop - blob.offsetWidth - 24));
      blob.style.transform = 'translate(' + x + 'px,' + by + 'px)';
      raf = blob.classList.contains('on') ? requestAnimationFrame(loop) : 0;
    };
    /* load every preview photo ahead of time so switching rows is instant */
    var cache = {};
    var load = function (src) {
      if (!cache[src]) { var im = new Image(); im.decoding = 'async'; im.src = src; cache[src] = im.decode ? im.decode().then(function () { return im; }, function () { return im; }) : Promise.resolve(im); }
      return cache[src];
    };
    var preloadAll = function () { $$('.row', rows).forEach(function (r) { if (r.dataset.img) load(r.dataset.img); }); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { preloadAll(); io.disconnect(); } }, { rootMargin: '600px 0px' });
      io.observe(rows);
    } else preloadAll();
    var showPreview = function (r) {
      var src = r.dataset.img; img.dataset.src = src; pl.textContent = KIND[r.dataset.kind] || '';
      /* never leave the previous project's photo up while the new one loads */
      if (img.src !== new URL(src, location.href).href) blob.classList.add('wait');
      load(src).then(function () { if (img.dataset.src === src) { img.src = src; blob.classList.remove('wait'); } });
    };
    var mx = -1, my = -1;
    var track = function (x, y) {
      var el = document.elementFromPoint(x, y), r = el && el.closest('.row');
      if (!r || !rows.contains(r)) { blob.classList.remove('on'); return; }
      /* keep the preview clear of the Watch / Visit / Case study button column */
      var act = $('.act', r); stop = act ? act.getBoundingClientRect().left - 24 : window.innerWidth;
      tx = x + blob.offsetWidth + 60 > stop ? x - blob.offsetWidth - 40 : x + 30;
      ty = y - blob.offsetHeight / 2;
      if (img.dataset.src !== r.dataset.img) showPreview(r);
      blob.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop);
    };
    rows.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; track(mx, my); });
    /* scrolling moves rows under a still mouse, so re-check which project is under it */
    var sraf = 0;
    window.addEventListener('scroll', function () {
      if (mx < 0 || sraf) return;
      sraf = requestAnimationFrame(function () { sraf = 0; track(mx, my); });
    }, { passive: true });
    document.addEventListener('mouseleave', function () { mx = -1; blob.classList.remove('on'); });
    rows.addEventListener('mouseleave', function () { blob.classList.remove('on'); });
    document.addEventListener('mousemove', function (e) { if (!rows.contains(e.target)) mx = -1; }, { passive: true });
  }

  /* film player: YouTube, Vimeo or a video file */
  function embed(url) {
    if (!url) return '';
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (m) return '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Film"></iframe>';
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return '<iframe src="https://player.vimeo.com/video/' + m[1] + '?autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Film"></iframe>';
    return '<video src="' + url.replace(/"/g, '&quot;') + '" controls autoplay playsinline></video>';
  }
  var lb = $('#lb'), lastFocus = null;
  function openFilm(el) {
    if (!lb || !el.dataset.video) return false;
    lastFocus = document.activeElement;
    $('#lbKick').textContent = '▶ ' + (el.dataset.sub || 'Film');
    $('#lbTitle').textContent = el.dataset.title || '';
    $('#lbScr').innerHTML = embed(el.dataset.video);
    $('#lbMore').href = el.dataset.page || '#';
    lb.hidden = false; $('#lbX').focus();
    return true;
  }
  function closeFilm() { if (!lb || lb.hidden) return; lb.hidden = true; $('#lbScr').innerHTML = ''; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-kind="film"], .js-play');
    if (el && el.dataset.video && !e.metaKey && !e.ctrlKey) { if (openFilm(el)) e.preventDefault(); }
  });
  if (lb) {
    $('#lbX').addEventListener('click', closeFilm);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeFilm(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilm(); });
  }
  /* inline player on a project page */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.playbig'); if (!b) return;
    var p = b.closest('.player'); p.innerHTML = embed(p.dataset.video);
  });

  /* reading progress on project pages */
  function progress(scroller, bar) {
    var el = scroller === window ? document.documentElement : scroller;
    var max = el.scrollHeight - el.clientHeight;
    bar.style.setProperty('--pr', (max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0) + '%');
  }
  var ownBar = $('.is-project .progress');
  if (ownBar) window.addEventListener('scroll', function () { progress(window, ownBar); }, { passive: true });

  /* projects open in the same tab: the case file slides up over the home page and starts at the top */
  var view = $('#view');
  if (view) {
    var opened = false, returnFocus = null;
    var isProjectHref = function (a) {
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return false; }
      return u.origin === location.origin && /\/work\/[^/]+\/?(index\.html)?$/.test(u.pathname);
    };
    var absolutize = function (node, base) {
      $$('[src],[href],[data-page],[data-img]', node).forEach(function (el) {
        ['src', 'href', 'data-page', 'data-img'].forEach(function (k) {
          var v = el.getAttribute(k);
          if (v && !/^(#|mailto:|tel:|https?:|data:)/.test(v)) el.setAttribute(k, new URL(v, base).href);
        });
      });
      $$('[style*="url("]', node).forEach(function (el) {
        el.setAttribute('style', el.getAttribute('style').replace(/url\('([^']+)'\)/g, function (m, v) { return "url('" + new URL(v, base).href + "')"; }));
      });
    };
    /* project pages are fetched once and kept, and fetched early when a pointer rests on a link */
    var pages = {};
    var getPage = function (url) {
      if (!pages[url]) pages[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
      pages[url].catch(function () { delete pages[url]; });
      return pages[url];
    };
    var prefetch = function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && isProjectHref(a)) getPage(new URL(a.getAttribute('href'), location.href).href);
    };
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('touchstart', prefetch, { passive: true });
    var openProject = function (href, fromNav) {
      var url = new URL(href, location.href).href;
      document.body.insertAdjacentHTML('beforeend', '<div class="view-loading mono" id="vload">Opening…</div>');
      return getPage(url).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var file = doc.querySelector('.casefile'); if (!file) throw new Error('no casefile');
        absolutize(file, url);
        if (!opened) returnFocus = document.activeElement;
        view.innerHTML = ''; view.appendChild(document.importNode(file, true));
        view.hidden = false; view.scrollTop = 0; root.classList.add('view-open'); holdScroll(true);
        /* once the project fully covers the screen, stop drawing the page behind it (it is hidden anyway) */
        clearTimeout(stillT); stillT = setTimeout(function () { if (!view.hidden) root.classList.add('view-still'); }, reduce ? 0 : 600);
        if (!reduce && !fromNav) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
        var t = $('.ptitle', view); document.title = (t ? t.textContent + ' · ' : '') + 'Mohamed Ewis';
        var bar = $('.progress', view); view.onscroll = function () { progress(view, bar); };
        var close = $('.cb-close', view); if (close) close.focus({ preventScroll: true });
        var slug = file.getAttribute('data-slug');
        try { if (!opened) history.pushState({ ewisView: slug }, '', '#work-' + slug); else history.replaceState({ ewisView: slug }, '', '#work-' + slug); } catch (e) {}
        opened = true;
      }).catch(function () { location.href = url; }).then(function () { var l = $('#vload'); if (l) l.remove(); });
    };
    /* leaving a project: while the project still covers the screen, the page underneath moves straight to where the link
       points (unseen), then the project fades and lifts away to reveal it. Only opacity and transform animate, so it stays smooth */
    var stillT = 0;
    var jumpTo = function (y) {
      y = Math.max(0, y);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    };
    var closeProject = function (target) {
      if (view.hidden) return;
      clearTimeout(stillT); root.classList.remove('view-still', 'view-open'); holdScroll(false);
      document.title = 'Mohamed Ewis · Creative/Art Director';
      if (target === 'top') jumpTo(0);
      else if (target) { var el = document.getElementById(target); if (el) jumpTo(el.getBoundingClientRect().top + window.scrollY - (topBar ? topBar.offsetHeight : 0)); }
      var done = function () {
        view.hidden = true; view.classList.remove('leave'); view.innerHTML = '';
        if (!target && returnFocus) returnFocus.focus({ preventScroll: true });
      };
      if (opened) { opened = false; try { history.replaceState(null, '', location.pathname + location.search + (target && target !== 'top' ? '#' + target : '')); } catch (e) {} }
      /* let the page draw once under the still-solid project, then fade the project away */
      if (reduce) done();
      else requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { view.classList.add('leave'); setTimeout(done, 650); }, 30); }); });
    };
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      var a = e.target.closest('a'); if (!a) return;
      if (view.contains(a) && a.hasAttribute('data-close')) {
        e.preventDefault(); var h = a.getAttribute('href').split('#')[1]; closeProject(a.hasAttribute('data-go') ? h : (h === 'work' ? null : h)); return;   /* data-go: always land on the target (the project footer) */
      }
      if (view.contains(a) && a.hasAttribute('data-jump')) {
        e.preventDefault(); var t = view.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return;
      }
      if (isProjectHref(a)) { e.preventDefault(); openProject(a.href, !view.hidden); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !view.hidden && (!lb || lb.hidden)) closeProject(); });
    window.addEventListener('popstate', function () { if (!view.hidden && !/^#work-/.test(location.hash)) { opened = false; closeProject(); } });
    /* deep link: index.html#work-gorillaz */
    var m = location.hash.match(/^#work-([\w-]+)$/);
    if (m) { var link = $('a[href*="/work/' + m[1] + '/"], a[href*="work/' + m[1] + '/"]'); if (link) openProject(link.href); }
  }

  /* personal: focus carousel. The centre photo is large; every other photo is one smaller size and fades step by step
     with distance, all in colour and sharp (client feedback round 2: no blur, no black and white, just a fade, like
     Framer's "3D Scale Carousel"). Clicking a photo glides it to the centre (sizes and fade blend on the way); the arrow keys also work. No drag or wheel control, so
     scrolling over the section always scrolls the page. */
  var fc = $('#fc');
  if (fc) {
    var its = $$('.fc-it', fc), trk = $('.fc-track', fc), N = its.length;
    var pos = 0, target = 0, running = false, lastShown = -1;
    var OPAC = [1, 0.85, 0.62, 0.45, 0.3, 0.12];
    var wrap = function (d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var dims = function () {
      var W = trk.clientWidth, ph = window.innerWidth < 760;
      var cw = ph ? Math.min(W * 0.54, 300) : Math.min(400, Math.max(200, W * 0.28));
      var gap = cw * 0.055, sw = cw * 0.4, side = Math.min(3, Math.floor((N - 1) / 2));
      if (!ph && side > 0) {   /* fill the row to both edges: side photos between 30% and 50% of the centre one, spacing takes the rest */
        var room = W / 2 - cw / 2;
        sw = Math.max(cw * 0.3, Math.min(cw * 0.5, (room - side * gap) / side));
        gap = Math.max(gap, (room - side * sw) / side);
      }
      return { cw: cw, ch: cw * 4 / 3, sw: sw, sh: sw * 4 / 3, gap: gap };
    };
    var D = dims();
    var render = function () {
      its.forEach(function (el, i) {
        var d = wrap(i - pos), a = Math.abs(d), t = Math.min(1, a);
        var w = lerp(D.cw, D.sw, t), h = lerp(D.ch, D.sh, t);
        var near = D.cw / 2 + D.gap + D.sw / 2;
        var x = a <= 1 ? a * near : near + (a - 1) * (D.sw + D.gap);
        var k = Math.min(5, Math.floor(a)), f = a - Math.floor(a), op = a >= 5 ? Math.max(0, 0.12 - (a - 5) * 0.15) : lerp(OPAC[k], OPAC[Math.min(5, k + 1)], f);
        el.style.width = w.toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
        el.style.transform = 'translate3d(' + ((d < 0 ? -x : x) - w / 2).toFixed(1) + 'px,' + (-h / 2).toFixed(1) + 'px,0)';
        el.style.opacity = op.toFixed(3); el.style.zIndex = String(100 - Math.round(a * 10));
        el.style.visibility = op < 0.01 ? 'hidden' : '';
      });
      var cur = ((Math.round(pos) % N) + N) % N;
      if (cur !== lastShown) {
        lastShown = cur;
        its.forEach(function (el, i) { var on = i === cur; el.classList.toggle('on', on); el.setAttribute('aria-current', on ? 'true' : 'false'); el.tabIndex = on ? 0 : -1; });
        var cap = $('.fc-cap', fc), on = its[cur];
        if (cap && on) {
          var ct = $('.fc-t', cap), ci = $('.fc-i', cap), nt = on.dataset.title || '', ni = on.dataset.info || '';
          if (ct.textContent !== nt || ci.textContent !== ni) {
            cap.classList.add('swap');
            setTimeout(function () { ct.textContent = nt; ci.textContent = ni; cap.classList.remove('swap'); }, ct.textContent ? 160 : 0);
          }
        }
      }
    };
    /* eased glide to the target photo: about 0.65s for one step, a little longer for far photos */
    var from = 0, t0 = 0, dur = 650;
    var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var tick = function (now) {
      var k = Math.min(1, (now - t0) / dur); pos = from + (target - from) * ease(k);
      render();
      if (k < 1) requestAnimationFrame(tick); else { pos = target; running = false; }
    };
    var kick = function () {
      from = pos; t0 = performance.now(); dur = Math.min(1100, 650 + 110 * (Math.abs(target - from) - 1));
      if (!running) { running = true; requestAnimationFrame(tick); }
    };
    var goTo = function (i) {   /* go to photo i the short way round */
      target = Math.round(pos + wrap(i - pos)); kick();
    };
    var step = function (n) { target = Math.round(target) + n; kick(); };
    its.forEach(function (el, i) { el.addEventListener('click', function () { goTo(i); }); });
    fc.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    var size = function () { trk.style.height = (D.ch + 8) + 'px'; fc.style.setProperty('--cw', D.cw + 'px'); };
    window.addEventListener('resize', function () { D = dims(); size(); render(); }, { passive: true });
    size(); render();
  }

  /* pin-board drifts with the cursor */
  var board = $('#board');
  if (board && !reduce) {
    var pins = $$('.pin', board);
    board.addEventListener('mousemove', function (e) {
      var b = board.getBoundingClientRect(), dx = (e.clientX - b.left) / b.width - 0.5, dy = (e.clientY - b.top) / b.height - 0.5;
      pins.forEach(function (el) {
        var d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 1;
        el.style.setProperty('--tx', (dx * -36 * d) + 'px'); el.style.setProperty('--ty', (dy * -28 * d) + 'px'); el.style.setProperty('--rr', (dx * 5 * d) + 'deg');
      });
    });
    board.addEventListener('mouseleave', function () { pins.forEach(function (el) { el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); el.style.removeProperty('--rr'); }); });
  }

  /* CV timeline: clips jump to chapters, typed command */
  $$('.clip').forEach(function (c) {
    c.addEventListener('click', function () {
      var t = document.getElementById(c.dataset.k); if (!t) return;
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); setCur(c.dataset.k);
    });
  });
  function setCur(k) {
    $$('.clip').forEach(function (c) { c.classList.toggle('cur', c.dataset.k === k); });
    $$('.entry').forEach(function (a) { a.classList.toggle('cur', a.id === k); });
  }
  $$('.entry').forEach(function (a) { a.addEventListener('mouseenter', function () { setCur(a.id); }); });
  var cmd = $('.cmd');
  if (cmd) {
    var full = cmd.dataset.cmd, out = $('.typed', cmd), at = full.indexOf(':');
    var paint = function (s) { out.innerHTML = ''; var b = document.createElement('b'); b.textContent = s.slice(0, Math.min(s.length, at)); out.appendChild(b); out.appendChild(document.createTextNode(s.slice(at))); };
    if (reduce || !('IntersectionObserver' in window)) paint(full);
    else {
      /* types while the line is on screen; the replay every 6 s only happens while it is visible */
      var i = 0, seen = false, typing = false;
      var type = function () { typing = true; paint(full.slice(0, i)); i++; if (i <= full.length) setTimeout(type, 38); else { typing = false; setTimeout(function () { if (seen) { i = 0; type(); } }, 6000); } };
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen && !typing && i === 0) type(); else if (seen && !typing && i > full.length) { i = 0; type(); } }).observe(cmd);
    }
  }

  /* looping animations (REC dots, CV caret and play-head) pause while their section is off screen */
  if ('IntersectionObserver' in window) {
    var aio = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('anim-off', !e.isIntersecting); }); });
    $$('#films, #cv').forEach(function (s) { aio.observe(s); });
  }

  /* copy buttons */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copy-b'); if (!b) return;
    var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.v).then(done, function () {});
  });

  /* gentle reveal: content is visible without JS; only lifts items that start below the fold */
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-motion');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    $$('.rv').forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); io.observe(el); } });
  }

  /* moving between pages: browsers with cross-page view transitions animate it from site.css; the others get a short
     fade-out here before the next page loads */
  if (!('onpagereveal' in window) && !reduce) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      var a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (u.origin !== location.origin || u.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '')) return;
      if (/\/admin\//.test(u.pathname)) return;
      e.preventDefault(); root.classList.add('page-out');
      setTimeout(function () { location.href = u.href; }, 340);
    });
    window.addEventListener('pageshow', function () { root.classList.remove('page-out'); });
  }
})();

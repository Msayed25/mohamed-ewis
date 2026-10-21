/* Mohamed Ewis portfolio: small, dependency-free enhancements. The page works without this file. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* smooth scrolling (Lenis, like adigun.framer.website): the wheel glides, so stacked sections slide over each other smoothly */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    var lenisFrame = function (t) { lenis.raf(t); requestAnimationFrame(lenisFrame); };
    requestAnimationFrame(lenisFrame);
  }
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

  /* stacked sections: each sticks once its bottom reaches the bottom of the screen, so the next one slides over it */
  var stk = $$('.stk'), startOf = null;
  if (stk.length && !reduce) {
    var fit = function () { stk.forEach(function (el) { el.style.top = Math.min(0, window.innerHeight - el.offsetHeight) + 'px'; }); };
    fit(); window.addEventListener('resize', fit, { passive: true }); window.addEventListener('load', fit);
    if (window.ResizeObserver) { var ro = new ResizeObserver(fit); stk.forEach(function (el) { ro.observe(el); }); }
    /* a stuck section reports its stuck position, so in-page links jump to where each section really starts:
       the stacked sections follow one another, each starting where the previous one ends */
    startOf = function (target) {
      var y = 0;
      for (var el = document.body.firstElementChild; el && el !== stk[0]; el = el.nextElementSibling) {
        var ps = getComputedStyle(el).position; if (ps !== 'fixed' && ps !== 'absolute') y += el.offsetHeight;
      }
      for (var i = 0; i < stk.length && stk[i] !== target; i++) y += stk[i].offsetHeight;
      return y;
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="#"]'); if (!a || a.target === '_blank') return;
      var u = new URL(a.href, location.href); if (u.pathname !== location.pathname || !u.hash) return;
      var t = document.getElementById(decodeURIComponent(u.hash.slice(1))); if (!t || stk.indexOf(t) < 0) return;
      e.preventDefault();
      setTimeout(function () { if (lenis) lenis.scrollTo(startOf(t), { duration: 1.4 }); else window.scrollTo({ top: startOf(t), behavior: 'smooth' }); }, 0);
      history.pushState(null, '', u.hash);
    });
    /* content rises into place as its section arrives */
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px' });
      stk.forEach(function (el) {
        if (el.classList.contains('landing')) return;
        Array.prototype.forEach.call(el.children, function (c) { c.classList.add('rise'); io.observe(c); });
      });
    }
  }

  /* services: each row comes up from pale as it reaches the middle of the screen */
  var svcRows = $$('.svc-row');
  if (svcRows.length && window.IntersectionObserver && !reduce) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); sio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -35% 0px' });
    svcRows.forEach(function (r) { sio.observe(r); });
  } else svcRows.forEach(function (r) { r.classList.add('in'); });

  /* expertise statement: words darken one by one as it scrolls through the screen */
  var xp = $('.xp-t');
  if (xp) {
    var words = xp.textContent.trim().split(/\s+/); xp.textContent = '';
    words.forEach(function (w, i) { var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w; xp.appendChild(sp); if (i < words.length - 1) xp.appendChild(document.createTextNode(' ')); });
    var ws = $$('.w', xp);
    var light = function () {
      var vh = window.innerHeight, sec = xp.closest('.stk');
      /* measured from where the section really starts, so it keeps filling in while the section is stuck */
      var top = startOf && sec ? startOf(sec) - window.scrollY : xp.getBoundingClientRect().top;
      var p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.9 - top) / (vh * 0.9)));
      var n = Math.round(p * ws.length);
      ws.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    };
    light(); window.addEventListener('scroll', light, { passive: true }); window.addEventListener('resize', light, { passive: true });
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

  /* menu: a full-screen film slate that claps shut */
  var slate = $('#slate'), mopen = $('#mopen');
  if (slate && mopen) {
    var setSlate = function (v, viaLink) {
      slate.classList.toggle('open', v); slate.setAttribute('aria-hidden', String(!v));
      mopen.setAttribute('aria-expanded', String(v)); root.style.overflow = v ? 'hidden' : ''; holdScroll(v);
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
        if (!reduce && !fromNav) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
        var t = $('.ptitle', view); document.title = (t ? t.textContent + ' · ' : '') + 'Mohamed Ewis';
        var bar = $('.progress', view); view.onscroll = function () { progress(view, bar); };
        var close = $('.cb-close', view); if (close) close.focus({ preventScroll: true });
        var slug = file.getAttribute('data-slug');
        try { if (!opened) history.pushState({ ewisView: slug }, '', '#work-' + slug); else history.replaceState({ ewisView: slug }, '', '#work-' + slug); } catch (e) {}
        opened = true;
      }).catch(function () { location.href = url; }).then(function () { var l = $('#vload'); if (l) l.remove(); });
    };
    var closeProject = function (target) {
      if (view.hidden) return;
      var done = function () {
        view.hidden = true; view.classList.remove('leave'); view.innerHTML = ''; root.classList.remove('view-open'); holdScroll(false);
        document.title = 'Mohamed Ewis · Creative Art Director';
        if (target) { var el = document.getElementById(target); if (el) el.scrollIntoView(); }
        else if (returnFocus) returnFocus.focus({ preventScroll: true });
      };
      if (opened) { opened = false; try { history.replaceState(null, '', location.pathname + location.search + (target ? '#' + target : '')); } catch (e) {} }
      if (reduce) done(); else { view.classList.add('leave'); setTimeout(done, 340); }
    };
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      var a = e.target.closest('a'); if (!a) return;
      if (view.contains(a) && a.hasAttribute('data-close')) {
        e.preventDefault(); var h = a.getAttribute('href').split('#')[1]; closeProject(h === 'work' ? null : h); return;
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

  /* personal: focus carousel. Distance from the centre sets size, blur and fade; click a side photo, use the arrows, the keyboard or swipe */
  var fc = $('#fc');
  if (fc) {
    var its = $$('.fc-it', fc), trk = $('.fc-track', fc), num = $('.fc-n', fc), cur = 0, N = its.length;
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var place = function () {
      var w = its[0] ? its[0].offsetWidth : 300, gap = w * 0.08;
      its.forEach(function (el, i) {
        var d = i - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
        var a = Math.abs(d), x = 0;
        for (var k = 1; k <= a; k++) x += (w * Math.max(0.42, 1 - (k - 1) * 0.2) + w * Math.max(0.42, 1 - k * 0.2)) / 2 + gap;
        var s = Math.max(0.42, 1 - a * 0.2);
        el.style.setProperty('--x', (d < 0 ? -x : x) + 'px'); el.style.setProperty('--s', s);
        el.style.setProperty('--b', Math.min(a, 4) * 2.4 + 'px'); el.style.setProperty('--sat', a ? 0.75 : 1);
        el.style.setProperty('--o', a > 3 ? 0 : 1 - a * 0.12); el.style.setProperty('--z', 20 - a);
        el.classList.toggle('on', a === 0); el.setAttribute('aria-current', a === 0 ? 'true' : 'false'); el.tabIndex = a === 0 ? 0 : -1;
      });
      if (num) num.textContent = pad2(cur + 1) + ' / ' + pad2(N);
    };
    var go = function (i) { cur = (i % N + N) % N; place(); };
    its.forEach(function (el, i) { el.addEventListener('click', function () { if (!moved) go(i); }); });
    $('.fc-prev', fc).addEventListener('click', function () { go(cur - 1); });
    $('.fc-next', fc).addEventListener('click', function () { go(cur + 1); });
    fc.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } });
    var sx = null, moved = false;
    trk.addEventListener('pointerdown', function (e) { sx = e.clientX; moved = false; trk.classList.add('drag'); });
    window.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null; trk.classList.remove('drag');
      if (Math.abs(dx) > 40) { moved = true; go(cur + (dx < 0 ? 1 : -1)); setTimeout(function () { moved = false; }, 50); }
    });
    window.addEventListener('resize', place, { passive: true });
    place();
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
      var i = 0, type = function () { paint(full.slice(0, i)); i++; if (i <= full.length) setTimeout(type, 38); else setTimeout(function () { i = 0; type(); }, 6000); };
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { o.disconnect(); type(); } }).observe(cmd);
    }
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
})();

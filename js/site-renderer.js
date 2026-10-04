/* =====================================================================
   site-renderer.js
   설정(siteConfig) 하나를 읽어서 홈페이지 화면(HTML)을 만듭니다.
   홈페이지(index.html)와 편집기 미리보기가 같은 코드를 씁니다.
   ===================================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* *강조* → <em>강조</em>(또는 <b>), 줄바꿈 → <br> */
  function rich(s, tag) {
    tag = tag || 'em';
    return esc(s)
      .replace(/\*([^*\n]+)\*/g, '<' + tag + '>$1</' + tag + '>')
      .replace(/\n/g, '<br>');
  }

  function has(s) { return String(s == null ? '' : s).trim() !== ''; }

  function digits(p) { return String(p == null ? '' : p).replace(/[^0-9]/g, ''); }

  /* 화면 표시용 전화번호: 15338651 → 1533-8651, 01012345678 → 010-1234-5678 */
  function fmtPhone(p) {
    var d = digits(p);
    if (!d) return '';
    if (/^(15|16|18)\d{6}$/.test(d)) return d.slice(0, 4) + '-' + d.slice(4);
    if (/^02\d{7,8}$/.test(d)) {
      return d.length === 9 ? '02-' + d.slice(2, 5) + '-' + d.slice(5)
                            : '02-' + d.slice(2, 6) + '-' + d.slice(6);
    }
    if (/^0\d{9}$/.test(d)) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    if (/^0\d{10}$/.test(d)) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
    return String(p).trim();
  }
  function telHref(p) { var d = digits(p); return d ? 'tel:' + d : ''; }
  function smsHref(p) { var d = digits(p); return d ? 'sms:' + d : ''; }

  /* 링크 주소 정리: "pf.kakao.com/xx" → "https://pf.kakao.com/xx", javascript: 등은 막음 */
  function safeUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return '';
    if (/^(https?:|tel:|sms:|mailto:|#)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';
    return 'https://' + u.replace(/^\/+/, '');
  }
  function href(u) {
    var s = safeUrl(u);
    if (!s) return '';
    var ext = /^https?:/i.test(s);
    return 'href="' + esc(s) + '"' + (ext ? ' target="_blank" rel="noopener"' : '');
  }

  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  /* 사진 한 장 → HTML. 표시 방식(fit), 위치(x,y), 확대(zoom), 비율(ratio)을 반영 */
  function imgHTML(img, ctx, cls, eager, path) {
    if (!img) return '';
    var src = ctx.resolve(img);
    if (!src) return '';
    var fit = img.fit === 'contain' || img.fit === 'natural' ? img.fit : 'cover';
    var x = Math.min(100, Math.max(0, num(img.x, 50)));
    var y = Math.min(100, Math.max(0, num(img.y, 50)));
    var z = Math.min(400, Math.max(20, num(img.zoom, 100))) / 100;
    var style = '--x:' + x + '%;--y:' + y + '%;--z:' + z + ';';
    if (img.ratio && fit !== 'natural') style += 'aspect-ratio:' + esc(img.ratio) + ';';
    return '<div class="cimg fit-' + fit + (cls ? ' ' + cls : '') + '" style="' + style + '"' +
      (ctx.editor && path ? ' data-img-path="' + esc(path) + '"' : '') + '>' +
      '<img src="' + esc(src) + '" alt="' + esc(img.alt || '') + '"' +
      (eager ? '' : ' loading="lazy"') + ' decoding="async"></div>';
  }

  function headline(label, title, desc, cls) {
    var h = '<div class="headline' + (cls ? ' ' + cls : '') + '">';
    if (has(label)) h += '<span>' + esc(label) + '</span>';
    if (has(title)) h += '<h2>' + rich(title, 'b') + '</h2>';
    if (has(desc)) h += '<p>' + rich(desc) + '</p>';
    return h + '</div>';
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* 상담 신청 버튼이 갈 곳: 네이버폼 → 문의 영역 → 전화 */
  function applyHref(cfg) {
    if (has(cfg.links && cfg.links.naverForm)) return href(cfg.links.naverForm);
    if (sectionVisible(cfg, 'inquiry')) return 'href="#inquiry"';
    var t = telHref(cfg.contact && cfg.contact.phone);
    return t ? 'href="' + t + '"' : '';
  }

  function sectionVisible(cfg, type) {
    return (cfg.sections || []).some(function (s) { return s.type === type && s.visible !== false; });
  }

  /* ---------------- 각 부분 ---------------- */

  function renderHeader(cfg, ctx) {
    var b = cfg.brand || {};
    var h = '';
    if (has(b.topStrip)) h += '<div class="top-strip">' + rich(b.topStrip, 'b') + '</div>';
    var logoSrc = b.logo ? ctx.resolve(b.logo) : '';
    var logo = logoSrc
      ? '<img class="logo-img" src="' + esc(logoSrc) + '" alt="' + esc(b.logo.alt || b.name || '로고') + '">'
      : (has(b.mark) ? '<span>' + esc(b.mark) + '</span>' : '') + '<strong>' + esc(b.name || '') + '</strong>';
    var nav = (cfg.sections || []).filter(function (s) {
      return s.visible !== false && has(s.navLabel) && s.type !== 'hero';
    }).map(function (s) {
      return '<a href="#' + esc(s.id) + '">' + esc(s.navLabel) + '</a>';
    }).join('');
    var btnHref = applyHref(cfg);
    h += '<header class="header"><div class="wrap header-inner">' +
      '<a class="logo" href="#top">' + logo + '</a>' +
      '<nav>' + nav + '</nav>' +
      (has(b.headerButton) && btnHref ? '<a class="header-btn" ' + btnHref + '>' + esc(b.headerButton) + '</a>' : '<span></span>') +
      '</div></header>';
    return h;
  }

  function renderHero(cfg, ctx, sec) {
    var h = cfg.hero || {};
    var bg = h.image ? imgHTML(h.image, ctx, '', true, 'hero.image') : '';
    var out = '<section class="hero' + (bg ? ' has-bg' : '') + '" id="' + esc(sec.id) + '">';
    if (bg) {
      out += '<div class="hero-bg">' + bg + '</div>' +
        '<div class="hero-veil" style="--veil:' + (Math.min(90, Math.max(0, num(h.veil, 35))) / 100) + '"' +
        (ctx.editor ? ' data-veil' : '') + '></div>';
    } else {
      out += '<div class="hero-art" aria-hidden="true"><div class="tower tower-a"></div><div class="tower tower-b"></div><div class="tower tower-c"></div></div>';
    }
    out += '<div class="wrap hero-inner">';
    if (has(h.kicker)) out += '<p class="kicker">' + esc(h.kicker) + '</p>';
    if (has(h.title)) out += '<h1>' + rich(h.title) + '</h1>';
    if (has(h.sub)) out += '<p class="hero-sub">' + rich(h.sub) + '</p>';
    if (has(h.lead)) out += '<p class="hero-lead">' + rich(h.lead) + '</p>';
    var btns = '';
    var p1 = href(h.primaryLink), p2 = href(h.secondaryLink);
    if (has(h.primaryText) && p1) btns += '<a class="primary" ' + p1 + '>' + esc(h.primaryText) + '</a>';
    if (has(h.secondaryText) && p2) btns += '<a class="secondary" ' + p2 + '>' + esc(h.secondaryText) + '</a>';
    if (btns) out += '<div class="hero-buttons">' + btns + '</div>';
    out += '</div><div class="hero-bottom"><span>SCROLL</span><i></i></div></section>';
    return out;
  }

  function renderSummary(cfg, ctx, sec) {
    var s = cfg.summary || {};
    var metrics = (s.metrics || []).map(function (m) {
      return '<article><small>' + esc(m.label) + '</small><strong>' + esc(m.value) +
        (has(m.unit) ? '<em>' + esc(m.unit) + '</em>' : '') + '</strong>' +
        (has(m.desc) ? '<p>' + esc(m.desc) + '</p>' : '') + '</article>';
    }).join('');
    return '<section id="' + esc(sec.id) + '" class="summary-section"><div class="wrap">' +
      headline(s.label, s.title, s.desc, 'center') +
      (metrics ? '<div class="metric-grid">' + metrics + '</div>' : '') +
      (has(s.note) ? '<p class="legal-note">' + rich(s.note) + '</p>' : '') +
      '</div></section>';
  }

  function renderSites(cfg, ctx, sec) {
    var ss = cfg.sitesSection || {};
    var list = (cfg.sites || []).map(function (site, i) { return { site: site, i: i }; })
      .filter(function (o) { return o.site.visible !== false; });
    var cards = list.map(function (o, n) {
      var site = o.site;
      var pic = site.image ? imgHTML(site.image, ctx, '', false, 'sites.' + o.i + '.image') : '';
      var rows = (site.rows || []).filter(function (r) { return has(r.k) || has(r.v); }).map(function (r) {
        return '<div><dt>' + esc(r.k) + '</dt><dd>' + esc(r.v) + '</dd></div>';
      }).join('');
      var link = has(site.link) ? href(site.link) : applyHref(cfg);
      var call = telHref(site.phone);
      return '<article class="site-card" data-site="' + esc(String(site.name || '').replace(/\n/g, ' ')) + '">' +
        '<div class="building-visual v' + ((n % 3) + 1) + (pic ? ' has-img' : '') + '">' + pic +
        (has(site.tag) ? '<div class="sky-label">' + esc(site.tag) + '</div>' : '') +
        (pic ? '' : '<div class="mini-building"></div>') + '</div>' +
        '<div class="site-info">' +
        (has(site.area) ? '<p>' + esc(site.area) + '</p>' : '') +
        '<h3>' + rich(site.name) + '</h3>' +
        (has(site.short) ? '<p class="site-short">' + rich(site.short) + '</p>' : '') +
        (rows ? '<dl>' + rows + '</dl>' : '') +
        (has(site.detail) ? '<p class="site-detail">' + rich(site.detail) + '</p>' : '') +
        (has(site.button) && link ? '<a class="select-site" ' + link + '>' + esc(site.button) + '</a>' : '') +
        (call ? '<a class="site-call" href="' + call + '">전화 ' + esc(fmtPhone(site.phone)) + '</a>' : '') +
        '</div></article>';
    }).join('');
    return '<section id="' + esc(sec.id) + '" class="sites-section"><div class="wrap">' +
      headline(ss.label, ss.title, '', '') +
      (cards ? '<div class="site-cards">' + cards + '</div>' : '') +
      '</div></section>';
  }

  function renderBenefits(cfg, ctx, sec) {
    var b = cfg.benefits || {};
    var items = (b.items || []).map(function (it, i) {
      return '<div><b>' + pad2(i + 1) + '</b><h3>' + esc(it.title) + '</h3><p>' + rich(it.text) + '</p></div>';
    }).join('');
    return '<section id="' + esc(sec.id) + '" class="benefits-section"><div class="wrap">' +
      headline(b.label, b.title, '', 'light center') +
      (items ? '<div class="benefit-list">' + items + '</div>' : '') +
      '</div></section>';
  }

  function renderProcess(cfg, ctx, sec) {
    var p = cfg.process || {};
    var steps = (p.steps || []).map(function (st, i) {
      return '<li><b>' + pad2(i + 1) + '</b><strong>' + esc(st.title) + '</strong><span>' + esc(st.text) + '</span></li>';
    }).join('');
    return '<section id="' + esc(sec.id) + '" class="process-section"><div class="wrap">' +
      headline(p.label, p.title, '', 'center') +
      (steps ? '<ol class="process">' + steps + '</ol>' : '') +
      '</div></section>';
  }

  function renderInquiry(cfg, ctx, sec) {
    var q = cfg.inquiry || {}, bt = q.buttons || {}, c = cfg.contact || {}, l = cfg.links || {};
    var phone = fmtPhone(c.phone), mobile = fmtPhone(c.mobile);
    var acts = '';
    function act(cls, hrefAttr, label, sub) {
      if (!hrefAttr || !has(label)) return '';
      return '<a class="' + cls + '" ' + hrefAttr + '>' + esc(label) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</a>';
    }
    acts += act('form', href(l.naverForm), bt.naverForm, '');
    var tel = telHref(c.phone) || telHref(c.mobile);
    acts += act('call', tel ? 'href="' + tel + '"' : '', bt.call, phone || mobile);
    var sms = smsHref(c.sms);
    acts += act('alt', sms ? 'href="' + sms + '"' : '', bt.sms, fmtPhone(c.sms));
    acts += act('alt', href(l.kakao), bt.kakao, '');
    acts += act('alt', href(l.naverTalk), bt.naverTalk, '');
    acts += act('alt', href(l.visit), bt.visit, '');
    if (!acts) acts = '<p class="empty">' + esc(q.emptyText || '') + '</p>';
    var box = '';
    if (phone || mobile || has(q.boxNote)) {
      box = '<div class="contact-box">' + (has(q.boxLabel) ? '<small>' + esc(q.boxLabel) + '</small>' : '') +
        (phone ? '<strong>' + esc(phone) + '</strong>' : '') +
        (mobile ? '<p>휴대폰 ' + esc(mobile) + '</p>' : '') +
        (has(q.boxNote) ? '<p>' + rich(q.boxNote) + '</p>' : '') + '</div>';
    }
    return '<section id="' + esc(sec.id) + '" class="inquiry-section"><div class="wrap inquiry-grid">' +
      '<div class="inquiry-copy">' + (has(q.label) ? '<span>' + esc(q.label) + '</span>' : '') +
      (has(q.title) ? '<h2>' + rich(q.title) + '</h2>' : '') +
      (has(q.desc) ? '<p>' + rich(q.desc) + '</p>' : '') + box + '</div>' +
      '<div class="lead-form contact-actions">' + acts +
      (has(q.note) ? '<p class="note">' + esc(q.note) + '</p>' : '') + '</div>' +
      '</div></section>';
  }

  function renderImages(cfg, ctx, sec, secIndex) {
    var items = (sec.items || []).map(function (it, i) {
      var pic = it.image ? imgHTML(it.image, ctx, '', false, 'sections.' + secIndex + '.items.' + i + '.image') : '';
      if (!pic) return '';
      return '<figure>' + pic + (has(it.caption) ? '<figcaption>' + esc(it.caption) + '</figcaption>' : '') + '</figure>';
    }).join('');
    var head = (has(sec.label) || has(sec.title) || has(sec.desc)) ? headline(sec.label, sec.title, sec.desc, 'center') : '';
    if (!items && !head) return '';
    var wide = !!sec.wide;
    return '<section id="' + esc(sec.id) + '" class="image-section' + (wide ? ' wide' : '') + '">' +
      (head ? '<div class="wrap">' + head + '</div>' : '') +
      (items ? (wide ? '<div class="image-stack">' + items + '</div>'
                     : '<div class="wrap"><div class="image-stack">' + items + '</div></div>') : '') +
      '</section>';
  }

  function renderFooter(cfg) {
    var b = cfg.brand || {}, f = cfg.footer || {}, l = cfg.links || {};
    var links = [['instagram', '인스타그램'], ['blog', '블로그'], ['homepage', '홈페이지']]
      .map(function (p) { var a = href(l[p[0]]); return a ? '<a ' + a + '>' + p[1] + '</a>' : ''; }).join('');
    return '<footer><div class="wrap footer-grid"><div>' +
      '<div class="logo footer-logo">' + (has(b.mark) ? '<span>' + esc(b.mark) + '</span>' : '') +
      '<strong>' + esc(b.name || '') + '</strong></div>' +
      (has(f.desc) ? '<p>' + rich(f.desc) + '</p>' : '') +
      (links ? '<div class="footer-links">' + links + '</div>' : '') +
      (has(f.biz) ? '<p class="footer-biz">' + esc(f.biz) + '</p>' : '') +
      '</div><div>' + (has(f.title2) ? '<b>' + esc(f.title2) + '</b>' : '') +
      (has(f.text2) ? '<p>' + rich(f.text2) + '</p>' : '') + '</div></div></footer>';
  }

  function renderMobileBar(cfg) {
    var m = cfg.mobileBar || {}, c = cfg.contact || {};
    var left = applyHref(cfg);
    var tel = telHref(c.phone) || telHref(c.mobile);
    var a = has(m.left) && left ? '<a ' + left + '>' + esc(m.left) + '</a>' : '';
    var b = has(m.right) && tel ? '<a class="mb-call" href="' + tel + '">' + esc(m.right) + '</a>' : '';
    if (!a && !b) return '';
    return '<div class="mobile-bar' + (a && b ? '' : ' one') + '">' + a + b + '</div>';
  }

  var SECTION = {
    hero: renderHero, summary: renderSummary, sites: renderSites, benefits: renderBenefits,
    process: renderProcess, inquiry: renderInquiry, images: renderImages
  };

  /* 설정 → 홈페이지 본문 HTML
     opts.resolve(img) : 사진 주소를 돌려주는 함수 (기본값: img.src)
     opts.editor       : 편집기 미리보기용 표시를 넣을지 여부 */
  function render(cfg, opts) {
    opts = opts || {};
    var ctx = {
      resolve: opts.resolve || function (img) { return img && img.src ? img.src : ''; },
      editor: !!opts.editor
    };
    var html = renderHeader(cfg, ctx) + '<main id="top">';
    (cfg.sections || []).forEach(function (sec, i) {
      if (sec.visible === false) return;
      var fn = SECTION[sec.type];
      if (fn) html += fn(cfg, ctx, sec, i);
    });
    html += '</main>' + renderFooter(cfg) + renderMobileBar(cfg);
    return html;
  }

  global.SiteRenderer = {
    render: render, fmtPhone: fmtPhone, telHref: telHref, smsHref: smsHref,
    safeUrl: safeUrl, digits: digits, esc: esc
  };
})(window);

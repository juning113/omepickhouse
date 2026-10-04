/* =====================================================================
   script.js (홈페이지용)
   - 화면이 비어 있으면 site-config.js 설정으로 화면을 그립니다.
   - 편집기에서 내보낸 사이트는 이미 화면이 들어 있어서 그대로 둡니다.
   ===================================================================== */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || !window.SITE_CONFIG || !window.SiteRenderer) return;
  if (app.children.length === 0) {
    app.innerHTML = window.SiteRenderer.render(window.SITE_CONFIG);
    var meta = window.SITE_CONFIG.meta || {};
    if (meta.title) document.title = meta.title;
  }
})();

// toc.js — generates the sticky right-rail TOC from h2 / h3 in the article,
// and highlights the section currently in view via IntersectionObserver.

(function () {
  var article = document.querySelector('.post-content');
  var tocEl = document.getElementById('post-toc');
  if (!article || !tocEl) return;

  var heads = article.querySelectorAll('h2, h3');
  if (!heads.length) {
    var aside = tocEl.closest('.post-grid__toc');
    if (aside) aside.style.display = 'none';
    return;
  }

  // Slugify any heading missing an id (kramdown gives ids automatically, but
  // we're defensive).
  function slug(s) {
    return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  }

  var ul = document.createElement('ul');
  Array.prototype.forEach.call(heads, function (h, i) {
    if (!h.id) h.id = slug(h.textContent) || ('h-' + i);
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.dataset.target = h.id;
    if (h.tagName === 'H3') li.style.paddingLeft = '0.75rem';
    li.appendChild(a);
    ul.appendChild(li);
  });
  tocEl.appendChild(ul);

  // Scroll-spy
  var links = tocEl.querySelectorAll('a[data-target]');
  var byId = {};
  links.forEach(function (a) { byId[a.dataset.target] = a; });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var hit = byId[entry.target.id];
        if (hit) hit.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  heads.forEach(function (h) { io.observe(h); });
})();

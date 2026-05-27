// callouts.js — converts kramdown-rendered blockquotes whose first paragraph
// starts with **note**, **warn**, or **tip** into styled .callout blocks.
//
// Authoring pattern in markdown:
//
//   > **note**
//   > A counter without a half-open state isn't a circuit breaker.
//
//   > **warn**
//   > This will silently swallow exceptions.
//
//   > **tip**
//   > Prefer Polly for production — this is a teaching implementation.

(function () {
  var quotes = document.querySelectorAll('.post-content blockquote');
  Array.prototype.forEach.call(quotes, function (bq) {
    var first = bq.firstElementChild;
    if (!first) return;
    var strong = first.firstElementChild;
    if (!strong || strong.tagName !== 'STRONG') return;

    var label = strong.textContent.trim().toLowerCase();
    if (label !== 'note' && label !== 'warn' && label !== 'tip') return;

    // Drop the label node and any leading whitespace text node.
    var sib = strong.nextSibling;
    while (sib && sib.nodeType === Node.TEXT_NODE && !sib.textContent.trim()) {
      var next = sib.nextSibling; sib.remove(); sib = next;
    }
    strong.remove();
    // If the paragraph now starts with " — " or a leading space, trim it.
    if (first.firstChild && first.firstChild.nodeType === Node.TEXT_NODE) {
      first.firstChild.textContent = first.firstChild.textContent.replace(/^[\s\u2013\u2014:—–-]+/, '');
    }

    var div = document.createElement('div');
    div.className = 'callout' + (label === 'note' ? '' : ' ' + label);
    div.dataset.label = label;
    while (bq.firstChild) div.appendChild(bq.firstChild);
    bq.replaceWith(div);
  });
})();

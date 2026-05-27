// theme.js — wires up the toggle button and persists the user's choice.
// The pre-paint bootstrap in <head> already applied any saved preference;
// this just handles the click.

(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;

  function current() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    // No explicit override → derive from system pref.
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // If the system preference changes and the user has no override, follow it.
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', function () {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (saved !== 'dark' && saved !== 'light') {
      document.documentElement.removeAttribute('data-theme');
    }
  });
})();

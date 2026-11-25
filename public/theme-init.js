// Runs synchronously in <head>: apply the remembered theme before first paint.
try {
  var t = localStorage.getItem('gmailPlusTheme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
if (location.hash === '#welcome') document.documentElement.classList.add('welcoming');

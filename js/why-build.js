// "Why Build?": sweep the highlighter across the tagline once it's in view.
(function () {
  const mark = document.querySelector('#why-build mark');
  if (!mark) return;

  if (!('IntersectionObserver' in window)) {
    mark.classList.add('is-highlighted');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        mark.classList.add('is-highlighted');
        observer.disconnect();
      }
    },
    { rootMargin: '0px 0px -20% 0px' }
  );
  observer.observe(mark);
})();

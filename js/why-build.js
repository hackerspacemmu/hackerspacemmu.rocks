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
    // Once it's fully on screen (it sits low while the moon scene is pinned)
    { threshold: 1 }
  );
  observer.observe(mark);
})();

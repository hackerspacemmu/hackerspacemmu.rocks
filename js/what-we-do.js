// "What do we do?" pins while you scroll through it. Each stretch of scroll
// highlights one item and gives the astronaut matching gear and pose.
// Clicking an item scrolls to its stretch, so scroll and clicks stay in sync.
(function () {
  const section = document.getElementById('what-do-we-do');
  if (!section) return;

  const items = [...section.querySelectorAll('.wdwd-item')];
  const astronaut = section.querySelector('.wdwd-spaceman');
  // One per item: Build Projects, Geek Out, Give Feedback.
  const gear = ['hat', 'glasses', 'megaphone'];
  const poses = [
    { tilt: '-20deg', drift: '0px' },
    { tilt: '-8deg', drift: '-16px' },
    { tilt: '-30deg', drift: '8px' },
  ];

  let active = -1;
  let ticking = false;
  // After a click, hold the clicked item while the page scrolls past the
  // others, until the scroll arrives (or a timeout, if the user interrupts).
  let heldIndex = null;
  let holdTimer = null;

  // Matches the CSS: the section only pins on screens at least 700px tall.
  // (A media query is free to check; getComputedStyle on every scroll isn't.)
  const pinnedQuery = window.matchMedia('(min-height: 700px)');
  const isPinned = () => pinnedQuery.matches;

  // How far the page scrolls while the section is pinned.
  const travel = () => section.offsetHeight - window.innerHeight;

  function setActive(index) {
    if (index === active) return;
    active = index;
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
      if (i === index) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    astronaut.dataset.gear = gear[index];
    astronaut.style.setProperty('--tilt', poses[index].tilt);
    astronaut.style.setProperty('--drift', poses[index].drift);
  }

  function release() {
    heldIndex = null;
    clearTimeout(holdTimer);
  }

  function update() {
    ticking = false;
    let index;

    if (isPinned()) {
      const progress = Math.min(
        Math.max(-section.getBoundingClientRect().top / travel(), 0),
        1
      );
      index = Math.min(items.length - 1, Math.floor(progress * items.length));
    } else {
      // Not pinned (short screens): highlight the item nearest the middle.
      const middle = window.innerHeight / 2;
      let closest = 0;
      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const prev = items[closest].getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - middle);
        if (dist < Math.abs(prev.top + prev.height / 2 - middle)) closest = i;
      });
      index = closest;
    }

    if (heldIndex !== null) {
      if (index !== heldIndex) return;
      release();
    }
    setActive(index);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function goTo(index) {
    heldIndex = index;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      release();
      onScroll();
    }, 1500);

    if (isPinned()) {
      // Land in the middle of that item's stretch of scroll.
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const target = sectionTop + (travel() * (index + 0.5)) / items.length;
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setActive(index);
  }

  items.forEach((item, i) => {
    item.addEventListener('click', () => goTo(i));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goTo(i);
      }
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

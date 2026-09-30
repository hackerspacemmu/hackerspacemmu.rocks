// Landing: the moon scene (.moon-scene) pins "Why Build?" across three scroll
// stops: arrive, land, hold. Scrolling on from the arrival stop drops the
// astronaut in from space onto the horizon; once he touches down, a flag
// drops in and plants itself next to him (CSS, triggered by .is-landed).
//
// It's a timed animation rather than following the scroll, so it plays out
// while the page sits on the landing stop. Scrolling back to before the
// arrival stop resets it so it replays next time.
(function () {
  const scene = document.querySelector('.moon-scene');
  const source = document.querySelector('#what-do-we-do .wdwd-spaceman');
  const sourceWrap = document.querySelector('#what-do-we-do .wdwd-astronaut');
  const spot = scene && scene.querySelector('.landing-spot');
  if (!source || !spot) return;

  // A copy of the astronaut from "What do we do?", standing upright with no
  // gear (he's bringing a flag instead). The descent and the touchdown squash
  // animate on top of this resting pose.
  const lander = source.cloneNode(true);
  lander.removeAttribute('style');
  lander.style.transform = 'none';
  lander.dataset.gear = '';
  spot.prepend(lander);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Matches the CSS that turns the scene off (no astronaut / too short to pin).
  // A media query is free to check; reading styles on every scroll isn't.
  const sceneOff = window.matchMedia('(max-width: 991px), (max-height: 699px)');

  // How far past the arrival stop you've scrolled, as a fraction of the gap to
  // the landing stop (half a screen). Land a third of the way there; reset
  // just before the arrival stop (the gap stops it flickering at the edge).
  const ARRIVE = 0.4; // horizon's position on screen when pinned (see CSS)
  const GAP = 0.5;
  const TRIGGER = 0.3;
  const RESET = -0.1;
  const DURATION = 1400;

  let state = 'idle'; // 'idle' | 'landing' | 'landed'
  let descent = null;
  let ticking = false;

  function touchDown() {
    state = 'landed';
    spot.classList.add('is-landed');
  }

  function land() {
    state = 'landing';
    spot.classList.add('is-flying');
    // The floating astronaut can still be peeking in at the top of the screen;
    // hide it so there's only ever one of him.
    sourceWrap.classList.add('is-away');

    if (reducedMotion.matches) {
      touchDown();
      return;
    }

    // Drop in from just above the top of the screen, drifting in from the
    // right and straightening up from a tilt on the way down.
    const to = spot.getBoundingClientRect();
    const fromY = -(to.bottom + 40);
    descent = lander.animate(
      [
        { transform: `translate(80px, ${fromY}px) rotate(-25deg)` },
        { transform: 'none' },
      ],
      { duration: DURATION, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    descent.onfinish = () => {
      descent = null;
      touchDown();
    };
  }

  function reset() {
    state = 'idle';
    if (descent) {
      descent.onfinish = null;
      descent.cancel();
      descent = null;
    }
    spot.classList.remove('is-flying', 'is-landed');
    sourceWrap.classList.remove('is-away');
  }

  function update() {
    ticking = false;

    // The scene doesn't run on smaller or short screens (see CSS).
    if (sceneOff.matches) {
      if (state !== 'idle') reset();
      return;
    }

    const vh = window.innerHeight;
    const scrolled = (ARRIVE * vh - scene.getBoundingClientRect().top) / (GAP * vh);
    if (state === 'idle' && scrolled >= TRIGGER) land();
    else if (state !== 'idle' && scrolled < RESET) reset();
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

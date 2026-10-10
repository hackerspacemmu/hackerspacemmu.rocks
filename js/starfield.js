// Starfield: three depth layers of twinkling stars that drift up as you
// scroll (parallax), lean a little towards the mouse, and the occasional
// shooting star. Draws a single still frame for reduced motion.
//
// With a .site-stars canvas (index.html) it is a fixed backdrop for the whole
// page, driven by page scroll. Otherwise it sits behind "What do we do?"
// (legacy-site.html), driven by scroll through that section, and only
// animates while the section is on screen.
(function () {
  const pageSky = document.querySelector('.site-stars');
  const section = pageSky ? null : document.getElementById('what-do-we-do');
  const canvas = pageSky || (section && section.querySelector('.wdwd-stars'));
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Per layer: star size, scroll parallax speed, mouse lean, star count share.
  const LAYERS = [
    { size: 1, parallax: 0.04, lean: 4, share: 0.55 },
    { size: 2, parallax: 0.09, lean: 9, share: 0.3 },
    { size: 2.5, parallax: 0.16, lean: 16, share: 0.15 },
  ];
  // Colours are set once per star; twinkle only changes globalAlpha, so no
  // new colour strings are built every frame.
  const TINTS = ['#ffffff', '#ffffff', '#b8d0da', '#7f9cc5'];

  let width = 0;
  let height = 0;
  let stars = null;
  let shooting = null;
  let nextShootingAt = 0;
  let mouseX = 0;
  let mouseY = 0;
  let leanX = 0;
  let leanY = 0;
  let running = false;
  let visible = false;
  let frame = null;
  let skyTop = null;

  // Stars live in 0..1 coordinates, so a resize (e.g. a phone's address bar
  // hiding) just rescales them instead of scattering a new sky.
  function createStars(count) {
    stars = [];
    LAYERS.forEach((layer, depth) => {
      for (let i = 0; i < Math.round(count * layer.share); i++) {
        stars.push({
          x: Math.random(),
          y: Math.random(),
          depth,
          alpha: 0.35 + Math.random() * 0.6,
          twinkleSpeed: 0.6 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
          tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        });
      }
    });
    // Group by colour so the draw loop only switches fillStyle a few times.
    stars.sort((a, b) => (a.tint < b.tint ? -1 : a.tint > b.tint ? 1 : 0));
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    // Drawn at 1x even on Retina screens: 1-2px dots look the same, and it's
    // a quarter of the pixels to clear and redraw every frame.
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    if (!stars) createStars(Math.min(240, Math.round((width * height) / 5500)));
    draw(performance.now());
  }

  function wrap(value, max) {
    return ((value % max) + max) % max;
  }

  function spawnShootingStar(now) {
    const fromLeft = Math.random() < 0.5;
    shooting = {
      start: now,
      duration: 900 + Math.random() * 500,
      x: width * (fromLeft ? 0.1 + Math.random() * 0.4 : 0.5 + Math.random() * 0.4),
      y: height * Math.random() * 0.4,
      dx: (fromLeft ? 1 : -1) * (width * 0.35),
      dy: height * 0.3,
    };
    nextShootingAt = now + 4000 + Math.random() * 6000;
  }

  function drawShootingStar(now) {
    const t = (now - shooting.start) / shooting.duration;
    if (t >= 1) {
      shooting = null;
      return;
    }
    const eased = 1 - Math.pow(1 - t, 3);
    const headX = shooting.x + shooting.dx * eased;
    const headY = shooting.y + shooting.dy * eased;
    const tail = 0.18;
    const tailX = headX - shooting.dx * tail;
    const tailY = headY - shooting.dy * tail;
    const fade = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;

    const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
    gradient.addColorStop(0, 'rgba(184, 208, 218, 0)');
    gradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * fade})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
  }

  function draw(now) {
    // The first resize creates the stars; a frame can land before it.
    if (!stars) return;
    const seconds = now / 1000;
    const still = reducedMotion.matches;
    // How far down the page (or into the section) we've scrolled drives the
    // parallax.
    let scrolled = window.scrollY;
    if (section) {
      const sectionTop = section.getBoundingClientRect().top;
      scrolled = -sectionTop;

      // Keep the fade-in mask (CSS) on the section's top edge: it rides along
      // with the canvas until the pin sticks, then scrolls up out of view.
      const top = Math.round(sectionTop - canvas.getBoundingClientRect().top);
      if (top !== skyTop) {
        skyTop = top;
        canvas.style.setProperty('--sky-top', `${top}px`);
      }
    }
    leanX += (mouseX - leanX) * 0.05;
    leanY += (mouseY - leanY) * 0.05;

    ctx.clearRect(0, 0, width, height);

    let tint = null;
    for (const star of stars) {
      const layer = LAYERS[star.depth];
      const x = wrap(star.x * width + leanX * layer.lean, width);
      const y = wrap(star.y * height - scrolled * layer.parallax + leanY * layer.lean, height);
      const twinkle = still
        ? 1
        : 0.55 + 0.45 * Math.sin(seconds * star.twinkleSpeed + star.phase);

      if (star.tint !== tint) {
        tint = star.tint;
        ctx.fillStyle = tint;
      }
      ctx.globalAlpha = star.alpha * twinkle;
      // Tiny squares are much cheaper than arcs and look the same at 1-2px.
      ctx.fillRect(x, y, layer.size, layer.size);
    }
    ctx.globalAlpha = 1;

    if (!still) {
      if (!shooting && now >= nextShootingAt) spawnShootingStar(now);
      if (shooting) drawShootingStar(now);
    }
  }

  function loop(now) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reducedMotion.matches) return;
    running = true;
    nextShootingAt = performance.now() + 1500;
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  // Mouse position as -1..1 from the centre of the screen.
  window.addEventListener(
    'mousemove',
    (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  // With reduced motion there's no loop, so redraw the still frame on scroll.
  window.addEventListener(
    'scroll',
    () => {
      if (visible && !running) draw(performance.now());
    },
    { passive: true }
  );

  new ResizeObserver(resize).observe(canvas);

  if (section) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else stop();
    }).observe(section);
  } else {
    // The page backdrop is always on screen.
    visible = true;
    start();
  }

  reducedMotion.addEventListener('change', () => {
    stop();
    if (!reducedMotion.matches && visible) start();
    else draw(performance.now());
  });
})();

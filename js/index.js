// index.html: nav, hero, stats, legacy, events and join.
(function () {
  const nav = document.querySelector('.site-nav');
  const toggle = nav.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  // picking a section from the mobile menu closes it
  nav.querySelector('.nav-links').addEventListener('click', (e) => {
    if (!e.target.closest('a')) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });

  // Sections size themselves to the viewport minus the sticky nav.
  new ResizeObserver(([entry]) => {
    const h = entry.borderBoxSize[0].blockSize;
    document.documentElement.style.setProperty('--nav-h', `${h}px`);
  }).observe(nav);

  // Reveal each photo on its own schedule, but never before its tile has
  // animated in — late-loading images reveal as soon as they arrive.
  const start = performance.now();
  document.querySelectorAll('.frame img').forEach((img) => {
    const tile = img.closest('.tile');
    const i = Number(tile.style.getPropertyValue('--i'));
    const revealAt = 450 + i * 90;

    const reveal = () => {
      const wait = Math.max(0, revealAt - (performance.now() - start));
      tile.style.setProperty('--reveal-delay', `${wait}ms`);
      tile.classList.add('is-loaded');
    };

    img
      .decode()
      .catch(() => {})
      .then(reveal);
  });

  // ---------- STATS ----------

  const stats = document.querySelector('.stats');
  const counters = [...stats.querySelectorAll('.count')];
  const COUNT_MS = 1100;
  // a cold-starting API shouldn't hold up the count-up; past this we
  // count to the numbers baked into the markup instead
  const API_WAIT_MS = 2500;

  // Days active is derived from the founding date, same as index.html.
  counters.forEach((el) => {
    if (el.dataset.since) {
      const ms = Date.now() - new Date(el.dataset.since);
      el.dataset.count = Math.ceil(ms / (24 * 60 * 60 * 1000));
    }
  });

  // Write the final numbers and let the tiles size their text to them.
  const showFinal = () => {
    counters.forEach((el) => (el.textContent = el.dataset.count));
    counters.forEach((el) => {
      const style = getComputedStyle(el);
      const em = parseFloat(style.width) / parseFloat(style.fontSize);
      el.closest('.stat-text').style.setProperty('--count-em', em);
    });
  };
  showFinal();

  // Members, meetups and updates come from the same API as index.html.
  // Values that land after the count-up has started are dropped.
  let countStarted = false;
  const liveCounts = Promise.all(
    counters
      .filter((el) => el.dataset.endpoint)
      .map((el) =>
        fetch(`${CONFIG.API_BASE_URL}/api/v1/${el.dataset.endpoint}/count`)
          .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
          .then(({ total }) => {
            if (!countStarted && Number.isFinite(total)) {
              el.dataset.count = total;
            }
          })
          .catch((err) => console.error(err)),
      ),
  );

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const i = Number(el.closest('.stat').style.getPropertyValue('--i'));

    // Lock the box to the final number's width (in em, so it survives a
    // resize) so the surrounding text doesn't shuffle as digits change.
    // Computed width is the untransformed layout width; the tile is still
    // mid scale-in here, so getBoundingClientRect() would come up short.
    const style = getComputedStyle(el);
    el.style.width = `${parseFloat(style.width) / parseFloat(style.fontSize)}em`;
    el.textContent = '0';

    setTimeout(
      () => {
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / COUNT_MS);
          const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t); // ease-out expo
          el.textContent = Math.round(target * eased);
          if (t < 1) requestAnimationFrame(tick);
          else el.style.width = '';
        };
        requestAnimationFrame(tick);
      },
      150 + i * 90,
    );
  };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Scroll reveal shared by the sections below: hides `section`'s
  // content (.is-armed) and shows it (.is-in) as soon as `target`
  // comes within 10% of a screen of the bottom edge, so it's already
  // moving as it scrolls in, even on a fast scroll. If `target` comes
  // in from the top instead (you scrolled past it and came back), it
  // appears at once rather than animating. Returns false when there's
  // no animation (reduced motion / no IntersectionObserver).
  const reveal = (section, target, onIn) => {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      return false;
    }
    section.classList.add('is-armed');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (entry.boundingClientRect.top < 0) {
          section.classList.add('is-instant');
          section.classList.add('is-in');
          section.offsetHeight; // apply the end state without transitions
          section.classList.remove('is-instant');
        } else {
          section.classList.add('is-in');
        }
        if (onIn) onIn();
      },
      { rootMargin: '0px 0px 10% 0px' },
    );
    io.observe(target);
    return true;
  };

  const statsArmed = reveal(stats, stats.querySelector('.stats-grid'), () => {
    // measure final widths only once the display font and the live
    // numbers are in
    const apiWait = new Promise((r) => setTimeout(r, API_WAIT_MS));
    Promise.all([
      document.fonts.ready,
      Promise.race([liveCounts, apiWait]),
    ]).then(() => {
      countStarted = true;
      showFinal();
      counters.forEach(countUp);
    });
  });
  if (statsArmed) {
    counters.forEach((el) => (el.textContent = '0'));
  } else {
    liveCounts.then(showFinal);
  }

  // ---------- LEGACY ----------

  const legacy = document.querySelector('.legacy');
  const reel = legacy.querySelector('.reel');
  const track = reel.querySelector('.reel-track');
  const cards = [...track.children];
  const nowLabel = legacy.querySelector('.timeline-now');
  const pauseBtn = legacy.querySelector('.timeline-pause');

  const DRIFT = 60; // px per second
  const LOOP_DRIFT = 0.5; // share of DRIFT while the rocket jumps back
  const IDLE_MS = 1000; // how long drift waits after the user takes over
  const GLIDE_MS = 900;

  const accentFor = (year) => `var(--legacy-${year % 2 ? 'blue' : 'red'})`;
  cards.forEach((card) =>
    card.style.setProperty('--accent', accentFor(card.dataset.year)),
  );

  // One tick per year, built from the cards, so adding a year only means
  // adding a card.
  const years = [...new Set(cards.map((card) => card.dataset.year))];
  const ticks = years.map((year) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tick';
    btn.setAttribute('aria-label', `Show ${year}`);
    btn.addEventListener('click', () => goTo(year));
    li.append(btn);
    legacy.querySelector('.timeline-ticks').append(li);
    return btn;
  });
  const [firstEnd, lastEnd] = legacy.querySelectorAll(
    '.timeline-ends span',
  );
  firstEnd.textContent = years[0];
  lastEnd.textContent = years.at(-1);

  const rail = legacy.querySelector('.timeline-rail');
  const rocket = rail.querySelector('.timeline-rocket');
  const trail = rail.querySelector('.timeline-trail');
  const yearOf = cards.map((card) => years.indexOf(card.dataset.year));
  const LEVEL = 31.7; // the artwork climbs at ~32°; this turns it to face right
  let tickX = [];
  // rail x of the invisible portals just outside the first and last
  // years: the rocket flies into the right one and out of the left one
  let portalL = 0;
  let portalR = 0;

  // The track holds the real cards followed by enough inert copies to
  // cover the viewport, so wrapping the offset by one set's width is
  // seamless.
  let setW = 0;
  let lefts = [];

  const measure = () => {
    track.querySelectorAll('[data-clone]').forEach((node) => node.remove());
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const first = cards[0];
    const last = cards.at(-1);
    const oldW = setW;
    setW = last.offsetLeft + last.offsetWidth + gap - first.offsetLeft;
    lefts = cards.map((card) => card.offsetLeft - first.offsetLeft);

    tickX = ticks.map((tick) => tick.offsetLeft + tick.offsetWidth / 2);
    trail.style.left = `${tickX[0]}px`;
    // Clip the flight lane at the portals so the rocket vanishes into
    // one and appears out of the other, with room either side for it to
    // sit on the first and last years.
    const lane = rail.querySelector('.timeline-flight');
    const tilt = (LEVEL * Math.PI) / 180;
    const halfW =
      (rocket.offsetWidth * Math.cos(tilt) +
        rocket.offsetHeight * Math.sin(tilt)) /
        2 +
      4;
    portalL = tickX[0] - halfW;
    portalR = tickX.at(-1) + halfW;
    lane.style.clipPath = `inset(-100px ${lane.offsetWidth - portalR}px -100px ${portalL}px)`;
    trail.style.width = `${tickX.at(-1) - tickX[0]}px`;

    const copies = Math.ceil(reel.clientWidth / setW);
    for (let n = 0; n < copies; n++) {
      cards.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.dataset.clone = '';
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        track.append(clone);
      });
    }
    if (oldW) x = (x / oldW) * setW;
  };

  let x = 0; // track offset in px; may run past setW, wrapped on render
  let glide = null;
  let drag = null;
  let scrub = null; // dragging the rocket along the timeline
  let hovered = false;
  let paused = reduceMotion.matches;
  let holdUntil = 0;
  let visible = false;
  let running = false;
  let lastFrame = 0;
  let activeYear = null;

  const wrap = (v) => ((v % setW) + setW) % setW;
  // signed shortest distance from a to b around the loop
  const loopDelta = (a, b) => wrap(b - a + setW / 2) - setW / 2;
  const easeInOut = (t) =>
    t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

  const setActive = (pos) => {
    // the card whose left edge sits closest to the intro's left edge
    const dist = (i) => Math.abs(loopDelta(pos, lefts[i]));
    let best = 0;
    lefts.forEach((_, i) => {
      if (dist(i) < dist(best)) best = i;
    });
    const year = cards[best].dataset.year;
    if (year === activeYear) return;
    activeYear = year;
    nowLabel.textContent = year;
    legacy.style.setProperty('--now-accent', accentFor(year));
    ticks.forEach((tick, i) =>
      tick.setAttribute('aria-current', String(years[i] === year)),
    );
  };

  // The rocket is driven by the reel's position rather than a clock, so
  // dragging backwards (or pausing mid-launch) just works.
  const fly = (pos) => {
    let i = lefts.length - 1;
    while (i > 0 && lefts[i] > pos) i--;
    const next = lefts[i + 1] ?? setW;
    const frac = (pos - lefts[i]) / (next - lefts[i]);
    const start = tickX[0];
    const end = tickX.at(-1);

    let rx;
    let trailAlpha = 1;

    if (i < lefts.length - 1) {
      // cruising between two years
      const a = tickX[yearOf[i]];
      const b = tickX[yearOf[i + 1]];
      rx = a + (b - a) * frac;
    } else if (frac < 0.5) {
      // past the last year: speed up straight through the right portal,
      // the trail fading behind it
      const t = frac / 0.5;
      rx = end + (portalR + (portalR - end) - end) * t * t;
      trailAlpha = 1 - t;
    } else {
      // out of the left portal, easing onto the first year
      const t = (frac - 0.5) / 0.5;
      const from = portalL - (start - portalL);
      rx = from + (start - from) * (1 - (1 - t) ** 2);
      trailAlpha = 0;
    }

    rocket.style.transform = `translate(${rx}px, 0) translate(-50%, -50%) rotate(${LEVEL}deg)`;
    trail.style.transform = `scaleX(${Math.max(0, Math.min(rx, end) - start) / (end - start)})`;
    trail.style.opacity = trailAlpha;
    ticks.forEach((tick, j) =>
      tick.classList.toggle(
        'is-passed',
        trailAlpha > 0 && tickX[j] <= rx + 0.5,
      ),
    );
  };

  const render = () => {
    const pos = wrap(x);
    track.style.transform = `translate3d(${-pos}px, 0, 0)`;
    setActive(pos);
    fly(pos);
  };

  const frame = (now) => {
    const dt = Math.min(64, now - lastFrame) / 1000;
    lastFrame = now;

    if (glide) {
      const t = Math.min(1, (now - glide.start) / glide.dur);
      x = glide.from + (glide.to - glide.from) * easeInOut(t);
      if (t === 1) glide = null;
    } else if (!drag && !scrub && !paused && !hovered && now > holdUntil) {
      // slower while the rocket goes through the portals, so the jump
      // back to the start isn't rushed
      const loop = wrap(x) > lefts.at(-1) ? LOOP_DRIFT : 1;
      x = wrap(x) + DRIFT * loop * dt;
    }

    render();
    if (visible) requestAnimationFrame(frame);
    else running = false;
  };

  const run = () => {
    if (running || !visible) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  };

  const hold = () => (holdUntil = performance.now() + IDLE_MS);

  const goTo = (year) => {
    const pos = wrap(x);
    const target = lefts[cards.findIndex((c) => c.dataset.year === year)];
    // Fly straight along the rail; only carry on round the loop when
    // already through the portal and heading back to the start.
    let d = target - pos;
    if (pos > lefts.at(-1) && Math.abs(d + setW) < Math.abs(d)) d += setW;
    glide = {
      from: pos,
      to: pos + d,
      start: performance.now(),
      dur: reduceMotion.matches ? 1 : GLIDE_MS,
    };
    holdUntil = glide.start + GLIDE_MS + IDLE_MS;
    run();
  };

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    legacy.classList.toggle('is-paused', paused);
    pauseBtn.setAttribute(
      'aria-label',
      paused ? 'Play slideshow' : 'Pause slideshow',
    );
  });
  legacy.classList.toggle('is-paused', paused);
  if (paused) pauseBtn.setAttribute('aria-label', 'Play slideshow');

  reel.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') hovered = true;
  });
  reel.addEventListener('pointerleave', () => (hovered = false));

  // The reverse of fly()'s cruising stretch: a point on the rail → the
  // reel position that puts the rocket there. Cards sharing a year have
  // no rail between them, so they're skipped over.
  const posAt = (px) => {
    if (px <= tickX[0]) return 0;
    for (let i = 0; i < lefts.length - 1; i++) {
      const a = tickX[yearOf[i]];
      const b = tickX[yearOf[i + 1]];
      if (b > a && px <= b) {
        return lefts[i] + ((px - a) / (b - a)) * (lefts[i + 1] - lefts[i]);
      }
    }
    return lefts.at(-1);
  };

  // Grab the rocket (or anywhere on the rail) and drag to scrub through
  // the years; the reel follows. Letting go settles on the nearest card.
  // A plain tap on a tick is left to its click handler.
  let scrubbed = false;
  const railX = (e) => e.clientX - rail.getBoundingClientRect().left;

  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const at = railX(e);
    const box = rocket.getBoundingClientRect();
    const rx = (box.left + box.right) / 2 - rail.getBoundingClientRect().left;
    // grabbing the rocket itself keeps it under the finger instead of
    // jumping its centre to the pointer
    const onRocket = Math.abs(rx - at) < box.width / 2;
    scrub = {
      id: e.pointerId,
      startX: e.clientX,
      offset: onRocket ? rx - at : 0,
      moved: false,
    };
    scrubbed = false;
  });

  rail.addEventListener('pointermove', (e) => {
    if (!scrub || e.pointerId !== scrub.id) return;
    if (!scrub.moved) {
      if (Math.abs(e.clientX - scrub.startX) <= 4) return;
      scrub.moved = true;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add('is-scrubbing');
      glide = null;
    }
    x = posAt(railX(e) + scrub.offset);
    run();
  });

  const endScrub = (e) => {
    if (!scrub || e.pointerId !== scrub.id) return;
    const { moved } = scrub;
    scrub = null;
    if (!moved) return;
    scrubbed = true;
    rail.classList.remove('is-scrubbing');
    const pos = wrap(x);
    const nearest = lefts.reduce((best, left) =>
      Math.abs(left - pos) < Math.abs(best - pos) ? left : best,
    );
    glide = {
      from: pos,
      to: nearest,
      start: performance.now(),
      dur: reduceMotion.matches ? 1 : 400,
    };
    holdUntil = glide.start + 400 + IDLE_MS;
    run();
  };
  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', endScrub);
  // Firefox ignores -webkit-user-drag and starts a native image drag,
  // which cancels the pointer stream mid-scrub
  rail.addEventListener('dragstart', (e) => e.preventDefault());
  // a drag that ends over a tick shouldn't also count as clicking it
  rail.addEventListener(
    'click',
    (e) => {
      if (!scrubbed) return;
      scrubbed = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );

  // Drag / swipe to scrub. touch-action: pan-y leaves vertical page
  // scrolling to the browser.
  reel.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, from: x, moved: false };
    glide = null;
  });

  reel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      reel.setPointerCapture(e.pointerId);
      reel.classList.add('is-dragging');
    }
    if (drag.moved) x = drag.from - dx;
  });

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    reel.classList.remove('is-dragging');
    hold();
  };
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);

  // horizontal trackpad / shift-wheel scrolling
  reel.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      glide = null;
      x += e.deltaX;
      hold();
    },
    { passive: false },
  );

  measure();
  render();
  const resizer = new ResizeObserver(() => {
    measure();
    render();
  });
  resizer.observe(reel);
  resizer.observe(rail);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    run();
  }).observe(reel);

  reveal(legacy, legacy);

  // ---------- EVENTS ----------

  const events = document.querySelector('.events');
  const eventItems = [...events.querySelectorAll('.event')];
  const eventToggles = eventItems.map((li) =>
    li.querySelector('.event-toggle'),
  );
  // same query as the CSS breakpoint where the panels stack
  const eventsStacked = matchMedia(
    '(max-width: 1023px), (max-width: 1180px) and (orientation: portrait)',
  );

  const openEvent = (i) => {
    eventItems.forEach((li, j) => {
      const isOpen = i === j;
      li.classList.toggle('is-open', isOpen);
      eventToggles[j].setAttribute('aria-expanded', String(isOpen));
      li.querySelector('.event-body').setAttribute(
        'aria-hidden',
        String(!isOpen),
      );
    });
  };
  openEvent(0);

  eventToggles.forEach((btn, i) => {
    btn.addEventListener('click', () => openEvent(i));
    btn.addEventListener('keydown', (e) => {
      const last = eventToggles.length - 1;
      const to = {
        ArrowRight: Math.min(last, i + 1),
        ArrowLeft: Math.max(0, i - 1),
        Home: 0,
        End: last,
      }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      eventToggles[to].focus();
      openEvent(to);
    });
  });

  // Sweeping the mouse along the row opens whichever panel it settles
  // on. Stacked panels only open on tap, or the page would jump around
  // under the pointer.
  let hoverTimer = 0;
  eventItems.forEach((li, i) => {
    li.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || eventsStacked.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => openEvent(i), 60);
    });
    li.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  });

  // Meetups run on Malaysian time, so work the next one out in that
  // timezone whatever the visitor's clock says.
  const nextMeetup = events.querySelector('.next-meetup');
  const kl = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  const klDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    kl.weekday,
  );
  const klHour = Number(kl.hour);
  const MEETUP_DAY = 2; // Tuesday
  const daysAway =
    klDay === MEETUP_DAY && klHour < 22 ? 0 : (MEETUP_DAY - klDay + 7) % 7 || 7;
  const meetupDate = new Date(
    Date.UTC(Number(kl.year), kl.month - 1, Number(kl.day) + daysAway),
  );

  if (daysAway === 0 && klHour >= 20) {
    nextMeetup.querySelector('.next-label span').textContent =
      'Weekly meetup';
    nextMeetup.querySelector('.next-date').textContent = 'On now';
  } else {
    // always a Tuesday, so the weekday is left off to keep the pill on
    // one line on phones
    nextMeetup.querySelector('.next-date').textContent =
      daysAway === 0
        ? 'Tonight'
        : daysAway === 1
          ? 'Tomorrow'
          : meetupDate.toLocaleDateString('en-GB', {
              timeZone: 'UTC',
              day: 'numeric',
              month: 'short',
            });
  }

  reveal(events, events.querySelector('.events-list'));

  // ---------- JOIN ----------

  const join = document.querySelector('.join');
  const joinForm = join.querySelector('.join-form');
  const joinEmail = joinForm.querySelector('#mmuEmail');
  const joinError = joinForm.querySelector('.join-error');
  // student.mmu.edu.my, mmu.edu.my and any other MMU subdomain
  const MMU_EMAIL = /^[^\s@]+@(?:[a-z0-9-]+\.)*mmu\.edu\.my$/i;

  const setJoinError = (message) => {
    joinError.textContent = message;
    joinEmail.setAttribute('aria-invalid', String(Boolean(message)));
  };

  joinForm.addEventListener('submit', (e) => {
    const value = joinEmail.value.trim();
    const message = !value
      ? 'Enter your MMU email first.'
      : MMU_EMAIL.test(value)
        ? ''
        : 'That isn’t an MMU address. It should end in mmu.edu.my.';
    setJoinError(message);
    if (message) {
      e.preventDefault();
      joinEmail.focus();
    }
  });

  // clear the complaint as soon as they start fixing it
  joinEmail.addEventListener('input', () => {
    if (joinError.textContent) setJoinError('');
  });

  const qrDialog = join.querySelector('.qr-dialog');
  const openQr = () => qrDialog.showModal();
  join.querySelector('.qr-enlarge').addEventListener('click', openQr);
  join.querySelector('.join-qr .qr-card').addEventListener('click', openQr);
  // a click anywhere, the Close button included, dismisses it
  qrDialog.addEventListener('click', () => qrDialog.close());
})();

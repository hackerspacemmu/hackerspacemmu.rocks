const width = window.innerWidth;
let valueToSubtract;

if (width >= 1024) {
  valueToSubtract = 200;
} else {
  valueToSubtract = 100;
}

const flightPath = {
  curviness: 1.25,
  autoRotate: true,
  values: [
    { x: 100, y: -20 },
    { x: 300, y: 10 },
    { x: 500, y: 100 },
    { x: 750, y: -100 },
    { x: window.innerWidth - valueToSubtract, y: -250 },
  ],
};

// Tweenlinelite Part
const tween = new TimelineLite();

tween.add(
  /**
   * Parameters
   *
   * @object_to_animate
   * @duration_sec
   * @property_to_animate
   */
  TweenLite.to('.rocket', 1, {
    bezier: flightPath,
    ease: Power1.easeInOut,
  }),
);

// ScrollMagic Part
const controller = new ScrollMagic.Controller();

const scene = new ScrollMagic.Scene({
  triggerElement: '.animation', //trigger the animation when browser hit .animation class
  duration: 3000, //duration of animation, 1000 == 1 second
  triggerHook: 0, //position of the trigger's hook
})
  .setTween(tween) //ScrollMagic's GSAP plugin helping this
  // .addIndicators() //help us visualize what's going on
  .setPin('.animation') //"stick" at the animation part until the animation ends
  .addTo(controller);

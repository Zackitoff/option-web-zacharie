gsap.registerPlugin(ScrollTrigger);

const moinsDeMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!moinsDeMouvement) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.epingle',
      start: 'top top',
      end: 'bottom bottom',
      pin: '.epingle__cadre',
      scrub: 0.5
    }
  });

  tl.from('.epingle__image', {
    scale: 1.2,
    opacity: 0.35,
    duration: 1
  }).from('.epingle__legende', {
    opacity: 0,
    y: 28,
    duration: 0.5
  });
}

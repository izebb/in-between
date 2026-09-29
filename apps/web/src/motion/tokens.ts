// GENERATED from src/motion/tokens.json by scripts/build-tokens.mjs. Do not edit by hand.

export const duration = {"instant":90,"quick":180,"base":280,"scene":480} as const;
export const exitDuration = {"instant":63,"quick":126,"base":196,"scene":336} as const;
export const exitRatio = 0.7;
export const easing = {"out":[0.2,0.8,0.2,1],"in":[0.4,0,1,1],"inout":[0.65,0,0.35,1]} as const;
export const easingCss = {"out":"cubic-bezier(0.2, 0.8, 0.2, 1)","in":"cubic-bezier(0.4, 0, 1, 1)","inout":"cubic-bezier(0.65, 0, 0.35, 1)"} as const;
export const spring = {
  "snappy": {
    "response": 0.3,
    "bounce": 0,
    "use": "direct manipulation",
    "stiffness": 438.6490844928604,
    "damping": 41.88790204786391,
    "mass": 1,
    "linear": "linear(0, 0.0046 1%, 0.0173 2%, 0.044 3.33%, 0.0793 4.67%, 0.1097 5.67%, 0.154 7%, 0.3698 13%, 0.4605 15.67%, 0.5132 17.33%, 0.5623 19%, 0.6415 22%, 0.6804 23.67%, 0.7158 25.33%, 0.7478 27%, 0.7766 28.67%, 0.8025 30.33%, 0.8301 32.33%, 0.8717 36%, 0.9087 40.33%, 0.9372 45%, 0.9595 50.33%, 0.9761 56.67%, 0.9868 63.67%, 0.9936 72%, 1)",
    "duration": 474
  },
  "soft": {
    "response": 0.5,
    "bounce": 0.15,
    "use": "playful confirmations",
    "stiffness": 157.91367041742973,
    "damping": 21.362830044410593,
    "mass": 1,
    "linear": "linear(0, 0.004 1%, 0.0201 2.33%, 0.0464 3.67%, 0.09 5.33%, 0.1313 6.67%, 0.1882 8.33%, 0.4092 14.33%, 0.5141 17.33%, 0.5681 19%, 0.6187 20.67%, 0.6655 22.33%, 0.7001 23.67%, 0.7323 25%, 0.7691 26.67%, 0.8023 28.33%, 0.8319 30%, 0.8582 31.67%, 0.8813 33.33%, 0.9193 36.67%, 0.9502 40.33%, 0.9734 44.33%, 0.9904 49%, 1.0008 54.33%, 1.005 59.33%, 1.0063 65.67%, 1)",
    "duration": 727
  }
} as const;
export const distance = {"rise":4,"nudge":8,"travel":24} as const;
export const stagger = {"step":30} as const;
export const color = {"paper":{"light":"#F5F3EE","dark":"#0E0F11"},"paper-raised":{"light":"#FAF9F5","dark":"#15161A"},"ink":{"light":"#16161A","dark":"#ECEAE4"},"graphite":{"light":"#8A8880","dark":"#6B6A66"},"graphite-strong":{"light":"#5E5C56","dark":"#9A9892"},"rule":{"light":"#E2DED5","dark":"#1F2024"},"blue-pencil":{"light":"#3D6BFF","dark":"#7C9BFF"},"red-pencil":{"light":"#FF3B1F","dark":"#FF5A3C"},"glow":{"light":"rgba(255,248,230,0)","dark":"rgba(255,248,230,.06)"}} as const;
export const usage = {"duration":{"instant":"press states, toggles","quick":"hovers, small reveals","base":"panels, cards","scene":"page and chapter transitions"},"easing":{"out":"enter","in":"exit (exits are faster: ~0.7× enter)","inout":"on-screen moves"},"spring":{"snappy":"direct manipulation","soft":"playful confirmations"},"distance":{"rise":"page cut, figure reveal","nudge":"small enters: tooltips, menus","travel":"panels arriving from an edge"}} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;

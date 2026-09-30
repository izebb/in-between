// GENERATED from src/motion/tokens.json by scripts/build-tokens.mjs. Do not edit by hand.

export const duration = {"instant":90,"quick":180,"base":280,"scene":480} as const;
export const exitDuration = {"instant":63,"quick":126,"base":196,"scene":336} as const;
export const exitRatio = 0.7;
export const easing = {"out":[0.2,0.8,0.2,1],"in":[0.4,0,1,1],"inout":[0.65,0,0.35,1],"reveal":[0.16,1,0.3,1]} as const;
export const easingCss = {"out":"cubic-bezier(0.2, 0.8, 0.2, 1)","in":"cubic-bezier(0.4, 0, 1, 1)","inout":"cubic-bezier(0.65, 0, 0.35, 1)","reveal":"cubic-bezier(0.16, 1, 0.3, 1)"} as const;
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
export const color = {"paper":{"light":"#F5F3EE","dark":"#0E0F11"},"paper-raised":{"light":"#FAF9F5","dark":"#15161A"},"paper-float":{"light":"#FEFDFA","dark":"#1C1D22"},"ink":{"light":"#16161A","dark":"#ECEAE4"},"graphite":{"light":"#8A8880","dark":"#6B6A66"},"graphite-strong":{"light":"#5E5C56","dark":"#9A9892"},"rule":{"light":"#E2DED5","dark":"#1F2024"},"blue-pencil":{"light":"#3D6BFF","dark":"#7C9BFF"},"red-pencil":{"light":"#FF3B1F","dark":"#FF5A3C"},"glow":{"light":"rgba(255,248,230,0)","dark":"rgba(255,248,230,.06)"}} as const;
/** Each theme's name, type and a swatch of its colours in each mode (paper, ink, the two pencils). */
export const themes = [
  {
    "id": "pencil",
    "name": "Pencil",
    "fonts": "Geist + Geist Mono",
    "note": "Paper and ink; a blue pencil for what could be, a red one for what is.",
    "display": "\"Geist Variable\", \"Geist\", \"Helvetica Neue\", Arial, sans-serif",
    "light": {
      "paper": "#F5F3EE",
      "ink": "#16161A",
      "blue": "#3D6BFF",
      "red": "#FF3B1F"
    },
    "dark": {
      "paper": "#0E0F11",
      "ink": "#ECEAE4",
      "blue": "#7C9BFF",
      "red": "#FF5A3C"
    }
  },
  {
    "id": "glassy",
    "name": "Glassy",
    "fonts": "Sora + Manrope",
    "note": "Frosted panels over soft colour. Round, light and quiet.",
    "display": "\"Sora Variable\", \"Sora\", system-ui, sans-serif",
    "light": {
      "paper": "linear-gradient(135deg, #C3CEFF, #FFCFE0 55%, #C8F5E6)",
      "ink": "#1B1D29",
      "blue": "#5B68F5",
      "red": "#F2457E"
    },
    "dark": {
      "paper": "linear-gradient(135deg, #3B2A8A, #6B1E4F 55%, #0E5A6B)",
      "ink": "#EEF0FA",
      "blue": "#8F9BFF",
      "red": "#FF7AA8"
    }
  },
  {
    "id": "mono",
    "name": "Mono",
    "fonts": "JetBrains Mono",
    "note": "Your editor: mono type, syntax colour, square corners.",
    "display": "\"JetBrains Mono Variable\", \"JetBrains Mono\", ui-monospace, monospace",
    "light": {
      "paper": "#FFFFFF",
      "ink": "#1F2328",
      "blue": "#0969DA",
      "red": "#CF222E"
    },
    "dark": {
      "paper": "#0D1117",
      "ink": "#E6EDF3",
      "blue": "#58A6FF",
      "red": "#FF7B72"
    }
  },
  {
    "id": "cartoon",
    "name": "Cartoon",
    "fonts": "Fredoka + Nunito",
    "note": "Thick outlines, bold colour, a friendly round hand.",
    "display": "\"Fredoka Variable\", \"Fredoka\", system-ui, sans-serif",
    "light": {
      "paper": "#FFF4D6",
      "ink": "#1D1B2E",
      "blue": "#3D7BFF",
      "red": "#FF4F6D"
    },
    "dark": {
      "paper": "#241C45",
      "ink": "#FFF4D6",
      "blue": "#7FA8FF",
      "red": "#FF6B85"
    }
  }
] as const;
export type ThemeId = (typeof themes)[number]["id"];
export const usage = {"duration":{"instant":"press states, toggles","quick":"hovers, small reveals","base":"panels, cards","scene":"page and chapter transitions"},"easing":{"out":"enter","in":"exit (exits are faster: ~0.7× enter)","inout":"on-screen moves","reveal":"masked text reveals (expo-out): lines rising out of a mask"},"spring":{"snappy":"direct manipulation","soft":"playful confirmations"},"distance":{"rise":"page cut, figure reveal","nudge":"small enters: tooltips, menus","travel":"panels arriving from an edge"}} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;

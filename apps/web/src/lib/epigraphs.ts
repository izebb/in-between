/**
 * The home page's epigraphs (components/ui/Epigraph.astro): what animators have said about the craft,
 * shown one at a time, each with its author drawn in pencil. The set runs from what animation is, to
 * the craft (timing and spacing), to manner, to feeling, and ends on a warm, wry line.
 *
 * Each quote's `source` says how well it is documented; those marked as attributed have not been checked against a primary source. Portraits live in public/images/, traced from
 * freely licensed photographs into pencil hatching on paper; `photo` credits the photograph, and the
 * home page's footer lists them all (Footer.astro). Drawings made from share-alike photographs are
 * shared under the same licence.
 */
export interface Epigraph {
  quote: string;
  name: string;
  /** One line under the name: role · known for · years. */
  role: string;
  /** Where the quote comes from. */
  source: string;
  portrait: string;
  photo: { by: string; license: string; licenseUrl: string; page: string };
}

export const epigraphs: Epigraph[] = [
  {
    quote: "Animation is not the art of drawings that move, but the art of movements that are drawn.",
    name: "Norman McLaren",
    role: "Animator · NFB · 1914–1987",
    source: "Widely cited as McLaren's definition of animation; no primary source confirmed.",
    portrait: "/images/mclaren-pencil.png",
    photo: {
      by: "Jack Long, National Film Board of Canada, 1944",
      license: "Public domain",
      licenseUrl: "https://commons.wikimedia.org/wiki/File:Norman_McLaren_drawing_on_film_-_1944.jpg",
      page: "https://commons.wikimedia.org/wiki/File:Norman_McLaren_drawing_on_film_-_1944.jpg",
    },
  },
  {
    quote: "We can have a natural feel for timing, but we have to learn the spacing of things.",
    name: "Richard Williams",
    role: "Animator · 1933–2019",
    source: "Attributed to Richard Williams, The Animator's Survival Kit (Faber, 2001), on timing and spacing. Wording and page not checked against the book.",
    portrait: "/images/williams-pencil.png",
    photo: {
      by: "Alexander Williams, 2015",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      page: "https://commons.wikimedia.org/wiki/File:Richard_Williams_in_2015.jpg",
    },
  },
  {
    quote: "A comedian is not a person who opens a funny door — he's the person who opens a door funny.",
    name: "Chuck Jones",
    role: "Looney Tunes · 1912–2002",
    source: "Widely attributed to Chuck Jones; exact wording and primary source not confirmed.",
    portrait: "/images/jones-pencil.png",
    photo: {
      by: "Alan Light, 1978",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      page: "https://commons.wikimedia.org/wiki/File:Chuck_Jones1.jpg",
    },
  },
  {
    quote: "Don't animate drawings, animate feelings.",
    name: "Ollie Johnston",
    role: "Nine Old Men · 1912–2008",
    source: "Widely attributed to Ollie Johnston; exact wording and primary source not confirmed.",
    portrait: "/images/johnston-pencil.png",
    photo: {
      by: "J-E Nyström, 1989",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      page: "https://commons.wikimedia.org/wiki/File:OLLIE1989.jpg",
    },
  },
  {
    quote: "Animation is about creating the illusion of life, and you can't create it if you don't have one.",
    name: "Brad Bird",
    role: "Director · Pixar · b. 1957",
    source: "Acceptance speech for The Incredibles, 77th Academy Awards, 27 February 2005.",
    portrait: "/images/bird-pencil.png",
    photo: {
      by: "Doug Kline / Pop Culture Geek, 2012",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      page: "https://commons.wikimedia.org/wiki/File:BRAD_BIRD_2012.jpg",
    },
  },
];

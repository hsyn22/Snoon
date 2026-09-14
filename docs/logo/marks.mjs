// Eight logo directions. Marks are drawn on a 100x100 viewBox so every one of
// them can be dropped into a 16px favicon and a 512px app icon unchanged.
export const T = '#13585c'        // --color-accent, deep teal
export const TD = '#0d4144'       // --color-accent-strong
export const W = '#e0a668'        // --color-warm, sand
export const WL = '#f3e2cd'

export const marks = {
  // 1. الوصلة — a span holding two people, with the noon's dot above. The two
  //    nodes hang below the terminals rather than sitting in them, which is
  //    what keeps this from reading as a pair of eyes over a smile.
  link: (a = T, b = W) => `
    <path d="M24 38 Q50 84 76 38" fill="none" stroke="${a}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="15" cy="30" r="8" fill="${b}"/>
    <circle cx="85" cy="30" r="8" fill="${a}"/>
    <circle cx="50" cy="17" r="7" fill="${a}"/>`,

  // 2. النون — the letter itself, filled. A bowl that holds, and the one letter
  //    the name turns on. Reads as Arabic at any size, needs no explanation.
  noon: (a = T, b = W) => `
    <path d="M14 20 L14 46 C14 76 86 76 86 46 L86 20 L69 20 L69 46 C69 61 31 61 31 46 L31 20 Z" fill="${a}"/>
    <circle cx="50" cy="9" r="8" fill="${b}"/>`,

  // 3. ChatGPT, corrected — the badge kept, everything inside it fixed. The
  //    smile is no longer floating: it IS the bowl of the noon, with its dot.
  badge: (a = T, b = WL) => `
    <circle cx="50" cy="50" r="48" fill="${b}"/>
    <path d="M26 42 C26 72 74 72 74 42" fill="none" stroke="${a}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="50" cy="26" r="7.5" fill="${a}"/>`,

  // 4. ChatGPT, corrected differently — the badge becomes a tooth, split down
  //    the middle into the two people it joins. Same shape as the hero motif.
  tooth: (a = T, b = W, edge = 'none') => {
    const d = 'M50 6 C26 6 9 20 9 42 C9 59 16 69 20 81 C22 90 26 95 31 95 C36 95 38 90 39 81 L43 61 C45 52 55 52 57 61 L61 81 C62 90 64 95 69 95 C74 95 78 90 80 81 C84 69 91 59 91 42 C91 20 74 6 50 6 Z'
    return `
    <defs><clipPath id="tc"><path d="${d}"/></clipPath></defs>
    <g clip-path="url(#tc)">
      <rect x="0" y="0" width="50" height="100" fill="${a}"/>
      <rect x="50" y="0" width="50" height="100" fill="${b}"/>
    </g>
    <path d="${d}" fill="none" stroke="${edge}" stroke-width="4"/>`
  },

  // 5. القوسان — two arcs from opposite corners rising to meet. This is
  //    MatchMotif from the hero, closed up into a mark: the logo and the
  //    artwork on the page become the same idea.
  arcs: (a = T, b = W) => `
    <path d="M10 88 C10 40 28 16 50 16" fill="none" stroke="${a}" stroke-width="11" stroke-linecap="round"/>
    <path d="M90 88 C90 40 72 16 50 16" fill="none" stroke="${b}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="50" cy="16" r="9" fill="${a}"/>`,

  // 6. الختم — a seal. One typeset letter in a rounded square: the most
  //    ordinary thing an app icon can be, and the most reliable at 16px.
  seal: (a = T, b = '#ffffff') => `
    <rect x="2" y="2" width="96" height="96" rx="26" fill="${a}"/>
    <text x="50" y="50" font-family="Reem Kufi" font-size="62" font-weight="700"
      fill="${b}" text-anchor="middle" dominant-baseline="central">&#x646;</text>`,

  // 7. الشدّة — the shadda he chose, made the mark. A shadda is a miniature
  //    seen, and سِنّ is a tooth: three teeth over the name. This direction
  //    exists only because of the spelling decision.
  //    Typeset, never drawn: a shadda over a tatweel, so the glyph is the real
  //    one from the font rather than my guess at its shape. Drawing Arabic by
  //    hand is exactly how the attached logo ended up spelling nothing.
  shadda: (a = T, b = W) => `
    <text x="12" y="186" font-family="Kufam" font-size="194" font-weight="700"
      fill="${a}">&#x651;</text>
    <rect x="20" y="80" width="60" height="11" rx="5.5" fill="${b}"/>`,

  // 8. الخط — no drawn mark at all. The name in a calligraphic hand is the
  //    logo; the final noon alone stands in where a small mark is needed.
  calli: (a = T) => `
    <text x="50" y="52" font-family="Aref Ruqaa" font-size="86" font-weight="700"
      fill="${a}" text-anchor="middle" dominant-baseline="central">&#x646;</text>`,
}

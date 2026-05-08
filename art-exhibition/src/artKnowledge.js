export const artKnowledge = [
  {
    id: "impressionism",
    tags: ["impressionism", "monet", "renoir", "pissarro", "french", "19th century", "light", "outdoor", "plein air"],
    content: "Impressionism was a 19th-century art movement that originated in France, characterized by loose brushwork and an emphasis on capturing the fleeting effects of light and atmosphere. Artists like Claude Monet, Pierre-Auguste Renoir, and Camille Pissarro often painted outdoors (en plein air) to observe natural light directly. The movement broke from academic tradition by prioritizing the painter's immediate sensory impression over precise realistic detail."
  },
  {
    id: "abstract_expressionism",
    tags: ["abstract", "expressionism", "pollock", "rothko", "de kooning", "american", "20th century", "gesture", "action painting"],
    content: "Abstract Expressionism emerged in New York during the 1940s and 1950s as the first major American art movement to achieve international influence. Artists such as Jackson Pollock, Mark Rothko, and Willem de Kooning emphasized spontaneous, gestural mark-making and large-scale canvases to express raw emotion. The movement is divided into two tendencies: action painting, focused on energetic physical process, and color field painting, which uses expansive areas of flat color to evoke mood."
  },
  {
    id: "oil_painting_technique",
    tags: ["oil", "technique", "layering", "glazing", "impasto", "medium", "canvas", "underpainting"],
    content: "Oil painting is one of the most versatile painting media, allowing artists to build up rich layers of color through techniques such as glazing, scumbling, and impasto. Glazing involves applying thin, transparent layers of paint to create luminous depth, while impasto uses thick, textured strokes for expressive surface quality. A typical oil painting process begins with an underpainting to establish composition and value, followed by progressive layers that refine color, detail, and finish."
  },
  {
    id: "watercolor_technique",
    tags: ["watercolor", "technique", "wash", "wet-on-wet", "transparent", "paper", "aquarelle"],
    content: "Watercolor painting relies on the transparency of pigment suspended in water, allowing the white of the paper to illuminate the colors from beneath. Key techniques include wet-on-wet (applying paint to a damp surface for soft, blended edges) and wet-on-dry (applying paint to dry paper for crisp, controlled edges). Because watercolor is difficult to correct once dry, artists typically plan their lightest areas in advance and build depth gradually through successive washes."
  },
  {
    id: "color_theory",
    tags: ["color", "theory", "hue", "saturation", "value", "complementary", "warm", "cool", "palette"],
    content: "Color theory is the body of practical guidance for mixing colors and the visual effects of specific color combinations. The traditional color wheel organizes hues into primary (red, yellow, blue), secondary, and tertiary colors, and defines relationships such as complementary pairs and analogous harmonies. Understanding value (lightness/darkness), saturation (intensity), and temperature (warm vs. cool) allows artists to create convincing depth, mood, and visual unity in a painting."
  },
  {
    id: "light_and_shadow",
    tags: ["light", "shadow", "chiaroscuro", "tonal", "shading", "highlight", "form", "volume", "contrast"],
    content: "Light and shadow are fundamental tools for conveying three-dimensional form on a two-dimensional surface. The Italian term chiaroscuro describes the dramatic contrast between light and dark used by masters such as Caravaggio and Rembrandt to model volume and create atmosphere. Key shadow zones — highlight, mid-tone, core shadow, reflected light, and cast shadow — work together to describe how light wraps around and interacts with objects."
  },
  {
    id: "renaissance_art",
    tags: ["renaissance", "italian", "leonardo", "michelangelo", "raphael", "perspective", "humanism", "15th century", "16th century"],
    content: "The Renaissance (14th–17th centuries) marked a rebirth of classical ideals in European art, with Italy at its center. Artists including Leonardo da Vinci, Michelangelo, and Raphael pioneered linear perspective, anatomical accuracy, and the idealized human figure influenced by ancient Greek and Roman sculpture. The period also saw the rise of oil painting in the North (Jan van Eyck) and the integration of humanist philosophy, placing mankind at the center of artistic and intellectual inquiry."
  },
  {
    id: "contemporary_art",
    tags: ["contemporary", "modern", "installation", "conceptual", "mixed media", "digital", "postmodern", "21st century"],
    content: "Contemporary art refers to work produced from the late 20th century to the present, encompassing a vast range of styles, media, and conceptual frameworks. It frequently challenges traditional boundaries between art forms, incorporating installation, performance, video, and digital media alongside painting and sculpture. Conceptual approaches often prioritize the idea or process over aesthetic form, reflecting diverse cultural perspectives and engaging with pressing social, political, and environmental issues."
  },
  {
    id: "composition_principles",
    tags: ["composition", "rule of thirds", "golden ratio", "balance", "focal point", "rhythm", "negative space", "symmetry"],
    content: "Composition refers to the deliberate arrangement of visual elements within a picture plane to guide the viewer's eye and communicate intent. Classic principles include the rule of thirds (placing key elements along grid lines), use of leading lines, balance between positive and negative space, and creating a clear focal point. A strong composition establishes visual hierarchy and rhythm, ensuring the eye moves through the work in a way that reinforces the artist's narrative or emotional goal."
  },
  {
    id: "art_conservation",
    tags: ["conservation", "restoration", "preservation", "varnish", "cleaning", "museum", "pigment", "aging", "deterioration"],
    content: "Art conservation is the professional practice of preserving and restoring works of art to prevent or reverse deterioration caused by age, environment, and handling. Conservators analyze materials using scientific techniques such as X-ray and infrared reflectography to understand original structure before undertaking any intervention. Ethical standards require that all treatments be reversible and that original material be retained wherever possible, distinguishing careful conservation from heavier-handed restoration."
  }
];

export function retrieveRelevantKnowledge(query, paintingInfo) {
  const queryText = [
    query,
    paintingInfo?.title,
    paintingInfo?.artist,
    paintingInfo?.medium,
    paintingInfo?.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const words = queryText.match(/\b\w+\b/g) || [];

  const scored = artKnowledge.map((entry) => {
    const score = entry.tags.reduce((acc, tag) => {
      return words.some((word) => tag.includes(word) || word.includes(tag))
        ? acc + 1
        : acc;
    }, 0);
    return { entry, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => entry.content);
}

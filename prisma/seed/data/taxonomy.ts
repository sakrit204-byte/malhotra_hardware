/**
 * Catalogue taxonomy for the development database.
 *
 * None of this is hardcoded into the frontend. Every category, brand, material,
 * finish, application and specification below is an ordinary database row that
 * an administrator can rename, reorder, hide or delete. The seed only provides a
 * realistic starting catalogue.
 */

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isFeatured?: boolean;
  image?: string;
  children?: Array<{ slug: string; name: string; description?: string }>;
};

export const categories: CategorySeed[] = [
  {
    slug: "door-hinges",
    name: "Door Hinges",
    description:
      "Butt hinges, concealed hinges and pivot sets sized for residential and commercial door leaves.",
    sortOrder: 10,
    isFeatured: true,
    image: "hinge-silver-dark",
    children: [
      { slug: "butt-hinges", name: "Butt Hinges" },
      { slug: "concealed-hinges", name: "Concealed Hinges" },
      { slug: "pivot-hinges", name: "Pivot Hinges" },
    ],
  },
  {
    slug: "door-handles",
    name: "Door Handles",
    description:
      "Lever handles, knobs and complete handle sets in finishes that suit modern and traditional interiors.",
    sortOrder: 20,
    isFeatured: true,
    image: "lever-satin-grey",
    children: [
      { slug: "lever-handles", name: "Lever Handles" },
      { slug: "knob-handles", name: "Knob Handles" },
      { slug: "handle-sets", name: "Handle Sets" },
    ],
  },
  {
    slug: "door-locks",
    name: "Door Locks",
    description:
      "Rim locks, night latches and cylinders for entrance doors, apartments and project work.",
    sortOrder: 30,
    isFeatured: true,
    image: "lock-vintage-key",
    children: [
      { slug: "rim-locks", name: "Rim Locks" },
      { slug: "night-latches", name: "Night Latches" },
      { slug: "cylinders", name: "Cylinders" },
    ],
  },
  {
    slug: "door-closers",
    name: "Door Closers",
    description:
      "Overhead closers and floor springs that control heavy doors quietly and consistently.",
    sortOrder: 40,
    isFeatured: true,
    image: "closer-white-door",
    children: [
      { slug: "overhead-closers", name: "Overhead Closers" },
      { slug: "floor-springs", name: "Floor Springs" },
    ],
  },
  {
    slug: "mortise-locks",
    name: "Mortise Locks",
    description:
      "Mortise lock bodies and rose sets for solid timber and engineered door leaves.",
    sortOrder: 50,
    image: "mortise-lock-timber",
    children: [
      { slug: "mortise-bodies", name: "Mortise Lock Bodies" },
      { slug: "mortise-rose-sets", name: "Rose Sets" },
    ],
  },
  {
    slug: "cylindrical-locks",
    name: "Cylindrical Locks",
    description:
      "Tubular latches and cylindrical lock sets for fast installation on standard door preparations.",
    sortOrder: 60,
    image: "handle-brass-white",
    children: [
      { slug: "tubular-latches", name: "Tubular Latches" },
      { slug: "cylindrical-sets", name: "Cylindrical Lock Sets" },
    ],
  },
  {
    slug: "pull-handles",
    name: "Pull Handles",
    description:
      "Back to back and single fix pull handles for entrance doors, glass doors and joinery.",
    sortOrder: 70,
    isFeatured: true,
    image: "pull-handle-glass",
    children: [
      { slug: "back-to-back-pulls", name: "Back to Back Pulls" },
      { slug: "single-fix-pulls", name: "Single Fix Pulls" },
    ],
  },
  {
    slug: "cabinet-hardware",
    name: "Cabinet Hardware",
    description:
      "Knobs, bar pulls and edge profiles that finish kitchens, wardrobes and built in joinery.",
    sortOrder: 80,
    isFeatured: true,
    image: "drawer-pull-brass",
    children: [
      { slug: "cabinet-knobs", name: "Cabinet Knobs" },
      { slug: "cabinet-pulls", name: "Cabinet Pulls" },
    ],
  },
  {
    slug: "glass-door-hardware",
    name: "Glass Door Hardware",
    description:
      "Patch fittings, locks and handles engineered for toughened glass doors and partitions.",
    sortOrder: 90,
    image: "glass-door-folding",
    children: [
      { slug: "patch-fittings", name: "Patch Fittings" },
      { slug: "glass-door-locks", name: "Glass Door Locks" },
    ],
  },
  {
    slug: "sliding-door-hardware",
    name: "Sliding Door Hardware",
    description:
      "Track sets, rollers and guides for sliding room dividers, wardrobes and barn style doors.",
    sortOrder: 100,
    image: "sliding-track-open",
    children: [
      { slug: "sliding-track-sets", name: "Track Sets" },
      { slug: "sliding-door-locks", name: "Sliding Door Locks" },
    ],
  },
  {
    slug: "bathroom-hardware",
    name: "Bathroom Hardware",
    description:
      "Towel rails, robe hooks and privacy fittings finished to survive humidity.",
    sortOrder: 110,
    image: "towel-rail-white",
    children: [
      { slug: "towel-rails", name: "Towel Rails" },
      { slug: "robe-hooks", name: "Robe Hooks" },
      { slug: "bathroom-fittings", name: "Bathroom Fittings" },
    ],
  },
  {
    slug: "architectural-accessories",
    name: "Architectural Accessories",
    description:
      "Numerals, handrail fittings and window stays that complete an elevation.",
    sortOrder: 120,
    image: "numeral-seven",
    children: [
      { slug: "numerals", name: "Numerals and Signage" },
      { slug: "handrail-fittings", name: "Handrail Fittings" },
      { slug: "window-fittings", name: "Window Fittings" },
    ],
  },
  {
    slug: "door-accessories",
    name: "Door Accessories",
    description:
      "Numerals, viewers, stops and the small fittings that finish a door properly.",
    sortOrder: 130,
    image: "numeral-fifteen",
    children: [
      { slug: "door-numerals", name: "Door Numerals" },
      { slug: "door-stops", name: "Door Stops" },
    ],
  },
  {
    slug: "furniture-hardware",
    name: "Furniture Hardware",
    description:
      "Fittings for freestanding and built in furniture, from drawer pulls to connecting hardware.",
    sortOrder: 140,
    image: "drawer-chest-timber",
    children: [
      { slug: "furniture-pulls", name: "Furniture Pulls" },
      { slug: "connecting-fittings", name: "Connecting Fittings" },
    ],
  },
  {
    slug: "security-hardware",
    name: "Security Hardware",
    description:
      "Padlocks, tower bolts and securing hardware for gates, stores and service doors.",
    sortOrder: 150,
    isFeatured: true,
    image: "padlock-brass-white",
    children: [
      { slug: "padlocks", name: "Padlocks" },
      { slug: "tower-bolts", name: "Tower Bolts" },
    ],
  },
  {
    slug: "other-hardware",
    name: "Other Hardware",
    description:
      "Project specific items sourced to order. Send us a drawing or a sample and our team will quote it.",
    sortOrder: 160,
  },
];

export const brands = [
  {
    slug: "malhotra-signature",
    name: "Malhotra Signature",
    summary:
      "Our own range, specified and quality checked in Kathmandu for Nepali projects.",
    sortOrder: 10,
  },
  {
    slug: "everest-hardware",
    name: "Everest Hardware",
    summary: "Robust everyday ironmongery for residential construction.",
    sortOrder: 20,
  },
  {
    slug: "kathmandu-forge",
    name: "Kathmandu Forge",
    summary: "Hand finished brass and iron pieces made by local craftspeople.",
    sortOrder: 30,
  },
  {
    slug: "nordvik",
    name: "Nordvik",
    summary: "Minimal European profiles in stainless steel and powder coat.",
    sortOrder: 40,
  },
  {
    slug: "atlas-ironmongery",
    name: "Atlas Ironmongery",
    summary: "Commercial grade closers, locks and panic hardware.",
    sortOrder: 50,
  },
  {
    slug: "trilok-metals",
    name: "Trilok Metals",
    summary: "Solid brass fittings and architectural accessories.",
    sortOrder: 60,
  },
];

export const materials = [
  { slug: "stainless-steel", name: "Stainless Steel", sortOrder: 10 },
  { slug: "solid-brass", name: "Solid Brass", sortOrder: 20 },
  { slug: "zinc-alloy", name: "Zinc Alloy", sortOrder: 30 },
  { slug: "aluminium", name: "Aluminium", sortOrder: 40 },
  { slug: "bronze", name: "Bronze", sortOrder: 50 },
  { slug: "wrought-iron", name: "Wrought Iron", sortOrder: 60 },
  { slug: "toughened-glass", name: "Toughened Glass", sortOrder: 70 },
  { slug: "seasoned-timber", name: "Seasoned Timber", sortOrder: 80 },
];

export const finishes = [
  { slug: "satin-stainless", name: "Satin Stainless", swatchHex: "#B8BCBE", sortOrder: 10 },
  { slug: "polished-chrome", name: "Polished Chrome", swatchHex: "#D6DBDE", sortOrder: 20 },
  { slug: "matt-black", name: "Matt Black", swatchHex: "#22201E", sortOrder: 30 },
  { slug: "satin-brass", name: "Satin Brass", swatchHex: "#B08D57", sortOrder: 40 },
  { slug: "polished-brass", name: "Polished Brass", swatchHex: "#C9A227", sortOrder: 50 },
  { slug: "antique-brass", name: "Antique Brass", swatchHex: "#7E6238", sortOrder: 60 },
  { slug: "oil-rubbed-bronze", name: "Oil Rubbed Bronze", swatchHex: "#4A3B2E", sortOrder: 70 },
  { slug: "rose-gold", name: "Rose Gold", swatchHex: "#B76E79", sortOrder: 80 },
  { slug: "white-powder-coat", name: "White Powder Coat", swatchHex: "#F2F1EE", sortOrder: 90 },
  { slug: "natural-anodised", name: "Natural Anodised", swatchHex: "#9EA3A6", sortOrder: 100 },
];

export const applications = [
  { slug: "main-entrance", name: "Main Entrance", sortOrder: 10 },
  { slug: "interior-doors", name: "Interior Doors", sortOrder: 20 },
  { slug: "bathroom", name: "Bathroom", sortOrder: 30 },
  { slug: "kitchen", name: "Kitchen", sortOrder: 40 },
  { slug: "cabinetry", name: "Cabinetry and Wardrobes", sortOrder: 50 },
  { slug: "glass-partitions", name: "Glass Partitions", sortOrder: 60 },
  { slug: "commercial", name: "Commercial and Office", sortOrder: 70 },
  { slug: "gates-and-stores", name: "Gates and Stores", sortOrder: 80 },
];

export const tags = [
  "modern",
  "minimal",
  "heritage",
  "heavy duty",
  "project grade",
  "weather resistant",
  "concealed fixing",
  "quiet close",
  "corrosion resistant",
  "quick install",
];

/**
 * Administrator defined technical attributes. Adding one more is a row here,
 * never a change to the products table.
 */
export const specificationDefinitions = [
  { key: "backset", label: "Backset", unit: "mm", dataType: "NUMBER", groupName: "Dimensions", isFilterable: true, sortOrder: 10 },
  { key: "centres", label: "Fixing Centres", unit: "mm", dataType: "NUMBER", groupName: "Dimensions", sortOrder: 20 },
  { key: "projection", label: "Projection", unit: "mm", dataType: "NUMBER", groupName: "Dimensions", sortOrder: 30 },
  { key: "overall_length", label: "Overall Length", unit: "mm", dataType: "NUMBER", groupName: "Dimensions", sortOrder: 40 },
  { key: "rose_diameter", label: "Rose Diameter", unit: "mm", dataType: "NUMBER", groupName: "Dimensions", sortOrder: 50 },
  { key: "spindle", label: "Spindle Size", unit: "mm", dataType: "TEXT", groupName: "Dimensions", sortOrder: 60 },
  { key: "door_thickness", label: "Door Thickness", unit: "mm", dataType: "TEXT", groupName: "Fitting", isFilterable: true, sortOrder: 70 },
  { key: "cylinder_length", label: "Cylinder Length", unit: "mm", dataType: "TEXT", groupName: "Fitting", sortOrder: 80 },
  { key: "handing", label: "Handing", dataType: "OPTION", options: ["Reversible", "Left hand", "Right hand"], groupName: "Fitting", isFilterable: true, sortOrder: 90 },
  { key: "mounting", label: "Mounting", dataType: "TEXT", groupName: "Fitting", sortOrder: 100 },
  { key: "load_rating", label: "Load Rating", unit: "kg", dataType: "NUMBER", groupName: "Performance", sortOrder: 110 },
  { key: "cycle_rating", label: "Cycle Rating", dataType: "TEXT", groupName: "Performance", sortOrder: 120 },
  { key: "fire_rating", label: "Fire Rating", dataType: "OPTION", options: ["Not rated", "30 minutes", "60 minutes", "120 minutes"], groupName: "Performance", isFilterable: true, sortOrder: 130 },
  { key: "corrosion_grade", label: "Corrosion Grade", dataType: "TEXT", groupName: "Performance", sortOrder: 140 },
  { key: "bearing_type", label: "Bearing Type", dataType: "TEXT", groupName: "Construction", sortOrder: 150 },
  { key: "fixings", label: "Fixings Supplied", dataType: "TEXT", groupName: "Construction", sortOrder: 160 },
  { key: "package_contents", label: "Package Contents", dataType: "TEXT", groupName: "Supply", sortOrder: 170 },
  { key: "warranty", label: "Warranty", dataType: "TEXT", groupName: "Supply", isFilterable: true, sortOrder: 180 },
  { key: "country_of_origin", label: "Country of Origin", dataType: "TEXT", groupName: "Supply", sortOrder: 190 },
  { key: "certification", label: "Certification", dataType: "TEXT", groupName: "Supply", sortOrder: 200 },
] as const;

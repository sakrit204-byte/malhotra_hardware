/**
 * Curated photography for the development catalogue.
 *
 * Every photograph here is a real photograph published under the Unsplash
 * licence, which permits commercial use without permission. Images produced by
 * rendering studios were excluded from the architectural set so that the house
 * and interior imagery is genuine photography rather than computer generated.
 *
 * `npm run images:fetch` downloads each file into public/uploads/catalogue and
 * writes an attribution manifest beside them. The seed then points product and
 * category records at the local files, so an administrator can replace any of
 * them from the admin panel without a developer.
 */

export type CuratedPhoto = {
  /** Stable file name, without extension. */
  key: string;
  /** Path on the Unsplash image host. */
  source: string;
  /** Alternative text describing what the photograph shows. */
  alt: string;
  photographer: string;
  photographerHandle: string;
  kind: "product" | "architecture";
};

export const curatedPhotos: CuratedPhoto[] = [
  // ---------------------------------------------------------------- handles
  {
    key: "lever-brass-timber",
    source: "photo-1607710533910-d7cdffd9e593",
    alt: "Brass lever handle mounted on a timber door",
    photographer: "Sneaky Head",
    photographerHandle: "sneakyhead",
    kind: "product",
  },
  {
    key: "lever-satin-grey",
    source: "photo-1583691028182-e8f01e74bfa2",
    alt: "Satin stainless lever handle on a grey painted door",
    photographer: "Shyam",
    photographerHandle: "thezenoeffect",
    kind: "product",
  },
  {
    key: "handle-white-door",
    source: "photo-1734094151911-803ee718a921",
    alt: "Close view of a lever handle on a white panelled door",
    photographer: "Jason Gooljar",
    photographerHandle: "jasongooljar24",
    kind: "product",
  },
  {
    key: "lever-black-timber",
    source: "photo-1574588822710-475a38fe3371",
    alt: "Matt black lever handle on a warm timber door",
    photographer: "H&CO",
    photographerHandle: "hngstrm",
    kind: "product",
  },
  {
    key: "lever-white-panel",
    source: "photo-1528278966557-c87afae1e1f7",
    alt: "Lever handle on an open white panelled door",
    photographer: "Annie Spratt",
    photographerHandle: "anniespratt",
    kind: "product",
  },
  {
    key: "lever-panel-detail",
    source: "photo-1528278849011-96a6c2221b50",
    alt: "Detail of a lever handle against a painted door panel",
    photographer: "Annie Spratt",
    photographerHandle: "anniespratt",
    kind: "product",
  },
  {
    key: "knob-round-timber",
    source: "photo-1573494769092-46dfa3d884ea",
    alt: "Round timber door knob on a dark surface",
    photographer: "Elias",
    photographerHandle: "eelias",
    kind: "product",
  },
  {
    key: "lever-lock-pale",
    source: "photo-1657040899628-f4a028c62fbf",
    alt: "Lever handle with a lock on a pale door",
    photographer: "Christina Radevich",
    photographerHandle: "chris_designer",
    kind: "product",
  },
  {
    key: "knob-glass-crystal",
    source: "photo-1625259960906-725234a78ed8",
    alt: "Faceted glass door knob catching the light",
    photographer: "Perry Merrity II",
    photographerHandle: "prince_perry",
    kind: "product",
  },
  {
    key: "lever-green-door",
    source: "photo-1532550256335-c281a64ac9f6",
    alt: "Lever handle on a deep green door beside a white wall",
    photographer: "Pawel Czerwinski",
    photographerHandle: "pawel_czerwinski",
    kind: "product",
  },
  {
    key: "handle-blue-door",
    source: "photo-1538766017398-415434a31a5b",
    alt: "Handle and hinge detail on a blue painted door",
    photographer: "Jan Tinneberg",
    photographerHandle: "craft_ear",
    kind: "product",
  },
  {
    key: "handle-brass-white",
    source: "photo-1776417091038-df7f71687a1e",
    alt: "Brass door handle on a white door",
    photographer: "James Coleman",
    photographerHandle: "jhc",
    kind: "product",
  },
  {
    key: "handle-metal-white",
    source: "photo-1766752599571-ce70688f7b83",
    alt: "Metal door handle on a white door",
    photographer: "atelierbyvineeth",
    photographerHandle: "atelierbyvineeth",
    kind: "product",
  },
  {
    key: "door-balcony-frame",
    source: "photo-1776417078345-7a33d7a3860a",
    alt: "View through a white door frame onto a balcony",
    photographer: "James Coleman",
    photographerHandle: "jhc",
    kind: "product",
  },

  // ------------------------------------------------------- hinges and closers
  {
    key: "hinge-silver-dark",
    source: "photo-1779204749779-5296e620968a",
    alt: "Silver hinge on a dark wooden door against a textured white wall",
    photographer: "Izzudin Habib",
    photographerHandle: "habib2510",
    kind: "product",
  },
  {
    key: "closer-white-door",
    source: "photo-1588704821128-889309f68363",
    alt: "Overhead door closer arm on a white door",
    photographer: "Vidar Nordli Mathisen",
    photographerHandle: "vidarnm",
    kind: "product",
  },
  {
    key: "lock-vintage-key",
    source: "photo-1759564225887-e2e2e27f8972",
    alt: "Close view of a door handle and lock with a key",
    photographer: "Azmar Aso",
    photographerHandle: "azmar_aso",
    kind: "product",
  },
  {
    key: "lock-mono-door",
    source: "photo-1701708523337-1a647e8d0a10",
    alt: "Lock body on a door in black and white",
    photographer: "Bhargav Panchal",
    photographerHandle: "bhargavpanchal1986",
    kind: "product",
  },

  // ------------------------------------------------------ locks and security
  {
    key: "mortise-lock-timber",
    source: "photo-1744329629840-72bb30de38eb",
    alt: "Metal lock body securing a pair of wooden doors",
    photographer: "Zoshua Colah",
    photographerHandle: "zoshuacolah",
    kind: "product",
  },
  {
    key: "bolt-padlock-door",
    source: "photo-1744329629869-5cb98169ba59",
    alt: "Door secured by a tower bolt and padlock",
    photographer: "Zoshua Colah",
    photographerHandle: "zoshuacolah",
    kind: "product",
  },
  {
    key: "bolt-padlock-detail",
    source: "photo-1744329629767-80ba7dc0cea6",
    alt: "Detail of a bolt and padlock on a door",
    photographer: "Zoshua Colah",
    photographerHandle: "zoshuacolah",
    kind: "product",
  },
  {
    key: "cylinder-key-detail",
    source: "photo-1759452003649-552896c8ed63",
    alt: "Key inserted into a cylinder lock mechanism",
    photographer: "Derek Nelson",
    photographerHandle: "gingermanbread",
    kind: "product",
  },
  {
    key: "key-in-door",
    source: "photo-1677951570313-b0750351c461",
    alt: "Key resting in a door lock",
    photographer: "Dima Solomin",
    photographerHandle: "solomin_d",
    kind: "product",
  },
  {
    key: "padlock-brass-white",
    source: "photo-1587195399841-fc7174360a86",
    alt: "Brass padlock on a white surface",
    photographer: "Michael Chacon",
    photographerHandle: "cloudsrest",
    kind: "product",
  },
  {
    key: "padlock-gold-white",
    source: "photo-1584985429980-a9db9a42b324",
    alt: "Gold finished padlock on a white surface",
    photographer: "Everyday basics",
    photographerHandle: "zanardi",
    kind: "product",
  },
  {
    key: "padlock-combination",
    source: "photo-1592744254966-58c65cfd2e69",
    alt: "Combination padlock in silver and black",
    photographer: "Nicolas Hippert",
    photographerHandle: "nhippert",
    kind: "product",
  },
  {
    key: "padlock-black",
    source: "photo-1696013910376-c56f76dd8178",
    alt: "Closed padlock on a black surface",
    photographer: "Kedibone Isaac Makhumisane",
    photographerHandle: "isaax_the_artist",
    kind: "product",
  },
  {
    key: "rosette-detail",
    source: "photo-1770219792093-85830ce757b7",
    alt: "Machined metal rosette with concentric rings",
    photographer: "Jonathan Cosens Photography",
    photographerHandle: "jcosens",
    kind: "product",
  },

  // ---------------------------------------------------- glass and pull handles
  {
    key: "pull-handle-glass",
    source: "photo-1766215010263-0e4e9d7b3864",
    alt: "Polished metal pull handle beside a curtain",
    photographer: "Shuang Film",
    photographerHandle: "film002",
    kind: "product",
  },
  {
    key: "glass-door-folding",
    source: "photo-1758998256408-ab2c9fbec19b",
    alt: "Black framed folding glass doors",
    photographer: "MBOR MC",
    photographerHandle: "mbormc",
    kind: "product",
  },
  {
    key: "glass-door-sunlight",
    source: "photo-1760893769005-b3d617bd7a69",
    alt: "Sunlight streaming through a glass panelled door",
    photographer: "Julian Roesner",
    photographerHandle: "kipfarl",
    kind: "product",
  },
  {
    key: "glass-door-stairs",
    source: "photo-1764962091350-48fbcb313909",
    alt: "Dark wooden stairs leading to a glass panelled door",
    photographer: "Tsuyoshi Kozu",
    photographerHandle: "tsuyoshikozu",
    kind: "product",
  },
  {
    key: "handrail-black-stair",
    source: "photo-1730651065851-4622774b6d21",
    alt: "Black handrail following a staircase",
    photographer: "Danila Balashkin",
    photographerHandle: "danila_balashkin",
    kind: "product",
  },

  // ------------------------------------------------------- cabinet and furniture
  {
    key: "cabinet-knob-timber",
    source: "photo-1679990130718-78143499971d",
    alt: "Knob on a timber cabinet door",
    photographer: "Richard Stachmann",
    photographerHandle: "stachmann",
    kind: "product",
  },
  {
    key: "drawer-chest-timber",
    source: "photo-1548591443-37f7c0e94f31",
    alt: "Timber drawer chest with slim metal pulls",
    photographer: "MChe Lee",
    photographerHandle: "mclee",
    kind: "product",
  },
  {
    key: "cabinet-pull-steel",
    source: "photo-1646910083956-8c08a99d79a8",
    alt: "Stainless steel pull on a cabinet door",
    photographer: "Engin Akyurt",
    photographerHandle: "enginakyurt",
    kind: "product",
  },
  {
    key: "cabinet-pull-antique",
    source: "photo-1634212926386-91c3827282ee",
    alt: "Antique finished pull on a wooden door",
    photographer: "Erik Mclean",
    photographerHandle: "introspectivedsgn",
    kind: "product",
  },
  {
    key: "drawer-pull-pair",
    source: "photo-1732885479994-a71d4b39ef69",
    alt: "Pair of slim bar pulls on a drawer front",
    photographer: "Ruan Richard Rodrigues",
    photographerHandle: "ricdeoliveira",
    kind: "product",
  },
  {
    key: "cabinet-handle-black",
    source: "photo-1596834868044-3d398d2a6f28",
    alt: "Black handle on a cabinet door",
    photographer: "Paolo Chiabrando",
    photographerHandle: "chiabra",
    kind: "product",
  },
  {
    key: "drawer-pull-brass",
    source: "photo-1732885480010-55f88e556afb",
    alt: "Brass bar pulls on a drawer front",
    photographer: "Ruan Richard Rodrigues",
    photographerHandle: "ricdeoliveira",
    kind: "product",
  },
  {
    key: "cabinet-knob-gold",
    source: "photo-1595418312726-3beb2f4fe67e",
    alt: "White cabinet door with a gold knob",
    photographer: "Nicola Bushuven",
    photographerHandle: "bushuven",
    kind: "product",
  },
  {
    key: "cabinet-bar-brass",
    source: "photo-1732885479418-6e50e6f00397",
    alt: "Cabinet with brass bar handles",
    photographer: "Ruan Richard Rodrigues",
    photographerHandle: "ricdeoliveira",
    kind: "product",
  },
  {
    key: "cabinet-bar-white",
    source: "photo-1645743754938-98b77f7524bd",
    alt: "Slim bar handle on a white cabinet door",
    photographer: "Rumman Amin",
    photographerHandle: "rumanamin",
    kind: "product",
  },
  {
    key: "knurled-t-pull",
    source: "photo-1634926360833-8a6fd76f0300",
    alt: "Knurled metal pull resting on a table",
    photographer: "Zain Khan",
    photographerHandle: "aabedeen51",
    kind: "product",
  },
  {
    key: "cabinet-timber-unit",
    source: "photo-1600422086908-72be2c8f5f3f",
    alt: "Timber cabinet unit with recessed hardware",
    photographer: "Xie Yujie Nick",
    photographerHandle: "xieyujie",
    kind: "product",
  },
  {
    key: "hardware-chrome-macro",
    source: "photo-1761353854322-96e6ab127da4",
    alt: "Polished chrome fitting on a grey surface",
    photographer: "He Shiyuan",
    photographerHandle: "wna2025",
    kind: "product",
  },

  // -------------------------------------------------------------- sliding door
  {
    key: "sliding-stair-door",
    source: "photo-1663131073253-0e19e0eb5c55",
    alt: "Staircase leading to a sliding door",
    photographer: "Zac Gudakov",
    photographerHandle: "zacgudakov",
    kind: "product",
  },
  {
    key: "sliding-timber-pair",
    source: "photo-1768307198334-d176402a3f3d",
    alt: "Two large timber sliding doors opening into a hall",
    photographer: "Ruben Mavarez",
    photographerHandle: "justalifein",
    kind: "product",
  },
  {
    key: "sliding-track-open",
    source: "photo-1772945493132-62afe31ca056",
    alt: "Sliding doors open on an overhead track",
    photographer: "Brooke Balentine",
    photographerHandle: "brookebalentine",
    kind: "product",
  },

  // ------------------------------------------------------------------ bathroom
  {
    key: "bathroom-shelf-black",
    source: "photo-1721160781331-217376049070",
    alt: "Bathroom with a black shelf and mirror",
    photographer: "Daske Shelf",
    photographerHandle: "daske",
    kind: "product",
  },
  {
    key: "bathroom-fitting-black",
    source: "photo-1595428774277-f20931fb8db4",
    alt: "Black bathroom fitting on a white surface",
    photographer: "Sanibell BV",
    photographerHandle: "sanibell",
    kind: "product",
  },
  {
    key: "towel-rail-white",
    source: "photo-1721161862977-b9e580533140",
    alt: "White towel hanging from a rail beside a shower",
    photographer: "Daske Shelf",
    photographerHandle: "daske",
    kind: "product",
  },
  {
    key: "bath-brass-tap",
    source: "photo-1711059949530-a3057eac6f1c",
    alt: "Brass tap beside a white bath",
    photographer: "Lisha Riabinina",
    photographerHandle: "weekendtripcreator",
    kind: "product",
  },
  {
    key: "window-frame-white",
    source: "photo-1629819481704-ed9d9bfb036a",
    alt: "White timber window frame against a white wall",
    photographer: "Alfonso Escu",
    photographerHandle: "alfonsescu",
    kind: "product",
  },

  // --------------------------------------------------------------- accessories
  {
    key: "numeral-seven",
    source: "photo-1710002580424-8073c65557a2",
    alt: "House numeral seven mounted on a white wall",
    photographer: "Alex Skobe",
    photographerHandle: "alex_skobe",
    kind: "product",
  },
  {
    key: "numeral-fifteen",
    source: "photo-1710002580308-58c7c26a466e",
    alt: "House numerals mounted on an exterior wall",
    photographer: "Alex Skobe",
    photographerHandle: "alex_skobe",
    kind: "product",
  },

  // -------------------------------------------------- architecture and interiors
  {
    key: "house-pergola-dusk",
    source: "photo-1633354747567-e0682586f082",
    alt: "Modern house with a pergola roof and warm evening light",
    photographer: "Juan Verdaguer Aguerrebehere",
    photographerHandle: "urbanrival",
    kind: "architecture",
  },
  {
    key: "house-hillside",
    source: "photo-1698994705178-d244d73ea573",
    alt: "Modern house on a hillside surrounded by trees and rock",
    photographer: "Juan Verdaguer Aguerrebehere",
    photographerHandle: "urbanrival",
    kind: "architecture",
  },
  {
    key: "house-walkway",
    source: "photo-1635006459494-c9b9665a666e",
    alt: "Modern house with a walkway leading to the entrance",
    photographer: "Billy Jo Catbagan",
    photographerHandle: "billy_sixteenstudio",
    kind: "architecture",
  },
  {
    key: "house-timber-sky",
    source: "photo-1591474200742-8e512e6f98f8",
    alt: "White and timber house under a blue sky",
    photographer: "Naomi Ellsworth",
    photographerHandle: "naomi_ruth",
    kind: "architecture",
  },
  {
    key: "house-white-black-door",
    source: "photo-1660361339436-ddd4b85372da",
    alt: "White building with a black entrance door",
    photographer: "Bilal Mansuri",
    photographerHandle: "itsbilalmn",
    kind: "architecture",
  },
  {
    key: "interior-seating",
    source: "photo-1567016376408-0226e4d0c1ea",
    alt: "Upholstered seating in a calm interior",
    photographer: "Inside Weather",
    photographerHandle: "insideweather",
    kind: "architecture",
  },
  {
    key: "interior-window-light",
    source: "photo-1599696848652-f0ff23bc911f",
    alt: "Sofa beside a large window in daylight",
    photographer: "Aranprime",
    photographerHandle: "aranprime",
    kind: "architecture",
  },
  {
    key: "kitchen-timber",
    source: "photo-1512916194211-3f2b7f5f7de3",
    alt: "Timber kitchen cabinetry in warm light",
    photographer: "Frames For Your Heart",
    photographerHandle: "framesforyourheart",
    kind: "architecture",
  },
  {
    key: "stair-lighter-railing",
    source: "photo-1529160638848-c6c71fee1cb7",
    alt: "Staircase with a slim metal railing",
    photographer: "Alessia Cocconi",
    photographerHandle: "alessia_cocconi",
    kind: "architecture",
  },
  {
    key: "stair-timber-curve",
    source: "photo-1582528616547-b024caa3c7cc",
    alt: "Curved timber staircase inside a building",
    photographer: "Redd Francisco",
    photographerHandle: "reddfrancisco",
    kind: "architecture",
  },
  {
    key: "stair-spiral-white",
    source: "photo-1587574640043-c22c11ddddc0",
    alt: "White spiral staircase seen from above",
    photographer: "Ibrahim Abazid",
    photographerHandle: "iabzd",
    kind: "architecture",
  },
  {
    key: "entrance-timber-slats",
    source: "photo-1659720879327-827462ca3942",
    alt: "Entrance door faced with timber slats",
    photographer: "Hans",
    photographerHandle: "hansphoto",
    kind: "architecture",
  },
  {
    key: "entrance-black-glass",
    source: "photo-1624210473530-62ac2173fcf8",
    alt: "Black framed glass entrance door",
    photographer: "Capped X",
    photographerHandle: "cappedx",
    kind: "architecture",
  },
  {
    key: "entrance-timber-square",
    source: "photo-1776632001065-ad9efe3ee60e",
    alt: "Modern timber door with square pull handles",
    photographer: "Margo Evardson",
    photographerHandle: "stadinstudio",
    kind: "architecture",
  },
];

export const photosByKey = new Map(curatedPhotos.map((photo) => [photo.key, photo]));

/** Public path a downloaded photograph is served from. */
export function photoPath(key: string): string {
  return `/uploads/catalogue/${key}.jpg`;
}

/**
 * Nepali character.
 *
 * Brick is the material Kathmandu builds in, and the carved timber window set
 * into brick is the detail the valley is known for. These photographs carry
 * that character through the site without resorting to flags or motifs pasted
 * onto a generic template.
 */
export const nepaliPhotos: CuratedPhoto[] = [
  {
    key: "house-brick-modern",
    source: "photo-1696237461860-630be53f179c",
    alt: "Modern brick house with dark framed windows and a planted garden",
    photographer: "Bohdan Stocek",
    photographerHandle: "bohdans",
    kind: "architecture",
  },
  {
    key: "brick-screen-entrance",
    source: "photo-1668154860310-e5c92f02fe62",
    alt: "Entrance steps beside a perforated brick screen wall",
    photographer: "George Dagerotip",
    photographerHandle: "dagerotip",
    kind: "architecture",
  },
  {
    key: "brick-house-white",
    source: "photo-1606989254307-863681926e43",
    alt: "Brick and white rendered house behind a clipped hedge",
    photographer: "Tanya Prodaan",
    photographerHandle: "tannnpro",
    kind: "architecture",
  },
  {
    key: "brick-gable-glass",
    source: "photo-1704457031641-46056ffe4c64",
    alt: "Modern brick house with large windows and glass blocks",
    photographer: "Yudiono Putranto",
    photographerHandle: "yudiono182",
    kind: "architecture",
  },
  {
    key: "terracotta-relief",
    source: "photo-1608533240313-cf1fc98ccca5",
    alt: "Terracotta brick wall laid in a deep relief pattern",
    photographer: "Alejandro Barba",
    photographerHandle: "albrb",
    kind: "architecture",
  },
  {
    key: "terracotta-slats",
    source: "photo-1635881582200-c9d93a83248a",
    alt: "Building faced in fine terracotta slats against a blue sky",
    photographer: "Sasha Pleshco",
    photographerHandle: "thecyclichedgehog",
    kind: "architecture",
  },
  {
    key: "newari-window-brick",
    source: "photo-1760366621797-403f4d375d93",
    alt: "Carved timber window set into a brick wall in the Kathmandu valley",
    photographer: "Sushanta Rokka",
    photographerHandle: "sanoyatra",
    kind: "architecture",
  },
  {
    key: "newari-doors-gilt",
    source: "photo-1755010873839-d1cdbdc77ab2",
    alt: "Three ornate gilded doors in a weathered brick facade",
    photographer: "Sushanta Rokka",
    photographerHandle: "sanoyatra",
    kind: "architecture",
  },
  {
    key: "brick-street-valley",
    source: "photo-1697438671582-37bcb5b7ee3d",
    alt: "Narrow street lined with old brick buildings",
    photographer: "Hasanuzzaman Ovi",
    photographerHandle: "hasanuzzamanovi",
    kind: "architecture",
  },
  {
    key: "brick-window-detail",
    source: "photo-1650137918743-25b56e27df65",
    alt: "Close view of a window set into a brick facade",
    photographer: "Neha Maheen Mahfin",
    photographerHandle: "neha1301039",
    kind: "architecture",
  },
];

curatedPhotos.push(...nepaliPhotos);

for (const photo of nepaliPhotos) {
  photosByKey.set(photo.key, photo);
}

/**
 * Demo accounts, editable site content and sample inquiries.
 *
 * The inquiries exist so that the manager dashboard, the chat space and the
 * customer inquiry history all have realistic content to work against from the
 * first run, in several different states.
 */

export const demoUsers = [
  {
    email: "admin@malhotraenterprise.com.np",
    password: "AdminPass123",
    fullName: "Rohan Malhotra",
    role: "ADMIN" as const,
    phone: "+977 98 41000001",
    verified: true,
  },
  {
    email: "manager@malhotraenterprise.com.np",
    password: "ManagerPass123",
    fullName: "Sunita Rai",
    role: "MANAGER" as const,
    phone: "+977 98 41000002",
    verified: true,
  },
  {
    email: "sales@malhotraenterprise.com.np",
    password: "ManagerPass123",
    fullName: "Bikash Thapa",
    role: "MANAGER" as const,
    phone: "+977 98 41000003",
    verified: true,
  },
  {
    email: "customer@example.com",
    password: "CustomerPass123",
    fullName: "Anjali Shrestha",
    role: "USER" as const,
    phone: "+977 98 51000004",
    companyName: "Shrestha Interiors",
    verified: true,
  },
];

/**
 * Homepage and contact content. Administrators edit these records rather than
 * asking a developer to change a component.
 */
export const siteContent = [
  {
    key: "home.hero",
    description: "Headline, supporting text and image shown at the top of the home page.",
    value: {
      eyebrow: "Architectural and home hardware",
      headline: "Hardware that completes the space",
      body: "Explore architectural hardware designed for modern homes, commercial spaces and interior projects.",
      primaryLabel: "Explore Products",
      primaryHref: "/products",
      secondaryLabel: "Start an Inquiry",
      secondaryHref: "/inquiry",
      image: "house-brick-modern",
      // Points marked on the photograph, each tied to a real product code. An
      // administrator moves a point by editing x and y, which are percentages
      // across and down the image, and swaps the product by changing the code.
      hotspots: [
        { x: 33, y: 29, code: "ME DH 2070", label: "Balcony door" },
        { x: 69, y: 27, code: "ME AA 1330", label: "Window stay" },
        { x: 42, y: 39, code: "ME AA 1310", label: "House numeral" },
        { x: 88, y: 54, code: "ME SD 1110", label: "Garage track" },
        { x: 19, y: 52, code: "ME GH 9030", label: "Glazed door pull" },
      ],
    },
  },
  {
    key: "home.reasons",
    description: "The reasons shown in the section explaining why customers choose us.",
    value: {
      eyebrow: "Why Malhotra Enterprise",
      headline: "Specified once, supplied properly",
      items: [
        {
          title: "Stock held in Kathmandu",
          note: "Over 3,000 lines on the shelf",
          body: "The lines architects specify most are on our shelves, so a project does not wait six weeks for a handle.",
        },
        {
          title: "Consistent across a project",
          note: "Batch matched finishes",
          body: "Finishes are matched batch to batch, so the hardware on the last door matches the hardware on the first.",
        },
        {
          title: "Specification support",
          note: "Door schedules read the same week",
          body: "Send drawings or a door schedule and our team will work through the ironmongery with you.",
        },
        {
          title: "Serviceable after handover",
          note: "Spares held for ten years",
          body: "Spares, cylinders and replacement parts stay available long after a building is occupied.",
        },
      ],
    },
  },
  {
    key: "home.inspiration",
    description: "Photographs shown in the architectural inspiration section.",
    value: {
      eyebrow: "Architectural inspiration",
      headline: "Where our hardware is put to work",
      images: [
        "entrance-timber-slats",
        "stair-timber-curve",
        "kitchen-timber",
        "interior-window-light",
        "house-walkway",
        "entrance-black-glass",
      ],
    },
  },
  {
    key: "company.contact",
    description: "Contact details shown in the footer, on the contact page and in emails.",
    value: {
      phone: "+977 1 4000000",
      whatsapp: "9779800000000",
      email: "inquiries@malhotraenterprise.com.np",
      addressLines: ["New Road", "Kathmandu 44600", "Nepal"],
      hours: [
        { days: "Sunday to Friday", time: "10:00 to 18:00" },
        { days: "Saturday", time: "Closed" },
      ],
      mapNote: "Our counter is a short walk from New Road gate.",
    },
  },
  {
    key: "company.about",
    description: "Company description used on the about page.",
    value: {
      headline: "Hardware for the way Kathmandu builds",
      paragraphs: [
        "Malhotra Enterprise supplies architectural and home hardware to builders, architects and homeowners across the Kathmandu valley. We began as a counter on New Road and now hold stock for residential projects, commercial fit outs and interior work across Nepal.",
        "We keep the ranges that architects specify repeatedly, because a project stalls when a single handle is unavailable. Finishes are matched between batches, spares stay available after handover, and our team will work through a door schedule with you rather than sending a price list and hoping for the best.",
        "If a product is not on these pages, ask. A large part of what we supply is sourced to order against a drawing or a sample.",
      ],
      image: "house-hillside",
    },
  },
];

export type DemoInquirySeed = {
  sequence: number;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  projectName?: string;
  projectLocation?: string;
  message: string;
  additionalRequirements?: string;
  status:
    | "NEW"
    | "UNDER_REVIEW"
    | "AWAITING_CUSTOMER"
    | "CUSTOMER_RESPONDED"
    | "QUOTATION_PENDING"
    | "QUOTATION_SENT"
    | "COMPLETED"
    | "CLOSED";
  /** Links the inquiry to the demo customer account when true. */
  linkedToCustomer?: boolean;
  assignTo?: string;
  daysAgo: number;
  items: Array<{ code: string; quantity: number; note?: string; finish?: string }>;
  conversation: Array<{
    from: "CUSTOMER" | "MANAGER";
    body: string;
    hoursAfter: number;
  }>;
};

export const demoInquiries: DemoInquirySeed[] = [
  {
    sequence: 1,
    fullName: "Anjali Shrestha",
    email: "customer@example.com",
    phone: "+977 98 51000004",
    companyName: "Shrestha Interiors",
    projectName: "Bhaisepati Residence",
    projectLocation: "Bhaisepati, Lalitpur",
    message:
      "We are fitting out a four bedroom house and need matching hardware throughout. Please confirm availability and lead time for the quantities below. The client would like everything in the same finish family.",
    additionalRequirements:
      "All items in matt black if possible. We need delivery before the end of next month.",
    status: "QUOTATION_SENT",
    linkedToCustomer: true,
    assignTo: "manager@malhotraenterprise.com.np",
    daysAgo: 12,
    items: [
      { code: "ME DH 2040", quantity: 14, note: "One per internal door", finish: "matt-black" },
      { code: "ME HG 1010", quantity: 28, note: "Two hinges per leaf", finish: "matt-black" },
      { code: "ME CL 6020", quantity: 14, finish: "satin-stainless" },
      { code: "ME BH 1210", quantity: 4, note: "Three bathrooms and one utility", finish: "matt-black" },
    ],
    conversation: [
      {
        from: "MANAGER",
        body: "Thank you for the detailed list. All four lines are available in matt black. The hinges are in stock, the levers and latches are in stock, and the towel rails are made to order with a two week lead time. I am preparing a quotation now.",
        hoursAfter: 4,
      },
      {
        from: "CUSTOMER",
        body: "That works. Please add two extra levers as spares. Can you also confirm the hinges will carry a forty five millimetre solid core leaf?",
        hoursAfter: 20,
      },
      {
        from: "MANAGER",
        body: "Two spare levers added. The Elevate hinge is rated to sixty kilograms in a pair, which covers a forty five millimetre solid core leaf comfortably. I would suggest three hinges per leaf on the two taller doors. The quotation is attached to this thread and also sent to your email.",
        hoursAfter: 26,
      },
    ],
  },
  {
    sequence: 2,
    fullName: "Prakash Adhikari",
    email: "prakash.adhikari@example.com",
    phone: "+977 98 12000010",
    companyName: "Adhikari Builders",
    projectName: "Thamel Boutique Hotel",
    projectLocation: "Thamel, Kathmandu",
    message:
      "Fourteen guest rooms plus reception. I need door closers and entrance hardware that will survive constant use. Please advise what you would specify and roughly what it comes to.",
    status: "UNDER_REVIEW",
    assignTo: "sales@malhotraenterprise.com.np",
    daysAgo: 3,
    items: [
      { code: "ME DC 4010", quantity: 16, note: "Guest room doors and two lobby doors" },
      { code: "ME DH 2020", quantity: 16 },
      { code: "ME ML 5010", quantity: 16 },
    ],
    conversation: [
      {
        from: "MANAGER",
        body: "Thank you for getting in touch. For a hotel corridor I would specify the Axis closer with backcheck adjusted, because guests push doors hard against the wall. I am checking stock on sixteen units and will come back to you tomorrow with lead times and a price.",
        hoursAfter: 6,
      },
    ],
  },
  {
    sequence: 3,
    fullName: "Maya Gurung",
    email: "maya.gurung@example.com",
    phone: "+977 98 61000022",
    projectName: "Apartment renovation",
    projectLocation: "Baluwatar, Kathmandu",
    message:
      "I am replacing all the cabinet handles in my kitchen. There are eighteen drawer fronts and twelve cupboard doors. I like the brass ones but I am not sure which size suits a standard drawer.",
    status: "AWAITING_CUSTOMER",
    assignTo: "manager@malhotraenterprise.com.np",
    daysAgo: 6,
    items: [
      { code: "ME CH 8010", quantity: 18, note: "Drawer fronts", finish: "satin-brass" },
      { code: "ME CH 8030", quantity: 12, note: "Cupboard doors", finish: "antique-brass" },
    ],
    conversation: [
      {
        from: "MANAGER",
        body: "For a standard six hundred millimetre drawer front the one hundred and sixty millimetre Ember pull looks right, and the smaller ninety six millimetre version suits drawers under four hundred millimetres. Could you measure two or three of your drawer fronts and let me know the widths? I will then confirm the sizes before we quote.",
        hoursAfter: 5,
      },
    ],
  },
  {
    sequence: 4,
    fullName: "Deepak Tamang",
    email: "deepak.tamang@example.com",
    phone: "+977 98 45000033",
    companyName: "Himalayan Office Interiors",
    projectName: "Corporate office fit out",
    projectLocation: "Naxal, Kathmandu",
    message:
      "We need glass door hardware for a meeting room partition, four sets in total. Please quote patch fittings, locks and pull handles in satin stainless.",
    status: "NEW",
    daysAgo: 0,
    items: [
      { code: "ME GH 9010", quantity: 4 },
      { code: "ME GH 9020", quantity: 2, note: "Only the two lockable rooms" },
      { code: "ME GH 9030", quantity: 4, finish: "satin-stainless" },
    ],
    conversation: [],
  },
  {
    sequence: 5,
    fullName: "Sarita Karki",
    email: "sarita.karki@example.com",
    phone: "+977 98 08000044",
    projectName: "Village school gates",
    projectLocation: "Kavre",
    message:
      "We need padlocks and bolts for eight gates and store rooms at a school. They sit outside all year so they need to handle the monsoon. What would you recommend?",
    status: "COMPLETED",
    assignTo: "sales@malhotraenterprise.com.np",
    daysAgo: 34,
    items: [
      { code: "ME SH 1640", quantity: 8 },
      { code: "ME SH 1660", quantity: 8 },
    ],
    conversation: [
      {
        from: "MANAGER",
        body: "For outdoor use through a monsoon I would go with the weatherproof Guardian padlock and the Anchor hasp, both stainless. Ordinary plated padlocks will seize within a season. I can supply all eight padlocks keyed alike so your caretaker carries one key.",
        hoursAfter: 3,
      },
      {
        from: "CUSTOMER",
        body: "Keyed alike would help a lot. Please go ahead on that basis.",
        hoursAfter: 27,
      },
      {
        from: "MANAGER",
        body: "Order is ready for collection at our New Road counter, and the keys are labelled. Thank you for your custom.",
        hoursAfter: 96,
      },
    ],
  },
];

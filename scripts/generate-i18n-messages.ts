/**
 * One-time generator: English messages from src/data/*.ts
 * Run: pnpm exec tsx scripts/generate-i18n-messages.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { services } from "../src/data/services";
import { areas } from "../src/data/areas";
import { faqCategories, faqTopicChips } from "../src/data/faq";
import { galleryCategories } from "../src/data/gallery";
import { clientReviews, reviewCategories, reviewStats } from "../src/data/reviews";
import {
  navLinks,
  trustProcessItems,
  trustEventTypes,
  whyCards,
  transformationCards,
  galleryPageCategories,
  aiPaths,
  serviceCards,
  estimateSteps,
  siteConfig,
} from "../src/data/site";
import {
  estimateBuilderSteps,
  eventTypes,
  venueSettings,
  drapeGoals,
  runLayouts,
  floorPlanOptions,
  measurementsKnownOptions,
  heightOptions,
  fabricDirections,
  fullnessOptions,
  addOnOptions,
} from "../src/data/estimate";
import enEstimate from "../messages/en/estimate.json";

function estimateOptions(
  arr: Array<{ id: string; label: string; description?: string }>
) {
  return Object.fromEntries(
    arr.map((o) => [
      o.id,
      {
        label: o.label,
        ...(o.description ? { description: o.description } : {}),
      },
    ])
  );
}

const servicesMsg: Record<string, unknown> = {};
for (const s of services) {
  servicesMsg[s.slug] = {
    title: s.title,
    shortTitle: s.shortTitle,
    hubCardDescription: s.hubCardDescription,
    intro: s.intro,
    whatItIs: s.whatItIs,
    bestUseCases: s.bestUseCases,
    planningFactors: s.planningFactors,
    whatWeHandle: s.whatWeHandle,
    faq: s.faq,
    metaTitle: s.metaTitle,
    metaDescription: s.metaDescription,
  };
}

const areasMsg: Record<string, unknown> = {};
for (const a of areas) {
  areasMsg[a.slug] = {
    name: a.name,
    title: a.title,
    intro: a.intro,
    servicesAvailable: a.servicesAvailable,
    eventTypes: a.eventTypes,
    planningNotes: a.planningNotes,
    metaTitle: a.metaTitle,
    metaDescription: a.metaDescription,
  };
}

const galleryCategoryKeys = [
  "weddings",
  "corporate",
  "galas",
  "mitzvahs",
  "stage",
  "room-transformations",
];

const messages = {
  common: {
    brand: siteConfig.name,
    tagline: siteConfig.tagline,
    motto: siteConfig.motto,
    location: siteConfig.location,
    getEstimate: "Get Estimate",
    requestEstimate: "Request an Estimate",
    viewServices: "View Services",
    viewService: "View service",
    contact: "Contact",
    contactBrand: "Contact The Curtain Guy",
    allServices: "All services",
    home: "Home",
    services: "Services",
    faq: "FAQ",
    reviews: "Reviews",
    privacy: "Privacy",
    navigate: "Navigate",
    theme: "Theme",
    openMenu: "Open menu",
    copyright: "All rights reserved.",
    quoteCta: {
      headline: "Tell us what you are planning.",
      description:
        "Share your venue, event type, and draping goals. We review your brief and follow up with a rental estimate conversation — full-service delivery, installation, and teardown.",
    },
    ctaBand: {
      headline: "Ready to transform your venue?",
      description:
        "Share your event details and draping goals. We review your brief and follow up with a rental estimate conversation.",
    },
    footer: {
      blurb:
        "Luxury event drape rentals for Montreal weddings, corporate events, galas, mitzvahs, and venue transformations. Full-service rental with delivery, installation, and teardown.",
      locationLine: "Montreal, Quebec, Canada",
    },
    breadcrumbs: {
      home: "Home",
      services: "Services",
    },
  },
  nav: {
    links: Object.fromEntries(
      navLinks.map((l) => [l.href === "/" ? "home" : l.href.slice(1).replace(/\//g, "-"), l.label])
    ),
  },
  home: {
    hero: {
      eyebrow: "The Curtain Guy · Montreal",
      title: "Luxury Event Drape Rentals in Montreal",
      description:
        "Premium draping, pipe and drape, backdrops, blackout masking, and venue transformations for weddings, galas, corporate events, and milestone celebrations.",
    },
    trust: {
      capability: "Capability",
      process: trustProcessItems.map((i) => i.label),
      eventTypes: trustEventTypes.map((i) => i.label),
    },
    services: {
      eyebrow: "Services",
      title: "Event drape rental services",
      description:
        "Luxury temporary draping for Montreal weddings, corporate events, galas, mitzvahs, and venue transformations.",
    },
    howItWorks: {
      eyebrow: "How it works",
      title: "From brief to installed draping",
      description:
        "A full-service rental process — not drop-off fabric. We plan, deliver, install, and teardown around your event timeline.",
      steps: estimateSteps.map((s) => ({ title: s.title, description: s.description })),
      cta: "Start your estimate",
    },
    why: {
      eyebrow: "Why The Curtain Guy",
      title: "Luxury event draping, managed end to end",
      description:
        "Premium fabrics, experienced crews, and planning shaped around Montreal venues — from intimate celebrations to full ballroom transformations.",
      cards: whyCards,
    },
    transformation: {
      eyebrow: "Venue transformation",
      title: "What event draping can do",
      description:
        "Temporary fabric architecture that reshapes rooms, masks unfinished walls, and creates focal moments.",
      cards: transformationCards,
    },
    estimatePromo: {
      eyebrow: "Get Estimate",
      title: "Share your venue and draping goals",
      description:
        "Our multi-step estimate builder captures event details, measurements, fabric direction, and add-ons — so we can quote accurately.",
      cta: "Start estimate",
      features: [
        "Event date & venue",
        "Drape goals & measurements",
        "Fabric & add-ons",
        "Fast team follow-up",
      ],
    },
    galleryTeaser: {
      eyebrow: "Gallery",
      title: "Event draping inspiration",
      description:
        "Weddings, galas, corporate events, and venue transformations — explore the atmosphere we create with luxury event draping.",
      explore: "Explore Gallery",
    },
    areasTeaser: {
      eyebrow: "Service areas",
      title: "Montreal & surrounding areas",
      description:
        "Luxury event drape rentals across Montreal, Laval, Longueuil, and the West Island — full-service delivery, installation, and teardown.",
      viewArea: "View area",
    },
    aiTeaser: {
      eyebrow: "Studio",
      title: "Plan your drape layout",
      description:
        "Sketch your room, add drape runs, and preview in 3D — a planning tool built for event rental, not residential curtains.",
      badge: "Destination",
      cta: "Open Studio",
      secondary: "Learn more",
      paths: aiPaths,
    },
    serviceCards: serviceCards.map((c) => ({
      title: c.title,
      description: c.description,
    })),
    meta: {
      title: "Luxury Event Drape Rentals Montreal",
      description:
        "Luxury event drape rentals in Montreal — premium draping, pipe and drape, backdrops, blackout masking, and venue transformations for weddings, galas, corporate events, and celebrations.",
    },
  },
  services: {
    hub: {
      eyebrow: "Event Drape Rentals",
      title: "Event Drape Rental Services",
      description:
        "Luxury temporary draping for Montreal weddings, corporate events, galas, mitzvahs, and venue transformations — full-service rental with delivery, installation, and teardown.",
      notSureTitle: "Not sure what you need?",
      notSureDescription:
        "Tell us about your venue and goals. We recommend the right draping approach — pipe and drape, backdrops, room dividers, or full transformation.",
      metaTitle: "Event Drape Rental Services Montreal",
      metaDescription:
        "Luxury event drape rental services in Montreal — wedding draping, pipe and drape, corporate events, stage backdrops, blackout masking, and venue transformations.",
    },
    detail: {
      eyebrow: "Event Drape Rental",
      whatItIs: "What this service is",
      bestUseCases: "Best use cases",
      planningFactors: "What affects planning",
      whatWeHandle: "What The Curtain Guy handles",
      commonQuestions: "Common questions",
      inspirationExample: "Inspiration example",
      visualContext: "Visual context",
      visualContextTitle: "Planned around your Montreal venue",
      visualContextBody:
        "Inspiration imagery — owner project photography will replace stock as events are documented.",
      relatedServices: "Related services",
      ctaHeadline: "Plan {service} for your Montreal event.",
      ctaDescription:
        "Share your venue, date, and draping goals. We review your brief and follow up with a rental estimate conversation.",
    },
    trustCapabilities: services.map((s) => s.shortTitle),
    ...servicesMsg,
  },
  areas: {
    page: {
      serving: "Serving {name}",
      servicesAvailable: "Services available in {name}",
      eventTypes: "Event types",
      planning: "Planning considerations",
      planningIntro:
        "Every {name} venue is different. These notes help us plan delivery, installation, and teardown around your event.",
      exploreServices: "Explore key services",
      ctaHeadline: "Plan event draping in {name}.",
      ctaDescription:
        "Share your venue, date, and draping goals. We review your brief and follow up with a rental estimate conversation.",
    },
    ...areasMsg,
  },
  faq: {
    categories: Object.fromEntries(
      faqCategories.map((c) => [
        c.id,
        { label: c.label, description: c.description },
      ])
    ),
    items: Object.fromEntries(
      faqCategories.map((c) => [c.id, c.items])
    ),
    topicChips: faqTopicChips,
    page: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      description:
        "Answers about luxury event drape rentals in Montreal — what we do, how estimates work, venue planning, and our Studio tool.",
      popularTopics: "Popular topics",
      nextSteps: "Next steps",
      open: "Open",
      metaTitle: "Event Drape Rental FAQ Montreal",
      metaDescription:
        "Frequently asked questions about luxury event drape rentals in Montreal — estimates, venue planning, full-service installation, and Studio tools.",
    },
    quickLinks: {
      estimate: {
        label: "Get Estimate",
        description: "Share your venue and draping goals for a tailored quote.",
      },
      contact: {
        label: "Contact",
        description: "Reach our team directly for planning questions.",
      },
      services: {
        label: "Services",
        description: "Explore wedding, corporate, stage, and venue draping.",
      },
      studio: {
        label: "Studio",
        description: "Sketch your room and preview draping in 3D.",
      },
    },
    cta: {
      headline: "Still have questions?",
      description:
        "Share your venue and draping goals — we follow up with a rental estimate conversation.",
    },
  },
  gallery: {
    page: {
      eyebrow: "Gallery",
      title: "Event draping inspiration",
      description:
        "Explore wedding, corporate, gala, and venue transformation draping — inspiration imagery for Montreal event rentals.",
      relatedService: "Related service",
      inspiration: "Inspiration",
      uploadTitle: "Have photos from your event?",
      uploadDescription:
        "We are building a portfolio of real Montreal projects. Share your event photos and we may feature them with permission.",
      uploadCta: "Contact us to share",
      metaTitle: "Event Draping Gallery Montreal",
      metaDescription:
        "Event draping inspiration gallery — weddings, galas, corporate events, and venue transformations in Montreal.",
    },
    categories: Object.fromEntries(
      galleryCategories.map((c, i) => [
        galleryCategoryKeys[i] ?? c.label,
        { label: c.label, description: c.description },
      ])
    ),
    pageCategories: Object.fromEntries(
      galleryPageCategories.map((c) => [
        c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        { label: c.label, description: c.description },
      ])
    ),
    cta: {
      headline: "Ready to transform your venue?",
      description:
        "Share your event details and draping goals. We review your brief and follow up with a rental estimate conversation.",
    },
  },
  reviews: {
    page: {
      eyebrow: "Reviews",
      title: "Client experiences",
      description:
        "What planners, couples, and production teams say about working with The Curtain Guy on Montreal event draping.",
      shareCta: "Share your experience",
      getEstimate: "Get Estimate",
      metaTitle: "Event Drape Rental Reviews Montreal",
      metaDescription:
        "Client reviews for The Curtain Guy — luxury event drape rentals in Montreal for weddings, corporate events, galas, and venue transformations.",
    },
    categories: Object.fromEntries(
      reviewCategories.map((c) => [c.id, c.label])
    ),
    stats: Object.fromEntries(
      reviewStats.map((s, i) => [`stat${i + 1}`, { value: s.value, label: s.label }])
    ),
    items: Object.fromEntries(
      clientReviews.map((r, i) => [
        `r${String(i + 1).padStart(2, "0")}`,
        {
          name: r.name,
          role: r.role,
          organization: r.organization,
          venue: r.venue,
          location: r.location,
          eventLabel: r.eventLabel,
          quote: r.quote,
        },
      ])
    ),
    showcase: {
      featuredEyebrow: "Featured",
      featuredTitle: "Trusted by Montreal event professionals",
      filterAll: "All experiences",
      readMore: "Read more",
      showLess: "Show less",
    },
    shareDialog: {
      title: "Share your experience",
      description:
        "Tell us about your event draping experience with The Curtain Guy. Submissions are reviewed before publishing.",
      name: "Your name",
      role: "Your role",
      organization: "Organization (optional)",
      venue: "Venue (optional)",
      location: "Location",
      eventType: "Event type",
      rating: "Rating",
      quote: "Your experience",
      quotePlaceholder: "Share what stood out about the draping, installation, or service...",
      submit: "Submit review",
      submitting: "Submitting...",
      successTitle: "Thank you!",
      successDescription:
        "Your submission has been received. Our team reviews experiences before they appear on the site.",
      close: "Close",
      errors: {
        generic: "Something went wrong. Please try again.",
        name: "Name is required.",
        role: "Role is required.",
        location: "Location is required.",
        eventType: "Event type is required.",
        quote: "Please share your experience.",
        rating: "Please select a rating.",
      },
    },
  },
  about: {
    page: {
      eyebrow: "About",
      title: "Luxury event draping in Montreal",
      description:
        "The Curtain Guy rents temporary event draping for live occasions — full-service delivery, installation, and teardown across Montreal and surrounding areas.",
      whatWeDo: "What we do",
      paragraph1:
        "We are a luxury event drape rental company serving Montreal and surrounding areas. Our work is temporary draping for weddings, galas, corporate events, mitzvahs, and venue transformations — not residential window treatments.",
      paragraph2:
        "Every project includes planning, delivery, professional installation, and teardown. Hardware, rigging safety, and finishing details are handled by experienced crews who respect your timeline and venue requirements.",
      valuesTitle: "What guides our work",
      metaTitle: "About The Curtain Guy Montreal",
      metaDescription:
        "About The Curtain Guy — luxury event drape rentals in Montreal with full-service delivery, installation, and teardown for weddings, galas, and corporate events.",
    },
    values: [
      {
        title: "Luxury event finish",
        description:
          "Premium fabrics and installation details that elevate every venue — never a basic rental catalog look.",
      },
      {
        title: "Full-service rental",
        description:
          "Delivery, installation, and teardown managed end to end — temporary event draping as a complete service.",
      },
      {
        title: "Venue-first planning",
        description:
          "Every setup is shaped by your room, event type, and atmosphere goals — from intimate celebrations to full ballroom transformations.",
      },
      {
        title: "Montreal-focused",
        description:
          "Local venue knowledge and responsive event-day support across Montreal, Laval, Longueuil, and the West Island.",
      },
    ],
  },
  contact: {
    page: {
      eyebrow: "Contact",
      title: "Get in touch",
      description:
        "Questions about event draping, availability, or your venue? Reach our Montreal team — we respond to planning inquiries promptly.",
      phone: "Phone",
      email: "Email",
      serviceArea: "Service area",
      preferEstimate: "Prefer a structured brief?",
      preferEstimateDescription:
        "Our Get Estimate builder captures event details, measurements, and draping goals for a faster, more accurate quote.",
      metaTitle: "Contact The Curtain Guy Montreal",
      metaDescription:
        "Contact The Curtain Guy for luxury event drape rentals in Montreal — weddings, corporate events, galas, and venue transformations.",
    },
    form: {
      name: "Name",
      email: "Email",
      phone: "Phone (optional)",
      eventType: "Event type",
      eventTypePlaceholder: "Select event type",
      message: "Message",
      messagePlaceholder: "Tell us about your venue, date, and draping goals...",
      submit: "Send message",
      submitting: "Sending...",
      successTitle: "Message sent",
      successDescription:
        "Thank you — we received your message and will follow up shortly.",
      sendAnother: "Send another message",
      errors: {
        name: "Name is required.",
        email: "A valid email is required.",
        message: "Message is required.",
        eventType: "Event type is required.",
        generic: "Something went wrong. Please try again.",
      },
    },
  },
  privacy: {
    page: {
      eyebrow: "Privacy",
      title: "Privacy policy",
      description: "How The Curtain Guy collects, uses, and protects your information.",
      lastUpdated: "Last updated",
      metaTitle: "Privacy Policy | The Curtain Guy",
      metaDescription:
        "Privacy policy for The Curtain Guy — how we handle contact forms, estimate requests, and account information.",
    },
    sections: [
      {
        title: "Information we collect",
        body: "We collect information you provide through contact forms, estimate requests, account registration, and review submissions — including name, email, phone, event details, and messages.",
      },
      {
        title: "How we use your information",
        body: "We use your information to respond to inquiries, prepare rental estimates, coordinate event draping services, manage accounts, and improve our services. We do not sell your personal information.",
      },
      {
        title: "Estimate and event data",
        body: "Estimate briefs may include venue details, measurements, floor plans, and inspiration files you upload. This data is used to prepare quotes and plan installations.",
      },
      {
        title: "Cookies and analytics",
        body: "We use essential cookies for authentication and session management. Analytics may be used to understand site usage. You can control theme preferences via local storage.",
      },
      {
        title: "Data retention",
        body: "We retain contact and estimate data as needed to provide services and meet legal obligations. You may request deletion of your account data by contacting us.",
      },
      {
        title: "Contact",
        body: "For privacy questions, contact info@thecurtainguy.com or call 514-963-3193.",
      },
    ],
  },
  estimate: {
    page: {
      eyebrow: "Get Estimate",
      title: "Request an event drape estimate",
      description:
        "Share your venue, event type, and draping goals. Our team reviews your brief and follows up with a tailored rental estimate conversation.",
      studioPromo:
        "Want to sketch your room first? Use Studio to add drape runs and preview in 3D — then return here to submit your brief.",
      studioLink: "Open Studio",
      metaTitle: "Get Event Drape Estimate Montreal",
      metaDescription:
        "Request a luxury event drape rental estimate in Montreal — share venue details, draping goals, measurements, and fabric preferences.",
    },
    intro: {
      eyebrow: "Estimate builder",
      title: "Build your event drape brief",
      description:
        "A guided form that captures what we need to quote accurately — event details, draping goals, measurements, fabric direction, and add-ons.",
      chips: [
        "Wedding & celebration draping",
        "Corporate & gala polish",
        "Pipe & drape walls",
        "Stage backdrops",
        "Blackout & room dividers",
      ],
      trust: trustProcessItems.map((i) => i.label),
      startCta: "Start estimate",
    },
    steps: enEstimate.steps,
    options: enEstimate.options,
    measurementsReassurance: enEstimate.measurementsReassurance,
    disclaimer: enEstimate.disclaimer,
    summary: enEstimate.summary,
    builder: {
      stepOf: "Step {current} of {total}",
      percentComplete: "{percent}% complete",
      back: "Back",
      next: "Next",
      submit: "Submit estimate request",
      submitting: "Submitting...",
      requiredFields: "Please complete the required fields.",
      contactRequired: "Please add your name and email.",
      submitError: "Something went wrong. Please try again or email us directly.",
      submitErrorNetwork: "Network error. Please check your connection and try again.",
      emailFallback: "Email your brief instead",
      eventBasics: {
        eventType: "Event type",
        eventDate: "Event date",
        guestCount: "Guest count",
        venueName: "Venue name",
        cityArea: "City / area",
        venueSetting: "Indoor or outdoor",
      },
      drapeGoal: {
        title: "What do you want the draping to achieve?",
        subtitle: "Select all that apply.",
      },
      measurements: {
        floorPlan: "Do you have a floor plan?",
        measurementsKnown: "Do you know your measurements?",
        wallLength: "Approximate wall / run length",
        wallLengthPlaceholder: "e.g. 60 ft total perimeter",
        ceilingHeight: "Ceiling height",
        runLayout: "Run layout",
      },
      lookFabric: {
        fabric: "Fabric direction",
        fullness: "Fullness",
        colorNotes: "Color / style notes (optional)",
        colorNotesPlaceholder: "Brand colors, inspiration, or fabric preferences...",
      },
      addOns: {
        title: "Add-ons (optional)",
        subtitle: "Enhancements for your setup.",
      },
      contact: {
        honeypot: "Leave blank",
      },
    },
    validation: {
      eventTypeRequired: "Please select an event type.",
      cityAreaRequired: "Please enter your city or area.",
      drapeGoalsRequired: "Please select at least one drape goal.",
      measurementsKnownRequired: "Please select whether you know your measurements.",
      floorPlanRequired: "Please indicate if you have a floor plan.",
      fabricRequired: "Please select at least one fabric direction.",
      nameRequired: "Please enter your name.",
      emailRequired: "Please enter a valid email address.",
    },
    success: {
      title: "Estimate request received",
      description:
        "Thank you — we received your brief and will follow up with a rental estimate conversation.",
      reference: "Reference",
      uploadPartial:
        "{uploaded} file(s) uploaded. {failed} file(s) could not be uploaded — you can email them to us.",
      guestCta: "Create an account to track your estimate",
      customerCta: "View your estimate",
      ownerCta: "View in admin",
      newEstimate: "Submit another estimate",
    },
    filePicker: {
      label: "Floor plans & inspiration (optional)",
      hint: "PDF, JPG, or PNG — up to 10 MB each.",
      addFiles: "Add files",
      remove: "Remove",
      uploading: "Uploading...",
      uploaded: "Uploaded",
      failed: "Upload failed",
      errors: {
        tooLarge: "File exceeds 10 MB limit.",
        invalidType: "Only PDF, JPG, and PNG files are allowed.",
        maxFiles: "Maximum 5 files allowed.",
      },
    },
  },
  metadata: {
    pages: {
      home: {
        title: "Luxury Event Drape Rentals Montreal",
        description:
          "Luxury event drape rentals in Montreal — premium draping, pipe and drape, backdrops, blackout masking, and venue transformations for weddings, galas, corporate events, and celebrations.",
      },
    },
  },
};

mkdirSync("messages/en", { recursive: true });
for (const [ns, content] of Object.entries(messages)) {
  writeFileSync(
    `messages/en/${ns}.json`,
    `${JSON.stringify(content, null, 2)}\n`
  );
}

console.log(`Generated ${Object.keys(messages).length} English namespaces.`);

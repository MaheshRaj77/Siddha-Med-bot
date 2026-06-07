export type SitePage = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  intro: string;
  highlights: string[];
  sections: { title: string; body: string }[];
};

export const sitePages: SitePage[] = [
  {
    slug: "security",
    eyebrow: "Product",
    title: "Security built for trusted medical knowledge",
    summary: "Protecting questions, documents, and institutional knowledge at every step.",
    intro:
      "Siddha MedBot is designed with a privacy-first mindset. Security controls are part of the product experience, not an afterthought.",
    highlights: ["Encrypted data flows", "Access-aware workspaces", "Privacy-first design"],
    sections: [
      { title: "Data protection", body: "Sensitive content is handled with secure transport, guarded access, and clear boundaries between workspaces." },
      { title: "Responsible access", body: "Institutional teams can keep their knowledge organized while ensuring the right people reach the right material." },
      { title: "Operational care", body: "We continuously review the product experience for safer defaults and clearer user control." },
    ],
  },
  {
    slug: "documentation",
    eyebrow: "Resources",
    title: "Documentation for a smoother start",
    summary: "Learn how to ask, review citations, and work confidently with Siddha MedBot.",
    intro:
      "The documentation hub gives practitioners, students, and research teams a simple path from first question to evidence-backed workflow.",
    highlights: ["Getting started guides", "Citation workflows", "Workspace guidance"],
    sections: [
      { title: "Start with chat", body: "Learn how to frame useful Siddha questions and refine answers with follow-up prompts." },
      { title: "Work with sources", body: "Review citations, inspect supporting material, and keep evidence close to each answer." },
      { title: "Use curated knowledge", body: "Understand how answers are grounded in the existing Siddha resources available inside the product." },
    ],
  },
  {
    slug: "help-center",
    eyebrow: "Resources",
    title: "Help when you need it",
    summary: "Quick guidance for common questions, account support, and product workflows.",
    intro:
      "Find practical answers for everyday use. If your question needs a human touch, the support path is always easy to reach.",
    highlights: ["Account guidance", "Product troubleshooting", "Human support"],
    sections: [
      { title: "Using MedBot", body: "Get answers about chat, citations, subscription limits, and search behavior." },
      { title: "Account support", body: "Find guidance for access, workspace setup, and common sign-in questions." },
      { title: "Still need help?", body: "Reach our team through the contact page and share a short description of what you are trying to do." },
    ],
  },
  {
    slug: "blog",
    eyebrow: "Resources",
    title: "Notes from the Siddha knowledge frontier",
    summary: "Product thinking, research workflows, and practical ideas for evidence-grounded Siddha discovery.",
    intro:
      "Our journal explores the meeting point between traditional knowledge and thoughtful AI-assisted research.",
    highlights: ["Research practices", "Product updates", "Community stories"],
    sections: [
      { title: "Building citation habits", body: "Why evidence-backed answers help teams move faster without losing the thread of the original source." },
      { title: "Designing for practitioners", body: "How clinical context, clarity, and restraint shape the MedBot experience." },
      { title: "Making knowledge searchable", body: "A closer look at turning a rich corpus into a useful daily research companion." },
    ],
  },
  {
    slug: "api",
    eyebrow: "Resources",
    title: "Bring Siddha intelligence into your workflow",
    summary: "A clear integration path for institutions building connected knowledge experiences.",
    intro:
      "The Siddha MedBot API is designed for thoughtful institutional integrations. Connect with us to discuss access and fit.",
    highlights: ["Secure integration", "Source-grounded responses", "Institutional workflows"],
    sections: [
      { title: "Chat integration", body: "Create guided question-and-answer experiences powered by curated Siddha knowledge." },
      { title: "Citation visibility", body: "Keep source references close to generated answers so users can inspect the evidence." },
      { title: "Talk to our team", body: "API access is currently guided. Contact us to shape the right integration for your organization." },
    ],
  },
  {
    slug: "about",
    eyebrow: "Company",
    title: "Ancient wisdom, supported by careful technology",
    summary: "Siddha MedBot helps people explore trusted Siddha knowledge with more clarity and less friction.",
    intro:
      "We are building a calmer, more useful way to navigate a deep medical tradition: one that values sources, context, and responsible assistance.",
    highlights: ["Knowledge access", "Source transparency", "Human-centered AI"],
    sections: [
      { title: "Why we exist", body: "Valuable knowledge should be easier to discover without losing the sources that give it meaning." },
      { title: "Who we serve", body: "Our product supports practitioners, students, researchers, and institutions with different goals but a shared need for clarity." },
      { title: "How we build", body: "We pair modern retrieval tools with careful interface design and a medical safety mindset." },
    ],
  },
  {
    slug: "mission",
    eyebrow: "Company",
    title: "Make Siddha knowledge easier to explore responsibly",
    summary: "Our mission is to improve access while preserving context, evidence, and respect for the tradition.",
    intro:
      "Siddha knowledge deserves tools that make discovery faster without making the experience careless or opaque.",
    highlights: ["Respect the source", "Reduce research friction", "Design for trust"],
    sections: [
      { title: "Access", body: "Help more people find useful starting points across curated knowledge collections." },
      { title: "Evidence", body: "Keep citations visible so discovery remains grounded in source material." },
      { title: "Responsibility", body: "Build an assistant that supports informed exploration rather than replacing professional judgment." },
    ],
  },
  {
    slug: "careers",
    eyebrow: "Company",
    title: "Build thoughtful tools for enduring knowledge",
    summary: "Join a team exploring the careful intersection of Siddha medicine, design, and AI.",
    intro:
      "We value patient thinking, practical craft, and respect for the people who rely on the experiences we create.",
    highlights: ["Meaningful problems", "Curious teammates", "Responsible innovation"],
    sections: [
      { title: "What we care about", body: "Clear product thinking, strong collaboration, and a willingness to handle nuanced problems with care." },
      { title: "How we work", body: "We move with focus, test ideas early, and keep the user experience close to every decision." },
      { title: "Interested?", body: "Send a short introduction through the contact page. We are always glad to meet thoughtful builders." },
    ],
  },
  {
    slug: "contact",
    eyebrow: "Company",
    title: "Let’s start a useful conversation",
    summary: "Talk with our team about support, demos, institutional access, or API integrations.",
    intro:
      "Share a little about your goals and we will help route your question to the right place.",
    highlights: ["Product demos", "Support questions", "Institutional conversations"],
    sections: [
      { title: "General support", body: "For account and product guidance, email support@siddhamedbot.com." },
      { title: "Partnerships", body: "For institutions, research teams, and integrations, email hello@siddhamedbot.com." },
      { title: "Response time", body: "We aim to respond to new conversations within two business days." },
    ],
  },
  {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy with clarity",
    summary: "A plain-language overview of how Siddha MedBot approaches personal and workspace information.",
    intro:
      "We believe privacy should be understandable. This overview explains the principles that guide the product while formal policies are finalized.",
    highlights: ["Purpose-limited handling", "Secure workflows", "User control"],
    sections: [
      { title: "Information handling", body: "We use information to provide, protect, and improve the Siddha MedBot experience." },
      { title: "Sensitive content", body: "Avoid sharing unnecessary personal or identifying medical information when asking general knowledge questions." },
      { title: "Questions", body: "For privacy-related requests, reach our team through the contact page." },
    ],
  },
  {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms for responsible use",
    summary: "The key expectations that help keep Siddha MedBot useful, respectful, and safe.",
    intro:
      "These terms summarize responsible product use while our complete legal documentation is finalized.",
    highlights: ["Use responsibly", "Respect access controls", "Review source material"],
    sections: [
      { title: "Appropriate use", body: "Use Siddha MedBot for lawful, respectful knowledge exploration and follow the access rules of your workspace." },
      { title: "Review answers", body: "Generated responses can support research, but users should inspect citations and apply professional judgment." },
      { title: "Service changes", body: "The product may evolve as we improve features, safeguards, and supporting documentation." },
    ],
  },
  {
    slug: "compliance",
    eyebrow: "Legal",
    title: "A practical compliance mindset",
    summary: "We build with privacy, security, and institutional needs in view from the beginning.",
    intro:
      "Compliance is an ongoing practice. Siddha MedBot is designed to support careful adoption and transparent conversations with institutions.",
    highlights: ["Privacy-aware design", "Security controls", "Institutional readiness"],
    sections: [
      { title: "Privacy principles", body: "Our product direction reflects data minimization, access boundaries, and careful handling practices." },
      { title: "Institutional review", body: "We welcome questions from teams evaluating Siddha MedBot for educational, research, or organizational use." },
      { title: "Documentation", body: "Contact us for current compliance information relevant to your planned use case." },
    ],
  },
  {
    slug: "disclaimer",
    eyebrow: "Legal",
    title: "A medical safety reminder",
    summary: "Siddha MedBot is a knowledge assistant, not a substitute for qualified medical care.",
    intro:
      "The product is designed to support learning and research. It should not be used as the sole basis for diagnosis, treatment, or urgent health decisions.",
    highlights: ["Educational support", "Professional judgment", "Emergency awareness"],
    sections: [
      { title: "Not medical advice", body: "Answers are informational and may not reflect the needs of a specific person or situation." },
      { title: "Consult professionals", body: "Seek guidance from a qualified healthcare professional for diagnosis, treatment, or changes to care." },
      { title: "Emergencies", body: "For urgent symptoms or emergencies, contact local emergency services immediately." },
    ],
  },
];

export const sitePageBySlug = new Map(sitePages.map((page) => [page.slug, page]));

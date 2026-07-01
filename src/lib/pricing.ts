export type PublicPricingPlan = {
  slug: string;
  name: string;
  description: string;
  currency: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  monthlyTokenLimit: number;
  dailyQueryLimit: number;
  monthlyQueryLimit: number;
  maxFileUploads: number;
  features: string[];
  checkoutUrl: string | null;
  isFree: boolean;
  isPopular: boolean;
  isPublished: boolean;
  displayOrder: number;
};

export const DEFAULT_PRICING_PLANS: PublicPricingPlan[] = [
  {
    slug: "starter",
    name: "Free Trial",
    description: "A careful first look at the curated Siddha knowledge base.",
    currency: "INR",
    monthlyPriceMinor: 0,
    yearlyPriceMinor: 0,
    monthlyTokenLimit: 50_000,
    dailyQueryLimit: 5,
    monthlyQueryLimit: 50,
    maxFileUploads: 0,
    features: [
      "50,000 tokens per month",
      "Curated Siddha knowledge base",
      "Saved conversation history",
      "Medical safety triage",
    ],
    checkoutUrl: null,
    isFree: true,
    isPopular: false,
    isPublished: true,
    displayOrder: 0,
  },
  {
    slug: "student",
    name: "Plus",
    description: "Affordable access for BSMS students and exam-focused study.",
    currency: "INR",
    monthlyPriceMinor: 29900,
    yearlyPriceMinor: 299900,
    monthlyTokenLimit: 300_000,
    dailyQueryLimit: 25,
    monthlyQueryLimit: 300,
    maxFileUploads: 0,
    features: [
      "300,000 tokens per month",
      "Student-friendly Siddha explanations",
      "Citation-backed answers from internal resources",
      "Saved conversation history",
    ],
    checkoutUrl: null,
    isFree: false,
    isPopular: false,
    isPublished: true,
    displayOrder: 1,
  },
  {
    slug: "researcher",
    name: "Pro",
    description: "Higher limits for literature review, comparison, and deeper study.",
    currency: "INR",
    monthlyPriceMinor: 99900,
    yearlyPriceMinor: 999900,
    monthlyTokenLimit: 1_200_000,
    dailyQueryLimit: 60,
    monthlyQueryLimit: 1200,
    maxFileUploads: 0,
    features: [
      "1,200,000 tokens per month",
      "Research-oriented source tracing",
      "Follow-up questions for incomplete cases",
      "Saved conversation history",
    ],
    checkoutUrl: null,
    isFree: false,
    isPopular: true,
    isPublished: true,
    displayOrder: 2,
  },
  {
    slug: "practitioner",
    name: "Pro Max",
    description: "Professional access for practitioners who need frequent reference support.",
    currency: "INR",
    monthlyPriceMinor: 299900,
    yearlyPriceMinor: 2999900,
    monthlyTokenLimit: 3_500_000,
    dailyQueryLimit: 150,
    monthlyQueryLimit: 3500,
    maxFileUploads: 0,
    features: [
      "3,500,000 tokens per month",
      "Practitioner-grade source review",
      "Higher-volume clinical research support",
      "Priority access to new curated resources",
    ],
    checkoutUrl: null,
    isFree: false,
    isPopular: false,
    isPublished: true,
    displayOrder: 3,
  },
  {
    slug: "institution",
    name: "Ultra",
    description: "Pooled access for colleges, clinics, libraries, and research teams.",
    currency: "INR",
    monthlyPriceMinor: 5000000,
    yearlyPriceMinor: 50000000,
    monthlyTokenLimit: 50_000_000,
    dailyQueryLimit: 1000,
    monthlyQueryLimit: 50000,
    maxFileUploads: 0,
    features: [
      "50,000,000 pooled tokens per month",
      "Multi-seat institutional access",
      "Onboarding and usage review",
      "Custom commercial terms",
    ],
    checkoutUrl: null,
    isFree: false,
    isPopular: false,
    isPublished: true,
    displayOrder: 4,
  },
];

type StoredPricingPlan = Omit<PublicPricingPlan, "features" | "monthlyTokenLimit"> & {
  features: unknown;
  monthlyTokenLimit?: number | null;
};

export function normalizePricingPlan(plan: StoredPricingPlan): PublicPricingPlan {
  return {
    ...plan,
    monthlyTokenLimit: plan.monthlyTokenLimit ?? plan.monthlyQueryLimit * 1000,
    features: Array.isArray(plan.features)
      ? plan.features.filter((feature): feature is string => typeof feature === "string")
      : [],
  };
}

export function mergePricingPlans(
  plans: StoredPricingPlan[]
) {
  const storedPlans = plans.map(normalizePricingPlan);
  const storedSlugs = new Set(storedPlans.map((plan) => plan.slug));
  return [
    ...DEFAULT_PRICING_PLANS.map((defaultPlan) =>
      storedPlans.find((plan) => plan.slug === defaultPlan.slug) || defaultPlan
    ),
    ...storedPlans.filter((plan) => !DEFAULT_PRICING_PLANS.some((defaultPlan) => defaultPlan.slug === plan.slug)),
  ]
    .filter((plan, index, allPlans) => allPlans.findIndex((candidate) => candidate.slug === plan.slug) === index)
    .filter((plan) => storedSlugs.has(plan.slug) || DEFAULT_PRICING_PLANS.some((defaultPlan) => defaultPlan.slug === plan.slug))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function formatPrice(priceMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
  }).format(priceMinor / 100);
}

export function findPricingPlan(
  plans: StoredPricingPlan[],
  slug: string
) {
  return mergePricingPlans(plans).find((plan) => plan.slug === slug)
    || DEFAULT_PRICING_PLANS[0];
}

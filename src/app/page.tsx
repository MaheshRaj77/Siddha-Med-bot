import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import PowerfulFeatures from "@/components/landing/PowerfulFeatures";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustSection from "@/components/landing/TrustSection";
import Testimonials from "@/components/landing/Testimonials";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-emerald-200">
      <Navbar />
      <Hero />
      <PowerfulFeatures />
      <HowItWorks />
      <TrustSection />
      <Testimonials />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

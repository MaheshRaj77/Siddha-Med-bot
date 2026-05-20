import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import MetricsStrip from "@/components/landing/MetricsStrip";
import InteractiveMockup from "@/components/landing/InteractiveMockup";
import FeatureCards from "@/components/landing/FeatureCards";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-void)" }}>
      <Navbar />
      <Hero />
      <MetricsStrip />
      <InteractiveMockup />
      <FeatureCards />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

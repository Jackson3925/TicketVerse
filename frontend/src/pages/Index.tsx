
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturedEvents from "@/components/FeaturedEvents";
import EventsSection from "@/components/EventsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      <HeroSection />
      <FeaturedEvents />
      <EventsSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Index;


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Own Your Experience
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8">
          Buy, sell, and trade concert tickets as NFTs. Secure, transparent, and authentic.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search events, artists..." className="pl-10" />
          </div>
          <Button size="lg" className="px-8">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">50K+</div>
            <div className="text-muted-foreground">Tickets Sold</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">1,200+</div>
            <div className="text-muted-foreground">Events Listed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">25K+</div>
            <div className="text-muted-foreground">Active Users</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Users, Wallet } from "lucide-react";

const FeaturesSection = () => {
  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose TicketVerse?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Authentic NFT Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Every ticket is a unique NFT, preventing fraud and ensuring authenticity.</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Secure Resale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Trade tickets safely with smart contracts and transparent pricing.</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Crypto Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Pay with ETH and other cryptocurrencies for seamless transactions.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

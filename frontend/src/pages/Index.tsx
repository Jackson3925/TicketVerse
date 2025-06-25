
import { useEffect, useState } from 'react'
import { eventsAPI } from '@/lib/api'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturedEvents from "@/components/FeaturedEvents";
import EventsSection from "@/components/EventsSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

const Index = () => {
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use real-time hook for live updates
  const { events: realtimeEvents } = useRealtimeEvents()

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Load featured and upcoming events in parallel
        const [featured, upcoming] = await Promise.all([
          eventsAPI.getFeaturedEvents(),
          eventsAPI.getEvents({ limit: 8 })
        ])
        
        setFeaturedEvents(featured)
        setUpcomingEvents(upcoming)
        setError(null)
      } catch (err) {
        console.error('Error loading homepage data:', err)
        setError('Failed to load events. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Update events when real-time data changes
  useEffect(() => {
    if (realtimeEvents.length > 0) {
      // Update upcoming events with real-time data
      setUpcomingEvents(realtimeEvents.slice(0, 8))
      
      // Update featured events if they exist in real-time data
      const featuredFromRealtime = realtimeEvents.filter(event => event.is_featured).slice(0, 6)
      if (featuredFromRealtime.length > 0) {
        setFeaturedEvents(featuredFromRealtime)
      }
    }
  }, [realtimeEvents])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Oops! Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      <HeroSection />
      <FeaturedEvents events={featuredEvents} />
      <EventsSection events={upcomingEvents} />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { eventsAPI, artistsAPI, venuesAPI, sellersAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRoleProtection } from '@/hooks/useRoleProtection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Music, Plus, Minus, Upload, ArrowLeft, Image, Layout, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import CreateArtistModal from "@/components/CreateArtistModal";
import type { Artist, Database } from '@/lib/supabase';
import { contractService, contractUtils, CreateEventParams, TicketType } from '@/lib/contracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface SeatCategory {
  name: string;
  price: string;
  capacity: number;
  color: string;
  nftImage?: string;
  totalRows: number;
  seatsPerRow: number;
  rowPrefix: string;
}

type Venue = Database['public']['Tables']['venues']['Row'];

const SellEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { wallet, isConnected, connectWallet } = useWeb3();
  const account = wallet?.address;
  
  // Protect this route for sellers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'seller' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }

  // Loading and data states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateArtistModal, setShowCreateArtistModal] = useState(false);
  const [blockchainTxHash, setBlockchainTxHash] = useState<string | null>(null);
  const [creatingOnBlockchain, setCreatingOnBlockchain] = useState(false);
  
  const [eventData, setEventData] = useState({
    title: "",
    artist_id: "",
    description: "",
    venue_id: "",
    date: "",
    time: "",
    doors_open: "",
    category: "Concert",
    age_restriction: "",
    dress_code: "",
    duration_minutes: 120,
    posterImage: "",
    seatArrangementImage: ""
  });

  const [seatCategories, setSeatCategories] = useState<SeatCategory[]>([
    { name: "VIP", price: "0.45", capacity: 50, color: "#fbbf24", totalRows: 5, seatsPerRow: 10, rowPrefix: "V" },
    { name: "Premium", price: "0.35", capacity: 100, color: "#3b82f6", totalRows: 10, seatsPerRow: 10, rowPrefix: "P" },
    { name: "Standard", price: "0.25", capacity: 200, color: "#6b7280", totalRows: 20, seatsPerRow: 10, rowPrefix: "S" }
  ]);

  const [nftImageOption, setNftImageOption] = useState<"single" | "category">("single");
  const [singleNftImage, setSingleNftImage] = useState("");

  const eventCategories = ["Concert", "Festival", "Theater", "Sports", "Comedy", "Conference", "Electronic", "Rock", "Pop", "Jazz", "Hip-Hop", "Classical", "Country", "R&B"];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        const [artistsData, venuesData] = await Promise.all([
          artistsAPI.getArtists(),
          venuesAPI.getVenues()
        ]);
        
        setArtists(artistsData);
        setVenues(venuesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load artists and venues. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated, toast]);

  const handleInputChange = (field: string, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleArtistCreated = (newArtist: Artist) => {
    setArtists(prev => [newArtist, ...prev]);
    setEventData(prev => ({ ...prev, artist_id: newArtist.id }));
    setShowCreateArtistModal(false);
  };

  const updateSeatCategory = (index: number, field: keyof SeatCategory, value: string | number) => {
    setSeatCategories(prev => 
      prev.map((cat, i) => {
        if (i !== index) return cat;
        
        const updatedCat = { ...cat, [field]: value };
        
        // Auto-update capacity when rows or seats per row change
        if (field === 'totalRows' || field === 'seatsPerRow') {
          updatedCat.capacity = (updatedCat.totalRows || 0) * (updatedCat.seatsPerRow || 0);
        }
        
        return updatedCat;
      })
    );
  };

  const addSeatCategory = () => {
    setSeatCategories(prev => [...prev, {
      name: "",
      price: "0.25",
      capacity: 50,
      color: "#6b7280",
      totalRows: 5,
      seatsPerRow: 10,
      rowPrefix: "R"
    }]);
  };

  const removeSeatCategory = (index: number) => {
    setSeatCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (type: 'poster' | 'seatArrangement' | 'singleNft') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'poster') {
          setEventData(prev => ({ ...prev, posterImage: e.target?.result as string }));
        } else if (type === 'seatArrangement') {
          setEventData(prev => ({ ...prev, seatArrangementImage: e.target?.result as string }));
        } else if (type === 'singleNft') {
          setSingleNftImage(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryNftUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSeatCategories(prev => 
          prev.map((cat, i) => i === index ? { ...cat, nftImage: e.target?.result as string } : cat)
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!eventData.title.trim()) errors.push("Event title is required");
    if (!eventData.artist_id) errors.push("Please select an artist");
    if (!eventData.venue_id) errors.push("Please select a venue");
    if (!eventData.date) errors.push("Event date is required");
    if (!eventData.time) errors.push("Event time is required");
    if (!eventData.category) errors.push("Event category is required");
    
    // Validate seat categories
    if (seatCategories.length === 0) {
      errors.push("At least one seat category is required");
    } else {
      seatCategories.forEach((category, index) => {
        if (!category.name.trim()) errors.push(`Seat category ${index + 1} name is required`);
        if (!category.price || parseFloat(category.price) <= 0) errors.push(`Seat category ${index + 1} must have a valid price`);
        if (!category.capacity || category.capacity <= 0) errors.push(`Seat category ${index + 1} must have a valid capacity`);
        if (!category.totalRows || category.totalRows <= 0) errors.push(`Seat category ${index + 1} must have valid number of rows`);
        if (!category.seatsPerRow || category.seatsPerRow <= 0) errors.push(`Seat category ${index + 1} must have valid seats per row`);
        if (!category.rowPrefix.trim()) errors.push(`Seat category ${index + 1} must have a row prefix`);
        if (category.totalRows * category.seatsPerRow !== category.capacity) {
          errors.push(`Seat category ${index + 1}: Total rows (${category.totalRows}) × Seats per row (${category.seatsPerRow}) must equal capacity (${category.capacity})`);
        }
      });
    }
    
    // Validate future date
    const eventDate = new Date(`${eventData.date}T${eventData.time}`);
    if (eventDate <= new Date()) {
      errors.push("Event date and time must be in the future");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create an event.",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected || !account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create blockchain events.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors[0],
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    let newEvent = null;
    
    try {
      // Ensure seller profile exists
      let sellerProfile = await sellersAPI.getSellerProfile(user.id);
      if (!sellerProfile) {
        console.log('Seller profile not found for user:', user.id);
        throw new Error('Seller profile not found. Please complete your seller registration.');
      }

      // Prepare seat categories data for database
      const seatCategoriesData = seatCategories.map(category => ({
        name: category.name.trim(),
        price: parseFloat(category.price),
        capacity: category.capacity,
        color: category.color,
        nft_image_url: nftImageOption === "category" ? category.nftImage : singleNftImage,
        total_rows: category.totalRows,
        seats_per_row: category.seatsPerRow,
        row_prefix: category.rowPrefix.trim()
      }));
      
      console.log('Seat categories data being sent:', seatCategoriesData);

      // Create event with integrated blockchain functionality
      // The eventsAPI.createEvent function now handles both database and blockchain creation
      setCreatingOnBlockchain(true);
      
      newEvent = await eventsAPI.createEvent({
        title: eventData.title.trim(),
        description: eventData.description.trim() || undefined,
        artist_id: eventData.artist_id,
        venue_id: eventData.venue_id,
        date: eventData.date,
        time: eventData.time,
        doors_open: eventData.doors_open || undefined,
        age_restriction: eventData.age_restriction || undefined,
        duration_minutes: eventData.duration_minutes || undefined,
        category: eventData.category,
        poster_image_url: eventData.posterImage || undefined,
        seat_categories: seatCategoriesData
      }, account); // Pass wallet address as organizer

      console.log('Event created with blockchain integration:', newEvent);
      
      // The contract_event_id is now automatically set by the integrated createEvent function
      
      toast({
        title: "Event Created Successfully!",
        description: `${eventData.title} has been created on blockchain${newEvent.contract_event_id ? ` (Contract Event ID: ${newEvent.contract_event_id})` : ''} and is now available for ticket sales.`,
        variant: "default"
      });

      // Navigate to the new event
      navigate(`/event/${newEvent.id}`);
      
    } catch (error: any) {
      console.error('Error creating event:', error);
      
      // If blockchain creation failed but database creation succeeded,
      // we should ideally rollback the database creation or mark it as failed
      
      let errorMessage = "Failed to create event. Please try again.";
      
      // Handle blockchain-specific errors
      if (error.message?.includes('User denied transaction signature')) {
        errorMessage = "Transaction was cancelled. Please approve the transaction to create the event.";
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = "Insufficient ETH balance to create the event. Please add more ETH to your wallet.";
      } else if (error.code === '23503') {
        if (error.message.includes('artist_id')) {
          errorMessage = "Selected artist not found. Please select a valid artist.";
        } else if (error.message.includes('venue_id')) {
          errorMessage = "Selected venue not found. Please select a valid venue.";
        } else if (error.message.includes('seller_id')) {
          errorMessage = "User profile error. Please try logging out and back in.";
        }
      } else if (error.code === '23502') {
        errorMessage = "Missing required information. Please check all fields are filled correctly.";
      }
      
      toast({
        title: "Error Creating Event",
        description: `${errorMessage} ${error.code ? `(Error: ${error.code})` : ''}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
      setCreatingOnBlockchain(false);
    }
  };

  const totalCapacity = seatCategories.reduce((sum, cat) => sum + cat.capacity, 0);

  // Show loading screen while loading initial data
  if (loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading artists and venues...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <h1 className="text-3xl font-bold mt-4">Create New Event</h1>
          <p className="text-primary-foreground/80 mt-2">Add your concert information and start selling tickets</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Event Information
              </CardTitle>
              <CardDescription>Basic details about your concert or event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Electric Nights Festival"
                    value={eventData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist/Performer *</Label>
                  <Select value={eventData.artist_id} onValueChange={(value) => handleInputChange("artist_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an artist..." />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          <div className="flex items-center gap-2">
                            {artist.verified && <span className="text-blue-500">✓</span>}
                            {artist.name}
                            {artist.genre && <span className="text-muted-foreground">({artist.genre})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between mt-2">
                    {artists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No artists found. Create one to get started.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Don't see the artist you need?
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateArtistModal(true)}
                      className="ml-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create New Artist
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Event Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event, what makes it special..."
                  value={eventData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Event Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={eventData.time}
                    onChange={(e) => handleInputChange("time", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Event Category</Label>
                <div className="flex flex-wrap gap-2">
                  {eventCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={eventData.category === category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleInputChange("category", category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doors_open">Doors Open Time</Label>
                  <Input
                    id="doors_open"
                    type="time"
                    value={eventData.doors_open}
                    onChange={(e) => handleInputChange("doors_open", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="120"
                    value={eventData.duration_minutes}
                    onChange={(e) => handleInputChange("duration_minutes", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age_restriction">Age Restriction</Label>
                  <Select value={eventData.age_restriction} onValueChange={(value) => handleInputChange("age_restriction", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age restriction..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_ages">All Ages</SelectItem>
                      <SelectItem value="18+">18+</SelectItem>
                      <SelectItem value="21+">21+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Venue Information
              </CardTitle>
              <CardDescription>Where will your event take place?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Select value={eventData.venue_id} onValueChange={(value) => handleInputChange("venue_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a venue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{venue.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {venue.city}, {venue.state && `${venue.state}, `}{venue.country}
                            {venue.capacity && ` • Capacity: ${venue.capacity}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {venues.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No venues found. Consider adding a venue first.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seat Categories & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Seat Categories & Pricing</CardTitle>
              <CardDescription>Configure different ticket types and their prices (in ETH)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {seatCategories.map((category, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="font-medium">Category {index + 1}</span>
                    </div>
                    {seatCategories.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSeatCategory(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Category Name</Label>
                      <Input
                        placeholder="e.g., VIP, Premium"
                        value={category.name}
                        onChange={(e) => updateSeatCategory(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Price (ETH)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.25"
                        value={category.price}
                        onChange={(e) => updateSeatCategory(index, "price", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Row Prefix</Label>
                      <Input
                        placeholder="e.g., V, A, R1"
                        value={category.rowPrefix}
                        onChange={(e) => updateSeatCategory(index, "rowPrefix", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Total Rows</Label>
                      <Input
                        type="number"
                        placeholder="5"
                        value={category.totalRows}
                        onChange={(e) => updateSeatCategory(index, "totalRows", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Seats per Row</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={category.seatsPerRow}
                        onChange={(e) => updateSeatCategory(index, "seatsPerRow", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Capacity (Auto-calculated)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={category.totalRows * category.seatsPerRow}
                        onChange={(e) => updateSeatCategory(index, "capacity", parseInt(e.target.value) || 0)}
                        className="bg-muted"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Seats will be auto-assigned as: {category.rowPrefix}1-1, {category.rowPrefix}1-2, ... {category.rowPrefix}{category.totalRows}-{category.seatsPerRow}
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addSeatCategory}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Category
              </Button>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Total Venue Capacity: {totalCapacity} seats</p>
              </div>
            </CardContent>
          </Card>

          {/* NFT Image Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>NFT Image Configuration</CardTitle>
              <CardDescription>Choose how you want to configure NFT images for your tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">NFT Image Setup</Label>
                <RadioGroup value={nftImageOption} onValueChange={(value: "single" | "category") => setNftImageOption(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single">Use single NFT image for all ticket categories</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="category" id="category" />
                    <Label htmlFor="category">Use different NFT images for each category</Label>
                  </div>
                </RadioGroup>
              </div>

              {nftImageOption === "single" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Single NFT Image</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This image will be used for all ticket NFTs regardless of category
                  </p>
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" className="relative">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload NFT Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload('singleNft')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                    {singleNftImage && (
                      <span className="text-sm text-muted-foreground">NFT image uploaded</span>
                    )}
                  </div>
                  {singleNftImage && (
                    <img
                      src={singleNftImage}
                      alt="NFT image preview"
                      className="w-48 h-48 object-cover rounded-lg border"
                    />
                  )}
                </div>
              )}

              {nftImageOption === "category" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Category-Specific NFT Images</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload unique NFT images for each ticket category
                  </p>
                  {seatCategories.map((category, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="font-medium">{category.name || `Category ${index + 1}`}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="relative">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload NFT Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCategoryNftUpload(index)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </Button>
                        {category.nftImage && (
                          <span className="text-sm text-muted-foreground">Image uploaded</span>
                        )}
                      </div>
                      {category.nftImage && (
                        <img
                          src={category.nftImage}
                          alt={`${category.name} NFT preview`}
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Images */}
          <Card>
            <CardHeader>
              <CardTitle>Event Images</CardTitle>
              <CardDescription>Upload images for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Poster Image */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <Label className="text-base font-medium">Event Poster</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload the main promotional image for your event
                </p>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" className="relative">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Poster
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload('poster')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  {eventData.posterImage && (
                    <span className="text-sm text-muted-foreground">Poster uploaded</span>
                  )}
                </div>
                {eventData.posterImage && (
                  <img
                    src={eventData.posterImage}
                    alt="Event poster preview"
                    className="w-48 h-64 object-cover rounded-lg border"
                  />
                )}
              </div>

              {/* Seat Arrangement Image */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  <Label className="text-base font-medium">Seat Arrangement</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a seating chart or venue layout (optional)
                </p>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" className="relative">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Seating Chart
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload('seatArrangement')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  {eventData.seatArrangementImage && (
                    <span className="text-sm text-muted-foreground">Seating chart uploaded</span>
                  )}
                </div>
                {eventData.seatArrangementImage && (
                  <img
                    src={eventData.seatArrangementImage}
                    alt="Seat arrangement preview"
                    className="w-64 h-48 object-cover rounded-lg border"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Connection & Submit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Blockchain Integration
              </CardTitle>
              <CardDescription>
                Connect your wallet to create the event on the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    A wallet connection is required to create blockchain events and NFT tickets.
                  </p>
                  <Button 
                    type="button" 
                    onClick={connectWallet}
                    className="w-full"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">
                      Wallet Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
                    </span>
                  </div>
                  
                  {blockchainTxHash && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        Blockchain Transaction: {blockchainTxHash.slice(0, 10)}...
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Event created successfully on blockchain
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Ready to create blockchain event:</strong>
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-1">
                      <li>• Event will be deployed as a smart contract</li>
                      <li>• Tickets will be minted as NFTs</li>
                      <li>• Prices are set in ETH</li>
                      <li>• Transfers locked until after event</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={submitting || !isConnected}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {creatingOnBlockchain ? 'Creating on Blockchain...' : 'Creating Event...'}
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Event {!isConnected && '(Wallet Required)'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Create Artist Modal */}
      <CreateArtistModal
        isOpen={showCreateArtistModal}
        onClose={() => setShowCreateArtistModal(false)}
        onArtistCreated={handleArtistCreated}
      />
    </div>
  );
};

export default SellEvent;

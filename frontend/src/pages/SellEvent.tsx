import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, MapPin, Music, Plus, Minus, Upload, ArrowLeft, Image, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SeatCategory {
  name: string;
  price: string;
  capacity: number;
  color: string;
  nftImage?: string;
}

const SellEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [eventData, setEventData] = useState({
    title: "",
    artist: "",
    description: "",
    venue: "",
    location: "",
    date: "",
    time: "",
    category: "Rock",
    posterImage: "",
    seatArrangementImage: ""
  });

  const [seatCategories, setSeatCategories] = useState<SeatCategory[]>([
    { name: "VIP", price: "0.45", capacity: 50, color: "bg-yellow-200" },
    { name: "Premium", price: "0.35", capacity: 100, color: "bg-blue-200" },
    { name: "Standard", price: "0.25", capacity: 200, color: "bg-gray-200" }
  ]);

  const [nftImageOption, setNftImageOption] = useState<"single" | "category">("single");
  const [singleNftImage, setSingleNftImage] = useState("");

  const musicCategories = ["Rock", "Electronic", "Pop", "Jazz", "Hip-Hop", "Classical", "Country", "R&B"];

  const handleInputChange = (field: string, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const updateSeatCategory = (index: number, field: keyof SeatCategory, value: string | number) => {
    setSeatCategories(prev => 
      prev.map((cat, i) => i === index ? { ...cat, [field]: value } : cat)
    );
  };

  const addSeatCategory = () => {
    setSeatCategories(prev => [...prev, {
      name: "",
      price: "0.25",
      capacity: 50,
      color: "bg-gray-200"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!eventData.title || !eventData.artist || !eventData.venue || !eventData.date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically send the data to your backend
    console.log("Event Data:", eventData);
    console.log("Seat Categories:", seatCategories);
    
    toast({
      title: "Event Created Successfully!",
      description: "Your concert event has been listed and is now available for ticket sales."
    });

    // Navigate back to events page or show success state
    navigate("/browse-events");
  };

  const totalCapacity = seatCategories.reduce((sum, cat) => sum + cat.capacity, 0);

  return (
    <div className="min-h-screen bg-background">
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
                  <Input
                    id="artist"
                    placeholder="e.g., Various Artists, Thunder Strike"
                    value={eventData.artist}
                    onChange={(e) => handleInputChange("artist", e.target.value)}
                    required
                  />
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
                <Label>Music Category</Label>
                <div className="flex flex-wrap gap-2">
                  {musicCategories.map((category) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue Name *</Label>
                  <Input
                    id="venue"
                    placeholder="e.g., Madison Square Garden"
                    value={eventData.venue}
                    onChange={(e) => handleInputChange("venue", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., New York, NY"
                    value={eventData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    required
                  />
                </div>
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
                      <div className={`w-4 h-4 rounded ${category.color}`}></div>
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
                      <Label>Capacity</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={category.capacity}
                        onChange={(e) => updateSeatCategory(index, "capacity", parseInt(e.target.value) || 0)}
                      />
                    </div>
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
                        <div className={`w-4 h-4 rounded ${category.color}`}></div>
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

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellEvent;

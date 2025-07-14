import { useState } from "react";
import { artistsAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Artist } from '@/lib/supabase';

interface CreateArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArtistCreated: (artist: Artist) => void;
}

const CreateArtistModal = ({ isOpen, onClose, onArtistCreated }: CreateArtistModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [artistData, setArtistData] = useState({
    name: "",
    genre: "",
    description: "",
    image_url: ""
  });

  const genres = [
    "Rock", "Pop", "Jazz", "Hip-Hop", "Classical", "Country", "R&B",
    "Electronic", "Reggae", "Blues", "Folk", "Metal", "Punk", "Alternative",
    "Indie", "Gospel", "Latin", "World", "Experimental", "Other"
  ];

  const handleInputChange = (field: string, value: string) => {
    setArtistData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setArtistData(prev => ({ ...prev, image_url: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!artistData.name.trim()) {
      return "Artist name is required";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const newArtist = await artistsAPI.createArtist({
        name: artistData.name.trim(),
        genre: artistData.genre || undefined,
        description: artistData.description.trim() || undefined,
        image_url: artistData.image_url || undefined
      });

      toast({
        title: "Artist Created Successfully!",
        description: `${artistData.name} has been added to the artist database.`,
        variant: "default"
      });

      onArtistCreated(newArtist);
      onClose();
      
      // Reset form
      setArtistData({
        name: "",
        genre: "",
        description: "",
        image_url: ""
      });
      
    } catch (error: any) {
      console.error('Error creating artist:', error);
      
      let errorMessage = "Failed to create artist. Please try again.";
      if (error.code === '23505') {
        errorMessage = "An artist with this name already exists.";
      }
      
      toast({
        title: "Error Creating Artist",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form when closing
      setArtistData({
        name: "",
        genre: "",
        description: "",
        image_url: ""
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Artist</DialogTitle>
          <DialogDescription>
            Add a new artist to the database. This artist will be available for event creation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artist-name">Artist Name *</Label>
            <Input
              id="artist-name"
              placeholder="e.g., The Electric Waves"
              value={artistData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist-genre">Genre</Label>
            <Select 
              value={artistData.genre} 
              onValueChange={(value) => handleInputChange("genre", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a genre..." />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist-description">Description</Label>
            <Textarea
              id="artist-description"
              placeholder="Brief description of the artist..."
              value={artistData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Artist Image</Label>
            <div className="flex items-center gap-4">
              <Button 
                type="button" 
                variant="outline" 
                className="relative"
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loading}
                />
              </Button>
              {artistData.image_url && (
                <span className="text-sm text-muted-foreground">Image uploaded</span>
              )}
            </div>
            {artistData.image_url && (
              <img
                src={artistData.image_url}
                alt="Artist preview"
                className="w-24 h-24 object-cover rounded-lg border"
              />
            )}
          </div>
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Artist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateArtistModal;
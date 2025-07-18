import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Loader2 } from "lucide-react";
import { ticketsAPI } from "@/lib/api";

interface Seat {
  id: string;
  row: string;
  number: number;
  price: string;
  status: 'available' | 'occupied' | 'selected';
  category: string; // Dynamic category from database
}

interface SeatSelectionProps {
  maxSeats: number;
  onSeatsChange: (seats: Seat[]) => void;
  selectedSeats: Seat[];
  eventId: string; // Add event ID to fetch real data
}

interface CategorySelection {
  [categoryName: string]: number;
}

const SeatSelection = ({ maxSeats, onSeatsChange, selectedSeats, eventId }: SeatSelectionProps) => {
  const [categorySelections, setCategorySelections] = useState<CategorySelection>({});

  const [seatAvailability, setSeatAvailability] = useState<{
    categories: Array<{
      id: string
      name: string
      price: number
      capacity: number
      sold: number
      available: number
      color?: string
    }>
    occupiedSeats: Array<{
      seat_row: string
      seat_number: string
      seat_category_id: string
    }>
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real-time seat availability from database
  useEffect(() => {
    const fetchSeatAvailability = async () => {
      try {
        setLoading(true);
        console.log('Fetching seat availability for event:', eventId);
        const availability = await ticketsAPI.getEventSeatAvailability(eventId);
        console.log('Seat availability response:', availability);
        setSeatAvailability(availability);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching seat availability:', err);
        console.error('Error details:', err.message, err.code);
        setError(`Failed to load seat availability: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchSeatAvailability();
    } else {
      console.warn('No eventId provided to SeatSelection component');
      setError('No event ID provided');
      setLoading(false);
    }
  }, [eventId]);

  const getAvailableSeatsCount = (categoryName: string): number => {
    if (!seatAvailability) return 0;
    const categoryData = seatAvailability.categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return categoryData ? categoryData.available : 0;
  };

  const getCategoryPrice = (categoryName: string): number => {
    if (!seatAvailability) return 0;
    const categoryData = seatAvailability.categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return categoryData ? categoryData.price : 0;
  };

  const getCategoryColor = (categoryName: string): string => {
    if (!seatAvailability) return 'bg-gray-200';
    const categoryData = seatAvailability.categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (categoryData?.color) return categoryData.color;
    
    // Default colors based on category name
    const name = categoryName.toLowerCase();
    if (name.includes('vip')) return 'bg-yellow-200';
    if (name.includes('premium')) return 'bg-blue-200';
    if (name.includes('standard') || name.includes('general')) return 'bg-gray-200';
    return 'bg-green-200'; // Default for other categories
  };

  // Initialize category selections when seat availability is loaded
  useEffect(() => {
    if (seatAvailability && seatAvailability.categories.length > 0) {
      const initialSelections: CategorySelection = {};
      seatAvailability.categories.forEach(cat => {
        initialSelections[cat.name] = 0;
      });
      setCategorySelections(initialSelections);
    }
  }, [seatAvailability]);

  const updateCategorySelection = (categoryName: string, change: number) => {
    const newSelections = { ...categorySelections };
    const newValue = Math.max(0, (newSelections[categoryName] || 0) + change);
    const totalSelected = Object.values(newSelections).reduce((sum, val) => sum + val, 0) 
      - (newSelections[categoryName] || 0) + newValue;
    
    // Check if total doesn't exceed maxSeats and available seats for this category
    if (totalSelected <= maxSeats && newValue <= getAvailableSeatsCount(categoryName)) {
      newSelections[categoryName] = newValue;
      setCategorySelections(newSelections);
    }
  };

  const handleAutoAssign = () => {
    if (!seatAvailability) return;
    
    const assignedSeats: Seat[] = [];
    
    Object.entries(categorySelections).forEach(([categoryName, quantity]) => {
      if (quantity > 0) {
        const categoryData = seatAvailability.categories.find(cat => 
          cat.name.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (categoryData && quantity <= categoryData.available) {
          // Generate seat assignments for this category
          for (let i = 0; i < quantity; i++) {
            assignedSeats.push({
              id: `${categoryName}-${i + 1}`,
              row: 'AUTO',
              number: i + 1,
              price: `${categoryData.price} ETH`,
              status: 'selected',
              category: categoryName
            });
          }
        }
      }
    });
    
    onSeatsChange(assignedSeats);
  };

  useEffect(() => {
    const totalSelected = Object.values(categorySelections).reduce((sum, val) => sum + val, 0);
    if (totalSelected > 0) {
      handleAutoAssign();
    } else {
      onSeatsChange([]);
    }
  }, [categorySelections]);

  const totalSelected = Object.values(categorySelections).reduce((sum, val) => sum + val, 0);
  const totalPrice = selectedSeats.reduce((sum, seat) => 
    sum + parseFloat(seat.price.replace(' ETH', '')), 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Select Seat Categories</CardTitle>
        <div className="text-center text-sm text-muted-foreground">
          Choose quantity for each category - seats will be auto-assigned
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading seat availability...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        )}

        {/* Category Selection */}
        {seatAvailability && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Seat Categories</Label>
            
            {seatAvailability.categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-sm ${getCategoryColor(category.name)}`}></div>
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm font-semibold">{category.price} ETH</div>
                    <div className="text-xs text-muted-foreground">
                      {category.available} available
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCategorySelection(category.name, -1)}
                    disabled={(categorySelections[category.name] || 0) === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{categorySelections[category.name] || 0}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCategorySelection(category.name, 1)}
                    disabled={totalSelected >= maxSeats || (categorySelections[category.name] || 0) >= category.available}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Selected: {totalSelected} / {maxSeats} tickets
        </div>

        {/* Auto-assigned seats summary */}
        {selectedSeats.length > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Auto-assigned Seats:</h4>
            <div className="space-y-2">
              {seatAvailability?.categories.map(category => {
                const categorySeats = selectedSeats.filter(seat => seat.category === category.name);
                if (categorySeats.length === 0) return null;
                
                return (
                  <div key={category.id} className="flex items-center space-x-2 text-sm">
                    <div className={`w-3 h-3 rounded-sm ${getCategoryColor(category.name)}`}></div>
                    <span className="capitalize font-medium">{category.name}:</span>
                    <div className="flex flex-wrap gap-1">
                      {categorySeats.map((seat) => (
                        <Badge key={seat.id} variant="secondary" className="text-xs">
                          {seat.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-sm font-medium mt-2 pt-2 border-t">
              Total: {totalPrice.toFixed(3)} ETH
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeatSelection;

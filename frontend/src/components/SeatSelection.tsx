import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Minus } from "lucide-react";

interface Seat {
  id: string;
  row: string;
  number: number;
  price: string;
  status: 'available' | 'occupied' | 'selected';
  category: 'vip' | 'premium' | 'standard';
}

interface SeatSelectionProps {
  maxSeats: number;
  onSeatsChange: (seats: Seat[]) => void;
  selectedSeats: Seat[];
}

interface CategorySelection {
  vip: number;
  premium: number;
  standard: number;
}

const SeatSelection = ({ maxSeats, onSeatsChange, selectedSeats }: SeatSelectionProps) => {
  const [categorySelections, setCategorySelections] = useState<CategorySelection>({
    vip: 0,
    premium: 0,
    standard: 0
  });

  const generateSeats = (): Seat[] => {
    const seats: Seat[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatsPerRow = 12;
    
    rows.forEach((row, rowIndex) => {
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        const seatId = `${row}${seatNum}`;
        let category: Seat['category'] = 'standard';
        let price = '0.25 ETH';
        
        // VIP seats (first two rows, center seats)
        if (rowIndex < 2 && seatNum >= 4 && seatNum <= 9) {
          category = 'vip';
          price = '0.45 ETH';
        }
        // Premium seats (rows C-D, center seats)
        else if (rowIndex >= 2 && rowIndex < 4 && seatNum >= 3 && seatNum <= 10) {
          category = 'premium';
          price = '0.35 ETH';
        }
        
        // Randomly make some seats occupied
        const isOccupied = Math.random() < 0.3;
        
        seats.push({
          id: seatId,
          row,
          number: seatNum,
          price,
          status: isOccupied ? 'occupied' : 'available',
          category
        });
      }
    });
    
    return seats;
  };

  const [seats] = useState<Seat[]>(generateSeats());

  const getAvailableSeatsCount = (category: 'vip' | 'premium' | 'standard'): number => {
    return seats.filter(seat => seat.category === category && seat.status === 'available').length;
  };

  const getCategoryPrice = (category: 'vip' | 'premium' | 'standard'): string => {
    const seat = seats.find(seat => seat.category === category);
    return seat ? seat.price : '0.25 ETH';
  };

  const updateCategorySelection = (category: keyof CategorySelection, change: number) => {
    const newSelections = { ...categorySelections };
    const newValue = Math.max(0, newSelections[category] + change);
    const totalSelected = Object.values(newSelections).reduce((sum, val) => sum + val, 0) 
      - newSelections[category] + newValue;
    
    // Check if total doesn't exceed maxSeats and available seats for this category
    if (totalSelected <= maxSeats && newValue <= getAvailableSeatsCount(category)) {
      newSelections[category] = newValue;
      setCategorySelections(newSelections);
    }
  };

  const handleAutoAssign = () => {
    const assignedSeats: Seat[] = [];
    
    Object.entries(categorySelections).forEach(([category, quantity]) => {
      if (quantity > 0) {
        const availableSeats = seats.filter(
          seat => seat.category === category && seat.status === 'available'
        );
        
        const seatsToAssign = availableSeats.slice(0, quantity).map(seat => ({
          ...seat,
          status: 'selected' as const
        }));
        
        assignedSeats.push(...seatsToAssign);
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
        {/* Category Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Seat Categories</Label>
          
          {/* VIP Category */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-200 rounded-sm"></div>
              <div>
                <div className="font-medium">VIP</div>
                <div className="text-sm font-semibold">{getCategoryPrice('vip')}</div>
                <div className="text-xs text-muted-foreground">
                  {getAvailableSeatsCount('vip')} available
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('vip', -1)}
                disabled={categorySelections.vip === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center">{categorySelections.vip}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('vip', 1)}
                disabled={totalSelected >= maxSeats || categorySelections.vip >= getAvailableSeatsCount('vip')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Premium Category */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-200 rounded-sm"></div>
              <div>
                <div className="font-medium">Premium</div>
                <div className="text-sm font-semibold">{getCategoryPrice('premium')}</div>
                <div className="text-xs text-muted-foreground">
                  {getAvailableSeatsCount('premium')} available
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('premium', -1)}
                disabled={categorySelections.premium === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center">{categorySelections.premium}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('premium', 1)}
                disabled={totalSelected >= maxSeats || categorySelections.premium >= getAvailableSeatsCount('premium')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Standard Category */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
              <div>
                <div className="font-medium">Standard</div>
                <div className="text-sm font-semibold">{getCategoryPrice('standard')}</div>
                <div className="text-xs text-muted-foreground">
                  {getAvailableSeatsCount('standard')} available
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('standard', -1)}
                disabled={categorySelections.standard === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center">{categorySelections.standard}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateCategorySelection('standard', 1)}
                disabled={totalSelected >= maxSeats || categorySelections.standard >= getAvailableSeatsCount('standard')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Selected: {totalSelected} / {maxSeats} tickets
        </div>

        {/* Auto-assigned seats summary */}
        {selectedSeats.length > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Auto-assigned Seats:</h4>
            <div className="space-y-2">
              {['vip', 'premium', 'standard'].map(category => {
                const categorySeats = selectedSeats.filter(seat => seat.category === category);
                if (categorySeats.length === 0) return null;
                
                return (
                  <div key={category} className="flex items-center space-x-2 text-sm">
                    <div className={`w-3 h-3 rounded-sm ${
                      category === 'vip' ? 'bg-yellow-200' : 
                      category === 'premium' ? 'bg-blue-200' : 'bg-gray-200'
                    }`}></div>
                    <span className="capitalize font-medium">{category}:</span>
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

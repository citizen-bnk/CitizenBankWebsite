import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { apiClient } from "app";
import { toast } from "sonner";

interface ShareClass {
  name: string;
  price_per_share: number;
  description: string;
  min_shares: number;
  max_shares: number;
}

export interface Props {
  shareClass: string;
  quantity: number;
  errors: { quantity?: string };
  onShareClassChange: (shareClass: string) => void;
  onQuantityChange: (quantity: number) => void;
  onShareClassesLoaded?: (shareClasses: ShareClass[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ShareSelectionStep({
  shareClass,
  quantity,
  errors,
  onShareClassChange,
  onQuantityChange,
  onShareClassesLoaded,
  onBack,
  onNext,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<ShareClass | null>(null);

  useEffect(() => {
    loadShareClasses();
  }, []);

  useEffect(() => {
    // Update selected class when shareClass changes
    const found = shareClasses.find(sc => sc.name === shareClass);
    setSelectedClass(found || null);
  }, [shareClass, shareClasses]);

  const loadShareClasses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_all_share_classes();
      const data = await response.json();
      console.log('📊 [ShareSelectionStep] Loaded share classes from API:', data.classes);
      setShareClasses(data.classes || []);
      
      // Pass loaded share classes to parent
      if (onShareClassesLoaded) {
        console.log('📤 [ShareSelectionStep] Calling onShareClassesLoaded with:', data.classes);
        onShareClassesLoaded(data.classes || []);
      } else {
        console.warn('⚠️ [ShareSelectionStep] onShareClassesLoaded callback is not defined');
      }
      
      // Auto-select first class if none selected
      if (!shareClass && data.classes && data.classes.length > 0) {
        onShareClassChange(data.classes[0].name);
      }
    } catch (error) {
      console.error("Failed to load share classes:", error);
      toast.error("Failed to load share classes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-muted-foreground">Loading share classes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = selectedClass ? selectedClass.price_per_share * quantity : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          <CardTitle>Share Selection</CardTitle>
        </div>
        <CardDescription>
          Choose the share class and quantity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Share Class *</Label>
          <RadioGroup
            value={shareClass}
            onValueChange={onShareClassChange}
          >
            {shareClasses.map((sc) => (
              <div key={sc.name} className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value={sc.name} id={`class-${sc.name}`} />
                <Label htmlFor={`class-${sc.name}`} className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-semibold">{sc.name}</div>
                    <div className="text-sm text-muted-foreground">{sc.description}</div>
                    <div className="text-sm font-medium text-orange-600 mt-1">
                      R{sc.price_per_share.toLocaleString()} per share
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Number of Shares *</Label>
          <Input
            id="quantity"
            type="number"
            min={selectedClass?.min_shares || 1}
            max={selectedClass?.max_shares || 10000}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            className={errors.quantity ? "border-red-500" : ""}
          />
          {errors.quantity && (
            <p className="text-sm text-red-500">{errors.quantity}</p>
          )}
          {selectedClass && (
            <p className="text-xs text-muted-foreground">
              Min: {selectedClass.min_shares} shares • Max: {selectedClass.max_shares} shares
            </p>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold">Total Investment Amount</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              R{totalAmount.toLocaleString()}
            </div>
            {selectedClass && (
              <div className="text-sm text-muted-foreground mt-1">
                {quantity} × R{selectedClass.price_per_share.toLocaleString()}
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            Next: Payment Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

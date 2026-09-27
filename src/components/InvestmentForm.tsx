import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "components/GlassCard";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface InvestmentFormProps {
  // Define props here
}

export const InvestmentForm: React.FC<InvestmentFormProps> = () => {
  return (
    <GlassCard>
      <CardHeader>
        <CardTitle>New Investment</CardTitle>
        <CardDescription>
          Fill out the form to create a new investment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="investment-type">Investment Type</Label>
          <Select>
            <SelectTrigger id="investment-type">
              <SelectValue placeholder="Select an investment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stocks">Stocks</SelectItem>
              <SelectItem value="bonds">Bonds</SelectItem>
              <SelectItem value="real-estate">Real Estate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" placeholder="Enter amount" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Create Investment</Button>
      </CardFooter>
    </GlassCard>
  );
};

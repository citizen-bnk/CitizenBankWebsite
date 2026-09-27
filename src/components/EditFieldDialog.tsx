import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type FieldType = 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';

interface EditFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  fieldLabel: string;
  currentValue: string | null | undefined;
  fieldType?: FieldType;
  selectOptions?: { label: string; value: string }[];
  onSave: (fieldName: string, newValue: string) => Promise<void>;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export const EditFieldDialog = ({
  open,
  onOpenChange,
  fieldName,
  fieldLabel,
  currentValue,
  fieldType = 'text',
  selectOptions = [],
  onSave,
  placeholder,
  description,
  required = false,
}: EditFieldDialogProps) => {
  const [value, setValue] = useState(currentValue || '');
  const [saving, setSaving] = useState(false);

  // Reset value when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setValue(currentValue || '');
    }
    onOpenChange(open);
  };

  const handleSave = async () => {
    // Validation
    if (required && !value.trim()) {
      toast.error(`${fieldLabel} is required`);
      return;
    }

    setSaving(true);
    try {
      await onSave(fieldName, value);
      toast.success(`${fieldLabel} updated successfully`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update field:', error);
      toast.error(error.message || `Failed to update ${fieldLabel}`);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = () => {
    switch (fieldType) {
      case 'textarea':
        return (
          <Textarea
            id={fieldName}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none"
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id={fieldName}>
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            id={fieldName}
            type={fieldType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {fieldLabel}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={fieldName}>
              {fieldLabel}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderInput()}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

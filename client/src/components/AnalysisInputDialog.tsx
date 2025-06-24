import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AnalysisInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  onSubmit: (inputValue: string) => void;
  isLoading: boolean;
}

export default function AnalysisInputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  onSubmit,
  isLoading,
}: AnalysisInputDialogProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (open) {
      setInputValue("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-dark-surface border-dark-border text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="analysis-input" className="text-gray-300">
            {label}
          </Label>
          <Textarea
            id="analysis-input"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="bg-dark-bg border-dark-border min-h-[100px]"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-dark-border text-gray-400">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !inputValue.trim()} className="bg-vscode-blue hover:bg-blue-600">
            {isLoading ? "Analyzing..." : "Run Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
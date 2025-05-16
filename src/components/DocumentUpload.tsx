
import React, { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface DocumentUploadProps {
  onDocumentSubmit: (documentDetails: {
    documentFile: File;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => void;
  projectId: string | null;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentSubmit, projectId }) => {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<"proposal" | "final" | "regular">("regular");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // If no document name is provided, use the file name without extension
      if (!documentName) {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setDocumentName(fileName || file.name);
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!documentName.trim()) {
      toast.error("Please provide a document name");
      return;
    }

    onDocumentSubmit({
      documentFile: selectedFile,
      documentName: documentName.trim(),
      documentType
    });

    // Reset form
    setDocumentName("");
    setDocumentType("regular");
    setSelectedFile(null);
    
    // Close dialog (handled by DialogClose)
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileUpload className="h-4 w-4" />
          Share Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Upload a document to share in this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              Select File
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button" 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <FileUpload className="mr-2 h-4 w-4" />
                {selectedFile ? "Change File" : "Select File"}
              </Button>
              <input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentName" className="text-sm font-medium">
              Document Name
            </Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Document Type</Label>
            <RadioGroup 
              value={documentType} 
              onValueChange={(value) => setDocumentType(value as "proposal" | "final" | "regular")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular">Regular Document</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="proposal" id="proposal" />
                <Label htmlFor="proposal">Project Proposal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="final" id="final" />
                <Label htmlFor="final">Final Deliverable</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSubmit} type="button">
              Share Document
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUpload;

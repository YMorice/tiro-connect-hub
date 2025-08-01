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
import { Upload, File } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { uploadFile, addDocumentToProject } from "@/services/document-service";
import { useAuth } from "@/context/auth-context";

interface DocumentUploadProps {
  onDocumentSubmit: (documentDetails: {
    documentUrl: string;
    documentName: string;
    documentType: "proposal" | "final" | "regular";
  }) => void;
  projectId: string | null;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentSubmit, projectId }) => {
  const { user, session } = useAuth();
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<"proposal" | "final" | "regular">("regular");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleSubmit = async () => {
    if (!session) {
      toast.error("You must be logged in to upload documents");
      return;
    }
    
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!documentName.trim()) {
      toast.error("Please provide a document name");
      return;
    }

    if (!projectId) {
      toast.error("No project selected");
      return;
    }

    setIsUploading(true);

    try {
      // Map our UI document types to database document types
      const dbDocumentType = documentType === "proposal" 
        ? "proposal" 
        : documentType === "final" ? "final_proposal" : "proposal";

      // Upload the file to Supabase storage
      const fileUrl = await uploadFile(selectedFile, projectId);
      
      if (!fileUrl) {
        toast.error("Failed to upload file");
        setIsUploading(false);
        return;
      }

      try {
        // Save document metadata to the database
        await addDocumentToProject(
          projectId,
          documentName.trim(),
          dbDocumentType as any,
          fileUrl
        );

        // Call the onDocumentSubmit callback with the document details
        onDocumentSubmit({
          documentUrl: fileUrl,
          documentName: documentName.trim(),
          documentType
        });

        // Reset form
        setDocumentName("");
        setDocumentType("regular");
        setSelectedFile(null);
        setDialogOpen(false);
        toast.success("Document uploaded successfully");
      } catch (error) {
        // Si l'upload du fichier a réussi mais que l'ajout des métadonnées échoue,
        // on ne montre pas d'erreur car le fichier est déjà dans le bucket
        console.error("Error adding document metadata:", error);
      }
    } catch (error) {
      console.error("Document upload error:", error);
      toast.error("An error occurred while uploading the document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={() => {
            if (!session) {
              toast.error("You must be logged in to upload documents");
              return false;
            }
            return true;
          }}
        >
          <File className="h-4 w-4" />
          Partager un document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager un document</DialogTitle>
          <DialogDescription>
            Téléverser un document pour ce projet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              Importer le document
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button" 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? "Change File" : "Importer un fichier"}
              </Button>
              <input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                disabled={isUploading}
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
              Nom du document
            </Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Entrer le nom du document"
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de document</Label>
            <RadioGroup 
              value={documentType} 
              onValueChange={(value) => setDocumentType(value as "proposal" | "final" | "regular")}
              className="flex flex-col space-y-2"
              disabled={isUploading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular">Document Classique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="proposal" id="proposal" />
                <Label htmlFor="proposal">Proposition de Rendu</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="final" id="final" />
                <Label htmlFor="final">Rendu Final</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>Annuler</Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit} 
            type="button"
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? "Uploading..." : "Partager"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUpload;

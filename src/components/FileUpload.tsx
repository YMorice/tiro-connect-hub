
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // en MB
  buttonText?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*",
  maxSize = 10,
  buttonText = "Télécharger un Fichier",
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Vérifier la taille du fichier
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`La taille du fichier dépasse la limite de ${maxSize}MB`);
      return;
    }

    setFileName(file.name);
    onFileSelect(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {buttonText}
        </Button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
      />
    </div>
  );
};

export default FileUpload;

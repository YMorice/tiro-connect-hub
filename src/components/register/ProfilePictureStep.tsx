
import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { RegistrationFormValues } from "@/types";
import FileUpload from "@/components/FileUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface ProfilePictureStepProps {
  form: UseFormReturn<RegistrationFormValues>;
  avatarUrl: string | undefined;
  setAvatarUrl: (url: string) => void;
  formData: RegistrationFormValues;
}

const ProfilePictureStep: React.FC<ProfilePictureStepProps> = ({ 
  avatarUrl, 
  setAvatarUrl, 
  formData 
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Télécharger le fichier vers le bucket pp
      const { error: uploadError } = await supabase
        .storage
        .from('pp')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
        
      if (uploadError) throw uploadError;
      
      // Obtenir l'URL publique avec cache busting
      const { data: urlData } = supabase
        .storage
        .from('pp')
        .getPublicUrl(filePath);
        
      const avatarUrlFromStorage = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(avatarUrlFromStorage);
      toast.success("Photo de profil téléchargée avec succès");
      
    } catch (error: any) {
      console.error("Erreur lors du téléchargement de la photo de profil:", error);
      toast.error(`Échec du téléchargement: ${error.message || "Erreur inconnue"}`);
      
      // Créer quand même une URL temporaire pour l'aperçu
      const tempUrl = URL.createObjectURL(file);
      setAvatarUrl(tempUrl);
    } finally {
      setIsUploading(false);
    }
  };

  // Obtenir les initiales de l'utilisateur en toute sécurité
  const getUserInitials = () => {
    if (formData.name) {
      return formData.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Ajouter une Photo de Profil</h3>
      <p className="text-sm text-muted-foreground">
        Téléchargez une photo de profil pour personnaliser votre compte
      </p>
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-24 h-24">
          {avatarUrl ? (
            <AvatarImage 
              src={avatarUrl} 
              alt={formData.name || "Utilisateur"}
              className="object-cover"
              onError={(e) => {
                console.error("Échec du chargement de l'image avatar:", avatarUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <AvatarFallback className="bg-tiro-primary text-white text-xl">
              {getUserInitials()}
            </AvatarFallback>
          )}
        </Avatar>
        <FileUpload 
          onFileSelect={handleFileSelect} 
          accept="image/*"
          buttonText={isUploading ? "Téléchargement..." : "Télécharger Photo de Profil"}
        />
      </div>
    </div>
  );
};

export default ProfilePictureStep;

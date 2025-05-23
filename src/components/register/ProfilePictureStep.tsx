
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
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to the pp bucket
      const { error: uploadError } = await supabase
        .storage
        .from('pp')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('pp')
        .getPublicUrl(filePath);
        
      const avatarUrlFromStorage = urlData.publicUrl;
      setAvatarUrl(avatarUrlFromStorage);
      toast.success("Profile picture uploaded successfully");
      
    } catch (error: any) {
      console.error("Error uploading profile picture:", error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
      
      // Still create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      setAvatarUrl(tempUrl);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Add a Profile Picture</h3>
      <p className="text-sm text-muted-foreground">
        Upload a profile picture to personalize your account
      </p>
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-24 h-24">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={formData.name} />
          ) : (
            <AvatarFallback>{formData.name?.charAt(0) || "U"}</AvatarFallback>
          )}
        </Avatar>
        <FileUpload 
          onFileSelect={handleFileSelect} 
          accept="image/*"
          buttonText={isUploading ? "Uploading..." : "Upload Profile Picture"}
        />
      </div>
    </div>
  );
};

export default ProfilePictureStep;

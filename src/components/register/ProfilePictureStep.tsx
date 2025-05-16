
import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { RegistrationFormValues } from "@/types";
import FileUpload from "@/components/FileUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
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
          buttonText="Upload Profile Picture"
        />
      </div>
    </div>
  );
};

export default ProfilePictureStep;


import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RegistrationFormValues } from "@/types";

interface SkillsStepProps {
  form: UseFormReturn<RegistrationFormValues>;
  selectedSkills: string[];
  setSelectedSkills: (skills: string[]) => void;
}

// Liste prédéfinie de compétences pour les cases à cocher
const AVAILABLE_SKILLS = [
  "After Effects",
  "Illustrator", 
  "InDesign", 
  "Photoshop",
  "Premiere Pro", 
  "Adobe XD", 
  "Canva", 
  "CorelDRAW", 
  "DaVinci Resolve",
  "Figma",
  "Final Cut Pro",
  "Framer",
  "Sketch"
];

const SkillsStep: React.FC<SkillsStepProps> = ({ selectedSkills, setSelectedSkills }) => {
  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(
      selectedSkills.includes(skill)
        ? selectedSkills.filter(s => s !== skill)
        : [...selectedSkills, skill]
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sélectionnez Vos Compétences</h3>
      <p className="text-sm text-muted-foreground">
        Choisissez les compétences qui représentent le mieux votre expertise
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
        {AVAILABLE_SKILLS.map((skill) => (
          <div key={skill} className="flex items-center space-x-2">
            <Checkbox 
              id={`skill-${skill}`} 
              checked={selectedSkills.includes(skill)}
              onCheckedChange={() => handleSkillToggle(skill)}
            />
            <Label 
              htmlFor={`skill-${skill}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {skill}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsStep;


import React from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase, type ProjectPack } from "@/integrations/supabase/client";

const PackSelection = () => {
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = React.useState<ProjectPack | null>(null);

  const { data: packs, isLoading, error } = useQuery({
    queryKey: ['project-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_packs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ProjectPack[];
    }
  });

  const handleSelectPack = (pack: ProjectPack) => {
    setSelectedPack(pack);
  };

  const handleContinue = () => {
    if (selectedPack) {
      navigate("/projects/new", { state: { selectedPack } });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container max-w-5xl mx-auto py-10">
          <div className="text-center">Loading packs...</div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container max-w-5xl mx-auto py-10">
          <div className="text-center text-red-500">
            Error loading packs: {(error as Error).message}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-2">Choose a Project Pack</h1>
        <p className="text-muted-foreground mb-8">
          Select the type of design work you need for your project
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs?.map((pack) => (
            <Card 
              key={pack.id}
              className={`cursor-pointer transition-all ${
                selectedPack?.id === pack.id 
                  ? "border-2 border-tiro-purple shadow-lg" 
                  : "hover:shadow-md"
              }`}
              onClick={() => handleSelectPack(pack)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{pack.name}</span>
                  {selectedPack?.id === pack.id && (
                    <Check className="text-tiro-purple h-5 w-5" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm min-h-[60px]">
                  {pack.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedPack}
            className="bg-tiro-purple hover:bg-tiro-purple/90"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default PackSelection;

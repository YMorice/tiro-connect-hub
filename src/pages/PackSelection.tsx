
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectPack, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

const PackSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<ProjectPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const { data, error } = await supabase
          .from('project_packs')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setPacks(data || []);
      } catch (error) {
        console.error("Error fetching packs:", error);
        toast.error("Failed to load project packs");
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handleSelectPack = (packId: string) => {
    // Store the selected pack ID in local storage temporarily
    localStorage.setItem("selectedPackId", packId);
    
    // Find the selected pack to pass as state
    const selectedPack = packs.find(pack => pack.id_pack === packId);
    
    // Navigate to new project page with the selected pack info
    navigate("/projects/new", { 
      state: { 
        selectedPack: {
          id: packId,
          name: selectedPack?.name || "",
          description: selectedPack?.description || ""
        }
      } 
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-8 px-4">
          <h1 className="text-2xl lg:text-3xl font-bold mb-8">Loading project packs...</h1>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 lg:py-8 px-4">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-4">Choose a Project Pack</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Select the package that best suits your project needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {packs.map((pack) => (
            <Card key={pack.id_pack} className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg lg:text-xl">{pack.name}</CardTitle>
                <CardDescription className="text-sm lg:text-base">{pack.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {pack.price !== null && pack.price !== undefined ? (
                  <p className="text-2xl lg:text-3xl font-bold mb-4">
                    {pack.price === 0 ? (
                      ""
                    ) : (
                      <>
                        {pack.from === true && "from "}
                        {pack.price.toFixed(2)} €
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-2xl lg:text-3xl font-bold mb-4">Contact us for pricing</p>
                )}
                <h3 className="font-semibold mb-3 text-sm lg:text-base">Features:</h3>
                <ul className="space-y-2">
                  {pack.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 flex-shrink-0 text-xs">✓</Badge>
                      <span className="text-xs lg:text-sm break-words">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex-shrink-0">
                <Button 
                  className="w-full text-sm lg:text-base" 
                  onClick={() => handleSelectPack(pack.id_pack)}
                >
                  Select This Pack
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default PackSelection;

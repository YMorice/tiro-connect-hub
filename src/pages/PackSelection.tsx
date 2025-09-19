
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectPack, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

// Declare global types
declare global {
  interface Window {
    updatePageTitle?: (pageName: string) => void;
    Calendly?: {
      initInlineWidget: (config: any) => void;
    };
  }
}

const PackSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<ProjectPack[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    // Update page title
    if (window.updatePageTitle) {
      window.updatePageTitle('Sélection de pack');
    }

    const fetchPacks = async () => {
      try {
        const { data, error } = await supabase
          .from('project_packs')
          .select('*')
          .eq('active', true)
          .order('rank', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setPacks(data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des packs :", error);
        toast.error("Échec du chargement des packs de projet");
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handleSelectPack = (packId: string) => {
    localStorage.setItem('selectedPackId', packId);
    
    const selectedPack = packs.find(pack => pack.id_pack === packId);
    if (selectedPack) {
      navigate("/service-selection", { 
        state: { 
          selectedPack: {
            id: selectedPack.id_pack,
            name: selectedPack.name,
            description: selectedPack.description
          }
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl py-4 px-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Chargement des packs de projet...</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-4 px-4 bg-tiro-test">
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-clash mb-2 text-left tracking-wide">Choisissez un pack de projet</h1>
        <p className="text-muted-foreground text-sm text-left">
          Sélectionnez le Pack qui convient le mieux aux besoins de votre projet.
        </p>
      </div>

      <Card className="w-full mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Besoin d'accompagnement ?</h3>
              <p className="text-muted-foreground">
                Si vous avez la moindre question sur votre projet, notre équipe est là pour vous accompagner. 
                Réservez un appel gratuit pour discuter de vos besoins.
              </p>
            </div>
            <Button 
              onClick={() => window.open('https://tiro.agency/reserver-meeting', '_blank')}
              className="ml-4 bg-primary hover:bg-primary/90 whitespace-nowrap"
            >
              Réserver un appel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <Card key={pack.id_pack} className="flex flex-col h-full bg-tiro-white">
            <CardHeader className="flex-shrink-0 p-4">
              <CardTitle className="text-lg">{pack.name}</CardTitle>
              <CardDescription className="text-sm">{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0">
              <h3 className="font-semibold mb-2 text-sm">Fonctionnalités :</h3>
              <ul className="space-y-1">
                {pack.features?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">✓</Badge>
                    <span className="text-xs leading-5 break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-shrink-0 p-4">
              <Button 
                className="w-full text-md h-9 font-clash tracking-wide" 
                onClick={() => handleSelectPack(pack.id_pack)}
              >
                {pack.price !== null && pack.price !== undefined ? (
                  pack.price === 0 ? (
                    "Obtenir un devis"
                  ) : (
                    <>
                      {pack.from === true && "À partir de "}
                      {pack.price.toFixed(2)} €
                    </>
                  )
                ) : (
                  "Obtenir un devis"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PackSelection;

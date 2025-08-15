
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

    // Load Calendly stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(link);

    // Load Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = () => {
      try {
        window.Calendly?.initInlineWidget({
          url: 'https://calendly.com/contact-tiro/30min?hide_gdpr_banner=1',
          parentElement: document.querySelector('.calendly-inline-widget') as HTMLElement,
          prefill: {},
          utm: {},
        });
      } catch (e) {
        console.warn('Calendly init failed', e);
      }
    };
    document.body.appendChild(script);

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
        console.error("Erreur lors du chargement des packs :", error);
        toast.error("Échec du chargement des packs de projet");
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();

    return () => {
      // Cleanup Calendly assets on unmount
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) existingScript.remove();

      const existingLink = document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]');
      if (existingLink) existingLink.remove();
    };
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

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-center">Choisissez un pack de projet</h1>
        <p className="text-muted-foreground text-sm text-center">
          Sélectionnez le Pack qui convient le mieux aux besoins de votre projet.
        </p>
      </div>

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
                className="w-full text-sm h-9" 
                onClick={() => handleSelectPack(pack.id_pack)}
              >
                {pack.price !== null && pack.price !== undefined ? (
                  pack.price === 0 ? (
                    "Obtenir un devis"
                  ) : (
                    <>
                      {pack.from === true && "À partir de "}
                      {pack.price.toFixed(2)} € - Sélectionner
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

      {/* Calendly Section */}
      <div className="mt-12 pt-8 border-t">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Besoin d'aide pour choisir ?</h2>
          <p className="text-muted-foreground">
            Réservez un appel gratuit avec notre équipe pour discuter de votre projet
          </p>
        </div>
        
        <div className="calendly-inline-widget" 
              data-url="https://calendly.com/contact-tiro/30min?hide_gdpr_banner=1" 
              style={{minWidth:'320px', height:'700px', width:'100%'}}>
        </div>
      </div>
    </div>
  );
};

export default PackSelection;

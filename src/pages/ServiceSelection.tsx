import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface Service {
  service_id: string;
  title: string;
  description: string | null;
  price: string;
  rank: number;
}

interface ProjectPack {
  id: string;
  name: string;
  description: string;
}

interface LocationState {
  selectedPack: ProjectPack;
  projectTitle?: string;
  projectDescription?: string;
  deadline?: Date;
}

interface ServiceSelection {
  serviceId: string;
  quantity: number;
  price: number;
}

const ServiceSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Record<string, ServiceSelection>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);

  const locationState = location.state as LocationState | undefined;
  const selectedPack = locationState?.selectedPack;

  // Redirect if no pack selected or not custom quote
  React.useEffect(() => {
    if (!selectedPack || selectedPack.name !== 'Devis personnalisé') {
      navigate("/pack-selection", { replace: true });
    }
  }, [selectedPack, navigate]);

  // Fetch services and entrepreneur ID
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .order('rank', { ascending: true });

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        // Fetch entrepreneur ID
        if (user) {
          const { data: entrepreneurData, error: entrepreneurError } = await supabase
            .from('entrepreneurs')
            .select('id_entrepreneur')
            .eq('id_user', user.id)
            .single();

          if (entrepreneurError) {
            console.error("Error fetching entrepreneur ID:", entrepreneurError);
            toast.error("Erreur lors de la récupération de votre profil d'entrepreneur");
          } else {
            setEntrepreneurId(entrepreneurData.id_entrepreneur);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erreur lors du chargement des services");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Parse price from string (remove € and "à partir de" text)
  const parsePrice = (priceString: string): number => {
    const match = priceString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Handle service selection
  const handleServiceToggle = (service: Service, checked: boolean) => {
    setSelectedServices(prev => {
      const newSelection = { ...prev };
      
      if (checked) {
        newSelection[service.service_id] = {
          serviceId: service.service_id,
          quantity: 1,
          price: parsePrice(service.price)
        };
      } else {
        delete newSelection[service.service_id];
      }
      
      return newSelection;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (serviceId: string, delta: number) => {
    setSelectedServices(prev => {
      const current = prev[serviceId];
      if (!current) return prev;
      
      const newQuantity = Math.max(0, current.quantity + delta);
      
      if (newQuantity === 0) {
        const newSelection = { ...prev };
        delete newSelection[serviceId];
        return newSelection;
      }
      
      return {
        ...prev,
        [serviceId]: {
          ...current,
          quantity: newQuantity
        }
      };
    });
  };

  // Calculate total price
  const calculateTotal = (): number => {
    return Object.values(selectedServices).reduce(
      (total, selection) => total + (selection.price * selection.quantity),
      0
    );
  };

  // Handle proceeding to project creation
  const handleProceedToProjectCreation = () => {
    navigate("/projects/new", {
      state: {
        selectedPack,
        selectedServices: Object.values(selectedServices),
        totalPrice: calculateTotal()
      }
    });
  };

  if (!selectedPack || loading) {
    return (
      <div className="container max-w-6xl py-4 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-4 px-4">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/pack-selection")} 
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-clash mb-2 text-left tracking-wide">
          Sélectionnez vos services
        </h1>
        <p className="text-muted-foreground text-sm text-left">
          Choisissez les services dont vous avez besoin pour votre projet.
        </p>
      </div>

      <Card className="w-full mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Besoin d'accompagnement ?</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Si vous avez la moindre question sur votre projet, notre équipe est là pour vous accompagner.
              </p>
              <p className="text-muted-foreground text-sm sm:text-base">
                Réservez un appel gratuit pour discuter de vos besoins.
              </p>
            </div>
            <Button 
              onClick={() => window.open('https://tiro.agency/reserver-meeting', '_blank')}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto sm:ml-4 sm:whitespace-nowrap"
            >
              Réserver un appel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:items-start">
        {/* Services List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => {
              const isSelected = selectedServices[service.service_id];
              const quantity = isSelected?.quantity || 0;

              return (
                <Card 
                  key={service.service_id} 
                  className={`flex flex-col h-full cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-2 border-tiro-primary hover:bg-tiro-gray2/10' 
                      : 'hover:bg-tiro-gray2/10'
                  }`}
                  onClick={() => handleServiceToggle(service, !isSelected)}
                >
                  <CardHeader className="flex-shrink-0 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {service.title}
                        </CardTitle>
                        {service.description && (
                          <CardDescription className="text-sm mt-1 whitespace-pre-line">
                            {service.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <p className="font-semibold text-primary">{service.price}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-grow p-4 pt-0">
                    <div className="flex items-center justify-end">
                      {isSelected && (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(service.service_id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <span className="w-8 text-center font-medium">
                            {quantity}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(service.service_id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 self-start">
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
              <CardDescription>Services sélectionnés</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Object.values(selectedServices).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun service sélectionné
                  </p>
                ) : (
                  Object.values(selectedServices).map((selection) => {
                    const service = services.find(s => s.service_id === selection.serviceId);
                    if (!service) return null;

                    return (
                      <div key={selection.serviceId} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{service.title}</p>
                          <p className="text-muted-foreground">
                            Quantité: {selection.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {(selection.price * selection.quantity).toFixed(0)}€
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{calculateTotal().toFixed(0)}€</span>
                </div>
              </div>
              
              <Button 
                onClick={handleProceedToProjectCreation}
                disabled={Object.keys(selectedServices).length === 0}
                className="w-full"
              >
                Continuer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;
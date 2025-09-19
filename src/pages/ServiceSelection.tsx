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
  projectTitle: string;
  projectDescription: string;
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
      
      const newQuantity = Math.max(1, current.quantity + delta);
      
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

  // Handle project creation with selected services
  const handleCreateProject = async () => {
    if (!user || !entrepreneurId || !locationState) {
      toast.error("Informations manquantes pour créer le projet");
      return;
    }

    if (Object.keys(selectedServices).length === 0) {
      toast.error("Veuillez sélectionner au moins un service");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the project first
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: locationState.projectTitle,
          description: locationState.projectDescription,
          id_entrepreneur: entrepreneurId,
          id_pack: selectedPack!.id,
          status: 'STEP1',
          deadline: locationState.deadline ? locationState.deadline.toISOString().split('T')[0] : null,
          price: calculateTotal()
        })
        .select('id_project')
        .single();

      if (projectError) throw projectError;

      const projectId = projectData.id_project;

      // Insert selected services
      const serviceInserts = Object.values(selectedServices).map(selection => ({
        project_id: projectId,
        service_id: selection.serviceId,
        quantity: selection.quantity
      }));

      const { error: servicesError } = await supabase
        .from('project_services')
        .insert(serviceInserts);

      if (servicesError) throw servicesError;

      toast.success("Projet créé avec succès avec les services sélectionnés!");
      navigate(`/projects/${projectId}`);

    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Erreur lors de la création du projet");
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="container max-w-7xl mx-auto py-4 px-4">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/projects/new", { state: locationState })} 
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
          Choisissez les services dont vous avez besoin pour votre devis personnalisé.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Services List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => {
              const isSelected = selectedServices[service.service_id];
              const quantity = isSelected?.quantity || 0;

              return (
                <Card key={service.service_id} className="flex flex-col h-full">
                  <CardHeader className="flex-shrink-0 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{service.title}</CardTitle>
                        {service.description && (
                          <CardDescription className="text-sm mt-1">
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
                    <div className="flex items-center justify-between">
                      {!isSelected ? (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={service.service_id}
                            checked={false}
                            onCheckedChange={(checked) => 
                              handleServiceToggle(service, checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={service.service_id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Sélectionner
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={service.service_id}
                              checked={true}
                              onCheckedChange={(checked) => 
                                handleServiceToggle(service, checked as boolean)
                              }
                            />
                            <span className="text-sm font-medium text-primary">
                              Sélectionné
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(service.service_id, -1)}
                              disabled={quantity <= 1}
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
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
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
                onClick={handleCreateProject}
                disabled={Object.keys(selectedServices).length === 0 || isSubmitting || !entrepreneurId}
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                    Création...
                  </div>
                ) : (
                  "Créer le projet"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;
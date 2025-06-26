
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Euro } from 'lucide-react';

interface PriceUpdateDialogProps {
  projectId: string;
  projectTitle: string;
  currentPrice: number | null;
  onPriceUpdated: () => void;
}

const PriceUpdateDialog: React.FC<PriceUpdateDialogProps> = ({
  projectId,
  projectTitle,
  currentPrice,
  onPriceUpdated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState(currentPrice?.toString() || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePrice = async () => {
    const priceValue = parseFloat(price);
    
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }

    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ price: priceValue })
        .eq('id_project', projectId);
        
      if (error) throw error;
      
      toast.success('Prix mis à jour avec succès');
      setIsOpen(false);
      onPriceUpdated();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Erreur lors de la mise à jour du prix');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center text-xs h-8"
        >
          <Euro className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Définir Prix</span>
          <span className="sm:hidden">Prix</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Définir le prix du projet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Projet: <strong>{projectTitle}</strong>
            </p>
            {currentPrice && (
              <p className="text-sm text-muted-foreground">
                Prix actuel: <strong>{currentPrice.toLocaleString('fr-FR')} €</strong>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Entrez le prix en euros"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdatePrice}
              disabled={isUpdating}
            >
              {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceUpdateDialog;

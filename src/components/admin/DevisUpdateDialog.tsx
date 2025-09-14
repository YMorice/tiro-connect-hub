import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { FileText } from 'lucide-react';

interface DevisUpdateDialogProps {
  projectId: string;
  projectTitle: string;
  currentDevis: string | null;
  onDevisUpdated: () => void;
}

const DevisUpdateDialog: React.FC<DevisUpdateDialogProps> = ({
  projectId,
  projectTitle,
  currentDevis,
  onDevisUpdated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [devis, setDevis] = useState(currentDevis || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateDevis = async () => {
    if (!devis.trim()) {
      toast.error('Veuillez entrer un devis');
      return;
    }

    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ devis: devis.trim() })
        .eq('id_project', projectId);
        
      if (error) throw error;
      
      toast.success('Devis mis à jour avec succès');
      setIsOpen(false);
      onDevisUpdated();
    } catch (error) {
      console.error('Error updating devis:', error);
      toast.error('Erreur lors de la mise à jour du devis');
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
          <FileText className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Modifier Devis</span>
          <span className="sm:hidden">Devis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le devis du projet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Projet: <strong>{projectTitle}</strong>
            </p>
            {currentDevis && (
              <p className="text-sm text-muted-foreground">
                Devis actuel: <em className="italic">{currentDevis}</em>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="devis">Devis</Label>
            <Textarea
              id="devis"
              value={devis}
              onChange={(e) => setDevis(e.target.value)}
              placeholder="Entrez le contenu du devis"
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateDevis}
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

export default DevisUpdateDialog;
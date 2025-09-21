import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, User } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface Entrepreneur {
  id_entrepreneur: string;
  id_user: string;
  company_name: string | null;
  users: {
    name: string;
    surname: string;
    email: string;
  } | null;
}

interface TransferProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  currentEntrepreneurName: string;
  onTransferSuccess: () => void;
}

const TransferProjectDialog: React.FC<TransferProjectDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  currentEntrepreneurName,
  onTransferSuccess,
}) => {
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<Entrepreneur | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Fetch entrepreneurs when dialog opens
  useEffect(() => {
    if (open) {
      fetchEntrepreneurs();
    }
  }, [open]);

  const fetchEntrepreneurs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entrepreneurs')
        .select(`
          id_entrepreneur,
          id_user,
          company_name,
          users (
            name,
            surname,
            email
          )
        `)
        .order('users(name)', { ascending: true });

      if (error) throw error;

      setEntrepreneurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des entrepreneurs:', error);
      toast.error("Échec du chargement des entrepreneurs");
    } finally {
      setLoading(false);
    }
  };

  // Filter entrepreneurs based on search
  const filteredEntrepreneurs = entrepreneurs.filter(entrepreneur => {
    const fullName = `${entrepreneur.users?.name || ""} ${entrepreneur.users?.surname || ""}`.trim();
    const companyName = entrepreneur.company_name || "";
    const email = entrepreneur.users?.email || "";
    
    const searchLower = searchQuery.toLowerCase();
    
    return fullName.toLowerCase().includes(searchLower) ||
           companyName.toLowerCase().includes(searchLower) ||
           email.toLowerCase().includes(searchLower);
  });

  const handleTransfer = async () => {
    if (!selectedEntrepreneur) {
      toast.error("Veuillez sélectionner un entrepreneur");
      return;
    }

    try {
      setTransferring(true);
      
      const { error } = await supabase
        .from('projects')
        .update({ id_entrepreneur: selectedEntrepreneur.id_entrepreneur })
        .eq('id_project', projectId);

      if (error) throw error;

      toast.success(`Projet transféré avec succès vers ${selectedEntrepreneur.users?.name} ${selectedEntrepreneur.users?.surname}`);
      onTransferSuccess();
      onOpenChange(false);
      setSelectedEntrepreneur(null);
      setSearchQuery("");
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      toast.error("Échec du transfert du projet");
    } finally {
      setTransferring(false);
    }
  };

  const getEntrepreneurDisplayName = (entrepreneur: Entrepreneur) => {
    const fullName = `${entrepreneur.users?.name || ""} ${entrepreneur.users?.surname || ""}`.trim();
    return fullName || "Nom inconnu";
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedEntrepreneur(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transférer le projet</DialogTitle>
          <DialogDescription>
            Transférer le projet "{projectTitle}" vers un autre entrepreneur.
            <br />
            <span className="text-sm text-muted-foreground">
              Entrepreneur actuel: {currentEntrepreneurName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par nom, entreprise ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="border rounded-md overflow-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntrepreneurs.length > 0 ? (
                    filteredEntrepreneurs.map((entrepreneur) => (
                      <TableRow
                        key={entrepreneur.id_entrepreneur}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedEntrepreneur?.id_entrepreneur === entrepreneur.id_entrepreneur
                            ? "bg-muted"
                            : ""
                        }`}
                        onClick={() => setSelectedEntrepreneur(entrepreneur)}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {selectedEntrepreneur?.id_entrepreneur === entrepreneur.id_entrepreneur && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {getEntrepreneurDisplayName(entrepreneur)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {entrepreneur.company_name ? (
                              <span>{entrepreneur.company_name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Non spécifiée</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{entrepreneur.users?.email}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "Aucun entrepreneur trouvé" : "Aucun entrepreneur disponible"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {selectedEntrepreneur && (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">Entrepreneur sélectionné:</p>
              <p className="text-sm text-muted-foreground">
                {getEntrepreneurDisplayName(selectedEntrepreneur)}
                {selectedEntrepreneur.company_name && ` - ${selectedEntrepreneur.company_name}`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedEntrepreneur || transferring}
          >
            {transferring ? "Transfert en cours..." : "Confirmer le transfert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferProjectDialog;
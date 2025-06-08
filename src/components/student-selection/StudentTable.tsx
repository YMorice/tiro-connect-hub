
/**
 * Composant Tableau des Étudiants
 * 
 * Ce composant affiche un tableau complet des étudiants avec une fonctionnalité de sélection.
 * Il est conçu pour être utilisé dans les flux de travail de sélection d'étudiants où les utilisateurs doivent choisir
 * des étudiants pour des affectations de projet.
 * 
 * Fonctionnalités clés :
 * - Design de tableau réactif qui s'adapte à différentes tailles d'écran
 * - Sélection par case à cocher avec retour visuel
 * - Affichage complet des informations des étudiants
 * - États de chargement et vides
 * - Indicateurs de statut de disponibilité
 * - Affichage des compétences avec des tags
 * - Zone de contenu défilable pour de grands ensembles de données
 * 
 * Visibilité des colonnes :
 * - Toujours visible : Case à cocher de sélection, Nom
 * - sm et plus : Statut disponible
 * - md et plus : Compétences
 * - lg et plus : Spécialité
 * - xl et plus : Biographie
 * 
 * Le composant utilise les utilitaires réactifs de Tailwind pour montrer progressivement
 * plus d'informations à mesure que la taille de l'écran augmente, garantissant l'utilisabilité sur tous les appareils.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

/**
 * Interface pour la structure des données étudiant
 * Contient toutes les informations nécessaires pour afficher et sélectionner les étudiants
 */
interface Student {
  /** Identifiant unique pour l'étudiant */
  id: string;
  /** Adresse email de l'étudiant */
  email: string;
  /** Nom complet de l'étudiant */
  name: string;
  /** Biographie/description optionnelle */
  bio?: string;
  /** Tableau des compétences de l'étudiant */
  skills?: string[];
  /** Domaine de spécialité de l'étudiant */
  specialty?: string;
  /** Si l'étudiant est actuellement disponible pour de nouveaux projets */
  available?: boolean;
}

/**
 * Interface des props pour le composant StudentTable
 */
interface StudentTableProps {
  /** Tableau de tous les étudiants à afficher dans le tableau */
  students: Student[];
  /** Tableau des étudiants actuellement sélectionnés */
  selectedStudents: Student[];
  /** Fonction de rappel quand l'état de sélection d'un étudiant change */
  onToggleSelection: (student: Student) => void;
  /** Fonction pour vérifier si un étudiant spécifique est actuellement sélectionné */
  isStudentSelected: (studentId: string) => boolean;
  /** Si le tableau est dans un état de chargement */
  loading: boolean;
  /** Message à afficher quand aucun étudiant n'est disponible */
  emptyMessage: string;
}

/**
 * Composant StudentTable
 * 
 * Rend un tableau complet des étudiants avec des capacités de sélection
 * et un design réactif pour un affichage optimal sur tous les appareils.
 * 
 * @param students - Tableau des étudiants à afficher
 * @param selectedStudents - Étudiants actuellement sélectionnés
 * @param onToggleSelection - Rappel pour les changements de sélection
 * @param isStudentSelected - Fonction pour vérifier l'état de sélection
 * @param loading - Indicateur d'état de chargement
 * @param emptyMessage - Message pour l'état vide
 */
export const StudentTable = ({
  students,
  selectedStudents,
  onToggleSelection,
  isStudentSelected,
  loading,
  emptyMessage
}: StudentTableProps) => {
  
  // Afficher un spinner de chargement pendant que les données sont récupérées
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Résumé de la sélection */}
      <div className="mb-4 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {selectedStudents.length === 0 
            ? "Aucun étudiant sélectionné" 
            : `${selectedStudents.length} étudiant${selectedStudents.length !== 1 ? 's' : ''} sélectionné${selectedStudents.length !== 1 ? 's' : ''}`}
        </p>
      </div>
      
      {/* Conteneur de tableau avec défilement */}
      <div className="border rounded-md flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            {/* En-tête de tableau avec visibilité de colonne réactive */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sélectionner</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Disponible</TableHead>
                <TableHead className="hidden md:table-cell">Compétences</TableHead>
                <TableHead className="hidden lg:table-cell">Spécialité</TableHead>
                <TableHead className="hidden xl:table-cell">Bio</TableHead>
              </TableRow>
            </TableHeader>
            
            {/* Corps du tableau */}
            <TableBody>
              {students.length > 0 ? (
                students.map(student => (
                  <TableRow 
                    key={student.id}
                    className={isStudentSelected(student.id) ? "bg-muted/50" : ""}
                  >
                    {/* Case à cocher de sélection */}
                    <TableCell>
                      <Checkbox
                        checked={isStudentSelected(student.id)}
                        onCheckedChange={() => onToggleSelection(student)}
                        aria-label={`Sélectionner ${student.name}`}
                      />
                    </TableCell>
                    
                    {/* Nom de l'étudiant - Toujours visible */}
                    <TableCell className="font-medium">{student.name}</TableCell>
                    
                    {/* Statut de disponibilité - Visible sur les écrans sm+ */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={student.available !== false ? "default" : "secondary"}
                        className={student.available !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {student.available !== false ? "Disponible" : "Indisponible"}
                      </Badge>
                    </TableCell>
                    
                    {/* Compétences - Visible sur les écrans md+ */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {student.skills?.map((skill, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted"
                          >
                            {skill}
                          </span>
                        )) || "Aucune compétence listée"}
                      </div>
                    </TableCell>
                    
                    {/* Spécialité - Visible sur les écrans lg+ */}
                    <TableCell className="hidden lg:table-cell">
                      {student.specialty || "Non spécifiée"}
                    </TableCell>
                    
                    {/* Biographie - Visible sur les écrans xl+ */}
                    <TableCell className="hidden xl:table-cell max-w-[300px] truncate">
                      {student.bio || "Aucune bio disponible"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                /* État vide */
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

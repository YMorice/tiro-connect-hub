
import { Search, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StudentSelectionFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  skillFilter: string;
  setSkillFilter: (skill: string) => void;
  specialtyFilter: string;
  setSpecialtyFilter: (specialty: string) => void;
  specialties: string[];
  onClearFilters: () => void;
}

export const StudentSelectionFilters = ({
  searchQuery,
  setSearchQuery,
  skillFilter,
  setSkillFilter,
  specialtyFilter,
  setSpecialtyFilter,
  specialties,
  onClearFilters
}: StudentSelectionFiltersProps) => {
  const hasActiveFilters = searchQuery || skillFilter || specialtyFilter;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtres</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">Rechercher par nom ou bio</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Rechercher des étudiants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="skill" className="text-sm font-medium">Filtrer par compétence</label>
            <Input
              id="skill"
              type="text"
              placeholder="Entrez une compétence..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="specialty" className="text-sm font-medium">Filtrer par spécialité</label>
            <Select
              value={specialtyFilter}
              onValueChange={setSpecialtyFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les spécialités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les spécialités</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty.toLowerCase()}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClearFilters}
              className="flex items-center"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Effacer les filtres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

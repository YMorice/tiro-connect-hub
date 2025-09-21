import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, FileText, Search, Calendar, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/components/AppLayout';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentType {
  id_document: string;
  name: string;
  type: string;
  link: string;
  created_at: string;
  updated_at: string;
  id_project: string;
  project?: {
    title: string;
  };
}

const PersonalDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'proposal' | 'final_proposal'>('all');


  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user?.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Get documents for the current user
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('id_document, name, type, link, created_at, updated_at, id_project')
        .eq('id_user', user?.id)
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        toast.error('Erreur lors du chargement des documents');
        return;
      }

      if (!documentsData || documentsData.length === 0) {
        setDocuments([]);
        return;
      }

      // Get project titles
      const projectIds = documentsData.map(doc => doc.id_project);
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id_project, title')
        .in('id_project', projectIds);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      // Combine the data
      const documentsWithProject: DocumentType[] = documentsData.map(doc => ({
        id_document: doc.id_document,
        name: doc.name,
        type: doc.type,
        link: doc.link,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        id_project: doc.id_project,
        project: projectsData?.find(p => p.id_project === doc.id_project)
      }));

      setDocuments(documentsWithProject);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: DocumentType) => {
    try {
      // Extract bucket and path from the link
      const url = new URL(document.link);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[pathParts.length - 2];
      const fileName = pathParts[pathParts.length - 1];

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);

      if (error) {
        console.error('Error downloading file:', error);
        toast.error('Erreur lors du téléchargement du document');
        return;
      }

      // Create download link
      const blob = new Blob([data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = window.document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = document.name;
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      window.document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'proposal':
        return 'Proposition';
      case 'final_proposal':
        return 'Proposition finale';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'proposal':
        return 'bg-blue-100 text-blue-800';
      case 'final_proposal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.project?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-tiro-test px-3 py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-clash text-tiro-black tracking-wide">Mes Documents</h1>
          </div>
          <p className="text-gray-600">
            Retrouvez ici vos documents administratifs personnels.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par nom de document ou projet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-tiro-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterType !== 'all' ? 'Aucun document trouvé' : 'Aucun document'}
                </h3>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <Card key={document.id_document} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {document.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {document.project?.title || 'Projet sans nom'}
                      </p>
                    </div>
                    <Badge className={`ml-2 ${getTypeColor(document.type)}`}>
                      {getTypeLabel(document.type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Ajouté le {format(new Date(document.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                    
                    <Button
                      onClick={() => handleDownload(document)}
                      className="w-full"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && filteredDocuments.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} trouvé{filteredDocuments.length > 1 ? 's' : ''}
            {(searchTerm || filterType !== 'all') && ` sur ${documents.length} au total`}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalDocuments;
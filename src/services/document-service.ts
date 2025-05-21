
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

/**
 * Upload a file to Supabase Storage
 * @param file The file to upload
 * @param projectId The project ID to associate with the file
 * @returns The URL of the uploaded file
 */
export const uploadFile = async (file: File, projectId: string): Promise<string | null> => {
  try {
    if (!file) {
      toast.error("No file selected");
      return null;
    }

    // Create a unique file path using projectId/timestamp-filename
    const timestamp = new Date().getTime();
    const filePath = `${projectId}/${timestamp}-${file.name}`;

    // Upload file to 'documents' bucket
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      toast.error(`Error uploading file: ${error.message}`);
      return null;
    }

    // Generate a public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Failed to upload file');
    return null;
  }
};

/**
 * Add a document to a project
 * @param projectId The project ID
 * @param name Document name
 * @param type Document type ('proposal' or 'final_proposal')
 * @param link Document URL
 * @returns The created document data
 */
export const addDocumentToProject = async (
  projectId: string,
  name: string,
  type: 'proposal' | 'final_proposal',
  link: string
) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        id_project: projectId,
        name,
        type,
        link
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding document:', error);
      toast.error(`Failed to add document: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error adding document:', error);
    toast.error('Failed to add document');
    return null;
  }
};

/**
 * Get documents for a project
 * @param projectId The project ID
 * @returns Array of documents
 */
export const getProjectDocuments = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id_project', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      toast.error(`Failed to fetch documents: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    toast.error('Failed to fetch documents');
    return [];
  }
};

/**
 * Delete a document
 * @param documentId The document ID to delete
 * @returns Success boolean
 */
export const deleteDocument = async (documentId: string) => {
  try {
    // First get the document to find its storage location
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id_document', documentId)
      .single();

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      toast.error(`Failed to fetch document: ${fetchError.message}`);
      return false;
    }

    // Delete from the database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id_document', documentId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      toast.error(`Failed to delete document: ${deleteError.message}`);
      return false;
    }

    // Try to delete from storage if it's a storage URL
    // Extract the path from the document.link if it's a storage URL
    if (document && document.link.includes('supabase.co')) {
      const path = document.link.split('/').slice(-2).join('/');
      
      if (path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([path]);

        if (storageError) {
          console.warn('Error deleting file from storage:', storageError);
          // We don't fail the entire operation if storage delete fails
        }
      }
    }

    toast.success('Document deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    toast.error('Failed to delete document');
    return false;
  }
};

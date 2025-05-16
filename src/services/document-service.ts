
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/sonner";

// Check if the documents bucket exists, if not create it
const ensureDocumentsBucket = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (!buckets?.some(bucket => bucket.name === 'documents')) {
    await supabase.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    });
  }
};

// Upload a document file to Supabase storage
export const uploadDocumentFile = async (
  file: File,
  projectId: string
): Promise<string | null> => {
  try {
    // Ensure the documents bucket exists
    await ensureDocumentsBucket();
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${uuidv4()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
      
    if (error) {
      toast.error(`Error uploading file: ${error.message}`);
      return null;
    }
    
    // Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('File upload error:', error);
    toast.error('Failed to upload file');
    return null;
  }
};

// Save document metadata to the database
export const saveDocumentToDB = async (
  projectId: string, 
  documentName: string,
  documentType: 'proposal' | 'final_proposal',
  fileUrl: string
) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        id_project: projectId,
        name: documentName,
        type: documentType,
        link: fileUrl
      })
      .select()
      .single();
      
    if (error) {
      toast.error(`Error saving document: ${error.message}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Save document error:', error);
    toast.error('Failed to save document');
    return null;
  }
};

// Get all documents for a project
export const getProjectDocuments = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id_project', projectId)
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error(`Error fetching documents: ${error.message}`);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Fetch documents error:', error);
    toast.error('Failed to fetch documents');
    return [];
  }
};

// Delete a document
export const deleteDocument = async (documentId: string) => {
  try {
    // First get the document to get its file URL
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id_document', documentId)
      .single();
      
    if (fetchError) {
      toast.error(`Error fetching document: ${fetchError.message}`);
      return false;
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id_document', documentId);
      
    if (deleteError) {
      toast.error(`Error deleting document: ${deleteError.message}`);
      return false;
    }
    
    // If we have a file URL, extract the path and delete from storage
    if (document.link) {
      try {
        // Extract the file path from the URL
        const url = new URL(document.link);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');
        
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([filePath]);
            
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      } catch (storageError) {
        console.error('Error processing file deletion:', storageError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Delete document error:', error);
    toast.error('Failed to delete document');
    return false;
  }
};

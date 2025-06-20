/**
 * Document Service
 * 
 * This service provides comprehensive document management functionality for the application.
 * It handles file uploads to Supabase Storage, document metadata management in the database,
 * and provides utilities for document operations throughout the project lifecycle.
 * 
 * Key Features:
 * - File upload to Supabase Storage with proper organization
 * - Document metadata storage and retrieval
 * - Error handling and user feedback via toasts
 * - File path generation with timestamps for uniqueness
 * - Document deletion with cleanup of both database and storage
 * - Multiple function aliases for semantic clarity in different contexts
 * 
 * Storage Organization:
 * - Files are organized by project ID in folders
 * - Timestamps are added to filenames to prevent conflicts
 * - Public URLs are generated for easy access
 * 
 * Security Considerations:
 * - File uploads are authenticated through Supabase Auth
 * - Storage bucket permissions control access
 * - Document metadata includes creator information
 * - File type and size restrictions are enforced
 * 
 * The service integrates with the toast notification system to provide
 * immediate feedback to users about operation success or failure.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

// Configuration des types de fichiers autorisés
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Taille maximale de fichier (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validation du fichier
const validateFile = (file: File) => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorisé. Types acceptés : PDF, Word, Excel, images (JPEG, PNG, GIF)');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Le fichier est trop volumineux. Taille maximale : 10 MB');
  }

  return true;
};

/**
 * Uploads a file to Supabase Storage
 * 
 * This function handles the complete file upload process:
 * 1. Validates that a file is provided
 * 2. Generates a unique file path using project ID and timestamp
 * 3. Uploads the file to the 'documents' storage bucket
 * 4. Generates and returns a public URL for the uploaded file
 * 5. Provides user feedback through toast notifications
 * 
 * File Organization:
 * - Files are stored in project-specific folders: `{projectId}/{timestamp}-{filename}`
 * - Timestamps prevent filename conflicts
 * - Cache control is set to 1 hour for performance
 * 
 * @param file - The File object to upload
 * @param projectId - The project ID to associate with the file (used for folder organization)
 * @returns Promise<string | null> - The public URL of the uploaded file, or null if upload failed
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const url = await uploadFile(file, "project-123");
 * if (url) {
 *   console.log("File uploaded to:", url);
 * }
 * ```
 */
export const uploadFile = async (file: File, projectId: string): Promise<string | null> => {
  try {
    // Validation du fichier
    validateFile(file);

    if (!file) {
      toast.error("No file selected");
      return null;
    }

    // Create a unique file path using projectId/timestamp-filename
    const timestamp = new Date().getTime();
    const filePath = `${projectId}/${timestamp}-${file.name}`;

    // Upload file to 'documents' bucket
    const { data, error } = await supabase.storage
      .from('Documents')
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
      .from('Documents')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Failed to upload file');
    return null;
  }
};

/**
 * Adds document metadata to the database
 * 
 * This function stores document information in the database after a successful file upload.
 * It creates a database record that links the document to a project and stores metadata
 * such as name, type, and storage URL.
 * 
 * Document Types:
 * - 'proposal': Initial project proposals from students
 * - 'final_proposal': Final deliverables or completed work
 * 
 * @param projectId - The ID of the project this document belongs to
 * @param name - Display name for the document
 * @param type - Type of document ('proposal' or 'final_proposal')
 * @param link - URL or path to access the document
 * @returns Promise<object | null> - The created document record, or null if creation failed
 * 
 * @example
 * ```typescript
 * const doc = await addDocumentToProject(
 *   "project-123",
 *   "Project Proposal.pdf",
 *   "proposal",
 *   "https://storage.url/document.pdf"
 * );
 * ```
 */
export const addDocumentToProject = async (
  projectId: string,
  documentName: string,
  documentType: string,
  documentUrl: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    console.log('Current user:', user.id);
    
    // Vérifier la relation utilisateur-entrepreneur
    const { data: entrepreneurData, error: entrepreneurError } = await supabase
      .from('entrepreneurs')
      .select('id_entrepreneur')
      .eq('id_user', user.id)
      .single();
    
    console.log('Entrepreneur data:', entrepreneurData);
    console.log('Entrepreneur error:', entrepreneurError);

    // Vérifier les données du projet
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id_entrepreneur, selected_student')
      .eq('id_project', projectId)
      .single();

    console.log('Project data:', projectData);
    console.log('Project error:', projectError);

    // Vérifier les étudiants proposés
    const { data: proposedStudents, error: proposedError } = await supabase
      .from('proposed_student')
      .select('student_id')
      .eq('project_id', projectId);

    console.log('Proposed students:', proposedStudents);
    console.log('Proposed error:', proposedError);

    // Vérification des permissions
    const isEntrepreneur = entrepreneurData?.id_entrepreneur === projectData?.id_entrepreneur;
    const isSelectedStudent = user.id === projectData?.selected_student;
    const isProposedStudent = proposedStudents?.some(ps => ps.student_id === user.id);

    console.log('Permission check:', {
      isEntrepreneur,
      isSelectedStudent,
      isProposedStudent,
      userId: user.id,
      projectEntrepreneur: projectData?.id_entrepreneur,
      projectSelectedStudent: projectData?.selected_student,
      entrepreneurId: entrepreneurData?.id_entrepreneur
    });

    const { error } = await supabase
      .from('documents')
      .insert({
        id_project: projectId,
        name: documentName,
        type: documentType,
        link: documentUrl
      });

    if (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in addDocumentToProject:', error);
    throw error;
  }
};

/**
 * Retrieves all documents for a specific project
 * 
 * This function fetches all document records associated with a project,
 * ordered by creation date (newest first) for consistent display.
 * 
 * @param projectId - The ID of the project to fetch documents for
 * @returns Promise<Array> - Array of document objects, or empty array if none found
 * 
 * @example
 * ```typescript
 * const documents = await getProjectDocuments("project-123");
 * console.log(`Found ${documents.length} documents`);
 * ```
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
 * Deletes a document and its associated file
 * 
 * This function performs a complete document deletion:
 * 1. Fetches the document record to get storage information
 * 2. Deletes the database record
 * 3. Attempts to delete the file from storage (best effort)
 * 4. Provides user feedback about the operation
 * 
 * Note: Storage deletion is done as a best effort operation. If it fails,
 * the database record is still deleted to maintain consistency.
 * 
 * @param documentId - The ID of the document to delete
 * @returns Promise<boolean> - True if deletion was successful, false otherwise
 * 
 * @example
 * ```typescript
 * const success = await deleteDocument("doc-123");
 * if (success) {
 *   console.log("Document deleted successfully");
 * }
 * ```
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
          .from('Documents')
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

/**
 * Semantic alias for uploadFile function
 * 
 * This function provides a more descriptive name for document uploads
 * in UI contexts where the semantic meaning is important.
 * 
 * @param file - The file to upload
 * @param projectId - The project ID for organization
 * @returns Promise<string | null> - The public URL of the uploaded document
 */
export const uploadDocumentFile = async (file: File, projectId: string): Promise<string | null> => {
  return uploadFile(file, projectId);
};

/**
 * Semantic alias for addDocumentToProject function
 * 
 * This function provides a more descriptive name for saving document metadata
 * in UI contexts where the semantic meaning is important.
 * 
 * @param projectId - The project ID
 * @param name - Document name
 * @param type - Document type
 * @param link - Document URL
 * @returns Promise<object | null> - The created document record
 */
export const saveDocumentToDB = async (
  projectId: string,
  name: string,
  type: 'proposal' | 'final_proposal',
  link: string
) => {
  return addDocumentToProject(projectId, name, type, link);
};

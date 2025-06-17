
import { z } from 'zod';

// Schémas de validation réutilisés depuis le frontend
const userSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
});

const projectSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  budget: z.number().min(0, "Le budget doit être positif"),
  deadline: z.string().datetime(),
  skills: z.array(z.string()),
});

// Frontend validation function
export const validateData = async (schema: z.ZodSchema, data: any) => {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('Erreur de validation', {
        errors: error.errors,
      });

      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    console.error('Erreur de validation inattendue', { error });
    return {
      success: false,
      error: 'Une erreur est survenue lors de la validation',
    };
  }
};

// Validation helpers for specific schemas
export const validateUser = (data: any) => validateData(userSchema, data);
export const validateProject = (data: any) => validateData(projectSchema, data);

// File validation function for frontend
export const validateFile = (file: File) => {
  if (!file) {
    return {
      success: false,
      error: 'Aucun fichier n\'a été fourni',
    };
  }

  // Vérifier la taille du fichier (10 MB max)
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return {
      success: false,
      error: 'Le fichier est trop volumineux (max 10 MB)',
    };
  }

  // Vérifier le type de fichier
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Type de fichier non autorisé',
    };
  }

  return { success: true };
};

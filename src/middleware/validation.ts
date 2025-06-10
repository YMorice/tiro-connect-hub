import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@/services/logger-service';

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

// Middleware de validation générique
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valider les données de la requête
      const validatedData = await schema.parseAsync({
        ...req.body,
        ...req.query,
        ...req.params,
      });

      // Remplacer les données de la requête par les données validées
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Journaliser l'erreur de validation
        logger.warn('Erreur de validation', {
          errors: error.errors,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        // Renvoyer une réponse d'erreur standardisée
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      // Journaliser les erreurs inattendues
      logger.error('Erreur de validation inattendue', {
        error,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Une erreur est survenue lors de la validation',
      });
    }
  };
};

// Middlewares de validation spécifiques
export const validateUser = validateRequest(userSchema);
export const validateProject = validateRequest(projectSchema);

// Middleware de validation des fichiers
export const validateFile = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({
      status: 'error',
      code: 'FILE_REQUIRED',
      message: 'Aucun fichier n\'a été fourni',
    });
  }

  // Vérifier la taille du fichier (10 MB max)
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return res.status(400).json({
      status: 'error',
      code: 'FILE_TOO_LARGE',
      message: 'Le fichier est trop volumineux (max 10 MB)',
    });
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

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_FILE_TYPE',
      message: 'Type de fichier non autorisé',
    });
  }

  next();
}; 
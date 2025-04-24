import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  avatar: z.string().url().optional(),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
});

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type User = z.infer<typeof userSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;
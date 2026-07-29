import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Requerido").max(200),
    email: z.string().email(),
    phone: z.string().min(6, "Ingresa un celular de contacto valido.").max(50),
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Tenes que aceptar los terminos y condiciones." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export type Role = "admin" | "empleado" | "cliente";

// Edicion de datos propios desde /mi-cuenta/perfil (task #116) -- a
// diferencia de registerSchema, no toca password ni role.
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Requerido").max(200),
  email: z.string().email(),
  phone: z.string().min(6, "Ingresa un celular de contacto valido.").max(50),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const changePasswordSchema = z
  .object({
    // Vacio si el cambio es obligatorio (vino de una contrasena temporal):
    // no tiene sentido pedirle "tu contrasena actual" cuando esa contrasena
    // actual es justamente la temporal que esta por reemplazar. Cuando el
    // cambio es voluntario (desde /mi-cuenta), currentPassword es
    // obligatorio (se valida aparte en la Server Action).
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "Minimo 8 caracteres"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmNewPassword"],
  });

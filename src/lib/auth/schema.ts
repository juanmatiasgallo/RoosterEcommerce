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

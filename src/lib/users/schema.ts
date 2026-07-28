import { z } from "zod";

// role nunca incluye "cliente" aca: ese flujo de alta es autoservicio via
// /crear-cuenta (registerUser), no algo que el admin elija a mano.
export const adminCreateUserSchema = z
  .object({
    name: z.string().min(1, "Requerido").max(200),
    email: z.string().email(),
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string(),
    role: z.enum(["admin", "empleado"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

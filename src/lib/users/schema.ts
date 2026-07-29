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

// Edicion de datos basicos (task #22): no incluye email/rol/contrasena a
// proposito -- cambiar el email pisaria el usuario que usa para loguear
// (colision con registerUser) y el rol de un cliente nunca deberia tocarse
// desde aca (ver adminCreateUserSchema, altas de staff son un flujo
// separado). Sirve tanto para editar clientes como empleados/admins.
export const adminUpdateUserSchema = z.object({
  name: z.string().min(1, "Requerido").max(200),
  phone: z.string().max(50).optional().or(z.literal("")),
});

import type { Role } from "@/lib/auth/schema";

declare module "next-auth" {
  interface User {
    role: Role;
    storeId: string;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      storeId: string;
      name?: string | null;
      email?: string | null;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    storeId: string;
    mustChangePassword?: boolean;
  }
}

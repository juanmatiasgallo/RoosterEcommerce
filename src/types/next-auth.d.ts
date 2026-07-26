import type { Role } from "@/lib/auth/schema";

declare module "next-auth" {
  interface User {
    role: Role;
    storeId: string;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      storeId: string;
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    storeId: string;
  }
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserDetailForAdmin } from "@/lib/users/actions";
import { FichaClienteClient } from "./ficha-cliente-client";

// Mismo criterio que /admin/usuarios: consulta la DB, no se puede
// pre-renderizar en build time (EasyPanel no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function FichaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getUserDetailForAdmin>>;
  try {
    detail = await getUserDetailForAdmin(id);
  } catch {
    // getOwnedUser tira si no existe o es de otra tienda -- 404 en vez de
    // filtrar esa distincion al cliente.
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <FichaClienteClient detail={detail} />
    </div>
  );
}

import { WhatsAppIcon } from "@/components/social-icons";

// Boton flotante de WhatsApp: sutil pero siempre visible, abajo a la
// derecha, en todo el sitio publico. Solo se muestra si el admin ya cargo
// un telefono de contacto real en /admin/configuracion (evita un link roto
// con el placeholder antes de que exista un numero real). El icono de
// WhatsApp del footer se saco (task #123) porque este ya es suficiente --
// para compensar, se le agrego un anillo de pulso "latente" (motion-safe,
// dos capas con delay para que no se vea sincronico) sin cambiar el tamano
// del boton en si (h-12 w-12, igual que antes).
export function WhatsAppFloatButton({ phone }: { phone?: string | null }) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear por WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]/60 motion-safe:animate-ping" />
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]/40 motion-safe:animate-ping"
        style={{ animationDelay: "0.6s", animationDuration: "2.4s" }}
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:shadow-lg group-active:scale-95">
        <WhatsAppIcon size={24} />
      </span>
    </a>
  );
}

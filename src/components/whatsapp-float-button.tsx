import { WhatsAppIcon } from "@/components/social-icons";

// Boton flotante de WhatsApp: sutil pero siempre visible, abajo a la
// derecha, en todo el sitio publico. Solo se muestra si el admin ya cargo
// un telefono de contacto real en /admin/configuracion (evita un link roto
// con el placeholder antes de que exista un numero real).
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
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition-transform duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
    >
      <WhatsAppIcon size={24} />
    </a>
  );
}

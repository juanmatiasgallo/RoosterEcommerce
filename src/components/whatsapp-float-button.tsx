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
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.386.71 4.606 1.93 6.463L4 29l7.716-1.9A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75c-1.98 0-3.83-.55-5.41-1.5l-.388-.23-4.58 1.128 1.18-4.46-.253-.406A9.7 9.7 0 0 1 5.25 15c0-5.93 4.824-10.75 10.754-10.75S26.75 9.07 26.75 15 21.934 24.75 16.004 24.75Zm5.906-8.06c-.324-.163-1.914-.945-2.21-1.053-.297-.108-.513-.163-.73.163-.216.325-.837 1.053-1.026 1.27-.19.216-.378.244-.702.081-.325-.163-1.37-.505-2.61-1.61-.965-.86-1.617-1.923-1.807-2.248-.19-.325-.02-.5.143-.663.146-.146.325-.379.487-.569.163-.19.216-.325.324-.542.108-.216.054-.406-.027-.569-.081-.163-.73-1.759-1-2.409-.263-.632-.53-.546-.73-.556l-.622-.011c-.216 0-.569.081-.867.406-.297.325-1.135 1.108-1.135 2.703 0 1.596 1.162 3.137 1.324 3.353.163.216 2.288 3.494 5.546 4.9.775.334 1.38.534 1.852.684.778.247 1.486.212 2.046.129.624-.093 1.914-.782 2.184-1.538.27-.756.27-1.404.19-1.539-.081-.135-.298-.216-.622-.379Z" />
      </svg>
    </a>
  );
}

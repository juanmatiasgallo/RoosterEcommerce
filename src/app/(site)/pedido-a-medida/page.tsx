export default function PedidoAMedidaPage() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Pedi tu pieza a medida</h1>
      <p>
        Subi tu archivo .STL u .OBJ (maximo {process.env.UPLOADS_MAX_SIZE_MB ?? 20} MB) y te
        enviamos una cotizacion antes de cobrarte nada.
      </p>
      {/* TODO: formulario real con RHF + Zod, subida a UPLOADS_DIR, y server
          action createCustomOrder en src/lib/custom-orders/actions.ts
          (ver mockup formulario_pedido_a_medida y docs/spec-ecommerce-base.md) */}
    </main>
  );
}

// Codigo de referencia legible para mostrarle al cliente en la confirmacion
// de compra / recibo (ej. "PED-A3F9C21B"), a diferencia del orderNumber
// (un entero secuencial chico, pensado para coordinar por telefono/WhatsApp
// con un admin). El owner pidio explicitamente un codigo con letras Y
// numeros en mayuscula, tipo el que usan los ecommerce grandes (Tata,
// Amazon, etc.) como "codigo de referencia" en la pantalla de compra.
//
// Se deriva del uuid de la orden en vez de agregar una columna nueva: el id
// ya es aleatorio y unico por definicion, asi que tomar sus primeros 8
// caracteres alcanza para un codigo legible sin migracion de schema ni
// riesgo de colision real para el volumen de esta tienda. Es solo para
// mostrar -- no se usa para buscar/identificar la orden en el server (eso
// sigue siendo el id real).
export function orderReferenceCode(orderId: string): string {
  return `PED-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

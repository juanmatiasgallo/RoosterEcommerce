"use client";

import { useEffect, useState, type ReactNode } from "react";

// Se le pidio que tocar el logo "Tienda 3D" en el header, estando ya en la
// home, lleve arriba del todo "como si hubiese actualizado" y que todas las
// animaciones se vuelvan a ejecutar -- sin una recarga real de pagina (se le
// pregunto explicitamente y se eligio esta opcion). La forma mas simple y
// confiable de "reiniciar" un arbol entero de componentes con estado interno
// de Framer Motion es cambiarle la `key`: React lo desmonta y lo vuelve a
// montar de cero, con lo cual cualquier `initial`/`animate`/`whileInView`
// arranca de nuevo como en la primera carga. site-header.tsx dispara el
// evento "home:replay" (window, no hay otra forma de comunicar un click del
// header -- que vive fuera del arbol de la home -- con este boundary) en vez
// de navegar cuando el usuario ya esta parado en "/".
export function HomeReplayBoundary({ children }: { children: ReactNode }) {
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    function handleReplay() {
      // Scroll instantaneo (no "smooth"): se pidio que se sienta como una
      // actualizacion, no como un scroll suave -- el remount de abajo ya es
      // la parte "animada" de la experiencia. window.scrollTo(x, y) sin
      // opciones es instantaneo por default (a diferencia de pasar
      // behavior: "smooth").
      window.scrollTo(0, 0);
      setReplayKey((key) => key + 1);
    }

    window.addEventListener("home:replay", handleReplay);
    return () => window.removeEventListener("home:replay", handleReplay);
  }, []);

  return <div key={replayKey}>{children}</div>;
}

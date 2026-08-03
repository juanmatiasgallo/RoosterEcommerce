"use client";

import ReactMarkdown from "react-markdown";

// Envoltorio chico para renderizar Markdown con la tipografia del sitio
// (task #147: "tiene que poder tener un buen MD... manteniendo una
// estructura uniforme en lo que es la redaccion de los textos h3 h2 etc").
// En vez de sumar @tailwindcss/typography (otra dependencia) para un solo
// uso, se mapean los pocos elementos que hacen falta (encabezados, parrafos,
// listas, negrita/italica, links) a clases Tailwind existentes en el sitio.
// Sin remark-gfm a proposito: tablas/strikethrough no son necesarios para
// una descripcion de proyecto, y cada plugin extra es peso en el bundle.
export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2 className="text-xl font-semibold">{children}</h2>,
          h2: ({ children }) => <h2 className="text-lg font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
          p: ({ children }) => (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="ml-4 flex list-disc flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-4 flex list-decimal flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-900 dark:text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

import type { ComponentProps } from "react";

/**
 * Streamdown renders tables inside its own control toolbar, styled with
 * utility classes this project doesn't define. These replace the table
 * elements with plain markup on Nexia's tokens.
 *
 * The `node` HAST prop is stripped so it never lands on a DOM element.
 */
type MdProps<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & {
  node?: unknown;
};

function Table({ node: _node, className: _className, children, ...props }: MdProps<"table">) {
  return (
    <div className="my-3 w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-left align-top" {...props}>
        {children}
      </table>
    </div>
  );
}

function Thead({ node: _node, className: _className, ...props }: MdProps<"thead">) {
  return <thead {...props} />;
}

function Tbody({ node: _node, className: _className, ...props }: MdProps<"tbody">) {
  return <tbody {...props} />;
}

function Tr({ node: _node, className: _className, ...props }: MdProps<"tr">) {
  return <tr className="border-b border-line last:border-0 [thead_&]:border-b-2" {...props} />;
}

function Th({ node: _node, className: _className, ...props }: MdProps<"th">) {
  return <th className="t-label whitespace-nowrap px-3.5 py-2.5" {...props} />;
}

function Td({ node: _node, className: _className, ...props }: MdProps<"td">) {
  return <td className="px-3.5 py-2.5 align-top text-sm leading-relaxed text-text-2" {...props} />;
}

export const chatMarkdownComponents = {
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
};

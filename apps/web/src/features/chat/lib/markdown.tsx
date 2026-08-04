import type { ComponentProps } from "react";

/**
 * Streamdown renders tables wrapped in a control toolbar (copy / download /
 * fullscreen) and styles them with shadcn utility classes that aren't all
 * defined in this project, so they render broken. We replace the whole table
 * element set with clean, scrapbook-tidy markup driven by Nexia's own tokens,
 * and pass `controls={false}` alongside these so no toolbar is rendered.
 *
 * The `node` HAST prop is stripped from every component so it never lands on a
 * DOM element.
 */

type MdProps<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & {
  node?: unknown;
};

function Table({ node: _node, className: _className, children, ...props }: MdProps<"table">) {
  return (
    <div className="my-3 w-full overflow-x-auto rounded-xl border border-(--border) bg-(--surface)">
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
  return (
    <tr className="border-b border-(--border) last:border-0 [thead_&]:border-b-2" {...props} />
  );
}

function Th({ node: _node, className: _className, ...props }: MdProps<"th">) {
  return (
    <th
      className="label-caps px-3.5 py-2.5 text-[10.5px] whitespace-nowrap text-(--text-3)"
      {...props}
    />
  );
}

function Td({ node: _node, className: _className, ...props }: MdProps<"td">) {
  return (
    <td
      className="px-3.5 py-2.5 align-top text-[13.5px] leading-relaxed text-(--text-2)"
      {...props}
    />
  );
}

/** Custom Streamdown element renderers for chat markdown. */
export const chatMarkdownComponents = {
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
};

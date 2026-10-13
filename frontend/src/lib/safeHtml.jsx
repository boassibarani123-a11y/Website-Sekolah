import DOMPurify from "dompurify";

const OPTS = { ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "s", "p", "br", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "span", "div", "code", "pre"], ALLOWED_ATTR: ["href", "target", "rel"] };

export const sanitizeHtml = (html) => DOMPurify.sanitize(html || "", OPTS);
export const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function SafeHtml({ html, className = "", fallback = "Tidak ada keterangan.", ...rest }) {
  const clean = sanitizeHtml(html);
  if (!stripHtml(clean)) return <p className={`${className} italic text-slate-400`} {...rest}>{fallback}</p>;
  return <div className={`${className} prose prose-sm max-w-none [&_a]:text-sky-600 [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5`} dangerouslySetInnerHTML={{ __html: clean }} {...rest} />;
}

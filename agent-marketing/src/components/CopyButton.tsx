import { useCallback, useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      className={`copy-btn${copied ? " copy-btn--done" : ""}${className ? ` ${className}` : ""}`}
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

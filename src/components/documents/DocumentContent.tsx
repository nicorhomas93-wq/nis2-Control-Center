"use client";

import { MarkdownRenderer } from "@/lib/markdown/render";

interface DocumentContentProps {
  content: string;
}

export function DocumentContent({ content }: DocumentContentProps) {
  return (
    <MarkdownRenderer
      content={content}
      className="document-markdown prose prose-slate max-w-none text-sm leading-relaxed"
    />
  );
}

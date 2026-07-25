import { ExternalLink } from "lucide-react";
import type { PostAuthor } from "@/lib/postAuthors";

type Props = {
  author?: PostAuthor | null;
  className?: string;
};

export function PostAuthorLink({ author, className = "" }: Props) {
  if (!author?.show_x_on_posts || !author.x_handle) return null;
  return (
    <a
      href={`https://x.com/${author.x_handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 underline decoration-gray-300 underline-offset-2 ${className}`}
    >
      {author.display_name ? `${author.display_name} ` : ""}@{author.x_handle}
      <ExternalLink size={10} />
    </a>
  );
}

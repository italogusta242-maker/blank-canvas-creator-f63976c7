import { useState, useEffect, useRef } from "react";
import { Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  editorMode: boolean;
  onChange: (value: string) => void;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  alwaysVisible?: boolean;
}

export const InlineEdit = ({
  value,
  editorMode,
  onChange,
  alwaysVisible = false,
  as: Tag = "p",
  className,
  placeholder = "Clique para editar...",
  multiline = false,
}: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    if (draft !== value) {
      onChange(draft);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!editorMode) {
    return <Tag className={className}>{value || placeholder}</Tag>;
  }

  if (isEditing) {
    return (
      <div className={cn("relative group/edit min-w-[50px]", className)} ref={containerRef}>
        {multiline ? (
          <textarea
            autoFocus
            className="w-full bg-background border border-accent rounded-md px-2 py-1 outline-none text-foreground font-inherit resize-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
          />
        ) : (
          <input
            autoFocus
            type="text"
            className="w-full bg-background border border-accent rounded-md px-2 py-1 outline-none text-foreground font-inherit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
        )}
        <div className="absolute top-full right-0 mt-1 flex gap-1 z-50">
          <button
            onClick={handleSave}
            className="p-1 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-lg"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-lg"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "relative group/inline cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1 transition-colors",
        className
      )}
    >
      <Tag className={cn(!value && "text-muted-foreground italic")}>
        {value || placeholder}
      </Tag>
      <div className={cn(
        "absolute -right-6 top-1/2 -translate-y-1/2 transition-opacity",
        alwaysVisible ? "opacity-100" : "opacity-0 group-hover/inline:opacity-100"
      )}>
        <Edit2 size={14} className="text-accent" />
      </div>
    </div>
  );
};

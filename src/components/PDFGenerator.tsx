import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export default function PDFGenerator() {
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Faça login para gerar seu plano.");
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: profile?.full_name || user.email?.split("@")[0] || "Aluno",
        age: profile?.birth_date
          ? String(
              new Date().getFullYear() -
                new Date(profile.birth_date).getFullYear()
            )
          : undefined,
        goal: profile?.goal || "Hipertrofia",
        level: profile?.planner_type || "Intermediário",
        days: "5 dias",
        notes: profile?.injuries || undefined,
      };

      const { data, error } = await supabase.functions.invoke(
        "generate-pdf-plan",
        { body: { userData } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const html = data.html as string;
      if (!html) throw new Error("Nenhum conteúdo gerado.");

      // Inject into hidden div
      if (contentRef.current) {
        contentRef.current.innerHTML = html;
      }

      // Wait a tick for DOM render
      await new Promise((r) => setTimeout(r, 200));

      // Dynamic import to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: "Meu_Plano_Anaac.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(contentRef.current)
        .save();

      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error(err?.message || "Falha ao gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="gap-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando plano…
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Gerar Meu Plano em PDF
          </>
        )}
      </Button>

      {/* Hidden container for html2pdf rendering */}
      <div
        ref={contentRef}
        className="absolute -left-[9999px] top-0 w-[210mm] bg-white text-black"
        style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: "14px",
          lineHeight: 1.6,
          padding: "20px",
        }}
      />
    </>
  );
}

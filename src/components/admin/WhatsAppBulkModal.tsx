import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight, Check, ExternalLink, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
}

interface WhatsAppBulkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
}

const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length === 11 || digits.length === 10) return "55" + digits;
  return digits;
};

const firstName = (nome: string | null): string => {
  if (!nome) return "Cliente";
  return nome.trim().split(/\s+/)[0];
};

const WhatsAppBulkModal = ({ open, onOpenChange, leads }: WhatsAppBulkModalProps) => {
  const [message, setMessage] = useState(
    "Oi {{nome}}, tudo bem?\n\nAqui é da equipe do ANAAC Club!\n\nEstamos entrando em contato para te ajudar a redefinir sua senha e conseguir acessar o APP.\n\nPara criar sua nova senha e voltar a acessar os conteúdos, basta clicar neste link:\n\nhttps://anaacclub.lovable.app/esqueci-minha-senha\n\nMesmo que você não tenha solicitado, clique no link e redefina sua senha para conseguir acessar.\n\nQualquer dúvida, estou por aqui! 😊"
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const validLeads = useMemo(
    () => leads.filter((l) => l.telefone && l.telefone.replace(/\D/g, "").length >= 10),
    [leads]
  );

  const currentLead = validLeads[currentIndex] ?? null;

  const buildUrl = (lead: Lead): string => {
    const phone = formatPhone(lead.telefone!);
    const text = message.replace(/\{\{nome\}\}/gi, firstName(lead.nome));
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  };

  const handleSend = () => {
    if (!currentLead) return;
    window.open(buildUrl(currentLead), "_blank", "noopener,noreferrer");
    setSentIds((prev) => new Set(prev).add(currentLead.id));
  };

  const handleNext = () => {
    if (currentIndex < validLeads.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleReset = () => {
    setStarted(false);
    setCurrentIndex(0);
    setSentIds(new Set());
  };

  const progress = validLeads.length > 0 ? Math.round((sentIds.size / validLeads.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={20} />
            Disparo WhatsApp em Massa
          </DialogTitle>
        </DialogHeader>

        {!started ? (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                <Info size={16} /> Instruções de Uso
              </div>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Tenha o seu <strong className="text-foreground">WhatsApp Web</strong> aberto e logado neste navegador.</li>
                <li>Escreva a mensagem abaixo usando <code className="bg-muted px-1 rounded text-xs">{"{{nome}}"}</code> para personalizar.</li>
                <li>Ao clicar em iniciar, o sistema abrirá a conversa já com o texto pronto.</li>
                <li>Envie a mensagem no WhatsApp, feche a aba e clique em <strong className="text-foreground">"Próximo Lead"</strong> aqui no painel.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mensagem (use <code className="bg-muted px-1 rounded text-xs">{"{{nome}}"}</code> para personalizar)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="Escreva sua mensagem..."
              />
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-medium">
                Fila de Leads:{" "}
                <span className="text-emerald-500">{validLeads.length}</span> com telefone válido
                {leads.length - validLeads.length > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({leads.length - validLeads.length} sem telefone)
                  </span>
                )}
              </p>
              <div className="max-h-40 overflow-y-auto divide-y divide-border">
                {validLeads.slice(0, 20).map((l) => (
                  <div key={l.id} className="py-1.5 flex items-center justify-between text-sm">
                    <span className="text-foreground">{l.nome || "Sem nome"}</span>
                    <span className="text-muted-foreground text-xs">{l.telefone}</span>
                  </div>
                ))}
                {validLeads.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{validLeads.length - 20} leads...
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setStarted(true)}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={validLeads.length === 0 || !message.trim()}
            >
              <MessageSquare size={16} /> Iniciar Disparos ({validLeads.length} leads)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground">
                {sentIds.size}/{validLeads.length}
              </span>
            </div>

            {currentLead ? (
              <div className="rounded-lg border border-border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-lg">{currentLead.nome || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{currentLead.email}</p>
                    <p className="text-sm text-muted-foreground">{currentLead.telefone}</p>
                  </div>
                  <Badge
                    className={cn(
                      sentIds.has(currentLead.id)
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    )}
                  >
                    {sentIds.has(currentLead.id) ? "Enviado" : `Lead ${currentIndex + 1}`}
                  </Badge>
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground whitespace-pre-wrap">
                  {message.replace(/\{\{nome\}\}/gi, firstName(currentLead.nome))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSend}
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ExternalLink size={14} />
                    {sentIds.has(currentLead.id) ? "Abrir Novamente" : "Abrir WhatsApp"}
                  </Button>
                  {currentIndex < validLeads.length - 1 && (
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      className="gap-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-semibold text-base px-6"
                      disabled={!sentIds.has(currentLead.id)}
                    >
                      Próximo Lead <ArrowRight size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <Check className="mx-auto text-emerald-500" size={40} />
                <p className="text-foreground font-semibold">Fila concluída!</p>
                <p className="text-sm text-muted-foreground">
                  {sentIds.size} mensagens disparadas.
                </p>
              </div>
            )}

            {sentIds.size === validLeads.length && (
              <Button onClick={handleReset} variant="outline" className="w-full gap-2">
                <RotateCcw size={14} /> Reiniciar Fila
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppBulkModal;

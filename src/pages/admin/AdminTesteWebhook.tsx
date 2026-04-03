import { useState } from "react";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AdminTesteWebhook = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; data: any } | null>(null);

  const simulatePayment = async () => {
    if (!email.includes("@")) {
      toast.error("Informe um email válido");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`;

      const payload = {
        event: "payment.approved",
        status: "approved",
        customer: { email: email.trim().toLowerCase() },
        metadata: { email: email.trim().toLowerCase(), source: "test-simulator" },
        amount: 29700,
        currency: "BRL",
        id: `test-tx-${Date.now()}`,
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, data });
        toast.success(`Pagamento simulado! Usuário ${email} ativado.`);
      } else {
        setResult({ ok: false, data });
        toast.error(`Erro: ${data.error || res.statusText}`);
      }
    } catch (err: any) {
      setResult({ ok: false, data: { error: err.message } });
      toast.error("Falha na requisição");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Simulador de Webhook</h1>
        <p className="text-sm text-muted-foreground">
          Dispara um POST mockado para a Edge Function payment-webhook, simulando um pagamento aprovado da InfinitePay.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Simular Pagamento Aprovado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email do usuário</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="usuario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O usuário precisa ter feito o pré-cadastro (conta Auth existente).
            </p>
          </div>

          <Button onClick={simulatePayment} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Disparar Webhook de Teste
              </>
            )}
          </Button>

          {result && (
            <div className={`rounded-lg p-4 text-sm ${result.ok ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              <div className="flex items-center gap-2 mb-2 font-semibold">
                {result.ok ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Sucesso</>
                ) : (
                  <><XCircle className="w-4 h-4 text-destructive" /> Erro</>
                )}
              </div>
              <pre className="text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como testar o fluxo completo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Abra <code className="text-foreground">/funil</code> em uma aba anônima e faça o pré-cadastro.</p>
          <p>2. Faça login manualmente em <code className="text-foreground">/auth</code> — você cairá em <code className="text-foreground">/aguardando-pagamento</code>.</p>
          <p>3. Volte aqui e digite o email do pré-cadastro acima.</p>
          <p>4. Clique "Disparar Webhook" — a outra aba redirecionará automaticamente para <code className="text-foreground">/cronometro</code> via Realtime.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTesteWebhook;

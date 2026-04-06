import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Search, FileSpreadsheet, Ban, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConciliationResult {
  lista_a: any[];
  lista_b: any[];
  lista_c: any[];
  resumo: { total_csv: number; sucesso: number; alerta: number; investigar: number };
}

const PaymentConciliationModal = ({ open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<ConciliationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const transactions: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      // Parse CSV handling quoted fields with commas inside
      const fields = parseCSVLine(raw);
      if (fields.length < 15) continue;

      transactions.push({
        data_hora: fields[0]?.trim() || "",
        meio: fields[1]?.trim() || "",
        valor: fields[8]?.trim() || "",
        nsu: fields[13]?.trim() || "",
        nome_origem: fields[14]?.trim()?.replace(/^"|"$/g, "") || "",
        identificador: fields[6]?.trim() || "",
        status: fields[7]?.trim() || "",
      });
    }
    return transactions.filter((t) => t.status === "Aprovada");
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const transactions = parseCSV(text);

      if (transactions.length === 0) {
        toast.error("Nenhuma transação aprovada encontrada no CSV");
        setLoading(false);
        return;
      }

      toast.info(`${transactions.length} transações encontradas. Conciliando...`);

      const { data, error } = await supabase.functions.invoke("audit-payment-conciliation", {
        body: { transactions },
      });

      console.log("Response data:", data);

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      if (!data) {
        console.error("No data returned from function");
        throw new Error("Nenhum dado retornado da função");
      }

      setResult(data as ConciliationResult);
      toast.success("Conciliação concluída com sucesso");
    } catch (error: any) {
      console.error("Erro detalhado na conciliação:", error);
      
      let errorMessage = "Erro ao processar conciliação";
      if (error.message?.includes("Failed to send a request")) {
        errorMessage = "Falha de rede com a Edge Function. Verifique sua conexão ou se a função está ativa.";
      } else if (error.context?.reason) {
        errorMessage = `Erro: ${error.context.reason}`;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRevokeAccess = async () => {
    if (!result || result.lista_c.length === 0) return;
    setRevoking(true);
    try {
      const userIds = result.lista_c
        .map((item) => item.db_id)
        .filter(Boolean);

      if (userIds.length === 0) {
        toast.error("Nenhum ID de usuário encontrado para revogar");
        return;
      }

      const { data, error } = await supabase.functions.invoke("revoke-unpaid-users", {
        body: { user_ids: userIds },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `Acesso revogado de ${data.profiles_updated} usuários. ${data.subscriptions_updated} assinaturas canceladas. Leads enviados para a aba Comercial.`
      );
      setResult(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao revogar acessos");
    } finally {
      setRevoking(false);
    }
  };

  const activatableFromAlerta = useMemo(() => {
    if (!result) return [];
    // Only users found in DB with a pending status (not the "not found" ones)
    return result.lista_b.filter((item) => item.db_id && item.db_status && item.db_status !== "ativo");
  }, [result]);

  const handleActivateReconciled = async () => {
    if (!result || activatableFromAlerta.length === 0) return;
    setActivating(true);
    try {
      const userIds = activatableFromAlerta.map((item) => item.db_id).filter(Boolean);

      if (userIds.length === 0) {
        toast.error("Nenhum ID encontrado para ativar");
        return;
      }

      const { data, error } = await supabase.functions.invoke("activate-reconciled-users", {
        body: { user_ids: userIds },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `${data.profiles_activated} alunos ativados com sucesso! ${data.subscriptions_activated} assinaturas atualizadas.`
      );
      setResult(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar alunos");
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            Conciliação de Pagamentos
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Faça o upload do CSV exportado do gateway de pagamento (InfinitePay).
              O sistema irá cruzar as transações aprovadas com o banco de dados.
            </p>
            <label className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/40 transition-colors">
                {loading ? (
                  <>
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Processando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para selecionar o CSV</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFile}
                disabled={loading}
              />
            </label>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Total CSV" value={result.resumo.total_csv} color="text-foreground" />
              <SummaryCard label="✅ Sucesso" value={result.resumo.sucesso} color="text-emerald-400" />
              <SummaryCard label="🚨 Alerta" value={result.resumo.alerta} color="text-red-400" />
              <SummaryCard label="🔍 Investigar" value={result.resumo.investigar} color="text-amber-400" />
            </div>

            <Tabs defaultValue="alerta" className="space-y-3">
              <TabsList className="bg-secondary/50 border border-border">
                <TabsTrigger value="sucesso" className="gap-1.5 text-xs">
                  <CheckCircle2 size={14} /> Sucesso ({result.lista_a.length})
                </TabsTrigger>
                <TabsTrigger value="alerta" className="gap-1.5 text-xs">
                  <AlertTriangle size={14} /> Alerta ({result.lista_b.length})
                </TabsTrigger>
                <TabsTrigger value="investigar" className="gap-1.5 text-xs">
                  <Search size={14} /> Investigar ({result.lista_c.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sucesso">
                <div className="text-xs text-muted-foreground mb-2">
                  Pagamentos do CSV que possuem perfil ativo e assinatura válida.
                </div>
                <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome CSV</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Nome DB</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.lista_a.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{item.csv_nome}</TableCell>
                          <TableCell className="text-xs">R$ {item.csv_valor}</TableCell>
                          <TableCell className="text-xs">{item.db_nome}</TableCell>
                          <TableCell className="text-xs">{item.db_email}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Ativo</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {result.lista_a.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="alerta">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    ⚠️ Pagamentos do CSV sem acesso liberado — ação necessária!
                  </div>
                  {activatableFromAlerta.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="default" size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={activating}>
                          {activating ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                          {activating ? "Ativando..." : `Ativar Alunos (${activatableFromAlerta.length})`}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ativar {activatableFromAlerta.length} alunos que pagaram?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esses usuários constam no CSV como pagantes mas não possuem acesso ativo.
                            Seus perfis serão ativados e suas assinaturas atualizadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleActivateReconciled} className="bg-emerald-600 hover:bg-emerald-700">
                            Confirmar Ativação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome CSV</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Email DB</TableHead>
                        <TableHead className="text-xs">Status DB</TableHead>
                        <TableHead className="text-xs">Problema</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.lista_b.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{item.csv_nome}</TableCell>
                          <TableCell className="text-xs">R$ {item.csv_valor}</TableCell>
                          <TableCell className="text-xs">{item.db_email || "—"}</TableCell>
                          <TableCell className="text-xs">{item.db_status || "—"}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-500/20 text-red-400 text-xs">{item.problema}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {result.lista_b.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                            🎉 Nenhum alerta — todos os pagamentos têm acesso!
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="investigar">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    🔍 Usuários ativos no banco que NÃO aparecem no CSV de pagamentos.
                  </div>
                  {result.lista_c.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-1.5" disabled={revoking}>
                          {revoking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                          {revoking ? "Revogando..." : `Revogar Acesso (${result.lista_c.length})`}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revogar acesso de {result.lista_c.length} usuários?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esses usuários terão o status alterado para "pendente" e suas assinaturas serão canceladas.
                            Os dados serão mantidos para repescagem comercial. Esta ação pode ser revertida manualmente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Confirmar Revogação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Assinatura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.lista_c.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{item.db_nome}</TableCell>
                          <TableCell className="text-xs">{item.db_email}</TableCell>
                          <TableCell className="text-xs">{item.db_status}</TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                              {item.sub_status} {item.sub_valor ? `(R$ ${item.sub_valor})` : ""}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {result.lista_c.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                            Todos os ativos constam no CSV ✅
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                Novo Upload
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="bg-secondary/30 border border-border rounded-lg p-3 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default PaymentConciliationModal;

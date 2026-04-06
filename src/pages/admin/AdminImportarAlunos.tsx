import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CsvRow {
  full_name: string;
  email: string;
  phone: string;
  plano_id: string;
  data_compra: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

const EXPECTED_HEADERS = ["full_name", "email", "phone", "plano_id", "data_compra"];

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase().replace(/["\s]/g, "");
  const sep = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine.split(sep).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.replace(/^"|"$/g, "").trim());
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row as CsvRow;
  });
}

const AdminImportarAlunos = () => {
  const [plans, setPlans] = useState<{ id: string; name: string; price: number }[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [defaultPlanId, setDefaultPlanId] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("id, name, price")
      .eq("active", true)
      .order("price")
      .then(({ data }) => setPlans(data || []));
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);

      if (rows.length === 0) {
        toast.error("CSV vazio ou formato inválido.");
      } else {
        toast.success(`${rows.length} linhas encontradas no CSV.`);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (csvRows.length === 0) return;

    const rowsToSend = csvRows.map((r) => ({
      ...r,
      plano_id: r.plano_id || defaultPlanId,
    }));

    const missingPlan = rowsToSend.find((r) => !r.plano_id);
    if (missingPlan) {
      toast.error("Selecione um plano padrão ou preencha plano_id no CSV.");
      return;
    }

    setImporting(true);
    setProgress(10);
    setResult(null);

    try {
      // Send in batches of 50
      const batchSize = 50;
      const totalBatches = Math.ceil(rowsToSend.length / batchSize);
      const aggregated: ImportResult = { created: 0, skipped: 0, errors: [] };

      for (let i = 0; i < totalBatches; i++) {
        const batch = rowsToSend.slice(i * batchSize, (i + 1) * batchSize);

        const { data, error } = await supabase.functions.invoke("import-legacy-users", {
          body: { rows: batch },
        });

        if (error) throw error;

        aggregated.created += data.created || 0;
        aggregated.skipped += data.skipped || 0;
        aggregated.errors.push(...(data.errors || []));

        setProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setResult(aggregated);
      toast.success(`Importação concluída: ${aggregated.created} criados, ${aggregated.skipped} existentes.`);
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
      setResult({ created: 0, skipped: 0, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = EXPECTED_HEADERS.join(",");
    const example = `João Silva,joao@email.com,11999999999,${plans[0]?.id || "ID_DO_PLANO"},01/01/2024`;
    const blob = new Blob([header + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Alunos</h1>
        <p className="text-sm text-muted-foreground">Importe usuários legados via arquivo CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Upload do CSV
            </CardTitle>
            <CardDescription>
              Colunas esperadas: <code className="text-xs bg-muted px-1 py-0.5 rounded">full_name, email, phone, plano_id, data_compra</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Template
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {fileName || "Selecionar CSV"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            {/* Default plan selector */}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Plano padrão (usado quando <code className="text-xs bg-muted px-1 rounded">plano_id</code> estiver vazio no CSV):
                </label>
                <Select value={defaultPlanId} onValueChange={setDefaultPlanId}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Pré-visualização ({csvRows.length} linhas)
                </p>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium text-muted-foreground">#</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Nome</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Email</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Telefone</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Plano ID</th>
                        <th className="p-2 text-left font-medium text-muted-foreground">Data Compra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvRows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          <td className="p-2 text-foreground">{r.full_name}</td>
                          <td className="p-2 text-foreground">{r.email}</td>
                          <td className="p-2 text-muted-foreground">{r.phone || "—"}</td>
                          <td className="p-2 font-mono text-xs text-muted-foreground">{r.plano_id || <span className="text-amber-500">padrão</span>}</td>
                          <td className="p-2 text-muted-foreground">{r.data_compra}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {csvRows.length - 20} linhas
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Import button */}
            {csvRows.length > 0 && (
              <Button onClick={handleImport} disabled={importing} className="w-full sm:w-auto">
                {importing ? "Importando..." : `Importar ${csvRows.length} alunos`}
              </Button>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% concluído</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma importação realizada ainda.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{result.created}</p>
                    <p className="text-xs text-muted-foreground">Criados com sucesso</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{result.skipped}</p>
                    <p className="text-xs text-muted-foreground">Já existentes (ignorados)</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-destructive" />
                      <p className="text-sm font-medium text-foreground">{result.errors.length} erros</p>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plans reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Planos Disponíveis (referência para o CSV)</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">ID (para o CSV)</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Preço</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-foreground font-medium">{p.name}</td>
                      <td className="py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono select-all">{p.id}</code>
                      </td>
                      <td className="py-2 text-right font-mono text-foreground">R$ {p.price.toFixed(2)}</td>
                      <td className="py-2 text-right text-muted-foreground">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImportarAlunos;

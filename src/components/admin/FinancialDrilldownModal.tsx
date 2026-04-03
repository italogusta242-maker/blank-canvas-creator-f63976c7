import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { InferredSubscription, PlanBreakdown } from "@/hooks/useFinancialDashboard";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subscriptions: InferredSubscription[];
  totals?: { revenue: number; mrr: number };
}

const FinancialDrilldownModal = ({ open, onOpenChange, title, subscriptions, totals }: Props) => {
  const totalMRR = totals?.mrr ?? subscriptions.reduce((s, r) => s + r.mrrContribution, 0);
  const totalRevenue = totals?.revenue ?? subscriptions.reduce((s, r) => s + r.sanitizedPrice, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <div className="flex gap-4 pt-2 text-sm">
            <span className="text-muted-foreground">
              {subscriptions.length} assinatura{subscriptions.length !== 1 ? "s" : ""}
            </span>
            <span className="font-mono font-medium text-foreground">Receita: {fmt(totalRevenue)}</span>
            <span className="font-mono font-medium text-primary">MRR: {fmt(totalMRR)}</span>
          </div>
        </DialogHeader>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro</p>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Dado Bruto (BD)</TableHead>
                  <TableHead>Valor Sanitizado</TableHead>
                  <TableHead>Fórmula Aplicada</TableHead>
                  <TableHead>MRR Contribuído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => {
                  const wasCorrected = s.rawPrice !== s.sanitizedPrice;
                  const formula = `${fmt(s.sanitizedPrice)} / ${s.inferredDurationMonths} ${s.inferredDurationMonths === 1 ? "mês" : "meses"}`;
                  return (
                    <TableRow key={s.subscriptionId}>
                      <TableCell>
                        <p className="font-medium text-foreground truncate max-w-[160px]">{s.userName || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{s.userEmail || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm ${wasCorrected ? "text-destructive line-through" : "text-muted-foreground"}`}>
                          {s.rawPrice}
                        </span>
                        {wasCorrected && (
                          <Badge variant="outline" className="ml-2 text-[10px]">centavos</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{fmt(s.sanitizedPrice)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formula}</TableCell>
                      <TableCell className="font-mono text-sm font-medium text-primary">{fmt(s.mrrContribution)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FinancialDrilldownModal;

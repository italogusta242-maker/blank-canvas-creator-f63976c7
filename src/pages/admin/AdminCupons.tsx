import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}

const AdminCupons = () => {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("10");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Coupon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = newCode.trim().toUpperCase();
      if (!code) throw new Error("Código obrigatório");
      const { error } = await supabase.from("coupons" as any).insert({
        code,
        discount_percent: parseInt(newDiscount) || 10,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setNewCode("");
      setNewDiscount("10");
      toast.success("Cupom criado!");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar cupom"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("coupons" as any)
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom removido");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cupons de Desconto</h1>
        <p className="text-muted-foreground text-sm">Gerencie os cupons do funil de vendas</p>
      </div>

      {/* Create new coupon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus size={16} /> Novo Cupom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs">Código</Label>
              <Input
                placeholder="EX: PROMO20"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">Desconto %</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newCode.trim()}
              size="default"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coupons list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag size={16} /> Cupons Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum cupom cadastrado</p>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider ${coupon.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {coupon.code}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {coupon.discount_percent}% off
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      ({coupon.uses_count} usos)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={coupon.active}
                      onCheckedChange={(active) => toggleMutation.mutate({ id: coupon.id, active })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(coupon.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCupons;

import { useState, useEffect, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Users, Search, Filter, ShieldCheck, Flame, Dumbbell, Apple, Brain,
  MessageSquare, User, CheckCircle2, XCircle, Plus, Eye, ChevronDown, Loader2,
  LineChart, BarChart2, Activity, UserCog, Edit3, Trash2, UserPlus, ArrowDown, ArrowUp,
  FileSpreadsheet, Download
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PaymentConciliationModal from "@/components/admin/PaymentConciliationModal";
import WhatsAppBulkModal from "@/components/admin/WhatsAppBulkModal";

// Status mapping from DB to display
const mapStatus = (status: string): string => {
  if (status === "ativo") return "ativo";
  if (status === "inativo") return "inativo";
  return "alerta";
};

const statusColor: Record<string, string> = {
  ativo: "bg-emerald-500/20 text-emerald-400",
  alerta: "bg-amber-500/20 text-amber-400",
  inativo: "bg-destructive/20 text-destructive",
};

const SectionBlock = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-primary">
      <Icon size={16} />
      <h4 className="font-cinzel text-sm font-bold">{title}</h4>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-foreground font-medium">{value}</p></div>
);

// ============================
// GROUP DETAIL PANEL
// ============================
const GroupDetailPanel = ({
  group,
  allAlunos,
  onBack,
  onMemberChange,
}: {
  group: { id: string; name: string };
  allAlunos: any[];
  onBack: () => void;
  onMemberChange: () => void;
}) => {
  const [challenges, setChallenges] = useState<{ id: string; title: string; target_group_id: string | null }[]>([]);
  const [allChallenges, setAllChallenges] = useState<{ id: string; title: string; target_group_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentSearch, setAddStudentSearch] = useState("");
  const [addChallengeOpen, setAddChallengeOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  const members = allAlunos.filter((a) => a.group_id === group.id);
  const nonMembers = allAlunos
    .filter((a) => a.group_id !== group.id)
    .filter((a) => 
      a.full_name?.toLowerCase().includes(addStudentSearch.toLowerCase()) || 
      a.email?.toLowerCase().includes(addStudentSearch.toLowerCase()) ||
      a.phone?.includes(addStudentSearch)
    );

  const fetchChallenges = async () => {
    setLoading(true);
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase.from("challenges").select("id, title, target_group_id").eq("target_group_id", group.id),
      supabase.from("challenges").select("id, title, target_group_id").order("created_at", { ascending: false }),
    ]);
    setChallenges(linked || []);
    setAllChallenges(all || []);
    setLoading(false);
  };

  useEffect(() => { fetchChallenges(); }, [group.id]);

  const handleAddStudent = async (studentId: string) => {
    const { error } = await supabase.from("profiles").update({ group_id: group.id } as any).eq("id", studentId);
    if (error) toast.error("Erro ao adicionar aluno");
    else { toast.success("Aluno adicionado ao grupo!"); onMemberChange(); }
  };

  const handleRemoveStudent = async (studentId: string) => {
    const { error } = await supabase.from("profiles").update({ group_id: null } as any).eq("id", studentId);
    if (error) toast.error("Erro ao remover aluno");
    else { toast.success("Aluno removido do grupo"); onMemberChange(); }
  };

  const handleLinkChallenge = async (challengeId: string) => {
    const { error } = await supabase.from("challenges").update({ target_group_id: group.id }).eq("id", challengeId);
    if (error) toast.error("Erro ao vincular desafio");
    else { toast.success("Desafio vinculado ao grupo!"); fetchChallenges(); }
    setAddChallengeOpen(false);
  };

  const handleUnlinkChallenge = async (challengeId: string) => {
    const { error } = await supabase.from("challenges").update({ target_group_id: null }).eq("id", challengeId);
    if (error) toast.error("Erro ao desvincular desafio");
    else { toast.success("Desafio desvinculado (agora é global)"); fetchChallenges(); }
  };

  const unlinkedChallenges = allChallenges.filter(
    (c) => !c.target_group_id || c.target_group_id !== group.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronDown size={20} className="rotate-90" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
          <p className="text-sm text-muted-foreground">{members.length} aluno{members.length !== 1 ? 's' : ''} · {challenges.length} desafio{challenges.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Members */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Users size={18} className="text-primary" /> Alunos do Grupo</h3>
            <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><UserPlus size={14} /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Adicionar Aluno ao Grupo "{group.name}"</DialogTitle></DialogHeader>
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={addStudentSearch}
                  onChange={(e) => setAddStudentSearch(e.target.value)}
                  className="bg-background border-border"
                />
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {nonMembers.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground text-sm">Nenhum aluno disponível</p>
                  ) : nonMembers.slice(0, 20).map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleAddStudent(a.id)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum aluno neste grupo ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {(m.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveStudent(m.id)}>
                    <XCircle size={14} className="mr-1" /> Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenges */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Flame size={18} className="text-accent" /> Desafios Vinculados</h3>
            <Dialog open={addChallengeOpen} onOpenChange={setAddChallengeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus size={14} /> Vincular Desafio</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Vincular Desafio ao Grupo "{group.name}"</DialogTitle></DialogHeader>
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {loading ? (
                    <div className="py-6 flex justify-center"><Loader2 size={20} className="animate-spin" /></div>
                  ) : unlinkedChallenges.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground text-sm">Todos os desafios já estão vinculados</p>
                  ) : unlinkedChallenges.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.target_group_id ? "Vinculado a outro grupo" : "Global (todos)"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleLinkChallenge(c.id)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum desafio vinculado a este grupo.</p>
          ) : (
            <div className="divide-y divide-border">
              {challenges.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Flame size={14} className="text-accent" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleUnlinkChallenge(c.id)}>
                    <XCircle size={14} className="mr-1" /> Desvincular
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const USERS_PAGE_SIZE = 50;

const AdminUsuarios = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const specialistFilter = searchParams.get("specialist");
  const [specialistFilterName, setSpecialistFilterName] = useState<string | null>(null);
  const [specialistStudentIds, setSpecialistStudentIds] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [chamaFilter, setChamaFilter] = useState<string>("todas");
  const [adesaoFilter, setAdesaoFilter] = useState<string>("todas");

  const [activeTab, setActiveTab] = useState("alunos");
  const [alunoSubTab, setAlunoSubTab] = useState<"ativos" | "nao_alunos" | "comercial">("ativos");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [specialistMap, setSpecialistMap] = useState<Record<string, { display: string; personal?: string; personalName?: string; nutri?: string; nutriName?: string }>>({});
  const [flameMap, setFlameMap] = useState<Record<string, { state: string; adherence: number }>>({});

  // Create Aluno
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "", email: "", password: "", phone: "",
    role: "user" as string, plano: "",
  });

  // Create Profissional
  const [createProOpen, setCreateProOpen] = useState(false);
  const [newPro, setNewPro] = useState({
    full_name: "", email: "", password: "", role: "personal" as string, especialidade: ""
  });

  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [loadingPros, setLoadingPros] = useState(false);

  const [alunos, setAlunos] = useState<any[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [funnelLeads, setFunnelLeads] = useState<any[]>([]);

  // Payment evidence for pendente users
  const [paymentEvidence, setPaymentEvidence] = useState<Record<string, { hasPaid: boolean; reason: string; details: string }>>({});
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Assign specialist state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState<string | null>(null);
  const [assignStudentName, setAssignStudentName] = useState("");
  const [personalList, setPersonalList] = useState<{ id: string; full_name: string }[]>([]);
  const [nutriList, setNutriList] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedPersonal, setSelectedPersonal] = useState("");
  const [selectedNutri, setSelectedNutri] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Groups (Turmas)
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // ── Edit User Modal state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPlanId, setEditPlanId] = useState("");
  const [editFlameStreak, setEditFlameStreak] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [plans, setPlans] = useState<{ id: string; name: string; price: number }[]>([]);
  const [userSubs, setUserSubs] = useState<Record<string, string>>({});

  // ── Delete User state ──
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // ── Migrate Leads state ──
  const [migrating, setMigrating] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch subscription plans
  const fetchPlans = async () => {
    const { data } = await supabase.from("subscription_plans").select("id, name, price").eq("active", true).order("price");
    setPlans(data || []);
  };

  // Fetch subscriptions for all users
  const fetchUserSubs = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data } = await supabase.from("subscriptions").select("user_id, subscription_plan_id").in("user_id", userIds);
    const map: Record<string, string> = {};
    data?.forEach(s => { if (s.subscription_plan_id) map[s.user_id] = s.subscription_plan_id; });
    setUserSubs(map);
  };

  useEffect(() => { fetchPlans(); }, []);

  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappAtivosModalOpen, setWhatsappAtivosModalOpen] = useState(false);

  const fetchGroups = async () => {
    const { data } = await supabase.from("user_groups").select("id, name").order("name");
    setGroups(data || []);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    const { error } = await supabase.from("user_groups").insert({ name: newGroupName.trim() });
    if (error) { toast.error("Erro ao criar grupo"); }
    else { toast.success("Grupo criado!"); setNewGroupName(""); fetchGroups(); }
    setCreatingGroup(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const { error } = await supabase.from("user_groups").delete().eq("id", groupId);
    if (error) toast.error("Erro ao excluir grupo");
    else { toast.success("Grupo excluído"); fetchGroups(); }
  };

  const handleSetUserGroup = async (userId: string, groupId: string | null) => {
    const { error } = await supabase.from("profiles").update({ group_id: groupId } as any).eq("id", userId);
    if (error) toast.error("Erro ao atualizar grupo");
    else { toast.success("Grupo atualizado!"); fetchAlunos(); }
  };

  const fetchFunnelLeads = async () => {
    setLoadingLeads(true);
    try {
      // Fetch leads that are NOT migrated
      const { data, error } = await supabase
        .from("funnel_leads")
        .select("*")
        .neq("status", "migrated")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Filter out leads whose email already exists as an active profile
      const activeEmails = new Set(
        alunos
          .filter(a => a.status === "ativo")
          .map(a => a.email?.toLowerCase())
          .filter(Boolean)
      );
      const filtered = (data || []).filter(
        lead => !activeEmails.has(lead.email?.toLowerCase())
      );
      setFunnelLeads(filtered);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (activeTab === "profissionais") {
      fetchProfissionais();
    } else if (activeTab === "alunos") {
      fetchAlunos();
      fetchFunnelLeads();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!specialistFilter) {
      setSpecialistStudentIds(null);
      setSpecialistFilterName(null);
      return;
    }
    const loadFilter = async () => {
      const [{ data: ss }, { data: profile }] = await Promise.all([
        supabase.from("student_specialists").select("student_id").eq("specialist_id", specialistFilter),
        supabase.from("profiles").select("full_name").eq("id", specialistFilter).single(),
      ]);
      setSpecialistStudentIds(ss?.map(s => s.student_id) || []);
      setSpecialistFilterName(profile?.full_name || "Especialista");
    };
    loadFilter();
  }, [specialistFilter]);

  const fetchAlunos = async () => {
    setLoadingAlunos(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, status, phone, created_at, avatar_url, group_id, planner_type");
      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;

      const nonUserRoleIds = rolesData?.filter(r => r.role !== "user").map(r => r.user_id) || [];

      if (profilesData) {
        const alunosReais = profilesData.filter(p => !nonUserRoleIds.includes(p.id));
        setAlunos(alunosReais);
        fetchUserSubs(alunosReais.map(a => a.id));

        // Fetch payment evidence for pendente users
        const pendenteUsers = alunosReais.filter(a => a.status === "pendente" || a.status === "pendente_onboarding");
        if (pendenteUsers.length > 0) {
          const pendenteIds = pendenteUsers.map(u => u.id);
          const pendenteEmails = pendenteUsers.map(u => u.email).filter(Boolean);
          
          const [paymentsRes, webhookRes, subsRes] = await Promise.all([
            supabase.from("payments").select("user_id, status, amount, created_at").in("user_id", pendenteIds),
            pendenteEmails.length > 0
              ? supabase.from("webhook_logs").select("email, status_log, event_type, created_at").in("email", pendenteEmails).order("created_at", { ascending: false }).limit(500)
              : Promise.resolve({ data: [] }),
            supabase.from("subscriptions").select("user_id, status, payment_status").in("user_id", pendenteIds),
          ]);

          const paymentsData = paymentsRes.data || [];
          const webhookData = (webhookRes as any).data || [];
          const subsData = subsRes.data || [];

          const evidenceMap: Record<string, { hasPaid: boolean; reason: string; details: string }> = {};
          pendenteUsers.forEach(u => {
            const userPayments = paymentsData.filter(p => p.user_id === u.id && p.status === "paid");
            const userWebhooks = webhookData.filter((w: any) => w.email?.toLowerCase() === u.email?.toLowerCase());
            const successWebhooks = userWebhooks.filter((w: any) => w.status_log === "sucesso");
            const errorWebhooks = userWebhooks.filter((w: any) => w.status_log === "erro" || w.status_log === "usuario_nao_encontrado");
            const userSub = subsData.find(s => s.user_id === u.id);

            if (userPayments.length > 0 || successWebhooks.length > 0 || (userSub && userSub.payment_status === "paid")) {
              // Has payment evidence — should be active but isn't
              let reason = "Pagamento confirmado mas ativação automática falhou.";
              let details = "";
              
              if (errorWebhooks.length > 0) {
                reason = "Webhook recebido com erro — e-mail não encontrado no momento do pagamento.";
                details = `Último erro: ${errorWebhooks[0].status_log} em ${new Date(errorWebhooks[0].created_at).toLocaleDateString("pt-BR")}`;
              } else if (successWebhooks.length > 0 && userPayments.length > 0) {
                reason = "Webhook processado com sucesso, mas status do perfil não foi atualizado (possível falha de timing).";
                details = `Pagamento: R$ ${userPayments[0].amount} em ${new Date(userPayments[0].created_at).toLocaleDateString("pt-BR")}`;
              } else if (userPayments.length > 0) {
                reason = "Pagamento registrado manualmente mas perfil permaneceu pendente.";
                details = `Valor: R$ ${userPayments[0].amount}`;
              } else if (userSub && userSub.payment_status === "paid") {
                reason = "Assinatura marcada como paga mas perfil não foi ativado.";
              } else {
                reason = "Webhook de sucesso recebido mas perfil não atualizado.";
              }
              
              evidenceMap[u.id] = { hasPaid: true, reason, details };
            } else {
              evidenceMap[u.id] = { hasPaid: false, reason: "Sem registro de pagamento encontrado.", details: "" };
            }
          });
          setPaymentEvidence(evidenceMap);
        }

        const alunoIds = alunosReais.map(a => a.id);
        if (alunoIds.length > 0) {
          const { data: ssData } = await supabase
            .from("student_specialists")
            .select("student_id, specialist_id, specialty")
            .in("student_id", alunoIds);

          if (ssData && ssData.length > 0) {
            const specIds = [...new Set(ssData.map(s => s.specialist_id))];
            const { data: specProfiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", specIds);

            const specNameMap = new Map(specProfiles?.map(p => [p.id, p.full_name]) || []);
            const sMap: Record<string, { display: string; personal?: string; personalName?: string; nutri?: string; nutriName?: string }> = {};
            ssData.forEach(s => {
              const name = specNameMap.get(s.specialist_id) || "Especialista";
              if (!sMap[s.student_id]) sMap[s.student_id] = { display: "" };
              if (s.specialty === "personal") {
                sMap[s.student_id].personal = s.specialist_id;
                sMap[s.student_id].personalName = name;
              }
              if (s.specialty === "nutricionista") {
                sMap[s.student_id].nutri = s.specialist_id;
                sMap[s.student_id].nutriName = name;
              }
              sMap[s.student_id].display = sMap[s.student_id].display
                ? `${sMap[s.student_id].display}, ${name}`
                : name;
            });
            setSpecialistMap(sMap);
          }

          const [workoutsRes, plansRes] = await Promise.all([
            supabase
              .from("workouts")
              .select("user_id, finished_at")
              .in("user_id", alunoIds)
              .not("finished_at", "is", null)
              .order("finished_at", { ascending: false })
              .limit(1000),
            supabase
              .from("training_plans")
              .select("user_id, groups, created_at")
              .in("user_id", alunoIds)
              .eq("active", true),
          ]);

          const allWorkouts = workoutsRes.data || [];
          const plans = plansRes.data || [];

          const toLocal = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          const today = new Date();
          const todayStr = toLocal(today);

          const fMap: Record<string, { state: string; adherence: number }> = {};
          alunoIds.forEach((id) => {
            const userWorkouts = allWorkouts.filter((w) => w.user_id === id);
            const userPlan = plans.find((p) => p.user_id === id);

            if (!userPlan || !Array.isArray(userPlan.groups) || userWorkouts.length === 0) {
              fMap[id] = { state: "normal", adherence: 0 };
              return;
            }

            const numGroups = Math.min(Math.max((userPlan.groups as any[]).length, 1), 7);
            const dayMap = [1, 2, 3, 4, 5, 6, 0];
            const scheduledDays = new Set<number>();
            for (let i = 0; i < numGroups; i++) scheduledDays.add(dayMap[i]);

            const planCreatedAt = new Date(userPlan.created_at);
            const workoutDates = new Set(userWorkouts.map((w) => toLocal(new Date(w.finished_at!))));
            const trainedToday = workoutDates.has(todayStr);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const trainedYesterday = workoutDates.has(toLocal(yesterday));

            let streak = trainedToday ? 1 : 0;
            let missed = 0;

            for (let i = trainedToday ? 1 : 0; i < 90; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              if (d < planCreatedAt) break;
              if (!scheduledDays.has(d.getDay())) continue;
              if (i === 0) continue;

              if (workoutDates.has(toLocal(d))) {
                if (missed === 0) streak++;
              } else {
                missed++;
                if (missed >= 2) break;
              }
            }

            let schedCount = 0, doneCount = 0;
            for (let i = 0; i < 7; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              if (d < planCreatedAt) break;
              if (scheduledDays.has(d.getDay())) {
                schedCount++;
                if (workoutDates.has(toLocal(d))) doneCount++;
              }
            }
            const adherence = schedCount > 0 ? Math.round((doneCount / schedCount) * 100) : 0;

            let state: string;
            if (trainedToday) state = "ativa";
            else if (trainedYesterday && missed === 0) state = "ativa";
            else if (missed === 0) state = streak > 0 ? "ativa" : "normal";
            else if (missed === 1) state = "tregua";
            else { state = "extinta"; streak = 0; }

            fMap[id] = { state, adherence };
          });
          setFlameMap(fMap);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao puxar alunos reais");
    } finally {
      setLoadingAlunos(false);
    }
  };

  const fetchProfissionais = async () => {
    setLoadingPros(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role").neq("role", "user");
      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email, status").in("id", userIds);

        if (profilesData) {
          const merged = profilesData.map(p => {
            const roleInfo = rolesData.find(r => r.user_id === p.id);
            return { ...p, role: roleInfo?.role || "desconhecido" };
          });
          setProfissionais(merged);
        }
      } else {
        setProfissionais([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao puxar profissionais");
    } finally {
      setLoadingPros(false);
    }
  };

  const handleCreatePro = async () => {
    if (!newPro.full_name || !newPro.email || !newPro.password || !newPro.role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setCreating(true);
    try {
      toast.success("Profissional registrado com sucesso!");
      setCreateProOpen(false);
      setNewPro({ full_name: "", email: "", password: "", role: "personal", especialidade: "" });
      fetchProfissionais();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar profissional");
    } finally {
      setCreating(false);
    }
  };

  const setField = (key: string, val: string | boolean) => setNewUser((u) => ({ ...u, [key]: val }));

  const openAssignDialog = async (studentId: string, studentName: string) => {
    setAssignStudentId(studentId);
    setAssignStudentName(studentName);
    const current = specialistMap[studentId];
    setSelectedPersonal(current?.personal || "");
    setSelectedNutri(current?.nutri || "");
    setAssignOpen(true);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["personal", "nutricionista"]);

    if (rolesData && rolesData.length > 0) {
      const specIds = [...new Set(rolesData.map(r => r.user_id))];
      const { data: specProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", specIds);

      const nameMap = new Map(specProfiles?.map(p => [p.id, p.full_name || "Sem nome"]) || []);

      setPersonalList(
        rolesData.filter(r => r.role === "personal").map(r => ({ id: r.user_id, full_name: nameMap.get(r.user_id) || "Sem nome" }))
      );
      setNutriList(
        rolesData.filter(r => r.role === "nutricionista").map(r => ({ id: r.user_id, full_name: nameMap.get(r.user_id) || "Sem nome" }))
      );
    } else {
      setPersonalList([]);
      setNutriList([]);
    }
  };

  const handleAssignSpecialist = async () => {
    if (!assignStudentId || (!selectedPersonal && !selectedNutri)) {
      toast.error("Selecione pelo menos um especialista");
      return;
    }
    setAssigning(true);
    try {
      await supabase.from("student_specialists").delete().eq("student_id", assignStudentId);

      const inserts: { student_id: string; specialist_id: string; specialty: string }[] = [];
      if (selectedPersonal) inserts.push({ student_id: assignStudentId, specialist_id: selectedPersonal, specialty: "personal" });
      if (selectedNutri) inserts.push({ student_id: assignStudentId, specialist_id: selectedNutri, specialty: "nutricionista" });

      if (inserts.length > 0) {
        const { error } = await supabase.from("student_specialists").insert(inserts);
        if (error) throw error;
      }

      toast.success("Especialistas atribuídos com sucesso!");
      setAssignOpen(false);
      fetchAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atribuir especialistas");
    } finally {
      setAssigning(false);
    }
  };

  const filteredAlunos = useMemo(() => {
    let list = alunos;
    if (specialistStudentIds) {
      list = list.filter(a => specialistStudentIds.includes(a.id));
    }
    if (search) {
      list = list.filter(a => 
        a.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        a.email?.toLowerCase().includes(search.toLowerCase()) ||
        a.phone?.includes(search)
      );
    }
    if (statusFilter !== "todos") {
      list = list.filter(a => mapStatus(a.status) === statusFilter);
    }
    if (chamaFilter !== "todas") {
      list = list.filter(a => flameMap[a.id]?.state === chamaFilter);
    }
    if (adesaoFilter !== "todas") {
      list = list.filter(a => {
        const ad = flameMap[a.id]?.adherence ?? 0;
        if (adesaoFilter === "baixa") return ad < 50;
        if (adesaoFilter === "media") return ad >= 50 && ad < 85;
        if (adesaoFilter === "alta") return ad >= 85;
        return true;
      });
    }
    const sorted = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return sorted;
  }, [alunos, search, sortOrder, statusFilter, specialistStudentIds, flameMap, chamaFilter, adesaoFilter]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, chamaFilter, adesaoFilter, alunoSubTab]);

  // Ativos = status ativo (pagaram e foram ativados com sucesso)
  const alunosAtivos = useMemo(() => filteredAlunos.filter(a => a.status === "ativo"), [filteredAlunos]);
  // Pré-cadastro = pendentes que TÊM evidência de pagamento (pagaram mas não foram ativados)
  const alunosPagosNaoAtivados = useMemo(() => 
    alunos.filter(a => (a.status === "pendente" || a.status === "pendente_onboarding") && paymentEvidence[a.id]?.hasPaid),
    [alunos, paymentEvidence]
  );
  // Comercial = pendentes SEM evidência de pagamento (fizeram pré-cadastro mas não pagaram)
  const alunosPendentes = useMemo(() => 
    alunos.filter(a => (a.status === "pendente" || a.status === "pendente_onboarding") && !paymentEvidence[a.id]?.hasPaid),
    [alunos, paymentEvidence]
  );

  // Pagination helpers
  const currentList = alunoSubTab === "ativos" ? alunosAtivos : alunoSubTab === "nao_alunos" ? alunosPagosNaoAtivados : alunosPendentes;
  const totalPages = Math.max(1, Math.ceil(currentList.length / USERS_PAGE_SIZE));
  const paginatedAtivos = useMemo(() => {
    const start = (currentPage - 1) * USERS_PAGE_SIZE;
    return alunosAtivos.slice(start, start + USERS_PAGE_SIZE);
  }, [alunosAtivos, currentPage]);

  const handleExportPendentesCSV = () => {
    if (alunosPendentes.length === 0) {
      toast.error("Nenhum lead pendente para exportar");
      return;
    }
    const header = "Nome,Email,Telefone,Status,Criado em";
    const rows = alunosPendentes.map(a =>
      `"${(a.full_name || "").replace(/"/g, '""')}","${a.email || ""}","${a.phone || ""}","${a.status}","${new Date(a.created_at).toLocaleDateString("pt-BR")}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_recuperacao_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${alunosPendentes.length} leads exportados com sucesso!`);
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast.error("Nome, email e senha são obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone || undefined,
          role: newUser.role,
          skipOnboarding: true,
          plano: newUser.plano || undefined,
        },
      });

      if (res.error) throw new Error(res.error.message || "Erro na função");
      const result = res.data as any;
      if (result?.error) throw new Error(result.error);

      toast.success("Aluno criado com sucesso!");
      setCreateOpen(false);
      setNewUser({ full_name: "", email: "", password: "", phone: "", role: "user", plano: "" });
      fetchAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  // ── Open Edit Modal ──
  const openEditModal = async (aluno: any) => {
    setEditUser(aluno);
    setEditFullName(aluno.full_name || "");
    setEditEmail(aluno.email || "");
    setEditStatus(aluno.status || "pendente");
    setEditPlanId(userSubs[aluno.id] || "none");
    // Fetch current flame streak
    try {
      const { data: flame } = await supabase.from("flame_status").select("streak").eq("user_id", aluno.id).maybeSingle();
      setEditFlameStreak(flame?.streak?.toString() || "0");
    } catch { setEditFlameStreak("0"); }
    setEditOpen(true);
  };

  // ── Save Edit ──
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const body: any = { user_id: editUser.id };
      if (editFullName !== editUser.full_name) body.full_name = editFullName;
      if (editEmail !== editUser.email) body.email = editEmail;
      if (editStatus !== editUser.status) body.status = editStatus;
      if (editFlameStreak !== "") body.flame_streak = parseInt(editFlameStreak, 10);
      if (editPlanId && editPlanId !== "none" && editPlanId !== userSubs[editUser.id]) {
        body.subscription_plan_id = editPlanId;
      }

      const res = await supabase.functions.invoke("admin-edit-user", { body });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;
      if (result?.error) throw new Error(result.error);

      toast.success("Usuário atualizado com sucesso!");
      setEditOpen(false);
      setEditUser(null);
      fetchAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Delete User ──
  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data as any;
      if (result?.error) throw new Error(result.error);

      toast.success("Usuário excluído com sucesso!");
      fetchAlunos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Migrate All Leads (in batches of 20) ──
  const handleMigrateLeads = async () => {
    setMigrating(true);
    let totalCreated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      let remaining = 1; // start loop
      while (remaining > 0) {
        const res = await supabase.functions.invoke("migrate-leads-to-users");
        if (res.error) throw new Error(res.error.message);
        const result = res.data as any;
        if (result?.error) throw new Error(result.error);

        totalCreated += result.created || 0;
        totalSkipped += result.skipped || 0;
        if (result.errors?.length) allErrors.push(...result.errors);
        remaining = result.remaining || 0;

        if (remaining > 0) {
          toast.info(`Processando... ${totalCreated} criados, ${remaining} restantes`);
        }
      }

      toast.success(`Migração concluída! ✅ ${totalCreated} criados, ⏭ ${totalSkipped} já existiam${allErrors.length ? `, ❌ ${allErrors.length} erros` : ""}`);

      if (allErrors.length) {
        console.warn("Erros na migração:", allErrors);
      }

      fetchAlunos();
      fetchFunnelLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro na migração");
      if (totalCreated > 0) {
        toast.info(`Progresso parcial: ${totalCreated} criados antes do erro`);
      }
    } finally {
      setMigrating(false);
    }
  };

  // ── Audit & Repair Orphan Users ──
  const handleAuditRepair = async () => {
    setAuditing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      // First audit
      const auditRes = await supabase.functions.invoke("audit-repair-users", {
        body: { mode: "audit" },
      });
      if (auditRes.error) throw new Error(auditRes.error.message);
      const audit = auditRes.data as any;
      const totalIssues = (audit.issues?.no_auth || 0) + (audit.issues?.no_profile || 0) + (audit.issues?.no_subscription || 0) + (audit.issues?.profile_not_active || 0) + (audit.issues?.no_role || 0);

      if (totalIssues === 0) {
        toast.success(`✅ Auditoria ok! ${audit.total_migrated_leads} leads, todos consistentes.`);
        setAuditing(false);
        return;
      }

      toast.info(`Encontrados ${totalIssues} problemas. Reparando...`);

      // Now repair
      const repairRes = await supabase.functions.invoke("audit-repair-users", {
        body: { mode: "repair" },
      });
      if (repairRes.error) throw new Error(repairRes.error.message);
      const repair = repairRes.data as any;

      toast.success(`🔧 Reparação concluída! ${repair.repaired || 0} correções aplicadas.`);
      fetchAlunos();
      fetchFunnelLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro na auditoria");
    } finally {
      setAuditing(false);
    }
  };

  // ── Edit Lead ──
  const [conciliationOpen, setConciliationOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [editLeadFullName, setEditLeadFullName] = useState("");
  const [editLeadEmail, setEditLeadEmail] = useState("");
  const [editLeadPhone, setEditLeadPhone] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  const openEditLeadModal = (lead: any) => {
    setEditLead(lead);
    setEditLeadFullName(lead.full_name || "");
    setEditLeadEmail(lead.email || "");
    setEditLeadPhone(lead.phone || "");
    setEditLeadOpen(true);
  };

  const handleSaveLeadEdit = async () => {
    if (!editLead) return;
    setSavingLead(true);
    try {
      const { error } = await supabase.from("funnel_leads").update({
        full_name: editLeadFullName,
        email: editLeadEmail.toLowerCase(),
        phone: editLeadPhone || null,
      }).eq("id", editLead.id);
      if (error) throw error;
      toast.success("Lead atualizado!");
      setEditLeadOpen(false);
      fetchFunnelLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar lead");
    } finally {
      setSavingLead(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase.from("funnel_leads").delete().eq("id", leadId);
      if (error) throw error;
      toast.success("Lead excluído!");
      fetchFunnelLeads();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir lead");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="text-primary" size={32} /> Central de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            {specialistFilterName ? `Filtrando alunos de: ${specialistFilterName}` : "Gerencie alunos e profissionais da plataforma"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setConciliationOpen(true)} className="gap-2">
            <FileSpreadsheet size={18} /> Conciliar Pagamentos CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus size={18} /> Novo Aluno
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border p-1">
          <TabsTrigger value="alunos" className="gap-2 px-6">
            <Users size={16} /> Usuários ({alunosAtivos.length + alunosPagosNaoAtivados.length + alunosPendentes.length + funnelLeads.length})
          </TabsTrigger>
          <TabsTrigger value="grupos" className="gap-2 px-6">
            <Filter size={16} /> Grupos / Turmas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alunos" className="space-y-4">
          {/* Sub-tabs: Alunos vs Não Alunos */}
          <div className="flex gap-2 mb-2">
            <Button
              variant={alunoSubTab === "ativos" ? "default" : "outline"}
              size="sm"
              onClick={() => setAlunoSubTab("ativos")}
              className="gap-1.5"
            >
              <CheckCircle2 size={14} /> Ativos ({alunosAtivos.length})
            </Button>
            <Button
              variant={alunoSubTab === "nao_alunos" ? "default" : "outline"}
              size="sm"
              onClick={() => setAlunoSubTab("nao_alunos")}
              className="gap-1.5"
            >
              <XCircle size={14} /> Pré-cadastro ({alunosPagosNaoAtivados.length})
            </Button>
            <Button
              variant={alunoSubTab === "comercial" ? "default" : "outline"}
              size="sm"
              onClick={() => setAlunoSubTab("comercial")}
              className="gap-1.5"
            >
              <UserCog size={14} /> Comercial / Recuperação ({alunosPendentes.length + funnelLeads.length})
            </Button>
          </div>

          <Card className="bg-card border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/20 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Nome, e-mail ou telefone..."
                  className="pl-10 bg-background border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {alunoSubTab === "ativos" && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-background border-border"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="ativo">Ativos</SelectItem>
                      <SelectItem value="alerta">Alertas</SelectItem>
                      <SelectItem value="inativo">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={chamaFilter} onValueChange={setChamaFilter}>
                    <SelectTrigger className="w-[140px] bg-background border-border"><SelectValue placeholder="Chama" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Chamas</SelectItem>
                      <SelectItem value="ativa">🔥 Ativa</SelectItem>
                      <SelectItem value="tregua">🕊️ Trégua</SelectItem>
                      <SelectItem value="extinta">💀 Extinta</SelectItem>
                      <SelectItem value="normal">⚪ Normal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={adesaoFilter} onValueChange={setAdesaoFilter}>
                    <SelectTrigger className="w-[140px] bg-background border-border"><SelectValue placeholder="Adesão" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Adesões</SelectItem>
                      <SelectItem value="baixa">Baixa (0-50%)</SelectItem>
                      <SelectItem value="media">Média (50-85%)</SelectItem>
                      <SelectItem value="alta">Alta (85%+)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button variant="outline" size="icon" onClick={() => setSortOrder(p => p === "newest" ? "oldest" : "newest")} className="border-border">
                {sortOrder === "newest" ? <ChevronDown size={18} /> : <Eye size={18} />}
              </Button>
            </div>
            <CardContent className="p-0">
              {alunoSubTab === "comercial" ? (
                /* ── Comercial / Recuperação ── */
                <>
                  <div className="p-4 border-b border-border bg-accent/5 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {alunosPendentes.length + funnelLeads.length} leads sem pagamento confirmado — repescagem comercial
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Usuários que fizeram o pré-cadastro e foram até a tela de pagamento, mas <strong>não concluíram o pagamento</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={async () => {
                          try {
                            toast.info("Sincronizando pendentes...");
                            const { data, error } = await supabase.functions.invoke("sync-pending-users");
                            if (error) throw error;
                            toast.success(data?.message || `${data?.activated} usuário(s) ativado(s)!`);
                            fetchAlunos(); fetchFunnelLeads();
                          } catch (err: any) {
                            toast.error("Erro: " + (err.message || "Falha na sincronização"));
                          }
                        }}
                        variant="default"
                        size="sm"
                        className="gap-2"
                        disabled={alunosPendentes.length === 0}
                      >
                        <Filter size={14} /> Sincronizar Pendentes
                      </Button>
                      <Button
                        onClick={handleExportPendentesCSV}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={alunosPendentes.length === 0}
                      >
                        <Download size={14} /> Exportar Leads (CSV)
                      </Button>
                      <Button
                        onClick={() => setWhatsappModalOpen(true)}
                        variant="default"
                        size="sm"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={alunosPendentes.length === 0}
                      >
                        <MessageSquare size={14} /> Disparar Mensagens em Massa
                      </Button>
                    </div>

                  </div>
                  {(alunosPendentes.length === 0 && funnelLeads.length === 0) ? (
                    <div className="p-20 text-center text-muted-foreground">Nenhum lead para recuperação</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* Profiles pendentes sem pagamento */}
                      {alunosPendentes
                        .filter(a => !search || 
                          a.nome?.toLowerCase().includes(search.toLowerCase()) || 
                          a.email?.toLowerCase().includes(search.toLowerCase()) ||
                          a.telefone?.includes(search)
                        )
                        .map((aluno) => (
                        <div key={aluno.id}>
                          <div
                            className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/10 transition-colors cursor-pointer"
                            onClick={() => setExpandedUser(expandedUser === aluno.id ? null : aluno.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">
                                {aluno.nome?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{aluno.nome || "Sem nome"}</p>
                                <p className="text-xs text-muted-foreground">{aluno.email}</p>
                                {aluno.telefone && <p className="text-xs text-muted-foreground">{aluno.telefone}</p>}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              <Badge className="bg-accent/20 text-accent-foreground capitalize">Não pagou</Badge>
                              <Badge variant="outline" className="text-[10px]">Perfil criado</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(aluno.created_at).toLocaleDateString("pt-BR")}
                              </span>
                              <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", expandedUser === aluno.id && "rotate-180")} />
                            </div>
                          </div>
                          {expandedUser === aluno.id && (
                            <div className="px-6 pb-5 space-y-4 bg-secondary/5 border-t border-border">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4">
                                <Field label="Nome completo" value={aluno.nome || "—"} />
                                <Field label="E-mail" value={aluno.email || "—"} />
                                <Field label="Telefone" value={aluno.telefone || "—"} />
                                <Field label="CPF" value={aluno.cpf || "—"} />
                                <Field label="Data de cadastro" value={new Date(aluno.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} />
                                <Field label="Status" value={aluno.status} />
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2 items-end">
                                <div className="flex-1 min-w-[200px] space-y-1.5">
                                  <Label className="text-xs">Plano para ativação manual</Label>
                                  <Select value={editPlanId} onValueChange={setEditPlanId}>
                                    <SelectTrigger className="bg-background border-border">
                                      <SelectValue placeholder="Selecione o plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {plans.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} — R$ {p.price.toFixed(2)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  className="gap-2"
                                  disabled={!editPlanId || editPlanId === "none" || savingEdit}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setSavingEdit(true);
                                    try {
                                      const { data: { session } } = await supabase.auth.getSession();
                                      if (!session) throw new Error("Sessão expirada");
                                      const res = await supabase.functions.invoke("admin-edit-user", {
                                        body: { user_id: aluno.id, status: "ativo", subscription_plan_id: editPlanId },
                                      });
                                      if (res.error) throw new Error(res.error.message);
                                      const result = res.data as any;
                                      if (result?.error) throw new Error(result.error);
                                      toast.success(`Usuário ${aluno.nome || aluno.email} ativado com sucesso!`);
                                      setExpandedUser(null);
                                      setEditPlanId("");
                                      fetchAlunos();
                                    } catch (err: any) {
                                      toast.error(err.message || "Erro ao ativar usuário");
                                    } finally {
                                      setSavingEdit(false);
                                    }
                                  }}
                                >
                                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                  Ativar Manualmente
                                </Button>
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(aluno); }} className="gap-1.5">
                                  <Edit3 size={14} /> Editar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Funnel leads (sem perfil criado ainda) */}
                      {funnelLeads
                        .filter(l => !search || 
                          l.nome?.toLowerCase().includes(search.toLowerCase()) || 
                          l.email?.toLowerCase().includes(search.toLowerCase()) ||
                          l.telefone?.includes(search)
                        )
                        .map((lead) => (
                        <div key={`lead-${lead.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">
                              {lead.nome?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{lead.nome || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                              {lead.telefone && <p className="text-xs text-muted-foreground">{lead.telefone}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge className="bg-muted text-muted-foreground capitalize">Lead</Badge>
                            {lead.cupom && <Badge variant="outline" className="text-[10px]">🎟 {lead.cupom}</Badge>}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLeadModal(lead)}>
                              <Edit3 size={14} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 size={14} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir lead "{lead.nome}"?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação é irreversível.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteLead(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : alunoSubTab === "nao_alunos" ? (
                /* ── Pré-cadastro: Pagaram mas não foram ativados ── */
                <>
                  <div className="p-4 border-b border-border bg-destructive/5 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        ⚠️ {alunosPagosNaoAtivados.length} usuário(s) pagaram mas <strong>não foram ativados</strong> automaticamente
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Estes usuários completaram o pagamento, mas por falha no webhook ou timing, o sistema não os ativou. Verifique o motivo e ative manualmente.
                      </p>
                    </div>
                    <Button
                      onClick={handleAuditRepair}
                      disabled={auditing}
                      variant="outline"
                      className="gap-2"
                      size="sm"
                    >
                      {auditing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {auditing ? "Auditando..." : "Auditar e Reparar"}
                    </Button>
                  </div>
                  {loadingAlunos ? (
                    <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary mb-4" size={40} /><p className="text-muted-foreground">Carregando...</p></div>
                  ) : alunosPagosNaoAtivados.length === 0 ? (
                    <div className="p-20 text-center text-muted-foreground">✅ Nenhum usuário com pagamento pendente de ativação</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {alunosPagosNaoAtivados
                        .filter(a => !search || 
                          a.nome?.toLowerCase().includes(search.toLowerCase()) || 
                          a.email?.toLowerCase().includes(search.toLowerCase()) ||
                          a.telefone?.includes(search)
                        )
                        .map((aluno) => {
                        const evidence = paymentEvidence[aluno.id];
                        return (
                          <div key={aluno.id}>
                            <div
                              className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/10 transition-colors cursor-pointer"
                              onClick={() => setExpandedUser(expandedUser === aluno.id ? null : aluno.id)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-bold shrink-0">
                                  {aluno.nome?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{aluno.nome || "Sem nome"}</p>
                                  <p className="text-xs text-muted-foreground">{aluno.email}</p>
                                  {aluno.telefone && <p className="text-xs text-muted-foreground">{aluno.telefone}</p>}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                <Badge className="bg-destructive/20 text-destructive">💰 Pagou — Não ativado</Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(aluno.created_at).toLocaleDateString("pt-BR")}
                                </span>
                                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", expandedUser === aluno.id && "rotate-180")} />
                              </div>
                            </div>
                            {expandedUser === aluno.id && (
                              <div className="px-6 pb-5 space-y-4 bg-secondary/5 border-t border-border">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4">
                                  <Field label="Nome completo" value={aluno.nome || "—"} />
                                  <Field label="E-mail" value={aluno.email || "—"} />
                                  <Field label="Telefone" value={aluno.telefone || "—"} />
                                  <Field label="CPF" value={aluno.cpf || "—"} />
                                  <Field label="Data de cadastro" value={new Date(aluno.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} />
                                  <Field label="Status atual" value={aluno.status} />
                                </div>
                                {/* Motivo da falha */}
                                {evidence && (
                                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                                    <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                                      ⚠️ Motivo da não ativação automática:
                                    </p>
                                    <p className="text-sm text-foreground">{evidence.reason}</p>
                                    {evidence.details && (
                                      <p className="text-xs text-muted-foreground">{evidence.details}</p>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2 items-end">
                                  <div className="flex-1 min-w-[200px] space-y-1.5">
                                    <Label className="text-xs">Plano para ativação</Label>
                                    <Select value={editPlanId} onValueChange={setEditPlanId}>
                                      <SelectTrigger className="bg-background border-border">
                                        <SelectValue placeholder="Selecione o plano" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {plans.map(p => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name} — R$ {p.price.toFixed(2)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    className="gap-2"
                                    disabled={!editPlanId || editPlanId === "none" || savingEdit}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setSavingEdit(true);
                                      try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        if (!session) throw new Error("Sessão expirada");
                                        const res = await supabase.functions.invoke("admin-edit-user", {
                                          body: { user_id: aluno.id, status: "ativo", subscription_plan_id: editPlanId },
                                        });
                                        if (res.error) throw new Error(res.error.message);
                                        const result = res.data as any;
                                        if (result?.error) throw new Error(result.error);
                                        toast.success(`Usuário ${aluno.nome || aluno.email} ativado com sucesso!`);
                                        setExpandedUser(null);
                                        setEditPlanId("");
                                        fetchAlunos();
                                      } catch (err: any) {
                                        toast.error(err.message || "Erro ao ativar usuário");
                                      } finally {
                                        setSavingEdit(false);
                                      }
                                    }}
                                  >
                                    {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Ativar Usuário
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
              /* ── Alunos ativos (profiles) ── */
              <>
                <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {alunosAtivos.length} aluno(s) ativo(s)
                  </p>
                  <Button
                    onClick={() => setWhatsappAtivosModalOpen(true)}
                    variant="default"
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={alunosAtivos.length === 0}
                  >
                    <MessageSquare size={14} /> Disparar Mensagens em Massa
                  </Button>
                </div>
              {loadingAlunos ? (
                <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary mb-4" size={40} /><p className="text-muted-foreground">Carregando alunos...</p></div>
              ) : alunosAtivos.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">Nenhum aluno ativo encontrado</div>
              ) : (
                <div className="divide-y divide-border">
                  {paginatedAtivos.map((aluno) => {
                    const isExpanded = expandedUser === aluno.id;
                    const spec = specialistMap[aluno.id];
                    const flame = flameMap[aluno.id];
                    return (
                      <div key={aluno.id} className="hover:bg-secondary/10 transition-colors">
                        <button
                          className="p-4 w-full text-left flex items-center justify-between gap-4"
                          onClick={() => setExpandedUser(isExpanded ? null : aluno.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold shrink-0">
                              {aluno.nome?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{aluno.nome || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{aluno.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge className={cn("capitalize", statusColor[mapStatus(aluno.status)] || "bg-secondary")}>
                              {mapStatus(aluno.status)}
                            </Badge>
                            {flame && (
                              <span className="text-xs">
                                {flame.state === "ativa" ? "🔥" : flame.state === "tregua" ? "🕊️" : flame.state === "extinta" ? "💀" : "⚪"}
                              </span>
                            )}
                            <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 bg-secondary/5">
                            {/* Dados pessoais */}
                            <SectionBlock icon={User} title="Dados Pessoais">
                              <Field label="Nome" value={aluno.nome || "—"} />
                              <Field label="Email" value={aluno.email || "—"} />
                              <Field label="Telefone" value={aluno.telefone || "—"} />
                              <Field label="CPF" value={aluno.cpf || "—"} />
                              <Field label="Nascimento" value={aluno.nascimento || "—"} />
                              <Field label="Sexo" value={aluno.sexo || "—"} />
                              <Field label="Cidade/Estado" value={aluno.cidade_estado || "—"} />
                            </SectionBlock>

                            {/* Removed: Dados Físicos and Especialistas blocks */}

                            {/* Chama & Adesão */}
                            {flame && (
                              <SectionBlock icon={Flame} title="Engajamento">
                                <Field label="Chama" value={
                                  flame.state === "ativa" ? "🔥 Ativa" : flame.state === "tregua" ? "🕊️ Trégua" : flame.state === "extinta" ? "💀 Extinta" : "⚪ Normal"
                                } />
                                <Field label="Adesão Semanal" value={`${flame.adherence}%`} />
                              </SectionBlock>
                            )}

                            {/* Plano / Assinatura */}
                            <SectionBlock icon={ShieldCheck} title="Plano de Assinatura">
                              <div className="col-span-2">
                                {userSubs[aluno.id] ? (
                                  <p className="text-sm font-medium text-foreground">
                                    {plans.find(p => p.id === userSubs[aluno.id])?.name || "Plano vinculado"}{" "}
                                    <span className="text-muted-foreground">
                                      (R$ {plans.find(p => p.id === userSubs[aluno.id])?.price?.toFixed(2) || "—"})
                                    </span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Nenhum plano vinculado</p>
                                )}
                              </div>
                            </SectionBlock>

                            {/* Status e datas */}
                            <SectionBlock icon={CheckCircle2} title="Cadastro">
                              <Field label="Status" value={aluno.status} />
                              <Field label="Onboarded" value={aluno.onboarded ? "Sim" : "Não"} />
                              <Field label="Cadastro em" value={new Date(aluno.created_at).toLocaleDateString("pt-BR")} />
                              <Field label="Hustle Points" value={aluno.hustle_points ?? 0} />
                            </SectionBlock>

                            {/* Grupo / Turma */}
                            <SectionBlock icon={Users} title="Grupo / Turma">
                              <div className="col-span-2">
                                <Select
                                  value={aluno.group_id || "none"}
                                  onValueChange={(v) => handleSetUserGroup(aluno.id, v === "none" ? null : v)}
                                >
                                  <SelectTrigger className="bg-background border-border w-full">
                                    <SelectValue placeholder="Sem grupo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem grupo</SelectItem>
                                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </SectionBlock>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(aluno); }} className="gap-1.5">
                                <Edit3 size={14} /> Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 size={14} /> Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir usuário "{aluno.full_name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Essa ação é irreversível. O usuário será removido do sistema de autenticação, perfil e todas as assinaturas serão apagadas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(aluno.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingUserId === aluno.id ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                                      Excluir Permanentemente
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {alunoSubTab === "ativos" && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((currentPage - 1) * USERS_PAGE_SIZE) + 1}–{Math.min(currentPage * USERS_PAGE_SIZE, alunosAtivos.length)} de {alunosAtivos.length}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                    <span className="text-sm text-muted-foreground flex items-center px-2">{currentPage}/{totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próximo</Button>
                  </div>
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="grupos" className="space-y-4">
          {!selectedGroupId ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-foreground text-lg">Gerenciar Grupos / Turmas</h3>
                <p className="text-sm text-muted-foreground">Crie grupos e clique neles para gerenciar alunos e desafios vinculados.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do novo grupo (ex: Turma de Abril)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="bg-background border-border"
                  />
                  <Button onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
                    {creatingGroup ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span className="ml-1">Criar</span>
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {groups.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">Nenhum grupo criado ainda.</p>
                  ) : groups.map(g => {
                    const memberCount = alunos.filter(a => a.group_id === g.id).length;
                    return (
                      <div
                        key={g.id}
                        className="py-4 px-2 flex items-center justify-between cursor-pointer rounded-lg hover:bg-muted/50 transition-colors group/item"
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users size={18} className="text-primary" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground">{g.name}</span>
                            <p className="text-xs text-muted-foreground">{memberCount} aluno{memberCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <Eye size={16} className="mr-1" /> Abrir
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir grupo "{g.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>Os alunos desse grupo ficarão sem grupo. Desafios vinculados passarão a ser visíveis para todos.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteGroup(g.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <GroupDetailPanel
              group={groups.find(g => g.id === selectedGroupId)!}
              allAlunos={alunos}
              onBack={() => setSelectedGroupId(null)}
              onMemberChange={() => { fetchAlunos(); fetchGroups(); }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Atribuir Especialistas</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Aluno: <span className="text-foreground font-bold">{assignStudentName}</span></p>
            <div className="space-y-2">
              <Label>Personal Trainer</Label>
              <Select value={selectedPersonal} onValueChange={setSelectedPersonal}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o personal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {personalList.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nutricionista</Label>
              <Select value={selectedNutri} onValueChange={setSelectedNutri}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o nutricionista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {nutriList.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleAssignSpecialist} disabled={assigning}>
              {assigning ? "Atribuindo..." : "Salvar Atribuições"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo*</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                className="bg-background border-border"
                placeholder="Ex: Maria Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>Email*</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setField("email", e.target.value)}
                className="bg-background border-border"
                placeholder="Ex: maria@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária*</Label>
              <Input
                type="text"
                value={newUser.password}
                onChange={(e) => setField("password", e.target.value)}
                className="bg-background border-border"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone (Opcional)</Label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="bg-background border-border"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Plano Adquirido</Label>
                <Select value={newUser.plano} onValueChange={(val) => setField("plano", val === "none" ? "" : val)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleCreateUser} disabled={creating}>
              {creating ? "Criando..." : "Criar Aluno"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Status de Acesso</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">✅ Ativo</SelectItem>
                    <SelectItem value="inativo">🚫 Inativo</SelectItem>
                    <SelectItem value="cancelado">❌ Cancelado</SelectItem>
                    <SelectItem value="pendente">⏳ Pendente</SelectItem>
                    <SelectItem value="pendente_onboarding">📋 Pendente Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano de Assinatura</Label>
                <Select value={editPlanId} onValueChange={setEditPlanId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Flame size={14} className="text-primary" /> Dias de Chama (Streak)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editFlameStreak}
                  onChange={(e) => setEditFlameStreak(e.target.value)}
                  className="bg-background border-border"
                  placeholder="Ex: 15"
                />
                <p className="text-[10px] text-muted-foreground">Define manualmente os dias ativos da chama desta aluna.</p>
              </div>
              <Button className="w-full" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} className="animate-spin mr-2" /> Salvando...</> : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={editLeadOpen} onOpenChange={setEditLeadOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editLead && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editLeadFullName} onChange={(e) => setEditLeadFullName(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editLeadEmail} onChange={(e) => setEditLeadEmail(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={editLeadPhone} onChange={(e) => setEditLeadPhone(e.target.value)} className="bg-background border-border" />
              </div>
              <Button className="w-full" onClick={handleSaveLeadEdit} disabled={savingLead}>
                {savingLead ? <><Loader2 size={14} className="animate-spin mr-2" /> Salvando...</> : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentConciliationModal open={conciliationOpen} onOpenChange={setConciliationOpen} />
      <WhatsAppBulkModal
        open={whatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
        leads={[
          ...alunosPendentes.map((a) => ({ id: a.id, full_name: a.full_name, email: a.email, phone: a.phone })),
          ...funnelLeads.map((l) => ({ id: l.id, full_name: l.nome, email: l.email, phone: l.telefone })),
        ]}
      />
      <WhatsAppBulkModal
        open={whatsappAtivosModalOpen}
        onOpenChange={setWhatsappAtivosModalOpen}
        leads={alunosAtivos.map((a) => ({ id: a.id, full_name: a.full_name, email: a.email, phone: a.phone }))}
      />
    </div>
  );
};

export default function AdminUsuariosWithBoundary() {
  return (
    <ErrorBoundary>
      <AdminUsuarios />
    </ErrorBoundary>
  );
}

/**
 * @purpose Modal de boas-vindas exibido no primeiro login da aluna.
 * @dependencies shadcn Dialog, controlado pelo Dashboard via profile.onboarded.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Dumbbell, UtensilsCrossed, Trophy, Users } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onConfirm: () => Promise<void>;
}

export default function WelcomeModal({ open, onConfirm }: WelcomeModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-2xl font-bold text-center">
          Bem-vinda ao ANAAC Club! 🎯
        </DialogTitle>
        <DialogDescription className="text-center text-base text-muted-foreground">
          Esse é o seu ponto de partida. Aqui você vai encontrar tudo que precisa
          pra manter a rotina:
        </DialogDescription>

        <ul className="space-y-3 py-2">
          <li className="flex items-center gap-3 text-sm text-foreground">
            <Flame className="h-5 w-5 text-accent shrink-0" />
            <span>Sua chama diária — não pode apagar!</span>
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground">
            <Dumbbell className="h-5 w-5 text-accent shrink-0" />
            <span>Seus treinos personalizados</span>
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground">
            <UtensilsCrossed className="h-5 w-5 text-accent shrink-0" />
            <span>Sua dieta e checklist diário</span>
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground">
            <Trophy className="h-5 w-5 text-accent shrink-0" />
            <span>O desafio de 21 dias</span>
          </li>
          <li className="flex items-center gap-3 text-sm text-foreground">
            <Users className="h-5 w-5 text-accent shrink-0" />
            <span>A comunidade de alunas</span>
          </li>
        </ul>

        <Button
          size="lg"
          className="w-full mt-2"
          onClick={handleClick}
          disabled={submitting}
        >
          {submitting ? "Carregando..." : "Entendi, vamos começar!"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
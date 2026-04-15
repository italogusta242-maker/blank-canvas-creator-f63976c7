import React from "react";
import { Megaphone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SendNowTab from "@/components/admin/notifications/SendNowTab";
import ScheduleTab from "@/components/admin/notifications/ScheduleTab";
import TemplatePoolTab from "@/components/admin/notifications/TemplatePoolTab";
import HistoryTab from "@/components/admin/notifications/HistoryTab";

export default function AdminAvisos() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-cinzel tracking-tight flex items-center gap-3">
          <Megaphone className="text-accent" /> Central de Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie, agende e gerencie notificações para suas alunas.
        </p>
      </div>

      <Tabs defaultValue="send-now" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="send-now">📢 Enviar Agora</TabsTrigger>
          <TabsTrigger value="schedule">⏰ Agendar</TabsTrigger>
          <TabsTrigger value="pool">🎲 Banco de Mensagens</TabsTrigger>
          <TabsTrigger value="history">📋 Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="send-now">
          <SendNowTab />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>

        <TabsContent value="pool">
          <TemplatePoolTab />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

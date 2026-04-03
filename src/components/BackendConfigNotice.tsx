const BackendConfigNotice = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">Configuração local</p>
          <h1 className="text-3xl font-semibold text-foreground">O app não ficou em branco: faltam as variáveis do backend no localhost.</h1>
          <p className="text-base text-muted-foreground">
            Para rodar localmente, crie um arquivo <code className="rounded bg-muted px-2 py-1 text-foreground">.env.local</code> na raiz com estas chaves.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-muted/40 p-4 overflow-x-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap break-all">{`VITE_SUPABASE_URL=sua_url_do_backend\nVITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_backend`}</pre>
        </div>

        <p className="text-sm text-muted-foreground">
          Depois reinicie o comando <code className="rounded bg-muted px-2 py-1 text-foreground">npm run dev</code>. Assim o projeto abre com a tela de login em vez de falhar silenciosamente.
        </p>
      </section>
    </main>
  );
};

export default BackendConfigNotice;
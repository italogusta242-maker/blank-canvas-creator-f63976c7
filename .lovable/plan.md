

A aluna mostrou um card "CHAMA CONGELADA" azul com fundo xadrez (transparente). Esse card é o **sticker compartilhável de "Dias Ativos"** (figurinha gerada via html2canvas) na página de Treinos — não o card normal da chama no Dashboard.

Vou localizar o componente.

Pelo contexto da memória `mem://features/active-days-sticker`: "The 'Active Days' sticker is a shareable PNG generated via html2canvas from the Training page". O componente é `src/components/ActiveDaysSticker.tsx`.

A regra do usuário agora: **só deve existir o estado "ativo"** no sticker — remover o variant azul "CHAMA CONGELADA".

Preciso ver o componente para entender como ele decide a cor/label.

<lov-plan>

## Diagnóstico

O card azul "CHAMA CONGELADA" que apareceu no print da aluna **não é o card do Dashboard** — é a **figurinha compartilhável** (`ActiveDaysSticker.tsx`) que aparece na página de **Treinos** quando a aluna toca em "Sua Figurinha 🔥".

Hoje o sticker tem 2 variantes visuais:
- 🔥 **CHAMA ATIVA** (laranja) — quando postou hoje/ontem
- 🧊 **CHAMA CONGELADA** (azul) — quando não postou nas últimas 24h

A aluna ficou confusa porque viu "CONGELADA" e "6 dias" no mesmo card, sem entender que o número está preservado (a regra "nunca zera, só congela" funciona, mas o visual passa uma mensagem negativa).

## O que vou fazer

**Forçar o sticker a sempre exibir o estado "ATIVA" (laranja, "CHAMA ATIVA")**, independentemente de a chama estar congelada ou não. O número de dias continua sendo o real (6, 9, etc).

Justificativa: a figurinha é uma peça de **celebração/orgulho** para compartilhar no Instagram/WhatsApp. Não faz sentido mostrar "CONGELADA" em um sticker que a aluna vai postar — ela só vai compartilhar quando estiver orgulhosa do número.

A lógica de **frozen/ativa continua existindo no Dashboard** (card principal da chama) — onde faz sentido mostrar o estado real para incentivar a aluna a postar de novo.

## Mudança técnica

| Arquivo | Mudança |
|---|---|
| `src/components/ActiveDaysSticker.tsx` | Remover branch visual "frozen" (azul). Sempre renderizar variante laranja "CHAMA ATIVA" com o `streak` real. |

Sem mudança em hooks, sem mudança no Dashboard, sem mudança na lógica do banco. Só o componente do sticker.

## Comunicação para a aluna

Depois da correção, você pode responder pra Karol algo como:
> "Karol, o card foi atualizado! Sua chama tem **6 dias ativos** (você postou em 6 dias diferentes na comunidade desde 08/04). Posta hoje pra continuar somando 🔥"


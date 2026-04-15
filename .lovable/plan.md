

## Plano: Criar Mensagens no Banco de Mensagens

Inserir 12 templates de notificação na tabela `notification_templates`, distribuídos em 4 categorias.

### Mensagens a criar

**Motivacional (4)**
1. "🔥 Bora treinar!" / "Seu corpo agradece cada repetição. Levanta e vai!"
2. "💪 Você é mais forte do que pensa" / "Lembre-se: disciplina supera motivação. Hoje é dia de vencer!"
3. "🏆 Campeãs não descansam" / "Cada treino te aproxima do seu objetivo. Não pare agora!"
4. "⚡ Energia no máximo!" / "O treino de hoje é o investimento no corpo de amanhã."

**Lembrete (3)**
1. "⏰ Hora do treino!" / "Não deixe pra depois. Seu treino de hoje está te esperando!"
2. "💧 Já bebeu água hoje?" / "Hidratação é essencial. Bora bater a meta de água!"
3. "📸 Registre seu progresso" / "Tire uma foto e acompanhe sua evolução. Você vai se surpreender!"

**Engajamento (3)**
1. "🎯 Confira seu ranking" / "Veja como você está no desafio! Sua posição pode te surpreender."
2. "👥 A comunidade te espera" / "Compartilhe seu treino e inspire outras guerreiras!"
3. "🏅 Seus pontos estão subindo!" / "Continue assim e conquiste o topo do ranking!"

**Geral (2)**
1. "📢 Novidades no app!" / "Temos atualizações que vão turbinar sua experiência. Confira!"
2. "❤️ Estamos com você" / "Qualquer dúvida, fale com a gente. Sua jornada importa pra nós!"

### Execução

Uma única query SQL `INSERT INTO notification_templates (title, body, category)` com os 12 registros.


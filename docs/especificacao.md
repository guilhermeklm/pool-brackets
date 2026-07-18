# Especificação — PoolBrackets (App de Campeonato de Sinuca)

> **Nome do app:** PoolBrackets · **slug:** `pool-brackets`
> **Versão do documento:** 1.0
> **Escopo:** v1 (controle em um único celular, offline)
> **Última atualização:** 2026-07-18

---

## 1. Visão geral

Aplicativo web (PWA) para organizar campeonatos de sinuca **individuais** ou de **duplas**, controlado por um único celular, funcionando **offline**. O organizador cadastra os times (com foto tirada na hora), o app sorteia o chaveamento, o organizador registra os resultados manualmente e o app cuida do bolão (aposta em dinheiro) de forma transparente.

### Conceitos

- **Time / Participante:** unidade que joga. No modo *individual* tem 1 jogador (o nome do time é o nome do jogador); no modo *dupla* tem 2 jogadores e um nome de time.
- **Partida:** confronto entre dois lados. Sempre há um vencedor (não há empate).
- **Chaveamento:** eliminatória simples com sorteio aleatório. Quem perde está fora.
- **Melhor de:** partidas comuns são **melhor de 1**; **a final é melhor de 3**.
- **Bolão:** pote único formado pelas entradas dos times; o campeão leva o prêmio. O app apenas registra o dinheiro (não o movimenta na v1).

---

## 2. Cenários de tela (BDD / Gherkin)

> Notação: `Dado` (contexto) · `Quando` (ação) · `Então` (resultado esperado) · `E` (continuação).

### Funcionalidade: Criar campeonato

```gherkin
Funcionalidade: Criar um novo campeonato
  Como organizador
  Quero criar um campeonato definindo tipo e aposta
  Para começar a cadastrar os times

  Cenário: Criar campeonato individual sem aposta
    Dado que estou na tela inicial
    Quando toco em "Novo campeonato"
    E informo o nome "Rachão da Sexta"
    E seleciono o tipo "Individual"
    E deixo a aposta desativada
    E confirmo a criação
    Então o campeonato é criado com status "Inscrições"
    E sou levado para a tela de cadastro de participantes

  Cenário: Criar campeonato de duplas com aposta
    Dado que estou na tela "Novo campeonato"
    Quando informo o nome "Torneio de Duplas"
    E seleciono o tipo "Dupla"
    E ativo a aposta
    E informo o valor da entrada como "R$ 20,00"
    E confirmo a criação
    Então o campeonato é criado com a aposta ativa e entrada de R$ 20,00
    E o painel do bolão passa a ficar disponível

  Cenário: Impedir criação sem nome
    Dado que estou na tela "Novo campeonato"
    Quando deixo o nome em branco
    E tento confirmar a criação
    Então vejo uma mensagem pedindo o nome do campeonato
    E o campeonato não é criado
```

### Funcionalidade: Cadastro de time com foto

```gherkin
Funcionalidade: Cadastrar time com foto
  Como organizador
  Quero cadastrar cada time com nome e foto
  Para identificar os participantes durante o campeonato

  Cenário: Cadastrar participante individual com foto
    Dado que o campeonato é do tipo "Individual"
    E estou na tela de cadastro
    Quando informo o nome "João"
    E toco em "Tirar foto"
    E a câmera abre e capturo a foto
    E confirmo o cadastro
    Então o participante "João" aparece na lista com sua foto

  Cenário: Cadastrar dupla com nome do time e foto do time
    Dado que o campeonato é do tipo "Dupla"
    E estou na tela de cadastro
    Quando informo o nome do time "Trio do Taco"
    E informo o jogador 1 "Ana"
    E informo o jogador 2 "Beto"
    E toco em "Tirar foto" e capturo uma única foto do time
    E confirmo o cadastro
    Então o time "Trio do Taco" aparece na lista com sua foto

  Cenário: Refazer a foto antes de confirmar
    Dado que capturei uma foto no cadastro
    Quando toco em "Refazer foto"
    E a câmera abre novamente
    E capturo uma nova foto
    Então a nova foto substitui a anterior

  Cenário: Câmera indisponível
    Dado que o navegador não tem acesso à câmera
    Quando toco em "Tirar foto"
    Então vejo uma mensagem explicando que a câmera não está disponível
    E posso continuar o cadastro sem foto (foto opcional nesse caso)

  Cenário: Remover um time antes do sorteio
    Dado que existem times cadastrados
    E o sorteio ainda não foi feito
    Quando removo o time "Zé & Mano"
    Então o time some da lista
    E o total de inscritos é atualizado
```

### Funcionalidade: Controle de pagamento (Pago / Pendente)

```gherkin
Funcionalidade: Controlar o pagamento das entradas
  Como organizador
  Quero marcar quem pagou a entrada
  Para saber quanto já entrou no bolão e quem ainda deve

  Contexto:
    Dado que a aposta está ativa com entrada de R$ 20,00

  Cenário: Novo time começa como Pendente
    Quando cadastro o time "Os Bambas"
    Então o status de pagamento do time é "Pendente"

  Cenário: Marcar como Pago
    Dado que o time "Os Bambas" está "Pendente"
    Quando toco no status de pagamento do time
    Então o status muda para "Pago"
    E o valor arrecadado aumenta em R$ 20,00

  Cenário: Reverter para Pendente
    Dado que o time "Os Bambas" está "Pago"
    Quando toco no status de pagamento do time
    Então o status volta para "Pendente"
    E o valor arrecadado diminui em R$ 20,00
```

### Funcionalidade: Sorteio do chaveamento

```gherkin
Funcionalidade: Sortear o chaveamento
  Como organizador
  Quero sortear a chave aleatoriamente
  Para iniciar o campeonato de forma imparcial

  Cenário: Sortear com número potência de 2
    Dado que há 8 times cadastrados
    Quando toco em "Sortear chave"
    Então os times são embaralhados aleatoriamente
    E é gerada uma eliminatória simples com 4 partidas na 1ª rodada
    E o campeonato muda para o status "Em andamento"

  Cenário: Sortear com número que não é potência de 2 (BYE)
    Dado que há 6 times cadastrados
    Quando toco em "Sortear chave"
    Então a chave é montada para 8 posições
    E 2 times recebem "BYE" e avançam direto para a 2ª rodada
    E os outros 4 times jogam a 1ª rodada

  Cenário: Bloquear sorteio com menos de 2 times
    Dado que há apenas 1 time cadastrado
    Quando tento sortear a chave
    Então vejo uma mensagem informando que são necessários ao menos 2 times
    E o sorteio não acontece

  Cenário: Confirmar antes de re-sortear
    Dado que a chave já foi sorteada e há resultados registrados
    Quando toco em "Sortear chave" novamente
    Então vejo um aviso de que os resultados serão perdidos
    E o sorteio só refaz a chave se eu confirmar
```

### Funcionalidade: Visualizar chaveamento

```gherkin
Funcionalidade: Visualizar o chaveamento
  Como organizador
  Quero ver a árvore do campeonato
  Para acompanhar o andamento e acessar as partidas

  Cenário: Ver a chave completa
    Dado que a chave foi sorteada
    Quando abro a tela de chaveamento
    Então vejo todas as rodadas até a final
    E cada confronto mostra os nomes (e fotos) dos lados
    E os "BYE" aparecem indicados

  Cenário: Identificar a partida atual
    Dado que estou na tela de chaveamento
    Quando há partidas ainda não decididas
    Então as partidas prontas para jogar ficam destacadas como "disponíveis"
    E as partidas que dependem de resultados anteriores aparecem como "aguardando"
```

### Funcionalidade: Registrar resultado (melhor de 1)

```gherkin
Funcionalidade: Registrar o resultado de uma partida comum
  Como organizador
  Quero registrar quem venceu
  Para avançar o campeonato

  Cenário: Confirmar vencedor em melhor de 1
    Dado que abro uma partida da 1ª rodada entre "João" e "Beto"
    Quando toco em "João venceu"
    Então "João" é marcado como vencedor da partida
    E é exibida a animação de vitória
    E "João" avança automaticamente para a próxima rodada
    E "Beto" é eliminado

  Cenário: Corrigir um resultado registrado por engano
    Dado que registrei "João" como vencedor por engano
    E a próxima partida dele ainda não foi jogada
    Quando reabro a partida e altero o vencedor para "Beto"
    Então "Beto" passa a avançar no lugar de "João"
    E o chaveamento é atualizado
```

### Funcionalidade: Final em melhor de 3

```gherkin
Funcionalidade: Registrar a final em melhor de 3
  Como organizador
  Quero registrar as partidas da final
  Para que o campeão seja quem vencer 2 partidas

  Cenário: Campeão vence por 2 a 0
    Dado que estou na final entre "Ana" e "João"
    Quando registro que "Ana" venceu a 1ª partida
    E registro que "Ana" venceu a 2ª partida
    Então "Ana" é declarada campeã (2 a 0)
    E é exibida a animação de vitória do campeão

  Cenário: Campeão vence por 2 a 1
    Dado que estou na final entre "Ana" e "João"
    E "Ana" venceu a 1ª partida
    E "João" venceu a 2ª partida
    Quando registro que "Ana" venceu a 3ª partida
    Então "Ana" é declarada campeã (2 a 1)

  Cenário: Final ainda em aberto
    Dado que na final "Ana" venceu apenas 1 partida
    Quando abro a final
    Então vejo o placar parcial "1 a 0" para Ana
    E a final continua em andamento até alguém chegar a 2 vitórias
```

### Funcionalidade: Animação de vitória

```gherkin
Funcionalidade: Animação de vitória
  Como organizador
  Quero uma animação sempre que confirmo um vencedor
  Para dar emoção ao momento

  Cenário: Animação a cada vitória confirmada
    Dado que confirmo o vencedor de qualquer partida
    Então uma animação de vitória (confete + destaque do vencedor) é exibida
    E a animação termina sozinha ou ao toque
    E volto para o chaveamento com o resultado já aplicado
```

### Funcionalidade: Painel do bolão

```gherkin
Funcionalidade: Painel do bolão
  Como organizador
  Quero ver o resumo financeiro do campeonato
  Para manter a aposta transparente

  Contexto:
    Dado que a aposta está ativa com entrada de R$ 20,00
    E há 6 times cadastrados, dos quais 4 estão "Pago"

  Cenário: Ver o resumo do bolão
    Quando abro o painel do bolão
    Então vejo o "Arrecadado" como R$ 80,00
    E vejo o "Pendente" como R$ 40,00
    E vejo o "Pote total previsto" como R$ 120,00
    E vejo o "Prêmio do campeão" como R$ 120,00
    E vejo a lista de quem ainda não pagou

  Cenário: Atualização em tempo real ao marcar pagamento
    Dado que estou vendo o painel do bolão
    Quando marco mais um time como "Pago"
    Então o "Arrecadado" aumenta em R$ 20,00
    E o "Pendente" diminui em R$ 20,00
```

### Funcionalidade: QR Code Pix (opcional, offline)

```gherkin
Funcionalidade: Gerar QR Code Pix do organizador
  Como organizador
  Quero exibir um QR Code Pix
  Para os jogadores pagarem a entrada por Pix

  Cenário: Configurar a chave Pix
    Dado que a aposta está ativa
    Quando informo a chave Pix do organizador
    Então o app passa a gerar um QR Code Pix com o valor da entrada

  Cenário: Jogador paga por Pix
    Dado que o QR Code Pix está sendo exibido
    Quando o jogador escaneia e paga
    E o organizador confirma o recebimento
    Então o organizador marca o time como "Pago"
    (Observação: na v1 o app não confirma o pagamento automaticamente)
```

### Funcionalidade: Finalização e campeão

```gherkin
Funcionalidade: Encerrar o campeonato
  Como organizador
  Quero ver o resultado final
  Para premiar o campeão

  Cenário: Exibir o campeão
    Dado que a final foi decidida
    Quando o campeonato é finalizado
    Então vejo a tela do campeão com nome e foto em destaque
    E vejo o valor do prêmio (se a aposta estiver ativa)
    E o campeonato muda para o status "Finalizado"
```

### Funcionalidade: Persistência offline

```gherkin
Funcionalidade: Funcionar offline e não perder dados
  Como organizador
  Quero usar o app sem internet e sem perder o andamento
  Para controlar o campeonato na mesa de sinuca

  Cenário: Continuar após fechar o app
    Dado que há um campeonato em andamento
    Quando fecho o app e abro novamente
    Então o campeonato, times, fotos e resultados continuam salvos

  Cenário: Usar sem conexão
    Dado que o celular está sem internet
    Quando uso qualquer funcionalidade do app
    Então tudo funciona normalmente (cadastro, sorteio, resultados, bolão)
```

### Funcionalidade: Backup (exportar / importar)

```gherkin
Funcionalidade: Exportar e importar o campeonato
  Como organizador
  Quero salvar e restaurar o campeonato em um arquivo
  Para não perder os dados ao trocar de celular

  Cenário: Exportar o campeonato
    Dado que há um campeonato salvo
    Quando toco em "Exportar"
    Então é gerado um arquivo JSON com times, fotos, chave, resultados e bolão

  Cenário: Importar um campeonato
    Dado que tenho um arquivo JSON exportado
    Quando toco em "Importar" e seleciono o arquivo
    Então o campeonato é restaurado exatamente como estava
```

---

## 3. Evoluções futuras (backlog)

Itens fora do escopo da v1, organizados por tema. A arquitetura da v1 já é preparada para não travar essas evoluções (ver seção 4).

### Multi-dispositivo e nuvem
- **API / backend** para sincronizar o campeonato entre vários celulares.
- **Tela pública/espectador:** link para a galera acompanhar a chave ao vivo.
- **Sincronização em tempo real** (ex: Supabase/Firebase) — vários organizadores ou telão.
- **Contas de usuário** e histórico de campeonatos por organizador.

### Formatos de competição
- **Disputa de 3º lugar.**
- **Fase de grupos + mata-mata.**
- **Dupla eliminatória** (chave de perdedores).
- **Configurar "melhor de"** por rodada (não só na final).
- **Cabeças de chave (seeding)** por ranking, em vez de 100% aleatório.

### Bolão / pagamentos
- **Divisão configurável do prêmio** (ex: 70% 1º, 20% 2º, 10% 3º).
- **Pix de verdade integrado** (cobrança e confirmação automática do pagamento).
- **Relatório financeiro** exportável do bolão.
- **Prêmio sobre arrecadado vs. previsto** configurável.

### Experiência
- **Mais animações/temas** de vitória.
- **Compartilhar a chave** como imagem.
- **Estatísticas** (quem mais venceu, histórico entre jogadores).
- **Som e vibração** nos momentos-chave.
- **Internacionalização (i18n)** — outros idiomas.
- **Modo TV/telão** para exibir a chave em uma tela grande.

---

## 4. Questões técnicas

### Stack escolhida
- **Vite + React + TypeScript + Tailwind CSS.**
- **PWA** (instalável e offline) via service worker + manifest.
- **IndexedDB** para persistência local (dados + fotos como *blobs*).
- Biblioteca leve de **confete** + animação CSS para a vitória.

### Decisões de arquitetura pensando no futuro
- **Camada de repositório trocável:** as telas conversam com uma interface (`Repositorio`) e não diretamente com o IndexedDB. Quando existir API, troca-se apenas a implementação por trás, sem mexer nas telas.
- **IDs em UUID gerados no cliente:** evita conflito de identificadores quando houver sincronização com backend.
- **Dados serializáveis em JSON limpo:** mapeiam diretamente para endpoints/tabelas no futuro.
- **Separação domínio × persistência × UI:** regras de chaveamento e bolão ficam em módulos puros (testáveis), independentes de React e do banco.

### Pontos de atenção / riscos
- **Armazenamento das fotos:** fotos podem ocupar espaço; comprimir/redimensionar no momento da captura para não estourar a cota do IndexedDB. Definir resolução-alvo (ex: máx. 1024px, JPEG ~0.7).
- **Permissão e disponibilidade da câmera:** tratar recusa de permissão, ausência de câmera e uso em `http` (câmera exige `https` ou `localhost`). Foto opcional como *fallback*.
- **Persistência não garantida pelo navegador:** solicitar *persistent storage* para reduzir risco de o SO limpar os dados; orientar o usuário a instalar a PWA.
- **Backup/restauração:** decidido para a v1 — exportar/importar o campeonato como arquivo JSON (mitiga perda de dados ao trocar de celular). Atenção ao tamanho por causa das fotos (usar JSON com imagens em base64 comprimidas).
- **Sorteio justo:** usar embaralhamento *Fisher–Yates* com fonte aleatória adequada.
- **Correção de resultados:** ao alterar um resultado já registrado, propagar/invalidar corretamente as partidas seguintes (impedir inconsistência na chave).
- **Concorrência (futuro):** com multi-dispositivo, definir estratégia de *merge*/última-escrita-vence e versionamento dos dados.

### Decisões tomadas
- **Foto na dupla:** uma **foto única do time** (não uma por jogador). Os dois nomes dos jogadores continuam sendo informados.
- **Backup:** **exportar/importar** o campeonato em JSON já na **v1** (mitiga perda de dados ao trocar de celular).
- **Limite de participantes:** suportar até **32 times** na v1 sem degradar a UI do chaveamento.
- **Prêmio do campeão:** calculado sobre o **pote previsto** (todos os inscritos). O painel do bolão exibe também o **arrecadado real** para transparência.
- **Nome/branding:** **PoolBrackets** (slug `pool-brackets`). Ícone da PWA a definir na construção.

### Perguntas em aberto (a decidir)
- Nenhuma pendência de escopo no momento.

---

## 5. Ordem de construção (milestones)

1. Setup do projeto (Vite + React + TS + Tailwind + PWA) e camada de dados (IndexedDB + repositório + UUIDs).
2. Criar campeonato + cadastro de times **com foto** (+ compressão da imagem).
3. Controle de pagamento (Pago/Pendente) e base do bolão.
4. Motor de chaveamento (sorteio Fisher–Yates + BYE + avanço do vencedor).
5. Telas de chaveamento e partida + resultado manual (melhor de 1 / melhor de 3 na final).
6. Animação de vitória.
7. Painel do bolão + QR Code Pix opcional.
8. Ajustes de PWA/offline, *persistent storage* e teste do fluxo completo.

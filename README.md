# APRFlow

Análise Preliminar de Riscos (APR) e Permissão de Trabalho (PT) digital.
Site estático no GitHub Pages, banco no Supabase. Marca da JL Consultoria LTDA.

## Estrutura

```
aprflow/
├── index.html            Entrar (login)
├── app.html              Lista de documentos e editor da APR / PT
├── admin.html            Usuários, clientes e troca de senha
├── verificar.html        Página pública aberta pelo QR code do documento
├── CNAME                 Domínio aprflow.com.br
├── assets/
│   ├── css/app.css       Visual do sistema
│   ├── img/icone.svg     Ícone da aba do navegador
│   └── js/
│       ├── config.js     URL e chave pública do Supabase  ← preencher
│       ├── api.js        Conexão com o banco (funções RPC)
│       ├── editor.js     Abas, regras, assinaturas e documento
│       ├── pdf.js        PDF do documento (texto, cabeçalho, rodapé, marca d'água)
│       ├── assinatura.js Recorte das assinaturas
│       ├── app.js        Lista e navegação
│       └── admin.js      Administração
├── sql/
│   ├── 01_estrutura.sql  Tabelas (rodar uma vez)
│   ├── 02_funcoes.sql    Funções e regras (rodar de novo a cada atualização)
│   └── 03_primeiro_acesso.sql  Cria o administrador inicial (uma vez)
└── .github/workflows/
    ├── manter-ativo.yml  Ping diário para o Supabase gratuito não pausar
    └── backup.yml        Backup semanal criptografado
```

## Como funciona a segurança

- As tabelas ficam fechadas: RLS ligado e nenhuma política. O site não lê nem grava tabelas diretamente.
- Todo acesso passa por funções no banco, que conferem a sessão, o perfil e a empresa do usuário.
- As regras de liberação e encerramento também são conferidas no servidor.
- A chave `anon` em `config.js` é pública por natureza. A chave `service_role` nunca vai para o site.
- Documentos vão para a lixeira por 30 dias antes de serem apagados de vez (rascunho e cancelado: gestor ou administrador; encerrado: só o administrador, digitando o número). PT liberada ou suspensa não pode ser apagada. A limpeza da lixeira roda junto com o ping diário.

## Perfis

| Perfil | Pode fazer |
| --- | --- |
| Administrador da plataforma | Tudo, em todas as empresas; cadastra clientes |
| Gestor | Tudo na própria empresa; cadastra usuários |
| Técnico / Elaborador | Cria e preenche APR, encerra PT |
| Liberador | Preenche a aba de liberação, libera, suspende, retoma e encerra PT |
| Consulta | Só visualiza |

## Publicação, passo a passo

### 1. Supabase

1. Crie um projeto novo em supabase.com (região São Paulo).
2. Em **SQL Editor**, rode nesta ordem: `sql/01_estrutura.sql`, `sql/02_funcoes.sql`.
3. Edite `sql/03_primeiro_acesso.sql` com seu e-mail, senha e nome, e rode.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para `assets/js/config.js`.

### 2. GitHub

1. Crie o repositório `aprflow` e envie todos os arquivos desta pasta.
   No plano gratuito do GitHub, o Pages exige repositório público. Isso não expõe dados: eles ficam no Supabase.
2. Em **Settings → Pages**: Source = *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. Em **Custom domain**, informe `aprflow.com.br` e depois marque **Enforce HTTPS**.

### 3. Domínio (Registro.br)

Na zona DNS de `aprflow.com.br`:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | (vazio) | 185.199.108.153 |
| A | (vazio) | 185.199.109.153 |
| A | (vazio) | 185.199.110.153 |
| A | (vazio) | 185.199.111.153 |
| CNAME | www | SEU-USUARIO.github.io |

### 4. Rotinas automáticas

Em **Settings → Secrets and variables → Actions**, cadastre:

| Segredo | Valor |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Chave anon public |
| `SUPABASE_DB_URL` | Supabase → Connect → *Session pooler* (com a senha do banco) |
| `BACKUP_SENHA` | Uma senha forte só para os backups. Guarde fora do GitHub |

O GitHub desativa rotinas agendadas em repositórios sem alterações por 60 dias. Se isso acontecer, reative em **Actions**.

### 5. Primeiro uso

1. Entre em `aprflow.com.br` com o administrador criado no passo 1.
2. Em **Administração → Clientes**, cadastre a empresa atendida.
3. Em **Administração → Usuários**, crie os gestores, técnicos e liberadores.

## Restaurar um backup

1. Baixe o arquivo em **Actions → Backup do banco → (execução) → Artifacts**.
2. Descriptografe: `gpg -d aprflow-AAAA-MM-DD.sql.gz.gpg | gunzip > aprflow.sql`
3. Num projeto Supabase vazio, rode o `aprflow.sql` no SQL Editor ou com `psql`.

## Atualizações

- Mudou `sql/02_funcoes.sql`? Rode o arquivo de novo no SQL Editor. Os dados não são afetados.
- Mudou algum arquivo do site? Basta enviar ao GitHub; o Pages publica em cerca de um minuto.

## Atualizar da versão 1 para a versão 2

1. **Supabase → SQL Editor:** rode de novo `sql/01_estrutura.sql` e depois `sql/02_funcoes.sql`. Confirme o aviso de operação destrutiva. Os dados existentes são mantidos.
2. **GitHub:** envie os arquivos alterados (Add file → Upload files), substituindo os antigos: `app.html`, `admin.html`, `README.md`, a pasta `assets` e a pasta `sql`. Não é preciso mexer em `config.js` nem na pasta `.github`.
3. Abra o site com **Ctrl + F5** para o navegador buscar os arquivos novos.

## Atualizar para a versão 3 (etapas e dados dos usuários)

1. **Supabase → SQL Editor:** rode de novo `sql/01_estrutura.sql` e depois `sql/02_funcoes.sql`. Os dados existentes são mantidos.
2. **GitHub:** envie os arquivos alterados, substituindo os antigos: `admin.html`, `verificar.html`, `README.md`, a pasta `assets` e a pasta `sql`.
3. Abra o site com **Ctrl + F5**.
4. No primeiro acesso, cada usuário completa CPF, função e, para administrador, gestor e técnico, o registro MTE ou CREA.

O que muda:
- Cadastro de usuários com CPF, função e registro profissional. Esses dados preenchem Elaborado por, Liberado por e Responsável pelo encerramento, sempre editáveis.
- Aba Riscos com a descrição das atividades por etapa: passo a passo, riscos, avaliação P × S por risco e medidas preventivas. Documentos antigos continuam com a tabela anterior.
- Novos riscos na lista: acidente de trânsito, furtos e roubos, batida contra.
- O histórico registra quem foi informado e quem registrou no sistema, quando forem pessoas diferentes.

## Versão 3.2 (fluxo do elaborador e do liberador)

1. **Supabase → SQL Editor:** rode `sql/01_estrutura.sql` e depois `sql/02_funcoes.sql`.
2. **GitHub:** envie `assets/js/editor.js` para a pasta `assets/js` e os dois SQL para a pasta `sql`.

Regras:
- O liberador consulta tudo e não altera a APR. A conferência, a validade, o "Liberado por" e o botão Liberar PT abrem para ele só depois que a APR está sem pendências e o elaborador assinou.
- O bloco "Elaborado por" só abre quando a APR (abas 01 a 06) está sem pendências. Alterar a APR depois de assinar remove a assinatura do elaborador (na tela e no servidor).
- O técnico pode suspender, retomar a suspensão que ele mesmo fez e encerrar.

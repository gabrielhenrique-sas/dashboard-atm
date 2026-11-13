# Contexto do projeto — Apoio Técnico (Pernambuco)

> **Para quem for usar este arquivo (pessoa ou assistente de IA):** ele reúne tudo o que se sabe sobre o projeto até 13/11/2026: a base de dados, o que já foi construído (painel de visualização e relatório em PDF) e o ponto de partida para o próximo sistema (marcação de atividades e monitoramento de pendências). Cada afirmação está marcada como **[Fato]** (veio de documento/arquivo/teste), **[Inferência]** (deduzido, precisa confirmação) ou **[Proposta]** (sugestão de desenho, ainda não decidida). Leia a seção 11 (perguntas em aberto) antes de implementar qualquer coisa.

---

## 1. Resumo em 10 linhas

1. O projeto **Apoio Técnico** acompanha atividades de apoio técnico prestadas a **185 municípios de Pernambuco**, agrupados em **12 Regiões de Desenvolvimento (RDs)**.
2. Os dados ficam em um banco **PostgreSQL no Supabase** (tabela `public.apoio_tecnico`), com **11 campos de negócio**. A base cobre **2023 a 2026**.
3. Existia um mapa em HTML (Leaflet) com números **fixos no código**. Ele serviu de inspiração visual.
4. Já foi entregue um **sistema de visualização** em 2 páginas (painel geral com mapa + página de pesquisa por município), que lê o Supabase pela API REST, só leitura. Também existe um **gerador de relatório em PDF** por município (A4 paisagem, mesmo layout de um modelo em Word aprovado), descrito na seção 5.6.
5. O período padrão do painel é o **ano atual**, e o usuário pode trocar para outro ano, "Todo o período" ou um intervalo livre.
6. O próximo passo desejado é um **sistema separado** para **marcar atividades** e **monitorar pendências**, com uma base de **apoios solicitados e ainda não concluídos**.
7. **[Inferência]** A tabela atual provavelmente contém **somente atendimentos concluídos** (o mapa antigo filtrava `Status = "Concluído"`, e a tabela não tem coluna de status).
8. O dashboard de exemplo (PDF) já mostra o vocabulário de situação: **Suspenso, Em análise, Agendado, Concluído**. É a base natural para o ciclo de vida das solicitações.
9. Segurança: o navegador só pode usar a **chave pública** (anon/publishable) com RLS; **escrita exige autenticação e política própria** (o painel atual não escreve).
10. O ideal é manter o Supabase como fonte central e criar o novo sistema como **aplicação independente** que compartilha o banco.

---

## 2. Glossário do domínio

| Termo | Significado (como aparece nos materiais) |
|---|---|
| **Apoio técnico / ATM** | Atividade de apoio técnico prestada a um município. O dashboard de exemplo usa "Apoios Técnicos"; o mapa antigo usava "Total de ATM". **[Inferência]** ATM = apoio técnico aos municípios. |
| **RD** | Região de Desenvolvimento. Padrão de nome: `RD 08 - Agreste Central` (12 no total, ver seção 4.3). |
| **Porte** | Classificação do município: Metrópole, Grande Porte, Médio Porte, Pequeno Porte II, Pequeno Porte I. |
| **Categoria (3 grandes grupos)** | (1) ATMs/Apoios individualizados; (2) Rodas de Diálogo; (3) MUPS, Oficinas, SICON e Encontros. |
| **Modalidade** | Presencial no Município, Presencial na SEASS, Remoto (valores do dashboard de exemplo). |
| **Tipo** | Particularizado, Integrado, Semi-Integrado (valores do dashboard de exemplo). |
| **Gerência** | Área responsável. Siglas vistas no dashboard de exemplo: GESTÃO, GEBEN, GEPSB, GEPMC, GEPAC, GETEP, GEFEAS, VSA, CAS (leitura de imagem; **confirmar grafia**). |
| **Relatório PDF** | Documento por município com os apoios técnicos de um período, gerado no navegador (seção 5.6). Reproduz o modelo `Barreiros_Apoios_Tecnicos_2026.docx`. |
| **Situação** | Estado do atendimento. Dashboard de exemplo: Suspenso, Em análise, Agendado, Concluído. **Não existe na tabela atual.** |
| **Devolutiva** | Registro de retorno/encaminhamento ao município após o apoio. |
| **Avaliação** | Avaliação da atividade (formato dos valores desconhecido: número ou texto). |
| **MUPS, SICON, SEASS** | Siglas usadas nos materiais sem definição. **Confirmar significado** com o time antes de usar em telas novas. |

---

## 3. Arquivos recebidos e o que contêm

### 3.1 `base_de_dados_supabase.docx` — documentação da base **[Fato]**
- Plataforma: Supabase (PostgreSQL). Projeto: "Apoio Técnico".
- URL base: `https://iyjmasvhdmokjuuurjqg.supabase.co` (não é segredo).
- Tabela principal: `public.apoio_tecnico`; endpoint REST: `/rest/v1/apoio_tecnico`.
- 11 campos de negócio (seção 4.2). Pode existir coluna técnica `id` (**não confirmada**).
- Fonte de manutenção: **planilha** → exportação CSV → importação no Supabase. Alerta do documento: ao reimportar, não perder alterações feitas direto no banco; fazer backup antes.
- Conexão prevista: Apps Script, Python (`requests`) e qualquer cliente HTTP. Exemplos de filtros: `?municipio=eq.Caruaru`, `order=data.desc`, `limit`, `offset`/`Range`.
- Edição: via `PATCH ...?id=eq.123`, só com chave/permissão adequada, validação e RLS. **Chaves privilegiadas nunca vão para o navegador, GitHub ou HTML público** (o documento cita também uma chave Groq, o que sugere uso de IA em algum fluxo do ecossistema).
- Recomenda agregar no banco (PostgreSQL) em vez de trazer tudo ao navegador.
- Objetivo de longo prazo declarado: **uma única base centralizada, documentada e reutilizável**.

### 3.2 `Index.html` — mapa original **[Fato]**
- Leaflet + tiles escuros da CARTO. Malha geográfica baixada em runtime, com 3 fontes em cascata (jsDelivr/`tbrugz/geodata-br`, raw.githubusercontent, API de malhas do IBGE).
- Contém dois objetos grandes **embutidos no código**:
  - `sheetData`: cadastro dos 185 municípios com `nome`, `rd`, `porte`.
  - `categoryData`: números fixos por município `[individuais, rodas, eventos]`, descritos em comentário como *"Soma de 'Total de ATM' nas três bases, apenas para Status = 'Concluído'"*.
- Recursos: visão por município ou por RD, números sobre cada área, filtro por categoria (3 caixas), busca, modal com os totais.
- Paleta das 12 RDs definida em `rdColors` (reaproveitada no sistema novo).
- Implicação: os dados vinham de **três bases/planilhas** (uma por categoria), com coluna de **Status** e **Total de ATM**. A tabela do Supabase parece ser a consolidação disso. **[Inferência]**

### 3.3 `exemplo_dashboard.pdf` — referência visual (imagem, sem texto selecionável) **[Fato]**
Dashboard "GERAL - ATM 2026" em fundo azul-marinho. Valores lidos da imagem (úteis para **validar** o painel contra a base real; podem ter erro de leitura):

| Indicador | Valor |
|---|---|
| Total de apoios técnicos | 2.487 |
| Apoios técnicos individualizados | 459 (Presenciais nos municípios 231 · Presenciais na SEASS 55 · Remotos 173) |
| Rodas de Diálogo | 1.087 |
| Oficinas, Encontros, MUPS e SICON | 941 (Encontros estaduais presenciais 408 · Oficinas, MUPS e SICON 533) |
| Modalidade | Presencial Município ~50,3% · Presencial SEASS ~12,0% · Remoto ~37,7% |
| Tipo | Particularizado ~89,3% · Integrado ~5,9% · Semi-Integrado ~4,8% |
| **Situação** | **Concluído ~61,4% · Em análise ~34,5% · Suspenso e Agendado (fatias pequenas)** |
| Por gerência | GESTÃO 0 · GEBEN 195 · GEPSB 602 · GEPMC 221 · GEPAC 58 · GETEP 6 · GEFEAS 233 · VSA 278 · CAS 894 (soma 2.487) |
| Por porte | Metrópole 19 · Grande 208 · Médio 327 · Pequeno II 937 · Pequeno I 996 (soma 2.487) |
| Por RD | 12 barras entre ~66 e ~430 (soma lida ≠ 2.487; leitura imprecisa) |

> **Leitura importante:** o total 2.487 inclui apoios em análise/agendados/suspensos. Ou seja, o universo "completo" do dashboard de exemplo é **maior** que só os concluídos, e é exatamente esse universo que o novo sistema precisa gerenciar.

---

## 4. A base de dados

### 4.1 Conexão **[Fato]**
```
URL base : https://iyjmasvhdmokjuuurjqg.supabase.co
Endpoint : /rest/v1/apoio_tecnico
Headers  : apikey: <chave pública>
           Authorization: Bearer <chave>   (só para chaves JWT legadas "eyJ...")
Paginação: limit=1000&offset=N (o Supabase limita 1000 linhas por resposta)
```
- Chaves novas (`sb_publishable_...`/`sb_secret_...`) vão só no header `apikey`.
- A tabela precisa de política RLS de `SELECT` para o papel `anon` para o painel funcionar. Sem ela, a API devolve lista vazia (sem erro).

### 4.2 Campos **[Fato: nomes e descrições; tipos NÃO confirmados]**
| Campo | Descrição | Observações de tratamento (já implementadas no painel) |
|---|---|---|
| `categoria` | Categoria do registro | Classificada em grupos por regras de texto (seção 6.3) |
| `evento` | Nome/identificação da atividade | Usado para distinguir "Encontros" de "Oficinas/MUPS/SICON" |
| `municipio` | Município | Normalizado (sem acento, minúsculas) e casado com o cadastro; aliases tratados |
| `rd` | Região de Desenvolvimento | Parseia "RD nn"; o cadastro interno tem precedência |
| `porte` | Porte | Normalizado para os 5 valores canônicos |
| `data` | Data da atividade | Aceita `YYYY-MM-DD`, ISO com hora e `dd/mm/aaaa` |
| `modalidade` | Modalidade | Valores unificados por caixa/acentos |
| `tipo` | Tipo | idem |
| `gerencia` | Gerência | Exibida em maiúsculas |
| `devolutiva` | Devolutiva | idem modalidade |
| `avaliacao` | Avaliação | Tratada como categoria de texto |
| `id` (?) | Chave técnica | **Não confirmada.** O painel tenta ordenar por `id` e, se a API responder 400, cai para `data` |

Cobertura temporal: **2023–2026** (informado pelo usuário).

### 4.3 Cadastro territorial (hoje só dentro do código)
- **185 municípios**, todos com RD e porte (extraídos do `Index.html` e embutidos em `core.js`).
- Distribuição por RD: RD 08 Agreste Central 27 · RD 07 Agreste Meridional 26 · RD 10 Mata Sul 23 · RD 11 Mata Norte 19 · RD 09 Agreste Setentrional 19 · RD 05 Sertão do Pajeú 17 · RD 12 Região Metropolitana 15 · RD 03 Sertão do Araripe 10 · RD 04 Sertão Central 8 · RD 02 Sertão do São Francisco 7 · RD 06 Sertão do Moxotó 7 · RD 01 Sertão de Itaparica 7.
- Distribuição por porte: Pequeno Porte I 86 · Pequeno Porte II 66 · Médio 21 · Grande 11 · Metrópole 1 (Recife).
- Código IBGE vem da malha geográfica (propriedade `id`), não do cadastro.
- **[Proposta]** mover esse cadastro para uma **tabela `municipio` no Supabase** (seção 9.2) para os dois sistemas usarem a mesma referência.

---

## 5. O que já foi construído (sistema de visualização v1)

Pasta entregue: `sistema-apoio-tecnico/` — site estático, sem back-end, sem build.

| Arquivo | Função |
|---|---|
| `index.html` | **Painel geral**: filtros, indicadores, mapa, ranking, gráficos, tabela, diagnóstico |
| `municipio.html` | **Pesquisa de município** com autocomplete e página de dados do município |
| `core.js` | Núcleo compartilhado (~46 KB, com os 185 municípios embutidos) |
| `apoio.css` | Estilos (tema azul-marinho, fonte IBM Plex Sans) |
| `config.js` | URL, chave pública (opcional), tabela, nomes de colunas, minutos de cache |
| `relatorio.js` | **Gerador do relatório PDF** (`window.RP.gerarPDF`), seção 5.6 |
| `relatorio-config.js` | Cores, fontes, textos e medidas do relatório PDF (`window.RELATORIO_CONFIG`) |
| `LEIA-ME.txt` | Instalação e ajustes |

Dependências por CDN: Leaflet 1.9.4 (unpkg), Chart.js 4.4.1 (jsDelivr), Google Fonts. Mapa base CARTO dark. Para o relatório PDF: **jsPDF** e **jspdf-autotable** (carregados antes de `relatorio-config.js` e `relatorio.js`) e a fonte **Carlito**, baixada em tempo de execução (seção 5.6).

### 5.1 Painel geral (`index.html`)
- **Filtros** (barra superior): período (chips por ano + "Todo o período" + datas livres), categorias (3 + "Outras" se existirem), gerência, modalidade, porte, "Limpar filtros".
- **Indicadores**: total de apoios; municípios atendidos (x de 185 e % de cobertura); média por município; municípios sem atendimento (com atalho à tabela); 3 cartões de categoria com subtotais (modalidade ou Encontros × Oficinas); última atividade.
- **Mapa**: visão Municípios/RDs; cor por RD ou **por volume** (escala sequencial); busca; tooltips; modal de detalhe com link para a página do município (carrega o período); legenda abaixo do mapa; botão "Ver o estado todo". Fernando de Noronha é excluído do enquadramento inicial (continua clicável/pesquisável). Rótulos numéricos somem em telas pequenas com zoom baixo.
- **Ranking lateral**: top 30 municípios ou 12 RDs; clique foca no mapa.
- **Gráficos**: evolução mensal empilhada por categoria; modalidade; tipo; gerência; porte; RD; devolutiva; avaliação; situação (**só se a tabela tiver coluna `situacao`/`status`**).
- **Tabela** com os 185 municípios (ordenável, busca, "somente sem atendimento", **CSV** com `;` e BOM para Excel).
- **Diagnóstico** (`<details>` no fim): cada valor de `categoria` e o grupo atribuído; contagem de registros sem data e sem município reconhecido; lista dos nomes de município não reconhecidos; colunas encontradas.

### 5.2 Página do município (`municipio.html`)
- Campo de busca com autocomplete (acentos, teclado ↑↓ Enter Esc); URL aceita `?m=<chave>&from=AAAA-MM-DD&to=AAAA-MM-DD`.
- Estado vazio com atalhos para os mais atendidos.
- Cabeçalho (RD, porte), indicadores (total, posição no estado e na RD, última atividade, subtotais por categoria, comparação com a média da RD), comparação com média da RD/porte/estado, gráficos (mensal, modalidade, tipo, gerência, devolutiva, avaliação, histórico por ano da base toda), ranking da RD com destaque, tabela de registros (25 + "mostrar mais", busca, CSV).

### 5.3 Regras de negócio implementadas em `core.js`
1. **Período padrão = ano atual** pelo relógio do navegador; se a base não tiver esse ano, usa o último ano com dados. Parâmetros `from`/`to` na URL sobrescrevem.
2. **Filtros em dois níveis**: `filterBase` (período + gerência + modalidade + porte) e `filterGroups` (categoria). Os cartões de categoria mostram a base sem o filtro de categoria; o resto usa tudo.
3. **Contagem**: **1 linha da tabela = 1 apoio técnico.** (O mapa antigo somava um campo "Total de ATM"; essa coluna não existe na documentação.)
4. **Classificação em grupos** (`GRUPOS`, avaliada em `categoria` e, se nada casar, em `evento`; ordem roda → evento → individual):
   - Rodas de Diálogo: `/roda/`
   - Oficinas e encontros: `/oficina/`, `/\bmups?\b/`, `/sicon/`, `/encontro/` (subgrupo "Encontros estaduais" se contiver "encontro")
   - ATMs individuais: `/individ/`, `/\batm\b/`, `/particular/`
   - Sem correspondência → grupo "Outras categorias".
   **[Inferência]** os valores reais de `categoria` não foram vistos; validar no quadro de diagnóstico.
5. **Normalização**: `norm()` remove acentos, minúsculas e espaços duplos. Município: remove sufixo "(PE)" e usa aliases (`lagoa do itaenga → lagoa de itaenga`, `belem de sao francisco → belem do sao francisco`, `sao caitano → sao caetano`, `iguaraci → iguaracy`, `itamaraca → ilha de itamaraca`).
6. **Registros sem data válida** ficam fora de qualquer período (contados no diagnóstico). **Registros sem município reconhecido** entram no total do estado, mas não no mapa/ranking municipal (nota no KPI).
7. **Rótulos categóricos** (modalidade, tipo etc.): valores iguais ignorando caixa/acento são unificados, exibindo a grafia mais frequente; vazio vira "Não informado".
8. **Carregamento**: busca paginada de 1.000 em 1.000 (sem `count` para evitar problema de CORS), com fallback de ordenação `id.asc → data.asc → sem ordem`. Cache em `sessionStorage` por 10 min (`apoio_cache_v1`), invalidado pelo botão "Atualizar". Erros 401/403/404/rede e "0 registros" (RLS) têm mensagem própria.
9. **Chave**: `config.js` → `SUPABASE_KEY`; se vazio, diálogo pede a chave e grava em `localStorage` (`apoio_supabase_key`). **Modo demonstração**: `?demo=1` (≈6.800 registros sintéticos, selo "Dados de exemplo").
10. **Agregação é feita no navegador** (a base inteira é baixada). Hoje é viável (milhares de linhas); com crescimento, migrar para views/RPC no PostgreSQL.

### 5.4 Como foi testado
Chromium (Playwright) com Leaflet/Chart.js locais e a malha real de PE (185 polígonos), em modo demo e com um **Supabase simulado** (sem coluna `id`, datas `dd/mm/aaaa`, municípios em maiúsculas sem acento, município inexistente, linha sem data, categoria desconhecida). Verificados: pedido de chave, fallback de ordenação, paginação, troca de período e intervalo manual, validação de datas invertidas, diagnóstico, modal, busca, páginas do município, layout 1440 px e 390 px. **Nunca foi testado contra o Supabase real** (o ambiente de desenvolvimento não alcança o domínio). O relatório PDF teve teste próprio (seção 5.6.6).

### 5.5 Limitações conhecidas da v1
- Valores reais de `categoria`, `avaliacao`, `data` (tipo) não foram vistos.
- Sem escrita, sem login, sem histórico de alterações.
- Download integral da base a cada abertura (cache de 10 min mitiga).
- Dependência de CDNs externos (Leaflet, Chart.js, malha geográfica); em rede restrita, vale hospedar localmente.
- Cadastro de municípios duplicado dentro de `core.js` (não vem do banco).
- Painel não distingue apoios concluídos de pendentes (por falta de dado).
- Relatório PDF: nunca foi executado no navegador com o painel real nem com dados reais do Supabase; depende de CDN para baixar a fonte (seção 5.6.7).

### 5.6 Relatório em PDF por município (`relatorio.js` + `relatorio-config.js`)

#### 5.6.1 Origem e objetivo **[Fato]**
- Um documento Word (`Barreiros_Apoios_Tecnicos_2026.docx`), produzido por outra ferramenta de IA, foi adotado como **modelo visual**. O objetivo é que o PDF gerado pelo sistema fique **idêntico** a esse modelo.
- Uma primeira versão do gerador (retrato, fonte IBM Plex, tons de vermelho/rosa, cards de período e total na capa) foi **substituída**: não correspondia ao modelo. A versão atual foi reescrita a partir das medidas e cores extraídas do XML do `.docx`.

#### 5.6.2 Como funciona **[Fato]**
- Roda **inteiramente no navegador**; nenhum dado sai do computador do usuário e não há chamada extra ao Supabase. Recebe os registros que o painel já tem em memória e baixa o arquivo com `pdf.save()`.
- Carregamento: `jsPDF` e `jspdf-autotable` (globais `window.jspdf.jsPDF` e `pdf.autoTable`) → `relatorio-config.js` → `relatorio.js`.
- Chamada:
  ```js
  const nomeArquivo = await RP.gerarPDF({
    municipio: { nome: 'Barreiros', rd: 'RD 10 - Mata Sul', porte: 'Pequeno Porte II' },
    registros,              // registros normalizados do core.js (já filtrados pelo período/filtros)
    from: 20260101,         // AAAAMMDD
    to:   20261231,         // AAAAMMDD
    filtros: {
      grupos: { individual: true, roda: true, evento: true, outros: true },
      modalidades: { 'Presencial Município': true, 'Presencial SEASS': true, 'Remoto': true },
      gerencia: ''          // vazio = "Todas"
    },
    meta: {},
    hasOutros: false        // true só se existirem registros fora das 3 categorias
  });
  ```
- Campos usados de cada registro: `ymd`, `grupo` (`individual` | `roda` | `evento` | `outros`), `sub` (`'Encontros estaduais'` separa Encontros de Oficinas/MUPS/SICON), `evento`, `modalidade`, `tipo`, `gerencia`, `i` (desempate na ordenação). Ordenação: data crescente.
- Nome do arquivo: `<Municipio>_Apoios_Tecnicos_<ano>.pdf` (ex.: `Barreiros_Apoios_Tecnicos_2026.pdf`).
- **[Inferência]** O ponto exato do painel que chama `RP.gerarPDF` (botão na página do município, por exemplo) não foi revisado nesta etapa; confirmar o que o botão passa em `filtros` e `meta`.

#### 5.6.3 Layout (réplica do modelo Word) **[Fato]**
- **Papel**: A4 **paisagem** (297 × 210 mm), margens de 17,64 mm.
- **Fonte**: **Carlito** (equivalente livre da Calibri, mesmas métricas), nos pesos normal, negrito e itálico. Tamanhos: título 28 pt, subtítulo 15 pt, blocos 16 pt, faixa de seção 16 pt, subtítulo/descrição/totais 11 pt, tabelas 10 pt, rodapé 9 pt.
- **Página 1 (capa)**: título do município em maiúsculas, "Registros de Apoio Técnico", linha verde-água; cards **Região de Desenvolvimento** e **Porte**; bloco **"Filtros Aplicados:"** com **Período Selecionado** (início, "a", fim), **Modalidades Selecionadas** (uma por linha, terminando em ";" e "." no final) e **Gerências** ("Todas" se vazio); **Resumo por categoria** (tabela centralizada com as 3 categorias e **Total geral**; a linha "Outras categorias" só aparece se houver registros).
- **Páginas seguintes (uma seção por página)**: faixa de título colorida (`  1.  ATMS INDIVIDUAIS`), faixa de subtítulo em itálico em tom claro, descrição, linha `Total: N  |  Modalidade: N` e tabela.
  1. **ATMs Individuais** (verde): Data, Evento, Modalidade, Tipo, Gerência.
  2. **Rodas de Diálogo** (rosa): mesmas colunas.
  3. **MUPS, Oficinas, SICON e Encontros** (roxo): subseções **Oficinas (n)** e **Encontros (n)**, com Data, Evento, Gerência.
  4. **Outras categorias** (cinza): só se existirem registros.
- **Tabelas**: cabeçalho na cor da seção, texto branco em negrito; data em negrito; linhas pares (2ª, 4ª…) no tom claro da seção; borda `#d0d5dd`. A tabela de cada seção repete o cabeçalho se passar de uma página.
- **Rodapé** (todas as páginas, à direita): `Barreiros · Apoios Técnicos 2026  |  Página N` (sem "de N", como no modelo).

#### 5.6.4 Paleta do relatório (tema claro, diferente do painel escuro) **[Fato]**
| Uso | Cor |
|---|---|
| Título, valores dos cards, cabeçalho do resumo | `#1b2a4a` |
| Linha sob o título e barras dos cards | `#2bb3a3` |
| Fundo dos cards e linha "Total geral" | `#f1f4f9` |
| ATMs individuais / tom claro | `#1f9d6b` / `#e6f5ee` |
| Rodas de Diálogo / tom claro | `#d6336c` / `#fce8ef` |
| MUPS, Oficinas, SICON e Encontros / tom claro | `#6f42c1` / `#eee8fa` |
| Outras categorias / tom claro | `#64748b` / `#f1f4f9` |
| Descrição / texto secundário / rodapé | `#333b4a` / `#5b6577` / `#7a8396` |

Atenção: as cores das categorias no relatório (verde `#1f9d6b`, rosa `#d6336c`, roxo `#6f42c1`) **não são** as do painel (`#3fae6a`, `#d4678c`, `#9b7bf2`); são as do modelo Word. Se for desejável unificar, decidir qual conjunto vale para os dois.

#### 5.6.5 Onde ajustar **[Fato]**
- **`relatorio-config.js`**: cores (`cores`), tamanhos (`fontes`), URLs da fonte (`fontesArquivo`), textos fixos e descrições das seções (`textos`), margens e larguras das colunas em mm (`layout`). Também reserva `imagens.brasao` e `imagens.logoDireita` (hoje `null`; o modelo não tem logos).
- **`relatorio.js`**: estrutura das páginas, métricas de linha (corpo × 1,22) e regras (ordenação, divisão Oficinas/Encontros, rodapé).
- Cache da fonte: `localStorage.relatorio_fonts_carlito_v1`.

#### 5.6.6 Como foi testado **[Fato]**
- Em Node.js com jsPDF 4.2.1 e jspdf-autotable 5.0.9, usando a Carlito instalada no sistema e **15 registros sintéticos** que reproduzem os de Barreiros em 2026 (1 individual, 8 rodas, 6 eventos).
- O PDF foi convertido em imagem e comparado com o `.docx` renderizado: as bordas das linhas das tabelas ficaram a **no máximo 1 pixel** de diferença a 80 dpi nas 4 páginas, com o mesmo número de páginas e mesma ordem de conteúdo.
- **Não testado**: navegador real (Chrome/Edge/Firefox), versões de jsPDF/autotable carregadas por CDN no painel, muitos registros (paginação de tabelas longas em produção), nomes de município muito longos, dados reais do Supabase.

#### 5.6.7 Limitações e cuidados **[Fato / Inferência]**
- **Fonte por CDN [Fato]**: se `cdn.jsdelivr.net` e `raw.githubusercontent.com` estiverem bloqueados, o código cai para **Helvetica sem acentos**, e o visual deixa de ser idêntico ao modelo. Em rede restrita, hospedar `Carlito-Regular/Bold/Italic.ttf` junto do sistema e apontar `fontesArquivo` para eles.
- **Dados de filtros [Inferência]**: o texto "Todas" para gerência e o texto de modalidades vêm de `filtros`; se o painel passar valores diferentes dos esperados (ex.: modalidades como lista em vez de objeto), o relatório mostrará "Nenhuma".
- O relatório é **por município**; não há versão por RD ou do estado.
- A divisão entre **Oficinas** e **Encontros** depende do campo `sub` produzido por `core.js` (regra `/encontro/`, seção 5.3, item 4); um erro de classificação lá aparece no PDF.
- Os textos dos eventos vêm dos dados: diferenças de grafia entre fontes (ex.: "Reordenado" × "Reordenamento do PI SUAS") não são corrigidas pelo gerador.


---

## 6. Identidade visual e convenções (para manter coerência no novo sistema)

- Tema escuro: fundo `#0a1428`, painéis `#101e3a`, linhas `#223560`, texto `#e6edfb`, texto secundário `#8c9fc6`.
- Cores de destaque herdadas do mapa original: hover **ciano `#38bdf8`**, selecionado **âmbar `#f59e0b`**, botão ativo **azul `#2563a6`**.
- Categorias: ATMs individuais `#3fae6a` (verde), Rodas `#d4678c` (rosa), Oficinas/encontros `#9b7bf2` (violeta), Outras `#7d8aa8`.
- RDs: paleta do `rdColors` do mapa original (12 cores, ver `core.js`).
- Tipografia: IBM Plex Sans, números tabulares. Textos em português do Brasil, datas `dd/mm/aaaa`, milhares com ponto.
- Layout: faixa de indicadores com divisórias (não cartões soltos), painéis de borda fina, sem sombras; responsivo (1100 px e 720 px).
- Acessibilidade: foco visível, `aria-pressed` nos chips, rótulos em campos, `prefers-reduced-motion`.
- **Relatório PDF**: segue outra identidade (tema claro, A4 paisagem, fonte Carlito, cores por categoria do modelo Word); ver seção 5.6.4.

---

## 7. Segurança (resumo operacional)

- **Painel público de leitura**: pode usar a chave pública + RLS `SELECT` para `anon`. Isso torna a tabela legível por quem tiver a chave; se os dados não puderem ser abertos, exigir login (Supabase Auth) ou camada intermediária.
- **Nunca** colocar `service_role`/`sb_secret_...` em HTML, JS de navegador ou GitHub.
- **Novo sistema com escrita**: exige **autenticação de usuários** e **RLS por papel**; o front-end usa o token do usuário logado, nunca chave privilegiada.
- Políticas de exemplo para a leitura atual:
  ```sql
  alter table public.apoio_tecnico enable row level security;
  create policy "leitura publica" on public.apoio_tecnico for select to anon using (true);
  ```
- O relatório PDF é gerado no navegador a partir dos dados já carregados; não adiciona chaves nem chamadas à API. O arquivo baixado contém dados de atividades (sem dados pessoais de solicitantes, até onde se sabe).
- Backup antes de qualquer importação de CSV; cuidado com sobrescrever edições feitas direto no banco.
- Controle de versão no GitHub (o documento da base recomenda), com credenciais fora do repositório.

---

## 8. Objetivo da expansão

> Construir um **sistema à parte** para **marcar atividades** (agendar apoios técnicos) e **monitorar pendências** do apoio técnico, com uma **base de apoios solicitados e ainda não concluídos**, mantendo a base atual (`apoio_tecnico`) como histórico de atendimentos realizados e o painel v1 como camada de visualização.

### 8.1 Requisitos funcionais **[Proposta; validar com o time]**
1. **Registrar solicitação** de apoio: município, solicitante, categoria, assunto/descrição, data do pedido, canal, prioridade, gerência destinatária.
2. **Triagem**: gerência recebe, classifica (categoria/tipo/modalidade previstos) e marca "Em análise".
3. **Agendar atividade**: definir data/hora, modalidade, responsável(is), local/link, participantes; permitir **reagendar** e **suspender** com motivo.
4. **Executar e concluir**: registrar realização, devolutiva e avaliação; ao concluir, **gerar/atualizar o registro correspondente em `apoio_tecnico`** (ou vincular a ele).
5. **Monitorar pendências**: lista e quadro (kanban) por situação; alertas de **atraso** (sem triagem há X dias, agendamento vencido, devolutiva pendente); filtros por município, RD, gerência, responsável, período.
6. **Calendário** de atividades (mês/semana) com conflitos de agenda por responsável.
7. **Histórico/auditoria**: quem alterou o quê e quando; comentários por solicitação.
8. **Indicadores**: backlog por situação, idade média das pendências, tempo de atendimento (pedido → conclusão), taxa de conclusão, municípios com pendências antigas, carga por gerência/responsável; integração com o painel atual (concluídos × pendentes por município/RD).
9. **Importação/exportação**: CSV de solicitações (migração inicial a partir de planilhas) e exportação para Excel.
10. **Perfis**: consulta (somente leitura), gerência (cria/edita da sua gerência), coordenação (vê tudo, reatribui), administrador (usuários, tabelas de apoio).

### 8.2 Ciclo de vida sugerido **[Proposta, baseado no dashboard de exemplo]**
```
Solicitado ──► Em análise ──► Agendado ──► Concluído
     │              │             │
     │              │             ├──► Reagendado (volta a Agendado, mantém histórico)
     └──────────────┴─────────────┴──► Suspenso ──► (retoma para Em análise/Agendado)
                                  └──► Cancelado (com motivo)
```
- Situações do dashboard de exemplo: **Em análise, Agendado, Suspenso, Concluído**. Acrescentar **Solicitado** (entrada) e **Cancelado** (encerramento sem atendimento) é sugestão.
- **Pendente** = qualquer situação diferente de Concluído/Cancelado.

---

## 9. Desenho técnico sugerido para o novo sistema **[Proposta]**

### 9.1 Arquitetura
- **Mesmo projeto Supabase**, novas tabelas (uma fonte central, conforme o objetivo de longo prazo do documento da base). Alternativa: projeto separado com sincronização (mais complexo, só se houver exigência de isolamento).
- **Autenticação**: Supabase Auth (e-mail/senha ou SSO institucional se existir); perfis em tabela própria; **RLS por papel e por gerência**.
- **Front-end**: aplicação web independente do painel v1. Duas rotas razoáveis: (a) manter o estilo atual (HTML/JS estático + `@supabase/supabase-js`), simples de hospedar; (b) framework (React/Vue) se a interatividade crescer (kanban, calendário, formulários longos). Reaproveitar `core.js` (normalização, cadastro, cores) e `apoio.css`.
- **Regras no banco**: transições de status por função/trigger, gravação automática de histórico, e uma **view** de pendências com idade calculada. Agregações do painel via views/RPC.
- **Notificações** (fase posterior): e-mail ou mensagem para responsáveis em atraso (Edge Function agendada ou Apps Script, que o documento da base já cita como opção).
- **Hospedagem**: GitHub Pages/Netlify/servidor interno; chaves só em variáveis de ambiente/configuração segura.

### 9.2 Modelo de dados proposto (rascunho para discussão)
```sql
-- Referência territorial (substitui o cadastro embutido no código)
create table municipio (
  id           serial primary key,
  chave        text unique not null,         -- ex.: 'caruaru' (sem acento, minúsculas)
  nome         text not null,
  codigo_ibge  text unique,
  rd           text not null,                -- 'RD 08 - Agreste Central'
  porte        text not null
);

create type situacao_solicitacao as enum
  ('solicitado','em_analise','agendado','suspenso','concluido','cancelado');

create table solicitacao_apoio (
  id              bigserial primary key,
  municipio_id    int  not null references municipio(id),
  categoria       text not null,             -- mesma grafia/regra de apoio_tecnico.categoria
  assunto         text not null,
  descricao       text,
  solicitante     text,                      -- nome/cargo/contato no município
  canal           text,                      -- ofício, e-mail, telefone, reunião…
  prioridade      smallint default 2,        -- 1 alta, 2 normal, 3 baixa
  gerencia        text,                      -- gerência destinatária
  responsavel_id  uuid references auth.users(id),
  situacao        situacao_solicitacao not null default 'solicitado',
  data_solicitacao date not null default current_date,
  prazo_desejado  date,
  motivo_suspensao text,
  apoio_tecnico_id bigint,                   -- vínculo com o registro concluído (se houver id)
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id)
);

create table atividade_agendada (
  id               bigserial primary key,
  solicitacao_id   bigint not null references solicitacao_apoio(id) on delete cascade,
  inicio           timestamptz not null,
  fim              timestamptz,
  modalidade       text,                     -- Presencial Município / Presencial SEASS / Remoto
  tipo             text,                     -- Particularizado / Integrado / Semi-Integrado
  local_ou_link    text,
  responsaveis     uuid[],                   -- ou tabela de ligação
  status           text default 'agendada',  -- agendada | realizada | reagendada | cancelada
  observacoes      text
);

create table historico_solicitacao (
  id             bigserial primary key,
  solicitacao_id bigint not null references solicitacao_apoio(id) on delete cascade,
  em             timestamptz default now(),
  por            uuid references auth.users(id),
  de_situacao    situacao_solicitacao,
  para_situacao  situacao_solicitacao,
  comentario     text
);

create table perfil (
  user_id uuid primary key references auth.users(id),
  nome text, papel text check (papel in ('consulta','gerencia','coordenacao','admin')),
  gerencia text
);
```
Pontos de desenho:
- **Vínculo com `apoio_tecnico`**: se a tabela tiver `id`, guardar em `apoio_tecnico_id`; se não, criar `id` (chave primária) antes. Ao concluir, uma função insere o registro em `apoio_tecnico` com os 11 campos preenchidos a partir da solicitação + atividade, **uma única vez** (idempotente).
- Padronizar **valores controlados** (modalidade, tipo, gerência, categoria) em **tabelas de domínio** ou `enum`, para acabar com variações de grafia (hoje tratadas por normalização no front-end).
- `municipio` com `chave` igual à normalização usada no painel (`norm()`), para casar com `apoio_tecnico.municipio`.
- Índices: `(situacao)`, `(municipio_id)`, `(gerencia, situacao)`, `(data_solicitacao)`.
- **View de pendências**: `situacao not in ('concluido','cancelado')` com `current_date - data_solicitacao` como idade em dias, e próxima atividade agendada.
- **RLS**: `consulta` só `SELECT`; `gerencia` `INSERT/UPDATE` quando `gerencia = perfil.gerencia`; `coordenacao` e `admin` amplo. Nada de escrita para `anon`.

### 9.3 Telas sugeridas
1. **Caixa de pendências** (lista + kanban por situação, filtros, ordenação por idade/prioridade).
2. **Nova solicitação / detalhe** (dados, linha do tempo/histórico, atividades, anexos futuros).
3. **Calendário** de atividades.
4. **Visão por município** (reaproveitar `municipio.html`: concluídos + pendentes + agenda).
5. **Painel de monitoramento** (indicadores de backlog, atraso, tempo de atendimento; mapa com **pendências por município/RD**, reaproveitando o mapa do v1).
6. **Administração** (usuários, perfis, listas controladas).

### 9.4 Integração com o painel v1
- O painel passa a ter dois universos: **concluídos** (`apoio_tecnico`) e **pendentes** (`solicitacao_apoio`). Sugestão: camada "Situação" nos filtros, camada de mapa "Pendências" e os cartões de situação como no dashboard de exemplo (Suspenso/Em análise/Agendado/Concluído). O código do v1 já está preparado para exibir um gráfico de **Situação** se existir coluna `situacao`/`status`.
- Uma **view unificada** `apoios_todos` (união de concluídos + pendentes com colunas comuns) simplifica o painel e garante o mesmo total do dashboard de exemplo (2.487 em 2026, a validar).

### 9.5 Migração inicial
1. Levantar planilhas/fontes atuais de pendências (as "três bases" do mapa antigo e qualquer controle de solicitações).
2. Importar para `solicitacao_apoio` com `situacao` mapeada; **backup antes**.
3. Validar contagens por situação contra o dashboard de exemplo.
4. Congelar a planilha como fonte; o sistema vira a fonte oficial das pendências.

### 9.6 Roteiro por fases **[Proposta]**
- **Fase 0 — Descoberta (1–2 semanas)**: responder a seção 11; ver esquema real (`information_schema`), valores distintos de cada campo, existência de `id` e RLS; definir papéis.
- **Fase 1 — Núcleo**: tabelas, RLS, login, cadastro/edição de solicitações, caixa de pendências, histórico.
- **Fase 2 — Agenda**: atividades agendadas, calendário, reagendamento/suspensão, conclusão com geração em `apoio_tecnico`.
- **Fase 3 — Monitoramento**: indicadores de backlog/atraso, mapa de pendências, integração ao painel v1 (view unificada).
- **Fase 4 — Automação**: alertas por e-mail/mensagem, importação em lote, exportações, anexos.

---

## 10. Riscos e cuidados

- **Duas fontes da verdade** (planilha × banco): decidir cedo quem é oficial; o documento da base já alerta para perda de edições em reimportações.
- **Texto livre** em município/categoria/modalidade gera divergências; usar tabelas de domínio e chaves.
- **Escrita em produção** sem RLS/papéis é o maior risco de segurança; nunca usar chave privilegiada no navegador.
- **Mudança de significado de "total"**: o mapa antigo somava "Total de ATM" por linha; o painel novo conta linhas. Conferir se uma linha pode representar mais de um apoio.
- **Crescimento de dados**: o painel baixa a base inteira; quando crescer, mover agregações para o banco.
- **Siglas não definidas** (SEASS, MUPS, SICON, gerências): confirmar antes de expor em telas.

---

## 11. Perguntas em aberto (responder antes de implementar)

1. A tabela `apoio_tecnico` tem **somente concluídos**? Existe alguma coluna de **status/situação** fora das 11 documentadas? E coluna **`id`** (chave primária)?
2. Quais são os **valores reais** de `categoria`, `evento`, `modalidade`, `tipo`, `gerencia`, `devolutiva`, `avaliacao`? Qual o **tipo** de `data` (date, timestamp, texto)?
3. Uma linha = **um apoio** ou pode representar vários (como o "Total de ATM" do mapa antigo)?
4. Onde estão hoje os **apoios solicitados/pendentes** (planilhas? e-mail? sistema)? Qual o volume e o formato?
5. Quem são os **usuários** e quais **papéis** (consulta, gerência, coordenação, admin)? Há login institucional (SSO)?
6. Os dados podem ser **públicos** (chave pública com leitura aberta) ou exigem **login** até para visualizar?
7. Quais **prazos/SLA** definem atraso (dias sem triagem, antes do agendamento, devolutiva)?
8. Uma solicitação pode gerar **várias atividades** (ex.: um pedido → duas oficinas)? Uma atividade pode atender **vários municípios** (ex.: roda regional)?
9. Como tratar atividades **coletivas** (Rodas, Encontros estaduais, Oficinas) com muitos municípios participantes, no modelo de dados?
10. Precisa de **notificações** (e-mail/WhatsApp/Teams)? Qual canal?
11. O novo sistema deve rodar **no mesmo projeto Supabase** ou isolado?
12. Quais as definições oficiais de **MUPS, SICON, SEASS** e a lista correta de **gerências**?
13. Há exigência de **auditoria/LGPD** (dados pessoais de solicitantes)?
14. Sobre o **relatório PDF**: o modelo Word (Barreiros 2026) é o layout oficial para todos os municípios? Precisa de **brasão/logo** e assinatura? Vai existir versão por **RD** ou do **estado**? As cores do relatório (seção 5.6.4) devem valer também no painel?

---

## 12. Como retomar o trabalho (checklist para a próxima sessão)

1. Abrir o painel v1 com a chave real; conferir o quadro **"Como os registros foram classificados"** e ajustar `GRUPOS` em `core.js`.
2. Comparar totais do painel (ano 2026) com o dashboard de exemplo (2.487 no geral; 459 / 1.087 / 941 por categoria) para descobrir se a tabela atual é só de concluídos.
3. No Supabase (SQL Editor), rodar:
   ```sql
   select column_name, data_type, is_nullable from information_schema.columns
   where table_schema='public' and table_name='apoio_tecnico' order by ordinal_position;

   select categoria, count(*) from public.apoio_tecnico group by 1 order by 2 desc;
   select modalidade, count(*) from public.apoio_tecnico group by 1 order by 2 desc;
   select min(data), max(data), count(*) from public.apoio_tecnico;
   ```
4. Responder a seção 11 e fechar o ciclo de vida (8.2) e os papéis.
   - **Relatório PDF**: gerar um PDF no navegador com dados reais (um município pequeno e um grande, com tabela longa), conferir as 4 páginas contra o modelo Word e a fonte (acentos corretos, sem cair em Helvetica).
5. Criar `municipio` e as tabelas da seção 9.2 em um ambiente de teste (projeto Supabase de desenvolvimento, de preferência).
6. Começar pela Fase 1, reaproveitando `core.js`/`apoio.css` e a identidade visual da seção 6.

---

## 13. Anexo — estrutura técnica do `core.js` (v1)

Objeto global `window.AT` com:
- **Dados**: `MUN`, `MUN_LIST`, `RD_COLORS`, `RD_LIST`, `GRUPOS`, `OUTROS`, `PORTES`, `munKey()`, `parseDate()`, `norm()`.
- **Ciclo**: `boot()` (carrega, normaliza e devolve `{recs, meta}`), `createState(meta)`, `filterBase()`, `filterGroups()`, `aggregate()`, `countBy()`, `monthsBetween()`, `csvDownload()`.
- **Componentes de UI**: `mountPeriod()`, `mountGroupChips()`, `mountSelect()`.
- **Gráficos** (`AT.chart`): `donut()`, `bars()` (vertical/horizontal), `stackedMonthly()`.
- **Registro normalizado** (`recs[i]`): `{ i, mun, munRaw, nome, rd, porte, ymd, y, ym, grupo, sub, categoria, evento, modalidade, tipo, gerencia, devolutiva, avaliacao, situacao }`, onde `ymd` é inteiro `AAAAMMDD` e `mun` é a chave normalizada do município.
- **Relatório PDF** (arquivos separados): `window.RP.gerarPDF(opts)` em `relatorio.js` e `window.RELATORIO_CONFIG` em `relatorio-config.js` (seção 5.6). Usa os campos `ymd`, `grupo`, `sub`, `evento`, `modalidade`, `tipo`, `gerencia`, `i` do registro normalizado.
- **Configuração** em `window.APOIO_CONFIG` (`SUPABASE_URL`, `SUPABASE_KEY`, `TABELA`, `COLUNAS`, `CACHE_MINUTOS`).
- Chaves de armazenamento: `localStorage.apoio_supabase_key`, `sessionStorage.apoio_cache_v1`, `sessionStorage.apoio_demo`, `localStorage.relatorio_fonts_carlito_v1` (cache da fonte do relatório).

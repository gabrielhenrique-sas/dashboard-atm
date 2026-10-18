SISTEMA DE VISUALIZAÇÃO — APOIO TÉCNICO / PERNAMBUCO
====================================================

ARQUIVOS (mantenha todos na mesma pasta)
  index.html      Painel geral: indicadores, mapa, ranking, gráficos e tabela
  municipio.html  Pesquisa de município e seus principais dados
  core.js         Lógica compartilhada (conexão, classificação, filtros, gráficos)
  apoio.css       Estilos
  config.js       Configuração (URL, chave pública, nomes das colunas)

COMO COLOCAR PARA FUNCIONAR
1. Abra config.js e, se quiser, preencha SUPABASE_KEY com a chave PÚBLICA
   (anon / publishable) do projeto. Se deixar vazio, o sistema pede a chave
   na primeira abertura e a guarda só no navegador de quem digitou.
   NUNCA use a chave service_role ou qualquer chave secreta.
2. No Supabase, a tabela apoio_tecnico precisa de uma política RLS que
   permita SELECT para a chave pública (somente leitura).
3. Publique a pasta (GitHub Pages, Netlify, servidor interno etc.)
   ou abra index.html por um servidor local.
4. Para testar a interface sem a base: index.html?demo=1

COMPORTAMENTO
- Por padrão o período é o ano atual (pelo relógio do computador).
  Se a base não tiver dados desse ano, usa o último ano com dados.
- O usuário pode trocar o ano, escolher "Todo o período" ou digitar
  qualquer intervalo de datas (2023 a 2026).
- O período escolhido é levado do painel para a página do município.

AJUSTES QUE PODEM SER NECESSÁRIOS
- Classificação das categorias: regras GRUPOS no começo de core.js.
  O quadro "Como os registros foram classificados", no fim do painel,
  mostra cada valor de "categoria" da base e o grupo atribuído.
- Nomes de município que não batem com o cadastro aparecem nesse mesmo quadro.

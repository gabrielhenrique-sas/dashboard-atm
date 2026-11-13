/* ==========================================================
   Relatório PDF · configuração visual
   Réplica do modelo Word "Barreiros_Apoios_Tecnicos_2026.docx"
   (A4 paisagem, fonte Calibri/Carlito, uma seção por página)
   ========================================================== */
window.RELATORIO_CONFIG = {

  cores: {
    // Cor de cada seção: 1 = ATMs (verde) · 2 = Rodas (rosa) · 3 = MUPS/Oficinas/Encontros (roxo) · 4 = Outras (cinza)
    secoes: ['#1f9d6b', '#d6336c', '#6f42c1', '#64748b'],
    // Tom claro de cada seção (faixa do subtítulo, linhas alternadas, linha do resumo)
    secoesClaras: ['#e6f5ee', '#fce8ef', '#eee8fa', '#f1f4f9'],

    // Identidade geral
    azulEscuro: '#1b2a4a',      // título, valores dos cards, cabeçalho do resumo
    verdeAgua: '#2bb3a3',       // linha sob o título e barras laterais dos cards
    fundoCard: '#f1f4f9',       // fundo dos cards e da linha "Total geral"
    bordaTabela: '#d0d5dd',

    // Texto
    textoPrincipal: '#000000',  // texto das tabelas
    textoDescricao: '#333b4a',  // descrição da seção
    textoSecundario: '#5b6577', // subtítulo e rótulos dos cards
    textoFaixa: '#ffffff',
    textoRodape: '#7a8396'
  },

  fontes: {
    familia: 'Carlito',   // equivalente livre da Calibri (mesmas métricas)
    tituloPrincipal: 28,
    subtituloPrincipal: 15,
    labelCard: 9,
    valorCard: 14,
    tituloBloco: 16,      // "Filtros Aplicados:" e "Resumo por categoria"
    tituloSecao: 16,      // faixa colorida da seção
    subtituloSecao: 11,
    descricaoSecao: 11,
    linhaTotais: 11,
    tituloSubsecao: 13,   // "Oficinas (3)" / "Encontros (3)"
    tabela: 10,
    resumoNumero: 12,
    rodape: 9
  },

  fontesArquivo: {
    regular: [
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Regular.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Regular.ttf'
    ],
    bold: [
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Bold.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Bold.ttf'
    ],
    italic: [
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Italic.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Italic.ttf'
    ]
  },

  imagens: { brasao: null, logoDireita: null },

  textos: {
    subtituloPrincipal: 'Registros de Apoio Técnico',
    labelRD: 'Região de Desenvolvimento',
    labelPorte: 'Porte',

    tituloFiltros: 'Filtros Aplicados:',
    labelFiltroPeriodo: 'Período Selecionado',
    labelFiltroModalidades: 'Modalidades Selecionadas',
    labelFiltroGerencia: 'Gerências',
    todasGerencia: 'Todas',
    nenhumaModalidade: 'Nenhuma',

    tituloResumo: 'Resumo por categoria',
    colCategoria: 'Categoria',
    colTotal: 'Total',
    linhaTotalGeral: 'Total geral',

    secao1: {
      titulo: '1. ATMs Individuais',
      tituloCurto: 'ATMs Individuais',
      subtitulo: 'Apoio Técnico Individualizado',
      descricao: 'Apoios técnicos individualizados prestados ao município.'
    },
    secao2: {
      titulo: '2. Rodas de Diálogo',
      tituloCurto: 'Rodas de Diálogo',
      subtitulo: 'Reuniões e apoios em formato de roda de diálogo',
      descricao: 'Reuniões e apoios técnicos realizados em formato de roda de diálogo.'
    },
    secao3: {
      titulo: '3. MUPS, Oficinas, SICON e Encontros',
      tituloCurto: 'MUPS, Oficinas, SICON e Encontros',
      subtitulo: 'Oficinas, MUPS e SICON · Encontros estaduais',
      descricao: 'Participações em Oficinas, MUPS e SICON, além de Encontros Estaduais.',
      subOficinasTotal: 'Oficinas, MUPS e SICON',
      subEncontrosTotal: 'Encontros estaduais',
      subTituloOficinas: 'Oficinas',
      subTituloEncontros: 'Encontros'
    },
    secao4: {
      titulo: '4. Outras categorias',
      tituloCurto: 'Outras categorias',
      subtitulo: 'Registros não classificados nas categorias anteriores',
      descricao: 'Registros que não corresponderam às categorias padronizadas.'
    },

    semRegistros: 'Nenhum registro no período para esta categoria.',
    rodapeSeparador: '  |  ',
    rodapePrefixoPagina: 'Página'
  },

  // Medidas em milímetros (A4 paisagem = 297 × 210)
  layout: {
    orientacao: 'landscape',
    margem: { top: 17.64, bottom: 17.64, left: 17.64, right: 17.64 },
    recuoTabela: 2.12,          // recuo das tabelas em relação à margem
    // larguras das colunas (mm)
    colunas5: [22.9, 111.8, 38.8, 30.0, 26.5],   // Data | Evento | Modalidade | Tipo | Gerência
    colunas3: [22.9, 111.8, 26.5],               // Data | Evento | Gerência
    larguraCard: 65.4,
    larguraResumo: [91.7, 26.5],                 // Categoria | Total
    umaSecaoPorPagina: true
  }
};

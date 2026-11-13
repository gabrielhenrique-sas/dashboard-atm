/* ==========================================================
   Relatório PDF · geração
   Réplica do modelo Word (A4 paisagem, Calibri/Carlito)
   Uso: await RP.gerarPDF({ municipio, registros, from, to, filtros, meta, hasOutros })
   ========================================================== */
(function () {
  'use strict';

  const CFG = window.RELATORIO_CONFIG || {};

  /* ---------- Utilidades ---------- */
  function mergeDeep(target, source) {
    for (const k in source) {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        if (!target[k]) target[k] = {};
        mergeDeep(target[k], source[k]);
      } else if (source[k] !== undefined) {
        target[k] = source[k];
      }
    }
    return target;
  }
  const R = mergeDeep({}, CFG);

  function hexToRgb(hex) {
    const m = (hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
  }
  function fmtDate(v) {
    if (!v) return '—';
    const d = String(v % 100).padStart(2, '0');
    const m = String(Math.floor(v / 100) % 100).padStart(2, '0');
    const y = Math.floor(v / 10000);
    return `${d}/${m}/${y}`;
  }
  function anoLabel(from, to) {
    const y1 = Math.floor(from / 10000), y2 = Math.floor(to / 10000);
    return y1 === y2 ? String(y1) : `${y1}–${y2}`;
  }
  function titleCase(s) {
    return String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
  }

  /* ---------- Métricas (Calibri: linha = 1,22 × corpo; linha de base = 0,93 × corpo) ---------- */
  const PT = 0.3528;                                  // 1 pt em mm
  const lineH = pt => pt * PT * 1.22;                 // altura da linha
  const base = pt => pt * PT * 0.93;                  // distância topo da linha → linha de base
  const tw = twips => twips * 0.017639;               // twips → mm

  /* ---------- Fontes ---------- */
  let fallbackMode = false;
  let hasItalic = false;
  const FONT_CACHE_KEY = 'relatorio_fonts_carlito_v1';
  const FONT = () => (fallbackMode ? 'helvetica' : R.fontes.familia);

  function stripAccents(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function txt(pdf, str, x, y, opts) {
    pdf.text(fallbackMode ? stripAccents(str) : str, x, y, opts);
  }
  function stripMatrix(m) {
    if (!fallbackMode) return m;
    return m.map(row => row.map(cell => stripAccents(cell)));
  }

  async function tryLoadFont(urls) {
    if (!urls) return null;
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(FONT_CACHE_KEY) || '{}'); } catch (e) {}
    const list = Array.isArray(urls) ? urls : [urls];
    for (const url of list) {
      if (cache[url]) return cache[url];
      try {
        const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
        if (!res.ok) continue;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let bin = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
        }
        const b64 = btoa(bin);
        cache[url] = b64;
        try { localStorage.setItem(FONT_CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
        return b64;
      } catch (e) {}
    }
    return null;
  }

  async function registerFonts(pdf) {
    const reg = await tryLoadFont(R.fontesArquivo.regular);
    const bold = await tryLoadFont(R.fontesArquivo.bold);
    const italic = await tryLoadFont(R.fontesArquivo.italic);

    if (!reg && !bold) {
      fallbackMode = true;
      pdf.setFont('helvetica', 'normal');
      console.warn('[relatorio] Fonte personalizada indisponível. Usando Helvetica sem acentos.');
      return;
    }
    pdf.addFileToVFS('Relatorio-Regular.ttf', reg || bold);
    pdf.addFont('Relatorio-Regular.ttf', R.fontes.familia, 'normal');
    pdf.addFileToVFS('Relatorio-Bold.ttf', bold || reg);
    pdf.addFont('Relatorio-Bold.ttf', R.fontes.familia, 'bold');
    if (italic) {
      pdf.addFileToVFS('Relatorio-Italic.ttf', italic);
      pdf.addFont('Relatorio-Italic.ttf', R.fontes.familia, 'italic');
      hasItalic = true;
    }
    pdf.setFont(R.fontes.familia, 'normal');
  }

  /* ---------- Helpers de desenho ---------- */
  function rect(pdf, x, y, w, h, hex) {
    pdf.setFillColor.apply(pdf, hexToRgb(hex));
    pdf.rect(x, y, w, h, 'F');
  }
  function setText(pdf, style, size, hex) {
    pdf.setFont(FONT(), style);
    pdf.setFontSize(size);
    pdf.setTextColor.apply(pdf, hexToRgb(hex));
  }

  /* ---------- Card com barra lateral (verde-água) ----------
     Retorna a altura do card. linhas = array de strings do valor. */
  function drawCard(pdf, x, y, w, label, linhas, forcarAltura) {
    const C = R.cores, F = R.fontes;
    const pad = tw(120), padL = 2.75, barra = 1.06;
    const h = pad + lineH(F.labelCard) + linhas.length * lineH(F.valorCard) + pad;
    const altura = Math.max(h, forcarAltura || 0);

    rect(pdf, x, y, w, altura, C.fundoCard);
    rect(pdf, x, y, barra, altura, C.verdeAgua);

    setText(pdf, 'normal', F.labelCard, C.textoSecundario);
    txt(pdf, label, x + barra + padL, y + pad + base(F.labelCard));

    setText(pdf, 'bold', F.valorCard, C.azulEscuro);
    let ty = y + pad + lineH(F.labelCard);
    linhas.forEach(l => {
      txt(pdf, l, x + barra + padL, ty + base(F.valorCard));
      ty += lineH(F.valorCard);
    });
    return altura;
  }

  /* ---------- Título de bloco (Filtros Aplicados / Resumo) ---------- */
  function drawTituloBloco(pdf, texto, y) {
    const m = R.layout.margem, F = R.fontes;
    setText(pdf, 'bold', F.tituloBloco, R.cores.azulEscuro);
    txt(pdf, texto, m.left, y + base(F.tituloBloco));
    return y + lineH(F.tituloBloco) + tw(120);
  }

  /* ---------- Página 1 ---------- */
  function drawCapa(pdf, o) {
    const { municipio, from, to, registros, contagem, hasOutros, filtros } = o;
    const m = R.layout.margem, F = R.fontes, C = R.cores, L = R.layout;
    const pageW = pdf.internal.pageSize.getWidth();
    const contentW = pageW - m.left - m.right;
    let y = m.top;

    // Título
    setText(pdf, 'bold', F.tituloPrincipal, C.azulEscuro);
    txt(pdf, municipio.nome.toUpperCase(), m.left, y + base(F.tituloPrincipal));
    y += lineH(F.tituloPrincipal) + tw(40);

    // Subtítulo + linha verde-água
    setText(pdf, 'normal', F.subtituloPrincipal, C.textoSecundario);
    txt(pdf, R.textos.subtituloPrincipal, m.left, y + base(F.subtituloPrincipal));
    y += lineH(F.subtituloPrincipal) + tw(120);
    rect(pdf, m.left, y, contentW, 0.79, C.verdeAgua);
    y += 0.79 + tw(160);

    // Cards: RD | Porte
    const x0 = m.left + L.recuoTabela + 0.4;
    drawCard(pdf, x0, y, L.larguraCard, R.textos.labelRD, [municipio.rd || '—']);
    const hCards = drawCard(pdf, x0 + L.larguraCard, y, L.larguraCard, R.textos.labelPorte, [municipio.porte || '—']);
    y += hCards + 14.0;

    // Filtros aplicados
    y = drawTituloBloco(pdf, R.textos.tituloFiltros, y);
    const periodo = [fmtDate(from), 'a', fmtDate(to)];
    const modsObj = (filtros && filtros.modalidades) || {};
    let mods = Object.keys(modsObj).filter(k => modsObj[k]);
    const modsLinhas = mods.length
      ? mods.map((k, i) => k + (i === mods.length - 1 ? '.' : ';'))
      : [R.textos.nenhumaModalidade];
    const ger = (filtros && filtros.gerencia) ? [filtros.gerencia] : [R.textos.todasGerencia];

    const nLinhas = Math.max(periodo.length, modsLinhas.length, ger.length);
    const hFiltros = tw(120) * 2 + lineH(F.labelCard) + nLinhas * lineH(F.valorCard);
    drawCard(pdf, x0, y, L.larguraCard, R.textos.labelFiltroPeriodo, periodo, hFiltros);
    drawCard(pdf, x0 + L.larguraCard, y, L.larguraCard, R.textos.labelFiltroModalidades, modsLinhas, hFiltros);
    drawCard(pdf, x0 + L.larguraCard * 2, y, L.larguraCard, R.textos.labelFiltroGerencia, ger, hFiltros);
    y += hFiltros + 14.15;

    // Resumo por categoria
    y = drawTituloBloco(pdf, R.textos.tituloResumo, y);

    const linhas = [
      { nome: R.textos.secao1.tituloCurto, n: contagem.individual || 0, i: 0 },
      { nome: R.textos.secao2.tituloCurto, n: contagem.roda || 0, i: 1 },
      { nome: R.textos.secao3.tituloCurto, n: contagem.evento || 0, i: 2 }
    ];
    if (hasOutros && (contagem.outros || 0) > 0) {
      linhas.push({ nome: R.textos.secao4.tituloCurto, n: contagem.outros, i: 3 });
    }
    const corpo = linhas.map(l => [l.nome, String(l.n)]);
    corpo.push([R.textos.linhaTotalGeral, String(registros.length)]);

    const wRes = L.larguraResumo[0] + L.larguraResumo[1];
    const left = (pageW - wRes) / 2;
    const pad = { top: tw(90), bottom: tw(90), left: tw(120), right: tw(120) };

    pdf.autoTable({
      startY: y,
      head: stripMatrix([[R.textos.colCategoria, R.textos.colTotal]]),
      body: stripMatrix(corpo),
      margin: { left: left, right: left, top: m.top, bottom: m.bottom },
      tableWidth: wRes,
      theme: 'grid',
      styles: {
        font: FONT(), fontSize: F.tabela, cellPadding: pad, valign: 'middle',
        textColor: hexToRgb(C.textoPrincipal), lineColor: hexToRgb(C.bordaTabela), lineWidth: 0.18,
        lineHeightFactor: 1.22
      },
      headStyles: { fillColor: hexToRgb(C.azulEscuro), textColor: 255, fontStyle: 'bold', fontSize: F.tabela, minCellHeight: 7.6 },
      bodyStyles: { fontStyle: 'bold', minCellHeight: 8.5 },
      columnStyles: {
        0: { cellWidth: L.larguraResumo[0] },
        1: { cellWidth: L.larguraResumo[1], halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index === 1) data.cell.styles.halign = 'center';
        if (data.section !== 'body') return;
        const ultima = data.row.index === corpo.length - 1;
        data.cell.styles.fillColor = ultima ? hexToRgb(C.fundoCard)
          : (data.column.index === 0 ? hexToRgb(C.secoesClaras[linhas[data.row.index].i]) : [255, 255, 255]);
        if (data.column.index === 0 && !ultima) {
          data.cell.styles.textColor = hexToRgb(C.secoes[linhas[data.row.index].i]);
        }
        if (data.column.index === 1) data.cell.styles.fontSize = F.resumoNumero;
      }
    });
  }

  /* ---------- Faixas de seção ---------- */
  function drawFaixasSecao(pdf, cfg, idxCor, y0) {
    const m = R.layout.margem, F = R.fontes, C = R.cores;
    const pageW = pdf.internal.pageSize.getWidth();
    const contentW = pageW - m.left - m.right;
    const cor = C.secoes[idxCor], clara = C.secoesClaras[idxCor];
    let y = y0;

    // Faixa do título (ex.: "  1.  ATMS INDIVIDUAIS")
    const hT = lineH(F.tituloSecao);
    rect(pdf, m.left, y, contentW, hT, cor);
    setText(pdf, 'bold', F.tituloSecao, C.textoFaixa);
    txt(pdf, '  ' + cfg.titulo.replace(/^(\d+\.)\s*/, '$1  ').toUpperCase(), m.left, y + base(F.tituloSecao));
    y += hT;

    // Faixa do subtítulo (itálico, tom claro)
    const hS = lineH(F.subtituloSecao);
    rect(pdf, m.left, y, contentW, hS, clara);
    setText(pdf, hasItalic ? 'italic' : 'normal', F.subtituloSecao, cor);
    txt(pdf, '  ' + cfg.subtitulo, m.left, y + base(F.subtituloSecao));
    y += hS + tw(120) - 1.0;

    // Descrição
    y += tw(60);
    setText(pdf, 'normal', F.descricaoSecao, C.textoDescricao);
    txt(pdf, cfg.descricao, m.left, y + base(F.descricaoSecao));
    y += lineH(F.descricaoSecao) + tw(40);
    return y;
  }

  function drawLinhaTotais(pdf, texto, cor, y) {
    const m = R.layout.margem, F = R.fontes;
    setText(pdf, 'bold', F.linhaTotais, cor);
    txt(pdf, texto, m.left, y + base(F.linhaTotais));
    return y + lineH(F.linhaTotais) + tw(160);
  }

  /* ---------- Tabela de registros ---------- */
  function drawTabela(pdf, o) {
    const { head, body, widths, cor, clara, y } = o;
    const m = R.layout.margem, F = R.fontes, C = R.cores, L = R.layout;
    const total = widths.reduce((a, b) => a + b, 0);
    const colStyles = {};
    widths.forEach((w, i) => { colStyles[i] = { cellWidth: w }; });
    colStyles[0].fontStyle = 'bold';

    pdf.autoTable({
      startY: y,
      head: stripMatrix([head]),
      body: stripMatrix(body),
      margin: { left: m.left + L.recuoTabela, right: m.right, top: m.top, bottom: m.bottom + 8 },
      tableWidth: total,
      theme: 'grid',
      styles: {
        font: FONT(), fontSize: F.tabela, valign: 'middle',
        cellPadding: { top: tw(90), bottom: tw(90), left: tw(120), right: tw(120) },
        textColor: hexToRgb(C.textoPrincipal), lineColor: hexToRgb(C.bordaTabela), lineWidth: 0.18,
        lineHeightFactor: 1.27
      },
      headStyles: { fillColor: hexToRgb(cor), textColor: 255, fontStyle: 'bold', fontSize: F.tabela },
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.fillColor = data.row.index % 2 === 1 ? hexToRgb(clara) : [255, 255, 255];
          data.cell.styles.minCellHeight = 7.7;
        }
      }
    });
    return pdf.lastAutoTable.finalY;
  }

  /* ---------- Seção padrão (1, 2 e 4) ---------- */
  function drawSecaoPadrao(pdf, o) {
    const { cfg, idx, registros } = o;
    const m = R.layout.margem, C = R.cores, L = R.layout;
    let y = drawFaixasSecao(pdf, cfg, idx, m.top);

    if (registros.length === 0) {
      setText(pdf, 'normal', R.fontes.corpo || 10, C.textoSecundario);
      txt(pdf, R.textos.semRegistros, m.left, y + 6);
      return;
    }
    const porMod = {};
    registros.forEach(r => { porMod[r.modalidade] = (porMod[r.modalidade] || 0) + 1; });
    const linha = ['Total: ' + registros.length]
      .concat(Object.keys(porMod).map(k => `${k}: ${porMod[k]}`)).join('  |  ');
    y = drawLinhaTotais(pdf, linha, C.secoes[idx], y);

    drawTabela(pdf, {
      head: ['Data', 'Evento', 'Modalidade', 'Tipo', 'Gerência'],
      body: registros.map(r => [fmtDate(r.ymd), r.evento || '—', r.modalidade, r.tipo, r.gerencia]),
      widths: L.colunas5, cor: C.secoes[idx], clara: C.secoesClaras[idx], y
    });
  }

  /* ---------- Subseção (Oficinas / Encontros) ---------- */
  function drawSubsecao(pdf, o) {
    const { titulo, idx, linhas, y: y0 } = o;
    const m = R.layout.margem, F = R.fontes, C = R.cores, L = R.layout;
    const pageH = pdf.internal.pageSize.getHeight();
    let y = y0;
    const hTit = lineH(F.tituloSubsecao);
    if (y + hTit + 30 > pageH - m.bottom - 8) { pdf.addPage(); y = m.top; }

    // barra lateral + título
    rect(pdf, m.left - tw(160) - 1.06, y, 1.06, hTit, C.secoes[idx]);
    setText(pdf, 'bold', F.tituloSubsecao, C.azulEscuro);
    txt(pdf, titulo, m.left, y + base(F.tituloSubsecao));
    y += hTit + tw(100);

    const fim = drawTabela(pdf, {
      head: ['Data', 'Evento', 'Gerência'],
      body: linhas, widths: L.colunas3, cor: C.secoes[idx], clara: C.secoesClaras[idx], y
    });
    return fim + tw(160);
  }

  /* ---------- Função principal ---------- */
  async function gerarPDF(opts) {
    const { municipio, registros, from, to, filtros } = opts;
    const ano = anoLabel(from, to);
    const ord = g => registros.filter(r => r.grupo === g).slice().sort((a, b) => a.ymd - b.ymd || a.i - b.i);

    const individuais = ord('individual');
    const rodas = ord('roda');
    const eventos = ord('evento');
    const outros = ord('outros');
    const ofOficinas = eventos.filter(r => r.sub !== 'Encontros estaduais');
    const ofEncontros = eventos.filter(r => r.sub === 'Encontros estaduais');
    const contagem = { individual: individuais.length, roda: rodas.length, evento: eventos.length, outros: outros.length };

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: R.layout.orientacao || 'landscape' });
    await registerFonts(pdf);
    pdf.setLineHeightFactor(1.255);

    const m = R.layout.margem, F = R.fontes, C = R.cores, T = R.textos;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Página 1 – capa
    drawCapa(pdf, { municipio, from, to, registros, contagem, hasOutros: opts.hasOutros, filtros });

    // Seção 1 – ATMs individuais
    pdf.addPage();
    drawSecaoPadrao(pdf, { cfg: T.secao1, idx: 0, registros: individuais });

    // Seção 2 – Rodas de diálogo
    pdf.addPage();
    drawSecaoPadrao(pdf, { cfg: T.secao2, idx: 1, registros: rodas });

    // Seção 3 – MUPS, Oficinas, SICON e Encontros
    pdf.addPage();
    let y = drawFaixasSecao(pdf, T.secao3, 2, m.top);
    if (eventos.length === 0) {
      setText(pdf, 'normal', 10, C.textoSecundario);
      txt(pdf, T.semRegistros, m.left, y + 6);
    } else {
      y = drawLinhaTotais(pdf,
        `Total: ${eventos.length}  |  ${T.secao3.subOficinasTotal}: ${ofOficinas.length}  |  ${T.secao3.subEncontrosTotal}: ${ofEncontros.length}`,
        C.secoes[2], y) - tw(160) + 3.0;
      const linhasDe = arr => arr.map(r => [fmtDate(r.ymd), r.evento || '—', r.gerencia]);
      y = drawSubsecao(pdf, { titulo: `${T.secao3.subTituloOficinas} (${ofOficinas.length})`, idx: 2, linhas: linhasDe(ofOficinas), y });
      y = drawSubsecao(pdf, { titulo: `${T.secao3.subTituloEncontros} (${ofEncontros.length})`, idx: 2, linhas: linhasDe(ofEncontros), y });
    }

    // Seção 4 – Outras categorias (só aparece se houver registros)
    if (outros.length > 0) {
      pdf.addPage();
      drawSecaoPadrao(pdf, { cfg: T.secao4, idx: 3, registros: outros });
    }

    // Rodapé (alinhado à direita, em todas as páginas)
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      setText(pdf, 'normal', F.rodape, C.textoRodape);
      const nome = titleCase(municipio.nome);
      const foot = `${nome} · Apoios Técnicos ${ano}${T.rodapeSeparador}${T.rodapePrefixoPagina} ${i}`;
      txt(pdf, foot, pageW - m.right, pageH - tw(708) - lineH(F.rodape) + base(F.rodape), { align: 'right' });
    }

    const nomeArq = `${municipio.nome.replace(/\s+/g, '_')}_Apoios_Tecnicos_${ano.replace(/[^\d-]/g, '_')}.pdf`;
    pdf.save(nomeArq);
    return nomeArq;
  }

  window.RP = { gerarPDF };
})();

/* ==========================================================
   Apoio Técnico · Pernambuco — núcleo compartilhado
   Conexão com o Supabase, normalização, classificação,
   filtros, agregações e componentes de interface.
   ========================================================== */
(function () {
  'use strict';

  const CFG = Object.assign({
    SUPABASE_URL: '', SUPABASE_KEY: '', TABELA: 'apoio_tecnico', CACHE_MINUTOS: 10, COLUNAS: {}
  }, window.APOIO_CONFIG || {});
  const COL = Object.assign({
    categoria: 'categoria', evento: 'evento', municipio: 'municipio', rd: 'rd', porte: 'porte', data: 'data',
    modalidade: 'modalidade', tipo: 'tipo', gerencia: 'gerencia', devolutiva: 'devolutiva', avaliacao: 'avaliacao'
  }, CFG.COLUNAS || {});

  /* ---------- Utilidades ---------- */
  const norm = s => (s == null ? '' : String(s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (Number(n) || 0).toLocaleString('pt-BR');
  const fmt1 = n => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (a, b) => b ? (a / b * 100) : 0;
  const pad = n => String(n).padStart(2, '0');
  const ymdOf = (y, m, d) => y * 10000 + m * 100 + d;
  const ymdToIso = v => `${Math.floor(v / 10000)}-${pad(Math.floor(v / 100) % 100)}-${pad(v % 100)}`;
  const isoToYmd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? ymdOf(+m[1], +m[2], +m[3]) : null; };
  const fmtDate = v => v ? `${pad(v % 100)}/${pad(Math.floor(v / 100) % 100)}/${Math.floor(v / 10000)}` : '—';
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const ymLabel = ym => { const [y, m] = ym.split('-'); return `${MESES[+m - 1]}/${y.slice(2)}`; };

  function parseDate(v) {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return ymdOf(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (m) return ymdOf(+m[3], +m[2], +m[1]);
    const t = Date.parse(s);
    if (!isNaN(t)) { const d = new Date(t); return ymdOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
    return null;
  }

  /* ---------- Cadastro de municípios (RD e porte) ---------- */
  const MUN_RAW = {"abreu e lima":["Abreu e Lima","RD 12 - Região Metropolitana","Médio Porte"],"afogados da ingazeira":["Afogados da Ingazeira","RD 05 - Sertão do Pajeú","Pequeno Porte II"],"afranio":["Afrânio","RD 02 - Sertão do São Francisco","Pequeno Porte I"],"agrestina":["Agrestina","RD 08 - Agreste Central","Pequeno Porte II"],"agua preta":["Água Preta","RD 10 - Mata Sul","Pequeno Porte II"],"aguas belas":["Águas Belas","RD 07 - Agreste Meridional","Pequeno Porte II"],"alagoinha":["Alagoinha","RD 08 - Agreste Central","Pequeno Porte I"],"alianca":["Aliança","RD 11 - Mata Norte","Pequeno Porte II"],"altinho":["Altinho","RD 08 - Agreste Central","Pequeno Porte II"],"amaraji":["Amaraji","RD 10 - Mata Sul","Pequeno Porte I"],"angelim":["Angelim","RD 07 - Agreste Meridional","Pequeno Porte I"],"aracoiaba":["Araçoiaba","RD 12 - Região Metropolitana","Pequeno Porte I"],"araripina":["Araripina","RD 03 - Sertão do Araripe","Médio Porte"],"arcoverde":["Arcoverde","RD 06 - Sertão do Moxotó","Médio Porte"],"barra de guabiraba":["Barra de Guabiraba","RD 08 - Agreste Central","Pequeno Porte I"],"barreiros":["Barreiros","RD 10 - Mata Sul","Pequeno Porte II"],"belem de maria":["Belém de Maria","RD 10 - Mata Sul","Pequeno Porte I"],"belem do sao francisco":["Belém do São Francisco","RD 01 - Sertão de Itaparica","Pequeno Porte I"],"belo jardim":["Belo Jardim","RD 08 - Agreste Central","Médio Porte"],"betania":["Betânia","RD 06 - Sertão do Moxotó","Pequeno Porte I"],"bezerros":["Bezerros","RD 08 - Agreste Central","Médio Porte"],"bodoco":["Bodocó","RD 03 - Sertão do Araripe","Pequeno Porte II"],"bom conselho":["Bom Conselho","RD 07 - Agreste Meridional","Pequeno Porte II"],"bom jardim":["Bom Jardim","RD 09 - Agreste Setentrional","Pequeno Porte II"],"bonito":["Bonito","RD 08 - Agreste Central","Pequeno Porte II"],"brejao":["Brejão","RD 07 - Agreste Meridional","Pequeno Porte I"],"brejinho":["Brejinho","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"brejo da madre de deus":["Brejo da Madre de Deus","RD 08 - Agreste Central","Pequeno Porte II"],"buenos aires":["Buenos Aires","RD 11 - Mata Norte","Pequeno Porte I"],"buique":["Buíque","RD 07 - Agreste Meridional","Médio Porte"],"cabo de santo agostinho":["Cabo de Santo Agostinho","RD 12 - Região Metropolitana","Grande Porte"],"cabrobo":["Cabrobó","RD 02 - Sertão do São Francisco","Pequeno Porte II"],"cachoeirinha":["Cachoeirinha","RD 08 - Agreste Central","Pequeno Porte I"],"caetes":["Caetés","RD 07 - Agreste Meridional","Pequeno Porte II"],"calcado":["Calçado","RD 07 - Agreste Meridional","Pequeno Porte I"],"calumbi":["Calumbi","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"camaragibe":["Camaragibe","RD 12 - Região Metropolitana","Grande Porte"],"camocim de sao felix":["Camocim de São Félix","RD 08 - Agreste Central","Pequeno Porte I"],"camutanga":["Camutanga","RD 11 - Mata Norte","Pequeno Porte I"],"canhotinho":["Canhotinho","RD 07 - Agreste Meridional","Pequeno Porte II"],"capoeiras":["Capoeiras","RD 07 - Agreste Meridional","Pequeno Porte I"],"carnaiba":["Carnaíba","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"carnaubeira da penha":["Carnaubeira da Penha","RD 01 - Sertão de Itaparica","Pequeno Porte I"],"carpina":["Carpina","RD 11 - Mata Norte","Médio Porte"],"caruaru":["Caruaru","RD 08 - Agreste Central","Grande Porte"],"casinhas":["Casinhas","RD 09 - Agreste Setentrional","Pequeno Porte I"],"catende":["Catende","RD 10 - Mata Sul","Pequeno Porte II"],"cedro":["Cedro","RD 04 - Sertão Central","Pequeno Porte I"],"cha de alegria":["Chã de Alegria","RD 11 - Mata Norte","Pequeno Porte I"],"cha grande":["Chã Grande","RD 10 - Mata Sul","Pequeno Porte II"],"condado":["Condado","RD 11 - Mata Norte","Pequeno Porte II"],"correntes":["Correntes","RD 07 - Agreste Meridional","Pequeno Porte I"],"cortes":["Cortês","RD 10 - Mata Sul","Pequeno Porte I"],"cumaru":["Cumaru","RD 09 - Agreste Setentrional","Pequeno Porte I"],"cupira":["Cupira","RD 08 - Agreste Central","Pequeno Porte II"],"custodia":["Custódia","RD 06 - Sertão do Moxotó","Pequeno Porte II"],"dormentes":["Dormentes","RD 02 - Sertão do São Francisco","Pequeno Porte I"],"escada":["Escada","RD 10 - Mata Sul","Médio Porte"],"exu":["Exu","RD 03 - Sertão do Araripe","Pequeno Porte II"],"feira nova":["Feira Nova","RD 09 - Agreste Setentrional","Pequeno Porte II"],"fernando de noronha":["Fernando de Noronha","RD 12 - Região Metropolitana","Pequeno Porte I"],"ferreiros":["Ferreiros","RD 11 - Mata Norte","Pequeno Porte I"],"flores":["Flores","RD 05 - Sertão do Pajeú","Pequeno Porte II"],"floresta":["Floresta","RD 01 - Sertão de Itaparica","Pequeno Porte II"],"frei miguelinho":["Frei Miguelinho","RD 09 - Agreste Setentrional","Pequeno Porte I"],"gameleira":["Gameleira","RD 10 - Mata Sul","Pequeno Porte I"],"garanhuns":["Garanhuns","RD 07 - Agreste Meridional","Grande Porte"],"gloria do goita":["Glória do Goitá","RD 11 - Mata Norte","Pequeno Porte II"],"goiana":["Goiana","RD 11 - Mata Norte","Médio Porte"],"granito":["Granito","RD 03 - Sertão do Araripe","Pequeno Porte I"],"gravata":["Gravatá","RD 08 - Agreste Central","Médio Porte"],"iati":["Iati","RD 07 - Agreste Meridional","Pequeno Porte I"],"ibimirim":["Ibimirim","RD 06 - Sertão do Moxotó","Pequeno Porte II"],"ibirajuba":["Ibirajuba","RD 08 - Agreste Central","Pequeno Porte I"],"igarassu":["Igarassu","RD 12 - Região Metropolitana","Grande Porte"],"iguaracy":["Iguaracy","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"ilha de itamaraca":["Ilha de Itamaracá","RD 12 - Região Metropolitana","Pequeno Porte II"],"inaja":["Inajá","RD 06 - Sertão do Moxotó","Pequeno Porte II"],"ingazeira":["Ingazeira","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"ipojuca":["Ipojuca","RD 12 - Região Metropolitana","Médio Porte"],"ipubi":["Ipubi","RD 03 - Sertão do Araripe","Pequeno Porte II"],"itacuruba":["Itacuruba","RD 01 - Sertão de Itaparica","Pequeno Porte I"],"itaiba":["Itaíba","RD 07 - Agreste Meridional","Pequeno Porte II"],"itambe":["Itambé","RD 11 - Mata Norte","Pequeno Porte II"],"itapetim":["Itapetim","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"itapissuma":["Itapissuma","RD 12 - Região Metropolitana","Pequeno Porte II"],"itaquitinga":["Itaquitinga","RD 11 - Mata Norte","Pequeno Porte I"],"jaboatao dos guararapes":["Jaboatão dos Guararapes","RD 12 - Região Metropolitana","Grande Porte"],"jaqueira":["Jaqueira","RD 10 - Mata Sul","Pequeno Porte I"],"jatauba":["Jataúba","RD 08 - Agreste Central","Pequeno Porte I"],"jatoba":["Jatobá","RD 01 - Sertão de Itaparica","Pequeno Porte I"],"joao alfredo":["João Alfredo","RD 09 - Agreste Setentrional","Pequeno Porte II"],"joaquim nabuco":["Joaquim Nabuco","RD 10 - Mata Sul","Pequeno Porte I"],"jucati":["Jucati","RD 07 - Agreste Meridional","Pequeno Porte I"],"jupi":["Jupi","RD 07 - Agreste Meridional","Pequeno Porte I"],"jurema":["Jurema","RD 07 - Agreste Meridional","Pequeno Porte I"],"lagoa de itaenga":["Lagoa de Itaenga","RD 11 - Mata Norte","Pequeno Porte I"],"lagoa do carro":["Lagoa do Carro","RD 11 - Mata Norte","Pequeno Porte I"],"lagoa do ouro":["Lagoa do Ouro","RD 07 - Agreste Meridional","Pequeno Porte I"],"lagoa dos gatos":["Lagoa dos Gatos","RD 08 - Agreste Central","Pequeno Porte I"],"lagoa grande":["Lagoa Grande","RD 02 - Sertão do São Francisco","Pequeno Porte II"],"lajedo":["Lajedo","RD 07 - Agreste Meridional","Pequeno Porte II"],"limoeiro":["Limoeiro","RD 09 - Agreste Setentrional","Médio Porte"],"macaparana":["Macaparana","RD 11 - Mata Norte","Pequeno Porte II"],"machados":["Machados","RD 09 - Agreste Setentrional","Pequeno Porte I"],"manari":["Manari","RD 06 - Sertão do Moxotó","Pequeno Porte II"],"maraial":["Maraial","RD 10 - Mata Sul","Pequeno Porte I"],"mirandiba":["Mirandiba","RD 04 - Sertão Central","Pequeno Porte I"],"moreilandia":["Moreilândia","RD 03 - Sertão do Araripe","Pequeno Porte I"],"moreno":["Moreno","RD 12 - Região Metropolitana","Médio Porte"],"nazare da mata":["Nazaré da Mata","RD 11 - Mata Norte","Pequeno Porte II"],"olinda":["Olinda","RD 12 - Região Metropolitana","Grande Porte"],"orobo":["Orobó","RD 09 - Agreste Setentrional","Pequeno Porte II"],"oroco":["Orocó","RD 02 - Sertão do São Francisco","Pequeno Porte I"],"ouricuri":["Ouricuri","RD 03 - Sertão do Araripe","Médio Porte"],"palmares":["Palmares","RD 10 - Mata Sul","Médio Porte"],"palmeirina":["Palmeirina","RD 07 - Agreste Meridional","Pequeno Porte I"],"panelas":["Panelas","RD 08 - Agreste Central","Pequeno Porte II"],"paranatama":["Paranatama","RD 07 - Agreste Meridional","Pequeno Porte I"],"parnamirim":["Parnamirim","RD 04 - Sertão Central","Pequeno Porte I"],"passira":["Passira","RD 09 - Agreste Setentrional","Pequeno Porte II"],"paudalho":["Paudalho","RD 11 - Mata Norte","Médio Porte"],"paulista":["Paulista","RD 12 - Região Metropolitana","Grande Porte"],"pedra":["Pedra","RD 07 - Agreste Meridional","Pequeno Porte II"],"pesqueira":["Pesqueira","RD 08 - Agreste Central","Médio Porte"],"petrolandia":["Petrolândia","RD 01 - Sertão de Itaparica","Pequeno Porte II"],"petrolina":["Petrolina","RD 02 - Sertão do São Francisco","Grande Porte"],"pocao":["Poção","RD 08 - Agreste Central","Pequeno Porte I"],"pombos":["Pombos","RD 08 - Agreste Central","Pequeno Porte II"],"primavera":["Primavera","RD 10 - Mata Sul","Pequeno Porte I"],"quipapa":["Quipapá","RD 10 - Mata Sul","Pequeno Porte I"],"quixaba":["Quixaba","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"recife":["Recife","RD 12 - Região Metropolitana","Metrópole"],"riacho das almas":["Riacho das Almas","RD 08 - Agreste Central","Pequeno Porte II"],"ribeirao":["Ribeirão","RD 10 - Mata Sul","Pequeno Porte II"],"rio formoso":["Rio Formoso","RD 10 - Mata Sul","Pequeno Porte II"],"saire":["Sairé","RD 08 - Agreste Central","Pequeno Porte I"],"salgadinho":["Salgadinho","RD 09 - Agreste Setentrional","Pequeno Porte I"],"salgueiro":["Salgueiro","RD 04 - Sertão Central","Médio Porte"],"saloa":["Saloá","RD 07 - Agreste Meridional","Pequeno Porte I"],"sanharo":["Sanharó","RD 08 - Agreste Central","Pequeno Porte I"],"santa cruz":["Santa Cruz","RD 03 - Sertão do Araripe","Pequeno Porte I"],"santa cruz da baixa verde":["Santa Cruz da Baixa Verde","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"santa cruz do capibaribe":["Santa Cruz do Capibaribe","RD 09 - Agreste Setentrional","Médio Porte"],"santa filomena":["Santa Filomena","RD 03 - Sertão do Araripe","Pequeno Porte I"],"santa maria da boa vista":["Santa Maria da Boa Vista","RD 02 - Sertão do São Francisco","Pequeno Porte II"],"santa maria do cambuca":["Santa Maria do Cambucá","RD 09 - Agreste Setentrional","Pequeno Porte I"],"santa terezinha":["Santa Terezinha","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"sao benedito do sul":["São Benedito do Sul","RD 10 - Mata Sul","Pequeno Porte I"],"sao bento do una":["São Bento do Una","RD 08 - Agreste Central","Pequeno Porte II"],"sao caetano":["São Caetano","RD 08 - Agreste Central","Pequeno Porte II"],"sao joao":["São João","RD 07 - Agreste Meridional","Pequeno Porte II"],"sao joaquim do monte":["São Joaquim do Monte","RD 08 - Agreste Central","Pequeno Porte II"],"sao jose da coroa grande":["São José da Coroa Grande","RD 10 - Mata Sul","Pequeno Porte I"],"sao jose do belmonte":["São José do Belmonte","RD 04 - Sertão Central","Pequeno Porte II"],"sao jose do egito":["São José do Egito","RD 05 - Sertão do Pajeú","Pequeno Porte II"],"sao lourenco da mata":["São Lourenço da Mata","RD 12 - Região Metropolitana","Grande Porte"],"sao vicente ferrer":["São Vicente Férrer","RD 09 - Agreste Setentrional","Pequeno Porte I"],"serra talhada":["Serra Talhada","RD 05 - Sertão do Pajeú","Médio Porte"],"serrita":["Serrita","RD 04 - Sertão Central","Pequeno Porte I"],"sertania":["Sertânia","RD 06 - Sertão do Moxotó","Pequeno Porte II"],"sirinhaem":["Sirinhaém","RD 10 - Mata Sul","Pequeno Porte II"],"solidao":["Solidão","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"surubim":["Surubim","RD 09 - Agreste Setentrional","Médio Porte"],"tabira":["Tabira","RD 05 - Sertão do Pajeú","Pequeno Porte II"],"tacaimbo":["Tacaimbó","RD 08 - Agreste Central","Pequeno Porte I"],"tacaratu":["Tacaratu","RD 01 - Sertão de Itaparica","Pequeno Porte II"],"tamandare":["Tamandaré","RD 10 - Mata Sul","Pequeno Porte II"],"taquaritinga do norte":["Taquaritinga do Norte","RD 09 - Agreste Setentrional","Pequeno Porte II"],"terezinha":["Terezinha","RD 07 - Agreste Meridional","Pequeno Porte I"],"terra nova":["Terra Nova","RD 04 - Sertão Central","Pequeno Porte I"],"timbauba":["Timbaúba","RD 11 - Mata Norte","Pequeno Porte II"],"toritama":["Toritama","RD 09 - Agreste Setentrional","Pequeno Porte II"],"tracunhaem":["Tracunhaém","RD 11 - Mata Norte","Pequeno Porte I"],"trindade":["Trindade","RD 03 - Sertão do Araripe","Pequeno Porte II"],"triunfo":["Triunfo","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"tupanatinga":["Tupanatinga","RD 07 - Agreste Meridional","Pequeno Porte II"],"tuparetama":["Tuparetama","RD 05 - Sertão do Pajeú","Pequeno Porte I"],"venturosa":["Venturosa","RD 07 - Agreste Meridional","Pequeno Porte I"],"verdejante":["Verdejante","RD 04 - Sertão Central","Pequeno Porte I"],"vertente do lerio":["Vertente do Lério","RD 09 - Agreste Setentrional","Pequeno Porte I"],"vertentes":["Vertentes","RD 09 - Agreste Setentrional","Pequeno Porte II"],"vicencia":["Vicência","RD 11 - Mata Norte","Pequeno Porte II"],"vitoria de santo antao":["Vitória de Santo Antão","RD 10 - Mata Sul","Grande Porte"],"xexeu":["Xexéu","RD 10 - Mata Sul","Pequeno Porte I"]};
  const MUN = {};
  Object.keys(MUN_RAW).forEach(k => { MUN[k] = { key: k, nome: MUN_RAW[k][0], rd: MUN_RAW[k][1], porte: MUN_RAW[k][2] }; });
  const MUN_LIST = Object.values(MUN).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const RD_COLORS = {
    'RD 01 - Sertão de Itaparica': '#e9b3b6', 'RD 02 - Sertão do São Francisco': '#a6a619',
    'RD 03 - Sertão do Araripe': '#8fd38d', 'RD 04 - Sertão Central': '#8c4a2f',
    'RD 05 - Sertão do Pajeú': '#a62744', 'RD 06 - Sertão do Moxotó': '#f26b82',
    'RD 07 - Agreste Meridional': '#7a2a85', 'RD 08 - Agreste Central': '#aa63b2',
    'RD 09 - Agreste Setentrional': '#922e94', 'RD 10 - Mata Sul': '#676aa5',
    'RD 11 - Mata Norte': '#2fb5bd', 'RD 12 - Região Metropolitana': '#12878D'
  };
  const RD_LIST = Object.keys(RD_COLORS);
  const rdByNumber = {};
  RD_LIST.forEach(r => { rdByNumber[+r.slice(3, 5)] = r; });
  const PORTES = ['Metrópole', 'Grande Porte', 'Médio Porte', 'Pequeno Porte II', 'Pequeno Porte I'];

  // Divergências de nomenclatura entre a base, a planilha e a malha geográfica
  const ALIASES = {
    'lagoa do itaenga': 'lagoa de itaenga', 'belem de sao francisco': 'belem do sao francisco',
    'sao caitano': 'sao caetano', 'iguaraci': 'iguaracy', 'sao vicente ferrer': 'sao vicente ferrer',
    'itamaraca': 'ilha de itamaraca', 'ilha de itamaraca': 'ilha de itamaraca'
  };
  function munKey(name) {
    let n = norm(name).replace(/\s*[-/(]\s*pe\)?$/, '').replace(/\s*\(.*\)$/, '').trim();
    n = ALIASES[n] || n;
    return MUN[n] ? n : null;
  }
  function rdCanon(raw) {
    const m = /rd\s*0*(\d{1,2})/i.exec(String(raw || ''));
    return m ? (rdByNumber[+m[1]] || null) : null;
  }
  function porteCanon(raw) {
    const n = norm(raw);
    if (!n) return null;
    if (n.includes('metropole')) return 'Metrópole';
    if (n.includes('grande')) return 'Grande Porte';
    if (n.includes('medio')) return 'Médio Porte';
    if (n.includes('pequeno')) return /\b(ii|2)\b/.test(n) ? 'Pequeno Porte II' : 'Pequeno Porte I';
    return null;
  }

  /* ---------- Classificação por categoria ----------
     Regras avaliadas sobre o texto de "categoria" (e, se nada casar, de "evento").
     Ajuste aqui se os valores reais da base usarem outros nomes.            */
  const GRUPOS = [
    { id: 'individual', nome: 'ATMs individuais', curto: 'Individuais', cor: '#3fae6a', regras: [/individ/, /\batm\b/, /particular/] },
    { id: 'roda', nome: 'Rodas de Diálogo', curto: 'Rodas de Diálogo', cor: '#d4678c', regras: [/roda/] },
    { id: 'evento', nome: 'MUPS, Oficinas, SICON e Encontros', curto: 'Oficinas e encontros', cor: '#9b7bf2', regras: [/oficina/, /\bmups?\b/, /sicon/, /encontro/] }
  ];
  const OUTROS = { id: 'outros', nome: 'Outras categorias', curto: 'Outras', cor: '#7d8aa8' };
  const GRUPO_BY_ID = {}; GRUPOS.concat([OUTROS]).forEach(g => { GRUPO_BY_ID[g.id] = g; });
  const ORDEM_TESTE = ['roda', 'evento', 'individual'];

  function grupoDe(categoria, evento) {
    for (const campo of [norm(categoria), norm(evento)]) {
      if (!campo) continue;
      for (const id of ORDEM_TESTE) {
        if (GRUPO_BY_ID[id].regras.some(r => r.test(campo))) return id;
      }
    }
    return 'outros';
  }

  /* ---------- Conversão das linhas da base ---------- */
  function buildRecords(rows) {
    const canon = {};
    const canonGet = (field, raw) => {
      let v = raw == null ? '' : String(raw).replace(/\s+/g, ' ').trim();
      if (!v) return 'Não informado';
      const n = norm(v);
      const c = canon[field] || (canon[field] = {});
      const e = c[n] || (c[n] = { counts: {}, best: v });
      e.counts[v] = (e.counts[v] || 0) + 1;
      if (e.counts[v] > (e.counts[e.best] || 0)) e.best = v;
      return n;
    };
    const diag = { semData: 0, semMunicipio: 0, munNaoReconhecidos: {}, categorias: {}, colunas: {}, total: rows.length };
    const hasCol = rows.length ? Object.keys(rows[0]) : [];
    diag.colunas = hasCol;
    const sitKey = hasCol.find(k => /^(situacao|situação|status)$/i.test(k)) || null;

    const recs = rows.map((r, i) => {
      const ymd = parseDate(r[COL.data]);
      const rawMun = r[COL.municipio];
      const k = munKey(rawMun);
      const cadastro = k ? MUN[k] : null;
      const grupo = grupoDe(r[COL.categoria], r[COL.evento]);
      const rd = (cadastro && cadastro.rd) || rdCanon(r[COL.rd]);
      const porte = (cadastro && cadastro.porte) || porteCanon(r[COL.porte]);
      const textoEvt = norm(r[COL.categoria]) + ' ' + norm(r[COL.evento]);
      const rec = {
        i, mun: k, munRaw: rawMun, nome: cadastro ? cadastro.nome : (rawMun || ''),
        rd, porte, ymd, y: ymd ? Math.floor(ymd / 10000) : null,
        ym: ymd ? `${Math.floor(ymd / 10000)}-${pad(Math.floor(ymd / 100) % 100)}` : null,
        grupo,
        categoria: canonGet('categoria', r[COL.categoria]), evento: r[COL.evento] ? String(r[COL.evento]).trim() : '',
        modalidade: canonGet('modalidade', r[COL.modalidade]), tipo: canonGet('tipo', r[COL.tipo]),
        gerencia: canonGet('gerencia', r[COL.gerencia]), devolutiva: canonGet('devolutiva', r[COL.devolutiva]),
        avaliacao: canonGet('avaliacao', r[COL.avaliacao]),
        situacao: sitKey ? canonGet('situacao', r[sitKey]) : null,
        sub: null
      };
      rec.sub = grupo === 'evento' ? (/encontro/.test(textoEvt) ? 'Encontros estaduais' : 'Oficinas, MUPS e SICON') : null;
      if (!ymd) diag.semData++;
      if (!k) { diag.semMunicipio++; const nm = String(rawMun || '(vazio)').trim(); diag.munNaoReconhecidos[nm] = (diag.munNaoReconhecidos[nm] || 0) + 1; }
      return rec;
    });
    // troca as chaves normalizadas pelo texto mais frequente
    const label = (field, n) => (n === 'Não informado' ? n : (canon[field][n] ? canon[field][n].best : n));
    recs.forEach(r => {
      ['categoria', 'modalidade', 'tipo', 'gerencia', 'devolutiva', 'avaliacao'].forEach(f => { r[f] = label(f, r[f]); });
      if (r.situacao) r.situacao = label('situacao', r.situacao);
      r.gerencia = r.gerencia === 'Não informado' ? r.gerencia : r.gerencia.toUpperCase();
      const key = r.categoria + '||' + r.grupo;
      diag.categorias[key] = (diag.categorias[key] || 0) + 1;
    });

    const years = [...new Set(recs.filter(r => r.y).map(r => r.y))].sort((a, b) => a - b);
    const dated = recs.filter(r => r.ymd);
    const meta = {
      years, total: recs.length,
      minYmd: dated.length ? Math.min.apply(null, dated.map(r => r.ymd)) : null,
      maxYmd: dated.length ? Math.max.apply(null, dated.map(r => r.ymd)) : null,
      options: {
        gerencia: [...new Set(recs.map(r => r.gerencia))].sort(),
        modalidade: [...new Set(recs.map(r => r.modalidade))].sort(),
        porte: PORTES.filter(p => recs.some(r => r.porte === p)),
        tipo: [...new Set(recs.map(r => r.tipo))].sort()
      },
      hasOutros: recs.some(r => r.grupo === 'outros'),
      hasSituacao: !!sitKey, diag
    };
    return { recs, meta };
  }

  /* ---------- Busca na API do Supabase ---------- */
  const LS_KEY = 'apoio_supabase_key';
  const SS_CACHE = 'apoio_cache_v1';
  const SS_DEMO = 'apoio_demo';
  const getKey = () => CFG.SUPABASE_KEY || localStorage.getItem(LS_KEY) || '';
  const isDemo = () => /[?&]demo=1/.test(location.search) || sessionStorage.getItem(SS_DEMO) === '1';

  async function fetchPage(url, key, offset, size, order) {
    const headers = { apikey: key, Accept: 'application/json' };
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;   // chaves JWT legadas
    const q = `${url}/rest/v1/${encodeURIComponent(CFG.TABELA)}?select=*&limit=${size}&offset=${offset}` + (order ? `&order=${order}` : '');
    const res = await fetch(q, { headers });
    if (!res.ok) {
      let detalhe = '';
      try { const j = await res.json(); detalhe = j.message || j.hint || ''; } catch (e) { /* sem corpo */ }
      const err = new Error(`HTTP ${res.status}${detalhe ? ' — ' + detalhe : ''}`);
      err.status = res.status; throw err;
    }
    return res.json();
  }

  async function fetchAll(onProgress) {
    const key = getKey();
    const url = CFG.SUPABASE_URL.replace(/\/$/, '');
    const size = 1000;
    const orders = ['id.asc', 'data.asc', ''];
    let lastErr;
    for (const order of orders) {
      try {
        const all = []; let off = 0;
        for (;;) {
          const page = await fetchPage(url, key, off, size, order);
          all.push.apply(all, page);
          if (onProgress) onProgress(all.length);
          if (page.length < size) break;
          off += size;
        }
        return all;
      } catch (e) {
        lastErr = e;
        if (e.status === 400) continue;          // coluna de ordenação inexistente: tenta a próxima
        throw e;
      }
    }
    throw lastErr;
  }

  /* ---------- Dados de exemplo (modo demonstração) ---------- */
  function demoRows() {
    let seed = 20260615;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = (arr, w) => { const tot = w.reduce((a, b) => a + b, 0); let x = rnd() * tot; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
    const peso = { 'Metrópole': 2.2, 'Grande Porte': 1.8, 'Médio Porte': 1.4, 'Pequeno Porte II': 1.0, 'Pequeno Porte I': 0.8 };
    const gers = ['GESTÃO', 'GEBEN', 'GEPSB', 'GEPMC', 'GEPAC', 'GETEP', 'GEFEAS', 'VSA', 'CAS'];
    const hoje = new Date(); const rows = [];
    const eventos = ['Oficina regional', 'MUP', 'SICON', 'Encontro Estadual'];
    [2023, 2024, 2025, 2026].forEach((ano, idx) => {
      const fim = ano === hoje.getFullYear() ? new Date(ano, hoje.getMonth(), hoje.getDate()) : new Date(ano, 11, 31);
      const dias = Math.max(1, Math.round((fim - new Date(ano, 0, 1)) / 86400000));
      const alvo = [650, 1500, 2300, 2500][idx] * Math.min(1, dias / 365 + .15);
      for (let n = 0; n < alvo; n++) {
        const m = pick(MUN_LIST, MUN_LIST.map(x => peso[x.porte] || 1));
        const d = new Date(ano, 0, 1 + Math.floor(rnd() * dias));
        const cat = pick(['ATM Individualizado', 'Roda de Diálogo', 'Oficina', 'MUP', 'SICON', 'Encontro Estadual'], [18, 43, 14, 10, 6, 16]);
        const ind = cat === 'ATM Individualizado';
        rows.push({
          id: rows.length + 1, categoria: cat, evento: /Oficina|MUP|SICON|Encontro/.test(cat) ? cat : (ind ? 'Apoio técnico individual' : 'Roda de Diálogo regional'),
          municipio: m.nome.toUpperCase(), rd: m.rd, porte: m.porte,
          data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          modalidade: ind ? pick(['Presencial Município', 'Presencial SEASS', 'Remoto'], [50, 12, 38]) : pick(['Remoto', 'Presencial Município'], [60, 40]),
          tipo: pick(['Particularizado', 'Integrado', 'Semi-Integrado'], [89, 6, 5]),
          gerencia: pick(gers, [1, 8, 25, 9, 2, 1, 9, 12, 33]),
          devolutiva: pick(['Enviada', 'Pendente', 'Não se aplica'], [60, 15, 25]),
          avaliacao: pick(['Ótimo', 'Bom', 'Regular', 'Não avaliado'], [40, 30, 5, 25])
        });
      }
    });
    return rows;
  }

  /* ---------- Interface de conexão ---------- */
  function showOverlay(html) {
    let el = document.getElementById('apoioLoading');
    if (!el) { el = document.createElement('div'); el.id = 'apoioLoading'; el.className = 'loading'; document.body.appendChild(el); }
    el.classList.remove('hide'); el.innerHTML = html; return el;
  }
  function hideOverlay() { const el = document.getElementById('apoioLoading'); if (el) el.classList.add('hide'); }
  function setLoadingText(t) { const p = document.getElementById('apoioLoadingText'); if (p) p.textContent = t; }
  function loadingHtml(t) { return `<div class="spinner"></div><p id="apoioLoadingText">${esc(t)}</p>`; }

  function connectionDialog(erro) {
    return new Promise(resolve => {
      showOverlay(`
        <form class="conn-card" id="connForm">
          <h2>Conectar à base de dados</h2>
          <p>O painel lê a tabela <code>${esc(CFG.TABELA)}</code> do projeto <code>${esc(CFG.SUPABASE_URL)}</code>. Cole a chave <b>pública</b> (anon / publishable) do Supabase. Ela fica guardada somente neste navegador.</p>
          ${erro ? `<div class="err">${esc(erro)}</div>` : ''}
          <input id="connKey" type="password" placeholder="Chave pública do Supabase" autocomplete="off" spellcheck="false">
          <p>Nunca use a chave <code>service_role</code>. Para uso permanente, preencha <code>SUPABASE_KEY</code> em <code>config.js</code>.</p>
          <div class="row">
            <button class="btn primary" type="submit">Conectar</button>
            <button class="btn" type="button" id="connDemo">Ver com dados de exemplo</button>
          </div>
        </form>`);
      const form = document.getElementById('connForm');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const v = document.getElementById('connKey').value.trim();
        if (!v) return;
        localStorage.setItem(LS_KEY, v);
        resolve('key');
      });
      document.getElementById('connDemo').addEventListener('click', () => { sessionStorage.setItem(SS_DEMO, '1'); resolve('demo'); });
      document.getElementById('connKey').focus();
    });
  }

  function mensagemErro(e) {
    if (e.status === 401 || e.status === 403) return 'A chave foi recusada ou não tem permissão de leitura (' + e.message + '). Confira a chave e as políticas RLS da tabela.';
    if (e.status === 404) return 'Tabela não encontrada (' + e.message + '). Confira o nome em config.js.';
    if (e instanceof TypeError) return 'Não foi possível acessar o Supabase. Verifique a conexão com a internet.';
    return 'Erro ao consultar a base: ' + e.message;
  }

  async function loadRows() {
    if (isDemo()) return { rows: demoRows(), demo: true };
    // cache de sessão: evita baixar de novo ao trocar de página
    try {
      const c = JSON.parse(sessionStorage.getItem(SS_CACHE) || 'null');
      if (c && Date.now() - c.t < CFG.CACHE_MINUTOS * 60000 && c.k === getKey()) return { rows: c.rows, demo: false, cache: true, t: c.t };
    } catch (e) { /* cache indisponível */ }

    let erro = '';
    for (;;) {
      if (!getKey()) {
        const r = await connectionDialog(erro);
        if (r === 'demo') return { rows: demoRows(), demo: true };
      }
      showOverlay(loadingHtml('Carregando registros da base…'));
      try {
        const rows = await fetchAll(n => setLoadingText(`Carregando registros da base… ${fmt(n)}`));
        if (!rows.length) throw Object.assign(new Error('A consulta retornou 0 registros. Se a tabela tem dados, falta uma política RLS de leitura (SELECT) para a chave pública.'), { status: 0 });
        const t = Date.now();
        try { sessionStorage.setItem(SS_CACHE, JSON.stringify({ t, k: getKey(), rows })); } catch (e) { /* base grande demais para o cache */ }
        return { rows, demo: false, t };
      } catch (e) {
        erro = mensagemErro(e);
        localStorage.removeItem(LS_KEY);
        if (CFG.SUPABASE_KEY) { // chave fixa em config.js: não dá para pedir outra
          const r = await connectionDialog(erro + ' (Chave definida em config.js.)');
          if (r === 'demo') return { rows: demoRows(), demo: true };
          CFG.SUPABASE_KEY = '';
        }
      }
    }
  }

  async function boot() {
    showOverlay(loadingHtml('Preparando o painel…'));
    const r = await loadRows();
    const { recs, meta } = buildRecords(r.rows);
    meta.demo = !!r.demo; meta.fetchedAt = r.t || Date.now();
    hideOverlay();
    renderStatus(meta);
    return { recs, meta };
  }

  function renderStatus(meta) {
    const host = document.getElementById('statusHost');
    if (!host) return;
    host.innerHTML = (meta.demo ? '<span class="demo-badge">Dados de exemplo</span>' : '') +
      `<span>${fmt(meta.total)} registros${meta.years.length ? ' · ' + meta.years[0] + '–' + meta.years[meta.years.length - 1] : ''}</span>` +
      '<button class="btn ghost" id="btnRefresh" type="button">' + (meta.demo ? 'Sair do exemplo' : 'Atualizar') + '</button>';
    document.getElementById('btnRefresh').addEventListener('click', () => {
      sessionStorage.removeItem(SS_CACHE); sessionStorage.removeItem(SS_DEMO);
      location.href = location.href.replace(/[?&]demo=1/, '');
    });
  }

  /* ---------- Estado de filtros ---------- */
  function defaultRange(meta) {
    const hoje = new Date().getFullYear();
    const ano = meta.years.includes(hoje) ? hoje : (meta.years[meta.years.length - 1] || hoje);
    return { from: ymdOf(ano, 1, 1), to: ymdOf(ano, 12, 31) };
  }

  function createState(meta) {
    const q = new URLSearchParams(location.search);
    const def = defaultRange(meta);
    const f = parseDate(q.get('from')), t = parseDate(q.get('to'));
    const groups = {}; GRUPOS.concat([OUTROS]).forEach(g => { groups[g.id] = true; });
    return { from: f || def.from, to: t || def.to, groups, gerencia: '', modalidade: '', porte: '', defFrom: def.from, defTo: def.to };
  }

  // período + gerência/modalidade/porte (sem o filtro de categoria)
  function filterBase(recs, st) {
    return recs.filter(r => r.ymd && r.ymd >= st.from && r.ymd <= st.to &&
      (!st.gerencia || r.gerencia === st.gerencia) && (!st.modalidade || r.modalidade === st.modalidade) && (!st.porte || r.porte === st.porte));
  }
  const filterGroups = (recs, st) => recs.filter(r => st.groups[r.grupo]);

  function aggregate(recs) {
    const mun = {}, rd = {};
    let total = 0;
    for (const r of recs) {
      total++;
      if (r.mun) {
        const m = mun[r.mun] || (mun[r.mun] = { total: 0, g: {}, last: 0 });
        m.total++; m.g[r.grupo] = (m.g[r.grupo] || 0) + 1; if (r.ymd > m.last) m.last = r.ymd;
      }
      if (r.rd) {
        const d = rd[r.rd] || (rd[r.rd] = { total: 0, g: {}, mun: new Set() });
        d.total++; d.g[r.grupo] = (d.g[r.grupo] || 0) + 1; if (r.mun) d.mun.add(r.mun);
      }
    }
    return { total, mun, rd };
  }

  function countBy(recs, field) {
    const m = new Map();
    recs.forEach(r => { const v = r[field] || 'Não informado'; m.set(v, (m.get(v) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  function monthsBetween(from, to) {
    const out = [];
    let y = Math.floor(from / 10000), m = Math.floor(from / 100) % 100;
    const ye = Math.floor(to / 10000), me = Math.floor(to / 100) % 100;
    while (y < ye || (y === ye && m <= me)) { out.push(`${y}-${pad(m)}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 600) break; }
    return out;
  }

  function csvDownload(nome, linhas) {
    const body = linhas.map(l => l.map(c => { const s = String(c == null ? '' : c); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Componentes: período, categorias, selects ---------- */
  function mountPeriod(host, meta, st, onChange) {
    const years = meta.years.slice().reverse();
    const atual = new Date().getFullYear();
    host.innerHTML = `
      <div class="f-label">Período</div>
      <div class="f-row">
        <div class="chips" id="pChips"></div>
        <div class="f-dates">
          <label>de <input type="date" id="pFrom"></label>
          <label>até <input type="date" id="pTo"></label>
        </div>
      </div>
      <div class="f-error" id="pErr" aria-live="polite"></div>`;
    host.classList.add('f-group');
    const chips = host.querySelector('#pChips'), inF = host.querySelector('#pFrom'), inT = host.querySelector('#pTo'), err = host.querySelector('#pErr');
    const minIso = meta.minYmd ? ymdToIso(ymdOf(Math.floor(meta.minYmd / 10000), 1, 1)) : '';
    const maxIso = meta.maxYmd ? ymdToIso(ymdOf(Math.floor(meta.maxYmd / 10000), 12, 31)) : '';
    inF.min = inT.min = minIso; inF.max = inT.max = maxIso;

    function paint() {
      inF.value = ymdToIso(st.from); inT.value = ymdToIso(st.to);
      const all = meta.years.length && st.from === ymdOf(meta.years[0], 1, 1) && st.to === ymdOf(meta.years[meta.years.length - 1], 12, 31);
      chips.innerHTML = years.map(y => {
        const on = st.from === ymdOf(y, 1, 1) && st.to === ymdOf(y, 12, 31);
        return `<button type="button" class="chip" data-y="${y}" aria-pressed="${on}">${y}${y === atual ? ' <small>atual</small>' : ''}</button>`;
      }).join('') + (years.length > 1 ? `<button type="button" class="chip" data-y="all" aria-pressed="${all}">Todo o período</button>` : '');
    }
    chips.addEventListener('click', e => {
      const b = e.target.closest('button[data-y]'); if (!b) return;
      if (b.dataset.y === 'all') { st.from = ymdOf(meta.years[0], 1, 1); st.to = ymdOf(meta.years[meta.years.length - 1], 12, 31); }
      else { const y = +b.dataset.y; st.from = ymdOf(y, 1, 1); st.to = ymdOf(y, 12, 31); }
      err.textContent = ''; paint(); onChange();
    });
    function fromInputs() {
      const f = isoToYmd(inF.value), t = isoToYmd(inT.value);
      if (!f || !t) { err.textContent = 'Informe as duas datas.'; return; }
      if (f > t) { err.textContent = 'A data inicial é posterior à data final.'; return; }
      err.textContent = ''; st.from = f; st.to = t; paint(); onChange();
    }
    inF.addEventListener('change', fromInputs); inT.addEventListener('change', fromInputs);
    paint();
    return { repaint: paint };
  }

  function mountGroupChips(host, meta, st, onChange) {
    const lista = GRUPOS.concat(meta.hasOutros ? [OUTROS] : []);
    host.classList.add('f-group');
    host.innerHTML = '<div class="f-label">Categorias</div><div class="chips"></div>';
    const box = host.querySelector('.chips');
    const paint = () => {
      box.innerHTML = lista.map(g => `<button type="button" class="chip cat" data-g="${g.id}" style="--dot:${g.cor}" aria-pressed="${st.groups[g.id]}"><span class="dot"></span>${esc(g.nome)}</button>`).join('');
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-g]'); if (!b) return;
      const ativos = lista.filter(g => st.groups[g.id]);
      if (st.groups[b.dataset.g] && ativos.length === 1) return;   // mantém ao menos uma categoria
      st.groups[b.dataset.g] = !st.groups[b.dataset.g]; paint(); onChange();
    });
    paint();
  }

  function mountSelect(host, label, field, options, st, onChange) {
    host.classList.add('f-group', 'f-select');
    host.innerHTML = `<label class="f-label" for="sel_${field}">${esc(label)}</label><select id="sel_${field}"><option value="">Todas</option>${options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    const s = host.querySelector('select');
    s.addEventListener('change', () => { st[field] = s.value; onChange(); });
    return { reset() { s.value = ''; } };
  }

  /* ---------- Gráficos (Chart.js) ---------- */
  const SERIES = ['#4f8cff', '#38bdf8', '#9b7bf2', '#3fae6a', '#f59e0b', '#e86a92', '#2dd4bf', '#8896b3'];
  const charts = {};

  const valueLabels = {
    id: 'valueLabels',
    afterDatasetsDraw(chart, _a, opts) {
      if (!opts || !opts.show) return;
      const { ctx } = chart; const horiz = chart.options.indexAxis === 'y';
      ctx.save(); ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily; ctx.fillStyle = '#e6edfb';
      chart.data.datasets.forEach((ds, di) => {
        chart.getDatasetMeta(di).data.forEach((bar, i) => {
          const v = ds.data[i]; if (v == null) return;
          ctx.textBaseline = 'middle';
          if (horiz) { ctx.textAlign = 'left'; ctx.fillText(fmt(v), bar.x + 5, bar.y); }
          else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), bar.x, bar.y - 3); }
        });
      });
      ctx.restore();
    }
  };
  const centerText = {
    id: 'centerText',
    afterDraw(chart, _a, opts) {
      if (!opts || opts.text == null) return;
      const { ctx, chartArea: a } = chart; const cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e6edfb'; ctx.font = '600 20px ' + getComputedStyle(document.body).fontFamily; ctx.fillText(opts.text, cx, cy - 6);
      ctx.fillStyle = '#8c9fc6'; ctx.font = '11px ' + getComputedStyle(document.body).fontFamily; ctx.fillText(opts.sub || '', cx, cy + 14);
      ctx.restore();
    }
  };

  function chartInit() {
    if (!window.Chart || chartInit.done) return;
    Chart.register(valueLabels, centerText);
    Chart.defaults.color = '#8c9fc6';
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = 'rgba(140,159,198,.14)';
    Chart.defaults.animation.duration = 250;
    chartInit.done = true;
  }
  function chartMake(id, cfg) {
    chartInit();
    if (charts[id]) charts[id].destroy();
    const canvas = document.getElementById(id);
    charts[id] = new Chart(canvas, cfg);
    return charts[id];
  }
  function setEmpty(id, vazio) {
    const wrap = document.getElementById(id).closest('.chart-wrap');
    const e = wrap.querySelector('.chart-empty'); if (e) e.classList.toggle('show', !!vazio);
  }
  const tipBase = { backgroundColor: '#0b1730', borderColor: '#223560', borderWidth: 1, padding: 9, titleColor: '#e6edfb', bodyColor: '#c9d6f2' };

  function donut(id, legendId, entries, opts) {
    opts = opts || {};
    const total = entries.reduce((s, e) => s + e[1], 0);
    setEmpty(id, !total);
    let items = entries.slice();
    if (items.length > 7) { const rest = items.slice(6).reduce((s, e) => s + e[1], 0); items = items.slice(0, 6).concat([['Outros', rest]]); }
    const cores = items.map((e, i) => (opts.colors && opts.colors[e[0]]) || SERIES[i % SERIES.length]);
    chartMake(id, {
      type: 'doughnut',
      data: { labels: items.map(e => e[0]), datasets: [{ data: items.map(e => e[1]), backgroundColor: cores, borderColor: '#101e3a', borderWidth: 2 }] },
      options: {
        maintainAspectRatio: false, cutout: '64%',
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tipBase, { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)} (${fmt1(pct(c.parsed, total))}%)` } }), centerText: { text: fmt(total), sub: opts.sub || 'registros' } }
      }
    });
    document.getElementById(legendId).innerHTML = items.map((e, i) =>
      `<li><i style="background:${cores[i]}"></i><span>${esc(e[0])}</span><b>${fmt(e[1])}</b><em>${fmt1(pct(e[1], total))}%</em></li>`).join('');
  }

  function bars(id, entries, opts) {
    opts = opts || {};
    const horiz = !!opts.horizontal;
    setEmpty(id, !entries.length || !entries.some(e => e[1] > 0));
    chartMake(id, {
      type: 'bar',
      data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: opts.colors || entries.map(() => opts.color || '#4f8cff'), borderRadius: 3, maxBarThickness: horiz ? 20 : 44 }] },
      options: {
        indexAxis: horiz ? 'y' : 'x', maintainAspectRatio: false,
        layout: { padding: horiz ? { right: 34 } : { top: 18 } },
        scales: horiz ? { x: { beginAtZero: true, grid: { color: 'rgba(140,159,198,.1)' } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }
          : { y: { beginAtZero: true, grid: { color: 'rgba(140,159,198,.1)' } }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0 } } },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, tipBase, { callbacks: { label: c => ' ' + fmt(c.parsed[horiz ? 'x' : 'y']) } }), valueLabels: { show: true } }
      }
    });
  }

  function stackedMonthly(id, recs, from, to, groupsVisible) {
    const months = monthsBetween(from, to);
    const lista = GRUPOS.concat([OUTROS]).filter(g => groupsVisible[g.id] && recs.some(r => r.grupo === g.id));
    const idx = {}; months.forEach((m, i) => { idx[m] = i; });
    const dados = {}; lista.forEach(g => { dados[g.id] = months.map(() => 0); });
    recs.forEach(r => { if (r.ym in idx && dados[r.grupo]) dados[r.grupo][idx[r.ym]]++; });
    setEmpty(id, !recs.length);
    chartMake(id, {
      type: 'bar',
      data: { labels: months.map(ymLabel), datasets: lista.map(g => ({ label: g.nome, data: dados[g.id], backgroundColor: g.cor, borderRadius: 2, maxBarThickness: 34 })) },
      options: {
        maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 16 } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(140,159,198,.1)' } } },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } }, tooltip: Object.assign({}, tipBase, { mode: 'index', intersect: false }) }
      }
    });
  }

  /* ---------- API pública ---------- */
  window.AT = {
    CFG, MUN, MUN_LIST, RD_COLORS, RD_LIST, GRUPOS, OUTROS, GRUPO_BY_ID, PORTES, SERIES,
    norm, esc, fmt, fmt1, pct, ymdOf, ymdToIso, isoToYmd, fmtDate, ymLabel, munKey, parseDate,
    boot, createState, filterBase, filterGroups, aggregate, countBy, monthsBetween, csvDownload,
    mountPeriod, mountGroupChips, mountSelect,
    chart: { donut, bars, stackedMonthly, init: chartInit, setEmpty },
    isDemo
  };
})();

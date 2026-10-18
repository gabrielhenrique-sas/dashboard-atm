/* ==========================================================
   CONFIGURAÇÃO DO SISTEMA — edite apenas este arquivo
   ========================================================== */
window.APOIO_CONFIG = {
  // URL base do projeto Supabase (não é uma senha)
  SUPABASE_URL: 'https://iyjmasvhdmokjuuurjqg.supabase.co',

  // Chave PÚBLICA do projeto (anon / publishable), somente leitura via RLS.
  // NUNCA coloque aqui a chave "service_role" ou qualquer chave secreta:
  // este arquivo é enviado ao navegador de quem abrir o sistema.
  // Se deixar vazio, o sistema pede a chave na primeira abertura e a guarda
  // apenas no navegador de quem digitou.
  SUPABASE_KEY: 'sb_publishable_RbNqVFo4Ud2npU-mAEjXGA_ctVCXWuG',

  // Tabela e nomes das colunas na base (conforme a documentação do projeto)
  TABELA: 'apoio_tecnico',
  COLUNAS: {
    categoria: 'categoria',
    evento: 'evento',
    municipio: 'municipio',
    rd: 'rd',
    porte: 'porte',
    data: 'data',
    modalidade: 'modalidade',
    tipo: 'tipo',
    gerencia: 'gerencia',
    devolutiva: 'devolutiva',
    avaliacao: 'avaliacao'
  },

  // Tempo (minutos) em que os dados baixados ficam guardados no navegador
  CACHE_MINUTOS: 10
};

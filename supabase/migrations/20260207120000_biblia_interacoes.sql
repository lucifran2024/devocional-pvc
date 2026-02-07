-- =====================================================
-- Tabela: biblia_interacoes
-- Armazena destaques, favoritos e notas de versículos
-- =====================================================
CREATE TABLE IF NOT EXISTS biblia_interacoes (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,          -- 'destaque', 'favorito', 'nota'
  livro_abrev VARCHAR(10) NOT NULL,   -- 'gn', 'jo', 'sl'
  livro_nome VARCHAR(50) NOT NULL,    -- 'Gênesis', 'João'
  capitulo INTEGER NOT NULL,
  versiculo INTEGER NOT NULL,
  texto_versiculo TEXT NOT NULL,
  cor VARCHAR(20) DEFAULT 'yellow',   -- para destaques: yellow, blue, green, pink
  nota TEXT,                          -- para notas pessoais
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biblia_tipo ON biblia_interacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_biblia_livro_cap ON biblia_interacoes(livro_abrev, capitulo);
CREATE INDEX IF NOT EXISTS idx_biblia_created ON biblia_interacoes(created_at DESC);

ALTER TABLE biblia_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biblia_interacoes_all_access"
  ON biblia_interacoes FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Tabela: biblia_historico_leitura
-- Salva último ponto de leitura para continuar onde parou
-- =====================================================
CREATE TABLE IF NOT EXISTS biblia_historico_leitura (
  id BIGSERIAL PRIMARY KEY,
  livro_abrev VARCHAR(10) NOT NULL,
  livro_nome VARCHAR(50) NOT NULL,
  capitulo INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE biblia_historico_leitura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biblia_historico_all_access"
  ON biblia_historico_leitura FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

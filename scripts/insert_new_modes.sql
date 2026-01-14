-- Remove os registros com IDs numéricos (inseridos incorretamente sem storage_path)
DELETE FROM modos WHERE id IN ('3', '6', '8', '9', '10', '11', '12', '16', '17', '18', '25', '30');

-- Insere ou Atualiza os modos com os IDs corretos (MODO_X) e o storage_path
INSERT INTO modos (id, titulo, descricao, storage_path, ativo) VALUES
('MODO_3', 'Formatos de Impacto Visual', 'Gera formatos de frases de impacto curtas e declarativas.', 'modos/MODO_3.txt', true),
('MODO_6', 'Manchetes de Sabedoria', '7 pílulas de impacto em CAIXA ALTA, curtas e memoráveis.', 'modos/MODO_6.txt', true),
('MODO_8', 'Guias Praticos Rotativos', '5 guias do princípio bíblico à prática com layout vertical.', 'modos/MODO_8.txt', true),
('MODO_9', 'GPT Devocional Rotativo', '10 mensagens inspiracionais curtas com viradas e emojis.', 'modos/MODO_9.txt', true),
('MODO_10', 'O Intercessor', '5 orações rotativas litúrgicas ancoradas no texto.', 'modos/MODO_10.txt', true),
('MODO_11', 'Bênçãos do Mês', '6 bênçãos (3 para fechar e 3 para começar o mês).', 'modos/MODO_11.txt', true),
('MODO_12', 'Bênçãos da Semana', '6 bênçãos (3 para abrir e 3 para fechar a semana).', 'modos/MODO_12.txt', true),
('MODO_16', 'Bom Dia Inclusivo', 'Mensagens de conforto matinal com voz inclusiva e poética.', 'modos/MODO_16.txt', true),
('MODO_17', 'O Mentor (Card Curativo)', '7 cards de mentoria firme, diagnóstica e olho no olho.', 'modos/MODO_17.txt', true),
('MODO_18', 'Devocionais Adaptativos', '15 devocionais que se adaptam ao gênero do texto (narrativa, salmo, lei).', 'modos/MODO_18.txt', true),
('MODO_25', 'Galeria Pessoal (Mimic)', 'Replica estilos conhecidos (oração, esperança) usando a passagem do dia.', 'modos/MODO_25.txt', true),
('MODO_30', 'Devocional Independente', 'Lote de 10 mensagens simples e diretas, numeradas de 1 a 10.', 'modos/MODO_30.txt', true)
ON CONFLICT (id) DO UPDATE SET 
    titulo = EXCLUDED.titulo, 
    descricao = EXCLUDED.descricao, 
    storage_path = EXCLUDED.storage_path,
    ativo = EXCLUDED.ativo;

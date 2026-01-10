INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-11',
  'Isaías 22-24',
  'Isaías',
  'Isaías 22-24',
  'Profeta',
  '1',
  ARRAY['Jerusalém', 'vale', 'chave', 'juízo', 'terra', 'desolação', 'banquete', 'morte'],
  '[{"tese":"Jerusalém é vale de visão, mas chora em vão.","familia":"Tensao","verso_suporte":"Is 22:1-5","voz_performance":"Profeta"},{"tese":"A chave de Davi é dada ao servo fiel.","familia":"Cristologico","verso_suporte":"Is 22:22","voz_performance":"Mestre"},{"tese":"A terra será desolada pelo juízo de Deus.","familia":"Teologia","verso_suporte":"Is 24:1-3","voz_performance":"Poeta"},{"tese":"Banquete de Deus para todos os povos.","familia":"Teologia","verso_suporte":"Is 25:6","voz_performance":"Conselheiro"},{"tese":"A morte será tragada para sempre.","familia":"Teologia","verso_suporte":"Is 25:8","voz_performance":"Profeta"},{"tese":"A liderança falha leva à ruína.","familia":"Lideranca","verso_suporte":"Is 22:15-19","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-12',
  'Isaías 25-27',
  'Isaías',
  'Isaías 25-27',
  'Poeta',
  '1',
  ARRAY['banquete', 'morte', 'salvação', 'canção', 'vinha', 'paz', 'justiça', 'ressurreição'],
  '[{"tese":"Deus prepara banquete e traga a morte.","familia":"Teologia","verso_suporte":"Is 25:6-8","voz_performance":"Poeta"},{"tese":"Canção de Judá celebra a salvação.","familia":"Comunidade","verso_suporte":"Is 26:1-4","voz_performance":"Conselheiro"},{"tese":"A vinha de Deus é guardada noite e dia.","familia":"Teologia","verso_suporte":"Is 27:2-3","voz_performance":"Mestre"},{"tese":"Paz perfeita para os que confiam em Deus.","familia":"Teologia","verso_suporte":"Is 26:3","voz_performance":"Conselheiro"},{"tese":"Os mortos ressuscitam para louvor.","familia":"Teologia","verso_suporte":"Is 26:19","voz_performance":"Profeta"},{"tese":"A liderança canta a justiça de Deus.","familia":"Lideranca","verso_suporte":"Is 26:7-9","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-13',
  'Isaías 28-30',
  'Isaías',
  'Isaías 28-30',
  'Profeta',
  '1',
  ARRAY['ai', 'Efraim', 'pedra', 'aliança', 'descanso', 'juízo', 'fornalha', 'arrependimento'],
  '[{"tese":"Ai da coroa de soberba de Efraim.","familia":"Tensao","verso_suporte":"Is 28:1","voz_performance":"Profeta"},{"tese":"A pedra de esquina em Sião é fundamento.","familia":"Cristologico","verso_suporte":"Is 28:16","voz_performance":"Mestre"},{"tese":"Aliança com a morte é anulada.","familia":"Teologia","verso_suporte":"Is 28:18","voz_performance":"Profeta"},{"tese":"Descanso em Deus para o cansado.","familia":"Teologia","verso_suporte":"Is 28:12","voz_performance":"Conselheiro"},{"tese":"Arrependimento traz salvação.","familia":"Aplicacao","verso_suporte":"Is 30:15","voz_performance":"Poeta"},{"tese":"A liderança rejeita alianças com Egito.","familia":"Lideranca","verso_suporte":"Is 30:1-2","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-14',
  'Isaías 31-33',
  'Isaías',
  'Isaías 31-33',
  'Profeta',
  '1',
  ARRAY['Egito', 'confiança', 'justiça', 'rei', 'paz', 'deserto', 'fruto', 'segurança'],
  '[{"tese":"Ai dos que confiam no Egito, não em Deus.","familia":"Tensao","verso_suporte":"Is 31:1","voz_performance":"Profeta"},{"tese":"O rei reinará em justiça, príncipes em retidão.","familia":"Lideranca","verso_suporte":"Is 32:1","voz_performance":"Mestre"},{"tese":"O deserto se torna frutífero em paz.","familia":"Teologia","verso_suporte":"Is 32:15-17","voz_performance":"Poeta"},{"tese":"Ai das mulheres complacent in Jerusalem.","familia":"Tensao","verso_suporte":"Is 32:9-11","voz_performance":"Profeta"},{"tese":"Segurança em Sião para o remanescente.","familia":"Teologia","verso_suporte":"Is 33:14-16","voz_performance":"Conselheiro"},{"tese":"A liderança busca justiça para paz eterna.","familia":"Lideranca","verso_suporte":"Is 32:17","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-15',
  'Isaías 34-36',
  'Isaías',
  'Isaías 34-36',
  'Profeta',
  '1',
  ARRAY['juízo', 'Edom', 'deserto', 'alegria', 'Senaqueribe', 'blasfêmia', 'salvação', 'oração'],
  '[{"tese":"Juízo sobre as nações, Edom torna-se deserto.","familia":"Teologia","verso_suporte":"Is 34:1-8","voz_performance":"Profeta"},{"tese":"O deserto floresce com alegria e salvação.","familia":"Teologia","verso_suporte":"Is 35:1-2","voz_performance":"Poeta"},{"tese":"Senaqueribe blasfema contra Deus.","familia":"Tensao","verso_suporte":"Is 36:18-20","voz_performance":"Mestre"},{"tese":"A oração de Ezequias busca salvação.","familia":"Aplicacao","verso_suporte":"Is 37:15-20","voz_performance":"Conselheiro"},{"tese":"Deus fortalece as mãos fracas e joelhos trementes.","familia":"Teologia","verso_suporte":"Is 35:3-4","voz_performance":"Poeta"},{"tese":"A liderança resiste à blasfêmia com oração.","familia":"Lideranca","verso_suporte":"Is 36:21","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-16',
  'Isaías 37-39',
  'Isaías',
  'Isaías 37-39',
  'Profeta',
  '1',
  ARRAY['oração', 'salvação', 'anjo', 'morte', 'doença', 'sinal', 'Babilônia', 'exílio'],
  '[{"tese":"A oração de Ezequias move Deus a salvar.","familia":"Aplicacao","verso_suporte":"Is 37:21","voz_performance":"Conselheiro"},{"tese":"O anjo de Deus mata 185 mil assírios.","familia":"Teologia","verso_suporte":"Is 37:36","voz_performance":"Profeta"},{"tese":"Deus cura Ezequias e adiciona 15 anos.","familia":"Teologia","verso_suporte":"Is 38:5","voz_performance":"Poeta"},{"tese":"O sinal do sol retrocede na escada.","familia":"Teologia","verso_suporte":"Is 38:8","voz_performance":"Mestre"},{"tese":"Babilônia vê os tesouros, prenúncio de exílio.","familia":"Tensao","verso_suporte":"Is 39:6-7","voz_performance":"Profeta"},{"tese":"A liderança ora em tempos de crise.","familia":"Lideranca","verso_suporte":"Is 37:15","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-17',
  'Isaías 40-42',
  'Isaías',
  'Isaías 40-42',
  'Poeta',
  '1',
  ARRAY['consolo', 'erva', 'pastor', 'criador', 'servo', 'justiça', 'luz', 'cântico'],
  '[{"tese":"Consolai o meu povo, diz Deus.","familia":"Teologia","verso_suporte":"Is 40:1","voz_performance":"Conselheiro"},{"tese":"A erva seca, mas a palavra de Deus permanece.","familia":"Teologia","verso_suporte":"Is 40:8","voz_performance":"Poeta"},{"tese":"Deus é Pastor que reúne as ovelhas.","familia":"Teologia","verso_suporte":"Is 40:11","voz_performance":"Mestre"},{"tese":"O servo de Deus traz justiça às nações.","familia":"Cristologico","verso_suporte":"Is 42:1-4","voz_performance":"Profeta"},{"tese":"Novo cântico a Deus pelas Suas obras.","familia":"Aplicacao","verso_suporte":"Is 42:10","voz_performance":"Poeta"},{"tese":"A liderança proclama a grandeza do Criador.","familia":"Lideranca","verso_suporte":"Is 40:12-14","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-18',
  'Isaías 43-45',
  'Isaías',
  'Isaías 43-45',
  'Profeta',
  '1',
  ARRAY['redenção', 'águas', 'fogo', 'testemunha', 'Ciro', 'ungido', 'criador', 'idolatria'],
  '[{"tese":"Não temas, eu te remi pelas águas e fogo.","familia":"Teologia","verso_suporte":"Is 43:1-2","voz_performance":"Conselheiro"},{"tese":"Israel é testemunha do único Deus.","familia":"Teologia","verso_suporte":"Is 43:10-12","voz_performance":"Profeta"},{"tese":"Ciro é ungido para subjugar nações.","familia":"Teologia","verso_suporte":"Is 45:1","voz_performance":"Mestre"},{"tese":"Idolatria é vã, deuses não salvam.","familia":"Tensao","verso_suporte":"Is 44:9-20","voz_performance":"Profeta"},{"tese":"Deus é o Criador que apaga transgressões.","familia":"Teologia","verso_suporte":"Is 43:25","voz_performance":"Poeta"},{"tese":"A liderança de Ciro cumpre o propósito de Deus.","familia":"Lideranca","verso_suporte":"Is 45:13","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-19',
  'Isaías 46-48',
  'Isaías',
  'Isaías 46-48',
  'Profeta',
  '1',
  ARRAY['Bel', 'Nebo', 'idolos', 'salvação', 'refinar', 'fornalha', 'glória', 'teimosia'],
  '[{"tese":"Bel e Nebo se curvam, ídolos não salvam.","familia":"Teologia","verso_suporte":"Is 46:1-2","voz_performance":"Profeta"},{"tese":"Deus carrega Seu povo desde o ventre.","familia":"Teologia","verso_suporte":"Is 46:3-4","voz_performance":"Poeta"},{"tese":"Israel é refinado na fornalha da aflição.","familia":"Tensao","verso_suporte":"Is 48:10","voz_performance":"Conselheiro"},{"tese":"A glória de Deus não é dada a outro.","familia":"Teologia","verso_suporte":"Is 48:11","voz_performance":"Mestre"},{"tese":"A teimosia de Israel atrasa a salvação.","familia":"Tensao","verso_suporte":"Is 48:4","voz_performance":"Profeta"},{"tese":"A liderança denuncia idolatria inútil.","familia":"Lideranca","verso_suporte":"Is 46:5-7","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-20',
  'Isaías 49-51',
  'Isaías',
  'Isaías 49-51',
  'Profeta',
  '1',
  ARRAY['servo', 'luz', 'nações', 'salvação', 'justiça', 'estrelas', 'consolo', 'despertar'],
  '[{"tese":"O servo é luz para as nações.","familia":"Cristologico","verso_suporte":"Is 49:6","voz_performance":"Profeta"},{"tese":"Deus consola Sião com salvação eterna.","familia":"Teologia","verso_suporte":"Is 51:6","voz_performance":"Conselheiro"},{"tese":"Despertar para vestir força e beleza.","familia":"Aplicacao","verso_suporte":"Is 52:1","voz_performance":"Poeta"},{"tese":"As estrelas caem, mas a justiça permanece.","familia":"Teologia","verso_suporte":"Is 51:6","voz_performance":"Mestre"},{"tese":"Não temer o opróbrio dos homens.","familia":"Tensao","verso_suporte":"Is 51:7","voz_performance":"Profeta"},{"tese":"A liderança proclama salvação às nações.","familia":"Lideranca","verso_suporte":"Is 49:8","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-21',
  'Isaías 52-54',
  'Isaías',
  'Isaías 52-54',
  'Profeta',
  '1',
  ARRAY['servo', 'sofrimento', 'justificação', 'estéril', 'alegria', 'paz', 'montanhas', 'compaixão'],
  '[{"tese":"O servo sofredor justifica muitos.","familia":"Cristologico","verso_suporte":"Is 53:11","voz_performance":"Profeta"},{"tese":"A estéril alegra-se com filhos numerosos.","familia":"Teologia","verso_suporte":"Is 54:1","voz_performance":"Poeta"},{"tese":"As montanhas cantam de alegria.","familia":"Teologia","verso_suporte":"Is 52:9","voz_performance":"Conselheiro"},{"tese":"Paz como rio, justiça como ondas.","familia":"Teologia","verso_suporte":"Is 54:13","voz_performance":"Mestre"},{"tese":"Compaixão eterna de Deus.","familia":"Teologia","verso_suporte":"Is 54:8","voz_performance":"Poeta"},{"tese":"A liderança anuncia as boas novas.","familia":"Lideranca","verso_suporte":"Is 52:7","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-22',
  'Isaías 55-57',
  'Isaías',
  'Isaías 55-57',
  'Profeta',
  '1',
  ARRAY['sede', 'água', 'pacto', 'palavra', 'justiça', 'guarda', 'sábado', 'consolo'],
  '[{"tese":"Vinde às águas, os sedentos, sem dinheiro.","familia":"Teologia","verso_suporte":"Is 55:1","voz_performance":"Conselheiro"},{"tese":"A palavra de Deus não volta vazia.","familia":"Teologia","verso_suporte":"Is 55:11","voz_performance":"Mestre"},{"tese":"Guardar o sábado traz bênção.","familia":"Aplicacao","verso_suporte":"Is 56:2","voz_performance":"Profeta"},{"tese":"Ai dos líderes cegos e gananciosos.","familia":"Tensao","verso_suporte":"Is 56:10-11","voz_performance":"Profeta"},{"tese":"Consolo para os contritos de espírito.","familia":"Teologia","verso_suporte":"Is 57:15","voz_performance":"Poeta"},{"tese":"A liderança busca o pacto eterno.","familia":"Lideranca","verso_suporte":"Is 55:3","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-23',
  'Isaías 58-60',
  'Isaías',
  'Isaías 58-60',
  'Profeta',
  '1',
  ARRAY['jejum', 'justiça', 'luz', 'trevas', 'glória', 'salvação', 'redentor', 'paz'],
  '[{"tese":"Jejum verdadeiro liberta os oprimidos.","familia":"Aplicacao","verso_suporte":"Is 58:6-7","voz_performance":"Profeta"},{"tese":"A luz nasce para os justos.","familia":"Teologia","verso_suporte":"Is 58:8","voz_performance":"Poeta"},{"tese":"As trevas se tornam luz em Deus.","familia":"Teologia","verso_suporte":"Is 60:1-3","voz_performance":"Conselheiro"},{"tese":"O Redentor vem a Sião.","familia":"Cristologico","verso_suporte":"Is 59:20","voz_performance":"Mestre"},{"tese":"Paz como rio flui.","familia":"Teologia","verso_suporte":"Is 60:5","voz_performance":"Poeta"},{"tese":"A liderança denuncia jejum falso.","familia":"Lideranca","verso_suporte":"Is 58:1","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-24',
  'Isaías 61-63',
  'Isaías',
  'Isaías 61-63',
  'Profeta',
  '1',
  ARRAY['ungido', 'liberdade', 'vingança', 'louvor', 'justiça', 'oração', 'vinha', 'guarda'],
  '[{"tese":"O ungido proclama liberdade aos cativos.","familia":"Cristologico","verso_suporte":"Is 61:1","voz_performance":"Profeta"},{"tese":"Dia de vingança e ano de redenção.","familia":"Teologia","verso_suporte":"Is 61:2","voz_performance":"Mestre"},{"tese":"Louvor em vez de cinzas.","familia":"Teologia","verso_suporte":"Is 61:3","voz_performance":"Poeta"},{"tese":"Oração por justiça como armadura.","familia":"Aplicacao","verso_suporte":"Is 59:17","voz_performance":"Conselheiro"},{"tese":"A vinha de Deus é vigiada.","familia":"Teologia","verso_suporte":"Is 62:6","voz_performance":"Estrategista"},{"tese":"A liderança clama pela salvação.","familia":"Lideranca","verso_suporte":"Is 63:1","voz_performance":"Profeta"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-25',
  'Isaías 64-66',
  'Isaías',
  'Isaías 64-66',
  'Profeta',
  '1',
  ARRAY['céus', 'terra', 'justiça', 'Jerusalém', 'alegria', 'lobo', 'cordeiro', 'serpente'],
  '[{"tese":"Céus novos e terra nova onde justiça habita.","familia":"Teologia","verso_suporte":"Is 65:17","voz_performance":"Poeta"},{"tese":"Jerusalém alegra-se com paz eterna.","familia":"Teologia","verso_suporte":"Is 66:12","voz_performance":"Conselheiro"},{"tese":"Lobo e cordeiro pastam juntos.","familia":"Teologia","verso_suporte":"Is 65:25","voz_performance":"Mestre"},{"tese":"Deus olha para o humilde e contrito.","familia":"Teologia","verso_suporte":"Is 66:2","voz_performance":"Profeta"},{"tese":"A oração clama por rasgar os céus.","familia":"Aplicacao","verso_suporte":"Is 64:1","voz_performance":"Poeta"},{"tese":"A liderança adora em humildade.","familia":"Lideranca","verso_suporte":"Is 66:23","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-26',
  'Jeremias 1-3',
  'Jeremias',
  'Jeremias 1-3',
  'Profeta',
  '1',
  ARRAY['chamado', 'palavra', 'juízo', 'adultério', 'retorno', 'pastor', 'arrependimento', 'aliança'],
  '[{"tese":"Jeremias é chamado antes de nascer.","familia":"Teologia","verso_suporte":"Jr 1:5","voz_performance":"Profeta"},{"tese":"A palavra de Deus é como fogo e martelo.","familia":"Teologia","verso_suporte":"Jr 23:29","voz_performance":"Mestre"},{"tese":"Israel comete adultério espiritual.","familia":"Tensao","verso_suporte":"Jr 3:1","voz_performance":"Profeta"},{"tese":"Retorno a Deus traz restauração.","familia":"Aplicacao","verso_suporte":"Jr 3:22","voz_performance":"Conselheiro"},{"tese":"Pastores falsos enganam o povo.","familia":"Tensao","verso_suporte":"Jr 2:8","voz_performance":"Mestre"},{"tese":"A liderança profética denuncia infidelidade.","familia":"Lideranca","verso_suporte":"Jr 2:2","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-27',
  'Jeremias 4-6',
  'Jeremias',
  'Jeremias 4-6',
  'Profeta',
  '1',
  ARRAY['arrependimento', 'circuncisão', 'coração', 'juízo', 'leão', 'deserto', 'profeta', 'paz'],
  '[{"tese":"Arrependimento genuíno evita juízo.","familia":"Aplicacao","verso_suporte":"Jr 4:1-4","voz_performance":"Profeta"},{"tese":"Circuncidar o coração para fidelidade.","familia":"Teologia","verso_suporte":"Jr 4:4","voz_performance":"Conselheiro"},{"tese":"Leão do norte traz destruição.","familia":"Tensao","verso_suporte":"Jr 4:7","voz_performance":"Poeta"},{"tese":"Falsos profetas dizem paz quando não há.","familia":"Tensao","verso_suporte":"Jr 6:14","voz_performance":"Mestre"},{"tese":"O deserto é caminho de salvação.","familia":"Teologia","verso_suporte":"Jr 6:16","voz_performance":"Poeta"},{"tese":"A liderança clama por arrependimento nacional.","familia":"Lideranca","verso_suporte":"Jr 4:5","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-28',
  'Jeremias 7-9',
  'Jeremias',
  'Jeremias 7-9',
  'Profeta',
  '1',
  ARRAY['templo', 'falsidade', 'idolatria', 'juízo', 'lamento', 'sabedoria', 'lei', 'circuncisão'],
  '[{"tese":"Não confiar no templo falsamente.","familia":"Teologia","verso_suporte":"Jr 7:4","voz_performance":"Profeta"},{"tese":"Idolatria provoca juízo como Siló.","familia":"Tensao","verso_suporte":"Jr 7:12-14","voz_performance":"Mestre"},{"tese":"Lamento pelas feridas do povo.","familia":"Tensao","verso_suporte":"Jr 8:21","voz_performance":"Poeta"},{"tese":"Sabedoria e lei são rejeitadas.","familia":"Teologia","verso_suporte":"Jr 8:8-9","voz_performance":"Conselheiro"},{"tese":"Circuncisão do coração, não da carne.","familia":"Teologia","verso_suporte":"Jr 9:25-26","voz_performance":"Profeta"},{"tese":"A liderança denuncia hipocrisia religiosa.","familia":"Lideranca","verso_suporte":"Jr 7:9-11","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-29',
  'Jeremias 10-12',
  'Jeremias',
  'Jeremias 10-12',
  'Profeta',
  '1',
  ARRAY['idolos', 'criador', 'juízo', 'conspiração', 'pastor', 'aliança', 'arrependimento', 'cura'],
  '[{"tese":"Ídolos são vaidade, não criam.","familia":"Teologia","verso_suporte":"Jr 10:3-5","voz_performance":"Profeta"},{"tese":"Deus é o Criador, rei das nações.","familia":"Teologia","verso_suporte":"Jr 10:10","voz_performance":"Poeta"},{"tese":"Conspiração contra Jeremias é julgada.","familia":"Tensao","verso_suporte":"Jr 11:18-19","voz_performance":"Conselheiro"},{"tese":"Aliança quebrada traz maldição.","familia":"Teologia","verso_suporte":"Jr 11:3-4","voz_performance":"Mestre"},{"tese":"Arrependimento cura a nação.","familia":"Aplicacao","verso_suporte":"Jr 12:14-17","voz_performance":"Profeta"},{"tese":"A liderança lamenta a rejeição da palavra.","familia":"Lideranca","verso_suporte":"Jr 10:19","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-30',
  'Jeremias 13-15',
  'Jeremias',
  'Jeremias 13-15',
  'Profeta',
  '1',
  ARRAY['cinto', 'orgulho', 'juízo', 'seca', 'fome', 'profeta', 'intercessão', 'rejeição'],
  '[{"tese":"O cinto podre simboliza orgulho de Judá.","familia":"Teologia","verso_suporte":"Jr 13:9-10","voz_performance":"Profeta"},{"tese":"Seca e fome como juízo divino.","familia":"Tensao","verso_suporte":"Jr 14:1-6","voz_performance":"Poeta"},{"tese":"Profetas falsos profetizam mentiras.","familia":"Tensao","verso_suporte":"Jr 14:14","voz_performance":"Mestre"},{"tese":"Intercessão de Jeremias é rejeitada.","familia":"Teologia","verso_suporte":"Jr 15:1","voz_performance":"Conselheiro"},{"tese":"Rejeição da palavra traz destruição.","familia":"Teologia","verso_suporte":"Jr 13:17","voz_performance":"Profeta"},{"tese":"A liderança lamenta o destino do povo.","familia":"Lideranca","verso_suporte":"Jr 15:10","voz_performance":"Estrategista"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;

INSERT INTO leitura_do_dia (data, passagem_do_dia, livro, capitulos, arquetipo, voice_pack_id, lexico_do_dia, insights_pre_minerados)
VALUES (
  '2026-01-31',
  'Jeremias 16-18',
  'Jeremias',
  'Jeremias 16-18',
  'Profeta',
  '1',
  ARRAY['sinal', 'exílio', 'pescadores', 'caçadores', 'oleiro', 'barro', 'conspiração', 'árvore'],
  '[{"tese":"Jeremias não se casa como sinal de juízo.","familia":"Teologia","verso_suporte":"Jr 16:1-4","voz_performance":"Profeta"},{"tese":"Deus envia pescadores e caçadores para o exílio.","familia":"Teologia","verso_suporte":"Jr 16:16","voz_performance":"Poeta"},{"tese":"O oleiro remodela o barro como Deus a Israel.","familia":"Teologia","verso_suporte":"Jr 18:1-6","voz_performance":"Mestre"},{"tese":"Conspiração contra Jeremias é julgada.","familia":"Tensao","verso_suporte":"Jr 18:18","voz_performance":"Conselheiro"},{"tese":"Árvore verde seca no juízo.","familia":"Teologia","verso_suporte":"Jr 17:8","voz_performance":"Poeta"}]'::jsonb
)
ON CONFLICT (data) DO UPDATE SET
  passagem_do_dia = EXCLUDED.passagem_do_dia,
  livro = EXCLUDED.livro,
  arquetipo = EXCLUDED.arquetipo,
  lexico_do_dia = EXCLUDED.lexico_do_dia,
  insights_pre_minerados = EXCLUDED.insights_pre_minerados;
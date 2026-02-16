-- Migration: Normalize Categories
-- Description: Removes accents from categories to avoid frontend mismatches.

UPDATE dna_categorizado SET categoria = 'oracao' WHERE categoria = 'oração';
UPDATE dna_categorizado SET categoria = 'reflexao' WHERE categoria = 'reflexão';
UPDATE dna_categorizado SET categoria = 'exortacao' WHERE categoria = 'exortação';
UPDATE dna_categorizado SET categoria = 'declaracao' WHERE categoria = 'declaração';
UPDATE dna_categorizado SET categoria = 'versiculo' WHERE categoria = 'versículo';
UPDATE dna_categorizado SET categoria = 'devocional' WHERE categoria = 'Devocional Criado';

-- Ensure all are lowercase
UPDATE dna_categorizado SET categoria = LOWER(categoria);

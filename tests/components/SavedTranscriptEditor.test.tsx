import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SavedTranscriptEditor } from '../../src/components/SavedTranscriptEditor';

const atualizarTextoTranscricao = vi.fn();
vi.mock('../../src/lib/transcricoes', () => ({
    atualizarTextoTranscricao: (...args: unknown[]) => atualizarTextoTranscricao(...args),
}));

describe('SavedTranscriptEditor', () => {
    it('permite copiar e editar uma transcrição salva', async () => {
        atualizarTextoTranscricao.mockResolvedValue(true);
        const onSaved = vi.fn();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(<SavedTranscriptEditor id="abc" texto="Texto original" onSaved={onSaved} />);

        fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
        expect(writeText).toHaveBeenCalledWith('Texto original');

        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
        const editor = screen.getByRole('textbox');
        fireEvent.change(editor, { target: { value: 'Texto corrigido' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

        await waitFor(() => expect(atualizarTextoTranscricao).toHaveBeenCalledWith('abc', 'Texto corrigido'));
        expect(onSaved).toHaveBeenCalledWith('Texto corrigido');
        expect(screen.getByText('Texto corrigido')).toBeInTheDocument();
    });
});

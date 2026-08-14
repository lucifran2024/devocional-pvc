import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/deploy-edge-only.yml'),
  'utf8',
);

describe('deploy das Edge Functions versionadas', () => {
  it('publica transcrever-youtube quando seu código muda', () => {
    expect(workflow).toContain('supabase/functions/transcrever-youtube/**');
    expect(workflow).toContain(
      'supabase functions deploy transcrever-youtube --project-ref tayopwdelkmelgmrtnoa',
    );
  });
});

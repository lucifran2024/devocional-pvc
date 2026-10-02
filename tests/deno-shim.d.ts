// Os testes importam código das Edge Functions (Deno). Para a checagem de tipos
// do Next (tsc --noEmit, Node), declara só o que esse código usa do Deno.
// Não vai para a Edge: lá o Deno é o runtime de verdade.
declare const Deno: {
    env: { get(name: string): string | undefined };
};

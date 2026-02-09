import { redirect } from 'next/navigation';

export default function FavoritosPage() {
  redirect('/dna-categorizado?tab=gerar-dna');
}

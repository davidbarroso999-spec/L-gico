import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Página Não Encontrada</h1>
      <p className="text-slate-400 mb-6">A página que você está procurando não existe ou foi movida.</p>
      <Link 
        href="/"
        className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}

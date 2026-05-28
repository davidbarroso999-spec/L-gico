import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col items-center justify-center text-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <div className="glass max-w-md p-8 rounded-[32px] border border-white/5 space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
          <span className="text-3xl">🏜️</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-display tracking-tight text-white">404</h1>
          <p className="text-base text-slate-200 font-medium">Página Não Encontrada</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            O endereço fornecido não foi localizado no servidor da Voie Express ou está temporariamente inacessível.
          </p>
        </div>
        <Link 
          href="/" 
          className="inline-flex w-full items-center justify-center px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-98 rounded-xl transition duration-200 border border-white/10"
        >
          Voltar para a Rota Inicial
        </Link>
      </div>
    </div>
  );
}

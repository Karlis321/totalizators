import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto pb-[78px]">
      <AppHeader />
      <div className="flex flex-col items-center justify-center mt-16 px-4 text-center">
        <span className="text-5xl">🤔</span>
        <h1 className="text-xl font-bold text-grey-900 mt-4">Dalībnieks nav atrasts.</h1>
        <p className="text-sm text-grey-600 mt-2">Pārbaudi saiti un mēģini vēlreiz.</p>
      </div>
      <BottomNav />
    </div>
  );
}

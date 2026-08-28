
import React, { useState } from 'react';
import { Gamepad2, Play, X } from 'lucide-react';
import { ChessGame } from './ChessGame';

// =============================================================================
// MAIN GAMES ROOM COMPONENT
// =============================================================================

interface Game {
  id: string;
  name: string;
  desc: string;
  icon: string;
  url: string;
  color: string;
  isBuiltIn?: boolean;
}

const GAMES_LIST: Game[] = [
  {
    id: 'chess',
    name: 'شطرنج الملوك والوزراء',
    desc: 'لعبة الشطرنج الكلاسيكية كاملة المبادئ والقواعد، بقطعها وحساب كش ملك والعب ضد ذكاء اصطناعي متميز.',
    icon: '👑',
    url: '',
    color: 'bg-emerald-600',
    isBuiltIn: true
  },
  {
    id: 'dino',
    name: 'ديناصور',
    desc: 'اللعبة الكلاسيكية الشهيرة للديناصور عند انقطاع الإنترنت.',
    icon: '🦖',
    url: 'dino.html',
    color: 'bg-zinc-700',
    isBuiltIn: true
  },
  {
    id: '2048',
    name: '2048',
    desc: 'ادمج الأرقام للوصول إلى المربع 2048 الشهير.',
    icon: '🔢',
    url: 'https://games.softgames.com/games/2048/embed/2048',
    color: 'bg-amber-500'
  }
];

interface GamesRoomProps {
  isDarkMode?: boolean;
}

const GamesRoom: React.FC<GamesRoomProps> = ({ isDarkMode }) => {
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  const filteredGames = GAMES_LIST;

  // Fully-featured integrated full page layout for active game
  if (activeGame) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300 text-right" dir="rtl">
        {/* Game Title Bar / Nav Header */}
        <div className={`p-6 mb-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-emerald-500/10 p-2.5 rounded-2xl">{activeGame.icon}</span>
            <div>
              <h3 className={`font-black text-xl mb-0.5 ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>{activeGame.name}</h3>
              <p className="text-xs font-bold text-gray-400">
                {activeGame.id === 'chess' ? 'حدد أي قطعة لمشاهدة التحركات المتاحة قانوناً والعب ضد الذكاء الاصطناعي.' : 'استخدم الأسهم لمواصلة التحكم والتحرك بحرية.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button 
              onClick={() => setActiveGame(null)} 
              className="px-5 py-3 rounded-2xl bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white font-black text-xs md:text-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X size={16} />
              الخروج والعودة للقائمة
            </button>
          </div>
        </div>

        {/* Full Page Game Container */}
        <div className={`flex-1 w-full rounded-3xl border overflow-auto p-2 ${isDarkMode ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          {activeGame.id === 'chess' ? (
            <ChessGame isDarkMode={isDarkMode} />
          ) : (
            <div className="w-full h-[650px] relative rounded-2xl overflow-hidden border border-gray-200">
              <iframe 
                src={activeGame.url} 
                title={activeGame.name}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen"
                onLoad={(e) => {
                  try {
                    (e.target as HTMLIFrameElement).contentWindow?.focus();
                  } catch (err) {
                    console.error("Focus failed:", err);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 text-right" dir="rtl">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>غرفة الألعاب</h2>
            <p className="text-gray-400 text-sm font-bold">وقت الراحة والترفيه للموظفين</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar p-2">
        {filteredGames.map((game) => (
          <div 
            key={game.id}
            onClick={() => setActiveGame(game)}
            className={`group p-8 rounded-[40px] border shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer flex flex-col items-center text-center relative ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}
          >
            <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
              {game.icon}
            </div>
            <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{game.name}</h4>
            <p className="text-xs font-bold text-gray-400 mb-6">{game.desc}</p>
            
            <button 
              className={`px-8 py-3 rounded-2xl font-black text-sm text-white shadow-lg transition-all flex items-center gap-2 ${game.color}`}
            >
              <Play size={16} fill="currentColor" />
              ابدأ اللعب الآن
            </button>

            {game.isBuiltIn && (
              <div className="absolute top-4 left-4 bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter">
                نسخة مدمجة
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamesRoom;

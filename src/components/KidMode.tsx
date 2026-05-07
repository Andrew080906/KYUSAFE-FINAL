import React, { useState } from 'react';
import { Gamepad2, Trophy, Mic, BookOpen, Star, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PREPAREDNESS_BADGES } from '../constants';
import { translations } from '../translations';

export const KidMode: React.FC<{ language?: 'en' | 'tl' }> = ({ language = 'en' }) => {
  const t = translations[language];
  const [quizStep, setQuizStep] = useState(0);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(1250);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(['1', '2']);

  const quizQuestions = language === 'en' ? [
    {
      q: "What should you do if there's an earthquake?",
      options: ["Run outside", "Duck, Cover, and Hold", "Hide in a closet"],
      a: 1
    },
    {
      q: "What's the emergency number for QC?",
      options: ["122", "123", "111"],
      a: 0
    },
    {
      q: "What should you pack in your Go Bag?",
      options: ["Video games", "Water and snacks", "Heavy books"],
      a: 1
    }
  ] : [
    {
      q: "Ano ang dapat mong gawin kung may lindol?",
      options: ["Tumakbo sa labas", "Duck, Cover, and Hold", "Magtago sa aparador"],
      a: 1
    },
    {
      q: "Ano ang emergency number para sa QC?",
      options: ["122", "123", "111"],
      a: 0
    },
    {
      q: "Ano ang dapat mong ilagay sa iyong Go Bag?",
      options: ["Video games", "Tubig at snacks", "Mabibigat na libro"],
      a: 1
    }
  ];

  const leaderboardData = [
    { name: "Hero Momo", points: 2850, avatar: "🦁" },
    { name: "Safety Sam", points: 2400, avatar: "🦊" },
    { name: t.you, points: totalPoints, avatar: "🦸" },
    { name: "Brave Bella", points: 1100, avatar: "🐰" },
    { name: "Alert Alex", points: 950, avatar: "🐼" },
  ];

  const handleAnswer = (idx: number) => {
    if (idx === quizQuestions[quizStep].a) {
      setScore(prev => prev + 1);
      setTotalPoints(prev => prev + 100);
    }
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(prev => prev + 1);
    } else {
      setQuizStep(-1); // Finished
      if (score + (idx === quizQuestions[quizStep].a ? 1 : 0) === quizQuestions.length) {
        if (!unlockedBadges.includes('3')) {
          setUnlockedBadges(prev => [...prev, '3']);
        }
      }
    }
  };

  const handlePlayInstructions = () => {
    setIsPlaying(true);
    setTotalPoints(prev => prev + 50);
    setTimeout(() => setIsPlaying(false), 3000);
  };

  return (
    <div className="space-y-8 p-4 pb-32 bg-white dark:bg-slate-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12">
          <Trophy size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black leading-tight">{t.kidHeroTitle}</h2>
              <p className="text-yellow-100 font-medium mt-2">{t.kidHeroSubtitle}</p>
            </div>
            <button 
              onClick={() => setShowLeaderboard(true)}
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-md active:scale-95 transition-all"
            >
              <Trophy className="w-8 h-8" />
            </button>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-grow bg-white/30 h-4 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(totalPoints / 3000) * 100}%` }}
                className="bg-white h-full"
              />
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black uppercase opacity-70">{t.totalXP}</span>
              <span className="font-black text-xl">{totalPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-2 border-yellow-50 dark:border-yellow-900/30 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-2">
            <Star size={24} fill="currentColor" />
          </div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{t.badges}</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">{unlockedBadges.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-2 border-orange-50 dark:border-orange-900/30 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-2">
            <Gamepad2 size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{t.rank}</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">#3</p>
        </div>
      </div>

      {/* Daily Safety Tip */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-[40px] border-2 border-blue-100 dark:border-blue-900/30 flex items-center gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm text-blue-600 dark:text-blue-400">
          <Heart size={32} fill="currentColor" />
        </div>
        <div>
          <h4 className="text-xs font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest">{t.dailyHeroTip}</h4>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-200 leading-tight mt-1">{t.goBagTip}</p>
        </div>
      </div>

      {/* Quiz Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border-4 border-yellow-200 dark:border-yellow-900/50 shadow-xl">
        {!showQuiz ? (
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <Gamepad2 className="w-16 h-16 text-orange-500 dark:text-orange-400 mx-auto" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full"
              >
                +300 XP
              </motion.div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t.safetyQuizTitle}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t.safetyQuizSubtitle}</p>
            <button 
              onClick={() => setShowQuiz(true)}
              className="w-full bg-orange-500 dark:bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all"
            >
              {t.startQuiz}
            </button>
          </div>
        ) : quizStep === -1 ? (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto text-white shadow-lg"
            >
              <Trophy size={40} />
            </motion.div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t.missionComplete}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.quizResult.replace('{score}', score.toString()).replace('{total}', quizQuestions.length.toString())}</p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
              <p className="text-yellow-700 dark:text-yellow-400 font-black text-sm">{t.levelUp} +{score * 100} XP</p>
            </div>
            <button 
              onClick={() => { setShowQuiz(false); setQuizStep(0); setScore(0); }}
              className="w-full bg-emerald-500 dark:bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all"
            >
              {t.playAgain}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest">{t.question} {quizStep + 1}</span>
              <span className="text-xs font-black text-slate-300 dark:text-slate-600">{quizStep + 1}/{quizQuestions.length}</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{quizQuestions[quizStep].q}</h3>
            <div className="space-y-3">
              {quizQuestions[quizStep].options.map((opt, i) => (
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Voice Drills */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Mic className="text-orange-500 dark:text-orange-400" /> {t.listenToParents}
        </h3>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-orange-100 dark:border-orange-900/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800 dark:text-white">{t.emergencyDrill}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isPlaying ? t.playingAudio : t.recordedDaysAgo.replace('{days}', '2')}</p>
          </div>
          <button 
            onClick={handlePlayInstructions}
            disabled={isPlaying}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${isPlaying ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500' : 'bg-orange-500 dark:bg-orange-600 text-white hover:bg-orange-600 dark:hover:bg-orange-700'}`}
          >
            {isPlaying ? t.playing : t.playInstructions}
          </button>
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">{t.heroBadges}</h3>
          <span className="text-xs font-bold text-blue-500 dark:text-blue-400">{unlockedBadges.length}/{PREPAREDNESS_BADGES.length} {t.unlocked}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {PREPAREDNESS_BADGES.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <div 
                key={badge.id} 
                className={`p-6 rounded-[32px] border-2 flex flex-col items-center text-center transition-all ${
                  isUnlocked ? 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/30 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 grayscale'
                }`}
              >
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 ${
                  isUnlocked ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}>
                  <Star fill={isUnlocked ? "currentColor" : "none"} />
                </div>
                <p className="font-black text-slate-800 dark:text-white text-sm leading-tight">{badge.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-tighter">{isUnlocked ? t.unlocked : t.locked}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] p-8 shadow-2xl space-y-6 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-[#002147] dark:text-white">{t.topHeroes}</h3>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {leaderboardData.map((player, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-4 rounded-2xl ${
                      player.name === t.you ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-900/50' : 'bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-6 font-black text-slate-400 dark:text-slate-600 text-sm">#{i + 1}</span>
                      <span className="text-2xl">{player.avatar}</span>
                      <span className={`font-bold ${player.name === t.you ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {player.name}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">{player.points} XP</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Monster Guard Training */}
      <section className="bg-[#002147] dark:bg-blue-900 p-8 rounded-[40px] text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <BookOpen className="w-8 h-8" />
          <h3 className="text-2xl font-black">{t.safetyStories}</h3>
        </div>
        <p className="text-blue-100 mb-6">{t.safetyStoriesSubtitle}</p>
        <button 
          onClick={() => setShowStory(true)}
          className="w-full bg-white dark:bg-slate-100 text-[#002147] dark:text-blue-900 py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all"
        >
          {t.startTraining}
        </button>
      </section>

      {/* Story Modal */}
      <AnimatePresence>
        {showStory && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[80vh] border border-slate-100 dark:border-slate-700"
            >
              <div className="text-center space-y-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                  <Heart size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t.braveLittleMonster}</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.momoStory}
                </p>
                <button 
                  onClick={() => setShowStory(false)}
                  className="w-full bg-orange-500 dark:bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg"
                >
                  {t.imAHeroToo}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

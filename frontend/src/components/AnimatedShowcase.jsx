import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Share2, CheckCircle2, Wand2 } from 'lucide-react';

const AnimatedShowcase = () => {
  const [step, setStep] = useState(0);

  // Sequence (2.5s per step):
  // 0: Typing with errors
  // 1: Cursor moving to AI Rewrite
  // 2: AI clicked, text corrects
  // 3: Cursor moving to Share
  // 4: Share clicked, Toast
  // 5: Reset loop
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 6);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const getCursorPos = (s) => {
    switch (s) {
      case 0: return { x: 50, y: 150 }; // Initial
      case 1: return { x: 160, y: 40 }; // Over AI button
      case 2: return { x: 160, y: 40 }; // Click AI
      case 3: return { x: 260, y: 40 }; // Over Share button
      case 4: return { x: 260, y: 40 }; // Click Share
      case 5: return { x: 50, y: 150 }; // Reset
      default: return { x: 50, y: 150 };
    }
  };

  return (
    <div className="w-full h-full bg-neu-pink/20 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-neu-yellow rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-neu-cyan rounded-full blur-3xl opacity-50"></div>

      {/* Mac Window Mockup */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-neu-xl border-neu border-neu-black overflow-hidden relative z-10 flex flex-col h-[400px]">
        
        {/* Mac Toolbar */}
        <div className="h-10 bg-neu-bg-warm border-b border-neu-black flex items-center px-4 gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-neu-red border border-neu-black"></div>
          <div className="w-3 h-3 rounded-full bg-neu-yellow border border-neu-black"></div>
          <div className="w-3 h-3 rounded-full bg-neu-green border border-neu-black"></div>
          <div className="ml-auto font-mono text-xs font-bold text-gray-500">notes.app</div>
        </div>

        {/* Window Body Split */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Mock Sidebar (Reduced Width) */}
          <div className="w-40 bg-gray-50 border-r border-gray-200 p-4 shrink-0 hidden sm:block">
            <div className="h-4 w-20 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-6 w-full bg-white border border-gray-200 rounded shadow-sm"></div>
              <div className="h-6 w-3/4 bg-transparent border border-transparent"></div>
              <div className="h-6 w-5/6 bg-transparent border border-transparent"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded mb-4 mt-8"></div>
            <div className="space-y-3">
              <div className="h-6 w-full bg-transparent border border-transparent"></div>
            </div>
          </div>

          {/* Mock Editor Area */}
          <div className="flex-1 p-6 relative flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div className="w-1/2">
                <h2 className="text-3xl font-display font-bold mb-4">Project Alpha</h2>
                
                {/* Typing & Correction Animation */}
                <div className="relative h-20 text-gray-700 font-medium leading-relaxed">
                  <div className="absolute inset-0">
                    {step < 2 ? (
                      <>
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: step === 0 ? "100%" : "100%" }}
                          transition={{ duration: 1.5, ease: "linear" }}
                          className="overflow-hidden whitespace-nowrap text-red-500/80 decoration-wavy decoration-red-400 underline underline-offset-4"
                        >
                          We ned to fnalize the<br/>
                        </motion.div>
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: step === 0 ? "0%" : "100%" }}
                          transition={{ duration: 1, ease: "linear", delay: step === 0 ? 1.5 : 0 }}
                          className="overflow-hidden whitespace-nowrap mt-1 text-red-500/80 decoration-wavy decoration-red-400 underline underline-offset-4"
                        >
                          new desing by friday.
                        </motion.div>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="whitespace-nowrap font-bold"
                      >
                        <span className="text-neu-green">We need to finalize the</span><br/>
                        <div className="mt-1 text-neu-green">new design by Friday.</div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 absolute top-6 right-6 z-10">
                {/* AI Rewrite Button */}
                <motion.button 
                  className="btn !bg-neu-purple !text-white !px-3 !py-1.5 flex items-center gap-2 !text-sm border-neu border-neu-black"
                  animate={{
                    scale: step === 2 ? 0.95 : 1,
                    boxShadow: step === 2 ? "0px 0px 0px 0px #000" : "3px 3px 0px 0px #000",
                    x: step === 2 ? 3 : 0,
                    y: step === 2 ? 3 : 0
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <Wand2 size={16} />
                  <span>AI Rewrite</span>
                </motion.button>

                {/* Share Button */}
                <motion.button 
                  className="btn btn-green !px-3 !py-1.5 flex items-center gap-2 !text-sm border-neu border-neu-black"
                  animate={{
                    scale: step === 4 ? 0.95 : 1,
                    boxShadow: step === 4 ? "0px 0px 0px 0px #000" : "3px 3px 0px 0px #000",
                    x: step === 4 ? 3 : 0,
                    y: step === 4 ? 3 : 0
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </motion.button>
              </div>
            </div>

            {/* Simulated Cursor */}
            <motion.div
              className="absolute z-20 pointer-events-none drop-shadow-md text-neu-black"
              initial={{ x: 50, y: 150, opacity: 0 }}
              animate={{
                ...getCursorPos(step),
                opacity: step === 5 ? 0 : 1,
                scale: (step === 2 || step === 4) ? 0.8 : 1
              }}
              transition={{
                x: { type: "spring", stiffness: 100, damping: 15 },
                y: { type: "spring", stiffness: 100, damping: 15 },
                opacity: { duration: 0.3 }
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFF" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>
              </svg>
            </motion.div>

            {/* Toast Notification */}
            <AnimatePresence>
              {step >= 4 && step < 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-6 right-6 bg-neu-white border-neu border-neu-black shadow-neu-sm p-3 flex items-center gap-3 font-bold text-sm z-10"
                >
                  <CheckCircle2 size={18} className="text-neu-green" />
                  Shared with team!
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedShowcase;

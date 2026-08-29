import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  Search,
  Clock,
  CheckCircle2,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Smartphone,
  Edit3,
  Youtube,
  Music,
  Radio,
  FileText,
  MapPin,
  PhoneCall,
  Calculator,
  Flame,
  Zap,
} from 'lucide-react';
import { ToolCallEvent } from '../types';

interface ToolHUDProps {
  activeTools: ToolCallEvent[];
  onDismiss: (id: string) => void;
  theme?: 'light' | 'dark';
}

export const ToolHUD: React.FC<ToolHUDProps> = React.memo(({ activeTools, onDismiss, theme = 'light' }) => {
  if (activeTools.length === 0) return null;
  const isDark = theme === 'dark';

  return (
    <div id="lila-tool-hud-container" className="w-full max-w-lg mx-auto px-4 mb-4 space-y-2.5">
      <AnimatePresence>
        {activeTools.map((tool) => {
          const isSearch = tool.name === 'searchWeb';
          const isOpenWeb = tool.name === 'openWebsite';
          const isClock = tool.name === 'getDateTime';
          const isCall = tool.name === 'call' || (tool.name === 'app_control' && tool.args?.action === 'call');
          const isCalc = tool.name === 'calculate' || (tool.name === 'app_control' && tool.args?.action === 'calculate');
          const isSetting = tool.name === 'toggle_setting' || (tool.name === 'app_control' && tool.args?.action === 'toggle_setting');
          const isAppControl = tool.name === 'app_control' || isCall || isCalc || isSetting;

          const action = tool.args?.action || (isCall ? 'call' : isCalc ? 'calculate' : isSetting ? 'toggle_setting' : '');
          const targetApp = (tool.args?.target_app || (isCall ? 'phone' : isCalc ? 'calculator' : isSetting ? 'settings' : '')).toLowerCase();
          const query = tool.args?.query || '';
          const textToType = tool.args?.text_to_type || '';
          const phoneNumber = tool.args?.phone_number || tool.result?.data?.phone_number || '';
          const contactName = tool.args?.contact_name || tool.result?.data?.contact_name || '';
          const expression = tool.args?.expression || tool.args?.math_expression || tool.result?.data?.expression || '';

          // App control specific icon & label
          let AppIcon = Smartphone;
          let appCategoryLabel = 'Device Control';

          if (isCall || targetApp.includes('phone')) {
            AppIcon = PhoneCall;
            appCategoryLabel = 'Phone Calling (Step 1)';
          } else if (isCalc || targetApp.includes('calc')) {
            AppIcon = Calculator;
            appCategoryLabel = 'Calculator (Step 3)';
          } else if (isSetting || targetApp.includes('setting')) {
            AppIcon = Zap;
            appCategoryLabel = 'Device Setting';
          } else if (targetApp.includes('youtube')) {
            AppIcon = Youtube;
            appCategoryLabel = 'YouTube Control';
          } else if (targetApp.includes('spotify') || targetApp.includes('music')) {
            AppIcon = Music;
            appCategoryLabel = 'Music & Media (Step 2)';
          } else if (targetApp.includes('keep') || targetApp.includes('note')) {
            AppIcon = FileText;
            appCategoryLabel = 'Notes Dictation (Step 3)';
          } else if (targetApp.includes('map')) {
            AppIcon = MapPin;
            appCategoryLabel = 'Maps & Navigation';
          }

          let actionBadge = action.toUpperCase();
          if (action === 'call') actionBadge = 'CALLING';
          if (action === 'calculate') actionBadge = 'CALCULATING';
          if (action === 'pause') actionBadge = 'PAUSED';
          if (action === 'play' || action === 'resume') actionBadge = 'PLAYING';
          if (action === 'next') actionBadge = 'NEXT TRACK';
          if (action === 'previous') actionBadge = 'PREVIOUS TRACK';
          if (action === 'type_text') actionBadge = 'NOTEPAD INJECTION';
          if (action === 'toggle_setting') actionBadge = 'SETTING TOGGLE';

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-colors ${
                isDark
                  ? 'bg-[#181A20] border-[#2B2F3A] text-white shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
                  : 'bg-white border-gray-200 text-[#1D1D1F]'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                      isCall
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                        : isCalc
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                        : isAppControl
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                        : isDark
                        ? 'bg-[#12141A] border-[#2B2F3A]'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {isCall && <PhoneCall className="w-4 h-4 text-emerald-600" />}
                    {isCalc && <Calculator className="w-4 h-4 text-blue-600" />}
                    {isSetting && <Zap className="w-4 h-4 text-amber-500" />}
                    {!isCall && !isCalc && !isSetting && isAppControl && (
                      <>
                        {action === 'pause' && <Pause className="w-4 h-4 text-rose-500" />}
                        {(action === 'play' || action === 'resume') && <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />}
                        {action === 'next' && <SkipForward className="w-4 h-4 text-blue-500" />}
                        {action === 'previous' && <SkipBack className="w-4 h-4 text-blue-500" />}
                        {(action === 'volume_up' || action === 'volume_down') && <Volume2 className="w-4 h-4 text-amber-500" />}
                        {action === 'type_text' && <Edit3 className="w-4 h-4 text-purple-500" />}
                        {action === 'open' && <AppIcon className="w-4 h-4 text-rose-500" />}
                        {(action === 'search' || action === 'play_media') && <Search className="w-4 h-4 text-rose-500" />}
                      </>
                    )}
                    {isOpenWeb && <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                    {isSearch && <Search className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                    {isClock && <Clock className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        isCall
                          ? 'text-emerald-600'
                          : isCalc
                          ? 'text-blue-600'
                          : isAppControl
                          ? 'text-rose-500'
                          : 'text-gray-400'
                      }`}>
                        {isAppControl
                          ? `${appCategoryLabel} • ${actionBadge}`
                          : isOpenWeb
                          ? 'Opening Website'
                          : isSearch
                          ? 'Web Search'
                          : 'Clock & Time'}
                      </span>
                      {tool.status === 'completed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-[#1D1D1F]'}`}>
                      {isCall
                        ? contactName
                          ? `Dialing ${contactName} (${phoneNumber || 'Phone'})`
                          : `Calling ${phoneNumber}`
                        : isCalc
                        ? `Calculate: ${expression || query}`
                        : isAppControl
                        ? query
                          ? `"${query}" on ${targetApp}`
                          : textToType
                          ? `Dictate: "${textToType.slice(0, 45)}..."`
                          : `${action.toUpperCase()} on ${targetApp || 'System Media'}`
                        : isOpenWeb
                        ? tool.args.url
                        : isSearch
                        ? `"${tool.args.query}"`
                        : 'System Time Check'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(tool.id)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-black hover:bg-gray-100'
                  }`}
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body / Result Preview */}
              {tool.result && (
                <div
                  className={`mt-3 pt-2.5 border-t text-xs space-y-2 ${
                    isDark ? 'border-white/10 text-gray-300' : 'border-gray-100 text-gray-600'
                  }`}
                >
                  <p className="leading-relaxed">{tool.result.message}</p>

                  {/* If Calling Action */}
                  {isCall && phoneNumber && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${phoneNumber}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Dial {phoneNumber}</span>
                      </a>
                    </div>
                  )}

                  {/* If Calculator Action */}
                  {isCalc && tool.result.data?.result !== undefined && (
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 font-mono text-xs text-blue-950 dark:text-blue-200 flex items-center justify-between">
                      <span><strong>Equation:</strong> {tool.result.data.expression || expression}</span>
                      <span className="font-bold text-sm bg-white dark:bg-blue-900 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-700">
                        = {tool.result.data.formatted || tool.result.data.result}
                      </span>
                    </div>
                  )}

                  {/* If App Control with Text Injection */}
                  {action === 'type_text' && textToType && (
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 font-mono text-[11px]">
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Injected Note Content:
                      </div>
                      <span className="text-gray-800 dark:text-gray-200 font-sans italic">
                        "{textToType}"
                      </span>
                    </div>
                  )}

                  {/* If App Control with Media Playback */}
                  {(action === 'pause' || action === 'play' || action === 'resume' || action === 'next') && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium">
                        <Radio className="w-3 h-3 animate-pulse text-rose-500" />
                        <span>MediaSession Transport Controls Dispatched</span>
                      </div>
                    </div>
                  )}

                  {/* If Website Open */}
                  {isOpenWeb && tool.result.data?.url && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={tool.result.data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                          isDark
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Visit {new URL(tool.result.data.url).hostname}</span>
                      </a>
                    </div>
                  )}

                  {/* If Search Sources */}
                  {isSearch && tool.result.data?.sources && tool.result.data.sources.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1.5">
                        Sources
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tool.result.data.sources.slice(0, 3).map((src: any, idx: number) => (
                          <a
                            key={idx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border truncate max-w-xs transition-colors ${
                              isDark
                                ? 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            <span className="truncate">{src.title || src.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If Date/Time result */}
                  {isClock && tool.result.data && (
                    <div
                      className={`flex items-center gap-3 pt-1 font-mono text-xs ${
                        isDark ? 'text-gray-200' : 'text-gray-800'
                      }`}
                    >
                      <span className="font-semibold">{tool.result.data.time}</span>
                      <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
                      <span>{tool.result.data.date}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

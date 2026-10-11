import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Smartphone, X, CheckCircle, Share2, PlusSquare, ArrowDownToLine, Zap } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Si ya se está ejecutando instalada en el celular a pantalla completa
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-400/40 font-mono">
        <CheckCircle className="w-3 h-3 text-cyan-400" />
        <span>APP INSTALADA</span>
      </div>
    );
  }

  return (
    <>
      {/* Botón principal de instalación */}
      {isInstallable ? (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#002633] text-xs font-mono font-extrabold shadow-[0_0_15px_rgba(0,229,255,0.4)] transition animate-pulse"
          title="Instalar como aplicación en tu celular"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>INSTALAR APP</span>
        </button>
      ) : (
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-400/50 text-xs font-mono font-bold transition shadow-sm"
          title="Instalar como app en tu celular"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>INSTALAR APP</span>
        </button>
      )}

      {/* Modal explicativo de instalación */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn font-mono">
          <div className="w-full max-w-sm rounded-3xl bg-[#0D1524] border border-cyan-500/50 p-5 shadow-[0_0_50px_rgba(0,229,255,0.2)] text-cyan-50">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wider">INSTALAR EN TU CELULAR</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-cyan-950/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-gray-300">
              <p className="leading-relaxed">
                J.A.R.V.I.S. está preparado para instalarse en tu teléfono Android o iPhone como una <strong>aplicación completa e independiente</strong>:
              </p>

              <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-2xl space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Zap className="w-3.5 h-3.5" /> Beneficios en tu celular:
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                  <li>Icono propio de J.A.R.V.I.S. en tu pantalla de apps.</li>
                  <li>Pantalla completa sin barra de navegación web.</li>
                  <li>Micrófono siempre activo y respuesta por voz.</li>
                  <li>Conexión directa a tus dispositivos Wi-Fi locales.</li>
                </ul>
              </div>

              {isIOS ? (
                /* iPhone / Safari */
                <div className="bg-[#111827] p-3 rounded-2xl border border-gray-700 space-y-2">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-cyan-400" /> En iPhone (Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-gray-200">
                    <li>Abre el enlace de la app en <strong>Safari</strong>.</li>
                    <li>Toca el botón <strong>Compartir</strong> <Share2 className="w-3 h-3 inline text-cyan-400" /> abajo.</li>
                    <li>Selecciona <strong>"Agregar a la pantalla de inicio"</strong> <PlusSquare className="w-3 h-3 inline text-cyan-400" />.</li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome */
                <div className="bg-[#111827] p-3 rounded-2xl border border-gray-700 space-y-2">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <ArrowDownToLine className="w-4 h-4 text-cyan-400" /> En Android (Chrome):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-gray-200">
                    <li>Abre el enlace de la app en <strong>Google Chrome</strong> en tu móvil.</li>
                    <li>Toca los tres puntos (<strong>⋮</strong>) en la esquina superior derecha.</li>
                    <li>Toca <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#002633] font-extrabold text-xs transition uppercase tracking-wider"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

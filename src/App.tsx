import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Radio,
  Trash2,
  Plus,
  Shield,
  Wifi,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  actionExecuted?: string;
}

interface DispositivoLocal {
  id: string;
  nombre: string;
  url: string;
  tipo: 'luz' | 'enchufe' | 'pc' | 'webhook';
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Generador de tono de activación J.A.R.V.I.S. con Web Audio API
function reproducirTonoActivacion() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  } catch (e) {
    console.warn('Audio tone error:', e);
  }
}

export default function App() {
  // Configuración del usuario y estado
  const [nombreUsuario, setNombreUsuario] = useState<string>(() => {
    return localStorage.getItem('jarvis_dueno') || 'Harol';
  });

  const [memorias, setMemorias] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_memorias');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      'Su nombre es Harol y es el creador de este sistema.',
      'Desea un asistente integral estilo J.A.R.V.I.S. que se comunique por voz y controle su red.',
      'Le gusta la innovación, la inteligencia artificial y la domótica.',
    ];
  });

  const [dispositivosLocales, setDispositivosLocales] = useState<DispositivoLocal[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_dispositivos');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'luz_cuarto',
        nombre: 'Luz del cuarto',
        url: 'http://192.168.1.100/toggle',
        tipo: 'luz',
      },
      {
        id: 'pc_escritorio',
        nombre: 'PC de Harol',
        url: 'http://192.168.1.150:5000/wake',
        tipo: 'pc',
      },
    ];
  });

  // Estados de J.A.R.V.I.S.
  const [estadoJarvis, setEstadoJarvis] = useState<'ESPERANDO' | 'ESCUCHANDO' | 'PENSANDO' | 'HABLANDO'>('ESPERANDO');
  const [palabrasCapturadas, setPalabrasCapturadas] = useState<string>('');
  const [respuestaJarvis, setRespuestaJarvis] = useState<string>('Sistemas J.A.R.V.I.S. en línea. Diga "Ey Jarvis" o "¿Estás despierto?" para comenzar.');
  const [manosLibresActivo, setManosLibresActivo] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'hud' | 'lan' | 'brain' | 'history'>('hud');
  const [notification, setNotification] = useState<string | null>(null);

  // Formularios secundarios
  const [nuevoDato, setNuevoDato] = useState('');
  const [nuevoDispNombre, setNuevoDispNombre] = useState('');
  const [nuevoDispUrl, setNuevoDispUrl] = useState('');

  const [history, setHistory] = useState<ChatMessage[]>(() => [
    {
      id: '1',
      sender: 'jarvis',
      text: 'Protocolo de voz continua iniciado, señor Harol. Todos los sensores activos.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const estaHablandoRef = useRef<boolean>(false);
  const timeoutSilencioRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('jarvis_dueno', nombreUsuario);
  }, [nombreUsuario]);

  useEffect(() => {
    localStorage.setItem('jarvis_memorias', JSON.stringify(memorias));
  }, [memorias]);

  useEffect(() => {
    localStorage.setItem('jarvis_dispositivos', JSON.stringify(dispositivosLocales));
  }, [dispositivosLocales]);

  const mostrarNotificacion = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Reproducción de voz natural de J.A.R.V.I.S.
  const hablarVozJarvis = useCallback((texto: string, onEndCallback?: () => void) => {
    if (!voiceEnabled || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();
    estaHablandoRef.current = true;
    setEstadoJarvis('HABLANDO');

    // Pausar temporalmente el reconocimiento para que no se escuche a sí mismo
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.pitch = 0.95; // Tono británico / mayordomo sofisticado
    utterance.rate = 1.02;

    const voices = window.speechSynthesis.getVoices();
    // Priorizar voces masculinas o naturales en español si existen
    const spanishVoice =
      voices.find((v) => v.lang.startsWith('es') && (v.name.includes('Jorge') || v.name.includes('Pablo') || v.name.includes('Natural') || v.name.includes('Google'))) ||
      voices.find((v) => v.lang.startsWith('es'));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      estaHablandoRef.current = false;
      setEstadoJarvis('ESPERANDO');
      // Reactivar la escucha de inmediato para continuar la charla manos libres
      if (manosLibresActivo && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore
          }
        }, 200);
      }
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      estaHablandoRef.current = false;
      setEstadoJarvis('ESPERANDO');
      if (manosLibresActivo && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, manosLibresActivo]);

  // Ejecución física en red local
  const emitirSenalRedLocal = async (dispositivoId: string) => {
    const disp = dispositivosLocales.find((d) => d.id === dispositivoId);
    if (!disp) return;

    mostrarNotificacion(`⚡ Señal emitida a ${disp.nombre} (${disp.url})`);

    try {
      await fetch(disp.url, { method: 'GET', mode: 'no-cors' });
      mostrarNotificacion(`✅ Señal enviada a ${disp.nombre}`);
    } catch {
      mostrarNotificacion(`⚠️ Señal emitida hacia ${disp.url}`);
    }
  };

  // Enviar comando procesado a Gemini
  const procesarVozConJarvis = useCallback(async (transcripcion: string) => {
    if (!transcripcion.trim() || estaHablandoRef.current) return;

    const comando = transcripcion.trim();
    setPalabrasCapturadas('');
    setEstadoJarvis('PENSANDO');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory((prev) => [
      ...prev,
      { id: Date.now() + '-user', sender: 'user', text: comando, timestamp: timeStr },
    ]);

    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textoUsuario: comando,
          nombreUsuario,
          modoJarvis: true,
          memorias,
          dispositivosLocales,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const respuesta = data.mensaje || `A su servicio, señor ${nombreUsuario}.`;

      setRespuestaJarvis(respuesta);

      let actionDesc: string | undefined = undefined;
      if (data.accion_ejecutar && data.accion_ejecutar.dispositivo_id) {
        actionDesc = data.accion_ejecutar.descripcion;
        emitirSenalRedLocal(data.accion_ejecutar.dispositivo_id);
      }

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now() + '-jarvis',
          sender: 'jarvis',
          text: respuesta,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionExecuted: actionDesc,
        },
      ]);

      // Si aprendió un nuevo dato entrenado por voz
      if (data.nuevo_recuerdo && !memorias.includes(data.nuevo_recuerdo)) {
        setMemorias((prev) => [...prev, data.nuevo_recuerdo]);
        mostrarNotificacion(`🧠 Nuevo recuerdo indexado: "${data.nuevo_recuerdo}"`);
      }

      // Responder con voz natural
      hablarVozJarvis(respuesta);
    } catch (err: any) {
      console.warn('Jarvis processing error:', err);
      const fallback = `A sus órdenes, señor ${nombreUsuario}. Todos los sistemas operativos.`;
      setRespuestaJarvis(fallback);
      hablarVozJarvis(fallback);
    }
  }, [nombreUsuario, memorias, dispositivosLocales, hablarVozJarvis]);

  // Configuración del motor de voz continuo (Hands-Free Wake Word)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
      if (!estaHablandoRef.current) {
        setEstadoJarvis('ESPERANDO');
      }
    };

    recognition.onresult = (event: any) => {
      if (estaHablandoRef.current) return;

      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }

      const frase = currentTranscript.trim().toLowerCase();
      setPalabrasCapturadas(currentTranscript);

      // Detección de Wake Words: "jarvis", "ey jarvis", "hey jarvis", "oye jarvis"
      const tieneWakeWord =
        frase.includes('jarvis') ||
        frase.includes('despierto') ||
        frase.includes('estas ahi') ||
        frase.includes('oye');

      if (tieneWakeWord) {
        reproducirTonoActivacion();
        setEstadoJarvis('ESCUCHANDO');
      }

      // Reiniciar temporizador de silencio para enviar automáticamente la orden cuando termine de hablar
      if (timeoutSilencioRef.current) clearTimeout(timeoutSilencioRef.current);

      if (event.results[event.results.length - 1].isFinal || tieneWakeWord) {
        timeoutSilencioRef.current = setTimeout(() => {
          if (currentTranscript.trim()) {
            procesarVozConJarvis(currentTranscript.trim());
          }
        }, 1200); // 1.2 segundos de pausa y envía automáticamente
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech error:', e?.error);
      // En caso de corte o red, reintentar automáticamente si manos libres está activo
      if (e.error !== 'aborted' && manosLibresActivo && !estaHablandoRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            // ignore
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-reinicio continuo para modo siempre despierto
      if (manosLibresActivo && !estaHablandoRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    if (manosLibresActivo) {
      try {
        recognition.start();
      } catch (err) {
        // ignore
      }
    }

    return () => {
      if (timeoutSilencioRef.current) clearTimeout(timeoutSilencioRef.current);
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    };
  }, [manosLibresActivo, procesarVozConJarvis]);

  const toggleManosLibres = () => {
    if (manosLibresActivo) {
      setManosLibresActivo(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      mostrarNotificacion('Micrófono en pausa');
    } else {
      setManosLibresActivo(true);
      reproducirTonoActivacion();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
      mostrarNotificacion('Modo Manos Libres Activo: Diga "Ey Jarvis"');
    }
  };

  const agregarMemoriaManual = () => {
    if (!nuevoDato.trim()) return;
    const item = nuevoDato.trim();
    if (!memorias.includes(item)) {
      setMemorias((prev) => [...prev, item]);
      mostrarNotificacion(`Memoria actualizada`);
    }
    setNuevoDato('');
  };

  const agregarDispositivo = () => {
    if (!nuevoDispNombre.trim() || !nuevoDispUrl.trim()) return;
    const nuevo: DispositivoLocal = {
      id: 'disp_' + Date.now(),
      nombre: nuevoDispNombre.trim(),
      url: nuevoDispUrl.trim(),
      tipo: 'webhook',
    };
    setDispositivosLocales((prev) => [...prev, nuevo]);
    setNuevoDispNombre('');
    setNuevoDispUrl('');
    mostrarNotificacion(`Dispositivo "${nuevo.nombre}" guardado`);
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-cyan-50 flex flex-col items-center justify-between p-3 sm:p-6 font-sans select-none">
      {/* Notificación flotante de J.A.R.V.I.S. */}
      {notification && (
        <div className="fixed top-4 z-50 max-w-sm px-4 py-2.5 rounded-2xl bg-cyan-400 text-[#002633] shadow-2xl shadow-cyan-500/50 text-xs font-bold flex items-center gap-2 animate-bounce border border-cyan-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Terminal Cibernético J.A.R.V.I.S. */}
      <main className="w-full max-w-md border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(0,229,255,0.15)] flex flex-col flex-1 min-h-[660px] justify-between relative overflow-hidden bg-[#0D1524]">
        
        {/* Cabecera / Telemetría */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30 mb-3">
            <div className="flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-cyan-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-widest text-cyan-300 font-mono">
                  J.A.R.V.I.S.
                </span>
                <span className="text-[10px] text-cyan-400/80 flex items-center gap-1 font-mono">
                  <Wifi className="w-3 h-3 text-cyan-400 inline" />
                  VOICE CONTINUOUS • {nombreUsuario.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <PWAInstallButton />

              {/* Botón Red Local */}
              <button
                onClick={() => setActiveTab(activeTab === 'lan' ? 'hud' : 'lan')}
                title="Dispositivos de Red Local"
                className={`p-2 rounded-full transition ${activeTab === 'lan' ? 'text-cyan-200 bg-cyan-900/60 border border-cyan-400/50' : 'text-cyan-400/70 hover:bg-cyan-950/40'}`}
              >
                <Radio className="w-4 h-4" />
              </button>

              {/* Botón Banco de Memoria */}
              <button
                onClick={() => setActiveTab(activeTab === 'brain' ? 'hud' : 'brain')}
                title="Bancos de Memoria sobre Ti"
                className={`p-2 rounded-full transition ${activeTab === 'brain' ? 'text-amber-300 bg-amber-950/50 border border-amber-400/50' : 'text-cyan-400/70 hover:bg-cyan-950/40'}`}
              >
                <Brain className="w-4 h-4" />
              </button>

              {/* Toggle de Altavoz */}
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? 'Voz activada' : 'Voz silenciada'}
                className="p-2 rounded-full text-cyan-400/70 hover:bg-cyan-950/40"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-cyan-300" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>

          {/* Indicador de Estado de Escucha por Voz */}
          <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 px-3 py-1.5 rounded-full text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                estadoJarvis === 'ESCUCHANDO'
                  ? 'bg-red-500 animate-ping'
                  : estadoJarvis === 'PENSANDO'
                  ? 'bg-amber-400 animate-bounce'
                  : estadoJarvis === 'HABLANDO'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-cyan-400'
              }`}></span>
              <span className="text-cyan-300 font-bold uppercase tracking-wider">
                {estadoJarvis === 'ESCUCHANDO'
                  ? 'Capturando tu voz...'
                  : estadoJarvis === 'PENSANDO'
                  ? 'Procesando en la nube...'
                  : estadoJarvis === 'HABLANDO'
                  ? 'J.A.R.V.I.S. hablando...'
                  : 'Esperando: "Ey Jarvis"'}
              </span>
            </div>
            <button
              onClick={toggleManosLibres}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                manosLibresActivo ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {manosLibresActivo ? 'Manos Libres: ON' : 'Pausado'}
            </button>
          </div>
        </div>

        {/* CONTENIDO INTERACTIVO */}
        {activeTab === 'lan' ? (
          /* RED LOCAL & DOMÓTICA */
          <div className="flex-1 my-3 py-2 flex flex-col justify-between overflow-y-auto text-xs font-mono">
            <div className="space-y-3 pr-1">
              <div className="bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30">
                <h3 className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                  <Radio className="w-4 h-4 text-cyan-400" /> Control en Red Local por Voz
                </h3>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Solo di en voz alta:
                  <span className="text-cyan-200 block font-bold mt-1">"Jarvis, enciende la luz del cuarto"</span>
                  <span className="text-cyan-200 block font-bold">"Jarvis, apaga la PC"</span>
                  y tu celular transmitirá la orden a la IP del dispositivo en tu Wi-Fi.
                </p>
              </div>

              <div>
                <span className="text-cyan-400/80 font-bold block mb-1">Dispositivos en tu red ({dispositivosLocales.length}):</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {dispositivosLocales.map((disp) => (
                    <div
                      key={disp.id}
                      className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 px-3 py-2 rounded-xl"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-bold text-white">{disp.nombre}</span>
                        <span className="text-[10px] text-cyan-300/70 truncate">{disp.url}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => emitirSenalRedLocal(disp.id)}
                          className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-bold border border-cyan-400/40"
                        >
                          Emitir
                        </button>
                        <button
                          onClick={() => setDispositivosLocales(dispositivosLocales.filter((d) => d.id !== disp.id))}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registro de dispositivo */}
              <div className="bg-cyan-950/20 p-3 rounded-2xl border border-cyan-500/20 space-y-2">
                <span className="font-bold text-cyan-300 block">Registrar nuevo dispositivo:</span>
                <input
                  type="text"
                  placeholder="Nombre (ej: Luz sala, Enchufe...)"
                  value={nuevoDispNombre}
                  onChange={(e) => setNuevoDispNombre(e.target.value)}
                  className="w-full bg-[#070B12] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  placeholder="URL / IP local (ej: http://192.168.1.50/toggle)"
                  value={nuevoDispUrl}
                  onChange={(e) => setNuevoDispUrl(e.target.value)}
                  className="w-full bg-[#070B12] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  onClick={agregarDispositivo}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-[#002633] font-extrabold rounded-xl text-xs transition"
                >
                  + Guardar Dispositivo
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('hud')}
              className="w-full mt-2 py-2 rounded-xl bg-cyan-400 text-[#002633] font-bold text-xs"
            >
              Volver al Reactor de Voz
            </button>
          </div>
        ) : activeTab === 'brain' ? (
          /* BANCO DE MEMORIA Y ENTRENAMIENTO POR VOZ */
          <div className="flex-1 my-3 py-2 flex flex-col justify-between overflow-y-auto text-xs font-mono">
            <div className="space-y-3 pr-1">
              <div className="bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30">
                <h3 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <Brain className="w-4 h-4 text-amber-400" /> Entrenamiento por Voz
                </h3>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Puedes entrenar a J.A.R.V.I.S. con solo hablarle:
                  <span className="text-amber-200 block font-bold mt-1">"Jarvis, recuerda que mañana madrugo a las 6"</span>
                  <span className="text-amber-200 block font-bold">"Jarvis, anota que me gusta el café sin azúcar"</span>
                  y lo guardará automáticamente en sus bancos de memoria permanente.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-cyan-400/80 font-bold">Tu nombre de usuario:</label>
                <input
                  type="text"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  className="w-full bg-[#070B12] border border-cyan-500/30 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-cyan-400/80 font-bold">Datos memorizados ({memorias.length}):</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {memorias.map((mem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 px-3 py-1.5 rounded-xl"
                    >
                      <span className="truncate pr-2 text-gray-200">💡 {mem}</span>
                      <button
                        onClick={() => setMemorias(memorias.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={nuevoDato}
                    onChange={(e) => setNuevoDato(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && agregarMemoriaManual()}
                    placeholder="Enseñar nuevo dato manualmente..."
                    className="flex-1 bg-[#070B12] border border-cyan-500/30 rounded-xl px-3 py-1.5 text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={agregarMemoriaManual}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Guardar
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('hud')}
              className="w-full mt-2 py-2 rounded-xl bg-cyan-400 text-[#002633] font-bold text-xs"
            >
              Cerrar y hablar
            </button>
          </div>
        ) : (
          /* HUD PRINCIPAL CON REACTOR ARC Y COMUNICACIÓN POR VOZ */
          <div className="flex flex-col items-center justify-center my-auto py-2">
            {/* Reactor Arc Holográfico y Ondas de Voz */}
            <div className="relative group cursor-pointer" onClick={toggleManosLibres} title="Toca para pausar/activar micrófono">
              <div className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full border-2 flex items-center justify-center relative transition-all duration-700 ${
                estadoJarvis === 'ESCUCHANDO'
                  ? 'border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.5)] scale-105'
                  : estadoJarvis === 'HABLANDO'
                  ? 'border-emerald-400 shadow-[0_0_80px_rgba(52,211,153,0.5)] scale-105'
                  : estadoJarvis === 'PENSANDO'
                  ? 'border-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.5)]'
                  : 'border-cyan-400 shadow-[0_0_60px_rgba(0,229,255,0.25)]'
              }`}>
                {/* Anillo exterior rotatorio */}
                <div className="w-full h-full rounded-full border border-dashed border-cyan-300/30 flex items-center justify-center animate-[spin_25s_linear_infinite]">
                  {/* Anillo concéntrico */}
                  <div className="w-40 h-40 rounded-full border border-cyan-400/50 flex items-center justify-center animate-[spin_15s_linear_infinite_reverse]">
                    {/* Núcleo de energía Arc Reactor */}
                    <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center backdrop-blur-md border transition-all ${
                      estadoJarvis === 'ESCUCHANDO'
                        ? 'bg-red-500/20 border-red-400'
                        : estadoJarvis === 'HABLANDO'
                        ? 'bg-emerald-500/20 border-emerald-400'
                        : 'bg-cyan-500/20 border-cyan-300'
                    }`}>
                      <Activity className={`w-10 h-10 ${
                        estadoJarvis === 'ESCUCHANDO'
                          ? 'text-red-400 animate-pulse'
                          : estadoJarvis === 'HABLANDO'
                          ? 'text-emerald-300 animate-bounce'
                          : 'text-cyan-300 animate-pulse'
                      }`} />
                      <span className="text-[9px] font-mono tracking-widest text-cyan-200 mt-1 uppercase font-bold">
                        {estadoJarvis === 'HABLANDO' ? 'VOICE OUT' : estadoJarvis === 'ESCUCHANDO' ? 'LISTENING' : 'ONLINE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ondas expansivas durante escucha activa */}
                {estadoJarvis === 'ESCUCHANDO' && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-60"></div>
                )}
              </div>
            </div>

            {/* Subtítulos en tiempo real de lo que escuchó */}
            {palabrasCapturadas && (
              <div className="w-full mt-3 px-2 text-center animate-fadeIn">
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
                  🎙️ "{palabrasCapturadas}"
                </span>
              </div>
            )}

            {/* Pantalla Holográfica de Respuesta de J.A.R.V.I.S. */}
            <div className="w-full mt-4 px-1">
              <div className="p-4 rounded-2xl border border-cyan-500/40 bg-[#070B12]/90 shadow-[0_0_30px_rgba(0,229,255,0.1)] text-center relative font-mono transition-all">
                <p className="text-sm sm:text-base text-cyan-100 font-normal leading-relaxed">
                  {respuestaJarvis}
                </p>

                {voiceEnabled && (
                  <button
                    onClick={() => hablarVozJarvis(respuestaJarvis)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-cyan-300 hover:text-white underline opacity-80 hover:opacity-100 transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Reescuchar respuesta
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barra inferior: Guía de comandos de voz manos libres */}
        <div className="space-y-2 pt-2 border-t border-cyan-500/20">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/80 px-1">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <span>Diga en voz alta:</span>
            </span>
            <button
              onClick={() => setActiveTab('history')}
              className="text-cyan-300 hover:underline"
            >
              Registro de voz
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => procesarVozConJarvis('¿Estás despierto, Jarvis?')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-left hover:bg-cyan-900/40 transition truncate"
            >
              "¿Estás despierto, Jarvis?"
            </button>
            <button
              onClick={() => procesarVozConJarvis('Jarvis, enciende la luz del cuarto')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-left hover:bg-cyan-900/40 transition truncate"
            >
              "Jarvis, enciende la luz"
            </button>
            <button
              onClick={() => procesarVozConJarvis('Jarvis, recuerda que mi proyecto es crear una IA')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-left hover:bg-cyan-900/40 transition truncate"
            >
              "Jarvis, recuerda que..."
            </button>
            <button
              onClick={() => procesarVozConJarvis('Dame un informe de mis sistemas')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-left hover:bg-cyan-900/40 transition truncate"
            >
              "Dame un informe de estado"
            </button>
          </div>
        </div>

        {/* Modal de Historial */}
        {activeTab === 'history' && (
          <div className="absolute inset-0 bg-[#070B12]/95 backdrop-blur-md z-20 p-5 flex flex-col justify-between rounded-3xl animate-fadeIn font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <h3 className="text-sm font-bold text-cyan-300 tracking-wider uppercase">Registro de Voz Continuo</h3>
              <button
                onClick={() => setActiveTab('hud')}
                className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1">
              {history.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl max-w-[85%] ${
                    msg.sender === 'user'
                      ? 'ml-auto bg-cyan-950/80 text-cyan-100 border border-cyan-500/40'
                      : 'mr-auto bg-[#0F172A] text-white border border-gray-700'
                  }`}
                >
                  <p className="text-[10px] opacity-70 mb-0.5">
                    {msg.sender === 'user' ? nombreUsuario : 'J.A.R.V.I.S.'} • {msg.timestamp}
                  </p>
                  <p className="break-words leading-relaxed">{msg.text}</p>
                  {msg.actionExecuted && (
                    <div className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      <Zap className="w-3 h-3" /> {msg.actionExecuted}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-cyan-400/60">
              Micrófono manos libres activo
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

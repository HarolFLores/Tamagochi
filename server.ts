import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCCFWzYLE5DS6YCn3rhilNj9s8CCmg7BBI';
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  app.post('/api/interact', async (req, res) => {
    try {
      const { textoUsuario, energia, hambre, memorias, nombreUsuario, modoJarvis, dispositivosLocales } = req.body;
      const estadoActual = {
        energia: typeof energia === 'number' ? Math.max(0, Math.min(1, energia)) : 0.8,
        hambre: typeof hambre === 'number' ? Math.max(0, Math.min(1, hambre)) : 0.6,
      };

      const texto = typeof textoUsuario === 'string' ? textoUsuario.trim() : '';
      if (!texto) {
        return res.status(400).json({ error: 'El texto no puede estar vacío' });
      }

      const nombre = typeof nombreUsuario === 'string' && nombreUsuario.trim() ? nombreUsuario.trim() : 'Harol';
      const memoriaList = Array.isArray(memorias) ? memorias.filter((m: any) => typeof m === 'string' && m.trim()) : [];
      const dispositivos = Array.isArray(dispositivosLocales) ? dispositivosLocales : [];
      const textoDispositivos = dispositivos.length > 0
        ? dispositivos.map((d: any) => `- ID: "${d.id}", Nombre: "${d.nombre}", Endpoint: "${d.url}"`).join('\n')
        : 'No hay dispositivos locales registrados.';

      const textoMemorias = memoriaList.length > 0
        ? memoriaList.map((m: string) => `- ${m}`).join('\n')
        : 'Aún conociendo al usuario.';

      const prompt = `Eres J.A.R.V.I.S., el mayordomo y asistente de inteligencia artificial personal, sofisticado y leal de ${nombre}.
Tu tono de voz al responder debe ser completamente natural, fluido, educado y elegante (con el porte de un mayordomo de alta tecnología, diciendo "señor ${nombre}" o "a sus órdenes").
Estás escuchando a ${nombre} por voz en tiempo real y tus respuestas van a ser pronunciadas en voz alta, así que hazlas conversacionales, humanas, sin textos largos innecesarios (máximo 1 o 2 frases directas y cautivadoras).

LO QUE SABES Y HAS APRENDIDO SOBRE ${nombre.toUpperCase()}:
${textoMemorias}

DISPOSITIVOS CONECTADOS EN SU RED LOCAL:
${textoDispositivos}

INSTRUCCIONES CLAVE DE CONVERSACIÓN NATURAL:
- Si te pregunta si estás despierto ("¿Estás despierto?", "Ey Jarvis", "Estás ahí?"): Responde con naturalidad británica y calidez, por ejemplo: "Para usted siempre, señor ${nombre}. ¿En qué puedo colaborar hoy?" o "Sistemas al cien por ciento, señor. Le escucho."
- Si te pide que recuerdes o aprendas algo sobre él ("recuerda que...", "anota que...", "te enseño que...", o te cuenta un detalle personal): Guarda ese dato en "nuevo_recuerdo" y confírmaselo con elegancia (ej: "Guardado en mis bancos de memoria, señor. Lo tendré muy presente.").
- Si te pide controlar un dispositivo de su red local (encender/apagar luz, PC, enchufe): Confírmalo con precisión y define "accion_ejecutar".

REGLA ESTRICTA: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "mensaje": "Tu respuesta hablada fluida y 100% natural para ser dicha en voz alta a ${nombre}.",
  "energia_nueva": [nuevo_nivel de 0.0 a 1.0],
  "hambre_nueva": [nuevo_nivel de 0.0 a 1.0],
  "nuevo_recuerdo": "Si el usuario te pidió recordar algo o reveló un dato personal relevante sobre sí mismo, escribe aquí la frase resumida para tu memoria permanente. Si no, null.",
  "accion_ejecutar": {
    "tipo": "dispositivo_local" | null,
    "dispositivo_id": "ID del dispositivo si aplica, o null",
    "comando": "encender" | "apagar" | "toggle" | null,
    "descripcion": "Descripción concisa de la acción"
  }
}

Niveles vitales actuales: Energía ${estadoActual.energia.toFixed(2)}, Hambre ${estadoActual.hambre.toFixed(2)}.
${nombre} te dice por voz: '${texto.replace(/'/g, "\\'")}'`;

      if (ai) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout en llamada de Gemini')), 6000)
          );

          const geminiCall = async () => {
            try {
              return await ai!.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                },
              });
            } catch (firstErr: any) {
              console.warn('Fallback a gemini-flash-latest:', firstErr?.message);
              return await ai!.models.generateContent({
                model: 'gemini-flash-latest',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                },
              });
            }
          };

          const response = await Promise.race([geminiCall(), timeoutPromise]);

          let json = response.text || '{}';
          json = json.replace(/```json/g, '').replace(/```/g, '').trim();
          const respuestaIA = JSON.parse(json);

          const energiaNueva = typeof respuestaIA.energia_nueva === 'number'
            ? Math.max(0, Math.min(1, respuestaIA.energia_nueva))
            : Math.max(0, estadoActual.energia - 0.02);

          const hambreNueva = typeof respuestaIA.hambre_nueva === 'number'
            ? Math.max(0, Math.min(1, respuestaIA.hambre_nueva))
            : Math.max(0, estadoActual.hambre - 0.02);

          return res.json({
            mensaje: respuestaIA.mensaje || `A su servicio, señor ${nombre}. Le escucho con atención.`,
            energia_nueva: Number(energiaNueva.toFixed(2)),
            hambre_nueva: Number(hambreNueva.toFixed(2)),
            nuevo_recuerdo: typeof respuestaIA.nuevo_recuerdo === 'string' && respuestaIA.nuevo_recuerdo.trim()
              ? respuestaIA.nuevo_recuerdo.trim()
              : null,
            accion_ejecutar: respuestaIA.accion_ejecutar || null,
          });
        } catch (err: any) {
          console.warn('Aviso Gemini (usando respuesta contextual inmediata):', err?.message);
          const fallback = computeNaturalJarvisFallback(texto, estadoActual.energia, estadoActual.hambre, nombre, memoriaList, dispositivos);
          return res.json(fallback);
        }
      } else {
        const fallback = computeNaturalJarvisFallback(texto, estadoActual.energia, estadoActual.hambre, nombre, memoriaList, dispositivos);
        return res.json(fallback);
      }
    } catch (e: any) {
      console.error('Unhandled server error:', e);
      return res.status(500).json({ error: e.message || 'Error del servidor' });
    }
  });

  // Vite integration in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`J.A.R.V.I.S. server running on http://0.0.0.0:${PORT}`);
  });
}

function computeNaturalJarvisFallback(
  texto: string,
  energia: number,
  hambre: number,
  nombre: string,
  memorias: string[],
  dispositivos: any[]
) {
  const lower = texto.toLowerCase();
  let accion: any = null;
  let mensaje = '';
  let nuevoRecuerdo: string | null = null;

  // Wake words y preguntas de estado
  if (
    lower.includes('despierto') ||
    lower.includes('estas despierto') ||
    lower.includes('estas ahi') ||
    lower.includes('estas activo') ||
    lower === 'jarvis' ||
    lower === 'ey jarvis' ||
    lower === 'hey jarvis' ||
    lower === 'oye jarvis'
  ) {
    const frases = [
      `Siempre para usted, señor ${nombre}. ¿En qué puedo colaborar hoy?`,
      `Para usted siempre, señor. Todos los sistemas están en línea y a su disposición.`,
      `Completamente despierto y atento a sus órdenes, señor ${nombre}.`,
    ];
    mensaje = frases[Math.floor(Math.random() * frases.length)];
  } else if (
    lower.startsWith('recuerda que') ||
    lower.startsWith('anota que') ||
    lower.startsWith('guarda que') ||
    lower.includes('mi nombre es') ||
    lower.includes('me gusta')
  ) {
    const dato = texto.replace(/^(jarvis,?\s*)?(recuerda que|anota que|guarda que)\s*/i, '').trim();
    nuevoRecuerdo = dato || texto;
    mensaje = `Entendido, señor ${nombre}. He indexado este nuevo dato en mis bancos de memoria permanentes: "${nuevoRecuerdo}".`;
  } else {
    // Comandos de dispositivos
    const encender = lower.includes('prende') || lower.includes('enciende') || lower.includes('activa') || lower.includes('turn on');
    const apagar = lower.includes('apaga') || lower.includes('desactiva') || lower.includes('turn off');

    if (dispositivos.length > 0 && (encender || apagar)) {
      const dispEncontrado = dispositivos.find((d: any) =>
        lower.includes(d.nombre.toLowerCase()) || lower.includes(d.id.toLowerCase())
      ) || dispositivos[0];

      const comando = encender ? 'encender' : 'apagar';
      accion = {
        tipo: 'dispositivo_local',
        dispositivo_id: dispEncontrado.id,
        comando,
        descripcion: `${encender ? 'Encendiendo' : 'Apagando'} ${dispEncontrado.nombre} en red local`,
      };
      mensaje = `Enviando la señal para ${comando} ${dispEncontrado.nombre} en su red local, señor ${nombre}.`;
    } else {
      const recuerdoMencion = memorias.length > 0
        ? ` Tengo presente que ${memorias[Math.floor(Math.random() * memorias.length)]}.`
        : '';
      mensaje = `Comprendido, señor ${nombre}.${recuerdoMencion} Estoy procesando sus instrucciones.`;
    }
  }

  return {
    mensaje,
    energia_nueva: Number(energia.toFixed(2)),
    hambre_nueva: Number(hambre.toFixed(2)),
    nuevo_recuerdo: nuevoRecuerdo,
    accion_ejecutar: accion,
  };
}

startServer();

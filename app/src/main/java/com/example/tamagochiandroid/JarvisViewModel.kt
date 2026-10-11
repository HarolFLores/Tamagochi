package com.example.tamagochiandroid

import android.app.Application
import android.content.Context
import android.speech.tts.TextToSpeech
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.client.generativeai.GenerativeModel
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.Locale
import java.util.concurrent.TimeUnit

data class AccionEjecutar(
    val tipo: String? = null,
    val dispositivo_id: String? = null,
    val comando: String? = null,
    val descripcion: String? = null
)

data class RespuestaJarvis(
    val mensaje: String = "",
    val energia_nueva: Float = 0.8f,
    val hambre_nueva: Float = 0.6f,
    val nuevo_recuerdo: String? = null,
    val accion_ejecutar: AccionEjecutar? = null
)

data class Dispositivo(
    val id: String,
    val nombre: String,
    val url: String
)

data class JarvisUiState(
    val mensaje: String = "Sistemas J.A.R.V.I.S. en línea. Diga 'Ey Jarvis' para hablarme.",
    val estadoVoz: String = "ESPERANDO", // ESPERANDO, ESCUCHANDO, PENSANDO, HABLANDO
    val energia: Float = 0.8f,
    val recursos: Float = 0.6f,
    val transcribiendo: String = "",
    val notificacion: String? = null,
    val memorias: List<String> = emptyList(),
    val dispositivos: List<Dispositivo> = emptyList(),
    val modoJarvis: Boolean = true
)

class JarvisViewModel(application: Application) : AndroidViewModel(application), TextToSpeech.OnInitListener {

    private val prefs = application.getSharedPreferences("jarvis_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(3, TimeUnit.SECONDS)
        .build()

    // API Key de Gemini configurada por el usuario
    private val apiKey = "AIzaSyCCFWzYLE5DS6YCn3rhilNj9s8CCmg7BBI"

    private val generativeModel = GenerativeModel(
        modelName = "gemini-flash-latest",
        apiKey = apiKey
    )

    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val _uiState = MutableStateFlow(
        JarvisUiState(
            energia = prefs.getFloat("energia", 0.8f),
            recursos = prefs.getFloat("recursos", 0.6f),
            memorias = cargarMemorias(),
            dispositivos = listOf(
                Dispositivo("luz_cuarto", "Luz del cuarto", "http://192.168.1.100/toggle"),
                Dispositivo("pc", "PC de Harol", "http://192.168.1.150:5000/wake")
            )
        )
    )
    val uiState: StateFlow<JarvisUiState> = _uiState.asStateFlow()

    init {
        tts = TextToSpeech(application, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("es", "ES")
            tts?.setPitch(0.95f)
            tts?.setSpeechRate(1.0f)
            ttsReady = true
        }
    }

    fun hablar(texto: String) {
        if (ttsReady && texto.isNotBlank()) {
            _uiState.value = _uiState.value.copy(estadoVoz = "HABLANDO")
            tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "JARVIS_TTS")
            viewModelScope.launch {
                // Restaurar estado después de hablar
                kotlinx.coroutines.delay(2500)
                _uiState.value = _uiState.value.copy(estadoVoz = "ESPERANDO")
            }
        }
    }

    fun setTranscripcion(texto: String) {
        _uiState.value = _uiState.value.copy(transcribiendo = texto, estadoVoz = "ESCUCHANDO")
    }

    fun procesarComandoVoz(comando: String) {
        if (comando.isBlank()) return

        _uiState.value = _uiState.value.copy(
            estadoVoz = "PENSANDO",
            transcribiendo = ""
        )

        viewModelScope.launch(Dispatchers.IO) {
            val estadoActual = _uiState.value
            val nombre = "Harol"

            val prompt = """
                Eres J.A.R.V.I.S., el mayordomo y asistente de IA sofisticado y leal de $nombre.
                Tu tono debe ser formal, británico, educado y natural (dices "señor $nombre" o "a sus órdenes").
                
                RECUERDOS QUE TIENES SOBRE $nombre:
                ${estadoActual.memorias.joinToString("\n") { "- $it" }}
                
                DISPOSITIVOS REGISTRADOS EN RED LOCAL:
                ${estadoActual.dispositivos.joinToString("\n") { "- ID: ${it.id}, Nombre: ${it.nombre}, URL: ${it.url}" }}
                
                Niveles: Energía ${estadoActual.energia}, Recursos ${estadoActual.recursos}.
                $nombre te dice por voz: '$comando'
                
                REGLA ESTRICTA: Responde ÚNICAMENTE con un JSON válido con esta estructura:
                {
                  "mensaje": "Tu respuesta corta, formal y hablada para $nombre (máx 2 frases).",
                  "energia_nueva": 0.8,
                  "hambre_nueva": 0.6,
                  "nuevo_recuerdo": "Dato nuevo personal si el usuario te lo pidió recordar o reveló algo de sí mismo, sino null",
                  "accion_ejecutar": {
                    "tipo": "dispositivo_local" o null,
                    "dispositivo_id": "ID del dispositivo si aplica" o null,
                    "comando": "encender" o "apagar" o null,
                    "descripcion": "Descripción concisa de la acción"
                  }
                }
            """.trimIndent()

            try {
                val response = generativeModel.generateContent(prompt)
                var json = response.text ?: "{}"
                json = json.replace("```json", "").replace("```", "").trim()

                val respuesta = gson.fromJson(json, RespuestaJarvis::class.java)

                // Si hay acción en red local, emitir petición OkHttp
                if (respuesta.accion_ejecutar?.dispositivo_id != null) {
                    val disp = estadoActual.dispositivos.find { it.id == respuesta.accion_ejecutar.dispositivo_id }
                    if (disp != null) {
                        emitirSenalLocal(disp.url)
                    }
                }

                val nuevasMemorias = if (!respuesta.nuevo_recuerdo.isNullOrBlank() && !estadoActual.memorias.contains(respuesta.nuevo_recuerdo)) {
                    val actualizadas = estadoActual.memorias + respuesta.nuevo_recuerdo
                    guardarMemorias(actualizadas)
                    actualizadas
                } else {
                    estadoActual.memorias
                }

                _uiState.value = _uiState.value.copy(
                    mensaje = respuesta.mensaje,
                    energia = respuesta.energia_nueva.coerceIn(0f, 1f),
                    recursos = respuesta.hambre_nueva.coerceIn(0f, 1f),
                    memorias = nuevasMemorias,
                    notificacion = if (!respuesta.nuevo_recuerdo.isNullOrBlank()) "🧠 Nuevo recuerdo guardado" else null
                )

                hablar(respuesta.mensaje)

            } catch (e: Exception) {
                val fallbackMsg = "A sus órdenes, señor $nombre. Sistemas en línea y procesando su instrucción."
                _uiState.value = _uiState.value.copy(
                    mensaje = fallbackMsg,
                    estadoVoz = "ESPERANDO"
                )
                hablar(fallbackMsg)
            }
        }
    }

    private fun emitirSenalLocal(url: String) {
        try {
            val request = Request.Builder().url(url).build()
            okHttpClient.newCall(request).execute().close()
        } catch (_: Exception) {
            // Emisión silenciosa en red local
        }
    }

    private fun cargarMemorias(): List<String> {
        val raw = prefs.getString("memorias_json", null) ?: return listOf(
            "Su nombre es Harol y es el creador de este sistema.",
            "Desea un asistente integral estilo J.A.R.V.I.S. que se comunique por voz y controle su red local."
        )
        return try {
            gson.fromJson(raw, Array<String>::class.java).toList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun guardarMemorias(lista: List<String>) {
        prefs.edit().putString("memorias_json", gson.toJson(lista)).apply()
    }

    fun agregarMemoria(dato: String) {
        if (dato.isNotBlank()) {
            val actualizadas = _uiState.value.memorias + dato.trim()
            guardarMemorias(actualizadas)
            _uiState.value = _uiState.value.copy(memorias = actualizadas)
        }
    }

    fun eliminarMemoria(index: Int) {
        val actualizadas = _uiState.value.memorias.toMutableList().apply { removeAt(index) }
        guardarMemorias(actualizadas)
        _uiState.value = _uiState.value.copy(memorias = actualizadas)
    }

    override fun onCleared() {
        super.onCleared()
        tts?.stop()
        tts?.shutdown()
    }
}

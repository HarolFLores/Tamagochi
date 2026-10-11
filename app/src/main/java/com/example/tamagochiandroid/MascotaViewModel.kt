package com.example.tamagochiandroid

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.gson.Gson
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class RespuestaIA(
    val mensaje: String,
    val energia_nueva: Float,
    val hambre_nueva: Float
)

class MascotaViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = MascotaDatabase.getDatabase(application).mascotaDao()
    private val gson = Gson()

    // Pon tu API Key de Google aquí (la que empezaba con AIzaSy...)
    private val apiKey = "TU_API_KEY_AQUI"

    // Configuración limpia y directa para Gemini
    private val generativeModel = GenerativeModel(
        modelName = "gemini-pro",
        apiKey = apiKey
    )

    val estadoMascota: StateFlow<MascotaEstado?> = dao.obtenerEstado()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MascotaEstado())

    init {
        viewModelScope.launch {
            if (dao.obtenerEstado() == null) {
                dao.guardarEstado(MascotaEstado(energia = 0.8f, hambre = 0.6f))
            }
        }
    }

    fun interactuarConMascota(textoUsuario: String, onRespuesta: (String) -> Unit) {
        val estadoActual = estadoMascota.value ?: MascotaEstado()

        viewModelScope.launch {
            try {
                // Combinamos las instrucciones y el mensaje en un solo prompt de texto
                val prompt = """
                    Eres un Tamagotchi virtual que vive en mi celular. Tu personalidad es sarcástica, divertida y un poco dramática.
                    Tus niveles vitales van de 0.0 a 1.0 (1.0 es el máximo).
                    
                    REGLA ESTRICTA: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
                    {"mensaje": "Tu respuesta corta al usuario", "energia_nueva": [nuevo_nivel], "hambre_nueva": [nuevo_nivel]}
                    
                    Lógica: Si te dan comida sube hambre_nueva. Si te mandan a dormir sube energia_nueva. Charla normal gasta -0.05 de ambos.
                    
                    Mis niveles: Energía ${estadoActual.energia}, Hambre${estadoActual.hambre}.
                    Digo: '$textoUsuario'
                """.trimIndent()

                val response = generativeModel.generateContent(prompt)

                // Limpiamos el texto por si Gemini añade comillas extrañas (como ```json)
                var json = response.text ?: "{}"
                json = json.replace("```json", "").replace("```", "").trim()

                val respuestaIA = gson.fromJson(json, RespuestaIA::class.java)

                dao.guardarEstado(
                    estadoActual.copy(
                        energia = respuestaIA.energia_nueva.coerceIn(0.0f, 1.0f),
                        hambre = respuestaIA.hambre_nueva.coerceIn(0.0f, 1.0f)
                    )
                )

                onRespuesta(respuestaIA.mensaje)

            } catch (e: Exception) {
                onRespuesta("Error Gemini: ${e.message}")
            }
        }
    }
}
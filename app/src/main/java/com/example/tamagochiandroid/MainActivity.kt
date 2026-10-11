package com.example.tamagochiandroid

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import java.util.Locale

class MainActivity : ComponentActivity() {

    private var speechRecognizer: SpeechRecognizer? = null

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        // Permiso de micrófono concedido
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }

        setContent {
            val viewModel: JarvisViewModel = viewModel()
            val state by viewModel.uiState.collectAsState()

            LaunchedEffect(Unit) {
                iniciarReconocimientoVoz(viewModel)
            }

            JarvisAppScreen(
                state = state,
                onComando = { comando -> viewModel.procesarComandoVoz(comando) },
                onEliminarMemoria = { index -> viewModel.eliminarMemoria(index) },
                onAgregarMemoria = { dato -> viewModel.agregarMemoria(dato) }
            )
        }
    }

    private fun iniciarReconocimientoVoz(viewModel: JarvisViewModel) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {
                    viewModel.setTranscripcion("Escuchando...")
                }
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) {
                    // Reiniciar escucha continua
                    reiniciarEscucha()
                }
                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        val texto = matches[0]
                        viewModel.procesarComandoVoz(texto)
                    }
                    reiniciarEscucha()
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        viewModel.setTranscripcion(matches[0])
                    }
                }
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
        }

        reiniciarEscucha()
    }

    private fun reiniciarEscucha() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale("es", "ES"))
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }
            speechRecognizer?.startListening(intent)
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
    }
}

@Composable
fun JarvisAppScreen(
    state: JarvisUiState,
    onComando: (String) -> Unit,
    onEliminarMemoria: (Int) -> Unit,
    onAgregarMemoria: (String) -> Unit
) {
    var pestaña by remember { mutableStateOf("HUD") }
    var nuevoDatoTexto by remember { mutableStateOf("") }

    val primaryCyan = Color(0xFF00E5FF)
    val bgDark = Color(0xFF070B12)
    val cardDark = Color(0xFF0D1524)

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = bgDark
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header con telemetría
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "J.A.R.V.I.S. OS",
                        color = primaryCyan,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "KOTLIN NATIVE • HAROL",
                        color = Color.Gray,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { pestaña = if (pestaña == "MEMORIA") "HUD" else "MEMORIA" },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = if (pestaña == "MEMORIA") "Cerrar" else "Memoria",
                            fontSize = 11.sp,
                            color = primaryCyan
                        )
                    }
                }
            }

            // Indicadores de estado vitales (Reactores / Recursos)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatIndicator(label = "Reactores", value = state.energia, color = primaryCyan)
                StatIndicator(label = "Recursos", value = state.recursos, color = Color(0xFF38BDF8))
            }

            if (pestaña == "MEMORIA") {
                // Panel de entrenamiento y bancos de memoria
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(cardDark, RoundedCornerShape(16.dp))
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = "BANCOS DE MEMORIA (ENTRENAMIENTO)",
                        color = primaryCyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    state.memorias.forEachIndexed { index, mem ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .background(Color(0xFF131F37), RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "💡 $mem",
                                color = Color.White,
                                fontSize = 11.sp,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "✕",
                                color = Color.Red,
                                fontSize = 14.sp,
                                modifier = Modifier
                                    .padding(start = 8.dp)
                                    .clickable { onEliminarMemoria(index) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = nuevoDatoTexto,
                        onValueChange = { nuevoDatoTexto = it },
                        label = { Text("Enseñar nuevo dato sobre ti", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = primaryCyan,
                            unfocusedBorderColor = Color.Gray,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Button(
                        onClick = {
                            if (nuevoDatoTexto.isNotBlank()) {
                                onAgregarMemoria(nuevoDatoTexto)
                                nuevoDatoTexto = ""
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = primaryCyan),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = "Guardar en Memoria", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                // HUD central con Reactor Arc Animado
                Box(
                    modifier = Modifier
                        .size(240.dp)
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    val infiniteTransition = rememberInfiniteTransition(label = "arc")
                    val angle by infiniteTransition.animateFloat(
                        initialValue = 0f,
                        targetValue = 360f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(12000, easing = LinearEasing),
                            repeatMode = RepeatMode.Restart
                        ),
                        label = "spin"
                    )

                    val isSpeaking = state.estadoVoz == "HABLANDO"
                    val isListening = state.estadoVoz == "ESCUCHANDO"

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .rotate(angle)
                            .border(
                                width = 2.dp,
                                color = if (isListening) Color.Red else primaryCyan,
                                shape = CircleShape
                            )
                    )

                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .background(
                                color = if (isListening) Color(0x33FF0000) else Color(0x2200E5FF),
                                shape = CircleShape
                            )
                            .border(
                                width = 1.dp,
                                color = if (isSpeaking) Color.Green else primaryCyan,
                                shape = CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = state.estadoVoz,
                                color = if (isListening) Color.Red else primaryCyan,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "ONLINE",
                                color = Color.Gray,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                // Texto de transcripción en vivo
                if (state.transcribiendo.isNotBlank()) {
                    Text(
                        text = "🎙️ \"${state.transcribiendo}\"",
                        color = Color.Yellow,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                // Cuadro de diálogo de J.A.R.V.I.S.
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cardDark, RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
                        .padding(16.dp)
                ) {
                    Text(
                        text = state.mensaje,
                        color = Color(0xFFE2E8F0),
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Comandos rápidos de voz
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    QuickCommandButton(
                        text = "\"¿Estás despierto Jarvis?\"",
                        modifier = Modifier.weight(1f),
                        onClick = { onComando("¿Estás despierto Jarvis?") }
                    )
                    QuickCommandButton(
                        text = "\"Jarvis, enciende la luz\"",
                        modifier = Modifier.weight(1f),
                        onClick = { onComando("Jarvis, enciende la luz del cuarto") }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    QuickCommandButton(
                        text = "\"Jarvis, apaga la PC\"",
                        modifier = Modifier.weight(1f),
                        onClick = { onComando("Jarvis, apaga la PC") }
                    )
                    QuickCommandButton(
                        text = "\"Informe de estado\"",
                        modifier = Modifier.weight(1f),
                        onClick = { onComando("Dame un informe de estado de mis sistemas") }
                    )
                }
            }
        }
    }
}

@Composable
fun StatIndicator(label: String, value: Float, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = label, color = Color.Gray, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
            Text(
                text = "${(value * 100).toInt()}%",
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        }
        LinearProgressIndicator(
            progress = { value.coerceIn(0f, 1f) },
            modifier = Modifier
                .width(130.dp)
                .height(6.dp)
                .padding(top = 4.dp),
            color = color,
            trackColor = Color(0xFF1E293B)
        )
    }
}

@Composable
fun QuickCommandButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF111C30)),
        shape = RoundedCornerShape(10.dp),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Text(
            text = text,
            color = Color(0xFF00E5FF),
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace,
            maxLines = 1
        )
    }
}

package com.example.tamagochiandroid

import android.os.Build.VERSION.SDK_INT
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import com.example.tamagochiandroid.ui.theme.TamagochiAndroidTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TamagochiAndroidTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    // Inyectamos el ViewModel aquí
                    TamagotchiScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}

@Composable
fun TamagotchiScreen(
    modifier: Modifier = Modifier,
    viewModel: MascotaViewModel = viewModel() // Llamamos al ViewModel
) {
    // Escuchamos los cambios de la base de datos en tiempo real
    val estadoMascota by viewModel.estadoMascota.collectAsState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatusBar(label = "Energía", progress = estadoMascota?.energia ?: 0f)
            StatusBar(label = "Hambre", progress = estadoMascota?.hambre ?: 0f)
        }

        Spacer(modifier = Modifier.weight(1f))

        val context = LocalContext.current
        val imageLoader = remember(context) {
            ImageLoader.Builder(context)
                .components {
                    if (SDK_INT >= 28) {
                        add(ImageDecoderDecoder.Factory())
                    } else {
                        add(GifDecoder.Factory())
                    }
                }
                .build()
        }

        AsyncImage(
            model = R.drawable.jollybot,
            imageLoader = imageLoader,
            contentDescription = "Avatar de la mascota",
            modifier = Modifier.size(250.dp)
        )

        Spacer(modifier = Modifier.weight(1f))

        // Estado para la respuesta de la IA y el input del usuario
        var respuestaMascota by remember { mutableStateOf("¡Hola! Soy tu Tamagotchi.") }
        var text by remember { mutableStateOf("") }

        // Texto donde la mascota te "habla"
        Text(
            text = respuestaMascota,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            label = { Text("Dile algo a tu mascota...") },
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = {
                IconButton(onClick = {
                    if (text.isNotBlank()) {
                        // Enviamos el texto a Gemini
                        viewModel.interactuarConMascota(text) { respuesta ->
                            // Cuando Gemini responde, actualizamos el texto en pantalla
                            respuestaMascota = respuesta
                        }
                        text = "" // Limpiamos la caja de texto
                    }
                }) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar")
                }
            }
        )
    }
}

@Composable
fun StatusBar(label: String, progress: Float) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, style = MaterialTheme.typography.labelLarge)
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .width(100.dp)
                .padding(top = 4.dp),
        )
    }
}

@Preview(showBackground = true)
@Composable
fun TamagotchiScreenPreview() {
    TamagochiAndroidTheme {
        TamagotchiScreen()
    }
}
# Tamagotchi Virtual (React + Express)

Reescritura completa a React del proyecto Tamagotchi Android original (`HarolFLores/Tamagochi`).

## Características
- **Avatar Interactivo**: Jollybot animado en el centro de la pantalla.
- **Niveles Vitales**: Indicadores de progreso para **Energía** y **Hambre** (0.0 a 1.0) con persistencia local (`localStorage`).
- **Personalidad IA**: Integración con Google Gemini (`gemini-3.8-flash`) mediante proxy en servidor seguro Express (`/api/interact`) con respuestas dinámicas y ajuste en tiempo real de niveles vitales.
- **Acciones Rápidas**: Alimentar (sube hambre), Dormir (sube energía), Jugar y Saludar.
- **Historial de Conversación**: Registro desplegable de las conversaciones con la mascota.
- **Diseño**: Basado en Material Theme Dark con tonos Púrpura y Rosa del diseño original de Android.

## Ejecución
```bash
npm run dev
```
Servidor activo en el puerto 3000 (`http://localhost:3000`).

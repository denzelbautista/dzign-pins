# Dzing Pins — primera vista local

Landing estática en español, construida con Vite y Three.js.

## Ejecutar

```sh
npm install
npm run dev
```

Para producir los archivos estáticos:

```sh
npm run build
```

La salida está en `dist/`, preparada para un alojamiento estático futuro. No hay publicación, backend, autenticación ni almacenamiento de imágenes.

## Qué incluye

- Hero con tres pines volumétricos: cara curva, borde metálico plegado, base plástica blanca con cavidad y broche de metal modelado.
- Simulador con una imagen activa JPG/PNG/WebP, recorte por arrastre y escala, giro, reverso, reinicio y descarga PNG.
- Advertencia de resolución orientativa, procesamiento local y alternativa plana si WebGL no está disponible.
- Navegación por teclado del simulador: flechas para girar o mover el encuadre; Inicio restablece.
- Movimiento suave que se detiene fuera de pantalla; respeta la preferencia de movimiento reducido.
- Composición de materiales, usos, pedido y FAQ con las condiciones comerciales suministradas.
- Diálogo de consulta que copia el texto. Falta configurar el contacto oficial; no se inventó un número o enlace.

## Pendiente antes de publicar

1. Configurar el WhatsApp y/o Facebook oficiales.
2. Confirmar con producción la relación exacta entre la zona visible de 3.2 cm y el corte de 4.4 cm. El simulador es una referencia visual aproximada y no una plantilla de impresión.
3. Confirmar los textos finales del negocio y las imágenes que se quieran usar.

El logo original está disponible en `public/dzignlogo.png`. Los diseños tipográficos de muestra fueron creados para esta vista previa.

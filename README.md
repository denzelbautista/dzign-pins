# Dzing Pins

Esta es la página web de mi negocio de pines personalizados. Hacemos pines de 3.2 cm desde Lima, Perú, y la idea de la web es que la gente pueda ver cómo quedaría su propio diseño antes de pedirlo.

La armé con Vite y Three.js, sin frameworks ni backend. Todo pasa en el navegador.

## Qué tiene

Arriba hay una escena en 3D con algunos de mis diseños como pines, que flotan suavemente.

Lo que más me gusta es el simulador. Subes tu imagen (JPG, PNG o WebP), la acomodas dentro del círculo, cambias la escala, giras el pin para ver el reverso y puedes descargar la vista previa. La imagen no se sube a ningún lado, se queda en tu navegador. Si la imagen tiene poca resolución, te avisa. Y si el dispositivo no soporta 3D, muestra una versión plana.

Después vienen las secciones del pin por dentro (film, papel fotográfico, metal y reverso), ideas según para quién es el pin, una calculadora de pedido con el adelanto y el saldo, las preguntas frecuentes y el contacto por WhatsApp. El botón de WhatsApp arma el mensaje con la cantidad y lo que el cliente escribió.

En celular hay un menú abajo, tipo app, para moverse entre secciones y escribir por WhatsApp sin tener que subir.

## Precios y pagos

- S/ 2.50 por pin, mínimo 10 con el mismo diseño.
- Desde 100 pines se cotiza al por mayor.
- 20% de adelanto para empezar y 80% antes del envío.
- Se paga por Yape, Plin o transferencia.
- Producción de 2 a 3 días. El envío sale desde Lima y lo paga el cliente.

## Fotos de pedidos

Hay una sección lista para mostrar fotos de pedidos reales. Para agregar una, la copio en `public/pedidos/` y la anoto en `public/pedidos.json` (dentro de esa carpeta hay un `LEEME.txt` con el formato). Mientras no haya fotos, la sección no aparece en la web publicada. En `npm run dev` se ven unos espacios de muestra para revisar cómo va a quedar.

Los diseños que salen en el 3D están en `public/designs/` y se configuran en `public/pin-designs.json`.

## Para correrlo

```sh
npm install
npm run dev
```

Para generar la versión final:

```sh
npm run build
```

Queda todo en `dist/`, listo para subir a cualquier hosting estático.

## Pendientes

- Definir el nombre final de la marca y el logo.
- Agregar las fotos de pedidos reales.
- Confirmar con producción cuánto del corte de 4.4 cm queda visible en el pin de 3.2 cm. Por ahora el simulador es una referencia, no una plantilla de impresión.
- Agregar las etiquetas para que el enlace se vea con imagen al compartirlo, y el favicon.

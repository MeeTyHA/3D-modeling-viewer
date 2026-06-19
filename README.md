# DirectTrack — Catálogo Interactivo de Soluciones Vehiculares

Aplicación web interactiva en español para cotización de soluciones GPS y telemática DirectTrack.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
cd directtrack
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Compilar para producción

```bash
npm run build
npm start
```

## Optimizar modelos GLB (recomendado)

Los modelos 3D originales pesan 60–100 MB. Para mejorar tiempos de carga a 5–10 segundos:

```bash
npm run optimize-glb
```

Esto genera versiones comprimidas en `public/assets/glb-optimized/`. Actualiza las rutas `glbPath` en `src/data/vehicles/vehicles.json` para usar `/assets/glb-optimized/` en lugar de `/assets/glb/`.

## Estructura del proyecto

```
src/
  app/                  # Páginas Next.js
  components/           # Componentes React reutilizables
  data/                 # JSON de vehículos, hotspots y productos
  hooks/                # Hooks personalizados
  store/                # Estado global (Zustand)
public/
  assets/
    glb/                # Modelos 3D
    images/             # Imágenes de categorías y productos
    pdf/                # PDFs de equipos
    videos/             # video.mp4
```

## Flujo de usuario

1. Seleccionar categoría de vehículo en la pantalla principal
2. Se carga el modelo GLB correspondiente
3. Explorar el modelo 3D con hotspots interactivos
4. Clic en hotspot → panel de equipo recomendado
5. Agregar productos a la cotización
6. Descargar PDF del equipo seleccionado
7. Solicitar cotización

## Tecnologías

- Next.js 16, TypeScript, Tailwind CSS
- Three.js, React Three Fiber, Drei
- Framer Motion, Zustand, React Hook Form, React Icons


````
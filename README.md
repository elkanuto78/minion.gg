# Minion.GG

Builds de League of Legends por campeón, línea y modo, más estadísticas de jugador.
Las partidas se importan desde la API oficial de Riot a través de un pequeño servidor propio,
para que tus claves nunca lleguen al navegador. El historial puede guardarse en Supabase y
el servidor puede alojarse en Render.

```
navegador ──► servidor Node (Render) ──► API de Riot
                      └──────────────► Supabase (historial de partidas)
```

## Estructura del proyecto

```
minion-gg/
├── server.js            servidor: API de Riot, Supabase y archivos de public/
├── package.json
├── render.yaml          configuración de Render
├── supabase/
│   └── schema.sql       tablas de la base de datos
├── test.js              pruebas (npm test)
└── public/              lo que recibe el navegador
    ├── index.html       estructura de la página
    ├── css/styles.css   estilos (colores, tipografía, diseño, modo claro y oscuro)
    ├── js/data.js       campeones, builds y modos
    ├── js/app.js        lógica de la página y estadísticas
    └── img/favicon.svg  ícono
```

Para agregar imágenes, fuentes u otros recursos, ponlos dentro de `public/` y enlázalos con rutas como `/img/archivo.png`.
Los scripts solo se cargan desde `public/` (la política de seguridad bloquea código en línea).
Para añadir campeones edita `public/js/data.js`.

## Probarlo en tu computadora

1. Instala Node.js 18 o superior.
2. Entra a https://developer.riotgames.com con tu cuenta de Riot y copia tu clave de desarrollo.
3. Copia `.env.example` como `.env` y pega la clave en `RIOT_API_KEY`.
4. Ejecuta `npm start` y abre http://localhost:3000.
5. En **Mis estadísticas**, escribe tu Riot ID (`Nombre#TAG`), elige LAN o LAS y pulsa **Importar últimas partidas**.

Sin Supabase todo funciona igual, pero el historial solo vive en el navegador y en la memoria del servidor.

## Paso 1: crear la base de datos en Supabase

1. Crea un proyecto en https://supabase.com.
2. Abre **SQL Editor**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
   Crea las tablas `players` y `matches` con la seguridad por filas (RLS) activada y sin políticas públicas:
   solo el servidor, con la clave secreta, puede leerlas y escribirlas.
3. En **Project Settings > API** copia:
   - **Project URL** (por ejemplo `https://abcd1234.supabase.co`).
   - La **clave secreta** (`sb_secret_...`). Si tu proyecto es antiguo, sirve la clave `service_role`.
4. Esa clave salta toda la seguridad de la base de datos. Úsala solo en el servidor y nunca la pegues en la página ni la subas a GitHub.

## Paso 2: subir el código a GitHub

1. Crea un repositorio y sube esta carpeta. El archivo `.gitignore` ya excluye `.env`.
2. Comprueba que `.env` no aparezca entre los archivos subidos.

## Paso 3: publicarlo en Render

1. En https://render.com elige **New > Blueprint** y selecciona tu repositorio. Render lee `render.yaml`.
2. Cuando pida las variables, completa:
   - `RIOT_API_KEY`: tu clave de Riot.
   - `SUPABASE_URL`: la Project URL del paso 1.
   - `SUPABASE_SECRET_KEY`: la clave secreta del paso 1.
3. Pulsa **Apply** y espera el despliegue. La dirección `https://minion-gg.onrender.com` (o la que te asigne Render) abre la página.
4. Para comprobar la conexión abre `/api/health`: debe responder `{"ok":true,"storage":true}`.
   Si `storage` es `false`, falta `SUPABASE_URL` o `SUPABASE_SECRET_KEY`.

Si prefieres crearlo a mano: **New > Web Service**, comando de compilación `npm install`, comando de inicio `npm start`,
ruta de salud `/api/health` y las mismas tres variables. Render define `PORT` solo y el servidor ya escucha en todas las interfaces cuando corre allí.

## Qué hace el servidor

- `GET /api/health` indica si hay clave de Riot (`ok`) y si hay base de datos (`storage`).
- `GET /api/player?riotId=Nombre%23TAG&region=la2&count=20` busca la cuenta, el rango y las últimas partidas.
- Usa account-v1, league-v4 y match-v5. Con Supabase guarda el jugador, su rango y cada partida; en las siguientes
  importaciones solo pide a Riot las partidas nuevas y devuelve hasta 200 del historial.
- Si Supabase falla, la importación sigue con los datos de Riot y la página no muestra el aviso de historial guardado.
- Limita las consultas a 10 por minuto por visitante y 60 en total (`RATE_PER_IP` y `RATE_GLOBAL` lo cambian), para proteger la clave de Riot.
- Solo cuenta partidas normales, clasificatorias, ARAM y Arena. Ignora remakes (menos de 5 minutos).

## Límites que conviene conocer

- **Clave de desarrollo:** caduca cada 24 horas y no se puede usar en un producto público. En Render tendrías que
  actualizar `RIOT_API_KEY` cada día. Para algo estable pide una **clave personal** en el portal de Riot (Register Product).
- **Uso público:** una clave personal es para uso privado. Si abres Minion.GG a cualquiera, Riot exige una **clave de producción**,
  que suele pedir un prototipo funcionando. Mientras tanto, no difundas la dirección.
- **Render gratuito:** la instancia se duerme tras un rato sin visitas y la primera consulta después tarda en responder.
- **Supabase gratuito:** los proyectos sin actividad pueden pausarse. Si pasa, se reactivan desde el panel.
- **Estadísticas por navegador:** la página guarda las partidas importadas y las manuales en tu navegador.
  Supabase conserva el historial importado de cada Riot ID, pero no guarda las partidas registradas a mano.
- **Servidor de Perú:** elige LAN (`la1`) o LAS (`la2`) según tu cuenta.
- Los campeones que aún no tienen build en Minion.GG aparecen en las estadísticas sin enlace a su build.

## Pruebas

`npm test` ejecuta el servidor contra respuestas simuladas de Riot y Supabase (no necesita claves ni internet).

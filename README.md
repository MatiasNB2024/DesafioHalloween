# Concurso de disfraces de Halloween

Aplicación web para registrar y votar disfraces de Halloween. El frontend (HTML, CSS y JavaScript) consume una **API REST en PHP** que guarda todo en **MySQL**.

- Muro de disfraces con nombre, descripción, foto y cantidad de votos.
- Registro e inicio de sesión con contraseña hasheada y token JWT.
- Votación: cada usuario puede votar una vez cada disfraz (y quitar su voto).
- Los usuarios con cuenta pueden subir su propio disfraz con foto.
- Panel de administración (solo para el administrador) con alta, edición, baja y restauración de disfraces.

## Requisitos

- XAMPP con PHP 8 (Apache y MySQL/MariaDB). Funciona con la configuración que trae XAMPP por defecto.
- Un navegador actual (Chrome, Firefox, Edge o Safari).

## Instalación en XAMPP

1. Copiá la carpeta `halloween` dentro de `htdocs` (en Windows: `C:\xampp\htdocs\halloween`).
2. Abrí el panel de XAMPP y encendé **Apache** y **MySQL**.
3. Entrá a <http://localhost/phpmyadmin>, abrí la pestaña **Importar**, elegí el archivo `halloween/database/halloween.sql` y hacé clic en **Importar**. El script crea la base `halloween`, las tablas y datos de ejemplo.
4. Abrí <http://localhost/halloween>.

> La aplicación tiene que abrirse desde `http://localhost/...`. Si abrís el `index.html` con doble clic (`file://`), el navegador no puede llamar a la API.

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Halloween2026` | Administrador: accede a `admin.html` |
| `lucia`, `mateo`, `sofia`, `tomas` | `calabaza2026` | Usuarios comunes que ya votaron algunos disfraces |

También podés crear una cuenta nueva desde **Crear cuenta**.

## Páginas

| Página | Para qué sirve |
|---|---|
| `index.html` | Muro de disfraces ordenado por votos, con el botón **Votar** en cada uno. Sin sesión, el botón lleva a ingresar. |
| `registro.html` | Crear una cuenta con nombre de usuario y contraseña. Al terminar, la sesión queda iniciada. |
| `login.html` | Iniciar sesión. |
| `subir.html` | Subir un disfraz con descripción y foto (requiere sesión). Muestra una vista previa de cómo va a quedar. |
| `admin.html` | CRUD de disfraces. Si no sos el administrador, la página no muestra nada y la API responde 403. |

## API REST

Todas las rutas están bajo `http://localhost/halloween/api/`. Los datos viajan en JSON y cada respuesta usa el código HTTP que corresponde. `GET /api/` devuelve esta lista.

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| `POST` | `/usuarios` | Público | Registrarse. Cuerpo: `{"nombre", "clave"}`. Responde `201` con un token. |
| `POST` | `/sesion` | Público | Iniciar sesión. Cuerpo: `{"nombre", "clave"}`. Responde `200` con un token. |
| `GET` | `/sesion` | Con sesión | Datos del usuario del token. |
| `GET` | `/disfraces` | Público | Lista ordenada por votos. Con token, cada disfraz indica si ya lo votaste (`votado`). |
| `GET` | `/disfraces?todos=1` | Admin | Incluye los eliminados. |
| `POST` | `/disfraces` | Con sesión | Crear. Cuerpo: `{"nombre", "descripcion", "foto"}` (foto opcional). |
| `GET` | `/disfraces/{id}` | Público | Ver un disfraz. |
| `PUT` | `/disfraces/{id}` | Admin | Modificar. Sin `foto` conserva la actual, `"foto": null` la quita. |
| `PATCH` | `/disfraces/{id}` | Admin | Restaurar un eliminado con `{"eliminado": false}`. |
| `DELETE` | `/disfraces/{id}` | Admin | Eliminar (baja lógica, ver abajo). Responde `204`. |
| `GET` | `/disfraces/{id}/foto` | Público | La imagen guardada en la base. |
| `POST` | `/disfraces/{id}/votos` | Con sesión | Votar. Responde `201`, o `409` si ya lo votaste. |
| `DELETE` | `/disfraces/{id}/votos` | Con sesión | Quitar tu voto. |

**Autenticación.** `POST /sesion` y `POST /usuarios` devuelven un token JWT firmado. Las rutas protegidas lo reciben en el encabezado `Authorization: Bearer <token>`. El servidor no guarda sesiones (la API es *stateless*); el token vence a las 4 horas y cerrar sesión es borrarlo del navegador.

**Códigos de respuesta.** `200` OK, `201` creado, `204` sin contenido, `400` JSON inválido, `401` sin sesión o token vencido, `403` sin permiso, `404` no existe, `405` método no permitido, `409` duplicado (usuario o voto), `413` cuerpo demasiado grande, `415` no es JSON, `422` datos inválidos (con el detalle por campo en `campos`), `503` sin conexión a MySQL.

Ejemplo con `curl`:

```bash
curl -X POST http://localhost/halloween/api/sesion -H "Content-Type: application/json" -d "{\"nombre\":\"lucia\",\"clave\":\"calabaza2026\"}"
curl -X POST http://localhost/halloween/api/disfraces/4/votos -H "Authorization: Bearer <token>"
```

## Base de datos

Las tres tablas tienen **exactamente las columnas de la consigna**. El script solo agrega lo que una base necesita para funcionar bien:

- Claves primarias y `AUTO_INCREMENT` en los `id`.
- Índice único en `usuarios.nombre`: no puede haber dos usuarios con el mismo nombre.
- Índice único en `votos (id_usuario, id_disfraz)`: la base rechaza un voto duplicado aunque alguien llame a la API a mano.
- Claves foráneas de `votos` hacia `usuarios` y `disfraces`.

Sobre las columnas de la foto: `foto_blob` guarda los bytes de la imagen y `foto` su tipo MIME (`image/jpeg`). Como un `BLOB` admite hasta 64 KB, el navegador achica la foto antes de enviarla y el servidor la vuelve a validar (y la recomprime con la extensión GD de PHP si está activa).

`disfraces.votos` se recalcula contando la tabla `votos` cada vez que alguien vota o quita su voto, dentro de una transacción, así los dos datos nunca quedan desincronizados.

## Seguridad

- **Contraseñas** con `password_hash()` / `password_verify()` (bcrypt). Nunca se guardan en texto plano.
- **Inyección SQL**: todas las consultas usan sentencias preparadas de PDO.
- **XSS**: el frontend inserta los datos con `textContent`, nunca con `innerHTML`. Además, cada página tiene una *Content Security Policy* que solo permite scripts propios.
- **Autorización en el servidor**: cada endpoint verifica el token y el rol. Ocultar botones en la página es solo comodidad; la API rechaza igual al que no tiene permiso.
- **Tokens JWT** firmados con HMAC-SHA256: se comparan en tiempo constante, se rechaza `alg: none` y se controla el vencimiento.
- **Login**: el mismo mensaje para usuario inexistente o contraseña incorrecta, con un tiempo de respuesta similar y una demora en cada intento fallido.
- **Fotos**: se detecta el tipo real leyendo los bytes (no se confía en la extensión), se aceptan solo JPG, PNG, GIF y WebP, y se recodifican para borrar metadatos como la ubicación GPS (en el navegador al achicarlas, y en el servidor con GD).
- **Archivos protegidos**: `.htaccess` impide descargar `api/src/` (configuración) y `database/` (el script con hashes).
- **Errores**: los detalles técnicos van al log de Apache, nunca a la respuesta.

## Decisiones tomadas

- **Votos**: cada usuario puede votar una vez cada disfraz, así que puede votar varios disfraces distintos. Si cambia de opinión, puede quitar su voto.
- **Administrador**: la consigna no incluye una columna de rol en `usuarios`, así que el administrador es el usuario cuyo nombre figura en `api/src/config.php` (`admin`). El script ya lo crea y la API no permite registrar otro usuario con ese nombre.
- **Eliminar es una baja lógica**: se usa la columna `eliminado`. El disfraz deja de mostrarse, conserva sus votos y el administrador lo puede restaurar.
- **Subir disfraces** (punto 3.b): cualquier usuario con sesión puede publicar el suyo; el administrador puede editarlo o eliminarlo.

## Estructura

```
halloween/
├── index.html, login.html, registro.html, subir.html, admin.html
├── css/estilos.css
├── js/
│   ├── api.js        cliente de la API (fetch + token)
│   ├── sesion.js     guarda y lee el token
│   ├── ui.js         cabecera, avisos, formularios, polaroid
│   ├── imagen.js     achica la foto antes de subirla
│   └── index.js, login.js, registro.js, subir.js, admin.js
├── api/
│   ├── .htaccess     manda todas las rutas a index.php
│   ├── index.php     router de la API REST
│   └── src/          configuración, conexión, JWT, validaciones y controladores
├── database/halloween.sql
├── fonts/            tipografías con licencia libre (OFL)
└── img/
```

## Configuración y problemas comunes

- **MySQL con contraseña, otro puerto u otro usuario**: cambialo en `api/src/config.php`.
- **"No se pudo conectar a la base de datos"**: MySQL está apagado o falta importar `database/halloween.sql`.
- **La API responde 404 o "no respondió en JSON"**: Apache no está aplicando el `.htaccess` (falta `mod_rewrite` o `AllowOverride`). Sin tocar Apache, en `js/api.js` cambiá `export const API = 'api';` por `export const API = 'api/index.php';`.
- **Cambiar la contraseña del administrador**: generá un hash con `C:\xampp\php\php.exe -r "echo password_hash('nueva-clave', PASSWORD_DEFAULT);"` y pegalo en la columna `clave` del usuario `admin` desde phpMyAdmin.
- **Clave de los tokens**: si publicás el proyecto, cambiá `jwt_secreto` en `api/src/config.php` por una nueva (`php -r "echo bin2hex(random_bytes(32));"`).

## Créditos

- Tipografías Gloock, Bricolage Grotesque y Nothing You Could Do, bajo SIL Open Font License (licencias en `fonts/`).
- Las ilustraciones de los disfraces de ejemplo fueron dibujadas para este proyecto.

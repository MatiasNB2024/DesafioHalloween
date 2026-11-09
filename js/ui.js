// Piezas de interfaz compartidas por todas las páginas.
// Todo el texto que viene de la API se inserta con textContent (nunca innerHTML),
// así un nombre como "<script>" se muestra tal cual y no se ejecuta (previene XSS).
import { usuarioActual, cerrarSesion } from './sesion.js';

const PAGINAS_DE_REGRESO = ['index.html', 'subir.html', 'admin.html'];
const CLAVE_AVISO = 'halloween.aviso';

/** Crea un elemento con clase y texto opcionales. */
export function el(etiqueta, clase = '', texto = '') {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== '') nodo.textContent = texto;
  return nodo;
}

function enlace(texto, href, clase) {
  const a = el('a', clase, texto);
  a.href = href;
  return a;
}

export function paginaActual() {
  return location.pathname.split('/').pop() || 'index.html';
}

/** Lee ?volver= y solo acepta páginas propias (evita redirecciones a otros sitios). */
export function destinoSeguro(porDefecto = 'index.html') {
  const pedido = new URLSearchParams(location.search).get('volver');
  return PAGINAS_DE_REGRESO.includes(pedido) ? pedido : porDefecto;
}

export function irALogin(motivo) {
  if (motivo) guardarAviso(motivo);
  location.href = `login.html?volver=${encodeURIComponent(paginaActual())}`;
}

/** Arma la zona de cuenta de la cabecera según haya sesión o no. */
export function pintarCuenta() {
  const contenedor = document.getElementById('cuenta');
  if (!contenedor) return;
  contenedor.replaceChildren();
  const usuario = usuarioActual();

  if (!usuario) {
    const actual = paginaActual();
    const volver = PAGINAS_DE_REGRESO.includes(actual) ? `?volver=${actual}` : '';
    contenedor.append(
      enlace('Ingresar', `login.html${volver}`, 'cuenta__enlace'),
      enlace('Crear cuenta', `registro.html${volver}`, 'boton boton--chico'),
    );
    return;
  }

  contenedor.append(el('span', 'cuenta__nombre', `Hola, ${usuario.nombre}`));
  if (usuario.admin) contenedor.append(enlace('Administrar', 'admin.html', 'cuenta__enlace'));
  const salir = el('button', 'cuenta__enlace', 'Salir');
  salir.type = 'button';
  salir.addEventListener('click', () => {
    cerrarSesion();
    guardarAviso('Cerraste la sesión.');
    location.href = 'index.html';
  });
  contenedor.append(salir);
}

let temporizador;
/** Muestra un aviso breve abajo de la pantalla. tipo: 'ok' | 'error' */
export function avisar(texto, tipo = 'ok') {
  const caja = document.getElementById('aviso');
  if (!caja) return;
  caja.textContent = texto;
  caja.className = `aviso aviso--visible${tipo === 'error' ? ' aviso--error' : ''}`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { caja.className = 'aviso'; }, tipo === 'error' ? 6000 : 3500);
}

/** Guarda un aviso para mostrarlo en la próxima página (después de redirigir). */
export function guardarAviso(texto, tipo = 'ok') {
  try { sessionStorage.setItem(CLAVE_AVISO, JSON.stringify({ texto, tipo })); } catch { /* sin almacenamiento */ }
}

export function mostrarAvisoPendiente() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_AVISO));
    sessionStorage.removeItem(CLAVE_AVISO);
    if (guardado?.texto) avisar(guardado.texto, guardado.tipo);
  } catch { /* nada pendiente */ }
}

export function textoVotos(cantidad) {
  if (cantidad === 0) return 'Sin votos';
  return cantidad === 1 ? 'voto' : 'votos';
}

// --- Formularios ---------------------------------------------------------------

export function limpiarErrores(formulario) {
  formulario.querySelectorAll('[aria-invalid]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  formulario.querySelectorAll('.campo__error, .formulario__error').forEach((nodo) => { nodo.textContent = ''; });
}

/** Marca cada campo con su mensaje. `campos` es { nombreDelCampo: 'mensaje' }. */
export function mostrarErrores(formulario, campos = {}, general = '') {
  let primero = null;
  for (const [nombre, mensaje] of Object.entries(campos)) {
    const campo = formulario.elements.namedItem(nombre);
    const salida = formulario.querySelector(`#error-${nombre}`);
    if (campo) {
      campo.setAttribute('aria-invalid', 'true');
      primero ??= campo;
    }
    if (salida) salida.textContent = mensaje;
  }
  const caja = formulario.querySelector('.formulario__error');
  if (caja && general && !Object.keys(campos).length) caja.textContent = general;
  primero?.focus();
}

/** Contador de caracteres "12/50" debajo de un campo. */
export function contarCaracteres(campo, salida) {
  const actualizar = () => { salida.textContent = `${campo.value.length}/${campo.maxLength}`; };
  campo.addEventListener('input', actualizar);
  actualizar();
}

// --- Polaroid ------------------------------------------------------------------

/**
 * Foto estilo polaroid con el nombre escrito a mano.
 * @param {{nombre:string, foto_url:string|null}} disfraz
 */
export function crearPolaroid(disfraz, { carga = 'lazy' } = {}) {
  const figura = el('figure', 'polaroid');
  const marco = el('div', 'polaroid__foto');
  if (disfraz.foto_url) {
    const img = el('img');
    img.src = disfraz.foto_url;
    img.alt = `Foto del disfraz ${disfraz.nombre}`;
    img.width = 480;
    img.height = 600;
    img.loading = carga;
    img.decoding = 'async';
    marco.append(img);
  } else {
    marco.classList.add('polaroid__foto--vacia');
    marco.append(el('span', '', 'Sin foto'));
  }
  figura.append(marco, el('figcaption', 'polaroid__nombre', disfraz.nombre));
  return figura;
}

// Página de inicio de sesión.
import { pedir } from './api.js';
import { guardarSesion, usuarioActual } from './sesion.js';
import {
  pintarCuenta, mostrarAvisoPendiente, limpiarErrores, mostrarErrores, destinoSeguro, guardarAviso,
} from './ui.js';

const formulario = document.getElementById('formulario');
const destino = destinoSeguro();

// Se conserva el destino si la persona prefiere crear una cuenta.
document.getElementById('ir-registro').href = `registro.html?volver=${destino}`;

if (usuarioActual()) {
  location.replace(destino);
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErrores(formulario);

  const nombre = formulario.nombre.value.trim();
  const clave = formulario.clave.value;
  const errores = {};
  if (!nombre) errores.nombre = 'Escribí tu nombre de usuario.';
  if (!clave) errores.clave = 'Escribí tu contraseña.';
  if (Object.keys(errores).length) {
    mostrarErrores(formulario, errores);
    return;
  }

  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  boton.textContent = 'Ingresando…';
  try {
    const sesion = await pedir('POST', 'sesion', { nombre, clave });
    guardarSesion(sesion);
    guardarAviso(`Hola, ${sesion.usuario.nombre}.`);
    location.href = destino;
  } catch (error) {
    mostrarErrores(formulario, error.campos, error.message);
    formulario.clave.value = '';
    boton.disabled = false;
    boton.textContent = 'Ingresar';
  }
});

pintarCuenta();
mostrarAvisoPendiente();

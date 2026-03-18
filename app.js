// ===============================
// CONFIG
// ===============================
const DATA_URL = "jornadas.json";

let DATA = [];
let jornadaActual = null;
let equipoSeleccionado = null;

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();

  document.getElementById("selector-jornada").addEventListener("change", onJornadaChange);
  document.getElementById("selector-fecha").addEventListener("change", onFechaChange);
  document.getElementById("selector-equipo")?.addEventListener("change", onEquipoChange);

  document.getElementById("btn-hoy").addEventListener("click", irAHoy);
  document.getElementById("btn-compartir").addEventListener("click", compartir);
});

// ===============================
// CARGA DATOS
// ===============================
async function cargarDatos() {
  try {
    const res = await fetch(DATA_URL);
    const json = await res.json();

    DATA = json.semanas;

    rellenarSelectorJornadas();
    rellenarSelectorEquipos();

    jornadaActual = DATA[0];
    render();
  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

// ===============================
// SELECTORES
// ===============================
function rellenarSelectorJornadas() {
  const select = document.getElementById("selector-jornada");
  select.innerHTML = "";

  DATA.forEach((semana, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = semana.titulo;
    select.appendChild(option);
  });

  select.value = 0;
}

function rellenarSelectorEquipos() {
  const select = document.getElementById("selector-equipo");
  if (!select) return;

  const equipos = new Set();

  DATA.forEach(semana => {
    semana.partidos.forEach(p => {
      equipos.add(p.equipo_cbat);
    });
  });

  select.innerHTML = `<option value="">Todos los equipos</option>`;

  [...equipos].sort().forEach(eq => {
    const option = document.createElement("option");
    option.value = eq;
    option.textContent = eq;
    select.appendChild(option);
  });
}

// ===============================
// EVENTOS
// ===============================
function onJornadaChange(e) {
  jornadaActual = DATA[e.target.value];
  render();
}

function onFechaChange(e) {
  const fecha = e.target.value;
  if (!fecha) return;

  const jornada = DATA.find(semana =>
    fechaDentroRango(fecha, semana.inicio, semana.fin)
  );

  if (jornada) {
    jornadaActual = jornada;
    document.getElementById("selector-jornada").value = DATA.indexOf(jornada);
    render();
  }
}

function onEquipoChange(e) {
  equipoSeleccionado = e.target.value;
  render();
}

function irAHoy() {
  const hoy = new Date().toISOString().split("T")[0];

  const jornada = DATA.find(semana =>
    fechaDentroRango(hoy, semana.inicio, semana.fin)
  );

  if (jornada) {
    jornadaActual = jornada;
    document.getElementById("selector-jornada").value = DATA.indexOf(jornada);
    render();
  }
}

// ===============================
// UTILIDADES
// ===============================
function fechaDentroRango(fechaISO, inicioStr, finStr) {
  const fecha = new Date(fechaISO);
  const inicio = parseFecha(inicioStr);
  const fin = parseFecha(finStr);

  return fecha >= inicio && fecha <= fin;
}

function parseFecha(fechaStr) {
  const [dia, mes, año] = fechaStr.split("/");
  return new Date(`${año}-${mes}-${dia}`);
}

function formatearFechaCorta(fechaStr) {
  const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const [dia, mes] = fechaStr.split("/");
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]}`;
}

// ===============================
// RENDER
// ===============================
function render() {
  if (!jornadaActual) return;

  let partidos = jornadaActual.partidos;

  if (equipoSeleccionado) {
    partidos = partidos.filter(p => p.equipo_cbat === equipoSeleccionado);
  }

  renderPartidos(partidos);
  renderContadores(partidos);
}

// ===============================
// PARTIDOS
// ===============================
function renderPartidos(partidos) {
  const container = document.getElementById("lista-partidos");
  container.innerHTML = "";

  partidos.forEach(p => {
    const div = document.createElement("div");
    div.className = "partido";

    div.innerHTML = `
      <div class="col-fecha">${formatearFechaCorta(p.fecha)}</div>
      <div class="col-partido">${formatearPartido(p)}</div>
      <div class="col-info">${p.hora} - ${p.pabellon}</div>
    `;

    container.appendChild(div);
  });
}

function formatearPartido(p) {
  let nombre = p.equipo_cbat;

  if (p.categoria) nombre += ` ${p.categoria}`;
  if (p.grupo) nombre += ` ${p.grupo}`;

  const rival = p.rival;

  if (p.condicion === "Casa") {
    return `${nombre} - ${rival}`;
  } else {
    return `${rival} - ${nombre}`;
  }
}

// ===============================
// CONTADORES
// ===============================
function renderContadores(partidos) {
  const total = partidos.length;
  const casa = partidos.filter(p => p.condicion === "Casa").length;
  const fuera = partidos.filter(p => p.condicion === "Fuera").length;

  document.getElementById("contador-total").textContent = total;
  document.getElementById("contador-casa").textContent = casa;
  document.getElementById("contador-fuera").textContent = fuera;
}

// ===============================
// COMPARTIR
// ===============================
function generarTextoCompartir() {
  let texto = `📅 ${jornadaActual.titulo}\n\n`;

  jornadaActual.partidos.forEach(p => {
    texto += `• ${formatearFechaCorta(p.fecha)} | ${formatearPartido(p)} | ${p.hora}\n`;
  });

  return texto;
}

function compartir() {
  const texto = generarTextoCompartir();

  if (navigator.share) {
    navigator.share({ text: texto });
  } else {
    navigator.clipboard.writeText(texto);
    alert("Texto copiado para compartir");
  }
}
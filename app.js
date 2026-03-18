const DATA_URL = "data.json";

const state = {
  semanas: [],
  jornadaIndex: 0,
  equipo: "",
  fechaISO: ""
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindEvents();
  await cargarDatos();
});

function cacheElements() {
  els.selectorJornada = document.getElementById("selector-jornada");
  els.selectorFecha = document.getElementById("selector-fecha");
  els.selectorEquipo = document.getElementById("selector-equipo");
  els.btnHoy = document.getElementById("btn-hoy");
  els.btnCompartir = document.getElementById("btn-compartir");
  els.listaPartidos = document.getElementById("lista-partidos");
  els.contadorTotal = document.getElementById("contador-total");
  els.contadorCasa = document.getElementById("contador-casa");
  els.contadorFuera = document.getElementById("contador-fuera");
}

function bindEvents() {
  els.selectorJornada.addEventListener("change", onJornadaChange);
  els.selectorFecha.addEventListener("change", onFechaChange);
  els.selectorEquipo.addEventListener("change", onEquipoChange);
  els.btnHoy.addEventListener("click", onHoyClick);
  els.btnCompartir.addEventListener("click", compartir);
}

async function cargarDatos() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${DATA_URL} (${response.status})`);
    }

    const json = await response.json();
    state.semanas = Array.isArray(json.semanas) ? json.semanas : [];

    if (!state.semanas.length) {
      renderPartidos([]);
      renderContadores([]);
      return;
    }

    state.jornadaIndex = 0;
    rellenarSelectorJornadas();
    rellenarSelectorEquipos();
    render();
  } catch (error) {
    console.error("Error cargando datos:", error);
    renderPartidos([]);
    renderContadores([]);
  }
}

function rellenarSelectorJornadas() {
  els.selectorJornada.innerHTML = "";

  state.semanas.forEach((semana, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = semana.titulo || `Jornada ${index + 1}`;
    els.selectorJornada.appendChild(option);
  });

  els.selectorJornada.value = String(state.jornadaIndex);
}

function rellenarSelectorEquipos() {
  const equipos = new Set();

  state.semanas.forEach((semana) => {
    (semana.partidos || []).forEach((partido) => {
      if (partido.equipo_cbat) {
        equipos.add(partido.equipo_cbat);
      }
    });
  });

  els.selectorEquipo.innerHTML = '<option value="">Todos</option>';

  [...equipos]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((equipo) => {
      const option = document.createElement("option");
      option.value = equipo;
      option.textContent = equipo;
      els.selectorEquipo.appendChild(option);
    });
}

function onJornadaChange(event) {
  state.jornadaIndex = Number(event.target.value);
  render();
}

function onFechaChange(event) {
  state.fechaISO = event.target.value;

  if (!state.fechaISO) {
    render();
    return;
  }

  const jornadaIndex = buscarJornadaPorFechaISO(state.fechaISO);
  if (jornadaIndex !== -1) {
    state.jornadaIndex = jornadaIndex;
    els.selectorJornada.value = String(jornadaIndex);
  }

  render();
}

function onEquipoChange(event) {
  state.equipo = event.target.value;
  render();
}

function onHoyClick() {
  const hoyISO = toISODate(new Date());
  state.fechaISO = hoyISO;
  els.selectorFecha.value = hoyISO;

  const jornadaIndex = buscarJornadaPorFechaISO(hoyISO);
  if (jornadaIndex !== -1) {
    state.jornadaIndex = jornadaIndex;
    els.selectorJornada.value = String(jornadaIndex);
  }

  render();
}

function render() {
  const partidosVisibles = getPartidosFiltrados();
  renderPartidos(partidosVisibles);
  renderContadores(partidosVisibles);
}

function getPartidosFiltrados() {
  const jornada = state.semanas[state.jornadaIndex];
  if (!jornada) return [];

  const partidos = Array.isArray(jornada.partidos) ? [...jornada.partidos] : [];

  return partidos.filter((partido) => {
    const coincideEquipo = !state.equipo || partido.equipo_cbat === state.equipo;
    const coincideFecha = !state.fechaISO || normalizarFechaPartido(partido.fecha) === state.fechaISO;
    return coincideEquipo && coincideFecha;
  });
}

function renderPartidos(partidos) {
  els.listaPartidos.innerHTML = "";

  if (!partidos.length) {
    const empty = document.createElement("div");
    empty.className = "partido partido-empty";
    empty.textContent = "No hay partidos para los filtros seleccionados.";
    els.listaPartidos.appendChild(empty);
    return;
  }

  partidos
    .sort((a, b) => {
      const fechaA = `${normalizarFechaPartido(a.fecha)} ${a.hora || "00:00"}`;
      const fechaB = `${normalizarFechaPartido(b.fecha)} ${b.hora || "00:00"}`;
      return fechaA.localeCompare(fechaB);
    })
    .forEach((partido) => {
      const row = document.createElement("article");
      row.className = "partido";

      const hora = partido.hora || "-";
      const pabellon = partido.pabellon || "-";

      row.innerHTML = `
        <div class="col-fecha">${formatearFechaCorta(partido.fecha)}</div>
        <div class="col-partido">${formatearPartido(partido)}</div>
        <div class="col-hora">${hora}</div>
        <div class="col-pabellon">${pabellon}</div>
      `;

      els.listaPartidos.appendChild(row);
    });
}

function renderContadores(partidos) {
  const total = partidos.length;
  const casa = partidos.filter((p) => p.condicion === "Casa").length;
  const fuera = partidos.filter((p) => p.condicion === "Fuera").length;

  els.contadorTotal.textContent = String(total);
  els.contadorCasa.textContent = String(casa);
  els.contadorFuera.textContent = String(fuera);
}

function formatearPartido(partido) {
  const equipo = partido.equipo_cbat || "CBAT";
  const rival = partido.rival || "Rival pendiente";

  return partido.condicion === "Casa"
    ? `${equipo} - ${rival}`
    : `${rival} - ${equipo}`;
}

function formatearFechaCorta(fechaStr) {
  const fechaISO = normalizarFechaPartido(fechaStr);
  if (!fechaISO) return fechaStr || "-";

  const date = new Date(`${fechaISO}T00:00:00`);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function normalizarFechaPartido(fechaStr) {
  if (!fechaStr) return "";

  const [dia, mes, anio] = fechaStr.split("/");
  if (!dia || !mes || !anio) return "";

  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function buscarJornadaPorFechaISO(fechaISO) {
  return state.semanas.findIndex((semana) => {
    const inicio = normalizarFechaPartido(semana.inicio);
    const fin = normalizarFechaPartido(semana.fin);
    return inicio && fin && fechaISO >= inicio && fechaISO <= fin;
  });
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generarTextoCompartir() {
  const jornada = state.semanas[state.jornadaIndex];
  if (!jornada) return "No hay jornada seleccionada.";

  const partidos = getPartidosFiltrados();

  let texto = `📅 ${jornada.titulo || "Jornada"}\n\n`;
  partidos.forEach((p) => {
    texto += `• ${formatearFechaCorta(p.fecha)} | ${formatearPartido(p)} | ${p.hora || "-"} | ${p.pabellon || "-"}\n`;
  });

  return texto;
}

async function compartir() {
  const texto = generarTextoCompartir();

  try {
    if (navigator.share) {
      await navigator.share({ text: texto });
      return;
    }

    await navigator.clipboard.writeText(texto);
    alert("Texto copiado para compartir");
  } catch (error) {
    console.error("No se pudo compartir:", error);
  }
}

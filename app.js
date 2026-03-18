const DATA_URL = "./data.json";

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
  els.selectorJornada = document.getElementById("jornada");
  els.selectorFecha = document.getElementById("fecha");
  els.selectorEquipo = document.getElementById("equipo");
  els.btnHoy = document.getElementById("btn-hoy");
  els.btnCompartir = document.getElementById("btn-compartir");
  els.listaPartidos = document.getElementById("partidos-list");
  els.contadorTotal = document.getElementById("total");
  els.contadorCasa = document.getElementById("casa");
  els.contadorFuera = document.getElementById("fuera");
}

function bindEvents() {
  if (els.selectorJornada) {
    els.selectorJornada.addEventListener("change", onJornadaChange);
  }

  if (els.selectorFecha) {
    els.selectorFecha.addEventListener("change", onFechaChange);
  }

  if (els.selectorEquipo) {
    els.selectorEquipo.addEventListener("change", onEquipoChange);
  }

  if (els.btnHoy) {
    els.btnHoy.addEventListener("click", onHoyClick);
  }

  if (els.btnCompartir) {
    els.btnCompartir.addEventListener("click", compartir);
  }
}

async function cargarDatos() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${DATA_URL} (${response.status})`);
    }

    const json = await response.json();
    state.semanas = normalizarSemanas(json);

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

function normalizarSemanas(json) {
  const coleccion =
    Array.isArray(json?.semanas) ? json.semanas :
    Array.isArray(json?.jornadas) ? json.jornadas :
    Array.isArray(json) ? json :
    Array.isArray(json?.partidos) ? [{ titulo: "Todos los partidos", partidos: json.partidos }] :
    [];

  return coleccion
    .map((semana, index) => ({
      titulo: semana?.titulo || semana?.nombre || `Jornada ${index + 1}`,
      inicio: semana?.inicio || "",
      fin: semana?.fin || "",
      partidos: Array.isArray(semana?.partidos) ? semana.partidos : []
    }))
    .filter((semana) => semana.partidos.length > 0);
}

function rellenarSelectorJornadas() {
  if (!els.selectorJornada) return;

  els.selectorJornada.innerHTML = "";

  state.semanas.forEach((semana, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = semana.titulo;
    els.selectorJornada.appendChild(option);
  });

  els.selectorJornada.value = String(state.jornadaIndex);
}

function rellenarSelectorEquipos() {
  if (!els.selectorEquipo) return;

  const equipos = new Set();

  state.semanas.forEach((semana) => {
    semana.partidos.forEach((partido) => {
      if (partido?.equipo_cbat) {
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
  if (jornadaIndex !== -1 && els.selectorJornada) {
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

  if (els.selectorFecha) {
    els.selectorFecha.value = hoyISO;
  }

  const jornadaIndex = buscarJornadaPorFechaISO(hoyISO);
  if (jornadaIndex !== -1 && els.selectorJornada) {
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

  return jornada.partidos
    .filter((partido) => {
      const coincideEquipo = !state.equipo || partido.equipo_cbat === state.equipo;
      const coincideFecha = !state.fechaISO || normalizarFechaPartido(partido.fecha) === state.fechaISO;
      return coincideEquipo && coincideFecha;
    })
    .sort((a, b) => ordenarPartidosPorFechaHora(a, b));
}

function ordenarPartidosPorFechaHora(partidoA, partidoB) {
  const keyA = `${normalizarFechaPartido(partidoA.fecha)} ${normalizarHora(partidoA.hora)}`;
  const keyB = `${normalizarFechaPartido(partidoB.fecha)} ${normalizarHora(partidoB.hora)}`;
  return keyA.localeCompare(keyB);
}

function normalizarHora(hora) {
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora)) return "99:99";
  const [h, m] = hora.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function renderPartidos(partidos) {
  if (!els.listaPartidos) return;

  els.listaPartidos.innerHTML = "";

  if (!partidos.length) {
    const empty = document.createElement("div");
    empty.className = "partido partido-empty";
    empty.textContent = "No hay partidos para los filtros seleccionados.";
    els.listaPartidos.appendChild(empty);
    return;
  }

  partidos.forEach((partido) => {
    const row = document.createElement("article");
    row.className = "partido";

    row.innerHTML = `
      <div class="col-fecha">${formatearFecha(partido.fecha)}</div>
      <div class="col-partido">${formatearPartido(partido)}</div>
      <div class="col-hora">${partido.hora || "-"}</div>
      <div class="col-pabellon">${partido.pabellon || partido.pista || "-"}</div>
    `;

    els.listaPartidos.appendChild(row);
  });
}

function renderContadores(partidos) {
  if (els.contadorTotal) {
    els.contadorTotal.textContent = String(partidos.length);
  }

  if (els.contadorCasa) {
    els.contadorCasa.textContent = String(partidos.filter((p) => p.condicion === "Casa").length);
  }

  if (els.contadorFuera) {
    els.contadorFuera.textContent = String(partidos.filter((p) => p.condicion === "Fuera").length);
  }
}

function formatearPartido(partido) {
  const equipo = partido.equipo_cbat || "CBAT";
  const rival = partido.rival || "Rival pendiente";

  return partido.condicion === "Casa"
    ? `${equipo} - ${rival}`
    : `${rival} - ${equipo}`;
}

function formatearFecha(fechaStr) {
  const iso = normalizarFechaPartido(fechaStr);
  if (!iso) return fechaStr || "-";

  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function normalizarFechaPartido(fechaStr) {
  if (!fechaStr) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return fechaStr;
  }

  const [dia, mes, anio] = fechaStr.split("/");
  if (!dia || !mes || !anio) return "";

  return `${anio.padStart(4, "0")}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function buscarJornadaPorFechaISO(fechaISO) {
  return state.semanas.findIndex((semana) => {
    const inicio = normalizarFechaPartido(semana.inicio);
    const fin = normalizarFechaPartido(semana.fin);

    if (!inicio || !fin) return false;
    return fechaISO >= inicio && fechaISO <= fin;
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

  let texto = `📅 ${jornada.titulo}\n\n`;
  partidos.forEach((p) => {
    texto += `• ${formatearFecha(p.fecha)} | ${formatearPartido(p)} | ${p.hora || "-"} | ${p.pabellon || p.pista || "-"}\n`;
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

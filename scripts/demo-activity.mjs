// Genera actividad realista en la cuenta demo a través de la API pública, para que
// los reportes y la agenda no se vean congelados en el tiempo.
//
//   node scripts/demo-activity.mjs                 # actividad de hoy
//   DAYS=21 node scripts/demo-activity.mjs         # rellena las últimas 3 semanas
//
// Variables: API_URL, DEMO_EMAIL, DEMO_PASSWORD, DAYS, PER_DAY, RESOLVE_RATIO.

const API_URL = process.env.API_URL ?? 'https://kontrol-api-vo14.onrender.com/api';
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@kontrol.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'KontrolDemo2026';
const DAYS = Number(process.env.DAYS ?? 1);
const PER_DAY = Number(process.env.PER_DAY ?? 2);
const RESOLVE_RATIO = Number(process.env.RESOLVE_RATIO ?? 0.6);

const RESPONSABLES = [
  'Camila Rojas',
  'Matías González',
  'Diego Muñoz',
  'Fernanda Soto',
  'Ignacio Vargas',
  'Javiera Fuentes',
  'Valentina Torres',
];

const OBSERVACIONES = [
  'Se detectó durante la ronda de la mañana.',
  'Reportado por el encargado de turno.',
  'Situación repetida respecto de la inspección anterior.',
  'Evidencia registrada en terreno.',
  'Se informó al supervisor del área.',
];

const ACCIONES = [
  'Corregir de inmediato y reforzar la instrucción al personal del turno.',
  'Solicitar reposición de insumos y verificar stock mínimo semanal.',
  'Programar mantención correctiva con el proveedor.',
  'Capacitar al equipo en el procedimiento vigente y registrar asistencia.',
  'Actualizar la señalética y revisar en la próxima ronda.',
];

let token;

async function api(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Fecha local, no toISOString(): en Chile de noche UTC ya es el día siguiente.
function isoDate(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildAnswer(item, fechaOffset) {
  const roll = Math.random();
  // Los ítems críticos fallan menos: es lo primero que se vigila en terreno.
  const failChance = item.criticidad === 'CRITICO' ? 0.1 : 0.18;

  if (roll < failChance) {
    return {
      templateItemId: item.id,
      estado: 'NO_CUMPLE',
      observacion: pick(OBSERVACIONES),
      planAccion: pick(ACCIONES),
      responsable: pick(RESPONSABLES),
      fechaCompromiso: isoDate(fechaOffset + 3 + Math.floor(Math.random() * 4)),
      fechaControl: isoDate(fechaOffset + 7 + Math.floor(Math.random() * 7)),
    };
  }
  if (roll < failChance + 0.05) {
    return { templateItemId: item.id, estado: 'NO_APLICA' };
  }
  return { templateItemId: item.id, estado: 'CUMPLE' };
}

async function main() {
  ({ accessToken: token } = await api('POST', '/auth/login', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  }));

  const centros = (await api('GET', '/centros')).filter((c) => c.activo);
  const resumenes = (await api('GET', '/plantillas')).filter((p) => p.activo);
  const plantillas = await Promise.all(resumenes.map((p) => api('GET', `/plantillas/${p.id}`)));

  let creadas = 0;
  let hallazgos = 0;

  for (let offset = -(DAYS - 1); offset <= 0; offset++) {
    for (let n = 0; n < PER_DAY; n++) {
      const centro = pick(centros);
      const plantilla = pick(plantillas);
      const fecha = isoDate(offset);

      const inspeccion = await api('POST', '/inspecciones', {
        templateId: plantilla.id,
        centroId: centro.id,
        fecha,
      });
      const answers = plantilla.items.map((item) => buildAnswer(item, offset));
      await api('PUT', `/inspecciones/${inspeccion.id}/respuestas`, { answers });

      creadas++;
      hallazgos += answers.filter((a) => a.estado === 'NO_CUMPLE').length;
      console.log(`${fecha}  ${centro.nombre} · ${plantilla.nombre}`);
    }
  }

  // Cerrar parte de los hallazgos vencidos, como haría un supervisor al revisarlos.
  const abiertos = await api('GET', '/reportes/hallazgos-abiertos');
  const vencidos = abiertos.filter((h) => h.vencido);
  let resueltos = 0;
  for (const h of vencidos) {
    if (Math.random() > RESOLVE_RATIO) continue;
    await api('PATCH', `/inspecciones/${h.inspectionId}/respuestas/${h.templateItemId}/resolver`, {
      resuelto: true,
    });
    resueltos++;
  }

  console.log(
    `\nListo: ${creadas} inspecciones, ${hallazgos} hallazgos nuevos, ${resueltos} de ${vencidos.length} vencidos resueltos.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

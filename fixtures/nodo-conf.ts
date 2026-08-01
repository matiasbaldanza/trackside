/**
 * Nodo Conf — fixture content.
 *
 * A complete two-day programme, invented. The conference, the speakers, their
 * employers and the talks do not exist; the organisations are made up rather
 * than borrowed, so that nothing here can be mistaken for a real company's
 * involvement.
 *
 * The programme is realistic in the ways that matter to this system: parallel
 * rooms, sessions of different lengths, breaks that occupy the grid, a
 * workshop with a capacity, one speaker appearing twice, and a schedule that
 * satisfies its own validation rules.
 *
 * Times are **authored** in the venue's local time and **stored** as UTC.
 * `at(DAY_ONE, "10:45")` can be checked against a printed programme by
 * reading it, where the UTC equivalent cannot — and the helper converts, so
 * that one representation reaches the dataset. Sanity does not normalise
 * datetimes; see the note on `at` below, which is the whole reason it exists.
 *
 * Document ids are stable and derived from slugs, so seeding twice replaces
 * rather than duplicates.
 */

export const VENUE_TIMEZONE = "America/Argentina/Buenos_Aires";
const DAY_ONE = "2026-09-24";
const DAY_TWO = "2026-09-25";

/**
 * Venue-local time, stored as normalised UTC.
 *
 * Written as `at(DAY_ONE, "10:45")` so the source can be checked against a
 * printed programme by reading it, and converted here so that every stored
 * value uses one representation.
 *
 * The conversion is not cosmetic. Sanity persists a datetime exactly as it is
 * given: writing `2026-09-24T10:45:00-03:00` through the API stores that
 * string, while the Studio's own date input writes `Z`-suffixed UTC. A
 * dataset holding both forms compares them lexicographically in GROQ unless
 * every comparison is explicitly cast, so `startsAt < "2026-09-25T00:00:00Z"`
 * would quietly return the wrong sessions. One representation, chosen at the
 * point of writing, removes the class of bug.
 */
const at = (day: string, time: string) => new Date(`${day}T${time}:00-03:00`).toISOString();

interface Doc {
  _id: string;
  _type: string;
  [key: string]: unknown;
}

const ref = (id: string) => ({ _type: "reference", _ref: id });

// --------------------------------------------------------------------------
// Event
// --------------------------------------------------------------------------

export const EVENT_ID = "event";

const event: Doc = {
  _id: EVENT_ID,
  _type: "event",
  name: "Nodo Conf",
  tagline: "Dos días sobre cómo construimos software en la región",
  startDate: DAY_ONE,
  endDate: DAY_TWO,
  timezone: VENUE_TIMEZONE,
  venueName: "Centro Cultural Mercado Norte",
  city: "Buenos Aires",
};

// --------------------------------------------------------------------------
// Rooms
// --------------------------------------------------------------------------

const rooms: Doc[] = [
  {
    _id: "track-auditorio",
    _type: "track",
    name: "Auditorio Principal",
    shortName: "AUD",
    slug: { _type: "slug", current: "auditorio" },
    order: 1,
    capacity: 600,
  },
  {
    _id: "track-norte",
    _type: "track",
    name: "Sala Norte",
    shortName: "NOR",
    slug: { _type: "slug", current: "norte" },
    order: 2,
    capacity: 180,
  },
  {
    _id: "track-sur",
    _type: "track",
    name: "Sala Sur",
    shortName: "SUR",
    slug: { _type: "slug", current: "sur" },
    order: 3,
    capacity: 180,
  },
  {
    _id: "track-laboratorio",
    _type: "track",
    name: "Laboratorio",
    shortName: "LAB",
    slug: { _type: "slug", current: "laboratorio" },
    order: 4,
    capacity: 36,
  },
];

// --------------------------------------------------------------------------
// Speakers
// --------------------------------------------------------------------------

/** Prose biography as a single Portable Text paragraph. */
const bio = (key: string, text: string) => [
  {
    _type: "block",
    _key: `bio-${key}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `bio-${key}-0`, text, marks: [] }],
  },
];

interface SpeakerSeed {
  key: string;
  name: string;
  jobTitle: string;
  organisation: string;
  bio?: string;
}

const speakerSeeds: SpeakerSeed[] = [
  {
    key: "valentina-arce",
    name: "Valentina Arce",
    jobTitle: "Ingeniera de plataforma",
    organisation: "Corriente",
    bio: "Trabaja en infraestructura de datos y pasa más tiempo del que admite leyendo logs de producción.",
  },
  {
    key: "mateo-ferreyra",
    name: "Mateo Ferreyra",
    jobTitle: "Staff Engineer",
    organisation: "Pampa Systems",
    bio: "Escribe sobre sistemas distribuidos y sobre por qué casi nunca hacen falta.",
  },
  {
    key: "julia-benitez",
    name: "Julia Benítez",
    jobTitle: "Head of Engineering",
    organisation: "Ruta Ocho",
    bio: "Lidera equipos de producto y sostiene que la mayoría de los problemas técnicos son problemas de acuerdo.",
  },
  {
    key: "tomas-quiroga",
    name: "Tomás Quiroga",
    jobTitle: "Frontend Engineer",
    organisation: "Mirasol",
    bio: "Construye interfaces accesibles y mantiene una lista pública de sitios que rompen el zoom del navegador.",
  },
  {
    key: "renata-oliveira",
    name: "Renata Oliveira",
    jobTitle: "Principal Engineer",
    organisation: "Barranco Labs",
    bio: "Investiga rendimiento en dispositivos de gama baja, que es donde vive la mayoría de sus usuarios.",
  },
  {
    key: "ignacio-sosa",
    name: "Ignacio Sosa",
    jobTitle: "Database Engineer",
    organisation: "Corriente",
    bio: "Pasó seis años operando Postgres y todavía recomienda empezar con una sola base de datos.",
  },
  {
    key: "camila-duarte",
    name: "Camila Duarte",
    jobTitle: "Security Engineer",
    organisation: "Salto Digital",
    bio: "Hace threat modelling en equipos que no creían necesitarlo.",
  },
  {
    key: "andres-villalba",
    name: "Andrés Villalba",
    jobTitle: "Site Reliability Engineer",
    organisation: "Pampa Systems",
  },
  {
    key: "sofia-marchetti",
    name: "Sofía Marchetti",
    jobTitle: "Design Engineer",
    organisation: "Mirasol",
    bio: "Trabaja en el borde entre diseño e implementación, y sostiene que ese borde no debería existir.",
  },
  {
    key: "lucas-peralta",
    name: "Lucas Peralta",
    jobTitle: "Engineering Manager",
    organisation: "Ruta Ocho",
    bio: "Escribe sobre procesos de revisión de código y sobre cómo casi todos se rompen al crecer.",
  },
  {
    key: "paula-crespo",
    name: "Paula Crespo",
    jobTitle: "Accessibility Specialist",
    organisation: "Fundación Alcance",
    bio: "Audita productos digitales y entrena equipos para que dejen de necesitar auditorías.",
  },
  {
    key: "diego-monteiro",
    name: "Diego Monteiro",
    jobTitle: "Platform Lead",
    organisation: "Barranco Labs",
  },
  {
    key: "florencia-ibarra",
    name: "Florencia Ibarra",
    jobTitle: "Data Engineer",
    organisation: "Salto Digital",
    bio: "Construye pipelines y colecciona ejemplos de tableros que nadie mira.",
  },
  {
    key: "nicolas-aguirre",
    name: "Nicolás Aguirre",
    jobTitle: "Compiler Engineer",
    organisation: "Universidad del Litoral",
    bio: "Enseña compiladores y mantiene un intérprete de juguete que ya tiene más usuarios que alumnos.",
  },
  {
    key: "martina-rojas",
    name: "Martina Rojas",
    jobTitle: "Product Engineer",
    organisation: "Corriente",
  },
  {
    key: "gabriel-esposito",
    name: "Gabriel Espósito",
    jobTitle: "Mobile Engineer",
    organisation: "Mirasol",
    bio: "Trabaja en aplicaciones que tienen que funcionar sin conexión, porque a menudo no la hay.",
  },
  {
    key: "carolina-nunez",
    name: "Carolina Núñez",
    jobTitle: "CTO",
    organisation: "Ruta Ocho",
    bio: "Fundó dos empresas y aprendió en la segunda a escribir menos código.",
  },
  {
    key: "javier-ledesma",
    name: "Javier Ledesma",
    jobTitle: "Open Source Maintainer",
    organisation: "Independiente",
    bio: "Mantiene una biblioteca de la que depende bastante gente y a la que contribuye bastante poca.",
  },
];

const speakers: Doc[] = speakerSeeds.map((s) => ({
  _id: `speaker-${s.key}`,
  _type: "speaker",
  name: s.name,
  slug: { _type: "slug", current: s.key },
  jobTitle: s.jobTitle,
  organisation: s.organisation,
  ...(s.bio ? { bio: bio(s.key, s.bio) } : {}),
}));

const speakerRef = (key: string, index: number) => ({
  ...ref(`speaker-${key}`),
  _key: `spk-${key}-${index}`,
});

// --------------------------------------------------------------------------
// Sessions
// --------------------------------------------------------------------------

interface SessionSeed {
  key: string;
  title: string;
  type: "talk" | "keynote" | "workshop" | "panel" | "break" | "registration";
  room: string;
  day: string;
  start: string;
  minutes: number;
  speakers?: string[];
  abstract?: string;
  language?: "es" | "en";
  level?: "intro" | "intermediate" | "advanced";
  capacity?: number;
  signupUrl?: string;
  recorded?: boolean;
  captioned?: boolean;
}

const sessionSeeds: SessionSeed[] = [
  // ---------------------------- Day one ----------------------------
  {
    key: "acreditacion-dia-1",
    title: "Acreditación y café",
    type: "registration",
    room: "auditorio",
    day: DAY_ONE,
    start: "08:30",
    minutes: 60,
  },
  {
    key: "apertura-nodo",
    title: "Lo que construimos cuando nadie mira",
    type: "keynote",
    room: "auditorio",
    day: DAY_ONE,
    start: "09:30",
    minutes: 45,
    speakers: ["carolina-nunez"],
    abstract:
      "La mayor parte del software que sostiene a nuestras organizaciones no se presenta en conferencias: scripts internos, herramientas de operaciones, tableros que sólo usa un equipo. Una apertura sobre por qué ese trabajo decide la velocidad de todo lo demás.",
    language: "es",
    recorded: true,
    captioned: true,
  },
  {
    key: "pausa-manana-dia-1",
    title: "Pausa",
    type: "break",
    room: "auditorio",
    day: DAY_ONE,
    start: "10:15",
    minutes: 30,
  },
  {
    key: "postgres-antes-de-escalar",
    title: "Postgres hasta que duela, y recién ahí escalar",
    type: "talk",
    room: "auditorio",
    day: DAY_ONE,
    start: "10:45",
    minutes: 40,
    speakers: ["ignacio-sosa"],
    abstract:
      "Un recorrido por lo que una sola base de datos aguanta antes de necesitar réplicas, particiones o un sistema distribuido: índices que faltan, consultas que nadie midió y el momento real en que conviene cambiar de estrategia.",
    language: "es",
    level: "intermediate",
    recorded: true,
    captioned: true,
  },
  {
    key: "interfaces-que-no-se-rompen",
    title: "Interfaces que no se rompen al hacer zoom",
    type: "talk",
    room: "norte",
    day: DAY_ONE,
    start: "10:45",
    minutes: 40,
    speakers: ["tomas-quiroga"],
    abstract:
      "El zoom del navegador es la tecnología asistiva más usada y la que más seguido rompemos. Qué falla concretamente al 200%, por qué los diseños con alturas fijas son el problema, y cómo detectarlo antes de publicar.",
    language: "es",
    level: "intro",
    recorded: true,
    captioned: true,
  },
  {
    key: "gama-baja",
    title: "Rendimiento en los teléfonos que la gente realmente tiene",
    type: "talk",
    room: "sur",
    day: DAY_ONE,
    start: "10:45",
    minutes: 40,
    speakers: ["renata-oliveira"],
    abstract:
      "Medimos en equipos de desarrollo y publicamos para dispositivos de gama baja con conexiones intermitentes. Cómo armar un presupuesto de rendimiento a partir de los dispositivos de tus usuarios y no de los tuyos.",
    language: "es",
    level: "intermediate",
    recorded: true,
  },
  {
    key: "taller-observabilidad",
    title: "Taller: observabilidad sin comprar nada",
    type: "workshop",
    room: "laboratorio",
    day: DAY_ONE,
    start: "10:45",
    minutes: 120,
    speakers: ["andres-villalba", "florencia-ibarra"],
    abstract:
      "Instrumentar una aplicación desde cero con herramientas abiertas: trazas, métricas y logs correlacionados. Traer una computadora portátil con Docker instalado.",
    language: "es",
    level: "intermediate",
    capacity: 36,
    signupUrl: "https://nodoconf.example/talleres/observabilidad",
  },
  {
    key: "revisiones-de-codigo",
    title: "Las revisiones de código se rompen a los quince",
    type: "talk",
    room: "auditorio",
    day: DAY_ONE,
    start: "11:35",
    minutes: 40,
    speakers: ["lucas-peralta"],
    abstract:
      "Un proceso de revisión que funciona con cinco personas suele fallar con quince, y el modo de falla es siempre el mismo: la revisión se vuelve un trámite. Qué cambiar antes de que pase.",
    language: "es",
    level: "intermediate",
    recorded: true,
    captioned: true,
  },
  {
    key: "modelar-contenido",
    title: "Modelar contenido es modelar el trabajo de otra persona",
    type: "talk",
    room: "norte",
    day: DAY_ONE,
    start: "11:35",
    minutes: 40,
    speakers: ["sofia-marchetti"],
    abstract:
      "Cada decisión de modelado del contenido se convierte en una tarea diaria para alguien del equipo editorial. Un caso concreto donde cambiar el modelo eliminó una hora de trabajo manual por publicación.",
    language: "es",
    level: "intermediate",
    recorded: true,
  },
  {
    key: "threat-modelling",
    title: "Threat modelling para equipos que creen no necesitarlo",
    type: "talk",
    room: "sur",
    day: DAY_ONE,
    start: "11:35",
    minutes: 40,
    speakers: ["camila-duarte"],
    abstract:
      "Una sesión de modelado de amenazas de cuarenta minutos, hecha en vivo sobre una aplicación común, sin herramientas ni formularios.",
    language: "es",
    level: "intro",
    recorded: true,
  },
  {
    key: "almuerzo-dia-1",
    title: "Almuerzo",
    type: "break",
    room: "auditorio",
    day: DAY_ONE,
    start: "12:15",
    minutes: 90,
  },
  {
    key: "offline-first",
    title: "Offline no es un caso borde",
    type: "talk",
    room: "auditorio",
    day: DAY_ONE,
    start: "13:45",
    minutes: 40,
    speakers: ["gabriel-esposito"],
    abstract:
      "Diseñar para conectividad intermitente cambia el modelo de datos, no sólo la capa de red. Qué implica sincronizar, resolver conflictos y explicarle al usuario qué está pasando.",
    language: "es",
    level: "advanced",
    recorded: true,
  },
  {
    key: "auditar-accesibilidad",
    title: "Auditar hasta que no haga falta auditar",
    type: "talk",
    room: "norte",
    day: DAY_ONE,
    start: "13:45",
    minutes: 40,
    speakers: ["paula-crespo"],
    abstract:
      "Las auditorías de accesibilidad encuentran los mismos problemas una y otra vez. Cómo convertir los hallazgos en cambios de proceso para que el equipo deje de reproducirlos.",
    language: "es",
    level: "intro",
    recorded: true,
    captioned: true,
  },
  {
    key: "pipelines-que-nadie-mira",
    title: "El tablero que nadie mira",
    type: "talk",
    room: "sur",
    day: DAY_ONE,
    start: "13:45",
    minutes: 40,
    speakers: ["florencia-ibarra"],
    abstract:
      "Construimos pipelines de datos para responder preguntas y terminamos manteniendo tableros que ya nadie consulta. Cómo decidir qué apagar.",
    language: "es",
    level: "intermediate",
  },
  {
    key: "panel-plataformas",
    title: "Panel: equipos de plataforma en organizaciones chicas",
    type: "panel",
    room: "auditorio",
    day: DAY_ONE,
    start: "14:35",
    minutes: 60,
    speakers: ["julia-benitez", "diego-monteiro", "valentina-arce", "mateo-ferreyra"],
    abstract:
      "Cuándo un equipo de plataforma resuelve más de lo que cuesta, y qué pasa cuando se arma demasiado pronto. Modera Julia Benítez.",
    language: "es",
    recorded: true,
    captioned: true,
  },

  // ---------------------------- Day two ----------------------------
  {
    key: "acreditacion-dia-2",
    title: "Acreditación",
    type: "registration",
    room: "auditorio",
    day: DAY_TWO,
    start: "09:00",
    minutes: 30,
  },
  {
    key: "keynote-mantenimiento",
    title: "Maintaining what nobody funds",
    type: "keynote",
    room: "auditorio",
    day: DAY_TWO,
    start: "09:30",
    minutes: 45,
    speakers: ["javier-ledesma"],
    abstract:
      "A talk about the economics of open source maintenance, from someone maintaining a library with far more dependents than contributors. What sustainable maintenance actually looks like, and what it costs.",
    language: "en",
    recorded: true,
    captioned: true,
  },
  {
    key: "pausa-manana-dia-2",
    title: "Pausa",
    type: "break",
    room: "auditorio",
    day: DAY_TWO,
    start: "10:15",
    minutes: 30,
  },
  {
    key: "compiladores-de-juguete",
    title: "Un compilador de juguete y lo que enseña",
    type: "talk",
    room: "auditorio",
    day: DAY_TWO,
    start: "10:45",
    minutes: 40,
    speakers: ["nicolas-aguirre"],
    abstract:
      "Escribir un intérprete pequeño cambia cómo se lee el código de todos los días. Un recorrido por las partes que valen la pena y las que se pueden saltear.",
    language: "es",
    level: "intermediate",
    recorded: true,
  },
  {
    key: "sistemas-distribuidos-innecesarios",
    title: "El sistema distribuido que no hacía falta",
    type: "talk",
    room: "norte",
    day: DAY_TWO,
    start: "10:45",
    minutes: 40,
    speakers: ["mateo-ferreyra"],
    abstract:
      "Una migración a microservicios que se revirtió, contada con las mediciones que la motivaron y las que finalmente la desmintieron.",
    language: "es",
    level: "advanced",
    recorded: true,
  },
  {
    key: "producto-y-deuda",
    title: "Negociar deuda técnica sin usar la palabra deuda",
    type: "talk",
    room: "sur",
    day: DAY_TWO,
    start: "10:45",
    minutes: 40,
    speakers: ["martina-rojas"],
    abstract:
      "La metáfora de la deuda no convence a nadie fuera del equipo técnico. Qué sí funciona para priorizar trabajo de mantenimiento junto al resto.",
    language: "es",
    level: "intro",
  },
  {
    key: "taller-accesibilidad",
    title: "Taller: probar con lector de pantalla",
    type: "workshop",
    room: "laboratorio",
    day: DAY_TWO,
    start: "10:45",
    minutes: 120,
    speakers: ["paula-crespo", "tomas-quiroga"],
    abstract:
      "Aprender a recorrer una aplicación con lector de pantalla, encontrar los problemas reales y priorizarlos. Traer auriculares.",
    language: "es",
    level: "intro",
    capacity: 24,
    signupUrl: "https://nodoconf.example/talleres/lector-de-pantalla",
  },
  {
    key: "seguridad-en-el-pipeline",
    title: "Seguridad en el pipeline sin frenar el pipeline",
    type: "talk",
    room: "auditorio",
    day: DAY_TWO,
    start: "11:35",
    minutes: 40,
    speakers: ["camila-duarte"],
    abstract:
      "Análisis estático, dependencias y secretos: qué conviene bloquear en integración continua y qué conviene sólo reportar, según cuánto cuesta cada falso positivo.",
    language: "es",
    level: "intermediate",
    recorded: true,
  },
  {
    key: "datos-en-el-borde",
    title: "Datos cerca del usuario",
    type: "talk",
    room: "norte",
    day: DAY_TWO,
    start: "11:35",
    minutes: 40,
    speakers: ["valentina-arce"],
    abstract:
      "Réplicas de lectura, caché e invalidación por etiquetas, contado desde una migración concreta y sus mediciones antes y después.",
    language: "es",
    level: "advanced",
    recorded: true,
  },
  {
    key: "almuerzo-dia-2",
    title: "Almuerzo",
    type: "break",
    room: "auditorio",
    day: DAY_TWO,
    start: "12:15",
    minutes: 90,
  },
  {
    key: "cierre-nodo",
    title: "Cierre: qué nos llevamos",
    type: "panel",
    room: "auditorio",
    day: DAY_TWO,
    start: "13:45",
    minutes: 45,
    speakers: ["carolina-nunez", "julia-benitez", "renata-oliveira"],
    abstract: "Una conversación de cierre sobre lo que se discutió en los dos días.",
    language: "es",
    recorded: true,
    captioned: true,
  },
];

const sessions: Doc[] = sessionSeeds.map((s) => ({
  _id: `session-${s.key}`,
  _type: "session",
  title: s.title,
  slug: { _type: "slug", current: s.key },
  type: s.type,
  track: ref(`track-${s.room}`),
  startsAt: at(s.day, s.start),
  durationMinutes: s.minutes,
  ...(s.abstract ? { abstract: s.abstract } : {}),
  ...(s.speakers ? { speakers: s.speakers.map(speakerRef) } : {}),
  ...(s.language ? { language: s.language } : {}),
  ...(s.level ? { level: s.level } : {}),
  ...(s.capacity ? { capacity: s.capacity } : {}),
  ...(s.signupUrl ? { signupUrl: s.signupUrl } : {}),
  recorded: s.recorded ?? false,
  captioned: s.captioned ?? false,
  // Every session starts on time. The programme is what was planned; live
  // status is what happens to it.
  liveStatus: { _type: "liveStatus", state: "onTime" },
}));

/**
 * Every fixture document, ordered so that references resolve as they are
 * written: rooms and speakers before the sessions that point at them.
 */
export const fixtureDocuments: Doc[] = [event, ...rooms, ...speakers, ...sessions];

export const fixtureSummary = {
  event: 1,
  rooms: rooms.length,
  speakers: speakers.length,
  sessions: sessions.length,
};

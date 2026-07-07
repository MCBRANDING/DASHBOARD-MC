exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Faltan NOTION_TOKEN o NOTION_DATABASE_ID en las variables de entorno de Netlify." }) };
  }

  try {
    const entry = JSON.parse(event.body);

    const properties = {
      "Nombre de tarea": { title: [{ text: { content: entry.nombre || "Sin nombre" } }] },
      Cliente: { select: { name: entry.cliente } },
      "Tipo de tarea": { select: { name: entry.tipo } },
      "Solicitado por": { select: { name: entry.solicitadoPor } },
      Responsable: { select: { name: entry.responsable } },
      Prioridad: { select: { name: entry.prioridad } },
      Estado: { status: { name: "Sin empezar" } },
      Visibilidad: { select: { name: entry.visibilidad || "Activa" } },
      Origen: { select: { name: "Formulario" } },
      "Horas estimadas": { number: Number(entry.horas) || 0 },
      "Descripción / Objetivo": { rich_text: [{ text: { content: entry.descripcion || "" } }] },
      "Recursos necesarios": entry.recursos ? { url: entry.recursos } : { url: null },
      "Formato de entrega": { rich_text: [{ text: { content: entry.formato || "" } }] },
      "Copy de publicación": { rich_text: [{ text: { content: entry.copy || "" } }] },
    };
    if (entry.fechaLimite) {
      properties["Fecha límite"] = { date: { start: entry.fechaLimite } };
    }

    const resp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

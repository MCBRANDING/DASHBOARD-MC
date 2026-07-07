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
  if (!NOTION_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Falta NOTION_TOKEN en las variables de entorno de Netlify." }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { id, fields } = body;
    if (!id || !fields) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Se requiere 'id' y 'fields'." }) };
    }

    const properties = {};
    if (fields.nombre !== undefined) properties["Nombre de tarea"] = { title: [{ text: { content: fields.nombre || "Sin nombre" } }] };
    if (fields.cliente !== undefined) properties["Cliente"] = { select: { name: fields.cliente } };
    if (fields.tipo !== undefined) properties["Tipo de tarea"] = { select: { name: fields.tipo } };
    if (fields.solicitadoPor !== undefined) properties["Solicitado por"] = { select: { name: fields.solicitadoPor } };
    if (fields.responsable !== undefined) properties["Responsable"] = { select: { name: fields.responsable } };
    if (fields.prioridad !== undefined) properties["Prioridad"] = { select: { name: fields.prioridad } };
    if (fields.estado !== undefined) properties["Estado"] = { status: { name: fields.estado } };
    if (fields.visibilidad !== undefined) properties["Visibilidad"] = { select: { name: fields.visibilidad } };
    if (fields.horas !== undefined) properties["Horas estimadas"] = { number: Number(fields.horas) || 0 };
    if (fields.descripcion !== undefined) properties["Descripción / Objetivo"] = { rich_text: [{ text: { content: fields.descripcion || "" } }] };
    if (fields.recursos !== undefined) properties["Recursos necesarios"] = fields.recursos ? { url: fields.recursos } : { url: null };
    if (fields.formato !== undefined) properties["Formato de entrega"] = { rich_text: [{ text: { content: fields.formato || "" } }] };
    if (fields.copy !== undefined) properties["Copy de publicación"] = { rich_text: [{ text: { content: fields.copy || "" } }] };
    if (fields.fechaLimite !== undefined) properties["Fecha límite"] = fields.fechaLimite ? { date: { start: fields.fechaLimite } } : { date: null };

    const resp = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

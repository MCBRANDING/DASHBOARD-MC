const COBRANZAS_ID = "5cb8e32b-a67d-4b09-a98f-5d72d34210d7";
const GASTOS_ID = "0bf8d7e4-f252-4e28-88dd-e45906d741a8";

function buildCobranzaProperties(fields, partial){
  const properties = {};
  const set = (key, val) => { if (!partial || fields[key] !== undefined) properties[key] = val; };
  if (!partial || fields.cliente !== undefined) properties["Cliente"] = { title: [{ text: { content: fields.cliente || "Sin nombre" } }] };
  if (!partial || fields.fechaCobro !== undefined) properties["Fecha de cobro"] = fields.fechaCobro ? { date: { start: fields.fechaCobro } } : { date: null };
  if (!partial || fields.fechaPago !== undefined) properties["Fecha de pago"] = fields.fechaPago ? { date: { start: fields.fechaPago } } : { date: null };
  if (!partial || fields.formaPago !== undefined) properties["Forma de pago"] = fields.formaPago ? { select: { name: fields.formaPago } } : { select: null };
  if (!partial || fields.monto !== undefined) properties["Monto"] = { number: Number(fields.monto) || 0 };
  if (!partial || fields.observacion !== undefined) properties["Observación"] = { rich_text: [{ text: { content: fields.observacion || "" } }] };
  if (!partial || fields.numeroInvoice !== undefined) properties["N Invoice"] = { rich_text: [{ text: { content: fields.numeroInvoice || "" } }] };
  if (!partial || fields.descripcionServicio !== undefined) properties["Descripción del servicio"] = { rich_text: [{ text: { content: fields.descripcionServicio || "" } }] };
  if (!partial || fields.metodoPago !== undefined) properties["Método de pago"] = { rich_text: [{ text: { content: fields.metodoPago || "" } }] };
  if (!partial || fields.cuentaPago !== undefined) properties["Cuenta de pago"] = { rich_text: [{ text: { content: fields.cuentaPago || "" } }] };
  if (!partial || fields.cuotasJson !== undefined) properties["Cuotas JSON"] = { rich_text: [{ text: { content: fields.cuotasJson || "" } }] };
  return properties;
}

function buildGastoProperties(fields, partial){
  const properties = {};
  if (!partial || fields.descripcion !== undefined) properties["Descripción"] = { title: [{ text: { content: fields.descripcion || "Sin descripción" } }] };
  if (!partial || fields.fecha !== undefined) properties["Fecha"] = fields.fecha ? { date: { start: fields.fecha } } : { date: null };
  if (!partial || fields.monto !== undefined) properties["Monto"] = { number: Number(fields.monto) || 0 };
  if (!partial || fields.tipo !== undefined) properties["Tipo"] = fields.tipo ? { select: { name: fields.tipo } } : { select: null };
  return properties;
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  if (!NOTION_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Falta NOTION_TOKEN en las variables de entorno de Netlify." }) };
  }

  try {
    const { kind, action, id, fields } = JSON.parse(event.body);
    if (!kind || !action) return { statusCode: 400, headers, body: JSON.stringify({ error: "Se requiere 'kind' y 'action'." }) };

    const notionHeaders = {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    if (action === "delete"){
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Se requiere 'id' para eliminar." }) };
      const resp = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: "PATCH", headers: notionHeaders, body: JSON.stringify({ archived: true }),
      });
      const data = await resp.json();
      if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const buildProps = kind === "cobranza" ? buildCobranzaProperties : buildGastoProperties;
    const databaseId = kind === "cobranza" ? COBRANZAS_ID : GASTOS_ID;

    if (action === "create"){
      const properties = buildProps(fields || {}, false);
      const resp = await fetch("https://api.notion.com/v1/pages", {
        method: "POST", headers: notionHeaders,
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      });
      const data = await resp.json();
      if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: data.id }) };
    }

    if (action === "update"){
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Se requiere 'id' para actualizar." }) };
      const properties = buildProps(fields || {}, true);
      const resp = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: "PATCH", headers: notionHeaders, body: JSON.stringify({ properties }),
      });
      const data = await resp.json();
      if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Acción no reconocida." }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

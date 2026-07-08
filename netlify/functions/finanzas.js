const COBRANZAS_ID = "5cb8e32b-a67d-4b09-a98f-5d72d34210d7";
const GASTOS_ID = "0bf8d7e4-f252-4e28-88dd-e45906d741a8";

async function queryAll(databaseId, token){
  let all = [];
  let cursor = undefined;
  let hasMore = true;
  while (hasMore){
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    all = all.concat(data.results);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  return all;
}

exports.handler = async function () {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  if (!NOTION_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Falta NOTION_TOKEN en las variables de entorno de Netlify." }) };
  }

  try {
    const [cobranzasRaw, gastosRaw] = await Promise.all([
      queryAll(COBRANZAS_ID, NOTION_TOKEN),
      queryAll(GASTOS_ID, NOTION_TOKEN),
    ]);

    const cobranzas = cobranzasRaw.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        cliente: p["Cliente"]?.title?.[0]?.plain_text || "",
        fechaCobro: p["Fecha de cobro"]?.date?.start || "",
        fechaPago: p["Fecha de pago"]?.date?.start || "",
        formaPago: p["Forma de pago"]?.select?.name || "",
        monto: p["Monto"]?.number || 0,
        observacion: p["Observación"]?.rich_text?.[0]?.plain_text || "",
        numeroInvoice: p["N Invoice"]?.rich_text?.[0]?.plain_text || "",
        descripcionServicio: p["Descripción del servicio"]?.rich_text?.[0]?.plain_text || "",
        metodoPago: p["Método de pago"]?.rich_text?.[0]?.plain_text || "",
        cuentaPago: p["Cuenta de pago"]?.rich_text?.[0]?.plain_text || "",
        cuotasJson: p["Cuotas JSON"]?.rich_text?.[0]?.plain_text || "",
      };
    });

    const gastos = gastosRaw.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        descripcion: p["Descripción"]?.title?.[0]?.plain_text || "",
        fecha: p["Fecha"]?.date?.start || "",
        monto: p["Monto"]?.number || 0,
        tipo: p["Tipo"]?.select?.name || "",
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify({ cobranzas, gastos }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

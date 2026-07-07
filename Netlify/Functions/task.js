exports.handler = async function () {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Faltan NOTION_TOKEN o NOTION_DATABASE_ID en las variables de entorno de Netlify." }) };
  }

  try {
    let allResults = [];
    let cursor = undefined;
    let hasMore = true;

    while (hasMore) {
      const body = { sorts: [{ property: "Fecha límite", direction: "ascending" }], page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const resp = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return { statusCode: resp.status, headers, body: JSON.stringify({ error: data }) };
      }

      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    const tasks = allResults.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        nombre: p["Nombre de tarea"]?.title?.[0]?.plain_text || "",
        cliente: p["Cliente"]?.select?.name || "",
        tipo: p["Tipo de tarea"]?.select?.name || "",
        solicitadoPor: p["Solicitado por"]?.select?.name || "",
        responsable: p["Responsable"]?.select?.name || "",
        prioridad: p["Prioridad"]?.select?.name || "",
        estado: p["Estado"]?.status?.name || "",
        visibilidad: p["Visibilidad"]?.select?.name || "Activa",
        horas: p["Horas estimadas"]?.number || 0,
        fechaLimite: p["Fecha límite"]?.date?.start || "",
        descripcion: p["Descripción / Objetivo"]?.rich_text?.[0]?.plain_text || "",
        recursos: p["Recursos necesarios"]?.url || "",
        formato: p["Formato de entrega"]?.rich_text?.[0]?.plain_text || "",
        copy: p["Copy de publicación"]?.rich_text?.[0]?.plain_text || "",
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify(tasks) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

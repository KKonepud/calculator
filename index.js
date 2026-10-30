const http = require("http");

const operations = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

// Тіло запиту приходить частинами (потоком) — збираємо його і перетворюємо з JSON в об'єкт
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Некоректний JSON у тілі запиту"));
      }
    });
  });
}

// Функція-обробник: викликається на кожен HTTP-запит
async function calculator(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // GET — перевірка, що функція працює
  if (req.method === "GET") {
    const name = url.searchParams.get("name") || "гість";
    return sendJson(res, 200, {
      message: `Привіт, ${name}!`,
      time: new Date().toISOString(),
      usage: 'POST {"a": 10, "b": 5, "op": "add | sub | mul | div"}',
    });
  }

  // POST — калькулятор: приймає JSON з числами та операцією
  if (req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }

    const { a, b, op } = body;

    if (typeof a !== "number" || typeof b !== "number") {
      return sendJson(res, 400, { error: "Поля a і b мають бути числами" });
    }
    if (!operations[op]) {
      return sendJson(res, 400, {
        error: "Поле op має бути одним із: add, sub, mul, div",
      });
    }
    if (op === "div" && b === 0) {
      return sendJson(res, 400, { error: "Ділення на нуль" });
    }

    return sendJson(res, 200, { a, b, op, result: operations[op](a, b) });
  }

  // Інші методи (PUT, DELETE...) не підтримуються
  res.setHeader("Allow", "GET, POST");
  return sendJson(res, 405, { error: `Метод ${req.method} не підтримується` });
}

// Порт задає хостинг (Render передає його у змінній PORT); локально — 8080
const PORT = process.env.PORT || 8080;

http.createServer(calculator).listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

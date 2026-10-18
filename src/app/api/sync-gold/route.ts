import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const BRS_API_KEY = process.env.BRS_API_KEY || "";

const POCKETBASE_URL =
  process.env.POCKETBASE_URL || "http://127.0.0.1:8090";

const POCKETBASE_ADMIN_EMAIL =
  process.env.POCKETBASE_ADMIN_EMAIL || "";

const POCKETBASE_ADMIN_PASSWORD =
  process.env.POCKETBASE_ADMIN_PASSWORD || "";

const BRS_API_URL =
  "https://api.brsapi.ir/Market/Gold_Currency.php";


type BrsItem = {
  symbol?: string;
  name?: string;
  name_en?: string;
  price?: number | string;
  change_value?: number | string;
  change_percent?: number | string;
  unit?: string;
  sign?: string;
  date?: string;
  time?: string;
  time_unix?: number | string;
  [key: string]: unknown;
};

type BrsResponse = {
  successful?: boolean;
  code_http?: number;
  message_error?: string;
  gold?: BrsItem[];
  currency?: BrsItem[];
  cryptocurrency?: BrsItem[];
  [key: string]: unknown;
};

type SyncResult = {
  action: "created" | "updated" | "skipped";
  symbol: string;
  id?: string;
  price?: number;
  change?: number;
  error?: string;
};

/* =========================================================
   Constants
========================================================= */

/**
 * فقط این نمادها مربوط به نرخ‌هایی هستند که از بخش gold
 * سرویس BRS دریافت می‌کنیم.
 */
const GOLD_SYMBOLS = new Set([
  "IR_GOLD_18K",
  "IR_GOLD_24K",
  "IR_GOLD_MELTED",
  "XAUUSD",
  "IR_COIN_EMAMI",
  "IR_COIN_BAHAR",
  "IR_COIN_HALF",
  "IR_COIN_QUARTER",
  "IR_COIN_1G",
]);

/**
 * User-Agent کامل مرورگر.
 * BRS با User-Agent ساده مثل Mozilla/5.0 پاسخ 403 می‌دهد.
 */
const BRS_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/* =========================================================
   Utilities
========================================================= */

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/,/g, "")
      .replace(/٬/g, "")
      .replace(/٫/g, ".")
      .trim();

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getPersianDate(): string {
  return new Date().toLocaleDateString("fa-IR");
}

function getPersianTime(): string {
  return new Date().toLocaleTimeString("fa-IR");
}

function escapePocketBaseFilterValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

/**
 * استخراج فقط آرایه gold از پاسخ BRS
 */
function extractGoldItems(data: BrsResponse): BrsItem[] {
  if (!Array.isArray(data.gold)) {
    return [];
  }

  return data.gold.filter((item) => {
    const symbol = String(item.symbol || "").trim();

    return GOLD_SYMBOLS.has(symbol);
  });
}

/* =========================================================
   HTTPS GET
========================================================= */

function httpsGetText(
  urlString: string,
  timeoutMs: number
): Promise<{
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        family: 4,
        timeout: timeoutMs,

        headers: {
          Accept: "application/json, text/plain, */*",

          "Accept-Language":
            "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",

          "User-Agent": BRS_USER_AGENT,

          Connection: "close",
        },
      },

      (res) => {
        let body = "";

        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          body += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        new Error(
          `درخواست BRS بعد از ${timeoutMs}ms متوقف شد.`
        )
      );
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

/* =========================================================
   BRS API
========================================================= */

async function fetchFromBrsApi(): Promise<BrsItem[]> {
  if (!BRS_API_KEY) {
    throw new Error(
      "BRS_API_KEY در فایل .env.local تنظیم نشده است."
    );
  }

  const apiUrl = new URL(BRS_API_URL);

  apiUrl.searchParams.set("key", BRS_API_KEY);

  console.log("در حال دریافت نرخ طلا از BRS API...");

  const apiResult = await httpsGetText(
    apiUrl.toString(),
    15000
  );

  console.log(
    `BRS API status: ${apiResult.statusCode}`
  );

  /* -------------------------------------------------------
     HTTP Error
  ------------------------------------------------------- */

  if (apiResult.statusCode !== 200) {
    let message = `BRS API با وضعیت ${apiResult.statusCode} پاسخ داد.`;

    try {
      const errorData = JSON.parse(
        apiResult.body
      ) as BrsResponse;

      if (errorData.message_error) {
        message += ` ${errorData.message_error}`;
      }
    } catch {
      // JSON error response نبود؛ همان پیام اصلی کافی است.
    }

    throw new Error(message);
  }

  /* -------------------------------------------------------
     JSON Parse
  ------------------------------------------------------- */

  let data: BrsResponse;

  try {
    data = JSON.parse(
      apiResult.body
    ) as BrsResponse;
  } catch {
    throw new Error(
      "پاسخ BRS API معتبر نیست و JSON قابل خواندن نیست."
    );
  }

  /* -------------------------------------------------------
     API-level Error
  ------------------------------------------------------- */

  if (data.successful === false) {
    throw new Error(
      data.message_error ||
        "BRS API درخواست را ناموفق اعلام کرد."
    );
  }

  /* -------------------------------------------------------
     Extract Gold
  ------------------------------------------------------- */

  const goldItems = extractGoldItems(data);

  if (goldItems.length === 0) {
    throw new Error(
      "در پاسخ BRS هیچ نرخ معتبر طلا پیدا نشد."
    );
  }

  console.log(
    `تعداد نرخ‌های دریافت‌شده از BRS: ${goldItems.length}`
  );

  return goldItems;
}

/* =========================================================
   GET /api/sync-gold
========================================================= */

export async function GET() {
  let source = "brsapi";

  try {
    /* =====================================================
       1. دریافت نرخ مستقیم از BRS
    ===================================================== */

    const items = await fetchFromBrsApi();

    /* =====================================================
       2. اتصال به PocketBase
    ===================================================== */

    if (
      !POCKETBASE_ADMIN_EMAIL ||
      !POCKETBASE_ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          success: false,
          source,
          error:
            "اطلاعات Superuser PocketBase در .env.local تنظیم نشده است. متغیرهای POCKETBASE_ADMIN_EMAIL و POCKETBASE_ADMIN_PASSWORD را بررسی کنید.",
        },
        {
          status: 500,
        }
      );
    }

    const pb = new PocketBase(
      POCKETBASE_URL
    );

    /* =====================================================
       3. ورود Superuser
    ===================================================== */

    await pb.admins.authWithPassword(
      POCKETBASE_ADMIN_EMAIL,
      POCKETBASE_ADMIN_PASSWORD
    );

    console.log(
      "اتصال Superuser به PocketBase موفق بود."
    );

    /* =====================================================
       4. Sync
    ===================================================== */

    const results: SyncResult[] = [];

    for (const item of items) {
      const symbol = String(
        item.symbol || ""
      ).trim();

      /* ---------------------------------------------------
         Symbol validation
      --------------------------------------------------- */

      if (!symbol) {
        results.push({
          action: "skipped",
          symbol: "",
          error: "نماد نرخ خالی است.",
        });

        continue;
      }

      /* ---------------------------------------------------
         Price
      --------------------------------------------------- */

      const price = toNumber(
        item.price
      );

      if (price <= 0) {
        results.push({
          action: "skipped",
          symbol,
          error:
            "قیمت معتبر برای این نرخ دریافت نشد.",
        });

        continue;
      }

      /* ---------------------------------------------------
         Date / Time
      --------------------------------------------------- */

      const marketDate = String(
        item.date || getPersianDate()
      );

      const marketTime = String(
        item.time || getPersianTime()
      );

      const timeUnix =
        toNumber(item.time_unix) ||
        Math.floor(Date.now() / 1000);

      /* ---------------------------------------------------
         Change
      --------------------------------------------------- */

      const changeValue = toNumber(
        item.change_value
      );

      const changePercent = toNumber(
        item.change_percent
      );

      /* ---------------------------------------------------
         Sign
      --------------------------------------------------- */

      let sign = String(
        item.sign || ""
      ).trim();

      if (!sign) {
        if (changePercent > 0) {
          sign = "+";
        } else if (changePercent < 0) {
          sign = "-";
        } else {
          sign = "";
        }
      }

      /* ---------------------------------------------------
         PocketBase record
      --------------------------------------------------- */

      const recordData = {
        symbol,

        name: String(
          item.name ||
            item.name_en ||
            symbol
        ),

        price,

        change_value: changeValue,

        change_percent: changePercent,

        unit: String(
          item.unit || "تومان"
        ),

        sign,

        source: "brsapi",

        market_date: marketDate,

        market_time: marketTime,

        time_unix: timeUnix,
      };

      /* ---------------------------------------------------
         Find existing record
      --------------------------------------------------- */

      let existingRecord:
        | {
            id: string;
          }
        | null = null;

      try {
        const safeSymbol =
          escapePocketBaseFilterValue(
            symbol
          );

        existingRecord =
          await pb
            .collection("gold_rates")
            .getFirstListItem(
              `symbol="${safeSymbol}"`
            );
      } catch (error: unknown) {
        const pocketBaseError =
          error as {
            status?: number;
          };

        /*
         * 404 یعنی رکورد وجود ندارد.
         * هر خطای دیگری باید متوقف شود.
         */

        if (
          pocketBaseError.status !== 404
        ) {
          throw error;
        }
      }

      /* ---------------------------------------------------
         Update
      --------------------------------------------------- */

      if (existingRecord) {
        const updated =
          await pb
            .collection("gold_rates")
            .update(
              existingRecord.id,
              recordData
            );

        results.push({
          action: "updated",
          symbol,
          id: updated.id,
          price,
          change: changePercent,
        });

        continue;
      }

      /* ---------------------------------------------------
         Create
      --------------------------------------------------- */

      const created =
        await pb
          .collection("gold_rates")
          .create(recordData);

      results.push({
        action: "created",
        symbol,
        id: created.id,
        price,
        change: changePercent,
      });
    }


    return NextResponse.json({
      success: true,

      source,

      count: results.length,

      results,

      fetchedAt:
        new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(
      "خطا در همگام‌سازی نرخ طلا:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "خطای ناشناخته در همگام‌سازی نرخ طلا.";

    return NextResponse.json(
      {
        success: false,

        source,

        error: errorMessage,

        fetchedAt:
          new Date().toISOString(),
      },
      {
        status: 502,
      }
    );
  }
}
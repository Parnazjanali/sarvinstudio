import PocketBase from "pocketbase";

const pocketBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

const pb = new PocketBase(pocketBaseUrl);

export { pb };
export default pb;

import pb from "@/lib/pocketbase";
import LandingUI from "@/components/LandingUI";
import { getGoldGramPrice } from "@/lib/product-detail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products = [];
  let goldRate = 25658600;

  try {
    const [records, rate] = await Promise.all([
      pb.collection("products").getFullList({
        sort: "-created",
        requestKey: null,
      }),
      getGoldGramPrice(),
    ]);

    products = JSON.parse(JSON.stringify(records));
    goldRate = rate;
  } catch (error) {
    console.error("Error fetching homepage data from PocketBase:", error);
  }

  return (
    <LandingUI initialProducts={products} initialGoldRate={goldRate} />
  );
}

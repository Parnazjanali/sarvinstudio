import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { cookies } from "next/headers";

const pbBaseUrl =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  "";

type AddressRecord = {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  user: string;
  title?: string;
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  isDefault: boolean;
};

type SetDefaultBody = {
  addressId?: string;
};

async function getServerPocketBase(): Promise<PocketBase> {
  if (!pbBaseUrl) {
    throw new Error("PocketBase URL is not configured.");
  }

  const pb = new PocketBase(pbBaseUrl);

  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (cookieHeader) {
    pb.authStore.loadFromCookie(cookieHeader);
  }

  return pb;
}

export async function POST(request: Request) {
  try {
    const pb = await getServerPocketBase();

    if (!pb.authStore.isValid || !pb.authStore.record) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    let body: SetDefaultBody;

    try {
      body = (await request.json()) as SetDefaultBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        {
          status: 400,
        },
      );
    }

    const addressId = body.addressId?.trim();

    if (!addressId) {
      return NextResponse.json(
        {
          error: "addressId is required",
        },
        {
          status: 400,
        },
      );
    }

    const currentUserId = pb.authStore.record.id;

    let targetAddress: AddressRecord;

    try {
      targetAddress = await pb
        .collection("addresses")
        .getOne<AddressRecord>(addressId);
    } catch {
      return NextResponse.json(
        {
          error: "Address not found",
        },
        {
          status: 404,
        },
      );
    }

    if (targetAddress.user !== currentUserId) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const existingDefaultAddresses =
      await pb.collection("addresses").getFullList<AddressRecord>({
        filter: `user = "${currentUserId}" && isDefault = true`,
        sort: "-created",
        requestKey: null,
      });

    await Promise.all(
      existingDefaultAddresses
        .filter((address: AddressRecord) => address.id !== targetAddress.id)
        .map((address: AddressRecord) =>
          pb.collection("addresses").update<AddressRecord>(address.id, {
            isDefault: false,
          }),
        ),
    );

    const updatedTargetAddress = await pb
      .collection("addresses")
      .update<AddressRecord>(targetAddress.id, {
        isDefault: true,
      });

    return NextResponse.json({
      success: true,
      address: updatedTargetAddress,
    });
  } catch (error) {
    console.error("set-default address error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      },
    );
  }
}

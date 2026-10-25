"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Search,
  Users,
  UserRound,
  ShieldCheck,
  ShieldX,
  Phone,
  Mail,
  MapPin,
  Pencil,
  X,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShoppingBag,
  Wallet,
  CalendarDays,
  Hash,
  Home,
  UserCheck,
  UserX,
  AlertCircle,
} from "lucide-react";

import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type UserRole = "user" | "admin";

type AddressRecord = {
  id: string;
  collectionId?: string;
  collectionName?: string;
  user?: string;
  title?: string;
  recipientName?: string;
  recipientPhone?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  isDefault?: boolean;
  isActive?: boolean;
  created?: string;
  updated?: string;
};

type UserExpand = {
  address?: AddressRecord | AddressRecord[];
};

type UserRecord = {
  id: string;
  collectionId?: string;
  collectionName?: string;

  email?: string;
  emailVisibility?: boolean;
  verified?: boolean;

  name?: string;
  avatar?: string;
  phone?: string;
  role?: UserRole | string;
  nationalId?: string;

  address?: string | string[];

  created?: string;
  updated?: string;

  expand?: UserExpand;
};

type UserStats = {
  ordersCount: number;
  totalSpent: number;
  lastOrderDate?: string;
};

type UserWithStats = UserRecord & {
  stats: UserStats;
  addresses?: AddressRecord[];
};

type EditForm = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  nationalId: string;
  verified: boolean;
};

type AddressForm = {
  title: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  isDefault: boolean;
  isActive: boolean;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(numberValue(value));
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPhone(value?: string): string {
  if (!value) return "—";
  return value.trim();
}

function getInitial(user?: UserRecord): string {
  const name = user?.name?.trim();

  if (name) {
    return name.charAt(0).toUpperCase();
  }

  const email = user?.email?.trim();

  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "؟";
}

function getExpandedAddresses(user: UserRecord): AddressRecord[] {
  const expanded = user.expand?.address;

  if (!expanded) {
    return [];
  }

  if (Array.isArray(expanded)) {
    return expanded;
  }

  return [expanded];
}

function getAddressSummary(address: AddressRecord): string {
  const parts = [
    address.province,
    address.city,
    address.address,
  ].filter(Boolean);

  return parts.join("، ") || "آدرس ثبت نشده";
}

function createEmptyAddressForm(): AddressForm {
  return {
    title: "",
    recipientName: "",
    recipientPhone: "",
    province: "",
    city: "",
    postalCode: "",
    address: "",
    isDefault: false,
    isActive: true,
  };
}

function getPocketBaseErrorMessage(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const response = error.response;

    if (response?.data) {
      try {
        const entries = Object.entries(response.data);

        if (entries.length > 0) {
          const first = entries[0][1] as {
            message?: string;
            code?: string;
          };

          if (first?.message) {
            return `${first.message}${
              first.code ? ` (${first.code})` : ""
            }`;
          }
        }
      } catch {
        // ignore
      }
    }

    if (response?.message) {
      return response.message;
    }

    return `خطای PocketBase (${error.status || "نامشخص"})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "خطای نامشخص";
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<"all" | UserRole>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<UserWithStats | null>(null);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState(false);

  const [form, setForm] = useState<EditForm>({
    name: "",
    email: "",
    phone: "",
    role: "user",
    nationalId: "",
    verified: false,
  });

  const [addresses, setAddresses] =
    useState<AddressRecord[]>([]);

  const [loadingAddresses, setLoadingAddresses] =
    useState(false);

  const [editingAddress, setEditingAddress] =
    useState<AddressRecord | null>(null);

  const [addressForm, setAddressForm] =
    useState<AddressForm>(
      createEmptyAddressForm()
    );

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [deletingAddressId, setDeletingAddressId] =
    useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Fetch users                                                              */
  /* ------------------------------------------------------------------------ */

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const records =
        await pb.collection("users").getFullList<UserRecord>({
          sort: "-created",
          expand: "address",
          requestKey: null,
        });

      let ordersStats = new Map<
        string,
        {
          ordersCount: number;
          totalSpent: number;
          lastOrderDate?: string;
        }
      >();

      try {
        const orders =
          await pb.collection("orders").getFullList<any>({
            requestKey: null,
          });

        const temp = new Map<
          string,
          {
            ordersCount: number;
            totalSpent: number;
            lastOrderDate?: string;
          }
        >();

        for (const order of orders) {
          const userId =
            typeof order.user === "string"
              ? order.user
              : order.user?.id;

          if (!userId) continue;

          const current = temp.get(userId) ?? {
            ordersCount: 0,
            totalSpent: 0,
            lastOrderDate: undefined,
          };

          current.ordersCount += 1;

          const amount = numberValue(
            order.total ??
              order.totalAmount ??
              order.amount ??
              order.finalPrice
          );

          current.totalSpent += amount;

          const orderDate =
            order.created ??
            order.updated ??
            order.date ??
            undefined;

          if (
            orderDate &&
            (!current.lastOrderDate ||
              new Date(orderDate).getTime() >
                new Date(
                  current.lastOrderDate
                ).getTime())
          ) {
            current.lastOrderDate = orderDate;
          }

          temp.set(userId, current);
        }

        ordersStats = temp;
      } catch (ordersError) {
        console.warn(
          "Could not load orders statistics:",
          getPocketBaseErrorMessage(
            ordersError
          )
        );
      }

      const result: UserWithStats[] =
        records.map((user) => ({
          ...user,
          stats: {
            ordersCount:
              ordersStats.get(user.id)
                ?.ordersCount ?? 0,

            totalSpent:
              ordersStats.get(user.id)
                ?.totalSpent ?? 0,

            lastOrderDate:
              ordersStats.get(user.id)
                ?.lastOrderDate,
          },

          addresses:
            getExpandedAddresses(user),
        }));

      setUsers(result);
    } catch (err) {
      console.error(
        "PocketBase users error:",
        err
      );

      setError(
        `خطا در دریافت کاربران: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ------------------------------------------------------------------------ */
  /* Fetch addresses                                                          */
  /* ------------------------------------------------------------------------ */

  const fetchAddresses = useCallback(
    async (userId: string) => {
      setLoadingAddresses(true);

      try {
        const records =
          await pb
            .collection("addresses")
            .getFullList<AddressRecord>({
              filter: pb.filter(
                "user = {:userId}",
                {
                  userId,
                }
              ),
              sort: "-isDefault,-created",
              requestKey: null,
            });

        setAddresses(records);
      } catch (err) {
        console.error(
          "PocketBase addresses error:",
          err
        );

        setAddresses([]);

        setError(
          `خطا در دریافت آدرس‌ها: ${getPocketBaseErrorMessage(
            err
          )}`
        );
      } finally {
        setLoadingAddresses(false);
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Filter                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredUsers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      if (!matchesRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        user.name,
        user.email,
        user.phone,
        user.nationalId,
        user.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [users, search, roleFilter]);

  /* ------------------------------------------------------------------------ */
  /* Stats                                                                    */
  /* ------------------------------------------------------------------------ */

  const dashboardStats = useMemo(() => {
    const totalUsers = users.length;

    const verifiedUsers =
      users.filter(
        (user) => user.verified
      ).length;

    const adminUsers =
      users.filter(
        (user) => user.role === "admin"
      ).length;

    const totalOrders =
      users.reduce(
        (sum, user) =>
          sum + user.stats.ordersCount,
        0
      );

    const totalSales =
      users.reduce(
        (sum, user) =>
          sum + user.stats.totalSpent,
        0
      );

    return {
      totalUsers,
      verifiedUsers,
      adminUsers,
      totalOrders,
      totalSales,
    };
  }, [users]);

  /* ------------------------------------------------------------------------ */
  /* Open / close user                                                        */
  /* ------------------------------------------------------------------------ */

  const openUser = async (
    user: UserWithStats
  ) => {
    setError("");

    setSelectedUser(user);
    setIsEditingUser(false);
    setEditingAddress(null);

    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role:
        user.role === "admin"
          ? "admin"
          : "user",
      nationalId:
        user.nationalId ?? "",
      verified:
        Boolean(user.verified),
    });

    const expandedAddresses =
      getExpandedAddresses(user);

    setAddresses(
      expandedAddresses.length > 0
        ? expandedAddresses
        : user.addresses ?? []
    );

    await fetchAddresses(user.id);
  };

  const closeUser = () => {
    setSelectedUser(null);
    setIsEditingUser(false);
    setEditingAddress(null);
    setAddresses([]);
    setError("");
  };

  /* ------------------------------------------------------------------------ */
  /* Save user                                                                */
  /* ------------------------------------------------------------------------ */

  const saveUser = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    setError("");

    try {
      const token =
        pb.authStore.token;

      if (!token) {
        throw new Error(
          "توکن احراز هویت پیدا نشد. لطفاً دوباره وارد شوید."
        );
      }

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        nationalId:
          form.nationalId.trim(),
        verified: form.verified,
      };

      const response =
        await fetch(
          `/api/admin/users/${selectedUser.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.error(
          "Admin update user API error:",
          data
        );

        const details =
          data.details
            ? ` ${JSON.stringify(
                data.details
              )}`
            : "";

        throw new Error(
          `${
            data.message ||
            "ویرایش اطلاعات کاربر انجام نشد."
          }${details}`
        );
      }

      const updated =
        data.user as UserRecord;

      const nextUser: UserWithStats = {
        ...selectedUser,
        ...updated,
        stats:
          selectedUser.stats,
        addresses,
      };

      setSelectedUser(
        nextUser
      );

      setUsers((current) =>
        current.map((user) =>
          user.id === updated.id
            ? {
                ...user,
                ...updated,
                stats:
                  user.stats,
                addresses,
              }
            : user
        )
      );

      setForm((current) => ({
        ...current,
        name:
          updated.name ??
          current.name,

        email:
          updated.email ??
          current.email,

        phone:
          updated.phone ??
          current.phone,

        role:
          updated.role ===
          "admin"
            ? "admin"
            : "user",

        nationalId:
          updated.nationalId ??
          current.nationalId,

        verified:
          Boolean(
            updated.verified
          ),
      }));

      setIsEditingUser(false);
    } catch (err) {
      console.error(
        "Admin save user error:",
        err
      );

      setError(
        `خطا در ذخیره کاربر: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSavingUser(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Verification                                                             */
  /* ------------------------------------------------------------------------ */

  const verifyUser = async (
    user: UserWithStats,
    verified: boolean
  ) => {
    if (verifyingUser) return;

    setVerifyingUser(true);
    setError("");

    try {
      const token =
        pb.authStore.token;

      if (!token) {
        throw new Error(
          "توکن احراز هویت پیدا نشد. لطفاً دوباره وارد شوید."
        );
      }

      const response =
        await fetch(
          `/api/admin/users/${user.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              verified,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.error(
          "Admin verification API error:",
          data
        );

        const details =
          data.details
            ? ` ${JSON.stringify(
                data.details
              )}`
            : "";

        throw new Error(
          `${
            data.message ||
            "تغییر وضعیت احراز هویت انجام نشد."
          }${details}`
        );
      }

      const updated =
        data.user as UserRecord;

      const newVerified =
        Boolean(
          updated.verified
        );

      setSelectedUser(
        (current) =>
          current
            ? {
                ...current,
                ...updated,
                verified:
                  newVerified,
                addresses:
                  current.addresses,
              }
            : current
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                ...updated,
                verified:
                  newVerified,
                addresses:
                  item.addresses,
              }
            : item
        )
      );

      setForm((current) => ({
        ...current,
        verified:
          newVerified,
      }));
    } catch (err) {
      console.error(
        "Admin verification error:",
        err
      );

      setError(
        `تغییر وضعیت احراز هویت انجام نشد: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    } finally {
      setVerifyingUser(false);
    }
  };

  const renderVerificationBadge = (
    verified?: boolean
  ) => {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          تأیید شده
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200">
        <XCircle className="h-4 w-4" />
        تأیید نشده
      </span>
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Address edit                                                             */
  /* ------------------------------------------------------------------------ */

  const startEditAddress = (
    address: AddressRecord
  ) => {
    setError("");

    setEditingAddress(address);

    setAddressForm({
      title:
        address.title ?? "",

      recipientName:
        address.recipientName ?? "",

      recipientPhone:
        address.recipientPhone ?? "",

      province:
        address.province ?? "",

      city:
        address.city ?? "",

      postalCode:
        address.postalCode ?? "",

      address:
        address.address ?? "",

      isDefault:
        Boolean(
          address.isDefault
        ),

      isActive:
        typeof address.isActive ===
        "boolean"
          ? address.isActive
          : true,
    });
  };

  const cancelEditAddress = () => {
    setEditingAddress(null);
    setAddressForm(
      createEmptyAddressForm()
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Save address                                                             */
  /* ------------------------------------------------------------------------ */

  const saveAddress = async () => {
    if (
      !selectedUser ||
      !editingAddress
    ) {
      return;
    }

    setSavingAddress(true);
    setError("");

    try {
      if (
        addressForm.isDefault
      ) {
        const otherAddresses =
          addresses.filter(
            (address) =>
              address.id !==
                editingAddress.id &&
              address.isDefault
          );

        for (const address of otherAddresses) {
          await pb
            .collection("addresses")
            .update(
              address.id,
              {
                isDefault: false,
              },
              {
                requestKey: null,
              }
            );
        }
      }

      const payload = {
        title:
          addressForm.title.trim(),

        recipientName:
          addressForm.recipientName.trim(),

        recipientPhone:
          addressForm.recipientPhone.trim(),

        province:
          addressForm.province.trim(),

        city:
          addressForm.city.trim(),

        postalCode:
          addressForm.postalCode.trim(),

        address:
          addressForm.address.trim(),

        isDefault:
          addressForm.isDefault,

        isActive:
          addressForm.isActive,
      };

      const updated =
        await pb
          .collection("addresses")
          .update<AddressRecord>(
            editingAddress.id,
            payload,
            {
              requestKey: null,
            }
          );

      const nextAddresses =
        addresses.map(
          (address) =>
            address.id ===
            updated.id
              ? updated
              : addressForm.isDefault
              ? {
                  ...address,
                  isDefault:
                    false,
                }
              : address
        );

      setAddresses(
        nextAddresses
      );

      setSelectedUser(
        (current) =>
          current
            ? {
                ...current,
                addresses:
                  nextAddresses,
              }
            : current
      );

      setUsers((current) =>
        current.map((user) =>
          user.id ===
          selectedUser.id
            ? {
                ...user,
                addresses:
                  nextAddresses,
              }
            : user
        )
      );

      setEditingAddress(null);
      setAddressForm(
        createEmptyAddressForm()
      );
    } catch (err) {
      console.error(
        "PocketBase update address error:",
        err
      );

      setError(
        `خطا در ذخیره آدرس: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSavingAddress(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Toggle address active                                                    */
  /* ------------------------------------------------------------------------ */

  const toggleAddressActive = async (
    address: AddressRecord
  ) => {
    setError("");

    try {
      const updated =
        await pb
          .collection("addresses")
          .update<AddressRecord>(
            address.id,
            {
              isActive:
                !address.isActive,
            },
            {
              requestKey: null,
            }
          );

      const nextAddresses =
        addresses.map(
          (item) =>
            item.id ===
            updated.id
              ? updated
              : item
        );

      setAddresses(
        nextAddresses
      );

      setSelectedUser(
        (current) =>
          current
            ? {
                ...current,
                addresses:
                  nextAddresses,
              }
            : current
      );

      setUsers((current) =>
        current.map((user) =>
          user.id ===
          selectedUser?.id
            ? {
                ...user,
                addresses:
                  nextAddresses,
              }
            : user
        )
      );
    } catch (err) {
      console.error(
        "PocketBase toggle address error:",
        err
      );

      setError(
        `خطا در تغییر وضعیت آدرس: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Delete address                                                           */
  /* ------------------------------------------------------------------------ */

  const deleteAddress = async (
    address: AddressRecord
  ) => {
    if (!selectedUser) return;

    const confirmed =
      window.confirm(
        "آیا از حذف این آدرس مطمئن هستید؟"
      );

    if (!confirmed) return;

    setDeletingAddressId(
      address.id
    );

    setError("");

    try {
      await pb
        .collection("addresses")
        .delete(
          address.id,
          {
            requestKey: null,
          }
        );

      const currentRelationIds =
        Array.isArray(
          selectedUser.address
        )
          ? selectedUser.address
          : selectedUser.address
          ? [selectedUser.address]
          : [];

      const nextRelationIds =
        currentRelationIds.filter(
          (id) =>
            id !== address.id
        );

      try {
        await pb
          .collection("users")
          .update(
            selectedUser.id,
            {
              address:
                nextRelationIds,
            },
            {
              requestKey: null,
            }
          );
      } catch (relationError) {
        console.warn(
          "Address deleted but users.address relation could not be updated:",
          relationError
        );
      }

      const nextAddresses =
        addresses.filter(
          (item) =>
            item.id !==
            address.id
        );

      setAddresses(
        nextAddresses
      );

      setSelectedUser(
        (current) =>
          current
            ? {
                ...current,
                address:
                  nextRelationIds,
                addresses:
                  nextAddresses,
              }
            : current
      );

      setUsers((current) =>
        current.map((user) =>
          user.id ===
          selectedUser.id
            ? {
                ...user,
                address:
                  nextRelationIds,
                addresses:
                  nextAddresses,
              }
            : user
        )
      );

      if (
        editingAddress?.id ===
        address.id
      ) {
        cancelEditAddress();
      }
    } catch (err) {
      console.error(
        "PocketBase delete address error:",
        err
      );

      setError(
        `خطا در حذف آدرس: ${getPocketBaseErrorMessage(
          err
        )}`
      );
    } finally {
      setDeletingAddressId(
        null
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-transparent font-sans text-[#1C3324] dark:text-zinc-100"
    >
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-[#1C3324]/12 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-colors lg:p-6 dark:border-white/10 dark:bg-[#15221B]/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C3324] text-white shadow-xs dark:bg-emerald-950/60 dark:text-[#D8B65C] dark:border dark:border-[#D8B65C]/30">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-black md:text-2xl text-[#1C3324] dark:text-zinc-100">
                  مدیریت کاربران
                </h1>

                <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                  مدیریت اطلاعات مشتریان، نقش‌ها و آدرس‌های پرنا زر
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="font-black">
                خطا
              </div>

              <div className="mt-1 break-words font-medium">
                {error}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            title="کل کاربران"
            value={formatMoney(
              dashboardStats.totalUsers
            )}
            accent="default"
            description="مشتریان ثبت‌شده"
          />

          <StatCard
            icon={
              <UserCheck className="h-5 w-5" />
            }
            title="کاربران تأیید شده"
            value={formatMoney(
              dashboardStats.verifiedUsers
            )}
            accent="emerald"
            description="احراز هویت شده"
          />

          <StatCard
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
            title="مدیران"
            value={formatMoney(
              dashboardStats.adminUsers
            )}
            accent="gold"
            description="دسترسی مدیریت"
          />

          <StatCard
            icon={
              <ShoppingBag className="h-5 w-5" />
            }
            title="تعداد سفارش‌ها"
            value={formatMoney(
              dashboardStats.totalOrders
            )}
            accent="blue"
            description="سفارش‌های ثبت‌شده"
          />

          <StatCard
            icon={
              <Wallet className="h-5 w-5" />
            }
            title="مجموع خرید"
            value={formatMoney(
              dashboardStats.totalSales
            )}
            unit="تومان"
            accent="crimson"
            description="گردش حساب مشتریان"
          />
        </div>

        {/* Filters */}
        <div className="rounded-3xl border border-[#1C3324]/12 bg-white/80 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3A5A46] dark:text-zinc-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="جستجو بر اساس نام، ایمیل، شماره موبایل یا کد ملی..."
                className="w-full rounded-2xl border border-[#1C3324]/15 bg-white py-3.5 pl-4 pr-11 text-xs font-bold text-[#1C3324] outline-none transition placeholder:text-[#3A5A46]/60 focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D8B65C]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as
                    | "all"
                    | UserRole
                )
              }
              className="rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3.5 text-xs font-black text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
            >
              <option value="all" className="dark:bg-[#101813]">
                همه نقش‌ها
              </option>

              <option value="user" className="dark:bg-[#101813]">
                کاربران
              </option>

              <option value="admin" className="dark:bg-[#101813]">
                مدیران
              </option>
            </select>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-6 text-xs font-black text-white shadow-sm transition hover:bg-[#8B263E] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}

              بروزرسانی
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[2rem] border border-[#1C3324]/12 bg-white/80 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#15221B]/80">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="flex items-center gap-3 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
                در حال دریافت کاربران...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1C3324]/10 bg-white text-[#8B263E] dark:border-white/10 dark:bg-zinc-800 dark:text-[#D8B65C]">
                <Users className="h-7 w-7" />
              </div>

              <h3 className="font-black text-[#1C3324] dark:text-zinc-100">
                کاربری پیدا نشد
              </h3>

              <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                عبارت جستجو یا فیلتر نقش را تغییر دهید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-right text-xs">
                <thead>
                  <tr className="border-b border-[#1C3324]/10 bg-white/90 font-black text-[#1C3324] dark:border-white/10 dark:bg-[#15221B] dark:text-zinc-200">
                    <th className="px-5 py-4">
                      کاربر
                    </th>

                    <th className="px-5 py-4">
                      تماس
                    </th>

                    <th className="px-5 py-4">
                      نقش
                    </th>

                    <th className="px-5 py-4">
                      وضعیت
                    </th>

                    <th className="px-5 py-4">
                      سفارش‌ها
                    </th>

                    <th className="px-5 py-4">
                      مجموع خرید
                    </th>

                    <th className="px-5 py-4">
                      تاریخ ثبت
                    </th>

                    <th className="px-5 py-4 text-center">
                      ورود
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1C3324]/5">
                  {filteredUsers.map(
                    (user) => (
                      <UserTableRow
                        key={user.id}
                        user={user}
                        onOpen={() =>
                          openUser(
                            user
                          )
                        }
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs font-bold text-[#3A5A46]">
          نمایش{" "}
          {formatMoney(
            filteredUsers.length
          )}{" "}
          از{" "}
          {formatMoney(
            users.length
          )}{" "}
          کاربر
        </div>
      </div>

      {/* User Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeUser}
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#121A15] dark:border-l dark:border-white/10">

            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[#1C3324]/10 px-6 py-5 bg-white dark:border-white/10 dark:bg-[#15221B]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1C3324] font-black text-white dark:bg-emerald-900 dark:text-[#D8B65C]">
                  {getInitial(
                    selectedUser
                  )}
                </div>

                <div>
                  <h2 className="font-black text-[#1C3324] dark:text-zinc-100">
                    {selectedUser.name ||
                      selectedUser.email ||
                      "کاربر"}
                  </h2>

                  <p className="mt-0.5 font-mono text-xs text-[#3A5A46] dark:text-zinc-400">
                    {selectedUser.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditingUser ? (
                  <button
                    type="button"
                    onClick={() =>
                      setIsEditingUser(
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#1C3324] transition hover:border-[#8B263E] hover:text-[#8B263E] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200 dark:hover:border-[#D8B65C] dark:hover:text-[#D8B65C]"
                  >
                    <Pencil className="h-4 w-4" />
                    ویرایش
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingUser(
                          false
                        );

                        setForm({
                          name:
                            selectedUser.name ??
                            "",

                          email:
                            selectedUser.email ??
                            "",

                          phone:
                            selectedUser.phone ??
                            "",

                          role:
                            selectedUser.role ===
                            "admin"
                              ? "admin"
                              : "user",

                          nationalId:
                            selectedUser.nationalId ??
                            "",

                          verified:
                            Boolean(
                              selectedUser.verified
                            ),
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#1C3324] hover:bg-neutral-50 cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200"
                    >
                      <X className="h-4 w-4" />
                      لغو
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveUser
                      }
                      disabled={
                        savingUser
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-4 py-2.5 text-xs font-black text-white hover:bg-[#8B263E] disabled:opacity-60 cursor-pointer dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
                    >
                      {savingUser ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      ذخیره
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={
                    closeUser
                  }
                  className="rounded-xl p-2 text-[#3A5A46] hover:bg-[#1C3324]/5 cursor-pointer dark:text-zinc-400 dark:hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* User information */}
              <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#15221B]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#1C3324] dark:text-zinc-100">
                      اطلاعات کاربر
                    </h3>

                    <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                      اطلاعات اصلی حساب
                    </p>
                  </div>

                  {renderVerificationBadge(
                    selectedUser.verified
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    label="نام و نام خانوادگی"
                    icon={
                      <UserRound className="h-4 w-4" />
                    }
                    value={
                      form.name
                    }
                    editing={
                      isEditingUser
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          name: value,
                        })
                      )
                    }
                  />

                  <FormField
                    label="ایمیل"
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                    value={
                      form.email
                    }
                    editing={
                      isEditingUser
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          email: value,
                        })
                      )
                    }
                    note="ایمیل حساب کاربر"
                  />

                  <FormField
                    label="شماره موبایل"
                    icon={
                      <Phone className="h-4 w-4" />
                    }
                    value={
                      form.phone
                    }
                    editing={
                      isEditingUser
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          phone: value,
                        })
                      )
                    }
                  />

                  <FormField
                    label="کد ملی"
                    icon={
                      <Hash className="h-4 w-4" />
                    }
                    value={
                      form.nationalId
                    }
                    editing={
                      isEditingUser
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          nationalId:
                            value,
                        })
                      )
                    }
                  />

                  {/* Role */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#3A5A46]">
                      نقش کاربر
                    </label>

                    {isEditingUser ? (
                      <select
                        value={
                          form.role
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              role:
                                event
                                  .target
                                  .value as UserRole,
                            })
                          )
                        }
                        className="h-11 w-full rounded-2xl border border-[#1C3324]/15 bg-white px-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324] cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
                      >
                        <option value="user" className="dark:bg-[#101813]">
                          کاربر
                        </option>

                        <option value="admin" className="dark:bg-[#101813]">
                          مدیر
                        </option>
                      </select>
                    ) : (
                      <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-3 text-xs font-bold text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100">
                        {selectedUser.role ===
                        "admin" ? (
                          <>
                            <ShieldCheck className="h-4 w-4 text-[#8B263E] dark:text-[#D8B65C]" />
                            مدیر
                          </>
                        ) : (
                          <>
                            <UserRound className="h-4 w-4 text-[#3A5A46] dark:text-zinc-400" />
                            کاربر
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verification */}
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                      وضعیت احراز هویت
                    </label>

                    <div className="rounded-2xl border border-[#1C3324]/15 bg-white p-3.5 shadow-xs dark:border-white/10 dark:bg-zinc-900/80">
                      <div className="flex items-center justify-between gap-3">
                        {renderVerificationBadge(
                          selectedUser.verified
                        )}

                        {selectedUser.verified ? (
                          <button
                            type="button"
                            onClick={() =>
                              verifyUser(
                                selectedUser,
                                false
                              )
                            }
                            disabled={
                              verifyingUser
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                          >
                            {verifyingUser ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldX className="h-3.5 w-3.5" />
                            )}

                            لغو تأیید
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              verifyUser(
                                selectedUser,
                                true
                              )
                            }
                            disabled={
                              verifyingUser
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-emerald-800 dark:hover:bg-emerald-700"
                          >
                            {verifyingUser ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}

                            تأیید احراز هویت
                          </button>
                        )}
                      </div>

                      <p className="mt-2 text-[10px] font-medium text-[#3A5A46] dark:text-zinc-400">
                        وضعیت از طریق سرور مدیریت و PocketBase ذخیره می‌شود.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat
                  icon={
                    <ShoppingBag className="h-4 w-4" />
                  }
                  title="سفارش"
                  value={formatMoney(
                    selectedUser.stats
                      .ordersCount
                  )}
                />

                <MiniStat
                  icon={
                    <Wallet className="h-4 w-4" />
                  }
                  title="مجموع خرید"
                  value={`${formatMoney(
                    selectedUser.stats
                      .totalSpent
                  )} تومان`}
                />

                <MiniStat
                  icon={
                    <CalendarDays className="h-4 w-4" />
                  }
                  title="آخرین سفارش"
                  value={formatDate(
                    selectedUser.stats
                      .lastOrderDate
                  )}
                />

                <MiniStat
                  icon={
                    <MapPin className="h-4 w-4" />
                  }
                  title="آدرس‌ها"
                  value={formatMoney(
                    addresses.length
                  )}
                />
              </section>

              {/* Addresses */}
              <section className="rounded-3xl border border-[#1C3324]/15 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#15221B]">
                <div className="flex items-center justify-between border-b border-[#1C3324]/10 px-5 py-4 bg-white dark:border-white/10 dark:bg-[#15221B]">
                  <div>
                    <h3 className="font-black text-[#1C3324] dark:text-zinc-100">
                      آدرس‌های کاربر
                    </h3>

                    <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                      مدیریت آدرس‌های ثبت‌شده
                    </p>
                  </div>

                  <div className="rounded-full bg-[#1C3324]/5 px-3 py-1 text-xs font-bold text-[#1C3324] border border-[#1C3324]/10 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
                    {formatMoney(
                      addresses.length
                    )}{" "}
                    آدرس
                  </div>
                </div>

                <div className="p-5">
                  {loadingAddresses ? (
                    <div className="flex items-center justify-center py-8 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
                      <Loader2 className="ml-2 h-5 w-5 animate-spin text-[#8B263E] dark:text-[#D8B65C]" />
                      در حال دریافت آدرس‌ها...
                    </div>
                  ) : addresses.length ===
                    0 ? (
                    <div className="rounded-2xl border border-dashed border-[#1C3324]/20 bg-white px-4 py-8 text-center dark:border-white/10 dark:bg-zinc-900/50">
                      <Home className="mx-auto mb-2 h-7 w-7 text-[#3A5A46]/40 dark:text-zinc-500" />

                      <p className="text-xs font-bold text-[#1C3324] dark:text-zinc-100">
                        آدرسی ثبت نشده است
                      </p>

                      <p className="mt-1 text-[11px] text-[#3A5A46] dark:text-zinc-400">
                        اگر آدرس وجود دارد ولی اینجا نمایش داده نمی‌شود، قوانین دسترسی Collection را بررسی کنید.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map(
                        (
                          address
                        ) => (
                          <AddressCard
                            key={
                              address.id
                            }
                            address={
                              address
                            }
                            onEdit={() =>
                              startEditAddress(
                                address
                              )
                            }
                            onToggleActive={() =>
                              toggleAddressActive(
                                address
                              )
                            }
                            onDelete={() =>
                              deleteAddress(
                                address
                              )
                            }
                            deleting={
                              deletingAddressId ===
                              address.id
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Address editor */}
              {editingAddress && (
                <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#15221B]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-[#1C3324] dark:text-zinc-100">
                        ویرایش آدرس
                      </h3>

                      <p className="mt-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
                        اطلاعات آدرس را اصلاح کنید.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        cancelEditAddress
                      }
                      className="rounded-xl p-2 text-[#3A5A46] hover:bg-[#1C3324]/5 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <AddressFormField
                      label="عنوان"
                      value={
                        addressForm.title
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            title:
                              value,
                          })
                        )
                      }
                    />

                    <AddressFormField
                      label="نام گیرنده"
                      value={
                        addressForm.recipientName
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            recipientName:
                              value,
                          })
                        )
                      }
                    />

                    <AddressFormField
                      label="شماره گیرنده"
                      value={
                        addressForm.recipientPhone
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            recipientPhone:
                              value,
                          })
                        )
                      }
                    />

                    <AddressFormField
                      label="استان"
                      value={
                        addressForm.province
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            province:
                              value,
                          })
                        )
                      }
                    />

                    <AddressFormField
                      label="شهر"
                      value={
                        addressForm.city
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            city: value,
                          })
                        )
                      }
                    />

                    <AddressFormField
                      label="کد پستی"
                      value={
                        addressForm.postalCode
                      }
                      onChange={(
                        value
                      ) =>
                        setAddressForm(
                          (
                            current
                          ) => ({
                            ...current,
                            postalCode:
                              value,
                          })
                        )
                      }
                    />

                    <div className="md:col-span-2">
                      <AddressFormField
                        label="آدرس"
                        value={
                          addressForm.address
                        }
                        multiline
                        onChange={(
                          value
                        ) =>
                          setAddressForm(
                            (
                              current
                            ) => ({
                              ...current,
                              address:
                                value,
                            })
                          )
                        }
                      />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100">
                      <input
                        type="checkbox"
                        checked={
                          addressForm.isDefault
                        }
                        onChange={(
                          event
                        ) =>
                          setAddressForm(
                            (
                              current
                            ) => ({
                              ...current,
                              isDefault:
                                event
                                  .target
                                  .checked,
                            })
                          )
                        }
                        className="h-4 w-4 accent-[#1C3324]"
                      />

                      <span>
                        آدرس پیش‌فرض
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-3 text-xs font-bold text-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100">
                      <input
                        type="checkbox"
                        checked={
                          addressForm.isActive
                        }
                        onChange={(
                          event
                        ) =>
                          setAddressForm(
                            (
                              current
                            ) => ({
                              ...current,
                              isActive:
                                event
                                  .target
                                  .checked,
                            })
                          )
                        }
                        className="h-4 w-4 accent-[#1C3324]"
                      />

                      <span>
                        آدرس فعال
                      </span>
                    </label>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={
                        cancelEditAddress
                      }
                      className="rounded-2xl border border-[#1C3324]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#1C3324] hover:bg-neutral-50 cursor-pointer dark:border-white/10 dark:bg-[#101813] dark:text-zinc-200"
                    >
                      لغو
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveAddress
                      }
                      disabled={
                        savingAddress
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#1C3324] px-4 py-2.5 text-xs font-black text-white hover:bg-[#8B263E] disabled:opacity-60 cursor-pointer dark:bg-emerald-900/80 dark:hover:bg-emerald-800"
                    >
                      {savingAddress ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      ذخیره آدرس
                    </button>
                  </div>
                </section>
              )}

              {/* System information */}
              <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#15221B]">
                <h3 className="mb-4 font-black text-[#1C3324] dark:text-zinc-100">
                  اطلاعات سیستمی
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <MetaRow
                    icon={
                      <Hash className="h-4 w-4" />
                    }
                    label="شناسه کاربر"
                    value={
                      selectedUser.id
                    }
                  />

                  <MetaRow
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    label="تاریخ ایجاد"
                    value={formatDate(
                      selectedUser.created
                    )}
                  />

                  <MetaRow
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    label="آخرین بروزرسانی"
                    value={formatDate(
                      selectedUser.updated
                    )}
                  />

                  <MetaRow
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                    label="Email visibility"
                    value={
                      selectedUser.emailVisibility
                        ? "فعال"
                        : "غیرفعال"
                    }
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  title,
  value,
  unit,
  description,
  accent = "default",
}: {
  icon: ReactNode;
  title: string;
  value: string;
  unit?: string;
  description?: string;
  accent?: "default" | "emerald" | "gold" | "blue" | "crimson";
}) {
  const accentStyles = {
    default: {
      iconBg: "bg-[#1C3324]/10 text-[#1C3324] dark:bg-white/10 dark:text-zinc-200",
      border: "hover:border-[#1C3324]/30",
    },
    emerald: {
      iconBg: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
      border: "hover:border-emerald-500/30",
    },
    gold: {
      iconBg: "bg-[#B4901E]/10 text-[#B4901E] dark:bg-[#D8B65C]/20 dark:text-[#D8B65C]",
      border: "hover:border-[#B4901E]/40",
    },
    blue: {
      iconBg: "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
      border: "hover:border-sky-500/30",
    },
    crimson: {
      iconBg: "bg-[#8B263E]/10 text-[#8B263E] dark:bg-[#8B263E]/25 dark:text-rose-300",
      border: "hover:border-[#8B263E]/40",
    },
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-[#1C3324]/12 bg-white/95 p-5 shadow-xs backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#15221B]/95 ${accentStyles.border}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-black/5 dark:border-white/10 ${accentStyles.iconBg}`}
        >
          {icon}
        </div>

        <span className="text-[11px] font-bold text-[#3A5A46] dark:text-zinc-400">
          پرنا زر
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
          {title}
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-black text-[#1C3324] dark:text-zinc-100">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
              {unit}
            </span>
          )}
        </div>

        {description && (
          <div className="mt-1.5 text-[11px] text-[#3A5A46] dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

function UserTableRow({
  user,
  onOpen,
}: {
  user: UserWithStats;
  onOpen: () => void;
}) {
  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer border-b border-[#1C3324]/5 transition-colors last:border-0 hover:bg-[#FAF9F6] dark:border-white/5 dark:hover:bg-white/[0.04]"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C3324] text-xs font-black text-white dark:bg-emerald-900 dark:text-[#D8B65C]">
            {getInitial(user)}
          </div>

          <div className="min-w-0">
            <div className="truncate font-black text-[#1C3324] dark:text-zinc-100">
              {user.name ||
                user.email ||
                "کاربر بدون نام"}
            </div>

            <div className="mt-1 truncate font-mono text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
              {user.id}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#1C3324] dark:text-zinc-200">
            <Phone className="h-3.5 w-3.5 text-[#3A5A46] dark:text-zinc-400" />
            {formatPhone(
              user.phone
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#3A5A46] dark:text-zinc-400">
            <Mail className="h-3.5 w-3.5" />
            {user.email || "—"}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        {user.role ===
        "admin" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B263E]/10 px-3 py-1 text-xs font-bold text-[#8B263E] border border-[#8B263E]/20 dark:bg-[#8B263E]/20 dark:text-rose-300 dark:border-[#8B263E]/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            مدیر
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C3324]/5 px-3 py-1 text-xs font-bold text-[#3A5A46] border border-[#1C3324]/10 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10">
            <UserRound className="h-3.5 w-3.5" />
            کاربر
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        {user.verified ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            تأیید شده
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <ShieldX className="h-4 w-4" />
            تأیید نشده
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-xs font-black text-[#1C3324] dark:text-zinc-100">
        {formatMoney(
          user.stats.ordersCount
        )}
      </td>

      <td className="px-5 py-4 text-xs font-black text-[#1C3324] dark:text-zinc-100">
        {formatMoney(
          user.stats.totalSpent
        )}{" "}
        تومان
      </td>

      <td className="px-5 py-4 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
        {formatDate(
          user.created
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#1C3324]/15 bg-white text-[#3A5A46] transition-all group-hover:border-[#8B263E] group-hover:bg-[#8B263E] group-hover:text-white dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-[#8B263E]">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </div>
        </div>
      </td>
    </tr>
  );
}

function AddressCard({
  address,
  onEdit,
  onToggleActive,
  onDelete,
  deleting,
}: {
  address: AddressRecord;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/15 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/80">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="font-black text-xs text-[#1C3324] dark:text-zinc-100">
              {address.title ||
                "آدرس"}
            </h4>

            {address.isDefault && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                پیش‌فرض
              </span>
            )}

            {address.isActive ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                فعال
              </span>
            ) : (
              <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400">
                غیرفعال
              </span>
            )}
          </div>

          <div className="space-y-1 text-xs font-medium text-[#3A5A46] dark:text-zinc-400">
            <div>
              <span className="font-bold text-[#1C3324] dark:text-zinc-200">
                گیرنده:
              </span>{" "}
              {address.recipientName ||
                "—"}
            </div>

            <div>
              <span className="font-bold text-[#1C3324] dark:text-zinc-200">
                تلفن:
              </span>{" "}
              {address.recipientPhone ||
                "—"}
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8B263E] dark:text-[#D8B65C]" />

              <span className="dark:text-zinc-300">
                {getAddressSummary(
                  address
                )}
              </span>
            </div>

            {address.postalCode && (
              <div className="text-[11px] text-[#3A5A46]/70 dark:text-zinc-500">
                کد پستی:{" "}
                {address.postalCode}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-[#1C3324]/15 bg-white p-2 text-[#3A5A46] hover:border-[#8B263E] hover:text-[#8B263E] cursor-pointer dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-[#D8B65C] dark:hover:text-[#D8B65C]"
            title="ویرایش"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={
              onToggleActive
            }
            className="rounded-xl border border-[#1C3324]/15 bg-white p-2 text-[#3A5A46] hover:border-[#8B263E] hover:text-[#8B263E] cursor-pointer dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-[#D8B65C] dark:hover:text-[#D8B65C]"
            title={
              address.isActive
                ? "غیرفعال کردن"
                : "فعال کردن"
            }
          >
            {address.isActive ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
            title="حذف"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1C3324]/15 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900/80">
      <div className="flex items-center gap-2 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
        {icon}
        {title}
      </div>

      <div className="mt-2 truncate text-xs font-black text-[#1C3324] dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

function FormField({
  label,
  icon,
  value,
  editing,
  onChange,
  note,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  editing: boolean;
  onChange: (
    value: string
  ) => void;
  note?: string;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
        {icon}
        {label}
      </label>

      {editing ? (
        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="h-11 w-full rounded-2xl border border-[#1C3324]/15 bg-white px-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
        />
      ) : (
        <div className="flex min-h-11 items-center rounded-2xl border border-[#1C3324]/15 bg-white px-3 text-xs font-bold text-[#1C3324] dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100">
          {value || "—"}
        </div>
      )}

      {note && (
        <p className="mt-1.5 text-[10px] text-[#3A5A46]/70 dark:text-zinc-500">
          {note}
        </p>
      )}
    </div>
  );
}

function AddressFormField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-[#3A5A46] dark:text-zinc-400">
        {label}
      </label>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          rows={4}
          className="w-full resize-none rounded-2xl border border-[#1C3324]/15 bg-white px-3 py-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
        />
      ) : (
        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="h-11 w-full rounded-2xl border border-[#1C3324]/15 bg-white px-3 text-xs font-bold text-[#1C3324] outline-none focus:border-[#1C3324] dark:border-white/10 dark:bg-[#101813] dark:text-zinc-100 dark:focus:border-[#D8B65C]"
        />
      )}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#1C3324]/15 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900/80">
      <div className="text-[#8B263E] dark:text-[#D8B65C]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-bold text-[#3A5A46] dark:text-zinc-400">
          {label}
        </div>

        <div className="mt-0.5 truncate text-xs font-black text-[#1C3324] dark:text-zinc-100">
          {value}
        </div>
      </div>
    </div>
  );
}
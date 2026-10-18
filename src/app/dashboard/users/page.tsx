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
import ThemeToggle from "@/components/theme/ThemeToggle";

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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          تأیید شده
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900">
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

      /*
       * این قسمت ممکن است با Ruleهای users محدود شود.
       * اگر خطا بدهد، حذف آدرس همچنان انجام شده
       * و فقط relation کاربر به‌روزرسانی نمی‌شود.
       */
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
      className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-bold md:text-2xl">
                  مدیریت کاربران
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  مدیریت اطلاعات مشتریان، نقش‌ها و آدرس‌ها
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                خطا
              </div>

              <div className="mt-1 break-words text-sm">
                {error}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-950/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={
              <Users className="h-5 w-5" />
            }
            title="کل کاربران"
            value={formatMoney(
              dashboardStats.totalUsers
            )}
          />

          <StatCard
            icon={
              <UserCheck className="h-5 w-5" />
            }
            title="کاربران تأیید شده"
            value={formatMoney(
              dashboardStats.verifiedUsers
            )}
          />

          <StatCard
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
            title="مدیران"
            value={formatMoney(
              dashboardStats.adminUsers
            )}
          />

          <StatCard
            icon={
              <ShoppingBag className="h-5 w-5" />
            }
            title="تعداد سفارش‌ها"
            value={formatMoney(
              dashboardStats.totalOrders
            )}
          />

          <StatCard
            icon={
              <Wallet className="h-5 w-5" />
            }
            title="مجموع خرید"
            value={`${formatMoney(
              dashboardStats.totalSales
            )} تومان`}
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="جستجو بر اساس نام، ایمیل، شماره موبایل یا کد ملی..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-900"
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
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              <option value="all">
                همه نقش‌ها
              </option>

              <option value="user">
                کاربران
              </option>

              <option value="admin">
                مدیران
              </option>
            </select>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال دریافت کاربران...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
                <Users className="h-7 w-7 text-slate-400 dark:text-zinc-500" />
              </div>

              <h3 className="font-semibold text-slate-800 dark:text-zinc-100">
                کاربری پیدا نشد
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                عبارت جستجو یا فیلتر نقش را تغییر دهید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-right">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                    <th className="px-5 py-4 font-medium">
                      کاربر
                    </th>

                    <th className="px-5 py-4 font-medium">
                      تماس
                    </th>

                    <th className="px-5 py-4 font-medium">
                      نقش
                    </th>

                    <th className="px-5 py-4 font-medium">
                      وضعیت
                    </th>

                    <th className="px-5 py-4 font-medium">
                      سفارش‌ها
                    </th>

                    <th className="px-5 py-4 font-medium">
                      مجموع خرید
                    </th>

                    <th className="px-5 py-4 font-medium">
                      تاریخ ثبت
                    </th>

                    <th className="px-5 py-4 font-medium text-center">
                      ورود
                    </th>
                  </tr>
                </thead>

                <tbody>
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

        <div className="mt-3 text-xs text-slate-400 dark:text-zinc-500">
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
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm dark:bg-black/70"
            onClick={closeUser}
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-zinc-950">

            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 font-bold text-white dark:bg-white dark:text-zinc-900">
                  {getInitial(
                    selectedUser
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 dark:text-zinc-100">
                    {selectedUser.name ||
                      selectedUser.email ||
                      "کاربر"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
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
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
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
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* User information */}
              <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100">
                      اطلاعات کاربر
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
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
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-300">
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
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                      >
                        <option value="user">
                          کاربر
                        </option>

                        <option value="admin">
                          مدیر
                        </option>
                      </select>
                    ) : (
                      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                        {selectedUser.role ===
                        "admin" ? (
                          <>
                            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            مدیر
                          </>
                        ) : (
                          <>
                            <UserRound className="h-4 w-4 text-slate-500" />
                            کاربر
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verification */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-300">
                      وضعیت احراز هویت
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
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
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                      <p className="mt-2 text-[11px] text-slate-400 dark:text-zinc-500">
                        وضعیت از طریق سرور مدیریت و PocketBase ذخیره می‌شود.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
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
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-zinc-800">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100">
                      آدرس‌های کاربر
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      مدیریت آدرس‌های ثبت‌شده
                    </p>
                  </div>

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {formatMoney(
                      addresses.length
                    )}{" "}
                    آدرس
                  </div>
                </div>

                <div className="p-4">
                  {loadingAddresses ? (
                    <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-zinc-400">
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      در حال دریافت آدرس‌ها...
                    </div>
                  ) : addresses.length ===
                    0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
                      <Home className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-zinc-600" />

                      <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                        آدرسی ثبت نشده است
                      </p>

                      <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
                        اگر آدرس وجود دارد ولی اینجا نمایش داده نمی‌شود،
                        قوانین دسترسی Collection آدرس‌ها را بررسی کنید.
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
                <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100">
                        ویرایش آدرس
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        اطلاعات آدرس را اصلاح کنید.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        cancelEditAddress
                      }
                      className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
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

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
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
                        className="h-4 w-4"
                      />

                      <span className="text-sm">
                        آدرس پیش‌فرض
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
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
                        className="h-4 w-4"
                      />

                      <span className="text-sm">
                        آدرس فعال
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={
                        cancelEditAddress
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 font-bold text-slate-900 dark:text-zinc-100">
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
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
          {icon}
        </div>

        <span className="text-xs text-slate-400 dark:text-zinc-500">
          Perza Gold
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-500 dark:text-zinc-400">
          {title}
        </div>

        <div className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">
          {value}
        </div>
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
      className="group cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
            {getInitial(user)}
          </div>

          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-800 dark:text-zinc-100">
              {user.name ||
                user.email ||
                "کاربر بدون نام"}
            </div>

            <div className="mt-1 truncate text-xs text-slate-400 dark:text-zinc-500">
              {user.id}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-200">
            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            {formatPhone(
              user.phone
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
            <Mail className="h-3.5 w-3.5" />
            {user.email || "—"}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        {user.role ===
        "admin" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-900">
            <ShieldCheck className="h-3.5 w-3.5" />
            مدیر
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            <UserRound className="h-3.5 w-3.5" />
            کاربر
          </span>
        )}
      </td>

      <td className="px-5 py-4">
        {user.verified ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            تأیید شده
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <ShieldX className="h-4 w-4" />
            تأیید نشده
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-sm font-medium text-slate-800 dark:text-zinc-200">
        {formatMoney(
          user.stats.ordersCount
        )}
      </td>

      <td className="px-5 py-4 text-sm font-medium text-slate-800 dark:text-zinc-200">
        {formatMoney(
          user.stats.totalSpent
        )}{" "}
        تومان
      </td>

      <td className="px-5 py-4 text-sm text-slate-500 dark:text-zinc-400">
        {formatDate(
          user.created
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all group-hover:border-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:group-hover:border-zinc-600 dark:group-hover:bg-white dark:group-hover:text-zinc-900">
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-800 dark:text-zinc-100">
              {address.title ||
                "آدرس"}
            </h4>

            {address.isDefault && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                پیش‌فرض
              </span>
            )}

            {address.isActive ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                فعال
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-500">
                غیرفعال
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-slate-600 dark:text-zinc-300">
            <div>
              <span className="font-medium">
                گیرنده:
              </span>{" "}
              {address.recipientName ||
                "—"}
            </div>

            <div>
              <span className="font-medium">
                تلفن:
              </span>{" "}
              {address.recipientPhone ||
                "—"}
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />

              <span>
                {getAddressSummary(
                  address
                )}
              </span>
            </div>

            {address.postalCode && (
              <div className="text-xs text-slate-400 dark:text-zinc-500">
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
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="ویرایش"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={
              onToggleActive
            }
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
            className="rounded-lg border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
        {icon}
        {title}
      </div>

      <div className="mt-2 truncate text-sm font-bold text-slate-800 dark:text-zinc-100">
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
      <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
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
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
      ) : (
        <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          {value || "—"}
        </div>
      )}

      {note && (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
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
      <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-300">
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
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="text-slate-400 dark:text-zinc-500">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[11px] text-slate-400 dark:text-zinc-500">
          {label}
        </div>

        <div className="mt-0.5 truncate text-xs font-medium text-slate-700 dark:text-zinc-200">
          {value}
        </div>
      </div>
    </div>
  );
}
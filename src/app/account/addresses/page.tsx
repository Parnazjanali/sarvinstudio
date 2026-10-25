"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientResponseError } from "pocketbase";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Star,
  Power,
  Loader2,
  User,
  Phone,
  Map,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";

type Address = {
  id: string;
  user: string;
  title: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  isDefault: boolean;
  isActive: boolean;
  created?: string;
  updated?: string;
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

const emptyForm: AddressForm = {
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

export default function AddressesPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultLoadingId, setDefaultLoadingId] = useState<string | null>(null);
  const [activeLoadingId, setActiveLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      setLoading(true);

      if (!pb.authStore.isValid || !pb.authStore.model) {
        router.push("/login");
        return;
      }

      const userId = pb.authStore.model.id;

      const result = await pb
        .collection("addresses")
        .getFullList<Address>({
          filter: `user = "${userId}"`,
          sort: "-isDefault,-created",
          requestKey: null,
        });

      setAddresses(result);
    } catch (error) {
      console.error("Load addresses error:", error);
      toast.error("دریافت آدرس‌ها با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      isDefault: addresses.length === 0,
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(address: Address) {
    setEditingId(address.id);
    setForm({
      title: address.title || "",
      recipientName: address.recipientName || "",
      recipientPhone: address.recipientPhone || "",
      province: address.province || "",
      city: address.city || "",
      postalCode: address.postalCode || "",
      address: address.address || "",
      isDefault: Boolean(address.isDefault),
      isActive: Boolean(address.isActive),
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.title.trim()) {
      toast.error("عنوان آدرس را وارد کنید.");
      return false;
    }
    if (!form.recipientName.trim()) {
      toast.error("نام گیرنده را وارد کنید.");
      return false;
    }
    if (!form.recipientPhone.trim()) {
      toast.error("شماره تماس گیرنده را وارد کنید.");
      return false;
    }
    if (!form.province.trim()) {
      toast.error("استان را وارد کنید.");
      return false;
    }
    if (!form.city.trim()) {
      toast.error("شهر را وارد کنید.");
      return false;
    }
    if (!form.address.trim()) {
      toast.error("آدرس را وارد کنید.");
      return false;
    }
    return true;
  }

  async function makeOtherAddressesNotDefault(
    userId: string,
    exceptId?: string
  ) {
    const currentDefaults = addresses.filter(
      (address) =>
        address.user === userId &&
        address.isDefault &&
        address.id !== exceptId
    );

    for (const address of currentDefaults) {
      await pb.collection("addresses").update<Address>(
        address.id,
        { isDefault: false },
        { requestKey: null }
      );
    }
  }

  async function handleSave() {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (!pb.authStore.isValid || !pb.authStore.model) {
        toast.error("ابتدا وارد حساب کاربری شوید.");
        router.push("/login");
        return;
      }

      const userId = pb.authStore.model.id;
      const shouldBeDefault = addresses.length === 0 ? true : form.isDefault;

      const data = {
        user: userId,
        title: form.title.trim(),
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        address: form.address.trim(),
        isDefault: shouldBeDefault,
        isActive: form.isActive,
      };

      if (shouldBeDefault) {
        await makeOtherAddressesNotDefault(userId, editingId || undefined);
      }

      if (editingId) {
        const updated = await pb
          .collection("addresses")
          .update<Address>(editingId, data, {
            requestKey: null,
          });

        setAddresses((prev) =>
          prev
            .map((address) =>
              address.id === editingId
                ? updated
                : shouldBeDefault
                  ? { ...address, isDefault: false }
                  : address
            )
            .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        );

        toast.success("آدرس با موفقیت ویرایش شد.");
      } else {
        const created = await pb
          .collection("addresses")
          .create<Address>(data, {
            requestKey: null,
          });

        setAddresses((prev) => {
          const updated = shouldBeDefault
            ? prev.map((address) => ({
                ...address,
                isDefault: false,
              }))
            : prev;

          return [created, ...updated].sort(
            (a, b) => Number(b.isDefault) - Number(a.isDefault)
          );
        });

        toast.success("آدرس جدید با موفقیت اضافه شد.");
      }

      closeModal();
    } catch (error: unknown) {
      console.error("Save address error:", error);
      if (error instanceof ClientResponseError) {
        toast.error(
          error.response?.message ||
            error.message ||
            "ذخیره آدرس با خطا مواجه شد."
        );
        return;
      }
      toast.error("ذخیره آدرس با خطا مواجه شد.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(address: Address) {
    const confirmed = window.confirm(
      `آیا از حذف آدرس «${address.title}» مطمئن هستید؟`
    );

    if (!confirmed) return;

    try {
      setDeletingId(address.id);
      await pb.collection("addresses").delete(address.id, {
        requestKey: null,
      });

      const remaining = addresses.filter((item) => item.id !== address.id);
      setAddresses(remaining);

      if (address.isDefault && remaining.length > 0) {
        const nextDefault = remaining[0];
        await pb.collection("addresses").update<Address>(
          nextDefault.id,
          { isDefault: true },
          { requestKey: null }
        );

        setAddresses((prev) =>
          prev.map((item) =>
            item.id === nextDefault.id ? { ...item, isDefault: true } : item
          )
        );
      }

      toast.success("آدرس حذف شد.");
    } catch (error) {
      console.error("Delete address error:", error);
      toast.error("حذف آدرس با خطا مواجه شد.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(address: Address) {
    if (address.isDefault) return;

    try {
      setDefaultLoadingId(address.id);
      if (!pb.authStore.isValid || !pb.authStore.model) {
        router.push("/login");
        return;
      }

      const userId = pb.authStore.model.id;
      await makeOtherAddressesNotDefault(userId, address.id);

      const updated = await pb
        .collection("addresses")
        .update<Address>(
          address.id,
          { isDefault: true },
          { requestKey: null }
        );

      setAddresses((prev) =>
        prev
          .map((item) =>
            item.id === updated.id ? updated : { ...item, isDefault: false }
          )
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      );

      toast.success("آدرس پیش‌فرض تغییر کرد.");
    } catch (error) {
      console.error("Set default address error:", error);
      toast.error("تغییر آدرس پیش‌فرض با خطا مواجه شد.");
    } finally {
      setDefaultLoadingId(null);
    }
  }

  async function handleToggleActive(address: Address) {
    try {
      setActiveLoadingId(address.id);
      const updated = await pb
        .collection("addresses")
        .update<Address>(
          address.id,
          { isActive: !address.isActive },
          { requestKey: null }
        );

      setAddresses((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );

      toast.success(
        updated.isActive ? "آدرس فعال شد." : "آدرس غیرفعال شد."
      );
    } catch (error) {
      console.error("Toggle active address error:", error);
      toast.error("تغییر وضعیت آدرس با خطا مواجه شد.");
    } finally {
      setActiveLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen flex items-center justify-center pt-36 bg-[#FAF9F6]"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={34} className="animate-spin text-[#1C3324]" />
          <p className="text-sm font-bold text-[#3A5A46]">
            در حال دریافت آدرس‌ها...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen pb-24 pt-36 lg:pt-42 px-4 sm:px-6 lg:px-8 font-sans bg-[#FAF9F6] text-[#1C3324]"
    >
      <div className="mx-auto w-full max-w-4xl">
        
        {/* بازگشت به حساب */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B263E] transition hover:opacity-75 cursor-pointer border-none bg-transparent p-0"
          >
            <ArrowRight size={16} />
            بازگشت به حساب کاربری
          </button>
        </div>

        {/* هدر صفحه */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <MapPin size={22} className="text-[#8B263E]" />
              <h1 className="text-2xl font-black text-[#1C3324] m-0">
                آدرس‌های من
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#3A5A46] m-0">
              نشانی‌های خود را جهت ارسال سفارشات در پرنا زر مدیریت کنید.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="border-none bg-[#1C3324] text-white px-5 py-3 rounded-2xl cursor-pointer flex items-center gap-2 font-bold text-xs shadow-xs transition hover:bg-[#8B263E]"
          >
            <Plus size={16} />
            افزودن آدرس جدید
          </button>
        </div>

        {/* لیست آدرس‌ها یا حالت خالی */}
        {addresses.length === 0 ? (
          <div className="bg-white border border-[#1C3324]/15 rounded-3xl py-20 px-6 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-[#FAF9F6] border border-[#1C3324]/15 flex items-center justify-center text-[#1C3324]">
              <MapPin size={28} />
            </div>

            <h2 className="text-lg font-extrabold text-[#1C3324] mb-2">
              هنوز آدرسی ثبت نکرده‌اید
            </h2>

            <p className="text-xs sm:text-sm text-[#3A5A46] max-w-sm mx-auto mb-6 leading-6">
              برای تسریع در ثبت سفارش، اولین نشانی تحویل مرسولات خود را اضافه کنید.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="border border-[#1C3324]/20 bg-white text-[#1C3324] px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs transition hover:border-[#8B263E] hover:text-[#8B263E]"
            >
              افزودن آدرس
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={`bg-white rounded-3xl p-6 transition-all shadow-xs ${
                  address.isDefault
                    ? "border-2 border-[#8B263E]"
                    : "border border-[#1C3324]/15"
                } ${!address.isActive ? "opacity-65" : ""}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#FAF9F6] border border-[#1C3324]/10 flex items-center justify-center text-[#1C3324]">
                      <MapPin size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-extrabold text-[#1C3324] m-0">
                          {address.title || "آدرس"}
                        </h2>

                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 bg-[#FAF9F6] text-[#8B263E] rounded-full px-3 py-0.5 text-[11px] font-bold border border-[#8B263E]/30">
                            <Star size={11} />
                            پیش‌فرض
                          </span>
                        )}

                        {!address.isActive && (
                          <span className="bg-zinc-100 text-zinc-500 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                            غیرفعال
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#3A5A46] mt-1 m-0 font-medium">
                        گیرنده: {address.recipientName}
                      </p>
                    </div>
                  </div>

                  {/* دکمه‌های عملیاتی روی کارت */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(address)}
                      disabled={activeLoadingId === address.id}
                      title={address.isActive ? "غیرفعال کردن" : "فعال کردن"}
                      className="w-9 h-9 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#3A5A46] hover:text-[#1C3324] cursor-pointer flex items-center justify-center transition"
                    >
                      {activeLoadingId === address.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Power size={16} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(address)}
                      title="ویرایش"
                      className="w-9 h-9 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#8B263E] hover:bg-[#8B263E] hover:text-white cursor-pointer flex items-center justify-center transition"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(address)}
                      disabled={deletingId === address.id}
                      title="حذف"
                      className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer flex items-center justify-center transition"
                    >
                      {deletingId === address.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* جزئیات آدرس */}
                <div className="mt-4 pt-4 border-t border-[#1C3324]/10 grid gap-2.5 text-xs sm:text-sm text-[#3A5A46]">
                  <div className="flex items-start gap-2.5">
                    <Map size={16} className="text-[#8B263E] shrink-0 mt-0.5" />
                    <span>{address.province}، {address.city}، {address.address}</span>
                  </div>

                  {address.postalCode && (
                    <div className="flex items-center gap-2.5">
                      <Mail size={16} className="text-[#8B263E] shrink-0" />
                      <span>کد پستی: {address.postalCode}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-[#8B263E] shrink-0" />
                    <span dir="ltr">{address.recipientPhone}</span>
                  </div>
                </div>

                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address)}
                    disabled={defaultLoadingId === address.id}
                    className="mt-4 border-none bg-transparent text-xs font-bold text-[#8B263E] hover:underline cursor-pointer p-0 flex items-center gap-1.5"
                  >
                    {defaultLoadingId === address.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Star size={14} />
                    )}
                    انتخاب به عنوان آدرس پیش‌فرض
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* مودال افزودن / ویرایش آدرس */}
      {modalOpen && (
        <div
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          className="fixed inset-0 bg-[#1C3324]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-[#1C3324]/15 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#1C3324]/10">
              <div>
                <h2 className="text-lg font-black text-[#1C3324] m-0">
                  {editingId ? "ویرایش آدرس" : "افزودن آدرس جدید"}
                </h2>
                <p className="text-xs text-[#3A5A46] mt-1 m-0">
                  اطلاعات تحویل‌گیرنده را با دقت وارد کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="w-9 h-9 rounded-xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#3A5A46] hover:text-[#1C3324] cursor-pointer flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                  عنوان آدرس <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="مثلاً منزل، محل کار"
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] font-medium"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                    نام گیرنده <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.recipientName}
                    onChange={(e) => updateForm("recipientName", e.target.value)}
                    placeholder="نام و نام خانوادگی"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                    شماره تماس <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.recipientPhone}
                    onChange={(e) => updateForm("recipientPhone", e.target.value)}
                    placeholder="0912..."
                    inputMode="tel"
                    dir="ltr"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] text-right font-medium"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                    استان <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.province}
                    onChange={(e) => updateForm("province", e.target.value)}
                    placeholder="مثلاً تهران"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                    شهر <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    placeholder="مثلاً تهران"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                  کد پستی
                </label>
                <input
                  value={form.postalCode}
                  onChange={(e) => updateForm("postalCode", e.target.value)}
                  placeholder="۱۰ رقم بدون خط تیره"
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] text-right font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C3324] mb-1.5">
                  آدرس کامل پستی <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                  placeholder="خیابان، کوچه، پلاک، واحد..."
                  rows={3}
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] py-3 px-4 text-xs sm:text-sm text-[#1C3324] outline-none focus:border-[#8B263E] resize-y font-medium"
                />
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-[#1C3324]">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => updateForm("isDefault", e.target.checked)}
                    className="w-4 h-4 accent-[#1C3324] rounded"
                  />
                  <span>انتخاب به عنوان آدرس پیش‌فرض</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-[#1C3324]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateForm("isActive", e.target.checked)}
                    className="w-4 h-4 accent-[#1C3324] rounded"
                  />
                  <span>این آدرس فعال باشد</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1C3324]/10">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-3 px-5 rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] text-[#1C3324] text-xs font-bold transition hover:bg-[#1C3324]/5 cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 px-5 rounded-2xl bg-[#1C3324] text-white text-xs font-bold transition hover:bg-[#8B263E] disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingId ? "ذخیره تغییرات" : "ثبت آدرس"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
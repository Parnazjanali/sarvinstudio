"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  MapPin,
  PackageCheck,
  PlusCircle,
  ShoppingBag,
  Truck,
  UserRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import pb from "@/lib/pocketbase";

const IRAN_PROVINCES_AND_CITIES: Record<string, string[]> = {
  "آذربایجان شرقی": [
    "تبریز",
    "مراغه",
    "مرند",
    "میانه",
    "اهر",
    "بناب",
    "سراب",
    "آذرشهر",
    "اسکو",
    "شبستر",
  ],
  "آذربایجان غربی": [
    "ارومیه",
    "خوی",
    "بوکان",
    "مهاباد",
    "میاندوآب",
    "سلماس",
    "پیرانشهر",
    "نقده",
    "سردشت",
  ],
  اردبیل: [
    "اردبیل",
    "پارس‌آباد",
    "مشگین‌شهر",
    "خلخال",
    "گرمی",
    "نمین",
    "بیله‌سوار",
    "سرعین",
  ],
  اصفهان: [
    "اصفهان",
    "کاشان",
    "خمینی‌شهر",
    "نجف‌آباد",
    "شاهین‌شهر",
    "شهرضا",
    "فولادشهر",
    "مبارکه",
    "لنجان",
    "آران و بیدگل",
    "نطنز",
  ],
  البرز: [
    "کرج",
    "فردیس",
    "کمال‌شهر",
    "نظرآباد",
    "محمدشهر",
    "ماهدشت",
    "هشتگرد",
    "طالقان",
    "اشتهارد",
  ],
  ایلام: [
    "ایلام",
    "ایوان",
    "دهلران",
    "آبدانان",
    "مهران",
    "دره‌شهر",
    "سرابله",
    "چرداول",
  ],
  بوشهر: [
    "بوشهر",
    "برازجان",
    "بندر گناوه",
    "بندر کنگان",
    "خورموج",
    "بندر جم",
    "بندر عسلویه",
    "بندر دیلم",
  ],
  تهران: [
    "تهران",
    "اسلامشهر",
    "شهریار",
    "قدس",
    "ملارد",
    "صالحیه",
    "پاکدشت",
    "قرچک",
    "ورامین",
    "گلستان",
    "ری",
    "دماوند",
    "پردیس",
    "رباط‌کریم",
    "فیروزکوه",
  ],
  "چهارمحال و بختیاری": [
    "شهرکرد",
    "بروجن",
    "لردگان",
    "فرخ‌شهر",
    "فارسان",
    "سامان",
    "هفشجان",
  ],
  "خراسان جنوبی": [
    "بیرجند",
    "قائن",
    "طبس",
    "فردوس",
    "نهبندان",
    "سرایان",
    "سربیشه",
    "بشرویه",
  ],
  "خراسان رضوی": [
    "مشهد",
    "نیشابور",
    "سبزوار",
    "تربت حیدریه",
    "کاشمر",
    "قوچان",
    "تربت جام",
    "تایباد",
    "چناران",
    "سرخس",
    "گناباد",
  ],
  "خراسان شمالی": [
    "بجنورد",
    "شیروان",
    "اسفراین",
    "آشخانه",
    "جاجرم",
    "گرمه",
    "فاروج",
  ],
  خوزستان: [
    "اهواز",
    "دزفول",
    "آبادان",
    "بندر ماهشهر",
    "خرمشهر",
    "اندیمشک",
    "ایذه",
    "بهبهان",
    "شوشتر",
    "مسجد سلیمان",
    "رامهرمز",
    "امیدیه",
  ],
  زنجان: [
    "زنجان",
    "ابهر",
    "خرمدره",
    "قیدار",
    "هیدج",
    "صائین‌قلعه",
    "آب‌بر",
  ],
  سمنان: [
    "سمنان",
    "شاهرود",
    "دامغان",
    "گرمسار",
    "مهدی‌شهر",
    "ایوانکی",
    "سرخه",
  ],
  "سیستان و بلوچستان": [
    "زاهدان",
    "زابل",
    "ایرانشهر",
    "چابهار",
    "سراوان",
    "خاش",
    "کنارک",
    "راسک",
  ],
  فارس: [
    "شیراز",
    "مرودشت",
    "جهرم",
    "فسا",
    "کازرون",
    "صدرا",
    "داراب",
    "فیروزآباد",
    "لار",
    "آباده",
    "نورآباد",
    "اقلید",
  ],
  قزوین: [
    "قزوین",
    "الوند",
    "محمدیه",
    "تاکستان",
    "آبیک",
    "بوئین‌زهرا",
    "اقبالیه",
  ],
  قم: ["قم", "قنوات", "جعفریه", "کهک", "دستجرد"],
  کردستان: [
    "سنندج",
    "سقز",
    "مریوان",
    "بانه",
    "قروه",
    "کامیاران",
    "بیجار",
    "دیواندره",
  ],
  کرمان: [
    "کرمان",
    "سیرجان",
    "رفسنجان",
    "جیرفت",
    "بم",
    "زرند",
    "کهنوج",
    "شهربابک",
    "بافت",
  ],
  کرمانشاه: [
    "کرمانشاه",
    "اسلام‌آباد غرب",
    "جوانرود",
    "کنگاور",
    "سرپل ذهاب",
    "سنقر",
    "هرسین",
    "صحنه",
    "پاوه",
  ],
  "کهگیلویه و بویراحمد": [
    "یاسوج",
    "دوگنبدان",
    "دهدشت",
    "لیکک",
    "سی‌سخت",
    "چرام",
  ],
  گلستان: [
    "گرگان",
    "گنبد کاووس",
    "علی‌آباد کتول",
    "بندر ترکمن",
    "آق‌قلا",
    "کلاله",
    "کردکوی",
    "آزادشهر",
    "مینودشت",
  ],
  گیلان: [
    "رشت",
    "بندر انزلی",
    "لاهیجان",
    "لنگرود",
    "هشتپر",
    "آستارا",
    "صومعه‌سرا",
    "آستانه اشرفیه",
    "رودسر",
    "فومن",
  ],
  لرستان: [
    "خرم‌آباد",
    "بروجرد",
    "دورود",
    "کوهدشت",
    "الیگودرز",
    "نورآباد",
    "ازنا",
    "الشتر",
    "پلدختر",
  ],
  مازندران: [
    "ساری",
    "بابل",
    "آمل",
    "قائم‌شهر",
    "بهشهر",
    "چالوس",
    "نکا",
    "بابلسر",
    "تنکابن",
    "نوشهر",
    "فریدونکنار",
    "رامسر",
  ],
  مرکزی: [
    "اراک",
    "ساوه",
    "خمین",
    "محلات",
    "دلیجان",
    "زرندیه",
    "شازند",
    "تفرش",
  ],
  هرمزگان: [
    "بندرعباس",
    "میناب",
    "قشم",
    "کیش",
    "دهبارز",
    "بندر لنگه",
    "بندر خمیر",
    "پارسیان",
    "حاجی‌آباد",
  ],
  همدان: [
    "همدان",
    "ملایر",
    "نهاوند",
    "اسدآباد",
    "تویسرکان",
    "بهار",
    "کبودرآهنگ",
    "رزن",
  ],
  یزد: [
    "یزد",
    "میبد",
    "اردکان",
    "بافق",
    "مهریز",
    "ابرکوه",
    "شاهدیه",
    "تفت",
    "زارچ",
  ],
};

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
};

type ShippingFormData = {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

const initialFormData: ShippingFormData = {
  fullName: "",
  phone: "",
  province: "",
  city: "",
  postalCode: "",
  address: "",
};

const checkoutSteps = [
  { id: 1, title: "بررسی سبد خرید", icon: ShoppingBag },
  { id: 2, title: "اطلاعات ارسال", icon: MapPin },
  { id: 3, title: "نحوه پرداخت", icon: CreditCard },
  { id: 4, title: "پایان خرید", icon: PackageCheck },
];

const SHIPPING_INFO_KEY = "checkout_selected_shipping_info";

export default function ShippingPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShippingFormData>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [isNewAddressMode, setIsNewAddressMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // دریافت آدرس‌ها از پاکت‌بیس
  useEffect(() => {
    async function fetchUserAddresses() {
      try {
        setLoading(true);
        if (!pb.authStore.isValid || !pb.authStore.model) {
          router.replace("/login");
          return;
        }

        const userId = pb.authStore.model.id;
        const result = await pb.collection("addresses").getFullList<Address>({
          filter: `user = "${userId}" && isActive = true`,
          sort: "-isDefault,-created",
          requestKey: null,
        });

        setAddresses(result);

        if (result.length > 0) {
          const defaultAddr = result.find((a) => a.isDefault) || result[0];
          setSelectedAddressId(defaultAddr.id);
          setFormData({
            fullName: defaultAddr.recipientName || "",
            phone: defaultAddr.recipientPhone || "",
            province: defaultAddr.province || "",
            city: defaultAddr.city || "",
            postalCode: defaultAddr.postalCode || "",
            address: defaultAddr.address || "",
          });
        } else {
          setIsNewAddressMode(true);
        }
      } catch (err) {
        console.error("خطا در بارگذاری آدرس‌ها:", err);
        toast.error("دریافت آدرس‌ها با خطا مواجه شد.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserAddresses();
  }, [router]);

  const availableCities = useMemo(() => {
    if (!formData.province) return [];
    return IRAN_PROVINCES_AND_CITIES[formData.province] ?? [];
  }, [formData.province]);

  const handleSelectAddress = (address: Address) => {
    setSelectedAddressId(address.id);
    setIsNewAddressMode(false);
    setFormData({
      fullName: address.recipientName || "",
      phone: address.recipientPhone || "",
      province: address.province || "",
      city: address.city || "",
      postalCode: address.postalCode || "",
      address: address.address || "",
    });
    setErrorMessage("");
  };

  const handleEnableNewAddress = () => {
    setSelectedAddressId(null);
    setIsNewAddressMode(true);
    setFormData(initialFormData);
    setErrorMessage("");
  };

  const handleInputChange = (field: keyof ShippingFormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "province") updated.city = "";
      return updated;
    });
    if (errorMessage) setErrorMessage("");
  };

  const validateForm = (): boolean => {
    if (
      !formData.fullName.trim() ||
      !formData.phone.trim() ||
      !formData.province.trim() ||
      !formData.city.trim() ||
      !formData.address.trim()
    ) {
      setErrorMessage("لطفاً تمامی فیلدهای ضروری آدرس را تکمیل کنید.");
      return false;
    }

    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith("09")) {
      setErrorMessage("شماره موبایل باید ۱۱ رقمی و با 09 شروع شود.");
      return false;
    }

    if (formData.postalCode.trim() && formData.postalCode.trim().length !== 10) {
      setErrorMessage("کد پستی باید دقیقاً ۱۰ رقم باشد.");
      return false;
    }

    setErrorMessage("");
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      if (isNewAddressMode && pb.authStore.model) {
        const userId = pb.authStore.model.id;
        const newAddressData = {
          user: userId,
          title: "آدرس ثبت‌شده در سفارش",
          recipientName: formData.fullName.trim(),
          recipientPhone: formData.phone.trim(),
          province: formData.province.trim(),
          city: formData.city.trim(),
          postalCode: formData.postalCode.trim(),
          address: formData.address.trim(),
          isDefault: addresses.length === 0,
          isActive: true,
        };

        const created = await pb.collection("addresses").create<Address>(newAddressData);
        setSelectedAddressId(created.id);
      }

      localStorage.setItem(SHIPPING_INFO_KEY, JSON.stringify(formData));
      router.push("/checkout/payment");
    } catch (err) {
      console.error("خطا در ثبت آدرس سفارش:", err);
      toast.error("ثبت اطلاعات ارسال با خطا مواجه شد.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-36 bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#8B263E]" />
          <p className="text-sm font-bold text-[#3A5A46]">در حال بارگذاری اطلاعات ارسال...</p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen pb-20 pt-32 lg:pt-40 bg-[#FAF9F6] text-[#1C3324] font-sans">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* مراحل خرید (Roadmap) */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#1C3324]/15 bg-white p-4 shadow-xs sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-black sm:text-lg text-[#1C3324]">تکمیل فرآیند خرید</h1>
              <p className="mt-1 text-xs sm:text-sm text-[#3A5A46]">مرحله دوم: نشانی و اطلاعات تحویل سفارش.</p>
            </div>
            <span className="rounded-full bg-[#1C3324]/5 px-3.5 py-1 text-xs font-bold text-[#8B263E]">
              مرحله ۲ از ۴
            </span>
          </div>

          <div className="relative">
            <div className="absolute left-[12%] right-[12%] top-5 hidden h-0.5 bg-[#1C3324]/15 sm:block" />
            <div className="relative grid grid-cols-4 gap-2">
              {checkoutSteps.map((step) => {
                const Icon = step.icon;
                const isCompleted = step.id < 2;
                const isActive = step.id === 2;

                return (
                  <div key={step.id} className="flex min-w-0 flex-col items-center text-center">
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all sm:h-11 sm:w-11 ${
                        isCompleted || isActive
                          ? "bg-[#1C3324] border-[#1C3324] text-white shadow-md"
                          : "bg-white border-[#1C3324]/20 text-[#3A5A46]"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={17} />}
                    </div>
                    <span
                      className={`mt-2 max-w-20 text-[10px] font-bold leading-4 sm:max-w-none sm:text-xs ${
                        isActive ? "text-[#8B263E]" : "text-[#3A5A46]"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs sm:p-7 lg:col-span-2">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                <MapPin size={21} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1C3324]">انتخاب آدرس ارسال</h2>
                <p className="mt-1 text-xs text-[#3A5A46]">از بین آدرس‌های ذخیره‌شده انتخاب کنید یا آدرس جدید وارد نمایید.</p>
              </div>
            </div>

            {/* لیست آدرس‌های ثبت‌شده کاربر در پاکت‌بیس */}
            {addresses.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#1C3324]">آدرس‌های ثبت‌ شده شما</h3>
                  <button
                    type="button"
                    onClick={handleEnableNewAddress}
                    className="inline-flex items-center gap-1 rounded-2xl border border-[#1C3324]/15 px-4 py-2 text-xs font-bold transition hover:bg-[#FAF9F6] bg-[#1C3324]/5 text-[#1C3324] cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    افزودن آدرس جدید
                  </button>
                </div>

                <div className="space-y-3">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => handleSelectAddress(address)}
                      className={`block w-full rounded-2xl border p-4 text-right transition cursor-pointer ${
                        selectedAddressId === address.id && !isNewAddressMode
                          ? "border-[#1C3324] bg-[#1C3324]/5 shadow-xs font-bold"
                          : "border-[#1C3324]/15 bg-white hover:border-[#1C3324]/30 text-[#3A5A46]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-[#1C3324]">
                            {address.title || "آدرس"}
                          </h4>
                          <p className="mt-2 text-xs sm:text-sm text-[#3A5A46]">
                            گیرنده: {address.recipientName} | تلفن: {address.recipientPhone}
                          </p>
                          <p className="mt-1 text-xs leading-6 sm:text-sm text-[#1C3324]">
                            {address.province}، {address.city}، {address.address}
                          </p>
                          {address.postalCode && (
                            <p className="mt-1 text-xs text-[#3A5A46]">کد پستی: {address.postalCode}</p>
                          )}
                        </div>
                        {address.isDefault && (
                          <span className="shrink-0 rounded-full bg-[#8B263E]/10 px-3 py-1 text-xs font-bold text-[#8B263E]">
                            پیش‌فرض
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* فرم مشخصات یا ورود آدرس جدید */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {isNewAddressMode && (
                <div className="mb-4 rounded-2xl bg-[#8B263E]/10 border border-[#8B263E]/20 p-3 text-xs font-bold text-[#8B263E]">
                  در حال ثبت اطلاعات آدرس جدید برای این سفارش هستید:
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                    نام و نام خانوادگی تحویل‌گیرنده <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="مثلاً رضا محمدی"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-xs text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                    شماره موبایل <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="09123456789"
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-right text-xs text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                    استان <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    value={formData.province}
                    onChange={(e) => handleInputChange("province", e.target.value)}
                    className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-xs text-[#1C3324] outline-none transition focus:border-[#1C3324] cursor-pointer"
                  >
                    <option value="">-- انتخاب استان --</option>
                    {Object.keys(IRAN_PROVINCES_AND_CITIES).map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                    شهر / شهرستان <span className="text-red-500">*</span>
                  </span>
                  <select
                    required
                    disabled={!formData.province}
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-xs text-[#1C3324] outline-none transition focus:border-[#1C3324] disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">
                      {formData.province ? "-- انتخاب شهر --" : "-- ابتدا استان را انتخاب کنید --"}
                    </option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                  کد پستی (۱۰ رقم)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  dir="ltr"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  placeholder="1234567890"
                  className="w-full rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3.5 text-right text-xs text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#1C3324]">
                  نشانی کامل پستی <span className="text-red-500">*</span>
                </span>
                <textarea
                  rows={3}
                  required
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="خیابان اصلی، کوچه، پلاک، واحد..."
                  className="w-full resize-none rounded-2xl border border-[#1C3324]/15 bg-[#FAF9F6] px-4 py-3 text-xs leading-7 text-[#1C3324] outline-none transition focus:border-[#1C3324]"
                />
              </label>

              {errorMessage && (
                <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[#1C3324]/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/cart"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1C3324]/15 bg-white px-5 py-3 text-xs font-bold text-[#1C3324] transition hover:bg-[#FAF9F6]"
                >
                  <ArrowRight size={16} />
                  بازگشت به سبد خرید
                </Link>

                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#1C3324] px-6 py-3.5 text-xs font-black text-white transition hover:bg-[#8B263E] shadow-sm"
                >
                  ادامه به مرحله پرداخت
                  <ChevronLeft size={16} />
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <Truck size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-black sm:text-base text-[#1C3324]">ارسال بیمه‌شده و امن</h2>
                  <p className="mt-2 text-xs leading-6 text-[#3A5A46]">
                    تمامی مرسولات طلا و زیورآلات با بسته‌بندی امن و بیمه کامل پستی تا لحظه تحویل به شما ارسال خواهند شد.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#1C3324]/15 bg-white p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C3324]/5 text-[#8B263E]">
                  <UserRound size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-black sm:text-base text-[#1C3324]">مشخصات گیرنده</h2>
                  <p className="mt-2 text-xs leading-6 text-[#3A5A46]">
                    ارائه کارت شناسایی معتبر شخص تحویل‌گیرنده هنگام دریافت سفارش الزامی است.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
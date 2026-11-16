"use client";

import React, { useState } from "react";
import { Share2, Link as LinkIcon, Check, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface BlogShareButtonsProps {
  title: string;
  url: string;
}

export default function BlogShareButtons({ title, url }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(url || window.location.href);
        setCopied(true);
        toast.success("لینک مقاله در حافظه کپی شد.");
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      toast.error("کپی لینک با خطا مواجه شد.");
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`${title} | گالری طلا پرنا زر`);

  const shareWhatsApp = `https://api.whatsapp.com/send?text=${encodedTitle}%0A${encodedUrl}`;
  const shareTelegram = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-[#6E3A44] dark:text-zinc-400 hidden sm:inline">
        اشتراک‌گذاری:
      </span>

      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#DFB76C]/30 bg-white dark:bg-[#1C080E] text-[#3B0B14] dark:text-zinc-200 text-xs font-bold hover:border-[#DFB76C] hover:bg-[#DFB76C]/10 transition-all cursor-pointer shadow-2xs"
        title="کپی لینک مقاله"
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-600" />
            <span className="text-emerald-600">کپی شد</span>
          </>
        ) : (
          <>
            <LinkIcon size={14} className="text-[#8B142D] dark:text-[#DFB76C]" />
            <span>کپی لینک</span>
          </>
        )}
      </button>

      <a
        href={shareWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full border border-[#DFB76C]/30 bg-white dark:bg-[#1C080E] text-[#3B0B14] dark:text-zinc-200 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all shadow-2xs"
        title="اشتراک در واتس‌اپ"
        aria-label="اشتراک در واتس‌اپ"
      >
        <MessageCircle size={15} />
      </a>

      <a
        href={shareTelegram}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full border border-[#DFB76C]/30 bg-white dark:bg-[#1C080E] text-[#3B0B14] dark:text-zinc-200 hover:text-sky-600 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all shadow-2xs"
        title="اشتراک در تلگرام"
        aria-label="اشتراک در تلگرام"
      >
        <Send size={15} />
      </a>
    </div>
  );
}

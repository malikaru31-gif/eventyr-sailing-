"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const NAV = [
  { label: "RIB Charter", href: "/rentals" },
  { label: "Shop", href: "/shop" },
];

const PERFORMANCE_URL = "https://www.eventyrperformance.com";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_coach: boolean;
};

function getInitials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("");
  return initials || "U";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMobile, setOpenMobile] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenMobile(false);
    setOpenProfile(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMobile(false);
        setOpenProfile(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!openProfile) return;
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setOpenProfile(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [openProfile]);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, is_coach")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      console.warn("Failed to load profile:", error.message);
      setProfile(null);
      return;
    }
    setProfile((data as ProfileRow) ?? null);
  }

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      if (!mounted) return;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u?.id) loadProfile(u.id);
      else setProfile(null);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u?.id) loadProfile(u.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => {
    return profile?.full_name?.trim() || email || "Account";
  }, [profile?.full_name, email]);

  const avatarUrl = profile?.avatar_url || null;

  async function onLogout() {
    await supabase.auth.signOut();
    setOpenProfile(false);
    router.push("/");
    router.refresh();
  }

  async function onPickPhoto(file: File) {
    if (!userId) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      alert("Please choose an image under 6MB.");
      return;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", userId);
    if (updateError) {
      alert(`Could not save profile photo: ${updateError.message}`);
      return;
    }
    await loadProfile(userId);
    setOpenProfile(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white">
      <div className="grid h-16 w-full min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: logo */}
        <div className="flex min-w-0 items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Eventyr Sailing Logistics"
              width={220}
              height={48}
              priority
              className="h-9 w-auto"
            />
          </Link>
        </div>

        {/* Center: desktop nav */}
        <nav className="hidden items-center justify-center gap-2 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-bold tracking-tight text-neutral-900 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={PERFORMANCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-bold tracking-tight text-blue-600 hover:bg-blue-50"
          >
            Eventyr Performance ↗
          </a>
        </nav>

        {/* Right: auth */}
        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            {!userId ? (
              <>
                <a
                  href={`${PERFORMANCE_URL}/login`}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                >
                  Log in
                </a>
                <a
                  href={`${PERFORMANCE_URL}/signup`}
                  className="whitespace-nowrap rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Sign up
                </a>
              </>
            ) : (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setOpenProfile((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1.5 hover:bg-neutral-50"
                  aria-label="Open profile menu"
                  aria-expanded={openProfile}
                >
                  <span className="relative h-8 w-8 overflow-hidden rounded-full bg-neutral-200">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-700">
                        {getInitials(displayName)}
                      </span>
                    )}
                  </span>
                  <span className="hidden max-w-[180px] truncate text-sm font-semibold text-neutral-900 lg:block">
                    {displayName}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-700">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                {openProfile && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
                    <div className="px-4 py-3">
                      <div className="text-xs text-neutral-500">Signed in</div>
                      <div className="truncate text-sm font-semibold text-neutral-900">{displayName}</div>
                      <div className="mt-1 text-xs text-neutral-600 truncate">{email}</div>
                    </div>
                    <div className="h-px bg-black/10" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    >
                      Change profile photo
                    </button>
                    <a
                      href={`${PERFORMANCE_URL}/account`}
                      className="block px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    >
                      Account settings ↗
                    </a>
                    <div className="h-px bg-black/10" />
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                    >
                      Log out
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickPhoto(f);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 md:hidden"
          aria-label="Open menu"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setOpenMobile(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Image
                src="/logo.png"
                alt="Eventyr Sailing Logistics"
                width={180}
                height={40}
                className="h-8 w-auto"
              />
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10"
                aria-label="Close menu"
                onClick={() => setOpenMobile(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-4">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-base font-semibold text-neutral-900">
                  {item.label}
                </Link>
              ))}
              <a
                href={PERFORMANCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-blue-600"
              >
                Eventyr Performance ↗
              </a>
            </nav>

            <div className="mt-8">
              {!userId ? (
                <div className="flex gap-3">
                  <a
                    href={`${PERFORMANCE_URL}/login`}
                    className="h-11 flex-1 rounded-full border border-black/15 px-4 text-sm font-semibold flex items-center justify-center"
                  >
                    Log in
                  </a>
                  <a
                    href={`${PERFORMANCE_URL}/signup`}
                    className="h-11 flex-1 rounded-full bg-black px-4 text-sm font-semibold text-white flex items-center justify-center"
                  >
                    Sign up
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-black/10 p-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-neutral-200">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="40px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-700">
                          {getInitials(displayName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-neutral-900">{displayName}</div>
                      <div className="truncate text-xs text-neutral-600">{email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="h-11 w-full rounded-full bg-black px-4 text-sm font-semibold text-white"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickPhoto(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}

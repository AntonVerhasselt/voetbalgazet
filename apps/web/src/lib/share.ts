import { SITE_URL } from "@/lib/site-config";

export type ShareChannel =
  | "whatsapp"
  | "facebook"
  | "x"
  | "email"
  | "copy_link"
  | "messenger"
  | "native_share";

export function articleShareUrl(slug: string): string {
  return `${SITE_URL}/nieuws/${slug}`;
}

export function shareMessage(headline: string, url: string): string {
  return `${headline}\n\n${url}`;
}

export function whatsappShareHref(headline: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(headline, url))}`;
}

export function facebookShareHref(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function xShareHref(headline: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(headline)}&url=${encodeURIComponent(url)}`;
}

export function emailShareHref(headline: string, url: string): string {
  const subject = encodeURIComponent(headline);
  const body = encodeURIComponent(`Ik las dit op De Voetbalgazet:\n\n${url}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

export function messengerShareHref(url: string): string {
  return `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=0&redirect_uri=${encodeURIComponent(url)}`;
}

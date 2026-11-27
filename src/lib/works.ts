import { type CollectionEntry, getCollection } from "astro:content";

export type Work = CollectionEntry<"works">;

// works.yaml に書いた順（新しい順）で返す
export async function getWorks(): Promise<Work[]> {
  const works = await getCollection("works");
  return works.toSorted((a, b) => a.data.order - b.data.order);
}

// カードの行き先。url（外部リンクやサイト内の PDF）を優先し、なければ YouTube の動画ページ。どちらもなければリンクにしない
export function hrefOf(work: Work): string | undefined {
  const { url, youtube } = work.data;
  if (url) return url;
  if (youtube) return `https://www.youtube.com/watch?v=${youtube}`;
  return undefined;
}

// カードの画像の縦横比（幅 / 高さ）。並べ方の計算とカードの表示で同じ値を使う
export function ratioOf(work: Work): number {
  const { width, height } = work.data.thumbnail;
  return width / height;
}

const typeLabel: Record<Work["data"]["type"], string> = {
  work: "WORK",
  exhibition: "EXHIBITION",
  print: "PRINT",
};

// 年月を「Nov 2026」の形にする（作品名の下の行は英語なので、日付も英語の月名にそろえる）
// 2026-11 と書いた年月は世界標準時の 1日 0時として読まれる。ビルドする環境の時刻で読むと、
// 標準時より遅れた地域では前月の末日になってしまうので、標準時のまま取り出す
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 作品名の下に添える情報。種別は常に出し、出展と印刷物には年月を、作者がいれば名前を足す
// 作品は更新され続けるので日付を出さない
// 中黒で並べるだけでは名前が作者だと分からないので、by を付ける
export function captionOf(work: Work): string {
  const { type, date, authors } = work.data;
  const parts = [typeLabel[type]];
  if (type !== "work" && date) parts.push(formatDate(date));
  if (authors) parts.push(`by ${authors.join(", ")}`);
  return parts.join(" · ");
}

import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";

// 作品・出展・印刷物。src/content/works.yaml に、上から新しい順に並べて書く（書いた順がそのまま表示順になる）
// id は読み込みに必要な一意の名前で、画面には出ない
const works = defineCollection({
  // Astro は読み込んだ作品を id 順に並べ替えてしまうので、書いた順を order として持たせておく
  loader: file("src/content/works.yaml", {
    parser: (text) =>
      parse(text).map((item: object, order: number) => ({ ...item, order })),
  }),
  // image() で読み込むと、ビルド時に画像の幅・高さが取れる（縦横比をカードの形と並べ方の計算に使う）
  schema: ({ image }) =>
    z
      .object({
        // works.yaml での位置（0 が先頭）。読み込み時に自動で入るので書かない
        order: z.number(),
        title: z.string(),
        // work: 作品 / exhibition: 出展 / print: 本・ポスター・フライヤーなどの印刷物
        type: z.enum(["work", "exhibition", "print"]),
        // 出展の開催年月、印刷物の発行年月（2026-11 のように書く）。作品（ソフトウェアなど）は更新され続けるので日付を持たせない
        date: z.coerce.date().optional(),
        // カードの画像。works.yaml からの相対パス（例: ./works/foo.jpg）
        // 動画のサムネイルを使う場合も、余白を見て切り抜いたものを置く（縦横比がそのままカードの形になる）
        thumbnail: image(),
        // YouTube の動画ID（https://www.youtube.com/watch?v=<ここ>）。url がなければカードの行き先になる
        // URL を丸ごと貼る間違いを止める。ID の長さは公式に決まっていないので、使える文字だけを確かめる
        youtube: z
          .string()
          .regex(
            /^[\w-]+$/,
            "URL ではなく動画ID（watch?v= の後ろ）を書いてください",
          )
          .optional(),
        // カードを押したときの行き先。外部の URL か、public に置いたファイルのパス（例: /prints/foo.pdf）
        // 省略時は YouTube の動画ページ、それもなければリンクにしない
        url: z
          .string()
          .refine(
            (value) => value.startsWith("/") || URL.canParse(value),
            "URL か / で始まるパスを指定してください",
          )
          .optional(),
      })
      .refine((data) => data.type !== "exhibition" || data.date, {
        message: "出展（exhibition）には date が必要です",
        path: ["date"],
      }),
});

export const collections = { works };

"use client";

import type { MotionProps } from "motion/react";
import type { CSSProperties, ComponentType, ElementType, JSX } from "react";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

type MotionHTMLProps = MotionProps & Record<string, unknown>;

const MOTION_P: ComponentType<MotionHTMLProps> = motion.create("p");

const MOTION_COMPONENTS: Partial<
  Record<keyof JSX.IntrinsicElements, ComponentType<MotionHTMLProps>>
> = {
  p: MOTION_P,
  span: motion.create("span"),
  div: motion.create("div"),
  h1: motion.create("h1"),
  h2: motion.create("h2"),
  h3: motion.create("h3"),
  h4: motion.create("h4"),
  h5: motion.create("h5"),
  h6: motion.create("h6"),
  label: motion.create("label"),
  strong: motion.create("strong"),
  em: motion.create("em"),
  small: motion.create("small"),
  a: motion.create("a"),
  button: motion.create("button"),
  li: motion.create("li"),
  section: motion.create("section"),
  article: motion.create("article"),
  header: motion.create("header"),
  footer: motion.create("footer"),
  main: motion.create("main"),
  aside: motion.create("aside"),
  nav: motion.create("nav"),
  time: motion.create("time"),
  code: motion.create("code"),
  pre: motion.create("pre"),
  blockquote: motion.create("blockquote"),
  figcaption: motion.create("figcaption"),
  figure: motion.create("figure"),
  dd: motion.create("dd"),
  dt: motion.create("dt"),
  dl: motion.create("dl"),
  ul: motion.create("ul"),
  ol: motion.create("ol"),
  tbody: motion.create("tbody"),
  thead: motion.create("thead"),
  tr: motion.create("tr"),
  td: motion.create("td"),
  th: motion.create("th"),
  table: motion.create("table"),
  caption: motion.create("caption"),
  col: motion.create("col"),
  colgroup: motion.create("colgroup"),
  form: motion.create("form"),
  fieldset: motion.create("fieldset"),
  legend: motion.create("legend"),
  input: motion.create("input"),
  textarea: motion.create("textarea"),
  select: motion.create("select"),
  option: motion.create("option"),
  img: motion.create("img"),
  video: motion.create("video"),
  audio: motion.create("audio"),
  canvas: motion.create("canvas"),
  svg: motion.create("svg"),
  path: motion.create("path"),
  g: motion.create("g"),
  circle: motion.create("circle"),
  rect: motion.create("rect"),
  line: motion.create("line"),
  polyline: motion.create("polyline"),
  polygon: motion.create("polygon"),
  text: motion.create("text"),
  defs: motion.create("defs"),
  stop: motion.create("stop"),
  linearGradient: motion.create("linearGradient"),
  radialGradient: motion.create("radialGradient"),
  symbol: motion.create("symbol"),
  use: motion.create("use"),
  clipPath: motion.create("clipPath"),
  mask: motion.create("mask"),
  foreignObject: motion.create("foreignObject"),
  iframe: motion.create("iframe"),
  meter: motion.create("meter"),
  progress: motion.create("progress"),
  details: motion.create("details"),
  summary: motion.create("summary"),
  dialog: motion.create("dialog"),
  map: motion.create("map"),
  area: motion.create("area"),
  object: motion.create("object"),
  output: motion.create("output"),
  b: motion.create("b"),
  i: motion.create("i"),
  u: motion.create("u"),
  s: motion.create("s"),
  sub: motion.create("sub"),
  sup: motion.create("sup"),
  mark: motion.create("mark"),
  q: motion.create("q"),
  cite: motion.create("cite"),
  abbr: motion.create("abbr"),
  address: motion.create("address"),
  bdi: motion.create("bdi"),
  bdo: motion.create("bdo"),
  dfn: motion.create("dfn"),
  ins: motion.create("ins"),
  kbd: motion.create("kbd"),
  samp: motion.create("samp"),
  var: motion.create("var"),
  wbr: motion.create("wbr"),
  br: motion.create("br"),
  hr: motion.create("hr"),
  track: motion.create("track"),
  source: motion.create("source"),
  picture: motion.create("picture"),
  slot: motion.create("slot"),
  template: motion.create("template"),
  style: motion.create("style"),
  script: motion.create("script"),
  link: motion.create("link"),
  meta: motion.create("meta"),
  title: motion.create("title"),
  head: motion.create("head"),
  body: motion.create("body"),
  html: motion.create("html"),
  base: motion.create("base"),
  data: motion.create("data"),
  del: motion.create("del"),
  embed: motion.create("embed"),
  noscript: motion.create("noscript"),
  param: motion.create("param"),
};

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent: ComponentType<MotionHTMLProps> =
    typeof Component === "string"
      ? (MOTION_COMPONENTS[Component as keyof JSX.IntrinsicElements] ?? MOTION_P)
      : MOTION_P;

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);

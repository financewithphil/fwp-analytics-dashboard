// V1 used the native system stack — no custom fonts. We keep the same
// CSS variable names so globals.css doesn't have to know the difference.
//
// next/font is no longer used; the variables are populated with literal
// font-family stacks in globals.css.
export const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const SYSTEM_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

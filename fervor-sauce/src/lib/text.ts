/**
 * Splits copy into lines of words. `*like this*` — one word or several —
 * marks an accent span (set in the serif / flame colour by the caller).
 */
export function tokenizeAccents(text: string) {
  let inAccent = false;
  return text.split("\n").map((line) =>
    line
      .split(" ")
      .filter(Boolean)
      .map((raw) => {
        const opens = raw.startsWith("*");
        if (opens) inAccent = true;
        const accent = inAccent;
        const closes = /\*[.,!?;:’”]*$/.test(raw) && (!opens || raw.indexOf("*", 1) > 0);
        if (closes) inAccent = false;
        return { word: raw.replace(/\*/g, ""), accent };
      }),
  );
}

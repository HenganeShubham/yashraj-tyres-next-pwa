import fs from "node:fs";
import path from "node:path";
import PwaShell from "@/components/PwaShell";

function readLegacyBody() {
  const sourcePath = path.join(process.cwd(), "index.html");
  const source = fs.readFileSync(sourcePath, "utf8");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";

  const html = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/(<iframe[^>]*class="reel-iframe"[^>]*?)\s+src="[^"]*"/gi, "$1")
    .trim();

  return html;
}

export default function Home() {
  return <PwaShell html={readLegacyBody()} />;
}

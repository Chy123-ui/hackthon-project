import { useRef, useState } from "react";
import { generateWorld, importWorld } from "../services/api";

const EXAMPLES = [
  "cyberpunk detective in rain-soaked Neo Tokyo",
  "fantasy world where magic is powered by memories",
  "post-apocalyptic wasteland ruled by sentient machines",
  "steampunk airship city floating above the clouds",
  "underwater civilization threatened by an ancient beast",
  "wild west frontier town with occult secrets",
  "space station on the edge of a black hole",
  "victorian London where ghosts are real and commonplace",
  "martial arts academy hidden in a bamboo forest",
  "medieval kingdom preparing for a dragon awakening",
  "arctic research base where the ice is melting and revealing something",
  "desert nomad tribes who communicate with ancient sand spirits",
  "giant tree city where humans live alongside intelligent birds",
  "underground city after the surface became uninhabitable",
  "haunted manor where every room holds a different timeline",
  "pirate archipelago where the sea itself is cursed",
  "monastery on a floating island that drifts between dimensions",
  "robot civilization trying to understand extinct humans",
  "crystal cave network with bioluminescent ecosystems",
  "time-looping city where every day resets at midnight",
  "mountain monastery training monks who can bend reality",
  "swamp village protected by a mysterious fog entity",
  "trading post at the crossroads of three warring empires",
  "colony ship that has been traveling for generations",
  "dream realm where nightmares take physical form",
  "abandoned theme park where the attractions are alive",
  "coral reef kingdom facing an encroaching darkness",
  "clockwork city powered by captured lightning spirits",
  "library dimension containing every book ever written",
  "volcanic forge realm where weapons are forged from souls",
] as const;

export const MODIFY_EXAMPLES = [
  "add a powerful secret society that controls trade",
  "introduce a dangerous magical disease spreading rapidly",
  "create a rebel faction fighting against the ruling power",
  "add ancient ruins with unsolved puzzles and traps",
  "introduce a mysterious stranger who knows the player's past",
  "make the world's magic system more dangerous and unpredictable",
  "add a legendary creature that roams the wilderness",
  "create political tension between two major cities",
  "introduce a prophecy that many believe is about the player",
  "add a hidden underground black market network",
] as const;

type Tab = "ai" | "import";

interface Props {
  onCreated: (world: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}

export default function NewWorldDialog({ onCreated, onError, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [concept, setConcept] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const example = useRef(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleGenerate(optConcept?: string) {
    const c = (optConcept ?? concept).trim();
    if (!c) return;
    setGenerating(true);
    try {
      const result = await generateWorld(c);
      setConcept("");
      onCreated(result.world);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleImport() {
    const file = importFile;
    if (!file) return;
    setGenerating(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const binary = ["docx", "doc"].includes(ext);
      let content: string;
      if (binary) { const buf = await file.arrayBuffer(); content = btoa(String.fromCharCode(...new Uint8Array(buf))); }
      else { content = await file.text(); }
      const result = await importWorld({ content, filename: file.name, binary });
      setImportFile(null);
      onCreated(result.world);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setImportFile(file); handleImport(); }
  }

  return (
    <div style={{
      marginBottom: 16, padding: 16, background: "var(--bg-card)",
      border: "1px solid var(--accent)", borderRadius: "var(--radius)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ color: "var(--accent)", fontSize: 14 }}>新建世界</h3>
        <button className="secondary" style={{ fontSize: 12, padding: "2px 10px" }} onClick={onClose}>关闭</button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid var(--border)" }}>
        <button className={`tab-btn ${tab === "ai" ? "active" : ""}`} onClick={() => setTab("ai")} style={{ fontSize: 13 }}>
          AI 生成
        </button>
        <button className={`tab-btn ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")} style={{ fontSize: 13 }}>
          导入文件
        </button>
      </div>

      {tab === "ai" && (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
            描述一个世界概念，AI 将生成完整的模板。
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder={`例如 "${example.current}"`}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) {
                  const c = concept.trim();
                  if (c) { handleGenerate(c); }
                  else { setConcept(example.current); }
                }
              }}
              disabled={generating}
              style={{
                flex: 1, padding: "10px 14px", background: "var(--bg-input)",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                color: "var(--text)", fontSize: 14,
              }}
            />
            <button className="primary" onClick={() => handleGenerate()} disabled={generating}>
              {generating ? "生成中..." : "生成"}
            </button>
          </div>
        </>
      )}

      {tab === "import" && (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
            上传文件 (.txt, .json, .docx, .doc, .md, .yaml)，AI 将从中提取并创建世界。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.json,.yaml,.yml,.md,.docx,.doc"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="primary"
            onClick={() => fileRef.current?.click()}
            disabled={generating}
            style={{ padding: "10px 24px" }}
          >
            {generating ? "导入中..." : "选择文件"}
          </button>
          {importFile && (
            <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: 13 }}>
              {importFile.name}
            </span>
          )}
        </>
      )}
    </div>
  );
}

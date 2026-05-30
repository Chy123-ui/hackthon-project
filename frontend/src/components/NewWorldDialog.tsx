import { useRef, useState } from "react";
import { generateWorld, importWorld } from "../services/api";

const EXAMPLES = [
  "赛博朋克侦探在雨中的新东京",
  "记忆驱动的奇幻世界，魔法由回忆铸造",
  "智能机器统治的末日荒原",
  "漂浮在云端的蒸汽朋克飞艇城市",
  "受远古巨兽威胁的海底文明",
  "西部荒野小镇的隐秘超自然传说",
  "黑洞边缘的太空站",
  "幽灵随处可见的维多利亚伦敦",
  "竹林深处的武术门派",
  "巨龙苏醒前夕的中世纪王国",
  "北极科考站冰层融化揭示的秘密",
  "与远古沙灵沟通的沙漠游牧部落",
  "人类与智鸟共居的巨树之城",
  "地表毁灭后的地下都市",
  "每间房都是不同时间线的鬼宅",
  "大海被诅咒的海盗群岛",
  "浮游岛屿上穿越维度的修道院",
  "试图理解灭绝人类的机器人文明",
  "生物发光生态系统的水晶洞穴",
  "每日子时重置的循环城市",
  "能扭曲现实的武僧修炼所",
  "神秘迷雾守护的沼泽村落",
  "三大帝国交汇处的贸易站",
  "航行数代人的殖民星舰",
  "噩梦具象化现实的梦魇领域",
  "游乐设施活过来的废弃主题乐园",
  "面临黑暗侵蚀的珊瑚礁王国",
  "捕获闪电精灵驱动的发条都市",
  "收藏所有书籍的维度图书馆",
  "武器由灵魂锻造的火山熔炉界",
] as const;

export const MODIFY_EXAMPLES = [
  "添加一个掌控贸易的神秘社团",
  "引入一种迅速蔓延的危险魔法疾病",
  "创建一个反抗统治的叛乱势力",
  "加入充满谜题和陷阱的古代遗迹",
  "引入一个知晓你过去的神秘陌生人",
  "让魔法系统更加危险和不可预测",
  "添加一头在荒野中游荡的传说生物",
  "创造两座主要城市之间的政治紧张",
  "引入一条许多人相信与你有关的预言",
  "加入一个隐秘的地下黑市网络",
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
    if (file) { setImportFile(file); }
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
          {importFile && !generating && (
            <button className="primary" onClick={handleImport} style={{ marginLeft: 8 }}>
              提交
            </button>
          )}
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

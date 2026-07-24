"use client";

import { useState, type CSSProperties } from "react";

export type HeritageTrack = "joinery" | "printing" | "tea" | "shadow";

type HeritageWorkshopProps = {
  open: boolean;
  activeTrack: HeritageTrack;
  completed: Record<HeritageTrack, boolean>;
  onClose: () => void;
  onSelectTrack: (track: HeritageTrack) => void;
  onComplete: (track: HeritageTrack) => void;
};

const TRACKS: Array<{ id: HeritageTrack; index: string; label: string }> = [
  { id: "joinery", index: "01", label: "榫卯营造" },
  { id: "printing", index: "02", label: "木活字印刷" },
  { id: "tea", index: "03", label: "传统制茶" },
  { id: "shadow", index: "04", label: "中国皮影戏" },
];
const JOINERY_STEPS = ["选材", "墨线放样", "凿卯制榫", "试装校正", "合榫成架"] as const;
const JOINERY_CHOICES = ["凿卯制榫", "选材", "合榫成架", "墨线放样", "试装校正"] as const;
const PRINT_TARGET = ["艺", "技", "承", "传"] as const;
const PRINT_CHOICES = ["传", "技", "艺", "承"] as const;
const TEA_STEPS = ["种茶", "采摘", "萎凋", "杀青", "揉捻", "发酵", "烘焙"] as const;
const TEA_CHOICES = ["揉捻", "种茶", "烘焙", "萎凋", "发酵", "采摘", "杀青"] as const;
const SHADOW_TIMELINE = ["登场", "亮相", "转身", "谢幕"] as const;
const SOURCE_LINKS: Record<HeritageTrack, { label: string; href: string }> = {
  joinery: {
    label: "UNESCO 中国传统木结构建筑营造技艺",
    href: "https://ich.unesco.org/en/RL/chinese-traditional-architectural-craftsmanship-for-timber-framed-structures-00223",
  },
  printing: {
    label: "UNESCO 木活字印刷",
    href: "https://ich.unesco.org/en/USL/wooden-movable-type-printing-of-china-00322",
  },
  tea: {
    label: "UNESCO 中国传统制茶技艺及相关习俗",
    href: "https://ich.unesco.org/en/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884",
  },
  shadow: {
    label: "UNESCO 中国皮影戏",
    href: "https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421",
  },
};

const playCraftSound = (sound: "ui" | "craft" | "complete" | "tea" | "shadow" = "craft") => {
  window.dispatchEvent(new CustomEvent("game-sound", { detail: sound }));
};

export function HeritageWorkshop({
  open,
  activeTrack,
  completed,
  onClose,
  onSelectTrack,
  onComplete,
}: HeritageWorkshopProps) {
  const [joineryStep, setJoineryStep] = useState(0);
  const [joineryFeedback, setJoineryFeedback] = useState("依照传统木作流程选择第一道工序。");
  const [printingOrder, setPrintingOrder] = useState<string[]>([]);
  const [teaStep, setTeaStep] = useState(0);
  const [teaFeedback, setTeaFeedback] = useState("先从种植茶树开始。");
  const [teaReady, setTeaReady] = useState(false);
  const [shadowRole, setShadowRole] = useState("");
  const [shadowJointsReady, setShadowJointsReady] = useState(false);
  const [shadowLight, setShadowLight] = useState(62);
  const [shadowTimeline, setShadowTimeline] = useState<string[]>([]);

  if (!open) return null;

  const finishTrack = (track: HeritageTrack) => {
    playCraftSound("complete");
    onComplete(track);
  };

  const selectJoineryStep = (choice: string) => {
    playCraftSound();
    if (choice !== JOINERY_STEPS[joineryStep]) {
      setJoineryStep(0);
      setJoineryFeedback("工序顺序不对，木作需要从选材重新开始。");
      return;
    }
    const nextStep = joineryStep + 1;
    setJoineryStep(nextStep);
    if (nextStep === JOINERY_STEPS.length) {
      setJoineryFeedback("梁柱严丝合缝，木构门架已完成。");
      finishTrack("joinery");
    } else {
      setJoineryFeedback(`完成“${choice}”，继续下一道工序。`);
    }
  };

  const selectTeaStep = (choice: string) => {
    playCraftSound("tea");
    if (choice !== TEA_STEPS[teaStep]) {
      setTeaStep(0);
      setTeaReady(false);
      setTeaFeedback("工序次序不正确，这批茶需要重新开始。");
      return;
    }
    const nextStep = teaStep + 1;
    setTeaStep(nextStep);
    if (nextStep === TEA_STEPS.length) {
      setTeaReady(true);
      setTeaFeedback("茶叶已经烘焙完成，请在茶馆为茶客奉茶。");
    } else {
      setTeaFeedback(`完成“${choice}”，茶香正在逐渐形成。`);
    }
  };

  const addPrintingCharacter = (character: string) => {
    playCraftSound("ui");
    if (!printingOrder.includes(character)) setPrintingOrder((current) => [...current, character]);
  };

  const addShadowBeat = (beat: string) => {
    playCraftSound("shadow");
    if (!shadowTimeline.includes(beat)) setShadowTimeline((current) => [...current, beat]);
  };

  const shadowReady =
    Boolean(shadowRole) &&
    shadowJointsReady &&
    shadowLight >= 45 &&
    shadowLight <= 80 &&
    shadowTimeline.join("") === SHADOW_TIMELINE.join("");
  const completedCount = Object.values(completed).filter(Boolean).length;
  const source = SOURCE_LINKS[activeTrack];
  const shadowPreviewStyle = { "--shadow-light": `${shadowLight}%` } as CSSProperties;

  return (
    <section className="heritage-dialog" role="dialog" aria-modal="true" aria-labelledby="heritage-title">
      <header className="heritage-header">
        <div>
          <span className="eyebrow">非遗工坊 · 活态传承</span>
          <h2 id="heritage-title">博物馆学习档案</h2>
        </div>
        <button className="heritage-close" onClick={onClose} aria-label="关闭非遗工坊">×</button>
      </header>

      <div className="heritage-progress">
        <div>
          <span>博物馆成长进度</span>
          <strong>{completedCount} / {TRACKS.length}</strong>
        </div>
        <progress max={TRACKS.length} value={completedCount} />
      </div>

      <nav className="heritage-tabs" aria-label="选择非遗项目">
        {TRACKS.map((track) => (
          <button
            key={track.id}
            className={activeTrack === track.id ? "active" : ""}
            onClick={() => {
              playCraftSound("ui");
              onSelectTrack(track.id);
            }}
          >
            <span>{track.index}</span> {track.label} {completed[track.id] && <b>已完成</b>}
          </button>
        ))}
      </nav>

      {activeTrack === "joinery" && (
        <article className="heritage-content">
          <div className="heritage-copy">
            <span className="craft-tag">传统营造技艺</span>
            <h3>不用铁钉，让梁柱彼此咬合</h3>
            <p>木结构营造依靠放样、加工和试装形成稳定连接。这里以五道工序呈现入门流程。</p>
          </div>
          {completed.joinery ? (
            <div className="craft-complete">
              <span>技艺印记已获得</span><strong>木作营造</strong><p>博物馆外已经生成一座木构示范门架。</p>
            </div>
          ) : (
            <>
              <ol className="process-line" aria-label="榫卯制作进度">
                {JOINERY_STEPS.map((step, index) => (
                  <li key={step} className={index < joineryStep ? "done" : index === joineryStep ? "current" : ""}>
                    <span>{index + 1}</span>{step}
                  </li>
                ))}
              </ol>
              <div className="craft-actions">
                {JOINERY_CHOICES.map((choice) => <button key={choice} onClick={() => selectJoineryStep(choice)}>{choice}</button>)}
              </div>
              <p className="craft-feedback" aria-live="polite">{joineryFeedback}</p>
            </>
          )}
        </article>
      )}

      {activeTrack === "printing" && (
        <article className="heritage-content">
          <div className="heritage-copy">
            <span className="craft-tag">急需保护的传统技艺</span>
            <h3>木活字需要镜像排版</h3>
            <p>从右向左排列字模，印到纸上后才会得到正确的“传承技艺”。请排出它的反向顺序。</p>
          </div>
          {completed.printing ? (
            <div className="craft-complete print-complete">
              <span>印页已入藏</span><strong>传承技艺</strong><p>排字、上墨、覆纸和拓印全部完成。</p>
            </div>
          ) : (
            <>
              <div className="type-slots" aria-label="木活字排版结果">
                {PRINT_TARGET.map((character) => <span key={character}>{printingOrder[PRINT_TARGET.indexOf(character)] ?? "·"}</span>)}
              </div>
              <div className="type-choices">
                {PRINT_CHOICES.map((character) => (
                  <button key={character} disabled={printingOrder.includes(character)} onClick={() => addPrintingCharacter(character)}>
                    {character}
                  </button>
                ))}
              </div>
              <div className="printing-controls">
                <button onClick={() => setPrintingOrder([])}>重新排字</button>
                <button
                  className="primary"
                  disabled={printingOrder.join("") !== PRINT_TARGET.join("")}
                  onClick={() => finishTrack("printing")}
                >
                  上墨 · 覆纸 · 拓印
                </button>
              </div>
            </>
          )}
        </article>
      )}

      {activeTrack === "tea" && (
        <article className="heritage-content">
          <div className="heritage-copy">
            <span className="craft-tag">传统制茶技艺及相关习俗</span>
            <h3>从一片鲜叶到一席待客茶</h3>
            <p>完成茶园管理、采摘与手工加工，再把茶带进茶馆。不同茶类的真实工序各有差异，本关以教学化流程呈现。</p>
          </div>
          {completed.tea ? (
            <div className="craft-complete tea-complete">
              <span>茶客满意</span><strong>以茶待客</strong><p>茶园和茶馆已经成为博物馆的活态展区。</p>
            </div>
          ) : (
            <>
              <ol className="process-line tea-process" aria-label="制茶进度">
                {TEA_STEPS.map((step, index) => (
                  <li key={step} className={index < teaStep ? "done" : index === teaStep ? "current" : ""}>
                    <span>{index + 1}</span>{step}
                  </li>
                ))}
              </ol>
              {!teaReady ? (
                <div className="craft-actions">
                  {TEA_CHOICES.map((choice) => <button key={choice} onClick={() => selectTeaStep(choice)}>{choice}</button>)}
                </div>
              ) : (
                <div className="tea-guest">
                  <div className="npc-avatar" aria-hidden="true">茶</div>
                  <div><strong>茶客 · 林先生</strong><p>“闻香清雅，能否为我沏一盏？”</p></div>
                  <button onClick={() => finishTrack("tea")}>温器 · 注水 · 奉茶</button>
                </div>
              )}
              <p className="craft-feedback" aria-live="polite">{teaFeedback}</p>
            </>
          )}
        </article>
      )}

      {activeTrack === "shadow" && (
        <article className="heritage-content">
          <div className="heritage-copy">
            <span className="craft-tag">中国皮影戏</span>
            <h3>让雕刻人物在灯幕后活起来</h3>
            <p>制作角色、连接可动关节、安排背光，再把操纵动作排入演出时间轴。</p>
          </div>
          {completed.shadow ? (
            <div className="craft-complete shadow-complete">
              <span>首演完成</span><strong>灯影传情</strong><p>皮影戏台亮起，演出档案已经收入博物馆。</p>
            </div>
          ) : (
            <div className="shadow-workbench">
              <div className="shadow-preview" style={shadowPreviewStyle} aria-label="皮影角色预览">
                <div className={`puppet ${shadowJointsReady ? "articulated" : ""}`}>
                  <i className="puppet-head" /><i className="puppet-body" />
                  <i className="puppet-arm left" /><i className="puppet-arm right" />
                </div>
                <span>{shadowRole || "未选择角色"}</span>
              </div>
              <div className="shadow-controls">
                <fieldset>
                  <legend>1 · 制作角色</legend>
                  {["人物", "瑞兽", "花鸟"].map((role) => (
                    <button key={role} className={shadowRole === role ? "selected" : ""} onClick={() => { setShadowRole(role); playCraftSound("shadow"); }}>
                      {role}
                    </button>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>2 · 设置关节</legend>
                  <button className={shadowJointsReady ? "selected" : ""} onClick={() => { setShadowJointsReady(true); playCraftSound("shadow"); }}>
                    {shadowJointsReady ? "肩 · 肘 · 腕已连接" : "连接肩 · 肘 · 腕"}
                  </button>
                </fieldset>
                <label className="light-control">
                  <span>3 · 安排灯光 <b>{shadowLight}%</b></span>
                  <input type="range" min="20" max="100" value={shadowLight} onChange={(event) => setShadowLight(Number(event.target.value))} />
                  <small>适宜演出亮度：45%—80%</small>
                </label>
                <fieldset>
                  <legend>4 · 动作时间轴</legend>
                  <div className="shadow-timeline">
                    {shadowTimeline.map((beat) => <span key={beat}>{beat}</span>)}
                  </div>
                  {SHADOW_TIMELINE.map((beat) => (
                    <button key={beat} disabled={shadowTimeline.includes(beat)} onClick={() => addShadowBeat(beat)}>{beat}</button>
                  ))}
                  <button className="reset" onClick={() => setShadowTimeline([])}>重排</button>
                </fieldset>
                <button className="shadow-perform" disabled={!shadowReady} onClick={() => finishTrack("shadow")}>
                  点灯 · 击乐 · 开演
                </button>
              </div>
            </div>
          )}
        </article>
      )}

      <footer className="heritage-source">
        资料参考：
        <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
      </footer>
    </section>
  );
}

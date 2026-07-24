"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SLIDES = [
  { id: "vision", label: "愿景" },
  { id: "problem", label: "机会" },
  { id: "loop", label: "玩法" },
  { id: "crafts", label: "内容" },
  { id: "experience", label: "体验" },
  { id: "technology", label: "技术" },
  { id: "roadmap", label: "路线" },
  { id: "ask", label: "合作" },
] as const;

const CRAFTS = [
  { index: "01", name: "榫卯营造", verb: "按序完成五道工序", reward: "生成木构门架", tone: "wood" },
  { index: "02", name: "木活字印刷", verb: "镜像排字并拓印", reward: "印页进入馆藏", tone: "type" },
  { index: "03", name: "传统制茶", verb: "制茶后为茶客奉茶", reward: "茶园成为展区", tone: "tea" },
  { index: "04", name: "中国皮影戏", verb: "操偶、调光、编排演出", reward: "完成一场表演", tone: "shadow" },
] as const;

function PixelMark({ label = "D" }: { label?: string }) {
  return <span className="pitch-mark" aria-hidden="true">{label}</span>;
}

function VoxelScene({ variant }: { variant: "museum" | "craft" | "world" }) {
  return (
    <div className={`voxel-scene ${variant}`} aria-hidden="true">
      <div className="sun" />
      <div className="cloud cloud-a" />
      <div className="cloud cloud-b" />
      <div className="mountain mountain-a" />
      <div className="mountain mountain-b" />
      <div className="museum-roof" />
      <div className="museum-body" />
      <div className="museum-door" />
      <div className="ground ground-far" />
      <div className="ground ground-near" />
      <div className="voxel-tree tree-a"><i /><b /></div>
      <div className="voxel-tree tree-b"><i /><b /></div>
      <div className="scanline" />
    </div>
  );
}

function SlideFrame({
  children,
  index,
  eyebrow,
  className = "",
}: {
  children: React.ReactNode;
  index: number;
  eyebrow: string;
  className?: string;
}) {
  return (
    <section
      className={`pitch-slide ${className}`}
      id={SLIDES[index].id}
      aria-label={`${index + 1}. ${SLIDES[index].label}`}
    >
      <div className="slide-grid" aria-hidden="true" />
      <header className="slide-chrome">
        <div className="pitch-brand"><PixelMark /> DTCODER BLOCKLANDS</div>
        <div className="slide-status"><i /> {eyebrow}</div>
      </header>
      {children}
      <footer className="slide-footer">
        <span>ROADSHOW / 2026</span>
        <strong>{String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}</strong>
      </footer>
    </section>
  );
}

export function PitchDeck() {
  const [active, setActive] = useState(0);
  const deckRef = useRef<HTMLElement>(null);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    const safeIndex = Math.max(0, Math.min(SLIDES.length - 1, next));
    document.getElementById(SLIDES[safeIndex].id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const elements = SLIDES
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(elements.indexOf(visible.target as HTMLElement));
      },
      { threshold: [0.55, 0.75] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(active - 1);
      }
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(SLIDES.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, goTo]);

  return (
    <main
      className="pitch-deck"
      ref={deckRef}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientY ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = touchStart.current - (event.changedTouches[0]?.clientY ?? touchStart.current);
        if (Math.abs(distance) > 45) goTo(active + (distance > 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <nav className="pitch-nav" aria-label="路演幻灯片导航">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            className={active === index ? "active" : ""}
            onClick={() => goTo(index)}
            aria-label={`前往第 ${index + 1} 页：${slide.label}`}
            aria-current={active === index ? "page" : undefined}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{slide.label}</b>
          </button>
        ))}
      </nav>

      <SlideFrame index={0} eyebrow="可玩的非遗数字空间" className="hero-slide">
        <VoxelScene variant="museum" />
        <div className="hero-copy">
          <span className="pitch-kicker">体素探索 × 活态传承</span>
          <h1>让非遗<br /><em>进入玩法</em></h1>
          <p>不是把文化放进展柜，而是让玩家亲手理解工序、完成作品，并看见世界因学习而改变。</p>
          <div className="hero-proof">
            <span><b>3D</b> 浏览器即开即玩</span>
            <span><b>4</b> 项可交互技艺</span>
            <span><b>1</b> 个持续生长的博物馆</span>
          </div>
        </div>
        <div className="hero-prompt"><kbd>→</kbd> 继续路演</div>
      </SlideFrame>

      <SlideFrame index={1} eyebrow="为什么现在值得做">
        <div className="split-layout">
          <div className="statement">
            <span className="pitch-kicker">现状 / OPPORTUNITY</span>
            <h2>数字化展示很多，<br />真正“动手理解”的体验很少。</h2>
            <p>静态图文能保存信息，却很难让年轻玩家感受一项技艺为何讲究顺序、尺度、协作与反复练习。</p>
          </div>
          <div className="contrast-stage" aria-label="从静态观看到主动实践">
            <div className="contrast-card muted">
              <span>传统数字展陈</span>
              <strong>看见成品</strong>
              <ul><li>图文浏览</li><li>一次性观看</li><li>文化与玩法分离</li></ul>
            </div>
            <div className="contrast-arrow">→</div>
            <div className="contrast-card active">
              <span>BLOCKLANDS</span>
              <strong>理解过程</strong>
              <ul><li>工序操作</li><li>即时反馈</li><li>成果回到世界</li></ul>
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={2} eyebrow="核心玩法闭环">
        <div className="center-heading">
          <span className="pitch-kicker">CORE LOOP</span>
          <h2>每次学习，都成为世界里看得见的变化。</h2>
        </div>
        <div className="loop-track">
          {[
            ["01", "发现工坊", "在体素世界中探索"],
            ["02", "学习工序", "理解材料与先后关系"],
            ["03", "亲手制作", "通过操作接受反馈"],
            ["04", "作品入藏", "获得技艺印记"],
            ["05", "世界生长", "解锁建筑与展陈"],
          ].map(([index, title, copy]) => (
            <article key={index}>
              <span>{index}</span>
              <div className="loop-cube" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="loop-caption"><i /> 文化知识不是支线说明，而是推动建造与探索的核心资源。</div>
      </SlideFrame>

      <SlideFrame index={3} eyebrow="首期内容矩阵">
        <div className="craft-layout">
          <div className="craft-heading">
            <span className="pitch-kicker">PLAYABLE HERITAGE</span>
            <h2>四种技艺，四种不同的“理解方式”。</h2>
            <p>每项内容都从真实知识与实践出发，再转译为适合网页游戏的互动任务。</p>
          </div>
          <div className="craft-grid">
            {CRAFTS.map((craft) => (
              <article className={`craft-card ${craft.tone}`} key={craft.name}>
                <span>{craft.index}</span>
                <div className="craft-pixel" aria-hidden="true" />
                <h3>{craft.name}</h3>
                <p>{craft.verb}</p>
                <b>世界反馈 · {craft.reward}</b>
              </article>
            ))}
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={4} eyebrow="产品体验">
        <div className="experience-layout">
          <VoxelScene variant="craft" />
          <div className="experience-copy">
            <span className="pitch-kicker">ONE WORLD, TWO RHYTHMS</span>
            <h2>自由探索负责好奇心，<br />工坊挑战负责理解力。</h2>
            <div className="experience-list">
              <article><span>01</span><div><h3>沙盒层</h3><p>移动、跳跃、建造、破坏，在程序化体素世界中自由探索。</p></div></article>
              <article><span>02</span><div><h3>学习层</h3><p>进入博物馆与工坊，通过顺序、空间、节奏和协作完成技艺。</p></div></article>
              <article><span>03</span><div><h3>成长层</h3><p>作品、建筑和展陈持续出现，把学习进度变成长期可见的世界资产。</p></div></article>
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={5} eyebrow="技术实现">
        <div className="tech-layout">
          <div className="tech-copy">
            <span className="pitch-kicker">BROWSER-NATIVE VOXEL ENGINE</span>
            <h2>无需下载，打开链接就进入一座可扩展的体素世界。</h2>
            <p>当前原型已完成核心移动、碰撞、方块交互、程序化地形、区块网格优化和响应式操作。</p>
          </div>
          <div className="tech-stack" aria-label="技术能力">
            <article className="featured">
              <span>ENGINE</span><strong>Three.js</strong>
              <p>16×16 区块 · 暴露面剔除 · 单区块合并网格</p>
            </article>
            <article><span>WORLD</span><strong>Simplex + FBM</strong><p>确定性程序化地形</p></article>
            <article><span>PRODUCT</span><strong>React + TypeScript</strong><p>低频 UI 状态与高频渲染解耦</p></article>
            <article><span>ACCESS</span><strong>Desktop + Mobile</strong><p>键鼠、键盘与触控均可体验</p></article>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={6} eyebrow="迭代路线">
        <div className="roadmap-layout">
          <div className="roadmap-heading">
            <span className="pitch-kicker">ROADMAP</span>
            <h2>从可玩原型，走向持续更新的数字传承平台。</h2>
          </div>
          <div className="roadmap-track">
            <article className="now"><span>NOW</span><h3>验证核心闭环</h3><p>体素探索、四项工坊、成长型博物馆、桌面与移动端。</p><b>已形成可演示原型</b></article>
            <article><span>NEXT</span><h3>扩充技艺与叙事</h3><p>引入青瓷、剪纸、云锦等内容，并与专业机构共同校核。</p><b>建立内容生产模板</b></article>
            <article><span>THEN</span><h3>共创与教育场景</h3><p>支持主题展、研学任务、学校课程和社区传承记录。</p><b>让一座馆变成一张网络</b></article>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={7} eyebrow="合作提案" className="ask-slide">
        <VoxelScene variant="world" />
        <div className="ask-copy">
          <span className="pitch-kicker">BUILD THE LIVING MUSEUM</span>
          <h2>一起把“被看见的文化”，<br />变成“被实践的文化”。</h2>
          <p>我们正在寻找非遗机构、学校、文化场馆与内容伙伴，共同打磨技艺知识、学习任务与公开展示场景。</p>
          <div className="ask-actions">
            <a href="/" target="_blank" rel="noreferrer">进入游戏原型 <b>↗</b></a>
            <span>合作方向：内容共创 · 研学试点 · 展陈落地</span>
          </div>
        </div>
        <div className="ask-signature"><PixelMark label="传" /><span>DTCODER<br /><b>BLOCKLANDS</b></span></div>
      </SlideFrame>
    </main>
  );
}

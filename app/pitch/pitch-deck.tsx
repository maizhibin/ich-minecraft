"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 路演页签：保持短标签便于导航，正文用孩子视角讲述
const SLIDES = [
  { id: "vision", label: "开场" },
  { id: "problem", label: "发现" },
  { id: "loop", label: "冒险" },
  { id: "crafts", label: "工坊" },
  { id: "experience", label: "世界" },
  { id: "technology", label: "魔法" },
  { id: "roadmap", label: "下一站" },
  { id: "ask", label: "邀请" },
] as const;

// 七项已实现非遗：文案用「我做了什么」的孩子口吻，奖励对应世界反馈
const CRAFTS = [
  { index: "01", name: "榫卯营造", verb: "我让木头互相咬住，不用一颗钉子", reward: "门口多了一座木构门架", tone: "wood" },
  { index: "02", name: "木活字印刷", verb: "我把字反着排好，拓出「传承技艺」", reward: "馆里多了一张印页", tone: "type" },
  { index: "03", name: "传统制茶", verb: "从种茶到奉茶，我给茶客倒了一杯", reward: "茶园变成了待客展区", tone: "tea" },
  { index: "04", name: "中国皮影戏", verb: "我接好关节、调好灯光，演完一场戏", reward: "戏台上留下角色剪影", tone: "shadow" },
  { index: "05", name: "龙泉青瓷", verb: "泥、坯、釉、火，我炼出梅子青", reward: "窑场旁立起青瓷展架", tone: "porcelain" },
  { index: "06", name: "中国剪纸", verb: "对折剪刻，我把窗花贴上窗", reward: "案台旁亮起窗花", tone: "papercut" },
  { index: "07", name: "南京云锦", verb: "穿经挑花投梭，我织出寸锦寸金", reward: "织机廊挂起纹样", tone: "yunjin" },
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

      {/* 开场：孩子走进可玩的非遗世界 */}
      <SlideFrame index={0} eyebrow="我今天走进了一座会长大的世界" className="hero-slide">
        <VoxelScene variant="museum" />
        <div className="hero-copy">
          <span className="pitch-kicker">孩子的第一人称 · 非遗冒险日记</span>
          <h1>奶奶说，<br /><em>手比眼睛记得牢</em></h1>
          <p>
            所以我打开链接，走进方块世界：蓝天白云、花草小路，还有会巡逻的小机器人。
            我不是只看展柜——我亲手做完工序，博物馆就真的长大一点。
          </p>
          <div className="hero-proof">
            <span><b>3D</b> 浏览器即开即玩</span>
            <span><b>7</b> 座可动手的工坊</span>
            <span><b>1</b> 座会记分的博物馆</span>
          </div>
        </div>
        <div className="hero-prompt"><kbd>→</kbd> 翻开下一页日记</div>
      </SlideFrame>

      {/* 发现：静态观看 vs 动手理解 */}
      <SlideFrame index={1} eyebrow="我发现的问题">
        <div className="split-layout">
          <div className="statement">
            <span className="pitch-kicker">日记 / 为什么值得动手</span>
            <h2>以前我只会说「好漂亮」，<br />却说不出它是怎么做成的。</h2>
            <p>
              图文展览让我看见成品，可是榫为什么要先凿、茶为什么要先杀青、影人为什么要反着贴——
              这些「顺序」和「手感」，得自己试过才懂。
            </p>
          </div>
          <div className="contrast-stage" aria-label="从只看到动手">
            <div className="contrast-card muted">
              <span>只看展柜</span>
              <strong>我看过了</strong>
              <ul><li>滑过图文</li><li>看完就忘</li><li>文化在外面</li></ul>
            </div>
            <div className="contrast-arrow">→</div>
            <div className="contrast-card active">
              <span>走进工坊</span>
              <strong>我做过了</strong>
              <ul><li>按工序操作</li><li>错了再试本步</li><li>作品回到世界</li></ul>
            </div>
          </div>
        </div>
      </SlideFrame>

      {/* 冒险闭环：学习如何改变世界 */}
      <SlideFrame index={2} eyebrow="我的冒险怎么进行">
        <div className="center-heading">
          <span className="pitch-kicker">ADVENTURE LOOP</span>
          <h2>每学会一件事，世界就多一块看得见的变化。</h2>
        </div>
        <div className="loop-track">
          {[
            ["01", "找到工坊", "跟着路标和小机器人走"],
            ["02", "听懂工序", "先搞明白先后和材料"],
            ["03", "亲手试做", "操作有反馈，错了只重试这一步"],
            ["04", "盖上印记", "图鉴记下我学会的技艺"],
            ["05", "世界长大", "门架、展架、窗花出现了"],
          ].map(([index, title, copy]) => (
            <article key={index}>
              <span>{index}</span>
              <div className="loop-cube" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="loop-caption"><i /> 知识不是旁白，是我用来建造和探索的钥匙。</div>
      </SlideFrame>

      {/* 七座工坊内容矩阵 */}
      <SlideFrame index={3} eyebrow="七座工坊，七种动手方式">
        <div className="craft-layout craft-layout-wide">
          <div className="craft-heading">
            <span className="pitch-kicker">MY WORKSHOPS</span>
            <h2>今天我跑过七座工坊——每座都教我一种「手会记得」的事。</h2>
            <p>从木作、印刷、茶与影戏，到青瓷、剪纸和云锦：都从真实技艺出发，再变成我能玩完的关卡。</p>
          </div>
          <div className="craft-grid craft-grid-seven">
            {CRAFTS.map((craft) => (
              <article className={`craft-card ${craft.tone}`} key={craft.name}>
                <span>{craft.index}</span>
                <div className="craft-pixel" aria-hidden="true" />
                <h3>{craft.name}</h3>
                <p>{craft.verb}</p>
                <b>世界变化 · {craft.reward}</b>
              </article>
            ))}
          </div>
        </div>
      </SlideFrame>

      {/* 世界层新功能：沙盒 + 学习 + 成长 + 氛围 */}
      <SlideFrame index={4} eyebrow="这个世界还会陪着我">
        <div className="experience-layout">
          <VoxelScene variant="craft" />
          <div className="experience-copy">
            <span className="pitch-kicker">ONE WORLD, MANY FRIENDS</span>
            <h2>我可以乱跑，也可以安静学；<br />音乐、花草和小机器人都在。</h2>
            <div className="experience-list">
              <article>
                <span>01</span>
                <div>
                  <h3>沙盒层</h3>
                  <p>蓝天白云、花草树木；我跳、建、挖，按自己的好奇心走。</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>伙伴层</h3>
                  <p>茶客、讲解员、学徒……小方块机器人在附近巡逻，不挡路也不被我拆掉。</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>学习层</h3>
                  <p>按 E 进最近工坊，按 H 打开图鉴；走到不同区域，BGM 也会换一种心情。</p>
                </div>
              </article>
              <article>
                <span>04</span>
                <div>
                  <h3>成长层</h3>
                  <p>作品进博物馆，进度存在本机——明天打开，我的印记还在。</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </SlideFrame>

      {/* 技术：用孩子能懂的比喻说明浏览器原生能力 */}
      <SlideFrame index={5} eyebrow="支撑这场冒险的魔法">
        <div className="tech-layout">
          <div className="tech-copy">
            <span className="pitch-kicker">BROWSER-NATIVE VOXEL ENGINE</span>
            <h2>不用下载——点开链接，我就站在可扩展的方块世界里。</h2>
            <p>
              大人说：这是 Three.js、区块网格和 React。我只知道——转头还朝前走，手机也能玩，
              声音要我点一下才响，而且关了页面就不会一直叫。
            </p>
          </div>
          <div className="tech-stack" aria-label="技术能力">
            <article className="featured">
              <span>ENGINE</span><strong>Three.js</strong>
              <p>16×16 区块 · 暴露面剔除 · 单区块合并网格</p>
            </article>
            <article><span>WORLD</span><strong>Simplex + FBM</strong><p>确定性程序化地形与氛围</p></article>
            <article><span>PRODUCT</span><strong>React + TypeScript</strong><p>低频 UI 与高频渲染解耦</p></article>
            <article><span>ACCESS</span><strong>Desktop + Mobile</strong><p>键鼠与触控都能学完工序</p></article>
          </div>
        </div>
      </SlideFrame>

      {/* 路线：七项已落地，下一站写节庆与共创 */}
      <SlideFrame index={6} eyebrow="日记的下一页">
        <div className="roadmap-layout">
          <div className="roadmap-heading">
            <span className="pitch-kicker">ROADMAP</span>
            <h2>七座工坊已经开张——接下来想邀请更多人一起写故事。</h2>
          </div>
          <div className="roadmap-track">
            <article className="now">
              <span>NOW</span>
              <h3>我能玩完的闭环</h3>
              <p>体素探索、七项工坊、成长型博物馆、分区氛围、世界 NPC、桌面与移动端。</p>
              <b>可演示原型已就绪</b>
            </article>
            <article>
              <span>NEXT</span>
              <h3>想再学更深一点</h3>
              <p>节庆协作、茶类与青瓷进阶、皮影唱腔档案——和专业老师一起校核。</p>
              <b>把关卡做成可复用模板</b>
            </article>
            <article>
              <span>THEN</span>
              <h3>把一座馆变成一张网</h3>
              <p>主题展、研学任务、学校课程和社区传承记录，让更多孩子也能动手。</p>
              <b>共创可玩的数字传承</b>
            </article>
          </div>
        </div>
      </SlideFrame>

      {/* 邀请合作：仍用孩子口吻收尾 */}
      <SlideFrame index={7} eyebrow="想不想一起玩？" className="ask-slide">
        <VoxelScene variant="world" />
        <div className="ask-copy">
          <span className="pitch-kicker">BUILD THE LIVING MUSEUM</span>
          <h2>别只让文化「被看见」，<br />也让我们「亲手做过」。</h2>
          <p>
            我们在找非遗机构、学校、文化场馆和内容伙伴——一起把工序写清楚、把任务做好玩、
            把成果公开展示。欢迎先点进世界，跟我走一圈。
          </p>
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

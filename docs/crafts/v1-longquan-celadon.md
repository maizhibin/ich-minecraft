# v1 龙泉青瓷

> 状态：**已实现**（`app/heritage/crafts/porcelain-craft.tsx`）

## 定位

通过教学化窑场流程理解「泥 → 坯 → 釉 → 火」的技艺链条，而不是收集可交易瓷器。

## 世界落点

- 博物馆东侧「龙泉窑场」（约 x 48—58，z 6—16）。
- 工坊坐标：`(52.5, 10.5)`，track：`porcelain`。
- 资料：[UNESCO 龙泉青瓷传统烧制技艺](https://ich.unesco.org/en/RL/traditional-firing-technology-of-longquan-celadon-00205)

## 已实现工序

1. 备泥 2. 练泥 3. 制坯 4. 晾坯 5. 施釉 6. 装窑 7. 窑温曲线（升温/保温/降温）8. 开窑验坯  

失败策略：本步重试。印记「青瓷窑火」，奖励为窑旁展架。

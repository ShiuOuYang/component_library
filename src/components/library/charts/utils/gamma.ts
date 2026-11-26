/**
 * log Γ(x)（Lanczos 近似，g = 7、9 項，相對誤差約 1e-15）。
 *
 * 原本 spc.ts（c4 常數）與 correlation.ts（p 值的不完全 Beta）各有一份，係數與精度不同
 * （correlation 用的是 Numerical Recipes 的 6 項版本，誤差約 2e-10、x < 0.5 不準）。統一成這一份。
 */
const G = 7
const C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

export function logGamma(x: number): number {
  // 反射公式：Γ(x)Γ(1−x) = π / sin(πx)
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  const z = x - 1
  let a = C[0]
  const t = z + G + 0.5
  for (let i = 1; i < G + 2; i++) a += C[i] / (z + i)
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

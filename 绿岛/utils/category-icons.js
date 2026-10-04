// 分类图标：每个分类一个 SVG path
export const CATEGORY_ICONS = {
  food: 'M4 12h16c0 5-3 8-8 8s-8-3-8-8zm3-5v2m5-4v4m5-2v2M7 22h10',
  shopping: 'M5 8h14l-1 13H6L5 8zm4 0V6a3 3 0 0 1 6 0v2M9 13h6',
  life: 'M5 6h14v15H5zM8 6V3m8 3V3M8 11h3m-3 4h8',
  travel: 'M4 6h16v13H4zM4 11h16m-12 4h1m6 0h1M7 19v3m10-3v3',
  groceries: 'M12 21V10M12 15C4 16 3 7 4 5c7 0 10 4 8 10zm0-4c-1-5 4-8 8-8 0 5-2 8-8 8',
  fruit: 'M7 9c-5 4-3 12 5 12s10-8 5-12c-2-2-4 0-5 0s-3-2-5 0zm5 0V5m0 0c1-3 5-3 7-2-1 3-4 4-7 2',
  snack: 'M5 9h14l-2 12H7L5 9zm3-4 4-2 4 2-4 2-4-2M9 13v4m6-4v4',
  sport: 'M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10',
  fun: 'M4 8h16v11H4zM8 11v5m-2-2h4m5-2h1m1 3h1',
  phone: 'M7 3h10v18H7zM10 6h4m-3 12h2',
  clothes: 'M8 5l4 3 4-3 5 4-4 3-1-1v10H8V11l-1 1-4-3 5-4',
  beauty: 'M9 6l6-3v9H9V6zm-1 6h8v9H8zM10 16h4',
  housing: 'M3 11l9-7 9 7M6 10v11h12V10m-8 11v-6h4v6',
  home: 'M4 13h16v7H4zM7 13V7h10v6m-11 7v2m12-2v2M10 7v6',
  children: 'M5 13a7 7 0 1 0 14 0 7 7 0 0 0-14 0M9 12h1m4 0h1m-5 4q2 2 4 0M12 6q-3-2 0-4',
  family: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6m10 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-4q0-6 10-6m2 10v-5q0-4 8-3v8',
  social: 'M3 5h14v10H9l-4 4v-4H3V5zm14 4h4v12l-4-3h-5v-3',
  holiday: 'M5 7h14v14H5zM9 7V4h6v3m-7 4v6m8-6v6M8 21v1m8-1v1',
  digital: 'M3 5h15v12H3zM9 17v4m-3 0h6M21 9v11m-2-2h4',
  car: 'M4 12l3-6h10l3 6v7H4v-7zm0 0h16M7 16h2m6 0h2M6 19v2m12-2v2',
  medical: 'M4 7h16v14H4zM9 7V4h6v3M12 10v7m-3-3h6',
  books: 'M3 5q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1V5zm9 1v15',
  learning: 'M3 8l9-5 9 5-9 5-9-5zm4 3v6q5 4 10 0v-6m4-3v9',
  pets: 'M7 13q-5 3-2 7h14q3-4-2-7l-5-4-5 4M5 7v2m5-6v3m5-3v3m5 1v2',
  gifts: 'M4 9h16v12H4zM3 6h18v4H3zM12 6v15m0-15C5 6 5 1 8 2l4 4c7 0 7-5 4-4l-4 4',
  work: 'M4 8h16v13H4zM9 8V4h6v4M4 13h16m-10 0v3h4v-3',
  repair: 'M6 3l5 5-3 3-5-5 3-3zm4 7 11 11m-4-17 4 4-4 4-3-3-5 5',
  donation: 'M3 16h5l4 3 7-7 3 3-9 7H3v-6M12 12c-9-5-4-12 0-6 4-6 9 1 0 6',
  other: 'M4 7l8-4 8 4v13H4V7zm0 0 8 4 8-4m-8 4v9',
  salary: 'M4 6h16v15H4zM4 10h16m-4 5h1m-5-9V3m-3 0h6',
  parttime: 'M4 7h10v13H4zM7 7V4h4v3m6 3a5 5 0 1 0 5 5m-5-5v5h4',
  investment: 'M4 20h16M6 16v-4m5 4V9m5 7V6M5 7l6-3 5 1 5-3',
  giftmoney: 'M5 5h14v16H5zM5 5l7 6 7-6m-10 9h6m-3-2v6',
  incomeother: 'M4 14h16v7H4zM12 3v11m-4-4 4 4 4-4M8 18h8',
  settings: 'M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-6 2v4',
}

export function categoryIconUri(key, color = '#426052') {
  const p = CATEGORY_ICONS[key] || CATEGORY_ICONS.other
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
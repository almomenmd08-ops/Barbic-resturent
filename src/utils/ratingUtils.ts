export const getConsistentRandoms = (id: string | undefined | null) => {
  if (!id) return { rating: "4.5", count: 120 };
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const positiveHash = Math.abs(hash);
  const rating = 3.8 + (positiveHash % 12) / 10; // 3.8 to 4.9
  const count = 20 + (positiveHash % 49) * 10; // 20 to 500
  return { rating: rating.toFixed(1), count };
};

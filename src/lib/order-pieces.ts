export type OrderLinePieces = {
  setQuantity?: number;
  quantity?: number;
  piecesPerSet?: number;
  sizes?: string[];
};

export function linePieceCount(line: OrderLinePieces): number {
  const sets = Math.max(1, Number(line.setQuantity ?? line.quantity) || 0);
  const perSet = Math.max(
    1,
    line.piecesPerSet ?? (line.sizes?.length ? line.sizes.length : 1),
  );
  return sets * perSet;
}

export function sumOrderPieces(lines: OrderLinePieces[]): number {
  return lines.reduce((sum, line) => sum + linePieceCount(line), 0);
}

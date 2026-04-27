import { useState, useRef } from 'react';
import { Button, Container, Stack, Title, SimpleGrid, Paper, Text, Group, Box, Badge, Divider } from '@mantine/core';

// スコア定義
const SCORE_MAP: Record<string, number> = { red: 50, purple: 20, green: 10, none: 0 };

type Point = { x: number; y: number };

export default function App() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [bestPath, setBestPath] = useState<Point[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- 1. 画像解析（アップロードボタン用） ---
  const handleUpload = (file: File | null) => {
    if (!file) return;
    
    // 前回のデータをリセット
    setBestPath([]);
    setTotalScore(0);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const rows = 9;
      const cols = 7;
      // 座標は標準的なスクショ比率に基づき調整
      const startX = img.width * 0.12; 
      const startY = img.height * 0.28;
      const cellW = (img.width * 0.76) / cols;
      const cellH = (img.height * 0.50) / rows;

      let detectedChar: Point = { x: 3, y: 5 }; // デフォルト
      const newGrid: string[][] = [];

      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const x = startX + (c * cellW) + (cellW / 2);
          const y = startY + (r * cellH) + (cellH / 2);

          // デバッグ用：スキャンした場所に小さな点を描画して確認
          ctx.fillStyle = 'red';
          ctx.fillRect(x - 2, y - 2, 4, 4);

          const [red, green, blue] = ctx.getImageData(x, y, 1, 1).data;

          let type = 'green';
          if (red > 200 && green < 100) type = 'red';
          else if (red > 130 && blue > 150) type = 'purple';
          
          // キャラクター検知（オレンジ）
          if (red > 200 && green > 100 && green < 180 && blue < 100) {
            detectedChar = { x: c, y: r };
          }
          row.push(type);
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
      setStartPos(detectedChar);
    };
  };

  // --- 2. 最適ルート計算（Calcボタン用） ---
  const handleCalculate = () => {
    if (!grid.length || !startPos) return;
    setIsCalculating(true);

    // 重い処理なので少し遅延させてUIを更新
    setTimeout(() => {
      let maxS = -1;
      let bestP: Point[] = [];

      const solve = (curr: Point, steps: number, score: number, visited: Set<string>, path: Point[]) => {
        if (steps === 0) {
          if (score > maxS) {
            maxS = score;
            bestP = [...path];
          }
          return;
        }

        const dirs = [{x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
        for (const d of dirs) {
          const next = { x: curr.x + d.x, y: curr.y + d.y };
          if (next.x >= 0 && next.x < 7 && next.y >= 0 && next.y < 9) {
            const key = `${next.x},${next.y}`;
            const isNew = !visited.has(key);
            const s = isNew ? SCORE_MAP[grid[next.y][next.x]] : 0;

            visited.add(key);
            solve(next, steps - 1, score + s, visited, [...path, next]);
            visited.delete(key);
          }
        }
      };

      solve(startPos, 15, 0, new Set([`${startPos.x},${startPos.y}`]), [startPos]);
      setBestPath(bestP);
      setTotalScore(maxS);
      setIsCalculating(false);
    }, 100);
  };

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg">
        <Title order={2} c="yellow.5">真夏の園芸 攻略ツール</Title>

        <Group grow w="100%">
          <Button color="blue" onClick={() => document.getElementById('file-input')?.click()}>
            1. Upload Image
          </Button>
          <Button 
            color="orange" 
            disabled={grid.length === 0 || isCalculating} 
            loading={isCalculating}
            onClick={handleCalculate}
          >
            2. Calc Best Path
          </Button>
        </Group>

        <input id="file-input" type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] || null)} />

        {/* <canvas ref={canvasRef} style={{ display: 'none' }} /> */}

        {grid.length > 0 && (
          <Stack w="100%" gap="xs">
            <Divider label="Analysis Result" labelPosition="center" />
            
            <Group justify="space-between">
              <Text fw={700}>獲得スコア: <Text span c="yellow.5" fz="xl">{totalScore}</Text></Text>
              {startPos && <Badge variant="outline" color="orange">Start: {startPos.x},{startPos.y}</Badge>}
            </Group>

            <Paper withBorder p="xs" bg="dark.8">
              <SimpleGrid cols={7} spacing={4}>
                {grid.map((row, r) => row.map((type, c) => {
                  const pathIndex = bestPath.findIndex(p => p.x === c && p.y === r);
                  const isStart = startPos?.x === c && startPos?.y === r;

                  return (
                    <Box key={`${r}-${c}`} style={{ position: 'relative' }}>
                      <Paper
                        h={45}
                        bg={type === 'red' ? 'red.9' : type === 'purple' ? 'grape.9' : 'green.9'}
                        style={{ 
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          border: pathIndex >= 0 ? '2px solid white' : (isStart ? '2px solid orange' : 'none'),
                          opacity: pathIndex >= 0 || isStart ? 1 : 0.4
                        }}
                      >
                        {pathIndex >= 0 && <Text fw={900} fz="sm" c="white">{pathIndex}</Text>}
                        {isStart && pathIndex === -1 && <Text fz="xs">Start</Text>}
                      </Paper>
                    </Box>
                  );
                }))}
              </SimpleGrid>
            </Paper>
            <Text size="xs" c="dimmed">
              ※数字は移動順序を表します。0がスタート地点です。
            </Text>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
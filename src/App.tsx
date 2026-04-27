import { useState, useRef } from 'react';
import { Button, Container, Stack, Title, SimpleGrid, Paper, Text, Group, Box, Badge } from '@mantine/core';

// スコア定義
const SCORE_MAP: Record<string, number> = { red: 50, purple: 20, green: 10, none: 0 };

type Point = { x: number; y: number };

export default function App() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [bestPath, setBestPath] = useState<Point[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- 画像解析ロジック ---
  const handleUpload = (file: File | null) => {
    if (!file) return;
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
      const startX = img.width * 0.12; 
      const startY = img.height * 0.28;
      const cellW = (img.width * 0.76) / cols;
      const cellH = (img.height * 0.50) / rows;

      let charPos: Point = { x: 3, y: 4 }; // デフォルト位置
      const newGrid: string[][] = [];

      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const x = startX + (c * cellW) + (cellW / 2);
          const y = startY + (r * cellH) + (cellH / 2);
          const [red, green, blue] = ctx.getImageData(x, y, 1, 1).data;

          let type = 'green';
          if (red > 200 && green < 100) type = 'red';
          else if (red > 130 && blue > 150) type = 'purple';
          
          // キャラクター（オレンジの髪）の簡易検知
          if (red > 200 && green > 100 && green < 180 && blue < 100) {
            charPos = { x: c, y: r };
          }
          row.push(type);
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
      calculateBestPath(newGrid, charPos);
    };
  };

  // --- 最適ルート探索 (DFS) ---
  const calculateBestPath = (currentGrid: string[][], start: Point) => {
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
          const s = isNew ? SCORE_MAP[currentGrid[next.y][next.x]] : 0;

          visited.add(key);
          solve(next, steps - 1, score + s, visited, [...path, next]);
          visited.delete(key);
        }
      }
    };

    solve(start, 15, 0, new Set([`${start.x},${start.y}`]), [start]);
    setBestPath(bestP);
    setTotalScore(maxS);
  };

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg">
        <Title order={2} c="yellow.5">真夏の園芸 攻略ツール</Title>

        <Button size="lg" color="green" onClick={() => document.getElementById('file-input')?.click()}>
          スクリーンショットを解析
        </Button>
        <input id="file-input" type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] || null)} />

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {grid.length > 0 && (
          <Stack w="100%" gap="xs">
            <Group justify="space-between">
              <Text fw={700}>予測獲得スコア: <Text span c="yellow.5" fz="xl">{totalScore}</Text></Text>
              <Badge color="blue">15歩ルート算出済み</Badge>
            </Group>

            <Paper withBorder p="xs" bg="dark.8">
              <SimpleGrid cols={7} spacing={4}>
                {grid.map((row, r) => row.map((type, c) => {
                  const pathIndex = bestPath.findIndex(p => p.x === c && p.y === r);
                  return (
                    <Box key={`${r}-${c}`} style={{ position: 'relative' }}>
                      <Paper
                        h={45}
                        bg={type === 'red' ? 'red.9' : type === 'purple' ? 'grape.9' : 'green.9'}
                        style={{ 
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          border: pathIndex >= 0 ? '2px solid white' : 'none',
                          opacity: pathIndex >= 0 ? 1 : 0.4
                        }}
                      >
                        {pathIndex >= 0 && <Text fw={900} fz="sm">{pathIndex}</Text>}
                      </Paper>
                    </Box>
                  );
                }))}
              </SimpleGrid>
            </Paper>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
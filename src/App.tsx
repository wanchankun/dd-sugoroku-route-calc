import { useState, useRef } from 'react';
import { Button, Group, Stack, Container, SimpleGrid, Paper } from '@mantine/core';

export default function App() {
  const [grid, setGrid] = useState<string[][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleUpload = (file: File | null) => {
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      
      // 画像サイズを固定して解析精度を上げる
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const rows = 9;
      const cols = 7;
      
      // 画像内のグリッド位置（この数値はスクリーンショットに合わせて微調整が必要）
      const startX = img.width * 0.15; 
      const startY = img.height * 0.28;
      const cellW = (img.width * 0.7) / cols;
      const cellH = (img.height * 0.5) / rows;

      const newGrid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const x = startX + (c * cellW) + (cellW / 2);
          const y = startY + (r * cellH) + (cellH / 2);
          const [red, green, blue] = ctx.getImageData(x, y, 1, 1).data;

          // 色判定ロジック
          let color = 'gray'; // デフォルト（未解析）
          if (green > red && green > blue) color = 'green';
          if (red > 150 && blue > 150) color = 'violet';
          if (red > 200 && green < 100) color = 'red';
          
          row.push(color);
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    };
  };

  return (
    <Container size="sm" py="xl">
      <Stack>
        <Group justify="center">
          <Button onClick={() => document.getElementById('file-input')?.click()}>
            画像をアップロード
          </Button>
          <input 
            id="file-input" 
            type="file" 
            hidden 
            accept="image/*" 
            onChange={(e) => handleUpload(e.target.files?.[0] || null)} 
          />
        </Group>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <Paper withBorder p="md" bg="dark.7">
          <SimpleGrid cols={7} spacing="xs">
            {grid.flat().map((color, i) => (
              <Paper 
                key={i} 
                h={40} 
                bg={color === 'green' ? 'green.8' : color === 'red' ? 'red.8' : 'violet.8'} 
                withBorder 
              />
            ))}
          </SimpleGrid>
        </Paper>
      </Stack>
    </Container>
  );
}
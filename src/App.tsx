import { useState, useRef } from 'react';
import { Button, Container, Stack, Title, Paper, Text, Group, Box, LoadingOverlay, Image as MantineImage } from '@mantine/core';

const SCORE_MAP: Record<string, number> = { red: 50, purple: 20, green: 10, none: 0 };
type Point = { x: number; y: number };

export default function App() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);       
  const resultCanvasRef = useRef<HTMLCanvasElement>(null); 

  const handleUpload = (file: File | null) => {
    if (!file) return;
    setPreviewUrl(null);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const resCanvas = resultCanvasRef.current!;
      resCanvas.width = img.naturalWidth;
      resCanvas.height = img.naturalHeight;
      resCanvas.getContext('2d')!.drawImage(img, 0, 0);
      setPreviewUrl(resCanvas.toDataURL());

      const rows = 9;
      const cols = 7;
      const startX = canvas.width * 0.122; 
      const startY = canvas.height * 0.255;
      const cellW = (canvas.width * 0.833) / cols;
      const cellH = (canvas.height * 0.511) / rows;

      const newGrid: string[][] = [];
      const defaultStart: Point = { x: 3, y: 4 }; // constに修正してESLintエラーを回避

      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const x = startX + (c * cellW) + (cellW / 2);
          const y = startY + (r * cellH) + (cellH / 2);
          const [red, green, blue] = ctx.getImageData(x, y, 1, 1).data;

          let type = 'none';
          if (c === 3 && r === 4) {
            type = 'none';
          } else if (red > blue) {
            type = 'red';
          } else if (blue > green) {
            type = 'purple';
          } else if (blue / green < 0.7) {
            type = 'green';
          }
          row.push(type);
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
      // handleUpload 内、setGrid(newGrid) の直後
      console.table(newGrid); // グリッド全体の認識結果をコンソールに表形式で出す

      setStartPos(defaultStart);
    };
  };

  const drawRouteOnImage = (path: Point[]) => {
    const canvas = resultCanvasRef.current;
    const source = canvasRef.current;
    if (!canvas || !source || path.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.drawImage(source, 0, 0);

    const startX = canvas.width * 0.122; 
    const startY = canvas.height * 0.255;
    const cellW = (canvas.width * 0.833) / 7;
    const cellH = (canvas.height * 0.511) / 9;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    path.forEach((p, i) => {
      const x = startX + (p.x * cellW) + (cellW / 2);
      const y = startY + (p.y * cellH) + (cellH / 2);

      if (i > 0) {
        const prev = path[i - 1];
        const prevX = startX + (prev.x * cellW) + (cellW / 2);
        const prevY = startY + (prev.y * cellH) + (cellH / 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      ctx.fillStyle = i === 0 ? '#fd7e14' : 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), x, y);
    });
    
    setPreviewUrl(canvas.toDataURL());
  };

  const handleCalculate = () => {
    if (!grid.length || !startPos) return;
    setIsCalculating(true);

    setTimeout(() => {
      let maxS = -1;
      let bestP: Point[] = [];

      // スコア定義
      const CUSTOM_SCORE: Record<string, number> = { red: 50, purple: 20, green: 10, none: 0 };

      /**
       * @param curr 現在地
       * @param steps 残り歩数
       * @param currentScore 現在の合計スコア
       * @param redCount 通った赤箱の数
       * @param visited 訪問済み座標のセット（お宝の二重取り防止）
       * @param path ここまでの移動履歴
       * @param prevK 直前の座標キー（1歩戻るのを防止）
       */
      const solve = (
        curr: Point, 
        steps: number, 
        currentScore: number, 
        redCount: number, 
        visited: Set<string>, 
        path: Point[], 
        prevK: string
      ) => {
        
        // --- 評価タイミング ---
        // 「赤を2つ以上通っている」かつ「これまでの最大スコアより高い」なら更新
        // ここを steps === 0 の時だけに限定しないことで、15歩以内の最短高効率ルートも拾えます
        if (redCount >= 2) {
          if (currentScore > maxS) {
            maxS = currentScore;
            bestP = [...path];
          }
        }

        // ベースケース：歩数がなくなったら探索終了
        if (steps === 0) return;

        // 四方（下・左・右・上）を探索
        const dirs = [{x:0,y:1}, {x:-1,y:0}, {x:1,y:0}, {x:0,y:-1}];
        for (const d of dirs) {
          const next = { x: curr.x + d.x, y: curr.y + d.y };
          const nk = `${next.x},${next.y}`;

          // グリッド内かつ直前のマスに戻らない判定
          if (next.x >= 0 && next.x < 7 && next.y >= 0 && next.y < 9 && nk !== prevK) {
            const isNew = !visited.has(nk);
            const cellType = grid[next.y][next.x];
            
            // スコアと赤箱カウントの計算
            const point = isNew ? (CUSTOM_SCORE[cellType] || 0) : 0;
            const addedRed = (isNew && cellType === 'red') ? 1 : 0;

            // 訪問フラグを立てて進み、戻ってきたらフラグを消す（バックトラッキング）
            if (isNew) visited.add(nk);
            
            solve(
              next, 
              steps - 1, 
              currentScore + point, 
              redCount + addedRed, 
              visited, 
              [...path, next], 
              `${curr.x},${curr.y}`
            );
            
            if (isNew) visited.delete(nk);
          }
        }
      };

      // 探索実行（初期値：赤0、スコア0、初期位置を訪問済みにセット）
      const initialVisited = new Set<string>([`${startPos.x},${startPos.y}`]);
      solve(startPos, 15, 0, 0, initialVisited, [startPos], "");
      
      // 結果の反映
      setTotalScore(maxS);
      setIsCalculating(false);
      drawRouteOnImage(bestP);
    }, 10);
  };

  return (
    <Container size="xs" py="xl">
      <Stack align="center">
        <Title order={2} c="yellow.5">真夏の園芸 最適ルート</Title>
        <Group grow w="100%">
          <Button color="blue" onClick={() => document.getElementById('file-input')?.click()}>
            1. スクショUpload
          </Button>
          <Button color="orange" disabled={!grid.length || isCalculating} onClick={handleCalculate}>
            2. ルート計算
          </Button>
        </Group>
        <input id="file-input" type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] || null)} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas ref={resultCanvasRef} style={{ display: 'none' }} />
        <Box w="100%" pos="relative" mt="md">
          <LoadingOverlay visible={isCalculating} overlayProps={{ blur: 2 }} />
          {previewUrl ? (
            <Stack gap="xs">
              <Group justify="center">
                <Text fw={700} fz="lg">期待獲得スコア: <Text span c="yellow.5" fz="xl">{totalScore}</Text></Text>
              </Group>
              <Paper withBorder shadow="md" p={4} radius="md" bg="dark.7">
                <MantineImage src={previewUrl} radius="sm" />
              </Paper>
            </Stack>
          ) : (
            <Paper withBorder p="xl" bg="dark.8" style={{ borderStyle: 'dashed' }}>
              <Text c="dimmed" ta="center">スクリーンショットをアップロードしてください</Text>
            </Paper>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
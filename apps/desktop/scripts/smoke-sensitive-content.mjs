import { createHash } from "node:crypto";
import * as ort from "onnxruntime-web";
import sharp from "sharp";

const REVISION = "b2d8f0c3abe6e05062288460ecf58e42ea690e84";
const SHA256 =
  "7b81155313d894bba3a3b9bace059a6da2a0c509d10cea43fcb0b3c5a4edd26d";
const URL = `https://huggingface.co/Marqo/nsfw-image-detection-384/resolve/${REVISION}/onnx/model.onnx`;
const SIZE = 384;

function toTensor(rgb) {
  const plane = SIZE * SIZE;
  const values = new Float32Array(plane * 3);
  for (let pixel = 0; pixel < plane; pixel += 1) {
    values[pixel] = rgb[pixel * 3] / 127.5 - 1;
    values[plane + pixel] = rgb[pixel * 3 + 1] / 127.5 - 1;
    values[plane * 2 + pixel] = rgb[pixel * 3 + 2] / 127.5 - 1;
  }
  return new ort.Tensor("float32", values, [1, 3, SIZE, SIZE]);
}

async function main() {
  const response = await fetch(URL);
  if (!response.ok)
    throw new Error(`Model download failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== SHA256) throw new Error("Model checksum mismatch");

  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
  });
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  if (!inputName || !outputName) throw new Error("Model I/O is missing");

  const rgb = await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 3,
      background: { r: 120, g: 160, b: 200 },
    },
  })
    .resize(SIZE, SIZE, { fit: "cover", position: "centre", kernel: "cubic" })
    .raw()
    .toBuffer();
  const input = toTensor(rgb);
  const output = (await session.run({ [inputName]: input }))[outputName];
  if (output?.data.length !== 2) {
    throw new Error("Model returned an unexpected output");
  }
  const logits = Array.from(output.data, Number);
  if (!logits.every(Number.isFinite))
    throw new Error("Model returned invalid logits");
  console.log(
    JSON.stringify({
      ok: true,
      checksum,
      bytes: bytes.byteLength,
      logits,
    }),
  );
  input.dispose();
  output.dispose();
  await session.release();
}

await main();

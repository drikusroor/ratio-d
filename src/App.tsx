import { useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// Default export React component
export default function FixAspectTool() {
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [aspectChoice, setAspectChoice] = useState("16:9");
  const [customAspect, setCustomAspect] = useState("1.7778");
  const [log, setLog] = useState("");

  // Initialize ffmpeg (lazy)
  const load = async () => {
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }: { message: string }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
      setLog((prev) => prev + message + "\n");
    });
    
    try {
      // toBlobURL is used to bypass CORS issue, urls with the same
      // domain can be used directly.
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        workerURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          "text/javascript"
        ),
      });
      setReady(true);
    } catch (err) {
      console.error("Failed to load FFmpeg:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLog(`Failed to load FFmpeg: ${errorMessage}`);
      alert(`Failed to load FFmpeg. Please check the console for details.\n\nError: ${errorMessage}`);
    }
  };

  // handle file selection
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    // Preload ffmpeg when user picks a file
    if (!ready) {
      load().catch(console.error);
    }
  };

  // Parse aspect string like "16:9" to numeric ratio
  const parseAspect = (s: string) => {
    if (!s) return 16 / 9;
    if (s.includes(":")) {
      const [a, b] = s.split(":").map(Number);
      return a / b;
    }
    return Number(s) || 16 / 9;
  };

  // Main processing: pad (letterbox/pillarbox) to chosen aspect ratio
  const fixAspect = async () => {
    if (!ready) await load();
    const ffmpeg = ffmpegRef.current;
    if (!videoUrl) return alert("Please choose a video first");

    setLoading(true);
    setProgress(0);
    setLog("");
    setOutputUrl("");

    try {
      // Fetch original file as ArrayBuffer
      const res = await fetch(videoUrl);
      const data = await res.arrayBuffer();
      const inName = "input.mp4";
      const outName = "output_fixed.mp4";

      // write to FFmpeg FS
      await ffmpeg.writeFile(inName, new Uint8Array(data));

      // probe original dimensions using ffmpeg
      let meta = "";
      ffmpeg.on("log", ({ message }: { message: string }) => {
        // capture metadata lines during probe
        if (message) meta += message + "\n";
      });
      
      try {
        await ffmpeg.exec(["-i", inName]);
      } catch {
        // expected to throw because no output specified; metadata captured
      }

      // Extract width/height from metadata
      const match = meta.match(/, (\d{2,5})x(\d{2,5})/);
      let origW = 1280;
      let origH = 720;
      if (match) {
        origW = parseInt(match[1], 10);
        origH = parseInt(match[2], 10);
      }

      const targetAspect =
        aspectChoice === "custom" ? parseFloat(customAspect) : parseAspect(aspectChoice);

      // Compute target canvas size (we will pad — not crop or scale)
      const origAspect = origW / origH;
      let targetW: number;
      let targetH: number;
      if (origAspect > targetAspect) {
        // original is wider than target -> pad height
        targetW = origW;
        targetH = Math.round(origW / targetAspect);
      } else {
        // original is narrower than target -> pad width
        targetH = origH;
        targetW = Math.round(origH * targetAspect);
      }

      // Compose pad filter to center video and set sample aspect ratio 1:1
      const vf = `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

      // Run ffmpeg to create output
      await ffmpeg.exec([
        "-i",
        inName,
        "-vf",
        vf,
        "-c:a",
        "copy",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        outName
      ]);

      // read output and create blob url
      const outData = await ffmpeg.readFile(outName);
      const blob = new Blob([outData], { type: "video/mp4" });
      const outUrl = URL.createObjectURL(blob);
      setOutputUrl(outUrl);

      // cleanup FS entries (optional)
      try {
        await ffmpeg.deleteFile(inName);
        await ffmpeg.deleteFile(outName);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLog((l) => l + "\nError: " + errorMessage);
      alert("Processing failed — check the log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Fix Video Aspect Ratio (WASM FFmpeg)</h1>

      <div className="mb-4">
        <label htmlFor="video-input" className="block mb-2">Choose a video</label>
        <input id="video-input" type="file" accept="video/*" onChange={onFileChange} />
      </div>

      {videoUrl && (
        <div className="mb-4">
          <p className="block mb-2">Preview original</p>
          <video src={videoUrl} controls className="w-full rounded">
            <track kind="captions" />
          </video>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="aspect-select" className="block mb-2">Target aspect</label>
          <select
            id="aspect-select"
            value={aspectChoice}
            onChange={(e) => setAspectChoice(e.target.value)}
            className="w-full p-2 rounded"
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="2.39">2.39 (Cinema)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {aspectChoice === "custom" && (
          <div>
            <label htmlFor="custom-aspect" className="block mb-2">Custom aspect (ratio number, e.g. 1.7778)</label>
            <input
              id="custom-aspect"
              value={customAspect}
              onChange={(e) => setCustomAspect(e.target.value)}
              className="w-full p-2 rounded"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <button
          type="button"
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          onClick={fixAspect}
          disabled={loading || !videoUrl}
        >
          {loading ? `Processing (${progress}%)` : "Fix aspect"}
        </button>

        <button
          type="button"
          className="px-4 py-2 rounded bg-gray-100"
          onClick={() => {
            setVideoUrl("");
            setFileName("");
            setOutputUrl("");
            setLog("");
          }}
        >
          Reset
        </button>

        {!ready && (
          <button
            type="button"
            className="px-4 py-2 rounded bg-green-500 text-white"
            onClick={load}
            disabled={loading}
          >
            Load FFmpeg (lazy)
          </button>
        )}
      </div>

      {outputUrl && (
        <div className="mb-4">
          <p className="block mb-2">Result preview</p>
          <video src={outputUrl} controls className="w-full rounded mb-2">
            <track kind="captions" />
          </video>
          <a href={outputUrl} download={`fixed-${fileName || "video"}`} className="underline">
            Download fixed video
          </a>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <div>FFmpeg ready: {ready ? "yes" : "no"}</div>
        <div>Progress: {progress}%</div>
        <details className="mt-2">
          <summary className="cursor-pointer">Log</summary>
          <pre className="whitespace-pre-wrap max-h-64 overflow-auto p-2 bg-black text-white rounded mt-2">
            {log}
          </pre>
        </details>
      </div>

      <p ref={messageRef} className="hidden" />

      <div className="mt-6 text-xs text-gray-500">
        <p>
          Notes: This tool pads (letterbox/pillarbox) the original video to the chosen aspect ratio
          without cropping. It uses libx264 for the output codec. Large files may use significant
          memory and CPU in the browser.
        </p>
      </div>
    </div>
  );
}

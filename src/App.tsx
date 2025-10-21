import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

type AspectRatio = {
  label: string;
  ratio: string;
  width: number;
  height: number;
};

type FitMode = {
  label: string;
  value: string;
  description: string;
};

const ASPECT_RATIOS: AspectRatio[] = [
  { label: "16:9 (Widescreen)", ratio: "16:9", width: 1920, height: 1080 },
  { label: "9:16 (Vertical/TikTok)", ratio: "9:16", width: 1080, height: 1920 },
  { label: "1:1 (Square/Instagram)", ratio: "1:1", width: 1080, height: 1080 },
  { label: "4:3 (Classic TV)", ratio: "4:3", width: 1440, height: 1080 },
  { label: "21:9 (Ultrawide)", ratio: "21:9", width: 2560, height: 1080 },
  { label: "4:5 (Instagram Portrait)", ratio: "4:5", width: 1080, height: 1350 },
];

const FIT_MODES: FitMode[] = [
  {
    label: "Pad (Add Black Bars)",
    value: "pad",
    description: "Adds black bars to maintain aspect ratio",
  },
  {
    label: "Crop (Fill Frame)",
    value: "crop",
    description: "Crops video to fill the frame",
  },
  {
    label: "Stretch",
    value: "stretch",
    description: "Stretches video to fill the frame",
  },
];

function App() {
  const [loading, setLoading] = useState(true);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedVideoURL, setUploadedVideoURL] = useState<string>("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [selectedFitMode, setSelectedFitMode] = useState<FitMode>(FIT_MODES[0]);
  const [processing, setProcessing] = useState(false);
  const [processedVideoURL, setProcessedVideoURL] = useState<string>("");
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
    });
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
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setUploadedVideo(file);
      const url = URL.createObjectURL(file);
      setUploadedVideoURL(url);
      setProcessedVideoURL(""); // Reset processed video
    } else {
      alert("Please upload a valid video file");
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setUploadedVideo(file);
      const url = URL.createObjectURL(file);
      setUploadedVideoURL(url);
      setProcessedVideoURL(""); // Reset processed video
    } else {
      alert("Please upload a valid video file");
    }
  };

  const convertVideoAspectRatio = async () => {
    if (!uploadedVideo) return;
    
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    const inputFileName = uploadedVideo.name;
    const outputFileName = `ratio-d_${selectedAspectRatio.ratio.replace(":", "x")}_${selectedFitMode.value}_${Date.now()}.mp4`;
    
    try {
      await ffmpeg.writeFile(inputFileName, await fetchFile(uploadedVideo));
      
      // Build FFmpeg filter based on fit mode
      let videoFilter = "";
      switch (selectedFitMode.value) {
        case "pad":
          // Add black bars (letterbox/pillarbox)
          videoFilter = `scale=${selectedAspectRatio.width}:${selectedAspectRatio.height}:force_original_aspect_ratio=decrease,pad=${selectedAspectRatio.width}:${selectedAspectRatio.height}:(ow-iw)/2:(oh-ih)/2`;
          break;
        case "crop":
          // Crop to fill frame
          videoFilter = `scale=${selectedAspectRatio.width}:${selectedAspectRatio.height}:force_original_aspect_ratio=increase,crop=${selectedAspectRatio.width}:${selectedAspectRatio.height}`;
          break;
        case "stretch":
          // Stretch to fill frame (ignore aspect ratio)
          videoFilter = `scale=${selectedAspectRatio.width}:${selectedAspectRatio.height}`;
          break;
        default:
          videoFilter = `scale=${selectedAspectRatio.width}:${selectedAspectRatio.height}:force_original_aspect_ratio=decrease,pad=${selectedAspectRatio.width}:${selectedAspectRatio.height}:(ow-iw)/2:(oh-ih)/2`;
      }
      
      // FFmpeg command to convert aspect ratio
      await ffmpeg.exec([
        "-i", inputFileName,
        "-vf", videoFilter,
        "-c:a", "copy",
        outputFileName
      ]);
      
      const fileData = await ffmpeg.readFile(outputFileName);
      const data = new Uint8Array(fileData as ArrayBuffer);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      
      setProcessedVideoURL(url);
      
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Failed to process video. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadProcessedVideo = () => {
    if (!processedVideoURL) return;
    
    const a = document.createElement("a");
    a.href = processedVideoURL;
    a.download = `ratio-d_${selectedAspectRatio.ratio.replace(":", "x")}_${selectedFitMode.value}_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Ratio-D - Video Aspect Ratio Converter
        </h1>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">
                Loading FFmpeg...
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This may take a few moments
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Side - Forms */}
            <div className="w-full lg:w-1/2 space-y-6">
              {/* Upload Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Upload Video
                </h2>
                
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition duration-200 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold text-purple-600">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    Any video format (MP4, AVI, MOV, etc.)
                  </p>
                </div>

                {uploadedVideo && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">
                      <span className="font-semibold">Uploaded:</span>{" "}
                      {uploadedVideo.name} (
                      {(uploadedVideo.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Aspect Ratio Selection */}
              {uploadedVideoURL && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Select Target Aspect Ratio
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {ASPECT_RATIOS.map((aspectRatio) => (
                      <button
                        key={aspectRatio.ratio}
                        onClick={() => setSelectedAspectRatio(aspectRatio)}
                        className={`p-4 rounded-lg border-2 transition duration-200 ${
                          selectedAspectRatio.ratio === aspectRatio.ratio
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-300 hover:border-purple-400"
                        }`}
                      >
                        <div className="font-semibold text-gray-800">
                          {aspectRatio.label}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {aspectRatio.width} × {aspectRatio.height}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fit Mode Selection */}
              {uploadedVideoURL && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Select Fit Mode
                  </h2>
                  <div className="space-y-3">
                    {FIT_MODES.map((fitMode) => (
                      <button
                        key={fitMode.value}
                        onClick={() => setSelectedFitMode(fitMode)}
                        className={`w-full p-4 rounded-lg border-2 transition duration-200 text-left ${
                          selectedFitMode.value === fitMode.value
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-300 hover:border-purple-400"
                        }`}
                      >
                        <div className="font-semibold text-gray-800">
                          {fitMode.label}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {fitMode.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={convertVideoAspectRatio}
                    disabled={processing}
                    className={`mt-6 w-full font-semibold py-3 px-6 rounded-lg transition duration-200 ${
                      processing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {processing ? "Converting..." : `Convert to ${selectedAspectRatio.ratio}`}
                  </button>
                </div>
              )}
            </div>

            {/* Right Side - Video Previews */}
            <div className="w-full lg:w-1/2 space-y-6">
              {/* Uploaded Video Preview */}
              {uploadedVideoURL && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Original Video Preview
                  </h2>
                  <video
                    src={uploadedVideoURL}
                    controls
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {/* Processed Video Output */}
              {processedVideoURL && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Converted Video ({selectedAspectRatio.ratio})
                  </h2>
                  <video ref={videoRef} src={processedVideoURL} controls className="w-full rounded-lg mb-4"></video>
                  
                  <button
                    onClick={downloadProcessedVideo}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                  >
                    Download Converted Video
                  </button>
                  
                  {messageRef.current?.innerHTML && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-mono" ref={messageRef}></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
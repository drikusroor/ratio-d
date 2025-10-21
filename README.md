# Ratio-D 🎬

A browser-based video aspect ratio converter that allows you to transform videos to different aspect ratios directly in your browser—no server uploads required!

## 📖 Description

Ratio-D is a privacy-focused video conversion tool that processes videos entirely client-side using WebAssembly. Upload your video, select your target aspect ratio (16:9, 9:16, 1:1, etc.), choose how to fit the content (pad, crop, or stretch), and download your converted video—all without ever uploading your content to a server.

## ✨ Features

- **🔒 Privacy-First**: All video processing happens in your browser
- **🎯 Multiple Aspect Ratios**: Support for common formats including:
  - 16:9 (Widescreen)
  - 9:16 (Vertical/TikTok)
  - 1:1 (Square/Instagram)
  - 4:3 (Classic TV)
  - 21:9 (Ultrawide)
  - 4:5 (Instagram Portrait)
- **📐 Flexible Fit Modes**:
  - **Pad**: Add black bars to maintain original aspect ratio
  - **Crop**: Fill the frame by cropping excess content
  - **Stretch**: Stretch the video to fill the frame
- **👀 Live Preview**: Compare original and converted videos side-by-side
- **📥 Drag & Drop**: Easy file upload with drag-and-drop support
- **💾 Instant Download**: Download converted videos immediately

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/) with TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/) (using Rolldown)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Video Processing**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - WebAssembly port of FFmpeg
- **Code Quality**: 
  - [Biome](https://biomejs.dev/) for linting and formatting
  - [ESLint](https://eslint.org/) with TypeScript support
  - [React Compiler](https://react.dev/learn/react-compiler) enabled

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)
- Modern web browser with SharedArrayBuffer support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ratio-d.git
cd ratio-d
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
bun run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
bun run preview
```

## 📝 Usage

1. **Upload a Video**: Click the upload area or drag and drop a video file
2. **Select Aspect Ratio**: Choose your target aspect ratio from the available options
3. **Choose Fit Mode**: Select how the video should be fitted:
   - Pad for letterboxing/pillarboxing
   - Crop to fill the frame
   - Stretch to ignore aspect ratio
4. **Convert**: Click the convert button and wait for processing
5. **Preview & Download**: View the converted video and download when satisfied

## 🔧 Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Lint code with Biome
- `bun run lint:fix` - Lint and auto-fix issues with Biome

## 🌐 Browser Compatibility

This application requires browsers that support SharedArrayBuffer for FFmpeg.wasm to work. Most modern browsers support this, but you may need to serve the application with specific COOP/COEP headers (already configured in the Vite dev server).

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👤 Author

Drikus Roor, with the help of GitHub Copilot

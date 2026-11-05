import React, { useState, useRef } from 'react';
import { ImageRecord } from '../../types';
import { requestImageGeneration } from '../../services/ai';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Sparkles,
  Search,
  X,
  MessageSquare,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ImageWorkspaceProps {
  images: ImageRecord[];
  onAddImage: (imgData: Omit<ImageRecord, 'id' | 'userId' | 'createdAt'>) => Promise<ImageRecord>;
  onDeleteImage: (id: string) => Promise<void>;
  onAnalyzeImageInChat: (img: ImageRecord) => void;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  images,
  onAddImage,
  onDeleteImage,
  onAnalyzeImageInChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<ImageRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await onAddImage({
          name: file.name,
          dataUrl,
          isGenerated: false
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationNotice(null);

    try {
      const result = await requestImageGeneration(prompt.trim());
      if (result.success && result.data) {
        // Upstream generated image
        const imgUrl = result.data[0]?.url || result.data[0]?.b64_json;
        if (imgUrl) {
          await onAddImage({
            name: `Generated: ${prompt.slice(0, 24)}`,
            dataUrl: imgUrl,
            prompt: prompt.trim(),
            isGenerated: true
          });
          setPrompt('');
        }
      }
    } catch (err: any) {
      // Respect Section 11: Display honest unavailable state
      setGenerationNotice(
        err.message ||
        'Image generation is currently inactive on the backend endpoint. Vision understanding and multi-modal image inspection remain fully operational.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (img: ImageRecord) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = img.name.replace(/\s+/g, '_') + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.prompt && img.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#383838]">
        <div>
          <h1 className="text-xl font-semibold text-[#F2F0ED] tracking-tight">Images & Vision Workspace</h1>
          <p className="text-xs text-[#A5A29F] mt-1">
            Upload images for multi-modal vision analysis or configure image generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:brightness-110 active:scale-95"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Generation Bar / Notice */}
      <div className="my-5 p-4 rounded-xl border border-[#383838]" style={{ backgroundColor: '#242424' }}>
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Sparkles className="w-4 h-4 text-[#DA4B2A] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Describe an image to generate with compatible provider..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
            />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-40 hover:brightness-110"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying...
              </span>
            ) : (
              <span>Generate</span>
            )}
          </button>
        </form>

        {generationNotice && (
          <div className="mt-3 p-3 rounded-lg bg-[#292929] border border-[#383838] flex items-start gap-2 text-xs text-[#A5A29F] animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#DA4B2A] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[#F2F0ED] font-medium">Notice on Image Generation: </span>
              <span>{generationNotice}</span>
            </div>
            <button
              onClick={() => setGenerationNotice(null)}
              className="text-[#77736F] hover:text-[#F2F0ED] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Search / Filter bar */}
      <div className="pb-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#77736F] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search images by name or prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
          />
        </div>
      </div>

      {/* Image Gallery */}
      {filteredImages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#383838] rounded-2xl my-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#292929' }}
          >
            <ImageIcon className="w-6 h-6 text-[#DA4B2A]" />
          </div>
          <h3 className="text-sm font-semibold text-[#F2F0ED]">No images in workspace</h3>
          <p className="text-xs text-[#A5A29F] mt-1 max-w-sm">
            Upload images from your device to analyze them with vision models, or inspect visual history.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#F2F0ED] border border-[#383838] hover:border-[#DA4B2A] transition-colors"
            style={{ backgroundColor: '#292929' }}
          >
            Upload First Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-[#383838] overflow-hidden group transition-all hover:border-[#DA4B2A]/70 flex flex-col"
              style={{ backgroundColor: '#292929' }}
            >
              {/* Thumbnail Container */}
              <div
                className="relative aspect-square overflow-hidden cursor-pointer bg-[#202020]"
                onClick={() => setSelectedLightboxImage(img)}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-xs text-white bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-xs">
                    View Fullscreen
                  </span>
                </div>
              </div>

              {/* Image info & Actions */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#F2F0ED] truncate" title={img.name}>
                    {img.name}
                  </h4>
                  <div className="text-[11px] text-[#77736F] mt-0.5">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-[#383838]/60">
                  <button
                    onClick={() => onAnalyzeImageInChat(img)}
                    className="flex items-center gap-1 text-[11px] text-[#A5A29F] hover:text-[#DA4B2A] transition-colors"
                    title="Analyze with Vision Model in Chat"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Analyze</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(img)}
                      className="p-1.5 text-[#77736F] hover:text-[#F2F0ED] rounded transition-colors"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteImage(img.id)}
                      className="p-1.5 text-[#77736F] hover:text-[#DA4B2A] rounded transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {selectedLightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedLightboxImage(null)}
              className="absolute -top-10 right-0 text-[#F2F0ED] hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedLightboxImage.dataUrl}
              alt={selectedLightboxImage.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-[#383838]"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center justify-between w-full mt-3 px-2">
              <span className="text-xs text-[#F2F0ED] font-medium truncate max-w-md">
                {selectedLightboxImage.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toAnalyze = selectedLightboxImage;
                    setSelectedLightboxImage(null);
                    onAnalyzeImageInChat(toAnalyze);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: '#DA4B2A' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Analyze in Chat</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedLightboxImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F2F0ED] border border-[#383838] hover:border-[#DA4B2A]"
                  style={{ backgroundColor: '#292929' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

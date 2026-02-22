import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

type AnalysisType = "text" | "image";

export default function AnalyzePage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("text");
  const [textContent, setTextContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<Id<"analyses"> | null>(null);

  const createAnalysis = useMutation(api.analyses.create);
  const analysisResult = useQuery(
    api.analyses.get,
    currentAnalysisId ? { id: currentAnalysisId } : "skip"
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (analysisType === "text" && !textContent.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    if (analysisType === "image" && !imageFile) {
      toast.error("Please upload an image to analyze");
      return;
    }

    setIsAnalyzing(true);
    setCurrentAnalysisId(null);

    try {
      const content = analysisType === "text" ? textContent : imageFile?.name || "image";
      const id = await createAnalysis({
        type: analysisType,
        content: content,
      });

      setCurrentAnalysisId(id);
      toast.success("Analysis complete!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Analysis failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setTextContent("");
    setImageFile(null);
    setImagePreview(null);
    setCurrentAnalysisId(null);
  };

  return (
    <div className="w-full py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Analyze Content
          </h1>
          <p className="text-xl text-gray-600">
            Upload text or images to detect fake news with AI-powered analysis
          </p>
        </div>

        {/* Analysis Type Selector */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => {
              setAnalysisType("text");
              handleReset();
            }}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              analysisType === "text"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Text Analysis</span>
          </button>
          <button
            onClick={() => {
              setAnalysisType("image");
              handleReset();
            }}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              analysisType === "image"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Image Analysis</span>
          </button>
        </div>

        {/* Input Section */}
        <div className="rounded-2xl p-8 bg-white border border-gray-200 shadow-xl mb-8">
          {analysisType === "text" ? (
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Paste Text Content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                placeholder="Paste the news article, social media post, or any text you want to verify..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Upload Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (analysisType === "text" && !textContent.trim()) || (analysisType === "image" && !imageFile)}
            className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze Content</span>
            )}
          </button>
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="rounded-2xl p-8 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Analysis Results
            </h2>

            <div className="space-y-6">
              {/* Result Badge */}
              <div className="flex items-center justify-center">
                <div
                  className={`inline-flex items-center space-x-3 px-8 py-4 rounded-full text-2xl font-bold ${
                    analysisResult.result === "Real"
                      ? "bg-green-100 text-green-800"
                      : analysisResult.result === "Fake"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {analysisResult.result === "Real" ? (
                    <CheckCircle className="w-8 h-8" />
                  ) : analysisResult.result === "Fake" ? (
                    <XCircle className="w-8 h-8" />
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  )}
                  <span>{analysisResult.result}</span>
                </div>
              </div>

              {/* Confidence Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold text-gray-900">
                    Confidence Score
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(analysisResult.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      analysisResult.result === "Real"
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : "bg-gradient-to-r from-red-500 to-red-600"
                    }`}
                    style={{ width: `${analysisResult.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What does this mean?
                </h3>
                <p className="text-gray-700">
                  {analysisResult.result === "Real"
                    ? "Our AI models have analyzed the content and found it to be likely authentic. The confidence score indicates how certain the model is about this classification."
                    : analysisResult.result === "Fake"
                    ? "Our AI models have detected patterns commonly associated with misinformation. The confidence score indicates how certain the model is about this classification. We recommend verifying this content through additional sources."
                    : "Analysis is still in progress. Please wait..."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  Analyze Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-2">
            Note: AI Model Integration
          </h3>
          <p className="text-gray-700">
            This demo uses simulated results. To connect real AI models for text and image analysis, you'll need to integrate services like OpenAI, Hugging Face, or custom-trained models through the backend.
          </p>
        </div>
      </div>
    </div>
  );
}

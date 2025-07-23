import { Settings } from "lucide-react";
import { ConfigurationPanel } from "@/components/configuration-panel";

export default function AwsConfigPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Settings className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ AWS Configuration</h1>
            <p className="text-gray-600">Manage your AWS S3 bucket connections and settings</p>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <ConfigurationPanel onRefreshStateChange={() => {}} />
    </div>
  );
}
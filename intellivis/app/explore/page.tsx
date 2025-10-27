'use client';

import ZipExplorer from '../components/ZipExplorer';

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">OpenGIN</span>
              <span className="text-2xl font-light text-gray-300">Intellivis</span>
            </a>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="/" className="text-gray-300 hover:text-white transition-colors duration-200">
              Home
            </a>
            <a href="/upload" className="text-gray-300 hover:text-white transition-colors duration-200">
              Upload
            </a>
            <a href="/visualize" className="text-gray-300 hover:text-white transition-colors duration-200">
              Visualize
            </a>
            <a href="/explore" className="text-blue-400 font-medium">
              XploreData
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <ZipExplorer />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500">
            © 2024 OpenGIN Intellivis. Advanced data processing and visualization platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

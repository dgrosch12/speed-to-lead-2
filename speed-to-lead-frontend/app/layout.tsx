import './globals.css'

export const metadata = {
  title: 'Speed to Lead - Workflow Manager',
  description: 'Create and manage Speed to Lead automations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-dark-900 relative">
          {/* Ambient background gradient */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary-500/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-accent-500/5 rounded-full blur-3xl"></div>
          </div>

          <nav className="relative border-b border-dark-700 bg-dark-800/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-20">
                <div className="flex items-center">
                  <a href="/dashboard" className="group flex items-center space-x-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">
                        🏃‍♂️💨📞
                      </div>
                      <h1 className="text-lg font-semibold text-gray-100">
                        Speed to Lead
                      </h1>
                    </div>
                  </a>
                </div>
                <div className="flex items-center space-x-6">
                  <a
                    href="/dashboard"
                    className="text-gray-200 hover:text-primary-300 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-dark-700 font-semibold"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/create"
                    className="btn btn-primary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Client
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main className="relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
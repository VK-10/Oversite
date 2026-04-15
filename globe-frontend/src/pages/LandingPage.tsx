import { Link } from 'react-router-dom'

const LandingPage = () => {
  return (
    <div className='relative bg-gradient-to-br from-violet-50 via-white to-purple-50 overflow-hidden'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32 relative'>
            <div className = "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <header>
                    OverSite
                </header>
                <main>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Link to={"/globe"} className="">
                    <span className="group inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-200">Start Exploring the world</span>
                    </Link>
                </div>
                </main>
            </div>
        </div>
    </div>
  )
}

export default LandingPage
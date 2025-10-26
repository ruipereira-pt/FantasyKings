import { Trophy, Users, Target, Zap, TrendingUp, Calendar } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40"></div>

      <div className="relative">
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">FantasyKings.com</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-6 py-2 bg-white text-slate-900 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
          >
            Sign In
          </button>
        </nav>

        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Build Your Dream
              <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Fantasy Team
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Compete with players worldwide. Pick your favorite tennis stars, manage your budget, and climb the leaderboard. Completely free to play.
            </p>
            <button
              onClick={onGetStarted}
              className="group px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-2xl shadow-emerald-500/30"
            >
              <span className="flex items-center space-x-2">
                <span>Start Playing Free</span>
                <Zap className="h-5 w-5 group-hover:animate-pulse" />
              </span>
            </button>
            <p className="text-slate-400 mt-4">No credit card required. Play instantly.</p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-500/10 group">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Pick Your Stars</h3>
              <p className="text-slate-300 leading-relaxed">
                Choose from 200+ professional tennis players. Build your perfect lineup with a 100-coin budget. Strategic decisions make winners.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-500/10 group">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Track Live Scores</h3>
              <p className="text-slate-300 leading-relaxed">
                Follow real-time rankings and tournament results. Watch your team climb the leaderboard as matches unfold.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-500/10 group">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Compete Globally</h3>
              <p className="text-slate-300 leading-relaxed">
                Join competitions with tennis fans worldwide. Prove your tennis knowledge and dominate the global rankings.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
              How It Works
            </h2>
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex-1 bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
                  <h3 className="text-2xl font-bold text-white mb-3">Create Your Account</h3>
                  <p className="text-slate-300 text-lg">
                    Sign up in seconds with just your email. No complex forms, no waiting. Start building your team immediately.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex-1 bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
                  <h3 className="text-2xl font-bold text-white mb-3">Build Your Dream Team</h3>
                  <p className="text-slate-300 text-lg">
                    Select 5 players from the world rankings. Each player has a price based on their ranking. Stay within your 100-coin budget.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex-1 bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
                  <h3 className="text-2xl font-bold text-white mb-3">Compete & Win</h3>
                  <p className="text-slate-300 text-lg">
                    Earn points as your players win tournaments and climb rankings. Compete in weekly, monthly, and seasonal competitions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-3xl p-12 text-center shadow-2xl">
            <Calendar className="h-16 w-16 text-white mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              128 Tournaments, 2 Seasons
            </h2>
            <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
              Complete coverage through 2026. From Grand Slams to Masters 1000. Every match counts. Every tournament matters.
            </p>
            <button
              onClick={onGetStarted}
              className="px-12 py-5 bg-white text-emerald-600 font-bold text-lg rounded-xl hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-xl"
            >
              Join the Competition
            </button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <Trophy className="h-20 w-20 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Dominate?
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              Join thousands of tennis fans competing for glory. Free to play, easy to master, impossible to put down.
            </p>
            <button
              onClick={onGetStarted}
              className="px-12 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-2xl shadow-emerald-500/30"
            >
              Start Your Journey
            </button>
          </div>
        </section>

        <footer className="container mx-auto px-4 py-12 border-t border-slate-800">
          <div className="text-center text-slate-400">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Trophy className="h-6 w-6 text-emerald-400" />
              <span className="text-lg font-semibold text-white">FantasyKings.com</span>
            </div>
            <p>&copy; 2025 FantasyKings.com. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

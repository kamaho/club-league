import React from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { ChevronLeft, Star, TrendingUp, Users, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RatingInfo: React.FC = () => {
  return (
    <Layout>
      <div className="mb-6">
        <Link to="/profile" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to Profile
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Rating System Explained</h1>
        <p className="text-slate-500 text-sm">How we calculate your skill level</p>
      </div>

      <div className="space-y-6">
        
        {/* The Star System */}
        <Card className="border-l-4 border-l-yellow-400">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-100 p-3 rounded-full text-yellow-600 shrink-0">
               <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">The Star System (0-10)</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Every time you record a match result, your level updates. The better you perform, the more stars you earn.
                Most club players range between 1 and 4 stars. Elite club players can reach 6 stars, while world-class players reach 10.
              </p>
              
              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-100 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">Stars</th>
                      <th className="px-3 py-2">Men</th>
                      <th className="px-3 py-2">Women & Jr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                     <tr className="bg-yellow-50/50"><td className="px-3 py-2 font-bold text-yellow-600">10</td><td className="px-3 py-2">-</td><td className="px-3 py-2">-</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">9</td><td className="px-3 py-2">Regional</td><td className="px-3 py-2">National</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">8</td><td className="px-3 py-2">Elite</td><td className="px-3 py-2">Regional</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">7</td><td className="px-3 py-2">Master</td><td className="px-3 py-2">Elite</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">6</td><td className="px-3 py-2">Expert</td><td className="px-3 py-2">Master</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">5</td><td className="px-3 py-2">Advanced</td><td className="px-3 py-2">Expert</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">4</td><td className="px-3 py-2">High</td><td className="px-3 py-2">Advanced</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">3</td><td className="px-3 py-2">Intermediate</td><td className="px-3 py-2">High</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">2</td><td className="px-3 py-2">Basic</td><td className="px-3 py-2">Interm.</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-yellow-600">1</td><td className="px-3 py-2">Beginner</td><td className="px-3 py-2">Basic</td></tr>
                     <tr><td className="px-3 py-2 font-bold text-slate-400">0</td><td className="px-3 py-2 text-slate-500">Novice</td><td className="px-3 py-2 text-slate-500">Beginner</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>

        {/* Expected Score */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-lime-100 p-3 rounded-full text-lime-600 shrink-0">
               <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Expected Performance</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your level increases if you perform better than expected.
                For example, if you are a 3-star player and beat another 3-star player, your level rises.
                Even if you lose, your level can go up if you lose by a smaller margin than expected against a much stronger opponent (e.g., a close loss to a 4-star player).
              </p>
            </div>
          </div>
        </Card>

        {/* Gender Neutral */}
        <Card>
           <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 shrink-0">
               <Users size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Gender Neutral Ranking</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                Our system is designed so that a match between a man and a woman with the same star rating should be balanced.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Because men generally have higher physical baselines in the sport, the level descriptions (e.g., "Regional" vs "National") differ by gender to ensure the <strong>Stars</strong> represent the same absolute skill level.
              </p>
            </div>
          </div>
        </Card>

        {/* For Nerds */}
        <Card className="bg-slate-900 text-slate-300">
           <div className="flex items-start gap-4">
            <div className="bg-slate-800 p-3 rounded-full text-slate-400 shrink-0">
               <Calculator size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white mb-2">For Nerds...</h3>
              <p className="text-sm leading-relaxed mb-3">
                We use Bayesian statistics and advanced mathematical models to estimate skill levels based on match results. 
                Our algorithms use normal distributions to update a player's estimated mean and variance.
              </p>
              <p className="text-sm leading-relaxed">
                We transform all player levels into a standard normal distribution (Mean = 0). From this, we calculate the Z-factor:
              </p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1 text-slate-400 font-mono">
                <li>Z = 0.00 → 4 Stars</li>
                <li>Z = 0.75 → 5 Stars</li>
                <li>Z = 4.50 → 10 Stars (Extremely Rare)</li>
              </ul>
            </div>
          </div>
        </Card>

      </div>
    </Layout>
  );
};
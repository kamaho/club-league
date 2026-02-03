import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { db } from '../services/db';
import { ChevronLeft, Plus, Trash2, Search, RefreshCw, X, UserPlus } from 'lucide-react';

export const AdminDivision: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Division Data
    const division = db.getDivision(id || '');
    const season = division ? db.getSeasons().find(s => s.id === division.seasonId) : null;
    
    // Participants
    const enrolledPlayers = db.getPlayersInDivision(id || '');
    
    // Available Players (Not enrolled)
    const allUsers = db.getUsers();
    const availablePlayers = allUsers.filter(u => !enrolledPlayers.find(ep => ep.id === u.id));

    // State for searching players to add
    const [isAddMode, setIsAddMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    if (!division || !season) return <Layout><div>Division not found</div></Layout>;

    // Filter available players based on search
    const filteredAvailablePlayers = availablePlayers.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddPlayer = (userId: string) => {
        db.enrollPlayer(division.id, userId);
        // Don't close mode immediately to allow multiple adds, but refresh data
        navigate(0); 
    };

    const handleAddAll = () => {
        if (filteredAvailablePlayers.length === 0) return;
        
        if (window.confirm(`Are you sure you want to add all ${filteredAvailablePlayers.length} visible players to this division?`)) {
            filteredAvailablePlayers.forEach(p => db.enrollPlayer(division.id, p.id));
            setIsAddMode(false);
            navigate(0);
        }
    };

    const handleRemovePlayer = (userId: string) => {
        if(window.confirm('Remove this player from the division?')) {
            db.removePlayerFromDivision(division.id, userId);
            navigate(0);
        }
    };

    const handleGenerateSchedule = () => {
        if (enrolledPlayers.length < 2) {
            alert("Need at least 2 players to generate a schedule.");
            return;
        }
        if (window.confirm(`Generate round-robin matches for ${enrolledPlayers.length} players? This will replace any pending unplayed matches.`)) {
            const matches = db.generateMatches(division.id);
            alert(`Generated ${matches.length} matches!`);
            navigate('/matches'); 
        }
    };

    return (
        <Layout>
            <div className="mb-6">
                <Link to="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">
                    <ChevronLeft size={16} /> Back to Admin
                </Link>
                
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{season.name}</div>
                        <h1 className="text-3xl font-bold text-slate-900">{division.name}</h1>
                    </div>
                    
                    <button 
                        onClick={handleGenerateSchedule}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg"
                    >
                        <RefreshCw size={16} /> Generate Schedule
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                
                {/* Main: Participants List */}
                <div className="md:col-span-2 space-y-6">
                    <Card title={`Participants (${enrolledPlayers.length})`} action={
                        <button 
                            onClick={() => setIsAddMode(true)}
                            className="text-lime-600 font-bold text-sm flex items-center gap-1 hover:underline"
                        >
                            <Plus size={16} /> Add Player
                        </button>
                    }>
                        {isAddMode && (
                            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 animate-slide-up">
                                <div className="flex items-center gap-2 mb-3">
                                    <Search size={16} className="text-slate-400" />
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Search name or email..." 
                                        className="bg-transparent w-full text-sm outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button onClick={() => setIsAddMode(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                </div>
                                
                                {/* Add All Button */}
                                {filteredAvailablePlayers.length > 0 && (
                                    <div className="mb-2 pb-2 border-b border-slate-200">
                                        <button 
                                            onClick={handleAddAll}
                                            className="w-full py-2 bg-lime-100 text-lime-800 rounded-lg text-xs font-bold hover:bg-lime-200 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <UserPlus size={14} />
                                            Add All {filteredAvailablePlayers.length} Players
                                        </button>
                                    </div>
                                )}

                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {filteredAvailablePlayers.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => handleAddPlayer(p.id)}
                                            className="w-full flex items-center justify-between p-2 rounded hover:bg-white hover:shadow-sm text-left group transition-all"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-700 text-sm">{p.name}</div>
                                                <div className="text-[10px] text-slate-400">{p.email}</div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 text-lime-600 bg-lime-50 p-1 rounded">
                                                <Plus size={14} />
                                            </div>
                                        </button>
                                    ))}
                                    {filteredAvailablePlayers.length === 0 && (
                                        <div className="text-xs text-slate-400 p-2 text-center">No matching players available</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            {enrolledPlayers.map((player, idx) => (
                                <div key={player.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{player.name}</div>
                                            <div className="text-xs text-slate-400">UTR {player.utr}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemovePlayer(player.id)}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {enrolledPlayers.length === 0 && (
                                <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
                                    No players enrolled yet.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar: Stats / Info */}
                <div className="space-y-6">
                    <Card title="Division Info">
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Season</div>
                                <div className="text-sm font-bold text-slate-900">{season.name}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Dates</div>
                                <div className="text-sm text-slate-600">
                                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Format</div>
                                <div className="text-sm text-slate-600">Round Robin (Single Leg)</div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Generated Matches">
                        <div className="text-center py-4">
                             {/* Quick Stat check */}
                             <div className="text-3xl font-black text-slate-900">
                                 {db.getMatchesForDivision(division.id).length}
                             </div>
                             <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Matches Created</div>
                             
                             <Link to="/matches" className="inline-block mt-4 text-sm font-bold text-lime-600 hover:underline">
                                 View All Matches &rarr;
                             </Link>
                        </div>
                    </Card>
                </div>

            </div>
        </Layout>
    );
};
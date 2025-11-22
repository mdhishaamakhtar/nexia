"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import Input from "@/components/atoms/Input";
import api from "@/lib/api";

interface Profile {
    id: number;
    full_name: string;
    relationship_type: string;
    zodiac_sign?: string;
    tags?: { tag: string }[];
}

export default function ProfilesPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [relationshipFilter, setRelationshipFilter] = useState("");

    useEffect(() => {
        fetchProfiles();
    }, [search, relationshipFilter]);

    const fetchProfiles = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            params.append("page", "1");
            params.append("limit", "100");
            if (search) params.append("search", search);
            if (relationshipFilter) params.append("relationship_type", relationshipFilter);

            const response = await api.get(`/profiles?${params.toString()}`);
            // Backend returns {data: {data: [], total: N, page: N, limit: N}}
            setProfiles(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch profiles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen">
                <Navbar />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-2">Your Memory Book</h1>
                        <p className="text-[var(--color-text-secondary)]">
                            People you care about, beautifully preserved
                        </p>
                    </div>

                    {/* Search & Filters */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name..."
                                className="w-full bg-[var(--color-surface)] text-[var(--color-text-primary)] pl-12 pr-4 py-3 rounded-xl border border-[var(--color-border-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-20 transition-all duration-200"
                            />
                        </div>

                        <select
                            value={relationshipFilter}
                            onChange={(e) => setRelationshipFilter(e.target.value)}
                            className="bg-[var(--color-surface)] text-[var(--color-text-primary)] px-4 py-3 rounded-xl border border-[var(--color-border-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-opacity-20 transition-all duration-200"
                        >
                            <option value="">All Relationships</option>
                            <option value="Friend">Friend</option>
                            <option value="Family">Family</option>
                            <option value="Colleague">Colleague</option>
                            <option value="Classmate">Classmate</option>
                            <option value="Crush">Crush</option>
                            <option value="Ex">Ex</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Profiles Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="shimmer-bg h-40 rounded-xl animate-[shimmer_2s_linear_infinite]" />
                            ))}
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-[var(--color-text-secondary)] text-lg mb-6">
                                Nexia is waiting for someone you care about.
                            </p>
                            <button
                                onClick={() => router.push("/profiles/new")}
                                className="bg-[var(--color-accent-cta)] hover:bg-[#8F3E67] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.97]"
                            >
                                Add Your First Profile
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profiles.map((profile) => (
                                <CardProfilePreview
                                    key={profile.id}
                                    profile={profile}
                                    onClick={() => router.push(`/profiles/${profile.id}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Floating Add Button */}
                    <button
                        onClick={() => router.push("/profiles/new")}
                        className="fixed bottom-8 right-8 bg-[var(--color-accent-cta)] hover:bg-[#8F3E67] text-[var(--color-text-primary)] p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </ProtectedRoute>
    );
}

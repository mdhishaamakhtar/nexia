"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Heart, Music, MessageSquare, Film, Book, MapPin, Utensils, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import Button from "@/components/atoms/Button";
import QuoteModal from "@/components/molecules/QuoteModal";
import api from "@/lib/api";

interface Profile {
    id: number;
    full_name: string;
    bio?: string;
    profession?: string;
    long_term_goals?: string;
    relationship_type: string;
    birthday?: string;
    zodiac_sign?: string;
    music_preference?: string;
    favorite_movie?: string;
    favorite_book?: string;
    favorite_memory?: string;
    tags?: { tag: string }[];
    political_views?: { view: string }[];
    food_restrictions?: { restriction: string }[];
    movie_genres?: { genre: string }[];
    book_genres?: { genre: string }[];
    hangout_places?: { place: string }[];
    quotes?: { quote: string }[];
    top_songs?: { name: string; artist: string }[];
    associated_song?: { name: string; artist: string };
}

export default function ProfileDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchProfile();
        }
    }, [id]);

    const fetchProfile = async () => {
        try {
            const response = await api.get(`/profiles/${id}`);
            setProfile(response.data);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            router.push("/profiles");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/profiles/${id}`);
            router.push("/profiles");
        } catch (error) {
            console.error("Failed to delete profile:", error);
            alert("Failed to delete profile");
        }
    };

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen">
                    <Navbar />
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="shimmer-bg h-64 rounded-2xl animate-[shimmer_2s_linear_infinite]" />
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!profile) return null;

    const SectionCard = ({ title, children, icon, color = "maroon" }: { title: string; children: React.ReactNode; icon?: React.ReactNode; color?: string }) => {
        const borderColors = {
            maroon: "border-[var(--color-accent)]",
            blue: "border-[var(--color-blue-accent)]",
            purple: "border-[var(--color-purple-accent)]",
            teal: "border-[var(--color-teal-accent)]",
        };

        return (
            <div className={`bg-[var(--color-surface)] rounded-xl p-6 border-l-4 ${borderColors[color as keyof typeof borderColors]} border-t border-r border-b border-[var(--color-border-subtle)]`}>
                <div className="flex items-center gap-2 mb-4">
                    {icon}
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                {children}
            </div>
        );
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen">
                <Navbar />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <button
                        onClick={() => router.push("/profiles")}
                        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to profiles
                    </button>

                    {/* Hero Section */}
                    <div className="bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-surface)] rounded-2xl p-8 mb-8 border border-[var(--color-border-subtle)]">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
                                <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)]/30 rounded-lg">
                                        <Heart className="w-4 h-4" />
                                        {profile.relationship_type}
                                    </span>
                                    {profile.zodiac_sign && (
                                        <span className="px-3 py-1.5 bg-[var(--color-bg)]/50 rounded-lg">
                                            {profile.zodiac_sign}
                                        </span>
                                    )}
                                    {profile.birthday && (
                                        <span className="px-3 py-1.5 bg-[var(--color-blue-accent)]/20 rounded-lg text-sm">
                                            {new Date(profile.birthday).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => router.push(`/profiles/${id}/edit`)} className="!px-4 !py-2">
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="!px-4 !py-2">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {profile.bio && (
                            <p className="text-[var(--color-text-secondary)] mt-4">{profile.bio}</p>
                        )}
                    </div>

                    {/* Content Grid */}
                    <div className="space-y-4">
                        {/* Tags */}
                        {profile.tags && profile.tags.length > 0 && (
                            <SectionCard title="Tags" icon={<Sparkles className="w-5 h-5 text-[var(--color-purple-accent)]" />} color="purple">
                                <div className="flex flex-wrap gap-2">
                                    {profile.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-purple-accent)]/20 text-[var(--color-text-primary)] text-sm rounded-lg border border-[var(--color-purple-accent)]/30">
                                            {tag.tag}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Profession */}
                        {profile.profession && (
                            <SectionCard title="Profession" color="blue">
                                <p className="text-[var(--color-text-primary)]">{profile.profession}</p>
                            </SectionCard>
                        )}

                        {/* Long Term Goals */}
                        {profile.long_term_goals && (
                            <SectionCard title="Long Term Goals" color="teal">
                                <p className="text-[var(--color-text-primary)] leading-relaxed">{profile.long_term_goals}</p>
                            </SectionCard>
                        )}

                        {/* Political Views */}
                        {profile.political_views && profile.political_views.length > 0 && (
                            <SectionCard title="Political Views" color="teal">
                                <div className="flex flex-wrap gap-2">
                                    {profile.political_views.map((view, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-teal-accent)]/20 rounded-lg text-sm">
                                            {view.view}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Food Restrictions */}
                        {profile.food_restrictions && profile.food_restrictions.length > 0 && (
                            <SectionCard title="Food Restrictions" icon={<Utensils className="w-5 h-5 text-[var(--color-blue-accent)]" />} color="blue">
                                <div className="flex flex-wrap gap-2">
                                    {profile.food_restrictions.map((restriction, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-blue-accent)]/20 rounded-lg text-sm">
                                            {restriction.restriction}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Movie Genres */}
                        {profile.movie_genres && profile.movie_genres.length > 0 && (
                            <SectionCard title="Favorite Movie Genres" icon={<Film className="w-5 h-5 text-[var(--color-purple-accent)]" />} color="purple">
                                <div className="flex flex-wrap gap-2">
                                    {profile.movie_genres.map((genre, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-purple-accent)]/20 rounded-lg text-sm">
                                            {genre.genre}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Book Genres */}
                        {profile.book_genres && profile.book_genres.length > 0 && (
                            <SectionCard title="Favorite Book Genres" icon={<Book className="w-5 h-5 text-[var(--color-teal-accent)]" />} color="teal">
                                <div className="flex flex-wrap gap-2">
                                    {profile.book_genres.map((genre, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-teal-accent)]/20 rounded-lg text-sm">
                                            {genre.genre}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Hangout Places */}
                        {profile.hangout_places && profile.hangout_places.length > 0 && (
                            <SectionCard title="Favorite Hangout Places" icon={<MapPin className="w-5 h-5 text-[var(--color-blue-accent)]" />} color="blue">
                                <div className="flex flex-wrap gap-2">
                                    {profile.hangout_places.map((place, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-[var(--color-blue-accent)]/20 rounded-lg text-sm">
                                            {place.place}
                                        </span>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Music Preference */}
                        {profile.music_preference && (
                            <SectionCard title="Music Preference" icon={<Music className="w-5 h-5 text-[var(--color-accent)]" />} color="maroon">
                                <p className="text-[var(--color-text-primary)] leading-relaxed">{profile.music_preference}</p>
                            </SectionCard>
                        )}

                        {/* Favorite Movie */}
                        {profile.favorite_movie && (
                            <SectionCard title="Favorite Movie" icon={<Film className="w-5 h-5 text-[var(--color-purple-accent)]" />} color="purple">
                                <p className="text-[var(--color-text-primary)] text-lg font-medium">{profile.favorite_movie}</p>
                            </SectionCard>
                        )}

                        {/* Favorite Book */}
                        {profile.favorite_book && (
                            <SectionCard title="Favorite Book" icon={<Book className="w-5 h-5 text-[var(--color-teal-accent)]" />} color="teal">
                                <p className="text-[var(--color-text-primary)] text-lg font-medium">{profile.favorite_book}</p>
                            </SectionCard>
                        )}

                        {/* Associated Song (BEFORE Top Songs) */}
                        {profile.associated_song && (
                            <SectionCard title="Song I Associate With Them" icon={<Music className="w-5 h-5 text-[var(--color-blue-accent)]" />} color="blue">
                                <div className="p-4 bg-[var(--color-bg)] rounded-lg">
                                    <div className="font-medium text-lg">{profile.associated_song.name}</div>
                                    <div className="text-sm text-[var(--color-text-secondary)]">{profile.associated_song.artist}</div>
                                </div>
                            </SectionCard>
                        )}

                        {/* Top Songs */}
                        {profile.top_songs && profile.top_songs.length > 0 && (
                            <SectionCard title="Their Top Songs" icon={<Music className="w-5 h-5 text-[var(--color-purple-accent)]" />} color="purple">
                                <div className="space-y-2">
                                    {profile.top_songs.map((song, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
                                            <span className="text-[var(--color-purple-accent)] font-semibold text-lg w-6">{i + 1}</span>
                                            <div>
                                                <div className="font-medium">{song.name}</div>
                                                <div className="text-sm text-[var(--color-text-secondary)]">{song.artist}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Quotes with Modal */}
                        {profile.quotes && profile.quotes.length > 0 && (
                            <SectionCard title="Words They Said" icon={<MessageSquare className="w-5 h-5 text-[var(--color-teal-accent)]" />} color="teal">
                                <div className="space-y-3">
                                    {profile.quotes.map((quote, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedQuote(quote.quote)}
                                            className="cursor-pointer hover:bg-[var(--color-bg)]/50 p-3 rounded-lg transition-colors"
                                        >
                                            <blockquote className="font-serif italic text-[var(--color-text-secondary)] border-l-4 border-[var(--color-teal-accent)] pl-4">
                                                &ldquo;{quote.quote.length > 150 ? quote.quote.substring(0, 150) + '...' : quote.quote}&rdquo;
                                            </blockquote>
                                            {quote.quote.length > 150 && (
                                                <span className="text-xs text-[var(--color-teal-accent)] mt-2 block">Click to read full quote</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        )}

                        {/* Favorite Memory */}
                        {profile.favorite_memory && (
                            <SectionCard title="Favorite Memory" color="maroon">
                                <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                                    {profile.favorite_memory}
                                </p>
                            </SectionCard>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-surface)] rounded-2xl p-6 max-w-md w-full border border-[var(--color-border-subtle)]">
                        <h3 className="text-xl font-semibold mb-4">Delete Profile?</h3>
                        <p className="text-[var(--color-text-secondary)] mb-6">
                            Are you sure you want to delete {profile.full_name}'s profile? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete} className="flex-1">Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Modal */}
            {selectedQuote && (
                <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
            )}
        </ProtectedRoute>
    );
}

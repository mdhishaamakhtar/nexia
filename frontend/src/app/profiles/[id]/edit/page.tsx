"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Plus, X, User, Heart, Star, Coffee, MessageSquare, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import api from "@/lib/api";

// Section Component for cleaner code
const FormSection = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children: React.ReactNode }) => (
    <div id={id} className="scroll-mt-24">
        <div className="glass-panel rounded-2xl p-8 border-t border-white/10">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                <div className="p-2 bg-[var(--color-primary-from)]/10 rounded-lg text-[var(--color-primary-from)]">
                    <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    </div>
);

export default function EditProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        relationship_type: "",
        bio: "",
        profession: "",
        long_term_goals: "",
        birthday: "",
        zodiac_sign: "",
        music_preference: "",
        favorite_movie: "",
        favorite_book: "",
        favorite_memory: "",
        associated_song_name: "",
        associated_song_artist: "",
    });

    // List States
    const [tags, setTags] = useState<{ tag: string }[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [topSongs, setTopSongs] = useState<{ name: string; artist: string }[]>([]);
    const [songNameInput, setSongNameInput] = useState("");
    const [songArtistInput, setSongArtistInput] = useState("");
    const [quotes, setQuotes] = useState<{ quote: string }[]>([]);
    const [quoteInput, setQuoteInput] = useState("");
    const [movieGenres, setMovieGenres] = useState<{ genre: string }[]>([]);
    const [movieGenreInput, setMovieGenreInput] = useState("");
    const [bookGenres, setBookGenres] = useState<{ genre: string }[]>([]);
    const [bookGenreInput, setBookGenreInput] = useState("");
    const [hangoutPlaces, setHangoutPlaces] = useState<{ place: string }[]>([]);
    const [hangoutPlaceInput, setHangoutPlaceInput] = useState("");
    const [foodRestrictions, setFoodRestrictions] = useState<{ restriction: string }[]>([]);
    const [foodRestrictionInput, setFoodRestrictionInput] = useState("");
    const [politicalViews, setPoliticalViews] = useState<{ view: string }[]>([]);
    const [politicalViewInput, setPoliticalViewInput] = useState("");

    useEffect(() => {
        if (id) {
            fetchProfile();
        }
    }, [id]);

    const fetchProfile = async () => {
        try {
            const response = await api.get(`/profiles/${id}`);
            const data = response.data;
            setFormData({
                full_name: data.full_name || "",
                relationship_type: data.relationship_type || "",
                bio: data.bio || "",
                profession: data.profession || "",
                long_term_goals: data.long_term_goals || "",
                birthday: data.birthday ? data.birthday.split('T')[0] : "",
                zodiac_sign: data.zodiac_sign || "",
                music_preference: data.music_preference || "",
                favorite_movie: data.favorite_movie || "",
                favorite_book: data.favorite_book || "",
                favorite_memory: data.favorite_memory || "",
                associated_song_name: data.associated_song?.name || "",
                associated_song_artist: data.associated_song?.artist || "",
            });
            setTags(data.tags || []);
            setTopSongs(data.top_songs || []);
            setQuotes(data.quotes || []);
            setMovieGenres(data.movie_genres || []);
            setBookGenres(data.book_genres || []);
            setHangoutPlaces(data.hangout_places || []);
            setFoodRestrictions(data.food_restrictions || []);
            setPoliticalViews(data.political_views || []);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            router.push("/profiles");
        } finally {
            setIsFetching(false);
        }
    };

    // Helper functions for lists
    const addItem = (value: string, setter: any, list: any[], inputSetter: any) => {
        if (!value.trim()) return;
        if (setter === setTags) setter([...list, { tag: value }]);
        else if (setter === setQuotes) setter([...list, { quote: value }]);
        else if (setter === setMovieGenres) setter([...list, { genre: value }]);
        else if (setter === setBookGenres) setter([...list, { genre: value }]);
        else if (setter === setHangoutPlaces) setter([...list, { place: value }]);
        else if (setter === setFoodRestrictions) setter([...list, { restriction: value }]);
        else if (setter === setPoliticalViews) setter([...list, { view: value }]);

        inputSetter("");
    };

    const addSong = () => {
        if (!songNameInput.trim() || !songArtistInput.trim()) return;
        setTopSongs([...topSongs, { name: songNameInput, artist: songArtistInput }]);
        setSongNameInput("");
        setSongArtistInput("");
    };

    const removeItem = (index: number, setter: any, list: any[]) => {
        const newList = [...list];
        newList.splice(index, 1);
        setter(newList);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                tags,
                top_songs: topSongs,
                quotes,
                movie_genres: movieGenres,
                book_genres: bookGenres,
                hangout_places: hangoutPlaces,
                food_restrictions: foodRestrictions,
                political_views: politicalViews,
                associated_song: formData.associated_song_name ? {
                    name: formData.associated_song_name,
                    artist: formData.associated_song_artist
                } : null
            };

            await api.put(`/profiles/${id}`, payload);
            router.push(`/profiles/${id}`);
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-[var(--color-bg)]">
                    <Navbar />
                    <div className="max-w-4xl mx-auto px-4 py-12">
                        <div className="glass-panel h-96 rounded-3xl animate-pulse bg-[var(--color-surface-highlight)]" />
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[var(--color-bg)] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
                <Navbar />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mb-12"
                    >
                        <button
                            onClick={() => router.push(`/profiles/${id}`)}
                            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-lg">Back to Profile</span>
                        </button>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Edit Profile
                        </h1>
                        <Button onClick={handleSubmit} isLoading={isLoading} className="!px-8">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </motion.div>

                    <div className="space-y-10">
                        {/* Basic Info */}
                        <FormSection id="basic" title="Basic Information" icon={User}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Full Name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="e.g. Jane Doe"
                                />
                                <Input
                                    label="Relationship Type"
                                    value={formData.relationship_type}
                                    onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                                    placeholder="e.g. Best Friend, Sister"
                                />
                                <Input
                                    label="Birthday"
                                    type="date"
                                    value={formData.birthday}
                                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                />
                                <Input
                                    label="Zodiac Sign"
                                    value={formData.zodiac_sign}
                                    onChange={(e) => setFormData({ ...formData, zodiac_sign: e.target.value })}
                                    placeholder="e.g. Leo"
                                />
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full h-32 rounded-xl glass-input p-4 focus:outline-none resize-none"
                                        placeholder="A short bio about them..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tags</label>
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        {tags.map((tag, i) => (
                                            <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm border border-indigo-500/30">
                                                #{tag.tag}
                                                <button onClick={() => removeItem(i, setTags, tags)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem(tagInput, setTags, tags, setTagInput)}
                                        placeholder="Type tag and press Enter..."
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* Interests */}
                        <FormSection id="interests" title="Interests & Favorites" icon={Star}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Profession"
                                    value={formData.profession}
                                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                />
                                <Input
                                    label="Music Preference"
                                    value={formData.music_preference}
                                    onChange={(e) => setFormData({ ...formData, music_preference: e.target.value })}
                                />
                                <Input
                                    label="Favorite Movie"
                                    value={formData.favorite_movie}
                                    onChange={(e) => setFormData({ ...formData, favorite_movie: e.target.value })}
                                />
                                <Input
                                    label="Favorite Book"
                                    value={formData.favorite_book}
                                    onChange={(e) => setFormData({ ...formData, favorite_book: e.target.value })}
                                />

                                <div className="md:col-span-2 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-400" /> Song Association</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            placeholder="Song Name"
                                            value={formData.associated_song_name}
                                            onChange={(e) => setFormData({ ...formData, associated_song_name: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Artist"
                                            value={formData.associated_song_artist}
                                            onChange={(e) => setFormData({ ...formData, associated_song_artist: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Top Songs</label>
                                    <div className="space-y-2 mb-3">
                                        {topSongs.map((song, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div>
                                                    <div className="font-medium">{song.name}</div>
                                                    <div className="text-xs text-[var(--color-text-secondary)]">{song.artist}</div>
                                                </div>
                                                <button onClick={() => removeItem(i, setTopSongs, topSongs)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Song Name"
                                            value={songNameInput}
                                            onChange={(e) => setSongNameInput(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Artist"
                                            value={songArtistInput}
                                            onChange={(e) => setSongArtistInput(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button onClick={addSong} variant="secondary" className="!px-3"><Plus className="w-5 h-5" /></Button>
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* Lifestyle */}
                        <FormSection id="lifestyle" title="Lifestyle" icon={Coffee}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Hangout Places</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {hangoutPlaces.map((p, i) => (
                                            <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                                {p.place} <button onClick={() => removeItem(i, setHangoutPlaces, hangoutPlaces)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <Input
                                        value={hangoutPlaceInput}
                                        onChange={(e) => setHangoutPlaceInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem(hangoutPlaceInput, setHangoutPlaces, hangoutPlaces, setHangoutPlaceInput)}
                                        placeholder="Add place..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Food Restrictions</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {foodRestrictions.map((r, i) => (
                                            <span key={i} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                                {r.restriction} <button onClick={() => removeItem(i, setFoodRestrictions, foodRestrictions)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <Input
                                        value={foodRestrictionInput}
                                        onChange={(e) => setFoodRestrictionInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem(foodRestrictionInput, setFoodRestrictions, foodRestrictions, setFoodRestrictionInput)}
                                        placeholder="Add restriction..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Movie Genres</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {movieGenres.map((g, i) => (
                                            <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                                {g.genre} <button onClick={() => removeItem(i, setMovieGenres, movieGenres)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <Input
                                        value={movieGenreInput}
                                        onChange={(e) => setMovieGenreInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem(movieGenreInput, setMovieGenres, movieGenres, setMovieGenreInput)}
                                        placeholder="Add genre..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Book Genres</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {bookGenres.map((g, i) => (
                                            <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                                {g.genre} <button onClick={() => removeItem(i, setBookGenres, bookGenres)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <Input
                                        value={bookGenreInput}
                                        onChange={(e) => setBookGenreInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem(bookGenreInput, setBookGenres, bookGenres, setBookGenreInput)}
                                        placeholder="Add genre..."
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* Deep Dive */}
                        <FormSection id="deep" title="Deep Dive" icon={MessageSquare}>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Long Term Goals</label>
                                    <textarea
                                        value={formData.long_term_goals}
                                        onChange={(e) => setFormData({ ...formData, long_term_goals: e.target.value })}
                                        className="w-full h-24 rounded-xl glass-input p-4 focus:outline-none resize-none"
                                        placeholder="What are their big dreams?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Favorite Memory</label>
                                    <textarea
                                        value={formData.favorite_memory}
                                        onChange={(e) => setFormData({ ...formData, favorite_memory: e.target.value })}
                                        className="w-full h-32 rounded-xl glass-input p-4 focus:outline-none resize-none font-serif text-lg"
                                        placeholder="Describe a favorite memory with them..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Words They Said (Quotes)</label>
                                    <div className="space-y-3 mb-3">
                                        {quotes.map((q, i) => (
                                            <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 relative group">
                                                <p className="font-serif italic text-lg text-slate-300">"{q.quote}"</p>
                                                <button onClick={() => removeItem(i, setQuotes, quotes)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={quoteInput}
                                            onChange={(e) => setQuoteInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addItem(quoteInput, setQuotes, quotes, setQuoteInput)}
                                            placeholder="Add a quote..."
                                            className="flex-1"
                                        />
                                        <Button onClick={() => addItem(quoteInput, setQuotes, quotes, setQuoteInput)} variant="secondary"><Plus className="w-5 h-5" /></Button>
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
